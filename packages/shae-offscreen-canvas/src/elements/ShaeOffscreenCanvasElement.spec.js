import {GlobalNS} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import {describe, expect, it} from 'vitest';
import {ShaeOffscreenCanvasElement} from './ShaeOffscreenCanvasElement.js';

/**
 * happy-dom constructs a custom element before it copies the attributes of the markup onto it, and
 * an upgrade replaces the node rather than reviving it. The namespace is read in the constructor,
 * so no markup in this runner reaches that read. The subclass answers the two attribute calls of
 * the constructor itself — both are prototype methods and resolve dynamically inside `super()` —
 * which puts the value under test exactly where the element looks for it.
 */
let nsAttributeValue = '';

class NsProbeElement extends ShaeOffscreenCanvasElement {
  hasAttribute(name) {
    return name === 'ns' ? nsAttributeValue !== '' : super.hasAttribute(name);
  }

  getAttribute(name) {
    return name === 'ns' ? nsAttributeValue : super.getAttribute(name);
  }
}

customElements.define('ns-probe-element', NsProbeElement);

const createWithNamespace = (ns) => {
  nsAttributeValue = ns;
  return document.createElement('ns-probe-element');
};

/**
 * A namespace that ends the attribute it is written into. The `onerror` handler makes it a realistic
 * payload; what the assertions look at is the element it smuggles in, because script execution out
 * of injected markup is not observable in this runner.
 */
const NS_THAT_ENDS_ITS_ATTRIBUTE = '"><img id="ns-escape" src="x" onerror="globalThis.nsEscaped = true">';

describe('ShaeOffscreenCanvasElement', () => {
  it('puts the namespace of the element on the entity of its shadow root', () => {
    const el = createWithNamespace('my-namespace');

    expect(el.shadowEntity.getAttribute('ns')).toBe('my-namespace');
    expect(el.ns).toBe('my-namespace');
  });

  it('leaves the entity without a namespace attribute when the element carries none', () => {
    const el = createWithNamespace('');

    expect(el.shadowEntity.hasAttribute('ns')).toBe(false);
    expect(el.shadowEntity.ns).toBe(GlobalNS);
  });

  it('keeps a namespace that ends its attribute inside the attribute', () => {
    const el = createWithNamespace(NS_THAT_ENDS_ITS_ATTRIBUTE);

    expect(el.shadowEntity.getAttribute('ns')).toBe(NS_THAT_ENDS_ITS_ATTRIBUTE);
  });

  it('builds no element its template does not name, whatever the namespace contains', () => {
    const el = createWithNamespace(NS_THAT_ENDS_ITS_ATTRIBUTE);

    expect(el.shadow.getElementById('ns-escape')).toBe(null);
    expect(el.shadow.querySelectorAll('*').length).toBe(6);
  });

  it('sets the namespace on a template that carries no placeholder for it', () => {
    nsAttributeValue = 'my-namespace';
    const el = new NsProbeElement('<canvas id="display"></canvas><shae-ent id="entity" token="ShaeOffscreenCanvas"></shae-ent>');

    expect(el.shadowEntity.getAttribute('ns')).toBe('my-namespace');
  });

  it('keeps the token of the entity when the namespace ends its attribute', () => {
    const el = createWithNamespace(NS_THAT_ENDS_ITS_ATTRIBUTE);

    expect(el.shadowEntity.getAttribute('token')).toBe('ShaeOffscreenCanvas');
  });
});