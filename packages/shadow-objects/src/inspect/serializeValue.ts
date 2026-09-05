import {isSignal, value as readSignal} from '@spearwolf/signalize';
import type {SerializedValue, SerializeLimits} from './types.js';

export const SerializeDefaults: SerializeLimits = Object.freeze({
  maxDepth: 3,
  maxArrayLength: 20,
  maxObjectEntries: 30,
  maxStringLength: 200,
});

export const resolveSerializeLimits = (limits?: Partial<SerializeLimits>): SerializeLimits => ({
  maxDepth: limits?.maxDepth ?? SerializeDefaults.maxDepth,
  maxArrayLength: limits?.maxArrayLength ?? SerializeDefaults.maxArrayLength,
  maxObjectEntries: limits?.maxObjectEntries ?? SerializeDefaults.maxObjectEntries,
  maxStringLength: limits?.maxStringLength ?? SerializeDefaults.maxStringLength,
});

const isDomNode = (val: object): val is {nodeType: number; nodeName: string; id?: unknown} =>
  typeof (val as {nodeType?: unknown}).nodeType === 'number' && typeof (val as {nodeName?: unknown}).nodeName === 'string';

const isPlainObject = (val: object): boolean => {
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
};

const className = (val: object): string => {
  const ctor = (val as {constructor?: unknown}).constructor;
  return typeof ctor === 'function' && ctor.name ? ctor.name : 'Object';
};

const errorEntry = (error: unknown): SerializedValue => ({
  $type: 'object',
  class: 'Error',
  preview: {message: error instanceof Error ? error.message : String(error)},
});

/**
 * Turns any value into plain, JSON-safe data under a set of limits. Never throws: a getter that
 * throws while it is read becomes an error entry in place of the value.
 *
 * The rules and their order are the ones spec §7 lists. Cycles are detected along the current
 * path, so a sub-object shared between two keys appears twice rather than as `$circular`.
 */
export function serializeValue(value: unknown, limits?: Partial<SerializeLimits>): SerializedValue {
  return new Serializer(resolveSerializeLimits(limits)).serialize(value, 0, new Set());
}

class Serializer {
  constructor(private readonly limits: SerializeLimits) {}

  serialize(val: unknown, depth: number, path: Set<object>): SerializedValue {
    switch (typeof val) {
      case 'undefined':
        return {$type: 'undefined'};
      case 'boolean':
        return val;
      case 'number':
        return Number.isFinite(val) ? val : String(val);
      case 'string':
        return this.string(val);
      case 'bigint':
        return {$type: 'bigint', value: val.toString()};
      case 'symbol':
        return val.description === undefined ? {$type: 'symbol'} : {$type: 'symbol', description: val.description};
      case 'function':
        if (isSignal(val)) return this.signal(val, depth, path);
        return {$type: 'function', name: val.name};
      case 'object':
        if (val === null) return null;
        if (isSignal(val)) return this.signal(val, depth, path);
        return this.object(val, depth, path);
    }
  }

  private string(val: string): SerializedValue {
    if (val.length <= this.limits.maxStringLength) return val;
    return {$type: 'truncated', reason: 'string', original: val.length, preview: val.slice(0, this.limits.maxStringLength)};
  }

  private signal(sig: unknown, depth: number, path: Set<object>): SerializedValue {
    let current: unknown;
    try {
      current = readSignal(sig as Parameters<typeof readSignal>[0]);
    } catch (error) {
      return errorEntry(error);
    }
    return {$type: 'signal', value: this.serialize(current, depth, path)};
  }

  private object(val: object, depth: number, path: Set<object>): SerializedValue {
    if (val instanceof Date) return {$type: 'date', iso: Number.isNaN(val.getTime()) ? 'Invalid Date' : val.toISOString()};
    if (val instanceof ArrayBuffer) return {$type: 'array-buffer', byteLength: val.byteLength, class: 'ArrayBuffer'};
    if (ArrayBuffer.isView(val)) return {$type: 'typed-array', byteLength: val.byteLength, class: className(val)};
    if (isDomNode(val)) {
      return typeof val.id === 'string' && val.id
        ? {$type: 'dom', nodeName: val.nodeName, id: val.id}
        : {$type: 'dom', nodeName: val.nodeName};
    }
    if (val instanceof Error) return {$type: 'object', class: className(val), preview: {name: val.name, message: val.message}};

    if (depth > this.limits.maxDepth) return {$type: 'truncated', reason: 'depth'};
    if (path.has(val)) return {$type: 'circular'};

    path.add(val);
    try {
      if (Array.isArray(val)) return this.array(val, depth, path);
      if (val instanceof Map) {
        return {
          $type: 'object',
          class: 'Map',
          preview: {size: val.size, entries: this.array(Array.from(val.entries()), depth, path)},
        };
      }
      if (val instanceof Set) {
        return {$type: 'object', class: 'Set', preview: {size: val.size, entries: this.array(Array.from(val), depth, path)}};
      }
      if (isPlainObject(val)) return this.entries(val, depth, path);
      return {$type: 'object', class: className(val), preview: this.entries(val, depth, path)};
    } finally {
      path.delete(val);
    }
  }

  private array(val: unknown[], depth: number, path: Set<object>): SerializedValue[] {
    const out: SerializedValue[] = [];
    const max = this.limits.maxArrayLength;
    for (let i = 0; i < val.length && i < max; i++) {
      out.push(this.serialize(val[i], depth + 1, path));
    }
    if (val.length > max) out.push({$type: 'truncated', reason: 'length', original: val.length});
    return out;
  }

  private entries(val: object, depth: number, path: Set<object>): Record<string, SerializedValue> {
    const out: Record<string, SerializedValue> = {};
    const keys = Object.keys(val);
    const max = this.limits.maxObjectEntries;
    for (let i = 0; i < keys.length && i < max; i++) {
      const key = keys[i]!;
      let entry: unknown;
      try {
        entry = (val as Record<string, unknown>)[key];
      } catch (error) {
        out[key] = errorEntry(error);
        continue;
      }
      out[key] = this.serialize(entry, depth + 1, path);
    }
    if (keys.length > max) out['$truncated'] = {$type: 'truncated', reason: 'entries', original: keys.length};
    return out;
  }
}
