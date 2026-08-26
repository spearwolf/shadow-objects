// Fixture for the shae-worker page.
//
// The view side knows what parent-child relations it expects; only the kernel knows what it
// actually built out of the change trail it received. Asking the kernel for its own entity
// graph and reporting it back beats inferring the answer from the view — a view-side bug would
// otherwise agree with itself.

function flatten(nodes, out = []) {
  for (const node of nodes) {
    // `node.entity` is a live Kernel entity and does not survive the structured clone across
    // the worker boundary, so only its plain uuid/parentUuid make it into the message.
    out.push({token: node.token, uuid: node.entity.uuid, parentUuid: node.entity.parentUuid});
    flatten(node.children, out);
  }
  return out;
}

function structureObserver({entity, dispatchMessageToView, onViewEvent}) {
  onViewEvent((type, data) => {
    if (type !== 'requestSnapshot') return;

    // Read fresh on every request rather than caching: this module holds no state of its own,
    // so a snapshot always reflects the kernel's current tree, not a stale copy of it.
    const entities = flatten(entity.kernel.getEntityGraph());

    dispatchMessageToView('snapshot', {round: data?.round, entities});
  });
}

export const shadowObjects = {
  define: {
    'structure-observer': structureObserver,
  },
};
