import {on} from '@spearwolf/eventize';
import {createSignal} from '@spearwolf/signalize';
import {describe, expect, it, vi} from 'vitest';
import {SignalsPath, VALUE} from './SignalsPath.js';

describe('SignalsPath', () => {
  it('should work as expected', () => {
    const path = new SignalsPath();

    const a = createSignal();
    const b = createSignal();

    const valueFn = vi.fn();

    path.add(a);
    path.add(b);

    expect(path.value).toBe(undefined);

    on(path, VALUE, valueFn);

    expect(valueFn).not.toBeCalled();

    b.set('b');

    expect(valueFn).toHaveBeenCalledWith('b');
    valueFn.mockClear();

    a.set('a');

    expect(valueFn).toHaveBeenCalledWith('a');
    valueFn.mockClear();

    b.set('b2');

    expect(valueFn).not.toBeCalled();

    a.set(null);

    expect(valueFn).toHaveBeenCalledWith('b2');
    valueFn.mockClear();

    b.set(null);

    expect(valueFn).toHaveBeenCalledWith(undefined);
  });

  it('initial value event', () => {
    const path = new SignalsPath();

    const a = createSignal();
    const b = createSignal<unknown>('b');

    const valueFn = vi.fn();

    path.add(a, b);

    expect(path.value).toBe('b');

    on(path, VALUE, valueFn);

    expect(valueFn).toHaveBeenCalledWith('b');
  });

  it('add signals to path', () => {
    const path = new SignalsPath();

    const a = createSignal();
    const b = createSignal();
    const c = createSignal();

    const valueFn = vi.fn();

    path.add(a, b);

    on(path, VALUE, valueFn);

    expect(valueFn).not.toBeCalled();

    b.set('b');

    expect(valueFn).toHaveBeenCalledWith('b');
    valueFn.mockClear();

    path.add(c);

    expect(valueFn).not.toBeCalled();

    c.set('c');

    expect(valueFn).not.toBeCalled();

    b.set(undefined);

    expect(valueFn).toHaveBeenCalledWith('c');
    valueFn.mockClear();

    a.set('a');

    expect(valueFn).toHaveBeenCalledWith('a');
  });

  it('clear() should work as expected', () => {
    const path = new SignalsPath();

    const a = createSignal();
    const b = createSignal();
    const c = createSignal();

    const valueFn = vi.fn();

    path.add(a, b);

    on(path, VALUE, valueFn);

    expect(valueFn).not.toBeCalled();

    b.set('b');

    expect(valueFn).toHaveBeenCalledWith('b');
    valueFn.mockClear();

    path.clear();

    expect(valueFn).not.toBeCalled();

    path.add(a, b, c);

    expect(valueFn).not.toBeCalled();

    c.set('c');

    expect(valueFn).not.toBeCalled();

    b.set(undefined);

    expect(valueFn).toHaveBeenCalledWith('c');
    valueFn.mockClear();

    a.set('a');

    expect(valueFn).toHaveBeenCalledWith('a');
  });
});
