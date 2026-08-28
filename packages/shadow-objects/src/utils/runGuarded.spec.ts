import {afterEach, describe, expect, it, vi} from 'vitest';
import {ConsoleLogger} from './ConsoleLogger.js';
import {runGuarded} from './runGuarded.js';

// `ConsoleLogger` puts two arguments of its own in front of every payload -- the `%c`-prefixed
// namespace and the styles for it -- so what a caller handed over starts at index 2.
const payloadOf = (call: unknown[]) => call.slice(2);

describe('runGuarded', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs the step and reports nothing when it returns', () => {
    const logger = new ConsoleLogger('runGuardedSpec');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    let ranWith: string | undefined;
    runGuarded(
      logger,
      () => {
        ranWith = 'the step ran';
      },
      'this should never be printed:',
    );

    expect(ranWith).toBe('the step ran');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('reports a step that throws and does not hand the error on', () => {
    const logger = new ConsoleLogger('runGuardedSpec');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const error = new Error('the step failed');

    expect(() =>
      runGuarded(
        logger,
        () => {
          throw error;
        },
        'the step failed:',
        'the-uuid',
      ),
    ).not.toThrow();

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(payloadOf(consoleError.mock.calls[0]!)).toEqual(['the step failed:', 'the-uuid', error]);
  });

  it('keeps the error behind however many details it was given', () => {
    const logger = new ConsoleLogger('runGuardedSpec');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const error = new Error('the step failed');
    const throwingStep = () => {
      throw error;
    };

    runGuarded(logger, throwingStep, 'the step failed:');
    runGuarded(logger, throwingStep, 'the step failed:', 'detail-a', 'detail-b');

    expect(consoleError).toHaveBeenCalledTimes(2);
    expect(payloadOf(consoleError.mock.calls[0]!)).toEqual(['the step failed:', error]);
    expect(payloadOf(consoleError.mock.calls[1]!)).toEqual(['the step failed:', 'detail-a', 'detail-b', error]);
  });
});
