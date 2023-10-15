import {isEventized} from '@spearwolf/eventize';
import {afterEach, describe, expect, it} from 'vitest';
import {Entity} from './Entity.js';
import {Kernel} from './Kernel.js';
import {Registry} from './Registry.js';

describe('@Entity decorator', () => {
  afterEach(() => {
    Registry.get().clear();
  });

  it('should register a class constructor by token', () => {
    @Entity({token: 'test'})
    class Foo {}

    expect(Foo).toBeDefined();
    expect(Registry.get().hasToken('test')).toBeTruthy();
    expect(Registry.get().findConstructors('test')).toContain(Foo);
  });

  it('should create an entity component instance', () => {
    const registry = new Registry();
    const kernel = new Kernel(registry);

    @Entity({registry, token: 'test'})
    class Foo {
      foo: number;
      bar = 666;

      constructor() {
        this.foo = 23;
      }
    }

    const entity = kernel.createEntityInstances('test')?.at(-1) as Foo;

    expect(entity).toBeDefined();
    expect(entity).toBeInstanceOf(Foo);
    expect(isEventized(entity!)).toBeTruthy();

    expect(entity.foo).toBe(23);
    expect(entity.bar).toBe(666);
  });
});
