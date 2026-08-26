import {on} from '@spearwolf/eventize';
import {createSignal} from '@spearwolf/signalize';
import {describe, expect, it, vi} from 'vitest';
import {SignalsPath} from './SignalsPath.js';

describe('SignalsPath', () => {
  it('should work as expected', () => {
    const path = new SignalsPath();

    const a = createSignal();
    const b = createSignal();

    const valueFn = vi.fn();

    path.add(a);
    path.add(b);

    expect(path.value).toBe(undefined);

    on(path, SignalsPath.Value, valueFn);

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

    on(path, SignalsPath.Value, valueFn);

    expect(valueFn).toHaveBeenCalledWith('b');
  });

  it('add signals to path', () => {
    const path = new SignalsPath();

    const a = createSignal();
    const b = createSignal();
    const c = createSignal();

    const valueFn = vi.fn();

    path.add(a, b);

    on(path, SignalsPath.Value, valueFn);

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

    path.add(a, b); // --- [ b:- | c:- ]

    on(path, SignalsPath.Value, valueFn);

    expect(valueFn, 'path just initialized').not.toBeCalled();

    b.set('b'); // --- [ b:b | c:- ]

    expect(valueFn, 'b').toHaveBeenCalledWith('b');
    valueFn.mockClear();

    path.clear(); // --- []

    expect(valueFn, 'after 1st clear()').toHaveBeenCalledWith(undefined);
    valueFn.mockClear();

    path.add(a, b, c); // --- [ a:- | b:b | c:- ]

    expect(valueFn, 'after a, b, c added').toHaveBeenCalledWith('b');
    valueFn.mockClear();

    c.set('c'); // --- [ a:- | b:b | c:c ]

    expect(valueFn, 'c').not.toBeCalled();
    valueFn.mockClear();

    b.set(undefined); // --- [ a:- | b:- | c:c ]

    expect(valueFn, 'set to undef').toHaveBeenCalledWith('c');
    valueFn.mockClear();

    a.set('a'); // --- [ a:a | b:- | c:c ]

    expect(valueFn, 'last a').toHaveBeenCalledWith('a');
  });
});
