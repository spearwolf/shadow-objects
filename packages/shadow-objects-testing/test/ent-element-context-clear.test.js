import {expect} from '@esm-bundle/chai';
import {ComponentContext, ReRequestEntHostEventName} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import {mount, unmountAll} from '../src/mount.js';

/**
 * A `<shae-ent>` subscribes to the three re-request events on its `ViewComponent` exactly once,
 * at the moment the component is created. Ending the component takes those subscriptions off with
 * every other one, so a context that tears its components down as a whole leaves the elements
 * above them without an ear for later rounds — and nothing an element can do to itself sets them
 * up again, because the effect holding them hangs on a signal that is written once. This file pins
 * that boundary and the one way out of it — it is written down in `docs/api-reference.md` and
 * stands in `Backlog.md`.
 *
 * Runs in real Chromium: the subscription comes out of a signal effect in the element
 * constructor, and the answer is observed as a composed `CustomEvent` crossing the tree.
 */
describe('shae-ent and a context that takes its components down', () => {
  afterEach(() => {
    unmountAll();
  });

  it('stops answering re-request rounds once its component has been taken down and revived', () => {
    const container = mount('<shae-ent id="cc" token="cc"></shae-ent>');
    const el = container.querySelector('#cc');
    const ctx = ComponentContext.get();
    const vc = el.viewComponent;

    const rounds = [];
    const onHostRequest = (event) => rounds.push(event);
    document.addEventListener(ReRequestEntHostEventName, onHostRequest);

    try {
      ctx.broadcastEvent(ComponentContext.ReRequestEntHost);
      expect(rounds, 'the round reaches the element while its component is untouched').to.have.lengthOf(1);

      ctx.clear();
      vc.context = ctx;
      expect(vc.isDestroyed, 'the same component is back in the context').to.be.false;

      ctx.broadcastEvent(ComponentContext.ReRequestEntHost);
      expect(rounds, 'the revived component carries no subscription of the element').to.have.lengthOf(1);

      // the element keeps the same component across a round trip through the document, so the
      // effect that would set the subscriptions up never sees a reason to run again
      el.remove();
      container.append(el);
      expect(el.viewComponent, 'the same component came back with the element').to.equal(vc);

      ctx.broadcastEvent(ComponentContext.ReRequestEntHost);
      expect(rounds, 'a round trip through the document sets nothing up again').to.have.lengthOf(1);
    } finally {
      document.removeEventListener(ReRequestEntHostEventName, onHostRequest);
    }
  });

  it('answers again through a new element in that place', () => {
    const container = mount('<shae-ent id="cn" token="cn"></shae-ent>');
    const ctx = ComponentContext.get();
    const vc = container.querySelector('#cn').viewComponent;

    ctx.clear();
    vc.context = ctx;

    // a fresh element builds its own component and subscribes to it on the way in — the request
    // it sends while connecting is counted from here on, so only the round below is measured
    container.insertAdjacentHTML('beforeend', '<shae-ent id="cn2" token="cn2"></shae-ent>');

    const rounds = [];
    const onHostRequest = (event) => rounds.push(event);
    document.addEventListener(ReRequestEntHostEventName, onHostRequest);

    try {
      ctx.broadcastEvent(ComponentContext.ReRequestEntHost);
      expect(rounds, 'the new element answers, the deaf one still does not').to.have.lengthOf(1);
    } finally {
      document.removeEventListener(ReRequestEntHostEventName, onHostRequest);
    }
  });
});