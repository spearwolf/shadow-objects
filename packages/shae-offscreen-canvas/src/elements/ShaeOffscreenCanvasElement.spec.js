import {emit} from '@spearwolf/eventize';
import {ComponentChangeType, ComponentContext, ContextLost, FrameLoop, GlobalNS} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {CanvasHeight, CanvasWidth, Fps, OffscreenCanvas, PixelRatio, RequestOffscreenCanvas} from '../shared/constants.js';
import {ShaeOffscreenCanvasElement} from './ShaeOffscreenCanvasElement.js';

/**
 * happy-dom constructs a custom element before it copies the attributes of the markup onto it, and
 * an upgrade replaces the node rather than reviving it. The namespace is read in the constructor,
 * so no markup in this runner reaches that read. The subclass answers the two attribute calls of
 * the constructor itself — both are prototype methods and resolve dynamically inside `super()` —
 * which puts the value under test exactly where the element looks for it. For the same reason the
 * template travels the same way: `document.createElement()` calls the constructor without
 * arguments, so the probe reads it from a variable and hands it to `super()` itself. Left at
 * `undefined`, the default template of the element applies.
 */
let nsAttributeValue = '';
let initialHTMLValue;

class NsProbeElement extends ShaeOffscreenCanvasElement {
  constructor() {
    super(initialHTMLValue);
  }

  hasAttribute(name) {
    return name === 'ns' ? nsAttributeValue !== '' : super.hasAttribute(name);
  }

  getAttribute(name) {
    return name === 'ns' ? nsAttributeValue : super.getAttribute(name);
  }
}

customElements.define('ns-probe-element', NsProbeElement);

const createWithNamespace = (ns, initialHTML) => {
  nsAttributeValue = ns;
  initialHTMLValue = initialHTML;
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

  it('keeps the token of the entity when the namespace ends its attribute', () => {
    const el = createWithNamespace(NS_THAT_ENDS_ITS_ATTRIBUTE);

    expect(el.shadowEntity.getAttribute('token')).toBe('ShaeOffscreenCanvas');
  });

  it('sets the namespace on a template that carries no placeholder for it', () => {
    const el = createWithNamespace(
      'my-namespace',
      '<canvas id="display"></canvas><shae-ent id="entity" token="ShaeOffscreenCanvas"></shae-ent>',
    );

    expect(el.shadowEntity.getAttribute('ns')).toBe('my-namespace');
  });

  describe('the frame loop', () => {
    it('subscribes to the shared frame loop while it is in the document', () => {
      const el = createWithNamespace('');
      const subscriptionCountBefore = FrameLoop.get().subscriptionCount;

      document.body.appendChild(el);
      expect(FrameLoop.get().subscriptionCount).toBe(subscriptionCountBefore + 1);

      el.remove();
      expect(FrameLoop.get().subscriptionCount).toBe(subscriptionCountBefore);
    });
  });

  let connectCounter = 0;
  const connectedElements = [];

  const connect = (name) => {
    const el = createWithNamespace(`${name}-${++connectCounter}`);
    // vitest runs happy-dom on http://localhost, so ConsoleLogger.sharedConfig treats it as a
    // trusted localhost origin and turns logging on by default; without this the element would
    // write its fps and pixelZoom messages to the console on every case below, plus a warning every
    // time a case in "the canvas transfer" triggers ContextLost.
    el.logger.enable = false;
    document.body.appendChild(el);
    connectedElements.push(el);
    return el;
  };

  afterEach(() => {
    // remove() before dispose(): each case here gets its own namespace, so nothing in this suite
    // actually depends on the order — this is hygiene that follows the production teardown shape
    // (disconnectedCallback runs before a context would ever be disposed), not a constraint this
    // suite measures.
    for (const el of connectedElements) {
      el.remove();
      ComponentContext.get(el.ns).dispose();
    }
    connectedElements.length = 0;
  });

  const drain = (el) => ComponentContext.get(el.ns).buildChangeTrails();

  const propsOf = (trail, el) =>
    new Map(
      trail.find((c) => c.uuid === el.viewComponent.uuid && c.type === ComponentChangeType.ChangeProperties)?.properties ?? [],
    );

  const eventsOf = (trail, el) =>
    trail.filter((c) => c.uuid === el.viewComponent.uuid && c.type === ComponentChangeType.SendEvents);

  const frame = (el) => el[FrameLoop.OnFrame]();

  // The ViewComponent instance behind `viewComponent$` stays the same across remove() and
  // reconnecting the element — #applyComponentContext moves the ViewComponent's own context, not
  // the signal holding the ViewComponent itself. Reaching it while the element sits outside the
  // document therefore needs a direct emit on the component: the ComponentContext no longer knows
  // about it, so dispatchMessage()/broadcastEvent() cannot ask it anything, but a listener the
  // element itself set up still answers whatever is emitted on the instance directly.
  describe('what the element answers while it is in the document', () => {
    it('an element outside the document answers no canvas request', () => {
      const el = connect('outside-request');
      el.remove();

      const transferSpy = vi.spyOn(el.canvas, 'transferControlToOffscreen');

      emit(el.viewComponent, RequestOffscreenCanvas);

      expect(transferSpy).not.toHaveBeenCalled();
    });

    it('an element outside the document answers no lost context', () => {
      const el = connect('outside-lost-context');
      el.remove();
      const displayNodeBeforeRemoval = el.canvas;

      emit(el.viewComponent, ContextLost);

      expect(el.canvas).toBe(displayNodeBeforeRemoval);
    });

    it('an element put back into the document answers again', () => {
      const el = connect('put-back');
      el.remove();
      document.body.appendChild(el);

      const transferSpy = vi.spyOn(el.canvas, 'transferControlToOffscreen');

      emit(el.viewComponent, RequestOffscreenCanvas);

      expect(transferSpy).toHaveBeenCalled();
    });

    it('an element moved within one task keeps answering', () => {
      const el = connect('moved-within-task');
      const host2 = document.createElement('div');
      document.body.appendChild(host2);

      drain(el);

      host2.appendChild(el);

      expect(drain(el).length).toBe(0);

      const transferSpy = vi.spyOn(el.canvas, 'transferControlToOffscreen');

      emit(el.viewComponent, RequestOffscreenCanvas);

      expect(transferSpy).toHaveBeenCalled();

      host2.remove();
    });
  });

  describe('the canvas transfer', () => {
    it('hands the offscreen canvas of its display node to the shadow objects', () => {
      const el = connect('transfer');
      const transferSpy = vi.spyOn(el.canvas, 'transferControlToOffscreen');

      ComponentContext.get(el.ns).dispatchMessage(el.viewComponent.uuid, RequestOffscreenCanvas);

      const events = eventsOf(drain(el), el);

      expect(events.length).toBe(1);
      expect(events[0].events.length).toBe(1);
      expect(events[0].events[0].type).toBe(OffscreenCanvas);
      // the assertion above only names the event type; it says nothing about which canvas node the
      // transfer came from. Tying the payload to the spy's own return value is what proves it is
      // the display node's transfer, not just some OffscreenCanvas or other.
      expect(events[0].events[0].data.canvas).toBe(transferSpy.mock.results[0].value);
      // happy-dom's transferControlToOffscreen() answers with its internal OffscreenCanvas class,
      // not the window-exposed subclass that wraps it, so `instanceof globalThis.OffscreenCanvas`
      // does not hold even though the object is the real transfer result; the subclass's own
      // prototype chain names the class both sides agree on.
      expect(events[0].events[0].data.canvas).toBeInstanceOf(Object.getPrototypeOf(globalThis.OffscreenCanvas));
    });

    it('puts the very canvas it hands over on the transfer list', () => {
      const el = connect('transfer');

      ComponentContext.get(el.ns).dispatchMessage(el.viewComponent.uuid, RequestOffscreenCanvas);

      const [change] = eventsOf(drain(el), el);

      expect(change.transferables.length).toBe(1);
      expect(change.transferables[0]).toBe(change.events[0].data.canvas);
    });

    it('keeps its display node for the first transfer', () => {
      const el = connect('transfer');
      const displayNodeBefore = el.canvas;

      ComponentContext.get(el.ns).dispatchMessage(el.viewComponent.uuid, RequestOffscreenCanvas);

      expect(el.canvas).toBe(displayNodeBefore);
    });

    it('replaces the display node before it transfers a second time', () => {
      const el = connect('transfer');
      const ctx = ComponentContext.get(el.ns);
      const displayNodeBeforeSecondTransfer = el.canvas;

      ctx.dispatchMessage(el.viewComponent.uuid, RequestOffscreenCanvas);
      const firstOffscreenCanvas = eventsOf(drain(el), el)[0].events[0].data.canvas;

      // transferControlToOffscreen() throws on a canvas node whose control was already
      // transferred, in happy-dom as in a real browser — the second request only succeeds because
      // the element swaps in a fresh display node first.
      expect(() => ctx.dispatchMessage(el.viewComponent.uuid, RequestOffscreenCanvas)).not.toThrow();
      const secondOffscreenCanvas = eventsOf(drain(el), el)[0].events[0].data.canvas;

      expect(el.canvas).not.toBe(displayNodeBeforeSecondTransfer);
      expect(secondOffscreenCanvas).not.toBe(firstOffscreenCanvas);
    });

    it('a lost context replaces the display node and transfers again', () => {
      const el = connect('transfer');
      const ctx = ComponentContext.get(el.ns);

      ctx.dispatchMessage(el.viewComponent.uuid, RequestOffscreenCanvas);
      drain(el);
      const displayNodeAfterTransfer = el.canvas;

      ctx.broadcastEvent(ContextLost);

      expect(el.canvas).not.toBe(displayNodeAfterTransfer);

      const events = eventsOf(drain(el), el);
      expect(events.length).toBe(1);
      expect(events[0].events[0].type).toBe(OffscreenCanvas);
    });

    it('a lost context replaces the display node even when nothing was transferred yet', () => {
      const el = connect('transfer');
      const displayNodeBefore = el.canvas;

      // the ContextLost callback swaps the display node unconditionally; the RequestOffscreenCanvas
      // callback only does it when #offscreenTransferred is already true — that asymmetry is what
      // this case measures.
      ComponentContext.get(el.ns).broadcastEvent(ContextLost);

      expect(el.canvas).not.toBe(displayNodeBefore);
    });

    it('the replacement keeps id, class and place of the node it replaces', () => {
      const el = connect('transfer');
      const frameContainer = el.canvas.parentElement;

      ComponentContext.get(el.ns).broadcastEvent(ContextLost);

      expect(el.canvas.id).toBe('display');
      expect(el.canvas.className).toBe('content');
      expect(el.shadow.getElementById('display')).toBe(el.canvas);
      expect(el.canvas.parentElement).toBe(frameContainer);
    });
  });

  describe('the fps attribute', () => {
    it('reports the default frame rate when the attribute is absent', () => {
      const el = connect('fps');
      drain(el);

      frame(el);

      expect(propsOf(drain(el), el).get(Fps)).toBe(60);
    });

    it('reports the whole number the attribute names', () => {
      const el = connect('fps');
      el.setAttribute('fps', '30');
      drain(el);

      frame(el);

      expect(propsOf(drain(el), el).get(Fps)).toBe(30);
    });

    it.each(['0', '-5', 'abc', '', '  '])('reports zero for a value it cannot use (%j)', (value) => {
      const el = connect('fps');
      el.setAttribute('fps', value);
      drain(el);

      frame(el);

      // an absent attribute reports 60, the default; a present but unusable one reports 0 — two
      // different statements, not one fallback covering both.
      expect(propsOf(drain(el), el).get(Fps)).toBe(0);
    });

    it('truncates a fractional value', () => {
      const el = connect('fps');
      el.setAttribute('fps', '30.7');
      drain(el);

      frame(el);

      expect(propsOf(drain(el), el).get(Fps)).toBe(30);
    });

    it('goes back to the default when the attribute is removed', () => {
      const el = connect('fps');
      el.setAttribute('fps', '30');
      drain(el);
      frame(el);
      drain(el);

      el.removeAttribute('fps');
      frame(el);

      expect(propsOf(drain(el), el).get(Fps)).toBe(60);
    });
  });

  describe('the pixel-zoom attribute', () => {
    it('reports one when the attribute is absent', () => {
      const el = connect('pixel-zoom');

      expect(el.pixelZoom).toBe(1);
    });

    it('reports the whole number the attribute names', () => {
      const el = connect('pixel-zoom');
      el.setAttribute('pixel-zoom', '4');

      expect(el.pixelZoom).toBe(4);
    });

    it.each(['0', '-2', 'abc', ''])('reports one for a value it cannot use (%j)', (value) => {
      const el = connect('pixel-zoom');
      el.setAttribute('pixel-zoom', value);

      expect(el.pixelZoom).toBe(1);
    });

    it('truncates a fractional value', () => {
      const el = connect('pixel-zoom');
      el.setAttribute('pixel-zoom', '2.9');

      expect(el.pixelZoom).toBe(2);
    });

    it('the setter writes the value it was given as the attribute', () => {
      const el = connect('pixel-zoom');
      el.pixelZoom = 3;

      expect(el.getAttribute('pixel-zoom')).toBe('3');
    });

    it('the setter removes the attribute for a value at or below zero', () => {
      const el = connect('pixel-zoom');
      el.setAttribute('pixel-zoom', '4');

      el.pixelZoom = 0;

      expect(el.hasAttribute('pixel-zoom')).toBe(false);
      expect(el.pixelZoom).toBe(1);
    });

    it('the setter leaves an unusable attribute alone when it already reports the value', () => {
      const el = connect('pixel-zoom');
      el.setAttribute('pixel-zoom', 'abc');

      el.pixelZoom = 1;

      // the setter compares the value it was given against what #getPixelZoom() resolves the
      // current attribute to, not against the attribute text itself — 'abc' already resolves to 1,
      // so the write is skipped and the unusable text stays on the attribute.
      expect(el.getAttribute('pixel-zoom')).toBe('abc');
    });

    it('the setter keeps the fraction it was given and the getter truncates it', () => {
      const el = connect('pixel-zoom');
      el.pixelZoom = 2.9;

      expect(el.getAttribute('pixel-zoom')).toBe('2.9');
      expect(el.pixelZoom).toBe(2);
    });
  });

  describe('what a frame carries to the entity', () => {
    it('a frame carries the display size, the pixel ratio and the frame rate', () => {
      const el = connect('frame-carries');
      el.canvas.getBoundingClientRect = () => ({width: 320, height: 200});
      drain(el);

      frame(el);

      const props = propsOf(drain(el), el);
      expect(props.get(CanvasWidth)).toBe(320);
      expect(props.get(CanvasHeight)).toBe(200);
      expect(props.get(PixelRatio)).toBe(1);
      expect(props.get(Fps)).toBe(60);
      expect(el.canvas.style.imageRendering).toBe('');
    });

    it('a pixel zoom divides the pixel ratio and switches the display to pixelated', () => {
      const el = connect('frame-carries');
      el.setAttribute('pixel-zoom', '4');
      el.canvas.getBoundingClientRect = () => ({width: 320, height: 200});
      drain(el);

      frame(el);

      const props = propsOf(drain(el), el);
      expect(props.get(PixelRatio)).toBe(0.25);
      expect(el.canvas.style.imageRendering).toBe('var(--display-image-rendering, pixelated)');
    });

    it('switches the display back to auto when the pixel zoom is removed', () => {
      const el = connect('frame-carries');
      el.canvas.getBoundingClientRect = () => ({width: 320, height: 200});
      el.setAttribute('pixel-zoom', '4');
      frame(el);

      el.removeAttribute('pixel-zoom');
      frame(el);

      expect(el.canvas.style.imageRendering).toBe('var(--display-image-rendering, auto)');
    });

    it('a second frame with nothing changed asks for no sync', () => {
      const el = connect('frame-carries');
      el.canvas.getBoundingClientRect = () => ({width: 320, height: 200});
      drain(el);
      frame(el);

      const syncSpy = vi.spyOn(el.shadowEntity, 'syncShadowObjects');
      frame(el);

      expect(syncSpy).not.toHaveBeenCalled();
    });

    it('a second frame asks for a sync again while a pixel zoom is set', () => {
      const el = connect('frame-carries');
      el.setAttribute('pixel-zoom', '4');
      el.canvas.getBoundingClientRect = () => ({width: 320, height: 200});
      drain(el);
      frame(el);

      const syncSpy = vi.spyOn(el.shadowEntity, 'syncShadowObjects');
      frame(el);

      // [FrameLoop.OnFrame]() compares #lastPixelRatio against the plain, undivided pixelRatio, but
      // stores pixelRatio / pixelZoom in that same field — at pixel-zoom="1" both quantities
      // coincide and the branch stays quiet; above that, the stored value never matches what the
      // comparison expects again, so every following frame reports a ratio change and syncs once
      // more. Measured behavior, not endorsed behavior.
      expect(syncSpy).toHaveBeenCalledTimes(1);
    });
  });
});