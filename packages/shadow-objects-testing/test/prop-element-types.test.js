import {expect} from '@esm-bundle/chai';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-prop.js';
import {mount as mountHtml, unmountAll} from '../src/mount.js';
import {withSwallowedErrors} from '../src/withSwallowedErrors.js';

/**
 * `ShaePropElement` converts its `value` attribute through a `switch` keyed by `type`, entirely
 * inside the custom element's markup-driven upgrade path — there is no conversion function
 * exported to call in isolation. This spec drives every branch through real attribute parsing
 * in Chromium, because happy-dom does not reproduce Custom Elements upgrade timing reliably.
 */

const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * Builds `<shae-ent token="probe"><shae-prop name="p" ...></shae-prop></shae-ent>` and returns
 * the `<shae-prop>`.
 */
const mount = ({type, value, noTrim} = {}) => {
  const typeAttr = type != null ? ` type="${esc(type)}"` : '';
  const valueAttr = value != null ? ` value="${esc(value)}"` : '';
  const noTrimAttr = noTrim != null ? ` no-trim="${esc(noTrim)}"` : '';
  const container = mountHtml(
    `<shae-ent token="probe"><shae-prop name="p"${typeAttr}${valueAttr}${noTrimAttr}></shae-prop></shae-ent>`,
  );
  return container.querySelector('shae-prop');
};

const ta = (ctor, items) => ({ctor, items});

const check = (actual, expected) => {
  if (expected && typeof expected === 'object' && 'ctor' in expected && 'items' in expected) {
    expect(actual).to.be.instanceOf(expected.ctor);
    expect(actual.length).to.equal(expected.items.length);
    expect(Array.from(actual)).to.deep.equal(expected.items);
  } else if (typeof expected === 'number' && Number.isNaN(expected)) {
    expect(Number.isNaN(actual)).to.be.true;
  } else if (typeof expected === 'object' && expected !== null) {
    expect(actual).to.deep.equal(expected);
  } else {
    expect(actual).to.equal(expected);
  }
};

afterEach(() => {
  unmountAll();
});

describe('shae-prop type conversion — one case per type name', () => {
  // 42 `TYPES` entries, 42 rows — measured against the extracted switch in Node and against
  // dist/bundle.js in Chromium, both runs agree.
  const cases = [
    ['string', 'hello world', 'hello world'],
    ['text', 'hello world', 'hello world'],
    ['number', '42.5', 42.5],
    ['bigint', '9007199254740993', 9007199254740993n],
    ['float', '3.14abc', 3.14],
    ['int', '42.9', 42],
    ['integer', '42.9', 42],
    ['hex', 'ff', 255],
    ['hexadecimal', 'ff', 255],
    ['oct', '17', 15],
    ['octal', '17', 15],
    ['bin', '1011', 11],
    ['binary', '1011', 11],
    ['bool', 'YES', true],
    ['boolean', 'no', false],
    ['[]', 'a, b, c', ['a', 'b', 'c']],
    ['text[]', 'a-b-c', ['a', 'b', 'c']],
    ['string[]', 'foo bar', ['foo', 'bar']],
    ['number[]', '1 -2 3.5', [1, -2, 3.5]],
    ['float[]', '1.5 -2.5', [1.5, -2.5]],
    ['int[]', '1 -2', [1, -2]],
    ['integer[]', '10 20', [10, 20]],
    ['hex[]', 'ff 0a', [255, 10]],
    ['hexadecimal[]', 'ff 0a', [255, 10]],
    ['oct[]', '17 7', [15, 7]],
    ['octal[]', '17 7', [15, 7]],
    ['bin[]', '1011 110', [11, 6]],
    ['binary[]', '1011 110', [11, 6]],
    ['bool[]', 'yes no on off', [true, false, true, false]],
    ['boolean[]', 'true false 1 0', [true, false, true, false]],
    ['int8array', '1 2 3', ta(Int8Array, [1, 2, 3])],
    ['uint8array', '1 2 300', ta(Uint8Array, [1, 2, 44])],
    ['uint8clampedarray', '1 2 300', ta(Uint8ClampedArray, [1, 2, 255])],
    ['int16array', '1 2 3', ta(Int16Array, [1, 2, 3])],
    ['uint16array', '1 2 3', ta(Uint16Array, [1, 2, 3])],
    ['int32array', '1 2 3', ta(Int32Array, [1, 2, 3])],
    ['uint32array', '1,2,3', ta(Uint32Array, [1, 2, 3])],
    ['float32array', '1.5 2.5 -3.5', ta(Float32Array, [1.5, 2.5, -3.5])],
    ['float64array', '1.5 -2.5', ta(Float64Array, [1.5, -2.5])],
    ['bigint64array', '1 2 3', ta(BigInt64Array, [1n, 2n, 3n])],
    ['biguint64array', '1 2 3', ta(BigUint64Array, [1n, 2n, 3n])],
    ['json', '{"a":1,"b":[2,3]}', {a: 1, b: [2, 3]}],
  ];

  // uint8array/300 pins the overflow to 44, uint8clampedarray/300 pins the clamp to 255,
  // and uint32array/'1,2,3' pins that `\W+` splits on the comma exactly like whitespace.
  for (const [type, value, expected] of cases) {
    it(`type="${type}" value="${value}"`, () => {
      const prop = mount({type, value});
      check(prop.value, expected);
    });
  }
});

describe('shae-prop type conversion — separator patterns (\\W+ vs \\s+)', () => {
  // Eleven of the array/typed-array branches split on `\W+` (any non-word character), four
  // split on `\s+` (whitespace only) — invisible on a skim of the switch, pinned down here.
  // The last three rows are the \s+ counter-proof: sign and decimal point survive there.
  const cases = [
    ['int8array', '1 -2 3', ta(Int8Array, [1, 2, 3])],
    ['int16array', '-1 2', ta(Int16Array, [0, 1, 2])],
    ['int32array', '1.5 -2.5', ta(Int32Array, [1, 5, 2, 5])],
    ['uint32array', '1;2;3', ta(Uint32Array, [1, 2, 3])],
    ['bigint64array', '1 -2', ta(BigInt64Array, [1n, 2n])],
    ['biguint64array', '-1 2', ta(BigUint64Array, [0n, 1n, 2n])],
    ['hex[]', '-ff 0a', [NaN, 255, 10]],
    ['[]', '.a b', ['', 'a', 'b']],
    ['[]', 'a, b.', ['a', 'b', '']],
    ['float32array', '1.5 -2.5', ta(Float32Array, [1.5, -2.5])],
    ['float64array', '1.5 -2.5', ta(Float64Array, [1.5, -2.5])],
    ['number[]', '1 -2 3.5', [1, -2, 3.5]],
    // these six branches only had whitespace-only cases above, so a \W+ <-> \s+ swap for any
    // of them would have stayed green — each of these separates on a non-whitespace character
    ['uint8array', '1,2,3', ta(Uint8Array, [1, 2, 3])],
    ['uint8clampedarray', '1;2;3', ta(Uint8ClampedArray, [1, 2, 3])],
    ['uint16array', '1-2', ta(Uint16Array, [1, 2])],
    ['oct[]', '1,7', [1, 7]],
    ['bin[]', '1,0', [1, 0]],
    ['bool[]', 'yes,no', [true, false]],
  ];

  for (const [type, value, expected] of cases) {
    it(`type="${type}" value="${value}"`, () => {
      const prop = mount({type, value});
      check(prop.value, expected);
    });
  }
});

describe('shae-prop type conversion — malformed input that does not throw', () => {
  const cases = [
    ['number', 'abc', NaN],
    ['float', 'abc', NaN],
    ['int', 'abc', NaN],
    ['hex', 'zz', NaN],
    ['oct', '9', NaN],
    ['bin', '2', NaN],
    ['number[]', 'a b', [NaN, NaN]],
    ['float[]', 'a b', [NaN, NaN]],
    ['int[]', 'a b', [NaN, NaN]],
    ['hex[]', 'zz', [NaN]],
    ['oct[]', '9', [NaN]],
    ['bin[]', '2', [NaN]],
    // the typed array constructor coerces NaN to 0 — unlike float32array, which keeps NaN
    ['int8array', 'a b', ta(Int8Array, [0, 0])],
    ['float32array', 'a b', ta(Float32Array, [NaN, NaN])],
    ['bool', 'nonsense', false],
  ];

  for (const [type, value, expected] of cases) {
    it(`type="${type}" value="${value}"`, () => {
      const prop = mount({type, value});
      check(prop.value, expected);
    });
  }
});

describe('shae-prop type conversion — malformed input that throws', () => {
  // The JS property setter is chosen on purpose: the conversion effect runs synchronously
  // there, so the exception reaches the caller directly instead of vanishing into the
  // Custom Elements reaction queue (see ../src/withSwallowedErrors.js).
  const throwCases = [
    ['bigint', '1', 'abc'],
    ['json', '{}', '{oops'],
    ['bigint64array', '1', '1 x 3'],
    ['biguint64array', '1', '1 x 3'],
  ];

  for (const [type, validValue, badValue] of throwCases) {
    it(`${type} throws on the property path`, () => {
      const prop = mount({type, value: validValue});
      expect(() => {
        prop.value = badValue;
      }).to.throw(SyntaxError);
    });
  }

  it('a throw at upgrade time leaves the element dead', () => {
    // this pins the current behaviour and is expected to change: a throw from the batch() in
    // the constructor puts the custom element into the "failed" state, so attributeChangedCallback
    // is never enqueued again for this element — the conversion effect itself is untouched, it
    // simply never gets re-triggered because its trigger stops firing.
    let prop;
    const messages = withSwallowedErrors(() => {
      prop = mount({type: 'json', value: '{oops'});
    });
    expect(messages).to.have.lengthOf(1);
    expect(messages[0]).to.match(/JSON/);
    expect(prop.isShaePropElement).to.be.true;
    expect(prop.value).to.be.undefined;

    prop.setAttribute('value', '{"a":1}');
    expect(prop.value).to.be.undefined;
  });

  it('a throw after upgrade keeps the previous value and recovers', () => {
    const prop = mount({type: 'json', value: '{}'});
    expect(prop.value).to.deep.equal({});

    const messages = withSwallowedErrors(() => {
      prop.setAttribute('value', '{oops');
    });
    expect(messages).to.have.lengthOf(1);
    expect(messages[0]).to.match(/JSON/);
    expect(prop.value).to.deep.equal({});

    prop.setAttribute('value', '{"z":9}');
    expect(prop.value).to.deep.equal({z: 9});
  });
});

describe('shae-prop type conversion — no-trim attribute', () => {
  // TRUTHY_VALUES = ['on', 'true', 'yes', 'local', '1'], and readBooleanAttribute maps a
  // present-but-empty attribute to '1' — so these six values keep the raw whitespace.
  const keepsWhitespace = ['', '1', 'true', 'on', 'yes', 'local'];
  for (const noTrim of keepsWhitespace) {
    it(`no-trim="${noTrim}" keeps the surrounding whitespace`, () => {
      const prop = mount({value: '  z  ', noTrim});
      expect(prop.value).to.equal('  z  ');
    });
  }

  const stillTrims = ['0', 'false', 'no', 'nonsense'];
  for (const noTrim of stillTrims) {
    it(`no-trim="${noTrim}" still trims`, () => {
      const prop = mount({value: '  z  ', noTrim});
      expect(prop.value).to.equal('z');
    });
  }

  it('without the attribute the value is trimmed', () => {
    const prop = mount({value: '  z  '});
    expect(prop.value).to.equal('z');
  });

  it('type="number[]" with no-trim="" splits on the untrimmed whitespace boundary', () => {
    // the leading and trailing space each produce an empty split segment, Number('') is 0
    const prop = mount({type: 'number[]', value: ' 1 2 ', noTrim: ''});
    expect(prop.value).to.deep.equal([0, 1, 2, 0]);
  });

  it('toggling no-trim at runtime re-evaluates the still-raw value attribute', () => {
    // #readValueAttribute never trims — the raw string is kept in valueIn$, so flipping
    // no-trim alone is enough to change the result without touching the value attribute.
    const prop = mount({value: '  z  '});
    expect(prop.value).to.equal('z');

    prop.setAttribute('no-trim', '');
    expect(prop.value).to.equal('  z  ');

    prop.removeAttribute('no-trim');
    expect(prop.value).to.equal('z');
  });
});

describe('shae-prop type conversion — type attribute handling', () => {
  it('trims and lowercases the type name', () => {
    const prop = mount({type: '  NUMBER[] ', value: '1 2'});
    expect(prop.value).to.deep.equal([1, 2]);
  });

  it('an unknown type name warns and leaves the string untouched', () => {
    const prop = mount({type: 'nonsense', value: '1 2'});
    expect(prop.value).to.equal('1 2');
  });

  it('without a type attribute the value stays a string', () => {
    const prop = mount({value: '42'});
    expect(prop.value).to.equal('42');
  });

  it('changing the type attribute at runtime re-converts the value', () => {
    const prop = mount({type: 'string', value: '42'});
    expect(prop.value).to.equal('42');

    prop.setAttribute('type', 'number[]');
    expect(prop.value).to.deep.equal([42]);
  });

  it('removing the value attribute clears the value', () => {
    const prop = mount({type: 'string', value: '42'});
    prop.removeAttribute('value');
    expect(prop.value).to.be.undefined;
  });
});

describe('shae-prop type conversion — falsy values', () => {
  it('value="" with type="number" is undefined', () => {
    // the conversion effect collapses every falsy value to undefined before the type switch
    // runs, so an empty attribute is indistinguishable from a missing one — that result is
    // settled, only the place where the normalization happens is still open
    const prop = mount({type: 'number', value: ''});
    expect(prop.value).to.be.undefined;
  });

  it('value="0" with type="number" is 0, because the string "0" is truthy', () => {
    const prop = mount({type: 'number', value: '0'});
    expect(prop.value).to.equal(0);
  });

  it('a whitespace only value is undefined once trimmed', () => {
    // this pins the current behaviour and is expected to change
    const prop = mount({value: '   '});
    expect(prop.value).to.be.undefined;
  });

  it('falsy values assigned through the JS property are lost', () => {
    // this pins the current behaviour and is expected to change
    const prop = mount({type: 'number'});

    prop.value = 0;
    expect(prop.value).to.be.undefined;

    prop.value = false;
    expect(prop.value).to.be.undefined;

    prop.value = '';
    expect(prop.value).to.be.undefined;

    prop.value = 7;
    expect(prop.value).to.equal(7);
  });

  it('a non-string value assigned through the JS property passes through unchanged', () => {
    // the switch only runs when typeof value === 'string', so a non-string bypasses it
    // entirely even though a type is set
    const prop = mount({type: 'number[]'});
    const arr = [1, 2];
    prop.value = arr;
    expect(prop.value).to.equal(arr);
  });
});