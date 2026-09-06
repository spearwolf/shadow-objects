import {emit, eventize, Priority} from '@spearwolf/eventize';
import {describe, expect, expectTypeOf, it, vi} from 'vitest';
import {Kernel} from './in-the-dark/Kernel.js';
import {Registry} from './in-the-dark/Registry.js';
import {ShadowObjectCreationScope} from './in-the-dark/ShadowObjectCreationScope.js';
import type {EventsOf, ShadowObjectConstructor, ShadowObjectConstructorFunc, ShadowObjectCreationAPI} from './types.js';
import {generateUUID} from './utils/generateUUID.js';

// The checks in here are for `tsc`: a `@ts-expect-error` that stops erroring, or an `expectTypeOf`
// that stops holding, fails `pnpm typecheck`. The one runtime case at the end shows the map is a
// compile-time contract over the very dispatch the Kernel already does.

class PlayerLogic {
  constructor(_api: ShadowObjectCreationAPI) {}
  onPowerUp(power: number, source?: string) {
    void power;
    void source;
  }
  onReset() {}
  label = 'not an event';
}

type PlayerEvents = EventsOf<PlayerLogic>;

describe('EventsOf<T>', () => {
  it('turns every method into an event carrying the parameter tuple, and skips the rest', () => {
    expectTypeOf<PlayerEvents>().toEqualTypeOf<{onPowerUp: [power: number, source?: string | undefined]; onReset: []}>();
  });
});

describe('ShadowObjectCreationAPI<TEvents>', () => {
  it('checks the entity-implicit forms against the map', () => {
    const typed = ({emit, on, once}: ShadowObjectCreationAPI<PlayerEvents>) => {
      emit('onPowerUp', 42);
      emit('onPowerUp', 42, 'sun');
      emit('onReset');
      // @ts-expect-error a number is expected
      emit('onPowerUp', 'x');
      // @ts-expect-error onReset carries nothing
      emit('onReset', 1);
      // @ts-expect-error not in the map
      emit('onFoo', 1);

      on('onPowerUp', (power, source) => {
        expectTypeOf(power).toEqualTypeOf<number>();
        expectTypeOf(source).toEqualTypeOf<string | undefined>();
      });
      once('onReset', Priority.High, () => {});
      // @ts-expect-error not in the map
      on('onFoo', () => {});
      // @ts-expect-error the listener disagrees with the tuple
      on('onPowerUp', (power: string) => void power);

      on({
        onPowerUp(power) {
          expectTypeOf(power).toEqualTypeOf<number>();
        },
      });
      // @ts-expect-error a method name that is no event
      on({banana() {}});

      // a symbol is the escape hatch, as in eventize
      const priv = Symbol('private');
      emit(priv, 'anything', 1);
      on(priv, (...args) => expectTypeOf(args).toEqualTypeOf<any[]>());

      // catch-all forms stay open on a typed map: they name no event
      on((...args) => void args);
      once(Priority.Low, (...args) => void args);
    };
    void typed;
  });

  it('types the target form by the map of the target, and takes any other object as eventize does', () => {
    const typed = ({emit, on}: ShadowObjectCreationAPI<PlayerEvents>) => {
      const other = eventize<{foo: [name: string]}>();
      emit(other, 'foo', 'ok');
      // @ts-expect-error the target's map says string
      emit(other, 'foo', 1);
      // @ts-expect-error not in the target's map
      emit(other, 'onPowerUp', 1);
      on(other, 'foo', (name) => expectTypeOf(name).toEqualTypeOf<string>());
      on(other, {
        foo(name) {
          expectTypeOf(name).toEqualTypeOf<string>();
        },
      });

      const loose = eventize({});
      emit(loose, 'anything', 1, 2);
      on(loose, 'anything', Priority.High, (a: unknown) => void a);
      on(loose, ['a', ['b', 10]], () => {});
      on(loose, {anything() {}});

      const plain = {} as object;
      emit(plain, 'anything');
      on(plain, 'anything', () => {});
    };
    void typed;
  });

  it('takes an EntityApi as the target', () => {
    const typed = ({emit, on, entity}: ShadowObjectCreationAPI) => {
      const child = entity.children[0];
      if (child) {
        emit(child, 'parent-command', {action: 'move'});
        on(child, 'child-ready', () => {});
      }
    };
    void typed;
  });

  it('stays loose without a map', () => {
    const loose = ({emit, on, once}: ShadowObjectCreationAPI) => {
      emit('whatever', 1, 'two', {three: 3});
      emit(['a', 'b'], 1);
      on('whatever', (a, b) => {
        expectTypeOf(a).toEqualTypeOf<any>();
        expectTypeOf(b).toEqualTypeOf<any>();
      });
      on(['a', ['b', 10]], () => {});
      on({anything() {}});
      on(Priority.High, 'handle', {handle() {}});
      once((...args) => void args);
      expectTypeOf(on('x', () => {})).toEqualTypeOf<() => void>();
    };
    void loose;
  });

  it('a constructor written against a map still fits the Registry', () => {
    function Another({emit}: ShadowObjectCreationAPI<PlayerEvents>) {
      emit('onReset');
    }
    class Typed {
      constructor(api: ShadowObjectCreationAPI<PlayerEvents>) {
        api.emit('onReset');
      }
    }
    const asFunc: ShadowObjectConstructorFunc = Another;
    const asClass: ShadowObjectConstructor = Typed;
    void asFunc;
    void asClass;
  });

  it('is a compile-time contract over the dispatch the Kernel does: emit reaches the listener object', () => {
    const kernel = new Kernel(new Registry());
    const uuid = generateUUID();
    kernel.createEntity(uuid, 'node');
    const scope = new ShadowObjectCreationScope(kernel.getEntity(uuid), kernel.logger, 'Typed', new Set<string>());
    const api = scope.createAPI() as ShadowObjectCreationAPI<PlayerEvents>;
    scope.bindTo(eventize({}), vi.fn(), vi.fn());

    const onPowerUp = vi.fn();
    api.on({onPowerUp});
    api.emit('onPowerUp', 42, 'sun');
    emit(kernel.getEntity(uuid), 'onPowerUp', 7);

    expect(onPowerUp.mock.calls).toEqual([[42, 'sun'], [7]]);

    kernel.destroy();
  });
});
