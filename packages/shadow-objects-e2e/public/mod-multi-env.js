// Fixture for the multi-environment page.
//
// The same module is imported by every environment on the page — two remote workers and one
// local env. That is deliberate: all three end up with a shadow object under the *same* token,
// so anything that leaks between namespaces shows up as a value arriving in the wrong place.
//
// Each entity carries an `envName` property that identifies where it belongs. The shadow object
// never learns its own namespace (the worker knows nothing about namespaces), it only echoes
// what it was given — which is exactly what makes a leak visible.

function probe({entity, useProperty, dispatchMessageToView, onViewEvent}) {
  const envName = useProperty('envName');
  const value = useProperty('value');

  const report = () => ({
    envName: envName(),
    value: value(),
    uuid: entity.uuid,
    hasParent: entity.hasParent,
    parentUuid: entity.parentUuid,
  });

  dispatchMessageToView('probeCreated', report());

  // Note: a signal reader with a callback runs immediately, so the first `probeValueChanged`
  // carries the initial value. The page collects every event and asserts on the sequence.
  value((val) => {
    dispatchMessageToView('probeValueChanged', {envName: envName(), value: val});
  });

  onViewEvent((type, data) => {
    if (type === 'requestReport') {
      dispatchMessageToView('probeReport', {...report(), echo: data});
    }
    // The barrier the page uses before asserting that *nothing* arrived: messages from one
    // entity keep their order, so once the pong for round N is back, anything the shadow
    // object sent before it has been delivered too.
    if (type === 'ping') {
      dispatchMessageToView('pong', {envName: envName(), round: data?.round});
    }
  });
}

export const shadowObjects = {
  define: {
    probe,
  },
};