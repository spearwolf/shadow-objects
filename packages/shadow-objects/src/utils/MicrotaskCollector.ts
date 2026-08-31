/**
 * The arguments of {@link MicrotaskCollector.add}: a collector without a payload is asked for the
 * key alone, one that carries a payload is asked for both.
 */
type AddArgs<K, V> = undefined extends V ? [key: K, value?: V] : [key: K, value: V];

/**
 * Collects what is written in one task and hands it over a microtask later, in one batch.
 *
 * A second value for the same key replaces the one waiting, so a key written twice in a task
 * reaches the delivery once, with the value that stood at the end of it.
 *
 * Two rules live here so that no site has to decide them again:
 *
 * The batch is taken out and emptied **before** the first delivery. A delivery can write to this
 * collector -- a reader of a context value writes a context of its own, an entity that arrives
 * while a round goes out asks for a round -- and that write belongs to the round behind this one
 * rather than to the batch being walked. Emptying afterwards would also lose the batch to a
 * delivery that throws: the flag is already down by then, so the next write queues a fresh
 * microtask and hands the stale entries over a second time.
 *
 * Every delivery a site makes runs under `runGuarded()`. Entries that arrived in the same task are
 * independent of one another, and one that fails costs itself and nothing behind it -- the promise
 * `docs/api-reference.md` already spells out for context values. What counts as one delivery is
 * the site's to say: `Entity` delivers per entry, `ComponentContext` groups its senders
 * into rounds first and delivers per round.
 *
 * For a booking that has to be callable off again, see `DeferredTeardown`; for a single
 * deferred action without a batch, `MicrotaskGate`.
 */
export class MicrotaskCollector<K, V = undefined> {
  #entries = new Map<K, V>();
  #scheduled = false;

  readonly #deliver: (entries: Map<K, V>) => void;

  constructor(deliver: (entries: Map<K, V>) => void) {
    this.#deliver = deliver;
  }

  /** Put an entry into the batch and make sure someone comes to fetch it. */
  add(...[key, value]: AddArgs<K, V>): void {
    this.#entries.set(key, value as V);

    if (this.#scheduled) return;
    this.#scheduled = true;

    queueMicrotask(() => this.flush());
  }

  /**
   * Hand the batch over now.
   *
   * For a caller that needs the batch delivered at a point of its own choosing rather than
   * whenever the microtask comes round. A queued microtask that finds nothing left returns without
   * a delivery, so an early flush costs nothing but the ordering it was asked for.
   */
  flush(): void {
    this.#scheduled = false;

    if (this.#entries.size === 0) return;

    const entries = this.#entries;
    this.#entries = new Map();

    this.#deliver(entries);
  }
}
