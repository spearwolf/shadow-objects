import {describe, expect, it} from 'vitest';
import {propValueConverters} from './propValueConverters.js';

const TYPE_NAMES = [
  'string',
  'text',
  'number',
  'bigint',
  'float',
  'int',
  'integer',
  'hex',
  'hexadecimal',
  'oct',
  'octal',
  'bin',
  'binary',
  'bool',
  'boolean',
  '[]',
  'text[]',
  'string[]',
  'number[]',
  'float[]',
  'int[]',
  'integer[]',
  'hex[]',
  'hexadecimal[]',
  'oct[]',
  'octal[]',
  'bin[]',
  'binary[]',
  'bool[]',
  'boolean[]',
  'int8array',
  'uint8array',
  'uint8clampedarray',
  'int16array',
  'uint16array',
  'int32array',
  'uint32array',
  'float32array',
  'float64array',
  'bigint64array',
  'biguint64array',
  'json',
];

const ALIAS_PAIRS: Array<[alias: string, shortForm: string]> = [
  ['text', 'string'],
  ['integer', 'int'],
  ['hexadecimal', 'hex'],
  ['octal', 'oct'],
  ['binary', 'bin'],
  ['boolean', 'bool'],
  ['text[]', '[]'],
  ['string[]', '[]'],
  ['integer[]', 'int[]'],
  ['hexadecimal[]', 'hex[]'],
  ['octal[]', 'oct[]'],
  ['binary[]', 'bin[]'],
  ['boolean[]', 'bool[]'],
];

describe('propValueConverters', () => {
  it('answers to 42 type names, in this order', () => {
    expect([...propValueConverters.keys()]).toEqual(TYPE_NAMES);
  });

  it('has one converter per branch, 29 in all', () => {
    expect(new Set(propValueConverters.values()).size).toBe(29);
  });

  it('gives every alias the same function as its short form', () => {
    for (const [alias, shortForm] of ALIAS_PAIRS) {
      expect(propValueConverters.get(alias)).toBe(propValueConverters.get(shortForm));
    }
  });

  describe('conversion behaviour, one distinguishing value per branch', () => {
    it('string, text', () => {
      expect(propValueConverters.get('string')!('hello world')).toBe('hello world');
      expect(propValueConverters.get('text')!('hello world')).toBe('hello world');
      // this converter does not trim: trimming happens upstream in the effect, gated by
      // `shouldTrim`, and only when `no-trim` is absent — a converter that trimmed on its own
      // would apply even under `no-trim`
      expect(propValueConverters.get('string')!('  hello  ')).toBe('  hello  ');
    });

    it('number', () => {
      expect(propValueConverters.get('number')!('12abc')).toBeNaN();
    });

    it('bigint', () => {
      expect(propValueConverters.get('bigint')!('9007199254740993')).toBe(9007199254740993n);
    });

    it('float', () => {
      expect(propValueConverters.get('float')!('3.14abc')).toBe(3.14);
    });

    it('int, integer', () => {
      expect(propValueConverters.get('int')!('42.9')).toBe(42);
      expect(propValueConverters.get('integer')!('42.9')).toBe(42);
      // `parseInt`, not `Math.trunc(Number(…))`: the latter would answer `NaN` here instead of 12
      expect(propValueConverters.get('int')!('12abc')).toBe(12);
    });

    it('hex, hexadecimal', () => {
      expect(propValueConverters.get('hex')!('ff')).toBe(255);
      expect(propValueConverters.get('hexadecimal')!('ff')).toBe(255);
    });

    it('oct, octal', () => {
      expect(propValueConverters.get('oct')!('17')).toBe(15);
      expect(propValueConverters.get('octal')!('17')).toBe(15);
    });

    it('bin, binary', () => {
      expect(propValueConverters.get('bin')!('1011')).toBe(11);
      expect(propValueConverters.get('binary')!('1011')).toBe(11);
    });

    it('bool, boolean', () => {
      expect(propValueConverters.get('bool')!('YES')).toBe(true);
      expect(propValueConverters.get('boolean')!('YES')).toBe(true);
    });

    it('[], text[], string[]', () => {
      expect(propValueConverters.get('[]')!('a, b, c')).toEqual(['a', 'b', 'c']);
      expect(propValueConverters.get('text[]')!('a, b, c')).toEqual(['a', 'b', 'c']);
      expect(propValueConverters.get('string[]')!('a, b, c')).toEqual(['a', 'b', 'c']);
    });

    it('number[]', () => {
      expect(propValueConverters.get('number[]')!('1.5abc 2')).toEqual([NaN, 2]);
    });

    it('float[]', () => {
      expect(propValueConverters.get('float[]')!('1.5abc 2')).toEqual([1.5, 2]);
    });

    it('int[], integer[]', () => {
      expect(propValueConverters.get('int[]')!('1.9 2.9')).toEqual([1, 2]);
      expect(propValueConverters.get('integer[]')!('1.9 2.9')).toEqual([1, 2]);
    });

    it('hex[], hexadecimal[]', () => {
      expect(propValueConverters.get('hex[]')!('ff 0a')).toEqual([255, 10]);
      expect(propValueConverters.get('hexadecimal[]')!('ff 0a')).toEqual([255, 10]);
    });

    it('oct[], octal[]', () => {
      expect(propValueConverters.get('oct[]')!('17 7')).toEqual([15, 7]);
      expect(propValueConverters.get('octal[]')!('17 7')).toEqual([15, 7]);
    });

    it('bin[], binary[]', () => {
      expect(propValueConverters.get('bin[]')!('1011 110')).toEqual([11, 6]);
      expect(propValueConverters.get('binary[]')!('1011 110')).toEqual([11, 6]);
    });

    it('bool[], boolean[]', () => {
      expect(propValueConverters.get('bool[]')!('yes no on off')).toEqual([true, false, true, false]);
      expect(propValueConverters.get('boolean[]')!('yes no on off')).toEqual([true, false, true, false]);
    });

    it('int8array', () => {
      const result = propValueConverters.get('int8array')!('1 -2 3') as Int8Array;
      expect(result).toBeInstanceOf(Int8Array);
      expect([...result]).toEqual([1, 2, 3]);
    });

    it('uint8array', () => {
      const result = propValueConverters.get('uint8array')!('1 2 300') as Uint8Array;
      expect(result).toBeInstanceOf(Uint8Array);
      expect([...result]).toEqual([1, 2, 44]);
    });

    it('uint8clampedarray', () => {
      const result = propValueConverters.get('uint8clampedarray')!('1 2 300') as Uint8ClampedArray;
      expect(result).toBeInstanceOf(Uint8ClampedArray);
      expect([...result]).toEqual([1, 2, 255]);
    });

    it('int16array', () => {
      const result = propValueConverters.get('int16array')!('1,2,3') as Int16Array;
      expect(result).toBeInstanceOf(Int16Array);
      expect([...result]).toEqual([1, 2, 3]);
    });

    it('uint16array', () => {
      const result = propValueConverters.get('uint16array')!('1-2') as Uint16Array;
      expect(result).toBeInstanceOf(Uint16Array);
      expect([...result]).toEqual([1, 2]);
    });

    it('int32array', () => {
      const result = propValueConverters.get('int32array')!('1.5 -2.5') as Int32Array;
      expect(result).toBeInstanceOf(Int32Array);
      expect([...result]).toEqual([1, 5, 2, 5]);
    });

    it('uint32array', () => {
      const result = propValueConverters.get('uint32array')!('1;2;3') as Uint32Array;
      expect(result).toBeInstanceOf(Uint32Array);
      expect([...result]).toEqual([1, 2, 3]);
    });

    it('float32array', () => {
      const result = propValueConverters.get('float32array')!('1.5 -2.5') as Float32Array;
      expect(result).toBeInstanceOf(Float32Array);
      expect([...result]).toEqual([1.5, -2.5]);
    });

    it('float64array', () => {
      const result = propValueConverters.get('float64array')!('1.5 -2.5') as Float64Array;
      expect(result).toBeInstanceOf(Float64Array);
      expect([...result]).toEqual([1.5, -2.5]);
    });

    it('bigint64array', () => {
      const result = propValueConverters.get('bigint64array')!('1 -2') as BigInt64Array;
      expect(result).toBeInstanceOf(BigInt64Array);
      expect([...result]).toEqual([1n, 2n]);
    });

    it('biguint64array', () => {
      // the leading `-` is a non-word character, so `words()` splits it off as its own empty
      // token — `'-1 2'` becomes `['', '1', '2']`, and `BigInt('')` is `0n`: three elements, no
      // sign, no thrown error
      const result = propValueConverters.get('biguint64array')!('-1 2') as BigUint64Array;
      expect(result).toBeInstanceOf(BigUint64Array);
      expect([...result]).toEqual([0n, 1n, 2n]);
    });

    it('json', () => {
      expect(propValueConverters.get('json')!('{"a":1,"b":[2,3]}')).toEqual({a: 1, b: [2, 3]});
    });
  });

  it('does not answer to an inherited object key', () => {
    expect(propValueConverters.has('toString')).toBe(false);
    expect(propValueConverters.has('constructor')).toBe(false);
    expect(propValueConverters.has('__proto__')).toBe(false);
  });
});