import {eventize} from '@spearwolf/eventize';
import type {ShadowObjectConstructor} from '../types.js';
import {Registry} from './Registry.js';

export interface ShadowObjectDecoratorOptions {
  token: string;
  registry?: Registry;
}

/** The `@ShadowObject` decorator */
export function ShadowObject(options: ShadowObjectDecoratorOptions) {
  return <C extends ShadowObjectConstructor>(target: C, _context?: any) => {
    // @ts-ignore
    const __ShadowObject = class extends target {
      constructor(...args: any[]) {
        // @ts-ignore
        super(...args);
        eventize(this);
      }
    };

    // The wrapper is a class expression, so it owns a `name` that shadows the inherited one.
    // `getDisplayName()` in the Kernel reads that name for every diagnostic about this
    // shadow-object, so the wrapper carries the name of the class it wraps.
    Object.defineProperty(__ShadowObject, 'name', {value: target.name, configurable: true});

    Registry.get(options.registry).define(options.token, __ShadowObject);

    return __ShadowObject;
  };
}

/**
 * If you don't want to use the decorator, you can simply call this method instead.
 */
export const shadowObjects = {
  define(token: string, constructa: ShadowObjectConstructor, registry?: Registry) {
    Registry.get(registry).define(token, constructa);
  },
};
