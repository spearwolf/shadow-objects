import {eventize} from '@spearwolf/eventize';
import type {EntityConstructor} from '../types.js';
import {Registry} from './Registry.js';

export interface EntityDecoratorOptions {
  token: string;
  registry?: Registry;
}

export function Entity(options: EntityDecoratorOptions) {
  // return function <C extends EntityConstructor>(target: C, _context?: ClassDecoratorContext<C>) {
  return function <C extends EntityConstructor>(target: C, _context?: any) {
    const Entity = class extends target {
      constructor(...args: any[]) {
        super(...args);
        eventize(this);
      }
    };

    const registry = options.registry ?? Registry.get();
    registry.registerEntityComponent(options.token, Entity);

    return Entity;
  };
}
