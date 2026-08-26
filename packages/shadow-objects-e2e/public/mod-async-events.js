// Fixture for the async-events page: message round-trips, subtree delivery and sync coalescing.

function counter({entity, useProperty, dispatchMessageToView}) {
  const n = useProperty('n');

  let updates = 0;

  n((value) => {
    updates += 1;
    dispatchMessageToView('counted', {uuid: entity.uuid, value, updates});
  });
}

function broadcaster({dispatchMessageToView, onViewEvent}) {
  onViewEvent((type, data) => {
    if (type === 'broadcast') {
      // the fourth argument is traverseChildren: the view side must deliver this to the whole
      // entity subtree, not just the entity it originated from
      dispatchMessageToView('broadcastEcho', {round: data?.round}, undefined, true);
    }
  });
}

function shouter({onViewEvent, dispatchMessageToView}) {
  onViewEvent((type, data) => {
    if (type === 'shout') {
      dispatchMessageToView(data?.eventName ?? 'shouted', {round: data?.round});
    }
  });
}

export const shadowObjects = {
  define: {
    counter,
    broadcaster,
    shouter,
  },
};
