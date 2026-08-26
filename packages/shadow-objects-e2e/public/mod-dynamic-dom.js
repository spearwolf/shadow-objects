// Fixture for the dynamic-dom page.
//
// Every tracked entity registers itself in a module-global map that outlives it, so the view can
// still ask about entities that were destroyed. A separate `observer` shadow object sits on a
// stable entity and answers snapshot requests — asking the worker what it actually holds beats
// inferring it from the view side, and the round-trip doubles as a barrier: once the snapshot
// for round N is back, every message sent before it has been delivered.

const tracked = new Map(); // uuid -> {label, createdAt}
const log = [];

let sequence = 0;

function trackedEntity({entity, useProperty, onDestroy}) {
  const label = useProperty('label');
  const extra = useProperty('extra');

  const record = {uuid: entity.uuid, label: label(), extra: extra(), createdAt: sequence++};
  tracked.set(entity.uuid, record);

  log.push({event: 'created', uuid: entity.uuid, label: label(), parentUuid: entity.parentUuid});

  label((value) => {
    record.label = value;
    log.push({event: 'label', uuid: entity.uuid, label: value});
  });

  extra((value) => {
    record.extra = value;
    log.push({event: 'extra', uuid: entity.uuid, extra: value});
  });

  onDestroy(() => {
    log.push({event: 'destroyed', uuid: entity.uuid, label: record.label});
  });
}

function observer({entity, dispatchMessageToView, onViewEvent}) {
  const {kernel} = entity;

  onViewEvent((type, data) => {
    if (type !== 'requestSnapshot') return;

    const entities = Array.from(tracked.values()).map((record) => {
      const alive = kernel.hasEntity(record.uuid);
      return {
        uuid: record.uuid,
        label: record.label,
        extra: record.extra,
        createdAt: record.createdAt,
        alive,
        parentUuid: alive ? kernel.getEntity(record.uuid).parentUuid : undefined,
      };
    });

    dispatchMessageToView('snapshot', {round: data?.round, entities, log: log.slice(0)});
  });
}

export const shadowObjects = {
  define: {
    tracked: trackedEntity,
    observer,
  },
};
