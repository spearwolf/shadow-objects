import {eventize} from '@spearwolf/eventize';
import {createSignal, value} from '@spearwolf/signalize';

/**
 * @param {Object} target - the target object to receive the signal
 * @param {string|symbol} name - the name of the signal
 * @param {Object=} options - the optional options
 *
 * @param {boolean|string|symbol=} options.emit - the event name for publishing the signal value.
 *   the value must fulfill the _guard_ function. can also simply be set to _true_, in which case the signal _name_ will be used.
 *   when set to _false_, no event will be emitted. default is _true_.
 *
 * @param {function=} options.effect - a function that is called with the value of the signal whenever the value changes
 *   and fulfill the _guard_ function.
 *
 * @param {function=} options.guard - the _guard_ function. any value that is not _null_ or _undefined_ is accepted as the default.
 *   the value is set as the only parameter, a boolean is expected as the return value.
 *
 * @returns {Object} the target object
 */
export function attachSignal(target, name, options) {
  const [getSignal, setSignal] = createSignal(options?.initialValue);

  const shouldEmitValue = Boolean(options?.emit ?? true);
  const emitEventName = typeof options?.emit === 'string' || typeof options?.emit === 'symbol' ? options?.emit : name;

  const hasEffectCallback = typeof options?.effect === 'function';

  const guard =
    options?.guard ??
    ((val) => {
      return val != null;
    });

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
      if (guard(val)) {
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
