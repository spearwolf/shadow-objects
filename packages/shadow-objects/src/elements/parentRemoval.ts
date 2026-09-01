interface ParentWatch {
  observer: MutationObserver;
  /** What to run for each watched child of this parent, keyed by that child. */
  watchers: Map<Node, () => void>;
}

/**
 * One `MutationObserver` per watched parent node, however many nodes are watched on it.
 *
 * A `childList` observation belongs to the observer and not to the child it was taken out
 * for: n observers on one node see every mutation of that node n times, and each of them
 * walks the whole `removedNodes` list. Emptying a list of n siblings costs n² callback runs
 * that way. One observer per node costs one run per mutation, and the lookup behind it is
 * keyed by the removed node — a set that is small against the number of siblings.
 *
 * The map is keyed by the parent node, so an entry cannot outlive the node it belongs to.
 * What it holds are children of that node, which the node already holds itself.
 */
const parentWatches = new WeakMap<Node, ParentWatch>();

/**
 * Take every callback whose node shows up in `mutations`' `removedNodes` out of `watch.watchers`
 * and run it.
 *
 * Taken off before it runs, and that order is the whole point: the callback decides where its
 * node is watched next, and an entry deleted afterwards would take that answer with it. It is
 * also what makes a node that appears twice in one batch — taken out, put back, taken out again —
 * run its callback once. A callback runs guarded: a `MutationObserver` callback that throws
 * reaches no caller of its own, and a watcher is code this module does not own — `onParentChanged`
 * is a documented extension point, called on every watcher in the same batch whether or not one of
 * them throws.
 */
const dispatchRemovals = (watch: ParentWatch, mutations: MutationRecord[]): void => {
  const removed: Array<() => void> = [];

  for (const {removedNodes} of mutations) {
    for (const node of removedNodes) {
      const onRemoved = watch.watchers.get(node);
      if (onRemoved == null) continue;
      watch.watchers.delete(node);
      removed.push(onRemoved);
    }
  }

  for (const onRemoved of removed) {
    try {
      onRemoved();
    } catch (error) {
      console.error('a removal watcher failed:', error);
    }
  }
};

const createParentWatch = (parent: Node): ParentWatch => {
  const watchers = new Map<Node, () => void>();

  const watch: ParentWatch = {
    observer: new MutationObserver((mutations, activeObserver) => {
      dispatchRemovals(watch, mutations);

      // behind the callbacks, never in front of them: one that puts its node back under this
      // same parent keeps the observation standing instead of paying for a fresh one
      if (watchers.size === 0) {
        activeObserver.disconnect();
        // a callback above can have watched this same parent again on its own, which builds a
        // second watch and replaces this one in the registry before this line runs — deleting
        // unconditionally would then throw away that live entry instead of this dead one
        if (parentWatches.get(parent) === watch) parentWatches.delete(parent);
      }
    }),
    watchers,
  };

  watch.observer.observe(parent, {childList: true, subtree: false, attributes: false});

  return watch;
};

/**
 * Run `onRemoved` once `node` is taken out of `parent`'s child list.
 *
 * A second call for the same pair replaces the callback. The watch ends the moment it fires
 * — whoever wants to go on watching says so from inside the callback.
 *
 * A shared observer can already be sitting on a `childList` record from earlier in the same task
 * — a sibling taken out a moment ago, still waiting for the microtask that delivers observer
 * callbacks. Registering `node` now must not let that stale record apply to it once delivery
 * catches up, so pending records are taken out and dispatched first, against the watchers this
 * call still finds. `node` itself is not among them yet, so it cannot be the one a stale record
 * matches — the only nodes a `takeRecords()` batch can name here are ones some earlier call
 * already put in `parent`'s child list and that have since left it again.
 */
export const watchForRemovalFrom = (parent: Node, node: Node, onRemoved: () => void): void => {
  let watch = parentWatches.get(parent);
  if (watch != null) {
    dispatchRemovals(watch, watch.observer.takeRecords());
    // a callback the dispatch just ran can have unwatched the last other node on this same
    // parent, which tears the watch down and drops it from the registry — resolving the watch
    // again after the dispatch, instead of trusting the one this call started with, is what
    // makes `node` land in whichever watch is live once that outside code has had its turn
    watch = parentWatches.get(parent);
  }
  if (watch == null) {
    watch = createParentWatch(parent);
    parentWatches.set(parent, watch);
  }
  watch.watchers.set(node, onRemoved);
};

/** Stop watching `node` under `parent`. A pair nobody watches is left alone. */
export const stopWatchingForRemovalFrom = (parent: Node, node: Node): void => {
  const watch = parentWatches.get(parent);
  if (watch == null) return;
  if (!watch.watchers.delete(node)) return;
  if (watch.watchers.size === 0) {
    watch.observer.disconnect();
    parentWatches.delete(parent);
  }
};
