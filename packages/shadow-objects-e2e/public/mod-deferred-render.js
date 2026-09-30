// Fixture for the deferred-render page.
//
// A provider puts its own uuid into the `stage` context, and a consumer reports the `stage` it
// reads back to the view. The view can then tell not only whether a context arrived, but which
// ancestor it came from — a projected entity that ended up below the wrong entity reads a
// different uuid, and one that stayed a root reads nothing.

function provider({entity, provideContext}) {
  provideContext('stage', entity.uuid);
}

function consumer({useContext, createEffect, dispatchMessageToView}) {
  const stage = useContext('stage');

  createEffect(() => {
    dispatchMessageToView('stage', stage() ?? null);
  }, [stage]);
}

export const shadowObjects = {
  define: {
    provider,
    consumer,
  },
};
