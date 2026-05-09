// Module-level lifecycle tracker — children's onDestroy callbacks update this,
// the parent SO reads it back and reports to the view.
const lifecycle = {
  flagged: {created: false, destroyed: false, uuid: null},
  unflagged: {created: false, destroyed: false, uuid: null},
};

function flaggedChild({entity, onDestroy}) {
  lifecycle.flagged.created = true;
  lifecycle.flagged.uuid = entity.uuid;
  onDestroy(() => {
    lifecycle.flagged.destroyed = true;
  });
}

function unflaggedChild({entity, onDestroy}) {
  lifecycle.unflagged.created = true;
  lifecycle.unflagged.uuid = entity.uuid;
  onDestroy(() => {
    lifecycle.unflagged.destroyed = true;
  });
}

function parent({entity, dispatchMessageToView}) {
  const doomedUuid = crypto.randomUUID();
  const flaggedUuid = crypto.randomUUID();
  const unflaggedUuid = crypto.randomUUID();

  // Build a doomed subtree under the (live) parent entity:
  //   parent
  //   └── doomedRoot
  //       ├── flagged   (autoDestructionOnParentRemoval=true)
  //       └── unflagged (autoDestructionOnParentRemoval=false)
  entity.kernel.createEntity(doomedUuid, '#void', entity.uuid);
  entity.kernel.createEntity(flaggedUuid, 'flaggedChild', doomedUuid, 0, undefined, true);
  entity.kernel.createEntity(unflaggedUuid, 'unflaggedChild', doomedUuid, 0, undefined, false);

  const beforeDestroy = {
    flaggedCreated: lifecycle.flagged.created,
    unflaggedCreated: lifecycle.unflagged.created,
    flaggedAlive: entity.kernel.hasEntity(flaggedUuid),
    unflaggedAlive: entity.kernel.hasEntity(unflaggedUuid),
  };

  entity.kernel.destroyEntity(doomedUuid);

  const afterDestroy = {
    flaggedDestroyed: lifecycle.flagged.destroyed,
    unflaggedDestroyed: lifecycle.unflagged.destroyed,
    flaggedAlive: entity.kernel.hasEntity(flaggedUuid),
    unflaggedAlive: entity.kernel.hasEntity(unflaggedUuid),
    unflaggedHasParent: entity.kernel.hasEntity(unflaggedUuid) ? entity.kernel.getEntity(unflaggedUuid).hasParent : null,
  };

  dispatchMessageToView('autoDestructResult', {beforeDestroy, afterDestroy});
}

export const shadowObjects = {
  define: {
    parent,
    flaggedChild,
    unflaggedChild,
  },
};