import {eventize} from '@spearwolf/eventize';
import type {ShadowObjectConstructor} from '../types.js';
import {Registry} from './Registry.js';

export interface ShadowObjectDecoratorOptions {
  token: string;
  registry?: Registry;
}

/** The `@ShadowObject` decorator */
export function ShadowObject(options: ShadowObjectDecoratorOptions) {
  return function <C extends ShadowObjectConstructor>(target: C, _context?: any) {
    const __ShadowObject = class extends target {
      constructor(...args: any[]) {
        super(...args);
        eventize(this);
      }
    };

    Registry.get(options.registry).define(options.token, __ShadowObject);

    return __ShadowObject;
  };
}

/**
 * If you don't want to use the decorator, you can simply call this method instead.
 */
export const shadowObjects = {
  define(token: string, constructor: ShadowObjectConstructor, registry?: Registry) {
    Registry.get(registry).define(token, constructor);
  },
};
