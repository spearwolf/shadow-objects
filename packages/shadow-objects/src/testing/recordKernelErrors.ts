import type {ConsoleLogger} from '../utils/ConsoleLogger.js';
import type {KernelErrorRecord} from './types.js';

export interface KernelErrorRecorder {
  readonly records: readonly KernelErrorRecord[];
  clear(): void;
  unhook(): void;
}

/**
 * Records what a Kernel reports through its logger, and keeps it off the console.
 *
 * The Kernel answers a failing teardown by reporting it and carrying on -- `runGuarded()` hands
 * nothing back to a caller, because on that path there is no caller left to decide anything. A test
 * therefore has no way to see a Shadow Object whose `onDestroy` threw, unless it watches the logger.
 *
 * `error` and `warn` live on `ConsoleLogger.prototype`, so writing them here shadows them with own
 * properties and `unhook()` deletes those again. `warn` is recorded even though the real method is
 * gated behind `ConsoleLogger.isWarn`, which is off outside a loopback host: a test wants the report
 * whatever the host it runs on happens to be.
 */
export function recordKernelErrors(logger: ConsoleLogger, echo = false): KernelErrorRecorder {
  const records: KernelErrorRecord[] = [];

  const originals: Record<'error' | 'warn', (...args: any[]) => void> = {
    error: logger.error,
    warn: logger.warn,
  };
  const wasOwn: Record<'error' | 'warn', boolean> = {
    error: Object.hasOwn(logger, 'error'),
    warn: Object.hasOwn(logger, 'warn'),
  };

  const record =
    (level: 'error' | 'warn') =>
    (...args: any[]) => {
      const last = args.length > 0 ? args[args.length - 1] : undefined;
      records.push({level, args, ...(last instanceof Error ? {error: last} : {})});
      if (echo) {
        originals[level].apply(logger, args);
      }
    };

  logger.error = record('error');
  logger.warn = record('warn');

  return {
    records,
    clear() {
      records.length = 0;
    },
    unhook() {
      for (const level of ['error', 'warn'] as const) {
        if (wasOwn[level]) {
          logger[level] = originals[level];
        } else {
          delete (logger as Partial<ConsoleLogger>)[level];
        }
      }
    },
  };
}
