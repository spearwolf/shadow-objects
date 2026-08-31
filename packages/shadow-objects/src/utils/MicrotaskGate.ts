/**
 * Runs one action a microtask after it was asked for, however often it is asked for.
 *
 * The flag falls before the action rather than behind it: an action that asks again books a fresh
 * round instead of writing into a flag the line behind it would clear.
 *
 * No batch and no guard: there is one action, so there are no neighbours a failure could cost --
 * what it throws goes where an uncaught microtask goes. A gate that carries entries is
 * `MicrotaskCollector`, a booking that can be called off again is `DeferredTeardown`.
 */
export class MicrotaskGate {
  #scheduled = false;

  readonly #run: () => void;

  constructor(run: () => void) {
    this.#run = run;
  }

  /** Ask for the action. */
  schedule(): void {
    if (this.#scheduled) return;
    this.#scheduled = true;

    queueMicrotask(() => {
      this.#scheduled = false;
      this.#run();
    });
  }
}
