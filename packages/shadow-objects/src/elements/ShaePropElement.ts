import {batch, createEffect, createSignal, link} from '@spearwolf/signalize';
import {readBooleanAttribute} from '../utils/attr-utils.js';
import {ConsoleLogger} from '../utils/ConsoleLogger.js';
import {TRUTHY_VALUES} from '../utils/constants.js';
import type {ViewComponent} from '../view/ViewComponent.js';
import {ATTR_NAME, ATTR_NO_TRIM, ATTR_TYPE, ATTR_VALUE} from './constants.js';
import type {ShaeEntElement} from './ShaeEntElement.js';

const findEntNode = (start: HTMLElement): ShaeEntElement | undefined => {
  let el: HTMLElement | null = start.parentElement;
  while (el) {
    if ((el as ShaeEntElement).isShaeEntElement) {
      return el as ShaeEntElement;
    }
    el = el.parentElement;
  }
  return undefined;
};

/**
 * How many `<shae-prop>` elements declare a given name on a given view component right now.
 *
 * A property belongs to the entity, not to the element that wrote it last: two elements may
 * declare the same name, and the entity keeps the property until the last of them lets go. The
 * count is keyed the way the binding is — (view component, name) — and lives beside the elements
 * because no single one of them can answer the question.
 */
const declarantsPerComponent = new WeakMap<ViewComponent, Map<string, number>>();

const addDeclarant = (vc: ViewComponent, name: string) => {
  let names = declarantsPerComponent.get(vc);
  if (names == null) {
    names = new Map();
    declarantsPerComponent.set(vc, names);
  }
  names.set(name, (names.get(name) ?? 0) + 1);
};

/** @returns `true` if this was the last element declaring `name` on `vc`. */
const removeDeclarant = (vc: ViewComponent, name: string): boolean => {
  const names = declarantsPerComponent.get(vc);
  if (names == null) return true;

  const remaining = (names.get(name) ?? 1) - 1;
  if (remaining > 0) {
    names.set(name, remaining);
    return false;
  }

  names.delete(name);
  if (names.size === 0) {
    declarantsPerComponent.delete(vc);
  }
  return true;
};

const TYPES = new Set([
  'string',
  'text',
  'number',
  'bigint',
  'float',
  'int',
  'integer',
  'hex',
  'hexadecimal',
  'oct',
  'octal',
  'bin',
  'binary',
  'bool',
  'boolean',
  '[]',
  'text[]',
  'string[]',
  'number[]',
  'float[]',
  'int[]',
  'integer[]',
  'hex[]',
  'hexadecimal[]',
  'oct[]',
  'octal[]',
  'bin[]',
  'binary[]',
  'bool[]',
  'boolean[]',
  'int8array',
  'uint8array',
  'uint8clampedarray',
  'int16array',
  'uint16array',
  'int32array',
  'uint32array',
  'float32array',
  'float64array',
  'bigint64array',
  'biguint64array',
  'json',
]);

export class ShaePropElement extends HTMLElement {
  static observedAttributes = [ATTR_NAME, ATTR_VALUE, ATTR_TYPE, ATTR_NO_TRIM];

  readonly isShaePropElement = true;

  protected readonly entNode$ = createSignal<ShaeEntElement | undefined>();
  protected readonly viewComponent$ = createSignal<ViewComponent | undefined>();

  protected readonly name$ = createSignal<string | undefined>();
  protected readonly valueIn$ = createSignal();
  protected readonly valueOut$ = createSignal();
  protected readonly type$ = createSignal<string | undefined>();
  protected readonly shouldTrim$ = createSignal(true);

  protected readonly logger = new ConsoleLogger('ShaePropElement');

  get name(): string | undefined {
    return this.name$.value;
  }

  get value(): unknown {
    return this.valueOut$.value;
  }

  set value(val: unknown) {
    this.valueIn$.set(val);
  }

  get shouldTrim(): boolean {
    return this.shouldTrim$.value;
  }

  get entNode(): ShaeEntElement | undefined {
    return this.entNode$.value;
  }

  set entNode(el: ShaeEntElement | undefined) {
    this.entNode$.set(el);
  }

  get viewComponent(): ViewComponent | undefined {
    return this.viewComponent$.value;
  }

  constructor() {
    super();

    this.entNode$.onChange((entNode) => {
      if (entNode) {
        const con = link(entNode.viewComponent$, this.viewComponent$);
        return () => {
          con.destroy();
        };
      } else {
        this.viewComponent$.set(undefined);
      }
    });

    // this.viewComponent$.onChange((vc) => {
    //   if (vc) {
    //     console.log(`[shae-prop:"${this.name}"] view-component changed to`, vc?.uuid, {
    //       viewComponent: vc,
    //       shaeProp: this,
    //     });
    //   } else {
    //     console.log(`[shae-prop:"${this.name}"] lost connection to view-component :/`, {
    //       shaeProp: this,
    //     });
    //   }
    // });

    // The binding this element holds is the pair (view component, name). It ends in three ways —
    // the element leaves the tree, its name changes, or it moves to another entity — and each of
    // them moves one of these two signals. The cleanup takes the property back for exactly the
    // binding that ended, which is why the three need no code of their own.
    //
    // `valueOut$` is deliberately not read here: a value change would otherwise run a removal
    // against a set of the same key on every keystroke.
    //
    // Standing before the value effect is a matter of reading order, not of behaviour: the order a
    // rename ends up with in the trail is decided in `ComponentChanges.#propsChangeOrder`, where
    // `appendToEnd` moves a key that is already queued to the back. Measured both ways, the trail
    // reads `[['x', undefined], ['y', 7]]` either way.
    createEffect(() => {
      const vc = this.viewComponent$.get();
      const name = this.name$.get();

      if (vc == null || !name) return;

      // untracked on purpose: the host is where the sync has to go, not something this binding
      // depends on
      const entNode = this.entNode$.value;

      addDeclarant(vc, name);

      return () => {
        // only the last declarant clears the property — another element may be holding the same
        // name on the same entity, and the entity is what the property belongs to
        if (removeDeclarant(vc, name)) {
          vc.removeProperty(name);
          // no `isConnected` guard, unlike the value effect below: an element that is no longer
          // connected is precisely the case this has to reach
          entNode?.syncShadowObjects();
        }
      };
    });

    createEffect(() => {
      const vc = this.viewComponent$.get();
      if (vc) {
        const name = this.name$.get();
        if (name) {
          const value = this.valueOut$.get();

          if (this.logger.isDebug) {
            this.logger.debug(`[${this.name}] view-component set-property`, name, value, vc.uuid, {
              viewComponent: vc,
              shaeProp: this,
            });
          }

          vc.setProperty(name, value);

          if (this.isConnected) {
            this.entNode?.syncShadowObjects();
          }
        }
      }
    });

    createEffect(() => {
      const type = this.type$.get();
      const shouldTrim = this.shouldTrim$.get();
      let value = this.valueIn$.get();

      if (shouldTrim && typeof value === 'string') {
        value = value.trim();
      }

      // only null and undefined mean "no value" — 0, false and the empty string are values
      value = value ?? undefined;

      // the `value != null` half is covered by the `typeof` check next to it; it stays until the
      // conversion moves out of this switch, so that rewrite touches one shape, not two
      if (value != null && typeof value === 'string' && type) {
        // invalid input is an operating case for this element, not an exceptional state: it is
        // reported and clears the value instead of throwing out of a reactive effect
        try {
          switch (type) {
            case 'string':
            case 'text':
              break;

            case 'number':
              value = Number(value);
              break;

            case 'bigint':
              value = BigInt(value);
              break;

            case 'float':
              value = parseFloat(value);
              break;

            case 'int':
            case 'integer':
              value = parseInt(value, 10);
              break;

            case 'hex':
            case 'hexadecimal':
              value = parseInt(value, 16);
              break;

            case 'oct':
            case 'octal':
              value = parseInt(value, 8);
              break;

            case 'bin':
            case 'binary':
              value = parseInt(value, 2);
              break;

            case 'bool':
            case 'boolean':
              value = TRUTHY_VALUES.has(value.toLowerCase());
              break;

            case '[]':
            case 'text[]':
            case 'string[]':
              value = value.split(/\W+/);
              break;

            case 'number[]':
              value = value.split(/\s+/).map((v) => Number(v));
              break;

            case 'float[]':
              value = value.split(/\s+/).map((v) => parseFloat(v));
              break;

            case 'int[]':
            case 'integer[]':
              value = value.split(/\s+/).map((v) => parseInt(v, 10));
              break;

            case 'hex[]':
            case 'hexadecimal[]':
              value = value.split(/\W+/).map((v) => parseInt(v, 16));
              break;

            case 'oct[]':
            case 'octal[]':
              value = value.split(/\W+/).map((v) => parseInt(v, 8));
              break;

            case 'bin[]':
            case 'binary[]':
              value = value.split(/\W+/).map((v) => parseInt(v, 2));
              break;

            case 'bool[]':
            case 'boolean[]':
              value = value.split(/\W+/).map((v) => TRUTHY_VALUES.has(v.toLowerCase()));
              break;

            case 'int8array':
              value = new Int8Array(value.split(/\W+/).map((v) => Number(v)));
              break;

            case 'uint8array':
              value = new Uint8Array(value.split(/\W+/).map((v) => Number(v)));
              break;

            case 'uint8clampedarray':
              value = new Uint8ClampedArray(value.split(/\W+/).map((v) => Number(v)));
              break;

            case 'int16array':
              value = new Int16Array(value.split(/\W+/).map((v) => Number(v)));
              break;

            case 'uint16array':
              value = new Uint16Array(value.split(/\W+/).map((v) => Number(v)));
              break;

            case 'int32array':
              value = new Int32Array(value.split(/\W+/).map((v) => Number(v)));
              break;

            case 'uint32array':
              value = new Uint32Array(value.split(/\W+/).map((v) => Number(v)));
              break;

            case 'float32array':
              value = new Float32Array(value.split(/\s+/).map((v) => Number(v)));
              break;

            case 'float64array':
              value = new Float64Array(value.split(/\s+/).map((v) => Number(v)));
              break;

            case 'bigint64array':
              value = new BigInt64Array(value.split(/\W+/).map((v) => BigInt(v)));
              break;

            case 'biguint64array':
              value = new BigUint64Array(value.split(/\W+/).map((v) => BigInt(v)));
              break;

            case 'json':
              value = JSON.parse(value);
              break;

            default:
              if (this.logger.isWarn) {
                this.logger.warn(`[${this.name}] unknown type "${type}"`, {
                  value,
                  shaeProp: this,
                });
              }
          }
        } catch (error) {
          // reported through `error`, not `warn`: `warn` is gated behind
          // `ConsoleLogger.sharedConfig.enable`, which defaults to "the page is served from
          // localhost". A dropped property value has to stay visible in production too.
          this.logger.error(`[${this.name}] could not convert the value into the type "${type}"`, {
            value,
            error,
            shaeProp: this,
          });
          value = undefined;
        }
      }

      this.valueOut$.set(value);
    });

    batch(() => {
      this.#readNameAttribute();
      this.#readValueAttribute();
      this.#readTypeAttribute();
      this.#readNoTrimAttribute();
    });

    this.style.display = 'contents';
  }

  connectedCallback() {
    batch(() => {
      this.#findEntNode();
      this.#readNameAttribute();
      this.#readValueAttribute();
      this.#readTypeAttribute();
      this.#readNoTrimAttribute();
    });
  }

  attributeChangedCallback(name: string) {
    switch (name) {
      case ATTR_NAME:
        this.#readNameAttribute();
        break;

      case ATTR_VALUE:
        this.#readValueAttribute();
        break;

      case ATTR_TYPE:
        this.#readTypeAttribute();
        break;

      case ATTR_NO_TRIM:
        this.#readNoTrimAttribute();
        break;
    }
  }

  disconnectedCallback() {
    this.#disconnectFromEntNode();
  }

  #findEntNode = () => {
    this.entNode$.set(findEntNode(this));
  };

  #disconnectFromEntNode = () => {
    queueMicrotask(() => {
      if (!this.isConnected) {
        this.entNode$.set(undefined);
      }
    });
  };

  #readNameAttribute = () => {
    this.name$.set(this.getAttribute(ATTR_NAME)?.trim() ?? undefined);
  };

  #readValueAttribute = () => {
    // an empty value attribute means "no value", exactly like a missing one. Everything else
    // goes in raw: valueIn$ is the source a no-trim switch recalculates from, so whitespace
    // has to survive until the trim decides what is left of it.
    const value = this.getAttribute(ATTR_VALUE);
    this.valueIn$.set(value === null || value === '' ? undefined : value);
  };

  #readTypeAttribute = () => {
    let type = this.getAttribute(ATTR_TYPE)?.trim().toLowerCase();
    if (type && !TYPES.has(type)) {
      if (this.logger.isWarn) {
        this.logger.warn(`[${this.name}] unknown type "${type}"`, {
          shaeProp: this,
        });
      }
      type = undefined;
    }
    this.type$.set(type);
  };

  #readNoTrimAttribute = () => {
    this.shouldTrim$.set(!readBooleanAttribute(this, ATTR_NO_TRIM));
  };
}