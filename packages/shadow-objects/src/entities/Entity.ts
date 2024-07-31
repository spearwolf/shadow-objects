import {emit, off, on, once, Priority} from '@spearwolf/eventize';
import {
  batch,
  createSignal,
  destroySignals,
  SignalObject,
  value,
  type SignalReader,
  type SignalWriter,
} from '@spearwolf/signalize';
import type {IComponentEvent} from '../types.js';
import {Kernel} from './Kernel.js';
import {SignalsMap} from './SignalsMap.js';
import {SignalsPath} from './SignalsPath.js';
import {onDestroy, onViewEvent} from './events.js';

type ContextNameType = string | symbol;

interface IContext {
  name: ContextNameType;
  inherited: SignalObject<unknown>;
  provide: SignalObject<unknown>;
  context: SignalObject<unknown>;
  ctxPath: SignalsPath;
  unsubscribeFromPath: () => void;
  unsubscribeFromParent?: () => void;
}

/**
 * An entity has a parent and children, replicating the hierarchy of view-components.
 *
 * A signal is created for each view-component property.
 *
 * Shadow-objects can use the signal properties via the entity.
 */
export class Entity {
  #kernel: Kernel;
  #uuid: string;

  #props = new SignalsMap();
  #context: Map<ContextNameType, IContext> = new Map();

  #parentUuid?: string;
  #parent?: Entity;

  #childrenUuids: Set<string> = new Set();
  #children: Entity[] = [];

  #order = 0;

  get kernel(): Kernel {
    return this.#kernel;
  }

  get uuid(): string {
    return this.#uuid;
  }

  get order(): number {
    return this.#order;
  }

  set order(value: number) {
    if (this.#order !== value) {
      this.#order = value;
      if (this.#parentUuid) {
        this.parent!.resortChildren();
      }
    }
  }

  get parentUuid(): string | undefined {
    return this.#parentUuid || undefined;
  }

  set parentUuid(parentUuid: string | undefined) {
    if (this.#parentUuid !== parentUuid) {
      this.removeFromParent();

      this.#parentUuid = parentUuid || undefined;
      this.#parent = parentUuid ? this.#kernel.getEntity(parentUuid) : undefined;

      if (this.#parent) {
        this.#parent.addChild(this);
      }
    }
  }

  get parent(): Entity | undefined {
    if (!this.#parent && this.#parentUuid) {
      this.#parent = this.#kernel.getEntity(this.#parentUuid);
    }
    return this.#parent;
  }

  set parent(parent: Entity | undefined) {
    this.parentUuid = parent?.uuid;
  }

  get hasParent(): boolean {
    return !!this.#parentUuid;
  }

  get children(): readonly Entity[] {
    return this.#children;
  }

  constructor(kernel: Kernel, uuid: string) {
    this.#kernel = kernel;
    this.#uuid = uuid;
    once(this, onDestroy, Priority.Min, this);
  }

  traverse(callback: (entity: Entity) => void) {
    callback(this);
    for (const child of this.#children) {
      child.traverse(callback);
    }
  }

  onDestroy() {
    this.#props.clear();
    off(this);

    for (const ctx of this.#context.values()) {
      ctx.unsubscribeFromPath();
      ctx.unsubscribeFromParent?.();
      ctx.ctxPath.dispose();
      destroySignals(ctx.inherited, ctx.provide, ctx.context);
    }

    this.#parentUuid = undefined;
    this.#parent = undefined;

    this.#childrenUuids.clear();
    this.#children.length = 0;
  }

  addChild(child: Entity) {
    if (this.#children.length === 0) {
      this.#childrenUuids.add(child.uuid);
      this.#children.push(child);
      // this.emit(onAddChild, this, child);
      // child.emit(onAddToParent, child, this);
      return;
    }

    if (this.#childrenUuids.has(child.uuid)) {
      throw new Error(`child with uuid: ${child.uuid} already exists! parentUuid: ${this.uuid}`);
    }

    this.#childrenUuids.add(child.uuid);
    this.#children.push(child);

    this.resortChildren();

    for (const [, ctx] of child.#context) {
      child.#subscribeToParentContext(ctx);
    }

    // this.emit(onAddChild, this, child);
    // child.emit(onAddToParent, child, this);
  }

  resortChildren() {
    this.#children.sort((a, b) => a.order - b.order);
  }

  removeChild(child: Entity) {
    if (this.#childrenUuids.has(child.uuid)) {
      this.#childrenUuids.delete(child.uuid);
      this.#children.splice(this.#children.indexOf(child), 1);
      // this.emit(onRemoveChild, this, child);
    }
  }

  removeFromParent() {
    if (this.#parent) {
      // const prevParent = this.#parent;

      this.#parent.removeChild(this);

      this.#parent = undefined;
      this.#parentUuid = undefined;

      for (const [, ctx] of this.#context) {
        if (ctx.unsubscribeFromParent) {
          ctx.unsubscribeFromParent();
          ctx.unsubscribeFromParent = undefined;
        }
      }

      // this.emit(onRemoveFromParent, this, prevParent);
    }
  }

  dispatchMessageToView(type: string, data?: unknown, transferables?: Transferable[], traverseChildren = false) {
    this.#kernel.dispatchMessageToView({uuid: this.#uuid, type, data, transferables, traverseChildren});
  }

  dispatchViewEvents(events: IComponentEvent[]) {
    for (const {type, data} of events) {
      emit(this, onViewEvent, type, data);
    }
  }

  dispatchViewEvent(type: string, data: unknown) {
    this.dispatchViewEvents([{type, data}]);
  }

  #getPropSignal<T = unknown>(key: string): SignalObject<T> {
    return this.#props.getSignal<T>(key);
  }

  getPropertyReader<T = unknown>(key: string): SignalReader<T> {
    return this.#getPropSignal<T>(key).get;
  }

  getPropertyWriter<T = unknown>(key: string): SignalWriter<T> {
    return this.#getPropSignal<T>(key).set;
  }

  setProperties(properties: [string, unknown][]) {
    batch(() => {
      for (const [key, val] of properties) {
        this.setProperty(key, val);
      }
    });
  }

  setProperty(key: string, value: unknown) {
    this.getPropertyWriter(key)(value);
  }

  getProperty<T = unknown>(key: string): T {
    return value(this.getPropertyReader<T>(key));
  }

  propKeys(): string[] {
    return Array.from(this.#props.keys());
  }

  propEntries(): [string, unknown][] {
    return Array.from(this.#props.entries()).map(([key, sig]) => [key, sig.value]);
  }

  hasContext(name: ContextNameType): boolean {
    return this.#context.has(name);
  }

  // TODO(test) write tests for useContext()

  useContext<T = unknown>(name: ContextNameType): SignalReader<T> {
    return this.#getContext(name).context.get as SignalReader<T>;
  }

  // TODO(test) write tests for provideContext()

  provideContext<T = unknown>(name: ContextNameType): SignalObject<T> {
    return this.#getContext(name).provide as SignalObject<T>;
  }

  #getContext(name: ContextNameType): IContext {
    let ctx = this.#context.get(name);
    if (ctx == null) {
      const inherited = createSignal();
      const provide = createSignal();
      const context = createSignal();

      const ctxPath = new SignalsPath();
      ctxPath.add(provide.get, inherited.get);

      const unsubscribeFromPath = on(ctxPath, SignalsPath.Value, (val) => {
        queueMicrotask(() => {
          context.set(val);
        });
      });

      ctx = {name, inherited, provide, context, ctxPath, unsubscribeFromPath};
      this.#context.set(name, ctx);

      this.#subscribeToParentContext(ctx);
    }
    return ctx;
  }

  #subscribeToParentContext(ctx: IContext) {
    if (this.parent) {
      ctx.unsubscribeFromParent?.();
      ctx.unsubscribeFromParent = on(this.parent.#getContext(ctx.name).ctxPath, SignalsPath.Value, (val) => {
        ctx.inherited.set(val);
      });
    }
  }
}
