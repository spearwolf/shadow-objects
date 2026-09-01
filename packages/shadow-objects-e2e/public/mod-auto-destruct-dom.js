// Fixture for the auto-destruct-dom page.
//
// Every tracked entity registers itself under its `label` in a module-global map that outlives it,
// so the view can still ask about entities that are gone. A separate `observer` shadow object sits
// on a stable entity and answers two view events: one for a snapshot of what the kernel holds, one
// to destroy an entity from inside the Shadow Environment — which is the only occasion on which
// `autoDestructionOnParentRemoval` decides anything.

const tracked = new Map(); // label -> {uuid, label, destroyed}

function trackedEntity({entity, useProperty, onDestroy}) {
  const label = useProperty('label');

  const record = {uuid: entity.uuid, label: label(), destroyed: false};
  tracked.set(record.label, record);

  onDestroy(() => {
    record.destroyed = true;
  });
}

function observer({entity, dispatchMessageToView, onViewEvent}) {
  const {kernel} = entity;

  onViewEvent((type, data) => {
    if (type === 'requestSnapshot') {
      const entities = Array.from(tracked.values()).map((record) => {
        const alive = kernel.hasEntity(record.uuid);
        // an entity the kernel no longer holds is not dereferenced: `getEntity` throws for a uuid
        // it does not know, and "gone" is exactly what this snapshot is asking about
        const live = alive ? kernel.getEntity(record.uuid) : undefined;
        return {
          uuid: record.uuid,
          label: record.label,
          alive,
          destroyed: record.destroyed,
          parentUuid: live?.parentUuid,
          autoDestruct: live?.autoDestructionOnParentRemoval,
        };
      });

      dispatchMessageToView('snapshot', {round: data?.round, entities});
      return;
    }

    if (type === 'destroyEntity') {
      const record = tracked.get(data?.label);
      if (record == null) {
        throw new Error(`no tracked entity labelled ${JSON.stringify(data?.label)}`);
      }
      kernel.destroyEntity(record.uuid);
    }
  });
}

export const shadowObjects = {
  define: {
    tracked: trackedEntity,
    observer,
  },
};
