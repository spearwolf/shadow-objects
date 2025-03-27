import {emit, off, on, once, Priority} from '@spearwolf/eventize';
import {
  batch,
  createSignal,
  link,
  Signal,
  SignalAutoMap,
  value,
  type SignalReader,
  type SignalWriter,
} from '@spearwolf/signalize';
import type {IComponentEvent} from '../types.js';
import {Kernel} from './Kernel.js';
import {SignalsPath} from './SignalsPath.js';
import {onDestroy, onViewEvent} from './events.js';

type ContextNameType = string | symbol;

interface IContextValue {
  name: ContextNameType;
  inherited: Signal<unknown>;
  provide: Signal<unknown>;
  context: Signal<unknown>;
  valuePath: SignalsPath;

  unsubscribePathValue: () => void;
  unsubscribeFromParent?: () => void;
}

const updateContextValues: Map<Signal<unknown>, unknown> = new Map();
let requestedContextValueBatchUpdate = false;

const deferContextValueUpdate = (sig: Signal<unknown>, val: unknown) => {
  updateContextValues.set(sig, val);
  if (!requestedContextValueBatchUpdate) {
    requestedContextValueBatchUpdate = true;
    queueMicrotask(() => {
      requestedContextValueBatchUpdate = false;
      const contextValues = Array.from(updateContextValues.entries());
      updateContextValues.clear();
      for (const [sig, val] of contextValues) {
        sig.set(val);
      }
    });
  }
};

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

  #props = new SignalAutoMap();
  #context: Map<ContextNameType, IContextValue> = new Map();

  #rootContexts: Map<ContextNameType, {cleanup: () => void; signal: Signal<any>}> = new Map();

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

    for (const rootCtx of this.#rootContexts.values()) {
      rootCtx.cleanup();
      rootCtx.signal.destroy();
    }
    this.#rootContexts.clear();

    for (const ctx of this.#context.values()) {
      ctx.context.set(undefined);
      ctx.unsubscribePathValue();
      ctx.unsubscribeFromParent?.();
      ctx.valuePath.dispose();
      ctx.inherited.destroy();
      ctx.provide.destroy();
      ctx.context.destroy();
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
      child.#subscribeToParent(ctx);
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

  reSubscribeToParentContexts() {
    for (const [, ctx] of this.#context) {
      this.#subscribeToParent(ctx);
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

  #getPropSignal<T = unknown>(key: string): Signal<T> {
    return this.#props.get<T>(key);
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
    return Array.from(this.#props.keys()) as string[];
  }

  propEntries(): [string, unknown][] {
    return Array.from(this.#props.entries()).map(([key, sig]) => [key, sig.value]) as [string, unknown][];
  }

  hasContext(name: ContextNameType): boolean {
    return this.#context.has(name);
  }

  // TODO(test) write tests for useContext()

  useContext<T = unknown>(name: ContextNameType): SignalReader<T> {
    return this.#findOrCreateContext(name).context.get as SignalReader<T>;
  }

  // TODO(test) write tests for provideContext()

  provideContext<T = unknown>(name: ContextNameType): Signal<T> {
    return this.#findOrCreateContext(name).provide as Signal<T>;
  }

  provideGlobalContext<T = unknown>(name: ContextNameType): Signal<T> {
    if (this.#rootContexts.has(name)) {
      return this.#rootContexts.get(name)!.signal as Signal<T>;
    }
    const rootCtx = this.#kernel.findOrCreateRootContext(name);
    const signal = createSignal<T>();
    const cleanup = rootCtx.add(signal);
    this.#rootContexts.set(name, {cleanup, signal});
    return signal;
  }

  #findOrCreateContext(name: ContextNameType): IContextValue {
    if (this.#context.has(name)) {
      return this.#context.get(name)!;
    }

    const inherited = createSignal();
    const provide = createSignal();
    const context = createSignal();

    const valuePath = new SignalsPath([provide, inherited]);

    const unsubscribePathValue = on(valuePath, SignalsPath.Value, (val) => {
      deferContextValueUpdate(context, val);
    });

    const ctx: IContextValue = {name, inherited, provide, context, valuePath, unsubscribePathValue};
    this.#context.set(name, ctx);

    this.#subscribeToParent(ctx);

    return ctx;
  }

  #subscribeToParent(ctx: IContextValue) {
    ctx.unsubscribeFromParent?.();
    ctx.unsubscribeFromParent = undefined;
    if (this.parent) {
      const parentCtx = this.parent.#findOrCreateContext(ctx.name);
      const linkToParent = link(parentCtx.context, ctx.inherited);
      ctx.unsubscribeFromParent = linkToParent.destroy.bind(linkToParent);
    } else {
      const rootCtx = this.#kernel.findOrCreateRootContext(ctx.name);
      const linkToRoot = link(rootCtx.value$, ctx.inherited);
      ctx.unsubscribeFromParent = linkToRoot.destroy.bind(linkToRoot);
    }
  }
}
