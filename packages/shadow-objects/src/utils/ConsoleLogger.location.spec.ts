import {afterEach, describe, expect, it, vi} from 'vitest';

// The switch that gates every debug, info and warn line of this library is computed once, while
// the module evaluates -- so each case installs a stand-in `location` before importing a fresh
// copy. Under happy-dom `location` is its own configurable accessor property, and both the
// install and the `afterEach` restore rely on that.
//
// Every stand-in carries both `hostname` and `host`, `host` with a port: a real `location` always
// carries both, and a stand-in missing one would be a shape the browser never hands out.

const locationDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'location')!;

const importWithLocation = async (
  value: {hostname: string; host: string} | undefined,
): Promise<typeof import('./ConsoleLogger.js')> => {
  Object.defineProperty(globalThis, 'location', {configurable: true, value});
  vi.resetModules();
  return import('./ConsoleLogger.js');
};

describe('ConsoleLogger loopback detection', () => {
  afterEach(() => {
    Object.defineProperty(globalThis, 'location', locationDescriptor);
    vi.resetModules();
  });

  it('does not enable for a host that merely starts with "localhost"', async () => {
    const {ConsoleLogger} = await importWithLocation({hostname: 'localhost.example.com', host: 'localhost.example.com:5173'});

    expect(ConsoleLogger.sharedConfig.enable).toBe(false);
  });

  it('enables for 127.0.0.1', async () => {
    const {ConsoleLogger} = await importWithLocation({hostname: '127.0.0.1', host: '127.0.0.1:5173'});

    expect(ConsoleLogger.sharedConfig.enable).toBe(true);
  });

  it('enables for the bracketed IPv6 loopback address', async () => {
    const {ConsoleLogger} = await importWithLocation({hostname: '[::1]', host: '[::1]:5173'});

    expect(ConsoleLogger.sharedConfig.enable).toBe(true);
  });

  it('enables for localhost itself', async () => {
    const {ConsoleLogger} = await importWithLocation({hostname: 'localhost', host: 'localhost:5173'});

    expect(ConsoleLogger.sharedConfig.enable).toBe(true);
  });

  it('does not enable when hostname and host are both empty, as for a worker from a blob URL', async () => {
    const {ConsoleLogger} = await importWithLocation({hostname: '', host: ''});

    expect(ConsoleLogger.sharedConfig.enable).toBe(false);
  });

  it('does not enable when globalThis.location is absent', async () => {
    const {ConsoleLogger} = await importWithLocation(undefined);

    expect(ConsoleLogger.sharedConfig.enable).toBe(false);
  });
});
