import type {ConsoleLogger} from './ConsoleLogger.js';

/**
 * Runs one teardown step and keeps whatever it throws to itself.
 *
 * The kernel answers a failure on two paths. A path that builds hands its error to the caller and
 * takes back what it had already built, so the caller learns that nothing of its request stands. A
 * path that tears down catches per step, reports it and carries on, because there is no caller left
 * to decide anything and the steps behind the failing one still have to run. This function carries
 * that second promise: a step that fails costs itself and nothing around it.
 *
 * A report always reads `message`, then whatever names the subject of the step, then the error. The
 * error goes last, and this is the one place that decides so -- a caller hands over its identity
 * arguments and never the error itself.
 *
 * `logger.error` sits behind no switch, so these reports stay visible outside localhost, where a
 * failing teardown would otherwise be silent.
 *
 * The behaviour a consumer sees from this is written out in the section "Two error contracts" of
 * `docs/api-reference.md`.
 *
 * @param message names the step that failed, in the tone `<subject> … failed:` or
 *   `<subject> could not …:`, and ends on a colon.
 * @param details name what the step worked on, the most specific first -- the display name of a
 *   shadow object before the uuid of its entity.
 */
export function runGuarded(logger: ConsoleLogger, run: () => void, message: string, ...details: unknown[]): void {
  try {
    run();
  } catch (error) {
    logger.error(message, ...details, error);
  }
}
