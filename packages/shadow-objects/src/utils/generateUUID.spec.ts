import {afterEach, describe, expect, it, vi} from 'vitest';

// Which of the three sources answers is a property of the realm, so each case installs the
// `crypto` it wants and loads a fresh copy of the module: the announcement of the last source
// is made once per module instance, and a test that shares an instance cannot see the once.

const importFresh = async (): Promise<typeof import('./generateUUID.js')> => {
  vi.resetModules();
  return import('./generateUUID.js');
};

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('generateUUID', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('hands back the template-literal form, not a bare string', async () => {
    vi.stubGlobal('crypto', {randomUUID: () => '00000000-0000-4000-8000-000000000000'});

    const {generateUUID} = await importFresh();
    // The annotation is the guard: the shape rides on inference alone, and a later annotation or a
    // rewrite that widens the return to `string` has to get past this line first.
    const uuid: `${string}-${string}-${string}-${string}-${string}` = generateUUID();

    expect(uuid).toMatch(UUID_V4);
  });

  it('asks crypto.randomUUID first', async () => {
    const randomUUID = vi.fn(() => '00000000-0000-4000-8000-000000000000');
    const getRandomValues = vi.fn();
    vi.stubGlobal('crypto', {randomUUID, getRandomValues});

    const {generateUUID} = await importFresh();

    expect(generateUUID()).toBe('00000000-0000-4000-8000-000000000000');
    expect(randomUUID, 'the secure-context source is asked before any other').toHaveBeenCalledTimes(1);
    expect(getRandomValues, 'the secure-context source answered, so the fallback is never reached').not.toHaveBeenCalled();
  });

  it('takes its bytes from crypto.getRandomValues when there is no randomUUID', async () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = i;
      }
      return bytes;
    });
    vi.stubGlobal('crypto', {getRandomValues});
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const {generateUUID} = await importFresh();

    // the bytes 0x00..0x0f, with the version nibble stamped into byte 6 and the variant into byte 8
    expect(generateUUID()).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
    expect(getRandomValues, 'the second source is the one that answered').toHaveBeenCalledTimes(1);
    expect(error, 'the console announcement belongs to the last source only').not.toHaveBeenCalled();
  });

  it('says once that a realm without Web Crypto falls to Math.random', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('crypto', undefined);

    const {generateUUID} = await importFresh();
    const uuids = [generateUUID(), generateUUID(), generateUUID()];

    for (const uuid of uuids) {
      expect(uuid, 'the last source answers in the canonical form too').toMatch(UUID_V4);
    }
    expect(new Set(uuids).size, 'three calls, three uuids').toBe(3);
    expect(error, 'the realm is announced once, not once per uuid').toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0]!.join(' ')).toContain('Math.random()');
  });
});
