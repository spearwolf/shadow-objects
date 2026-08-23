/**
 * A teardown that waits for the next microtask before it commits.
 *
 * Leaving the tree is not the same as ending. A re-render takes an element out and puts it back
 * inside one task, and everything hanging on it — an environment, its proxy, every entity in it —
 * has to come through that move untouched. So the teardown is booked instead of run, and the
 * microtask that follows asks where the element stands by then: whoever moved it in the meantime
 * has left the answer here, and being back in the tree calls the teardown off. However often the
 * element is moved inside that one window, only the first booking queues a microtask, so the
 * question is asked once. An element that is still out when the microtask runs is torn down.
 *
 * A cancelled booking leaves its microtask standing — it wakes up, finds nothing booked and
 * returns. Running twice is not guarded against here: that guard belongs to the teardown itself,
 * which is callable by hand as well and has to carry it in either case.
 */
export class DeferredTeardown {
  readonly #run: () => void;

  /** Whether a teardown is booked right now. */
  #isBooked = false;

  /** Whether a microtask is already on its way to ask. */
  #isAsking = false;

  constructor(run: () => void) {
    this.#run = run;
  }

  /** Book the teardown, and make sure someone comes asking. */
  schedule(): void {
    this.#isBooked = true;

    if (this.#isAsking) return;
    this.#isAsking = true;

    queueMicrotask(() => {
      this.#isAsking = false;
      if (!this.#isBooked) return;
      // the booking is cleared in front of the run, not behind it: the field says whether a
      // teardown is waiting, and one that is being carried out is not waiting. It also decides what
      // a `schedule()` from inside the teardown means — a fresh round, rather than a booking that
      // the line behind the call would wipe out
      this.#isBooked = false;
      this.#run();
    });
  }

  /** Take the booking back. */
  cancel(): void {
    this.#isBooked = false;
  }
}