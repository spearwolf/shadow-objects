import {eventize} from '@spearwolf/eventize';
import type {ShadowObjectConstructor} from '../types.js';
import {Registry} from './Registry.js';

export interface ShadowObjectDecoratorOptions {
  token: string;
  registry?: Registry;
}

/** The `@ShadowObject` decorator */
export function ShadowObject(options: ShadowObjectDecoratorOptions) {
  // return function <C extends EntityConstructor>(target: C, _context?: ClassDecoratorContext<C>) {
  return function <C extends ShadowObjectConstructor>(target: C, _context?: any) {
    const SO = class extends target {
      constructor(...args: any[]) {
        super(...args);
        eventize(this);
      }
    };

    Registry.get(options.registry).define(options.token, SO);

    return SO;
  };
}
