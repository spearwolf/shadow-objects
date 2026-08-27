import {isEventized} from '@spearwolf/eventize';
import {afterEach, describe, expect, it, vi} from 'vitest';
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

  it('keeps the name of the decorated class', () => {
    @ShadowObject({token: 'keepsItsName'})
    class KeepsItsName {}

    expect(KeepsItsName.name).toBe('KeepsItsName');
  });

  it('names the decorated class in a kernel diagnostic', () => {
    const registry = new Registry();
    const kernel = new Kernel(registry);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    @ShadowObject({registry, token: 'plainOnCreateHook'})
    class PlainOnCreateHook {
      onCreate() {}
    }

    expect(PlainOnCreateHook).toBeDefined();

    kernel.createEntity(generateUUID(), 'plainOnCreateHook');

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError.mock.calls[0]).toContain('PlainOnCreateHook');

    consoleError.mockRestore();
    kernel.destroy();
  });

  it('lets a static displayName through', () => {
    @ShadowObject({token: 'carriesADisplayName'})
    class CarriesADisplayName {
      static displayName = 'a name of its own';
    }

    expect(CarriesADisplayName.displayName).toBe('a name of its own');
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
