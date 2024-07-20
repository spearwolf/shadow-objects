import {batch, connect, createEffect, createSignal} from '@spearwolf/signalize';
import {readBooleanAttribute} from '../utils/attr-utils.js';
import type {ViewComponent} from '../view/ViewComponent.js';
import {ATTR_NAME, ATTR_NO_TRIM, ATTR_TYPE, ATTR_VALUE} from './constants.js';
import type {ShaeEntElement} from './ShaeEntElement.js';

const TRUTHY_VALUES = new Set(['on', 'true', 'yes', 'local', '1']);

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

export class ShaePropElement extends HTMLElement {
  static observedAttributes = [ATTR_NAME, ATTR_VALUE, ATTR_TYPE, ATTR_NO_TRIM];

  readonly isShaeEntElement = true;

  protected readonly entNode$ = createSignal<ShaeEntElement | undefined>();
  protected readonly viewComponent$ = createSignal<ViewComponent | undefined>();

  protected readonly name$ = createSignal<string | undefined>();
  protected readonly valueIn$ = createSignal();
  protected readonly valueOut$ = createSignal();
  protected readonly type$ = createSignal<string | undefined>();
  protected readonly shouldTrim$ = createSignal(true);

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
        const con = connect(entNode.viewComponent$, this.viewComponent$);
        return () => {
          con.destroy();
        };
      } else {
        this.viewComponent$.set(undefined);
      }
    });

    this.viewComponent$.onChange((vc) => {
      // TODO set prop value on vc
      if (vc) {
        console.log(`[shae-prop:"${this.name}"] view-component changed to`, vc?.uuid, {
          viewComponent: vc,
          shaeProp: this,
        });
      } else {
        console.log(`[shae-prop:"${this.name}"] lost connection to view-component :/`, {
          shaeProp: this,
        });
      }
    });

    createEffect(() => {
      const vc = this.viewComponent$.get();
      if (vc) {
        const name = this.name$.get();
        if (name) {
          const value = this.valueOut$.get();

          console.log(`[shae-prop:"${this.name}"] view-component set-property`, name, value, vc.uuid, {
            viewComponent: vc,
            shaeProp: this,
          });

          vc.setProperty(name, value);
          this.entNode?.syncShadowObjects();
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

      value = value || undefined;

      if (value != null && typeof value === 'string') {
        switch (type) {
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
            value = TRUTHY_VALUES.has(value as string);
            break;

          case 'number[]':
            value = value.split(/\W+/).map((v) => Number(v));
            break;

          case 'float[]':
            value = value.split(/\W+/).map((v) => parseFloat(v));
            break;

          case 'int[]':
          case 'integer[]':
            value = value.split(/\W+/).map((v) => parseInt(v));
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
            value = value.split(/\W+/).map((v) => TRUTHY_VALUES.has(v));
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
            value = new Float32Array(value.split(/\W+/).map((v) => Number(v)));
            break;

          case 'float64array':
            value = new Float64Array(value.split(/\W+/).map((v) => Number(v)));
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
    this.valueIn$.set(this.getAttribute(ATTR_VALUE));
  };

  #readTypeAttribute = () => {
    this.type$.set(this.getAttribute(ATTR_TYPE)?.trim().toLowerCase() ?? undefined);
  };

  #readNoTrimAttribute = () => {
    this.shouldTrim$.set(!readBooleanAttribute(this, ATTR_NO_TRIM));
  };
}
