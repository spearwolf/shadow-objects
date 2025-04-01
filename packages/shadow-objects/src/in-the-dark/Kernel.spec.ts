import {afterEach, describe, expect, it} from 'vitest';
import {generateUUID} from '../utils/generateUUID.js';
import {Kernel} from './Kernel.js';
import {Registry} from './Registry.js';
import {ShadowObject} from './ShadowObject.js';

describe('Kernel', () => {
  afterEach(() => {
    Registry.get().clear();
  });

  it('upgrade entities', () => {
    @ShadowObject({token: 'foo'})
    class Foo {}

    @ShadowObject({token: 'bar'})
    class Bar {}

    expect(Foo).toBeDefined();
    expect(Bar).toBeDefined();

    const kernel = new Kernel();
    const [parentUuid, uuid] = [generateUUID(), generateUUID()];

    kernel.createEntity(parentUuid, 'testA');
    kernel.createEntity(uuid, 'testB', parentUuid);

    expect(kernel.findShadowObjects(parentUuid)).toHaveLength(0);
    expect(kernel.findShadowObjects(uuid)).toHaveLength(0);

    kernel.registry.appendRoute('testA', ['foo']);
    kernel.registry.appendRoute('testB', ['bar']);
    kernel.upgradeEntities();

    expect(kernel.findShadowObjects(parentUuid)).toHaveLength(1);
    expect(kernel.findShadowObjects(parentUuid)[0]).toBeInstanceOf(Foo);
    expect(kernel.findShadowObjects(uuid)).toHaveLength(1);
    expect(kernel.findShadowObjects(uuid)[0]).toBeInstanceOf(Bar);
  });

  it('create shadow-objects by same token', () => {
    @ShadowObject({token: 'test'})
    class Foo {}

    @ShadowObject({token: 'test'})
    class Bar {}

    expect(Foo).toBeDefined();
    expect(Bar).toBeDefined();

    expect(Registry.get().hasToken('test')).toBeTruthy();

    const kernel = new Kernel();
    const uuid = generateUUID();

    kernel.createEntity(uuid, 'test');

    const shadowObjects = kernel.findShadowObjects(uuid);

    expect(shadowObjects).toHaveLength(2);

    expect(shadowObjects.find((so) => so instanceof Foo)).toBeDefined();
    expect(shadowObjects.find((so) => so instanceof Bar)).toBeDefined();
  });

  it('change token', () => {
    @ShadowObject({token: 'foo'})
    class Foo {
      // name = 'foo';
    }

    @ShadowObject({token: 'bar'})
    class Bar {
      // name = 'bar';
    }

    @ShadowObject({token: 'plah'})
    class Plah {
      // name = 'plah';
    }

    @ShadowObject({token: 'obDir'})
    class ObersteDirektive {}

    const registry = Registry.get();

    registry.appendRoute('testA', ['foo', 'bar']);
    registry.appendRoute('testB', ['bar', 'plah']);
    registry.appendRoute('testB', ['bar', 'plah']);
    registry.appendRoute('@plah', ['obDir']);

    expect(Foo).toBeDefined();
    expect(Bar).toBeDefined();
    expect(Plah).toBeDefined();
    expect(ObersteDirektive).toBeDefined();

    expect(registry.hasRoute('testA')).toBeTruthy();
    expect(registry.hasRoute('testB')).toBeTruthy();
    expect(registry.hasRoute('@plah'), '@plah should be no ordinary route').toBeFalsy();

    expect(registry.findConstructors('testA'), 'testA should contain Foo').toContain(Foo);
    expect(registry.findConstructors('testA'), 'testA should contain Bar').toContain(Bar);
    expect(registry.findConstructors('testB'), 'testB should contain Bar').toContain(Bar);
    expect(registry.findConstructors('testB'), 'testB should contain Plah').toContain(Plah);

    const kernel = new Kernel();
    const uuid = generateUUID();

    kernel.createEntity(uuid, 'testA');

    let shadowObjects = kernel.findShadowObjects(uuid); // as unknown as {name: string}[];

    // console.log(
    //   'shadowObjects before changeToken',
    //   shadowObjects.map((so) => so.name),
    // );

    expect(shadowObjects, 'testA shadow-constructors').toHaveLength(2);
    expect(
      shadowObjects.find((so) => so instanceof Foo),
      'should contain instanceof Foo',
    ).toBeDefined();

    const bar = shadowObjects.find((so) => so instanceof Bar);
    expect(bar, 'should contain instanceof Bar').toBeDefined();

    kernel.changeToken(uuid, 'testB');

    shadowObjects = kernel.findShadowObjects(uuid); // as unknown as {name: string}[];

    expect(shadowObjects, 'check 2').toHaveLength(2);

    // console.log(
    //   'shadowObjects after changeToken',
    //   shadowObjects.map((so) => so.name),
    // );

    expect(
      shadowObjects.find((so) => so === bar),
      'should contain bar instance',
    ).toBeDefined();

    expect(
      shadowObjects.find((so) => so instanceof Plah),
      'should contain instanceof Plah',
    ).toBeDefined();

    kernel.changeProperties(uuid, [['plah', 'hello']]);

    // console.log('truthyProps', Array.from(kernel.getEntity(uuid).truthyProps()));
    // console.log('changeProperties', Array.from(kernel.getEntity(uuid).propKeys()));

    shadowObjects = kernel.findShadowObjects(uuid);

    expect(shadowObjects, 'check 3').toHaveLength(3);

    expect(
      shadowObjects.find((so) => so instanceof ObersteDirektive),
      'should contain instanceof ObersteDirektive',
    ).toBeDefined();
  });
});
