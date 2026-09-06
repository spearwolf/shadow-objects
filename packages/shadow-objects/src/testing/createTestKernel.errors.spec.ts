import {describe, expect, it} from 'vitest';
import {onDestroy} from '../in-the-dark/events.js';
import type {ShadowObjectCreationAPI} from '../types.js';
import {createTestKernel} from './createTestKernel.js';

const withBrokenTeardown = () => {
  const t = createTestKernel();
  t.define(
    'broken',
    class BrokenTeardown {
      [onDestroy]() {
        throw new RangeError('teardown went wrong');
      }
    },
  );
  t.createEntity('broken');
  return t;
};

describe('createTestKernel error recording', () => {
  it('records the error the Kernel swallowed during a teardown', () => {
    const t = withBrokenTeardown();

    expect(t.errors).toHaveLength(0);

    t.kernel.destroy();

    const errors = t.errors.filter((record) => record.level === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0]!.error).toBeInstanceOf(RangeError);

    t.clearErrors();
    t.dispose();
  });

  it('dispose() throws when such an error was not acknowledged', () => {
    const t = withBrokenTeardown();

    expect(() => t.dispose()).toThrow(/teardown went wrong/);
  });

  it('clearErrors() satisfies dispose()', () => {
    const t = withBrokenTeardown();

    t.kernel.destroy();
    expect(t.errors.filter((record) => record.level === 'error')).toHaveLength(1);

    t.clearErrors();

    expect(() => t.dispose()).not.toThrow();
  });

  it('failOnKernelErrors: false switches the throw off', () => {
    const t = createTestKernel({failOnKernelErrors: false});
    t.define(
      'broken',
      class BrokenTeardown {
        [onDestroy]() {
          throw new RangeError('teardown went wrong');
        }
      },
    );
    t.createEntity('broken');

    expect(() => t.dispose()).not.toThrow();
  });

  it('a warning is recorded but never fails a run', async () => {
    const t = createTestKernel();
    const module = {define: {probe: class Probe {}}};

    await t.importModule(module);
    await t.importModule(module);

    expect(t.errors.filter((record) => record.level === 'warn')).toHaveLength(1);
    expect(() => t.dispose()).not.toThrow();
  });

  it('the Kernel keeps working after a Shadow Object teardown threw', () => {
    const t = createTestKernel();
    const built: string[] = [];

    t.define(
      'broken',
      class BrokenTeardown {
        [onDestroy]() {
          throw new RangeError('teardown went wrong');
        }
      },
    );
    t.define('fine', function Fine(_api: ShadowObjectCreationAPI) {
      built.push('fine');
    });

    const broken = t.createEntity('broken');
    broken.destroy();
    t.createEntity('fine');

    expect(built).toEqual(['fine']);

    t.clearErrors();
    t.dispose();
  });
});
