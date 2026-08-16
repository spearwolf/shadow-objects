import {TRUTHY_VALUES} from '../utils/constants.js';

export type PropValueConverter = (value: string) => unknown;

const words = (value: string): string[] => value.split(/\W+/);
const fields = (value: string): string[] => value.split(/\s+/);

const toRadix =
  (base: number): PropValueConverter =>
  (value) =>
    parseInt(value, base);

const toRadixList =
  (base: number): PropValueConverter =>
  (value) =>
    words(value).map((v) => parseInt(v, base));

type NumericArrayCtor = new (values: number[]) => ArrayBufferView;
type BigIntArrayCtor = new (values: bigint[]) => ArrayBufferView;

const toNumericArray =
  (Ctor: NumericArrayCtor, split: (value: string) => string[]): PropValueConverter =>
  (value) =>
    new Ctor(split(value).map((v) => Number(v)));

const toBigIntArray =
  (Ctor: BigIntArrayCtor): PropValueConverter =>
  (value) =>
    new Ctor(words(value).map((v) => BigInt(v)));

const toBoolean: PropValueConverter = (value) => TRUTHY_VALUES.has(value.toLowerCase());

// 29 groups: the names a group serves, then the one function they share. Alias marks (e.g.
// `int`/`integer`) point at the same function object on purpose — the identity is structural, not
// a matter of discipline.
const CONVERTER_GROUPS: ReadonlyArray<readonly [readonly string[], PropValueConverter]> = [
  [['string', 'text'], (value) => value],
  [['number'], (value) => Number(value)],
  [['bigint'], (value) => BigInt(value)],
  [['float'], (value) => parseFloat(value)],
  [['int', 'integer'], toRadix(10)],
  [['hex', 'hexadecimal'], toRadix(16)],
  [['oct', 'octal'], toRadix(8)],
  [['bin', 'binary'], toRadix(2)],
  [['bool', 'boolean'], toBoolean],
  [['[]', 'text[]', 'string[]'], words],
  [['number[]'], (value) => fields(value).map((v) => Number(v))],
  [['float[]'], (value) => fields(value).map((v) => parseFloat(v))],
  [['int[]', 'integer[]'], (value) => fields(value).map((v) => parseInt(v, 10))],
  [['hex[]', 'hexadecimal[]'], toRadixList(16)],
  [['oct[]', 'octal[]'], toRadixList(8)],
  [['bin[]', 'binary[]'], toRadixList(2)],
  [['bool[]', 'boolean[]'], (value) => words(value).map((v) => TRUTHY_VALUES.has(v.toLowerCase()))],
  [['int8array'], toNumericArray(Int8Array, words)],
  [['uint8array'], toNumericArray(Uint8Array, words)],
  [['uint8clampedarray'], toNumericArray(Uint8ClampedArray, words)],
  [['int16array'], toNumericArray(Int16Array, words)],
  [['uint16array'], toNumericArray(Uint16Array, words)],
  [['int32array'], toNumericArray(Int32Array, words)],
  [['uint32array'], toNumericArray(Uint32Array, words)],
  [['float32array'], toNumericArray(Float32Array, fields)],
  [['float64array'], toNumericArray(Float64Array, fields)],
  [['bigint64array'], toBigIntArray(BigInt64Array)],
  [['biguint64array'], toBigIntArray(BigUint64Array)],
  [['json'], (value) => JSON.parse(value)],
];

// A `Map`, not an object literal: a type name is whatever string stands in the `type` attribute,
// and `'toString' in {}` is `true` — an object literal would answer to inherited keys it never
// declared.
export const propValueConverters: ReadonlyMap<string, PropValueConverter> = new Map(
  CONVERTER_GROUPS.flatMap(([names, convert]) => names.map((name) => [name, convert] as const)),
);