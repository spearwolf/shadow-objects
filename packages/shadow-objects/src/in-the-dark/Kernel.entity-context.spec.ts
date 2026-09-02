import {createEffect, createSignal, destroySignal, type Signal, value} from '@spearwolf/signalize';
import {afterEach, describe, expect, it, vi} from 'vitest';
import type {ShadowObjectCreationAPI} from '../types.js';
import {generateUUID} from '../utils/generateUUID.js';
import {Kernel} from './Kernel.js';
import {Registry} from './Registry.js';
import {ShadowObject, shadowObjects} from './ShadowObject.js';

describe('Kernel', () => {
  afterEach(() => {
    Registry.get().clear();
  });

  describe('Shadow Object Creation API', () => {
    describe('provideContext and useContext', () => {
      it('should provide and consume context values between parent and child', async () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const contextName = Symbol('testContext');
        let capturedContext: ReturnType<ShadowObjectCreationAPI['useContext']> | undefined;

        @ShadowObject({registry, token: 'parentProvider'})
        class ParentProvider {
          constructor({provideContext}: ShadowObjectCreationAPI) {
            provideContext(contextName, 'contextValue');
          }
        }
        expect(ParentProvider).toBeDefined();

        @ShadowObject({registry, token: 'childConsumer'})
        class ChildConsumer {
          constructor({useContext}: ShadowObjectCreationAPI) {
            capturedContext = useContext(contextName);
          }
        }
        expect(ChildConsumer).toBeDefined();

        const parentUuid = generateUUID();
        const childUuid = generateUUID();

        kernel.createEntity(parentUuid, 'parentProvider');
        kernel.createEntity(childUuid, 'childConsumer', parentUuid);

        // Wait for context propagation via queueMicrotask
        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

        expect(capturedContext).toBeDefined();
        expect(value(capturedContext!)).toBe('contextValue');

        kernel.destroy();
      });

      it('should accept a signal reader as context source', async () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const contextName = 'signalContext';
        const sourceSignal = createSignal('initial');
        let capturedContext: ReturnType<ShadowObjectCreationAPI['useContext']> | undefined;

        @ShadowObject({registry, token: 'signalProvider'})
        class SignalProvider {
          constructor({provideContext}: ShadowObjectCreationAPI) {
            provideContext(contextName, sourceSignal.get);
          }
        }
        expect(SignalProvider).toBeDefined();

        @ShadowObject({registry, token: 'signalConsumer'})
        class SignalConsumer {
          constructor({useContext}: ShadowObjectCreationAPI) {
            capturedContext = useContext(contextName);
          }
        }
        expect(SignalConsumer).toBeDefined();

        const parentUuid = generateUUID();
        const childUuid = generateUUID();

        kernel.createEntity(parentUuid, 'signalProvider');
        kernel.createEntity(childUuid, 'signalConsumer', parentUuid);

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(capturedContext!)).toBe('initial');

        sourceSignal.set('updated');
        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(capturedContext!)).toBe('updated');

        kernel.destroy();
      });

      it('should return same context reader when called multiple times', () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        let ctx1: ReturnType<ShadowObjectCreationAPI['useContext']> | undefined;
        let ctx2: ReturnType<ShadowObjectCreationAPI['useContext']> | undefined;

        @ShadowObject({registry, token: 'testContextCache'})
        class TestContextCache {
          constructor({useContext}: ShadowObjectCreationAPI) {
            ctx1 = useContext('myContext');
            ctx2 = useContext('myContext');
          }
        }
        expect(TestContextCache).toBeDefined();

        const uuid = generateUUID();
        kernel.createEntity(uuid, 'testContextCache');

        expect(ctx1).toBe(ctx2);

        kernel.destroy();
      });

      // The five cases below all tear down through the path where the parent entity stays alive
      // and its shadow-object leaves the constructor set (a token change), except the last one,
      // which uses the other path (the entity itself is destroyed) on purpose -- see its own
      // comment.
      describe('clearOnDestroy', () => {
        it('leaves the provider signal -- and what a child reads through useContext -- in place when clearOnDestroy is false', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          let provider: Signal<string | undefined> | undefined;

          @ShadowObject({registry, token: 'contextKeptOnLeave'})
          class ContextKeptOnLeave {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provider = provideContext('keptContext', 'first', {clearOnDestroy: false});
            }
          }
          expect(ContextKeptOnLeave).toBeDefined();

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'contextKeptOnLeave');
          kernel.createEntity(childUuid, 'contextKeptOnLeaveChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('keptContext');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(provider!)).toBe('first');
          expect(value(childContext)).toBe('first');

          kernel.changeToken(parentUuid, 'contextKeptOnLeaveEmpty');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(provider!)).toBe('first');
          expect(value(childContext)).toBe('first');

          kernel.destroy();
        });

        it('clears the provider signal back to undefined on this path when clearOnDestroy defaults to true', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          let provider: Signal<string | undefined> | undefined;

          @ShadowObject({registry, token: 'contextDefaultProviderOnLeave'})
          class ContextDefaultProviderOnLeave {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provider = provideContext('defaultProviderContext', 'first');
            }
          }
          expect(ContextDefaultProviderOnLeave).toBeDefined();

          const uuid = generateUUID();
          kernel.createEntity(uuid, 'contextDefaultProviderOnLeave');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(provider!)).toBe('first');

          kernel.changeToken(uuid, 'contextDefaultProviderOnLeaveEmpty');

          expect(value(provider!)).toBeUndefined();

          kernel.destroy();
        });

        it('reads clearOnDestroy on every call, not only on the one that creates the provider', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          let provider: Signal<string | undefined> | undefined;

          @ShadowObject({registry, token: 'contextClearOnSecondCall'})
          class ContextClearOnSecondCall {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              // The first call creates the provider and opts out of the clear. The second call for
              // the same name finds the provider already there and takes the default, and its
              // `clearOnDestroy` has to count all the same -- every call adds to the teardown, not
              // just the one that allocated the signal.
              provider = provideContext('secondCallContext', 'first', {clearOnDestroy: false});
              provideContext('secondCallContext');
            }
          }
          expect(ContextClearOnSecondCall).toBeDefined();

          const uuid = generateUUID();
          kernel.createEntity(uuid, 'contextClearOnSecondCall');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(provider!)).toBe('first');

          kernel.changeToken(uuid, 'contextClearOnSecondCallEmpty');

          expect(value(provider!)).toBeUndefined();

          kernel.destroy();
        });

        it('carries that clear to a child reading through useContext', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          @ShadowObject({registry, token: 'contextDefaultOnLeave'})
          class ContextDefaultOnLeave {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('defaultContext', 'first');
            }
          }
          expect(ContextDefaultOnLeave).toBeDefined();

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'contextDefaultOnLeave');
          kernel.createEntity(childUuid, 'contextDefaultOnLeaveChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('defaultContext');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('first');

          // On this path nothing but the write itself carries the clear: the parent entity lives
          // on, keeps its context signal, and the child stays linked to it throughout. The write
          // to `undefined` gets through because the link from this provider to the entity-level
          // context signal is cut after every other cleanup callback. The case below reaches the
          // same `undefined` over the other path, and by an entirely different route.
          kernel.changeToken(parentUuid, 'contextDefaultOnLeaveEmpty');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBeUndefined();

          kernel.destroy();
        });

        it('carries that clear to a child reading through useContext when the parent entity is destroyed', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          @ShadowObject({registry, token: 'contextDefaultOnParentDestroy'})
          class ContextDefaultOnParentDestroy {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('defaultContextParentDestroy', 'first');
            }
          }
          expect(ContextDefaultOnParentDestroy).toBeDefined();

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'contextDefaultOnParentDestroy');
          kernel.createEntity(childUuid, 'contextDefaultOnParentDestroyChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('defaultContextParentDestroy');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('first');

          // Here neither the `clearOnDestroy` callback nor the teardown of the parent's context
          // signal is what the child sees. `Kernel.destroyEntity()` detaches every surviving child
          // first, and detaching re-binds the child's inherited signal from the parent to the
          // kernel's root context, which holds nothing under this name -- that is the `undefined`.
          // Only afterwards does the parent emit `onDestroy`, by which time no link points at the
          // child any more. The case stands as the counterpart to the one above: both paths end at
          // `undefined`, each for its own reason.
          kernel.destroyEntity(parentUuid);

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBeUndefined();

          kernel.destroy();
        });
      });

      // Several shadow-objects of one entity may provide the same context name. They all feed the
      // one entity-side signal of that name, so a consumer reads whatever was written last -- after
      // construction that is the value of the last constructor in the set. When one of them leaves,
      // the entity hands the name back to a provider that is still there, rather than leaving the
      // consumers with what the departure wrote.
      //
      // The constructor sets below are built without the decorator: `@ShadowObject` takes exactly
      // one token, and these cases need two tokens pointing at the same class, so that a token
      // change drops one constructor and leaves the other in place. `#updateShadowObjects()` does
      // not re-run a constructor that is already in use, so the staying shadow-object is untouched.
      describe('two shadow-objects providing the same context name', () => {
        it('hands the context to the provider that stays when the other one leaves the constructor set', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          class BaseTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          class OverlayTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'overlay');
            }
          }

          shadowObjects.define('themeBoth', BaseTheme, registry);
          shadowObjects.define('themeBoth', OverlayTheme, registry);
          shadowObjects.define('themeBaseOnly', BaseTheme, registry);

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'themeBoth');
          kernel.createEntity(childUuid, 'themeChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('theme');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext), 'the last constructor of the set wrote last').toBe('overlay');

          kernel.changeToken(parentUuid, 'themeBaseOnly');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext), 'the provider that stays pushes its value again').toBe('dark');

          kernel.destroy();
        });

        it('takes the value of the provider attached last among several that stay', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          class BaseTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          class MidTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'mid');
            }
          }

          class OverlayTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'overlay');
            }
          }

          shadowObjects.define('themeAll', BaseTheme, registry);
          shadowObjects.define('themeAll', MidTheme, registry);
          shadowObjects.define('themeAll', OverlayTheme, registry);
          shadowObjects.define('themeWithoutOverlay', BaseTheme, registry);
          shadowObjects.define('themeWithoutOverlay', MidTheme, registry);

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'themeAll');
          kernel.createEntity(childUuid, 'themeChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('theme');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('overlay');

          kernel.changeToken(parentUuid, 'themeWithoutOverlay');

          // Two providers stay and both hold a value, so the hand-over has to choose between them.
          // It goes to the one attached last, which keeps the precedence that holds among living
          // providers: the later attachment already outranked the earlier one before the departure.
          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('mid');

          kernel.destroy();
        });

        it('hands the context over even where both providers hold the same value', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          class BaseTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          class OverlayTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          shadowObjects.define('themeBoth', BaseTheme, registry);
          shadowObjects.define('themeBoth', OverlayTheme, registry);
          shadowObjects.define('themeBaseOnly', BaseTheme, registry);

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'themeBoth');
          kernel.createEntity(childUuid, 'themeChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('theme');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('dark');

          kernel.changeToken(parentUuid, 'themeBaseOnly');

          // Nothing about the staying provider changes here: its value was already the one the
          // context is meant to end up with, and its signal is never written to. Only the hand-over
          // pushes it through again, so this case fails wherever the departure is allowed to have
          // the last word just because the two providers were indistinguishable.
          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('dark');

          kernel.destroy();
        });

        it('takes the context from a provider that opted out of clearOnDestroy', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          class BaseTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          class OverlayTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'overlay', {clearOnDestroy: false});
            }
          }

          shadowObjects.define('themeBoth', BaseTheme, registry);
          shadowObjects.define('themeBoth', OverlayTheme, registry);
          shadowObjects.define('themeBaseOnly', BaseTheme, registry);

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'themeBoth');
          kernel.createEntity(childUuid, 'themeChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('theme');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('overlay');

          kernel.changeToken(parentUuid, 'themeBaseOnly');

          // `clearOnDestroy: false` keeps the leaving provider from writing `undefined`, but it does
          // not entitle its value to outlive it on an entity that still has a provider of the name.
          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('dark');

          kernel.destroy();
        });

        it('skips a remaining provider that holds nothing', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          class BaseTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          class EmptyTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme');
            }
          }

          class OverlayTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'overlay');
            }
          }

          shadowObjects.define('themeAll', BaseTheme, registry);
          shadowObjects.define('themeAll', EmptyTheme, registry);
          shadowObjects.define('themeAll', OverlayTheme, registry);
          shadowObjects.define('themeWithoutOverlay', BaseTheme, registry);
          shadowObjects.define('themeWithoutOverlay', EmptyTheme, registry);

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'themeAll');
          kernel.createEntity(childUuid, 'themeChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('theme');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('overlay');

          kernel.changeToken(parentUuid, 'themeWithoutOverlay');

          // The empty provider is the one attached last, but it holds nothing, so the hand-over
          // walks past it to the one that does.
          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('dark');

          kernel.destroy();
        });

        it('passes over a provider whose signal was destroyed', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          class BaseTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          // A Shadow Object owns the signal it is handed and may end it early. That kills the feed
          // without the release the entity handed out ever running, so the entity still lists a feed
          // whose source holds a value and whose writes go nowhere.
          class ZombieTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              destroySignal(provideContext('theme', 'zombie'));
            }
          }

          class OverlayTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'overlay');
            }
          }

          shadowObjects.define('themeAll', BaseTheme, registry);
          shadowObjects.define('themeAll', ZombieTheme, registry);
          shadowObjects.define('themeAll', OverlayTheme, registry);
          shadowObjects.define('themeWithoutOverlay', BaseTheme, registry);
          shadowObjects.define('themeWithoutOverlay', ZombieTheme, registry);

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'themeAll');
          kernel.createEntity(childUuid, 'themeChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('theme');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('overlay');

          kernel.changeToken(parentUuid, 'themeWithoutOverlay');

          // The dead feed is the last one holding a value, so a hand-over that only looked at the
          // value would elect it and then write nothing at all, leaving the clear of the departing
          // provider standing over a provider that is very much alive.
          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('dark');

          kernel.destroy();
        });

        it('walks back over several providers that leave in one token change', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          class BaseTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          class MidTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'mid');
            }
          }

          class OverlayTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'overlay');
            }
          }

          shadowObjects.define('themeAll', BaseTheme, registry);
          shadowObjects.define('themeAll', MidTheme, registry);
          shadowObjects.define('themeAll', OverlayTheme, registry);
          shadowObjects.define('themeBaseOnly', BaseTheme, registry);

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'themeAll');
          kernel.createEntity(childUuid, 'themeChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('theme');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

          const seen: unknown[] = [];
          const effect = createEffect(() => {
            seen.push(childContext());
          });

          kernel.changeToken(parentUuid, 'themeBaseOnly');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

          // Two departures in one synchronous run, so the walk runs twice and has to land on a different feed
          // the second time -- first on the overlay provider at the top, which is itself about to leave, then
          // on the base one at the bottom. The departures follow the order in which the constructors were
          // used, so the middle one goes first and leaves the top one as the last attachment still holding a
          // value. What a consumer sees of that is only where it ended, because the entity collects the writes
          // to its context signal and flushes them one microtask later; `seen` therefore holds the value that
          // stood before the token change and the one that stands after it, never a value from in between: the
          // context signal takes only the last of the buffered writes, whichever way the walk went.
          expect(seen).toEqual(['overlay', 'dark']);

          effect.destroy();
          kernel.destroy();
        });

        it('writes undefined once the last provider of the name is gone', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          class BaseTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          class OverlayTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'overlay');
            }
          }

          shadowObjects.define('themeBoth', BaseTheme, registry);
          shadowObjects.define('themeBoth', OverlayTheme, registry);

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'themeBoth');
          kernel.createEntity(childUuid, 'themeChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('theme');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('overlay');

          kernel.changeToken(parentUuid, 'themeNone');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBeUndefined();

          kernel.destroy();
        });

        it('hands the context back to the previous provider when a later one throws in its constructor', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          class BaseTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          class OverlayTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'overlay');
            }
          }

          class ThrowingTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'half-built');
              throw new Error('no theme for you');
            }
          }

          shadowObjects.define('themeBoth', BaseTheme, registry);
          shadowObjects.define('themeBoth', OverlayTheme, registry);
          shadowObjects.define('themeWithThrower', BaseTheme, registry);
          shadowObjects.define('themeWithThrower', ThrowingTheme, registry);

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'themeBoth');
          kernel.createEntity(childUuid, 'themeChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('theme');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('overlay');

          // The scope of a constructor that throws is torn down on the spot, and that teardown runs the
          // same hand-over, so the half-built provider is gone by the time the token change is taken
          // back. The rollback then rebuilds the provider that left, and the child reads it again.
          expect(() => kernel.changeToken(parentUuid, 'themeWithThrower')).toThrow('no theme for you');

          expect(kernel.hasEntity(parentUuid)).toBe(true);
          expect(kernel.getEntityGraph()[0]!.token).toBe('themeBoth');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext), 'the context the failed token change would have taken away is back').toBe('overlay');

          kernel.destroy();
        });

        it('hands the name to the provider that stays when a rebuild throws and the leaving one cannot come back', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          class BaseTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          class OverlayTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'overlay');
            }
          }

          class ThrowingTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'half-built');
              throw new Error('no theme for you');
            }
          }

          shadowObjects.define('themeBase', BaseTheme, registry);
          shadowObjects.define('themeOverlay', OverlayTheme, registry);
          registry.appendRoute('@overlay', ['themeOverlay']);

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'themeBase', undefined, 0, [['overlay', true]]);
          kernel.createEntity(childUuid, 'themeChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('theme');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('overlay');

          // An upgrade takes its shadow-objects down in a first pass over the whole entity tree and builds
          // in a second, which puts what the first pass took beyond the reach of the rollback. The overlay
          // provider therefore leaves for good, and what is left to read is what the entity handed the name
          // back to when it went.
          registry.clearRoute('@overlay');
          shadowObjects.define('themeBase', ThrowingTheme, registry);

          expect(() => kernel.upgradeEntities()).toThrow('no theme for you');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext), 'the provider that stays takes the name over').toBe('dark');

          kernel.destroy();
        });

        it('hands the context over even when the leaving provider throws in its onDestroy callback', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          class BaseTheme {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provideContext('theme', 'dark');
            }
          }

          class OverlayTheme {
            constructor({provideContext, onDestroy: registerDestroy}: ShadowObjectCreationAPI) {
              provideContext('theme', 'stale');
              registerDestroy(() => {
                throw new Error('this destroy callback fails');
              });
            }
          }

          shadowObjects.define('themeBoth', BaseTheme, registry);
          shadowObjects.define('themeBoth', OverlayTheme, registry);
          shadowObjects.define('themeBaseOnly', BaseTheme, registry);

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'themeBoth');
          kernel.createEntity(childUuid, 'themeChild', parentUuid);

          const childContext = kernel.getEntity(childUuid).useContext('theme');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('stale');

          const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

          expect(() => kernel.changeToken(parentUuid, 'themeBaseOnly')).not.toThrow();

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(childContext)).toBe('dark');
          expect(kernel.findShadowObjects(parentUuid)).toHaveLength(1);

          consoleError.mockRestore();

          kernel.destroy();
        });
      });

      // `useContext()` links its own local reader to the entity-level context signal. The two
      // cases below hold the *reader* side of that wire (not a downstream consumer of it): it
      // stops following the parent once this shadow-object's own teardown runs, on either of the
      // two paths it can run through. Two independent pieces of `Kernel.ts` teardown code reach
      // that same outcome -- the explicit link-destroy this shadow-object registered, and the
      // fact that the reader's own signal is destroyed a few lines later, which severs any link
      // still pointing at it as a side effect of that destruction. Either one alone already stops
      // the reader from following; only removing both at once reproduces a reader that keeps
      // updating past its own teardown.
      describe('teardown', () => {
        it('stops following the parent context when the shadow-object leaves the set', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          let provider: Signal<string | undefined> | undefined;

          @ShadowObject({registry, token: 'readerFreezeParent'})
          class ReaderFreezeParent {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provider = provideContext('readerFreezeCtx', 'first');
            }
          }
          expect(ReaderFreezeParent).toBeDefined();

          let reader: ReturnType<ShadowObjectCreationAPI['useContext']> | undefined;

          @ShadowObject({registry, token: 'readerFreezeChildBefore'})
          class ReaderFreezeChildBefore {
            constructor({useContext}: ShadowObjectCreationAPI) {
              reader = useContext('readerFreezeCtx');
            }
          }

          @ShadowObject({registry, token: 'readerFreezeChildAfter'})
          class ReaderFreezeChildAfter {}

          expect(ReaderFreezeChildBefore).toBeDefined();
          expect(ReaderFreezeChildAfter).toBeDefined();

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'readerFreezeParent');
          kernel.createEntity(childUuid, 'readerFreezeChildBefore', parentUuid);

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(reader!)).toBe('first');

          kernel.changeToken(childUuid, 'readerFreezeChildAfter');

          provider!.set('second');
          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(reader!)).toBe('first');

          kernel.destroy();
        });

        it('stops following the parent context when the entity is destroyed', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          let provider: Signal<string | undefined> | undefined;

          @ShadowObject({registry, token: 'readerFreezeParentA'})
          class ReaderFreezeParentA {
            constructor({provideContext}: ShadowObjectCreationAPI) {
              provider = provideContext('readerFreezeCtxA', 'first');
            }
          }
          expect(ReaderFreezeParentA).toBeDefined();

          let reader: ReturnType<ShadowObjectCreationAPI['useContext']> | undefined;

          @ShadowObject({registry, token: 'readerFreezeChildA'})
          class ReaderFreezeChildA {
            constructor({useContext}: ShadowObjectCreationAPI) {
              reader = useContext('readerFreezeCtxA');
            }
          }
          expect(ReaderFreezeChildA).toBeDefined();

          const parentUuid = generateUUID();
          const childUuid = generateUUID();

          kernel.createEntity(parentUuid, 'readerFreezeParentA');
          kernel.createEntity(childUuid, 'readerFreezeChildA', parentUuid);

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(reader!)).toBe('first');

          kernel.destroyEntity(childUuid);

          provider!.set('second');
          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(reader!)).toBe('first');

          kernel.destroy();
        });
      });
    });

    describe('useParentContext', () => {
      it('should consume context from parent only', async () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const contextName = 'parentOnlyContext';
        let capturedParentContext: ReturnType<ShadowObjectCreationAPI['useParentContext']> | undefined;

        @ShadowObject({registry, token: 'parentCtxProvider'})
        class ParentCtxProvider {
          constructor({provideContext}: ShadowObjectCreationAPI) {
            provideContext(contextName, 'parentValue');
          }
        }
        expect(ParentCtxProvider).toBeDefined();

        @ShadowObject({registry, token: 'childCtxConsumer'})
        class ChildCtxConsumer {
          constructor({useParentContext}: ShadowObjectCreationAPI) {
            capturedParentContext = useParentContext(contextName);
          }
        }
        expect(ChildCtxConsumer).toBeDefined();

        const parentUuid = generateUUID();
        const childUuid = generateUUID();

        kernel.createEntity(parentUuid, 'parentCtxProvider');
        kernel.createEntity(childUuid, 'childCtxConsumer', parentUuid);

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(capturedParentContext!)).toBe('parentValue');

        kernel.destroy();
      });

      it('notifies its reader once when the kernel moves the entity to another parent', async () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const seen: unknown[] = [];

        @ShadowObject({registry, token: 'ctxFromA'})
        class CtxFromA {
          constructor({provideContext}: ShadowObjectCreationAPI) {
            provideContext('movedCtx', 'from-a');
          }
        }
        expect(CtxFromA).toBeDefined();

        @ShadowObject({registry, token: 'ctxFromB'})
        class CtxFromB {
          constructor({provideContext}: ShadowObjectCreationAPI) {
            provideContext('movedCtx', 'from-b');
          }
        }
        expect(CtxFromB).toBeDefined();

        @ShadowObject({registry, token: 'ctxReader'})
        class CtxReader {
          constructor({useParentContext, createEffect}: ShadowObjectCreationAPI) {
            const ctx = useParentContext('movedCtx');
            // The explicit dependency is what makes the effect follow the context: without it the
            // effect runs once and sees none of the values that arrive afterwards.
            createEffect(() => {
              seen.push(value(ctx));
            }, [ctx]);
          }
        }
        expect(CtxReader).toBeDefined();

        const [aUuid, bUuid, cUuid] = [generateUUID(), generateUUID(), generateUUID()];

        kernel.createEntity(aUuid, 'ctxFromA');
        kernel.createEntity(bUuid, 'ctxFromB');
        kernel.createEntity(cUuid, 'ctxReader', aUuid);

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

        expect(seen).toEqual(['from-a']);

        kernel.setParent(cUuid, bUuid);

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

        expect(seen, 'the move is one change to the reader, not several').toEqual(['from-a', 'from-b']);

        kernel.destroy();
      });

      // Mirrors 'stops following the parent context when the shadow-object leaves the set' under
      // `useContext` above -- `useParentContext()` links its own local reader to the entity-level
      // source the exact same way, on the exact same teardown path.
      it('stops following the parent context when the shadow-object leaves the set', async () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        let provider: Signal<string | undefined> | undefined;

        @ShadowObject({registry, token: 'parentReaderFreezeParent'})
        class ParentReaderFreezeParent {
          constructor({provideContext}: ShadowObjectCreationAPI) {
            provider = provideContext('parentReaderFreezeCtx', 'first');
          }
        }
        expect(ParentReaderFreezeParent).toBeDefined();

        let reader: ReturnType<ShadowObjectCreationAPI['useParentContext']> | undefined;

        @ShadowObject({registry, token: 'parentReaderFreezeChildBefore'})
        class ParentReaderFreezeChildBefore {
          constructor({useParentContext}: ShadowObjectCreationAPI) {
            reader = useParentContext('parentReaderFreezeCtx');
          }
        }

        @ShadowObject({registry, token: 'parentReaderFreezeChildAfter'})
        class ParentReaderFreezeChildAfter {}

        expect(ParentReaderFreezeChildBefore).toBeDefined();
        expect(ParentReaderFreezeChildAfter).toBeDefined();

        const parentUuid = generateUUID();
        const childUuid = generateUUID();

        kernel.createEntity(parentUuid, 'parentReaderFreezeParent');
        kernel.createEntity(childUuid, 'parentReaderFreezeChildBefore', parentUuid);

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(reader!)).toBe('first');

        kernel.changeToken(childUuid, 'parentReaderFreezeChildAfter');

        provider!.set('second');
        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(reader!)).toBe('first');

        kernel.destroy();
      });
    });

    describe('provideGlobalContext', () => {
      it('should provide global context accessible by all entities', async () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const globalCtxName = 'globalContext';
        let capturedGlobalCtx: ReturnType<ShadowObjectCreationAPI['useContext']> | undefined;

        @ShadowObject({registry, token: 'globalProvider'})
        class GlobalProvider {
          constructor({provideGlobalContext}: ShadowObjectCreationAPI) {
            provideGlobalContext(globalCtxName, 'globalValue');
          }
        }
        expect(GlobalProvider).toBeDefined();

        @ShadowObject({registry, token: 'globalConsumer'})
        class GlobalConsumer {
          constructor({useContext}: ShadowObjectCreationAPI) {
            capturedGlobalCtx = useContext(globalCtxName);
          }
        }
        expect(GlobalConsumer).toBeDefined();

        // Create two unrelated entities
        const providerUuid = generateUUID();
        const consumerUuid = generateUUID();

        kernel.createEntity(providerUuid, 'globalProvider');
        kernel.createEntity(consumerUuid, 'globalConsumer');

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(capturedGlobalCtx!)).toBe('globalValue');

        kernel.destroy();
      });

      it('should accept a signal reader as global context source', async () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        const globalCtxName = 'globalSignalContext';
        const sourceSignal = createSignal('globalInitial');
        let capturedGlobalCtx: ReturnType<ShadowObjectCreationAPI['useContext']> | undefined;

        @ShadowObject({registry, token: 'globalSignalProvider'})
        class GlobalSignalProvider {
          constructor({provideGlobalContext}: ShadowObjectCreationAPI) {
            provideGlobalContext(globalCtxName, sourceSignal.get);
          }
        }
        expect(GlobalSignalProvider).toBeDefined();

        @ShadowObject({registry, token: 'globalSignalConsumer'})
        class GlobalSignalConsumer {
          constructor({useContext}: ShadowObjectCreationAPI) {
            capturedGlobalCtx = useContext(globalCtxName);
          }
        }
        expect(GlobalSignalConsumer).toBeDefined();

        const providerUuid = generateUUID();
        const consumerUuid = generateUUID();

        kernel.createEntity(providerUuid, 'globalSignalProvider');
        kernel.createEntity(consumerUuid, 'globalSignalConsumer');

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(capturedGlobalCtx!)).toBe('globalInitial');

        sourceSignal.set('globalUpdated');
        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(capturedGlobalCtx!)).toBe('globalUpdated');

        kernel.destroy();
      });

      // A global context is resolved on two levels. Within one entity every shadow-object that
      // provides the name feeds the one signal that entity contributes to the kernel-wide chain, so
      // the hand-over of `provideContext` applies unchanged. Across entities the chain itself
      // decides: it takes the first entry that holds something, so an entity falling empty lets the
      // next one through on its own.
      it('hands the global context to the provider that stays on the same entity', async () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        class BaseTheme {
          constructor({provideGlobalContext}: ShadowObjectCreationAPI) {
            provideGlobalContext('globalTheme', 'dark');
          }
        }

        class OverlayTheme {
          constructor({provideGlobalContext}: ShadowObjectCreationAPI) {
            provideGlobalContext('globalTheme', 'overlay');
          }
        }

        shadowObjects.define('globalThemeBoth', BaseTheme, registry);
        shadowObjects.define('globalThemeBoth', OverlayTheme, registry);
        shadowObjects.define('globalThemeBaseOnly', BaseTheme, registry);

        const providerUuid = generateUUID();
        const consumerUuid = generateUUID();

        kernel.createEntity(providerUuid, 'globalThemeBoth');
        kernel.createEntity(consumerUuid, 'globalThemeConsumer');

        const consumerContext = kernel.getEntity(consumerUuid).useContext('globalTheme');

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(consumerContext)).toBe('overlay');

        kernel.changeToken(providerUuid, 'globalThemeBaseOnly');

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(consumerContext)).toBe('dark');

        kernel.destroy();
      });

      it('lets another entity hold the global context when the one that had it goes', async () => {
        const registry = new Registry();
        const kernel = new Kernel(registry);

        class BaseTheme {
          constructor({provideGlobalContext}: ShadowObjectCreationAPI) {
            provideGlobalContext('globalTheme', 'dark');
          }
        }

        class OverlayTheme {
          constructor({provideGlobalContext}: ShadowObjectCreationAPI) {
            provideGlobalContext('globalTheme', 'overlay');
          }
        }

        shadowObjects.define('globalThemeOverlay', OverlayTheme, registry);
        shadowObjects.define('globalThemeBase', BaseTheme, registry);

        const overlayUuid = generateUUID();
        const baseUuid = generateUUID();
        const consumerUuid = generateUUID();

        // The overlay entity joins the chain first, so it is the first entry that holds a value.
        kernel.createEntity(overlayUuid, 'globalThemeOverlay');
        kernel.createEntity(baseUuid, 'globalThemeBase');
        kernel.createEntity(consumerUuid, 'globalThemeConsumer');

        const consumerContext = kernel.getEntity(consumerUuid).useContext('globalTheme');

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(consumerContext)).toBe('overlay');

        kernel.changeToken(overlayUuid, 'globalThemeNone');

        await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
        expect(value(consumerContext)).toBe('dark');

        kernel.destroy();
      });

      // Mirrors the `clearOnDestroy` cases under `provideContext and useContext` above --
      // `provideGlobalContext` runs through the same `clearOnDestroy ?? true` check on its own
      // map (`contextRootProviders`), so it earns the same cases on its own provider signal, plus
      // one for a consumer entity that reads the cleared value through `useContext`. That both
      // members' own signal (not just their downstream readers) actually gets torn down on both
      // teardown paths is covered together, for all five context/property members at once, by
      // 'signal cleanup on teardown' below.
      describe('clearOnDestroy', () => {
        it('leaves the provider signal in place when clearOnDestroy is false', () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          let provider: Signal<string | undefined> | undefined;

          @ShadowObject({registry, token: 'globalContextKeptOnLeave'})
          class GlobalContextKeptOnLeave {
            constructor({provideGlobalContext}: ShadowObjectCreationAPI) {
              provider = provideGlobalContext('globalKeptContext', 'first', {clearOnDestroy: false});
            }
          }
          expect(GlobalContextKeptOnLeave).toBeDefined();

          const uuid = generateUUID();
          kernel.createEntity(uuid, 'globalContextKeptOnLeave');

          expect(value(provider!)).toBe('first');

          kernel.changeToken(uuid, 'globalContextKeptOnLeaveEmpty');

          expect(value(provider!)).toBe('first');

          kernel.destroy();
        });

        it('clears the provider signal back to undefined on this path when clearOnDestroy defaults to true', () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          let provider: Signal<string | undefined> | undefined;

          @ShadowObject({registry, token: 'globalContextDefaultOnLeave'})
          class GlobalContextDefaultOnLeave {
            constructor({provideGlobalContext}: ShadowObjectCreationAPI) {
              provider = provideGlobalContext('globalDefaultContext', 'first');
            }
          }
          expect(GlobalContextDefaultOnLeave).toBeDefined();

          const uuid = generateUUID();
          kernel.createEntity(uuid, 'globalContextDefaultOnLeave');

          expect(value(provider!)).toBe('first');

          kernel.changeToken(uuid, 'globalContextDefaultOnLeaveEmpty');

          expect(value(provider!)).toBeUndefined();

          kernel.destroy();
        });

        it('reads clearOnDestroy on every call, not only on the one that creates the provider', () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          let provider: Signal<string | undefined> | undefined;

          @ShadowObject({registry, token: 'globalContextClearOnSecondCall'})
          class GlobalContextClearOnSecondCall {
            constructor({provideGlobalContext}: ShadowObjectCreationAPI) {
              // The first call creates the provider and opts out of the clear. The second call for
              // the same name finds the provider already there and takes the default, and its
              // `clearOnDestroy` has to count all the same -- every call adds to the teardown, not
              // just the one that allocated the signal.
              provider = provideGlobalContext('globalSecondCallContext', 'first', {clearOnDestroy: false});
              provideGlobalContext('globalSecondCallContext');
            }
          }
          expect(GlobalContextClearOnSecondCall).toBeDefined();

          const uuid = generateUUID();
          kernel.createEntity(uuid, 'globalContextClearOnSecondCall');

          expect(value(provider!)).toBe('first');

          kernel.changeToken(uuid, 'globalContextClearOnSecondCallEmpty');

          expect(value(provider!)).toBeUndefined();

          kernel.destroy();
        });

        it('carries that clear to a consumer entity reading through useContext', async () => {
          const registry = new Registry();
          const kernel = new Kernel(registry);

          @ShadowObject({registry, token: 'globalContextClearedOnLeave'})
          class GlobalContextClearedOnLeave {
            constructor({provideGlobalContext}: ShadowObjectCreationAPI) {
              provideGlobalContext('globalClearedContext', 'first');
            }
          }
          expect(GlobalContextClearedOnLeave).toBeDefined();

          // Two unrelated root entities. The consumer has no shadow-object of its own; it reads
          // the global context straight off the entity.
          const providerUuid = generateUUID();
          const consumerUuid = generateUUID();

          kernel.createEntity(providerUuid, 'globalContextClearedOnLeave');
          kernel.createEntity(consumerUuid, 'globalContextClearedOnLeaveConsumer');

          const consumerContext = kernel.getEntity(consumerUuid).useContext('globalClearedContext');

          // The value travels to the consumer through the entity's deferred context update, which
          // is why this case is async where the three above, reading the provider signal itself,
          // are not.
          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(consumerContext)).toBe('first');

          kernel.changeToken(providerUuid, 'globalContextClearedOnLeaveEmpty');

          await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
          expect(value(consumerContext)).toBeUndefined();

          kernel.destroy();
        });
      });
    });
  });
});
