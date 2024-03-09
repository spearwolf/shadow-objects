import {eventize} from '@spearwolf/eventize';
import {createSignal, value} from '@spearwolf/signalize';

export function attachSignal(target, name, options) {
  const [getSignal, setSignal] = createSignal(options?.initialValue);

  const shouldEmitValue = Boolean(options?.emit ?? true);
  const emitEventName = typeof options?.emit === 'string' || typeof options?.emit === 'symbol' ? options?.emit : name;

  const hasEffectCallback = typeof options?.effect === 'function';

  if (shouldEmitValue) {
    eventize(target);
    target.retain(emitEventName);
  }

  Object.defineProperties(target, {
    [name]: {
      enumerable: true,
      get() {
        return value(getSignal);
      },
      set(value) {
        setSignal(value);
      },
    },
    [`${name}$`]: {
      enumerable: true,
      get() {
        return getSignal;
      },
    },
  });

  if (shouldEmitValue || hasEffectCallback) {
    getSignal((val) => {
      if (val) {
        let effectCleanup = undefined;
        if (hasEffectCallback) {
          effectCleanup = options.effect(val);
        }
        if (shouldEmitValue) {
          target.emit(emitEventName, val);
        }
        return effectCleanup;
      } else if (shouldEmitValue) {
        target.retainClear(emitEventName);
      }
    });
  }

  return target;
}
