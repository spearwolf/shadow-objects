import {afterEach, describe, expect, it, vi} from 'vitest';
import {ConsoleLogger} from '../utils/ConsoleLogger.js';
import {recordKernelErrors} from './recordKernelErrors.js';

describe('recordKernelErrors', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('records an error report with its arguments and the trailing Error', () => {
    const logger = new ConsoleLogger('TestRecorder');
    const recorder = recordKernelErrors(logger);
    const cause = new RangeError('out of range');

    logger.error('shadow-object onDestroy hook failed:', 'PlayerLogic', cause);

    expect(recorder.records).toHaveLength(1);
    expect(recorder.records[0]!.level).toBe('error');
    expect(recorder.records[0]!.args).toEqual(['shadow-object onDestroy hook failed:', 'PlayerLogic', cause]);
    expect(recorder.records[0]!.error).toBe(cause);

    recorder.unhook();
  });

  it('records a warning and leaves its error field unset when nothing trailing is an Error', () => {
    const logger = new ConsoleLogger('TestRecorder');
    const recorder = recordKernelErrors(logger);

    logger.warn('importModule: skipping already imported module', {define: {}});

    expect(recorder.records).toHaveLength(1);
    expect(recorder.records[0]!.level).toBe('warn');
    expect(recorder.records[0]!.error).toBeUndefined();

    recorder.unhook();
  });

  it('keeps the console quiet by default and speaks with echo on', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const quiet = new ConsoleLogger('TestRecorderQuiet');
    const quietRecorder = recordKernelErrors(quiet);
    quiet.error('kept to itself');
    expect(consoleError).not.toHaveBeenCalled();
    quietRecorder.unhook();

    const loud = new ConsoleLogger('TestRecorderLoud');
    const loudRecorder = recordKernelErrors(loud, true);
    loud.error('said out loud');
    expect(consoleError).toHaveBeenCalledTimes(1);
    loudRecorder.unhook();
  });

  it('clear() empties the records and unhook() gives the logger its own methods back', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = new ConsoleLogger('TestRecorderRestore');
    const recorder = recordKernelErrors(logger);

    logger.error('one');
    expect(recorder.records).toHaveLength(1);

    recorder.clear();
    expect(recorder.records).toHaveLength(0);

    recorder.unhook();
    expect(Object.hasOwn(logger, 'error')).toBe(false);

    logger.error('two');
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(recorder.records).toHaveLength(0);
  });
});
