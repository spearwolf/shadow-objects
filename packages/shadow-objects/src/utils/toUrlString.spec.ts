// @vitest-environment node

import {afterEach, describe, expect, it, vi} from 'vitest';
import {toUrlString} from './toUrlString.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('toUrlString', () => {
  it('hands a URL back as its string, without touching the base', () => {
    expect(toUrlString(new URL('https://example.test/mod.js'))).toBe('https://example.test/mod.js');
  });

  it('hands an absolute url and a data url through unchanged', () => {
    vi.stubGlobal('location', {href: 'https://example.test/base/page.html'});

    expect(toUrlString('https://example.test/mod.js')).toBe('https://example.test/mod.js');
    expect(toUrlString('data:text/javascript,export const shadowObjects = {}')).toBe(
      'data:text/javascript,export const shadowObjects = {}',
    );
  });

  it('resolves a relative path against the base of the realm', () => {
    vi.stubGlobal('location', {href: 'https://example.test/base/page.html'});

    expect(toUrlString('./mod.js')).toBe('https://example.test/base/mod.js');
  });

  it('refuses a relative path when the realm has no base', () => {
    expect(() => toUrlString('./mod.js')).toThrow(TypeError);
  });
});
