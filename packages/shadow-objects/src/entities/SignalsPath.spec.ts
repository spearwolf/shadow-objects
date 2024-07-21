import {createSignal} from '@spearwolf/signalize';
import {describe, expect, it, vi} from 'vitest';
import {SignalsPath} from './SignalsPath.js';

describe('SignalsPath', () => {
  it('should work as expected', () => {
    const path = new SignalsPath();

    const [a, setA] = createSignal();
    const [b, setB] = createSignal();

    const valueFn = vi.fn();

    path.add(a);
    path.add(b);

    expect(path.value).toBe(undefined);

    path.on(SignalsPath.Value, valueFn);

    expect(valueFn).not.toBeCalled();

    setB('b');

    expect(valueFn).toHaveBeenCalledWith('b');
    valueFn.mockClear();

    setA('a');

    expect(valueFn).toHaveBeenCalledWith('a');
    valueFn.mockClear();

    setB('b2');

    expect(valueFn).not.toBeCalled();

    setA(null);

    expect(valueFn).toHaveBeenCalledWith('b2');
    valueFn.mockClear();

    setB(null);

    expect(valueFn).toHaveBeenCalledWith(undefined);
  });

  it('initial value event', () => {
    const path = new SignalsPath();

    const [a] = createSignal();
    const [b] = createSignal<unknown>('b');

    const valueFn = vi.fn();

    path.add(a, b);

    expect(path.value).toBe('b');

    path.on(SignalsPath.Value, valueFn);

    expect(valueFn).toHaveBeenCalledWith('b');
  });

  it('add signals to path', () => {
    const path = new SignalsPath();

    const [a, setA] = createSignal();
    const [b, setB] = createSignal();
    const [c, setC] = createSignal();

    const valueFn = vi.fn();

    path.add(a, b);

    path.on(SignalsPath.Value, valueFn);

    expect(valueFn).not.toBeCalled();

    setB('b');

    expect(valueFn).toHaveBeenCalledWith('b');
    valueFn.mockClear();

    path.add(c);

    expect(valueFn).not.toBeCalled();

    setC('c');

    expect(valueFn).not.toBeCalled();

    setB(undefined);

    expect(valueFn).toHaveBeenCalledWith('c');
    valueFn.mockClear();

    setA('a');

    expect(valueFn).toHaveBeenCalledWith('a');
  });

  it('clear() should work as expected', () => {
    const path = new SignalsPath();

    const [a, setA] = createSignal();
    const [b, setB] = createSignal();
    const [c, setC] = createSignal();

    const valueFn = vi.fn();

    path.add(a, b);

    path.on(SignalsPath.Value, valueFn);

    expect(valueFn).not.toBeCalled();

    setB('b');

    expect(valueFn).toHaveBeenCalledWith('b');
    valueFn.mockClear();

    path.clear();

    expect(valueFn).not.toBeCalled();

    path.add(a, b, c);

    expect(valueFn).not.toBeCalled();

    setC('c');

    expect(valueFn).not.toBeCalled();

    setB(undefined);

    expect(valueFn).toHaveBeenCalledWith('c');
    valueFn.mockClear();

    setA('a');

    expect(valueFn).toHaveBeenCalledWith('a');
  });
});
