import {isEventized} from '@spearwolf/eventize';
import {afterEach, describe, expect, it} from 'vitest';
import {generateUUID} from '../utils/generateUUID.js';
import {Kernel} from './Kernel.js';
import {Registry} from './Registry.js';
import {ShadowObject, shadowObjects} from './ShadowObject.js';

describe('@ShadowObject decorator', () => {
  afterEach(() => {
    Registry.get().clear();
  });

  it('should register a class constructor by token', () => {
    @ShadowObject({token: 'test'})
    class Foo {}

    expect(Foo).toBeDefined();
    expect(Registry.get().hasToken('test')).toBeTruthy();
    expect(Registry.get().findConstructors('test')).toContain(Foo);
  });

  it('should create a shadow-object instance', () => {
    const registry = new Registry();
    const kernel = new Kernel(registry);

    @ShadowObject({registry, token: 'test'})
    class Foo {
      foo: number;
      bar = 666;

      constructor() {
        this.foo = 23;
      }
    }

    const uuid = generateUUID();
    kernel.createEntity(uuid, 'test');

    const so = kernel.findShadowObjects(uuid)?.at(-1) as unknown as Foo;

    expect(so).toBeDefined();
    expect(so).toBeInstanceOf(Foo);
    expect(isEventized(so!)).toBeTruthy();

    expect(so.foo).toBe(23);
    expect(so.bar).toBe(666);
  });
});

describe('shadowObject.define API', () => {
  afterEach(() => {
    Registry.get().clear();
  });

  it('should register a class constructor by token', () => {
    class Foo {}

    shadowObjects.define('test2', Foo);

    expect(Foo).toBeDefined();
    expect(Registry.get().hasToken('test2')).toBeTruthy();
    expect(Registry.get().findConstructors('test2')).toContain(Foo);
  });

  it('should create a shadow-object instance', () => {
    const registry = new Registry();
    const kernel = new Kernel(registry);

    class Foo {
      foo: number;
      bar = 666;

      constructor() {
        this.foo = 23;
      }
    }

    shadowObjects.define('test2', Foo, registry);

    const uuid = generateUUID();
    kernel.createEntity(uuid, 'test2');

    const so = kernel.findShadowObjects(uuid)?.at(-1) as unknown as Foo;

    expect(so).toBeDefined();
    expect(so).toBeInstanceOf(Foo);
    expect(isEventized(so!)).toBeTruthy();

    expect(so.foo).toBe(23);
    expect(so.bar).toBe(666);
  });
});
