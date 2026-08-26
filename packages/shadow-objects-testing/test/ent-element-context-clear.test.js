import {expect} from '@esm-bundle/chai';
import {ComponentContext, ReRequestEntHostEventName, ShaeEntElement} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import {mount, unmountAll} from '../src/mount.js';

/**
 * A `<shae-ent>` subscribes to the three re-request events on its `ViewComponent`, and ending the
 * component takes those subscriptions off with every other one. The component announces that
 * teardown on itself before it goes silent, and the element sets its subscriptions up again one
 * microtask later — so a context that tears its components down as a whole leaves no deaf element
 * behind. This file pins the healing and the width of the window it costs; both are written down
 * in `docs/api-reference.md`.
 *
 * Runs in real Chromium: the subscription comes out of a signal effect in the element
 * constructor, and the answer is observed as a composed `CustomEvent` crossing the tree.
 */

/** The element sets its subscriptions up again one microtask after the teardown. */
const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

// `moveBefore` is the only move that keeps the element connected, and an empty
// `connectedMoveCallback` is what opts a subclass out of the disconnect/connect pair.
// Without it the element would rejoin its ComponentContext on the way back in, and the
// case would measure a healed element instead of the one it means to measure
customElements.define(
  'move-ent-cx',
  class extends ShaeEntElement {
    connectedMoveCallback() {}
  },
);

describe('shae-ent and a context that takes its components down', () => {
  afterEach(() => {
    unmountAll();
  });

  it('answers re-request rounds again once its component has been taken down and revived', async () => {
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

      await nextTask();

      ctx.broadcastEvent(ComponentContext.ReRequestEntHost);
      expect(rounds, 'the revived component carries the subscriptions of the element again').to.have.lengthOf(2);

      // the element keeps the same component, and leaving the context takes nothing off it — the
      // round trip is the counter-check that the healing does not hang on being re-appended
      el.remove();
      container.append(el);
      expect(el.viewComponent, 'the same component came back with the element').to.equal(vc);

      ctx.broadcastEvent(ComponentContext.ReRequestEntHost);
      expect(rounds, 'a round trip through the document changes nothing about that').to.have.lengthOf(3);
    } finally {
      document.removeEventListener(ReRequestEntHostEventName, onHostRequest);
    }
  });

  it('answers again through a new element in that place, next to the healed one', async () => {
    const container = mount('<shae-ent id="cn" token="cn"></shae-ent>');
    const ctx = ComponentContext.get();
    const vc = container.querySelector('#cn').viewComponent;

    ctx.clear();
    vc.context = ctx;

    // a fresh element builds its own component and subscribes to it on the way in — the request
    // it sends while connecting is counted from here on, so only the round below is measured
    container.insertAdjacentHTML('beforeend', '<shae-ent id="cn2" token="cn2"></shae-ent>');

    await nextTask();

    const rounds = [];
    const onHostRequest = (event) => rounds.push(event);
    document.addEventListener(ReRequestEntHostEventName, onHostRequest);

    try {
      // two answers, because both elements answer: the new one and the one whose component was
      // taken down and set its subscriptions up again
      ctx.broadcastEvent(ComponentContext.ReRequestEntHost);
      expect(rounds, 'the new element answers, and so does the one whose component was taken down').to.have.lengthOf(2);
    } finally {
      document.removeEventListener(ReRequestEntHostEventName, onHostRequest);
    }
  });

  it('sets up once when two teardowns fall into the same task', async () => {
    const container = mount('<shae-ent id="ct" token="ct"></shae-ent>');
    const el = container.querySelector('#ct');
    const ctx = ComponentContext.get();
    const vc = el.viewComponent;

    const rounds = [];
    const onHostRequest = (event) => rounds.push(event);
    document.addEventListener(ReRequestEntHostEventName, onHostRequest);

    try {
      // two announcements inside one window: the element waits for the whole task to be over and
      // sets up once for both, so the round below is answered once and not twice
      ctx.clear();
      vc.context = ctx;
      ctx.clear();
      vc.context = ctx;

      ctx.broadcastEvent(ComponentContext.ReRequestEntHost);
      expect(rounds, 'both teardowns fall inside the window').to.have.lengthOf(0);

      await nextTask();

      ctx.broadcastEvent(ComponentContext.ReRequestEntHost);
      expect(rounds, 'the element answers once, not once per teardown').to.have.lengthOf(1);
    } finally {
      document.removeEventListener(ReRequestEntHostEventName, onHostRequest);
    }
  });

  it('misses a round broadcast in the same task as the teardown', async () => {
    const container = mount('<shae-ent id="cw" token="cw"></shae-ent>');
    const el = container.querySelector('#cw');
    const ctx = ComponentContext.get();
    const vc = el.viewComponent;

    const rounds = [];
    const onHostRequest = (event) => rounds.push(event);
    document.addEventListener(ReRequestEntHostEventName, onHostRequest);

    try {
      ctx.clear();
      vc.context = ctx;

      ctx.broadcastEvent(ComponentContext.ReRequestEntHost);
      expect(rounds, 'a round in the same task as the teardown passes the element by').to.have.lengthOf(0);

      await nextTask();

      ctx.broadcastEvent(ComponentContext.ReRequestEntHost);
      expect(rounds, 'one microtask later the element is back in').to.have.lengthOf(1);
    } finally {
      document.removeEventListener(ReRequestEntHostEventName, onHostRequest);
    }
  });

  // A component that holds no ComponentContext stands in no entity tree, and a DOM move that
  // puts such an element under an entity in the same state must not turn that into a parent
  // link: the link is refused, and a refusal has to arrive as an empty parent rather than as a
  // throw out of a MutationObserver callback, where nobody is left to catch it.
  it('carries a move that puts it under an entity whose component has left the ComponentContext too', async () => {
    const container = mount(
      '<shae-ent id="p1-cx" token="p1"><move-ent-cx id="c-cx" token="c"></move-ent-cx></shae-ent>' +
        '<shae-ent id="p2-cx" token="p2"></shae-ent>',
    );
    await customElements.whenDefined('move-ent-cx');

    const c = container.querySelector('#c-cx');
    const p2 = container.querySelector('#p2-cx');

    expect(c.entParentNode?.id, 'it starts under the first parent').to.equal('p1-cx');

    ComponentContext.get().clear();

    // the throw would come out of a MutationObserver callback, so the window is the only place
    // it shows up at all
    const errors = [];
    const onError = (event) => {
      errors.push(event.error ?? event.message);
      event.preventDefault();
    };
    window.addEventListener('error', onError);

    try {
      p2.moveBefore(c, null);
      await nextTask();

      expect(errors, 'the move is carried out with nothing thrown at the window').to.deep.equal([]);
      expect(c.entParentNode?.id, 'the element follows the move').to.equal('p2-cx');
      expect(c.viewComponent.parent, 'and its entity takes no parent while it is in no ComponentContext').to.be.undefined;
    } finally {
      window.removeEventListener('error', onError);
    }
  });

  // The counter-check on the ordinary way through the same move: a component that holds its
  // ComponentContext takes the parent the move puts it under.
  it('links the entity tree on the same move while its component is in the ComponentContext', async () => {
    const container = mount(
      '<shae-ent id="p1-cy" token="p1"><move-ent-cx id="c-cy" token="c"></move-ent-cx></shae-ent>' +
        '<shae-ent id="p2-cy" token="p2"></shae-ent>',
    );
    await customElements.whenDefined('move-ent-cx');

    const c = container.querySelector('#c-cy');
    const p2 = container.querySelector('#p2-cy');

    expect(c.entParentNode?.id, 'it starts under the first parent').to.equal('p1-cy');

    p2.moveBefore(c, null);
    await nextTask();

    expect(c.entParentNode?.id, 'the element follows the move').to.equal('p2-cy');
    expect(c.viewComponent.parent, 'and the entity tree says the same').to.equal(p2.viewComponent);
  });
});
