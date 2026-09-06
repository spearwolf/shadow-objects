import {describe, expect, it} from 'vitest';
import {readListAttribute} from './attr-utils.js';

describe('readListAttribute', () => {
  const el = (value?: string) => {
    const div = document.createElement('div');
    if (value !== undefined) div.setAttribute('list', value);
    return div;
  };

  it('splits on commas and whitespace, trims, and drops empty entries', () => {
    expect(readListAttribute(el('a, b  c,,d\n e'), 'list')).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('is empty for a missing, an empty and a blank attribute', () => {
    expect(readListAttribute(el(), 'list')).toEqual([]);
    expect(readListAttribute(el(''), 'list')).toEqual([]);
    expect(readListAttribute(el('  , '), 'list')).toEqual([]);
  });
});
