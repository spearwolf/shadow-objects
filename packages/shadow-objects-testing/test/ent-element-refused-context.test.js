import {expect} from '@esm-bundle/chai';
import {ComponentContext, ViewComponent} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import {mount, unmountAll} from '../src/mount.js';
import {withSwallowedErrors} from '../src/withSwallowedErrors.js';

/**
 * A `<shae-ent>` can lose the fight for its `ComponentContext`: another component may already
 * hold its uuid, or the context it tries to join may already be disposed. Both errors come out
 * of the `ViewComponent#context` setter, which `#applyComponentContext()` calls from two places —
 * `connectedCallback()`, a custom element reaction, and the `componentContext$.onChange` listener,
 * a signal effect. Neither has a caller ready to catch a throw: a custom element reaction reports
 * its exception to the global `error` event instead of the code that triggered it, and a signal
 * effect's throw is collected and re-thrown out of whichever `set()` triggered the effect chain —
 * which can be `el.ns = …` itself.
 *
 * This runs in real Chromium because both escape routes are things happy-dom does not reproduce:
 * the reporting of an uncaught custom element reaction and the synchronous rethrow signalize
 * performs from `Signal#set()` when one of its effects throws.
 *
 * Cases 1 through 4 pin that a rejected join stays inside the element on every path that reaches
 * it: the uuid collision on reconnect, the parent binding that runs behind it, the same collision
 * reached through a namespace switch, and the disposed-context variant of the reconnect. Case 5
 * pins the recovery contract instead of a rejection: the next change of `componentContext$` heals
 * it, and writing the same namespace again does not.
 */

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  unmountAll();
});

describe('shae-ent and a refused ComponentContext', () => {
  it('a uuid claimed by a rival does not escape the reconnect', async () => {
    const container = mount('<shae-ent id="rc1" token="probe"></shae-ent>');
    await customElements.whenDefined('shae-ent');

    const el = container.querySelector('#rc1');
    const ctx = el.componentContext;
    const uuid = el.uuid;

    el.remove();
    const rival = new ViewComponent('rival', {context: ctx, uuid});

    const messages = withSwallowedErrors(() => {
      container.append(el);
    });

    expect(messages, 'the rejected join stays inside the element, no Uncaught error reaches the page').to.deep.equal([]);
    expect(el.viewComponent.isDestroyed, 'the ViewComponent could not rejoin').to.be.true;
    expect(el.componentContext, 'the signal already stands on the context the join could not enter').to.equal(ctx);

    rival.destroy();
  });

  it('the rest of the connect still runs after a rejected join', async () => {
    const container = mount('<shae-ent id="rc2-gp" token="gp"><shae-ent id="rc2-kid" token="child"></shae-ent></shae-ent>');
    await customElements.whenDefined('shae-ent');

    const gp = container.querySelector('#rc2-gp');
    const kid = container.querySelector('#rc2-kid');
    const ctx = kid.componentContext;
    const uuid = kid.uuid;

    kid.remove();
    const rival = new ViewComponent('rival', {context: ctx, uuid});

    withSwallowedErrors(() => {
      gp.append(kid);
    });

    expect(kid.entParentNode?.id, 'the parent link is settled right after the reconnect').to.equal('rc2-gp');

    await nextTask();

    expect(kid.entParentNode?.id, 'and the microtask requery of #setParent does not take it away').to.equal('rc2-gp');

    rival.destroy();
  });

  it('a rejected join through a namespace switch does not escape the signal effect', async () => {
    const container = mount(
      '<shae-ent id="rc3-gp" ns="rc3-target" token="gp"><shae-ent id="rc3-el" token="child"></shae-ent></shae-ent>',
    );
    await customElements.whenDefined('shae-ent');

    const el = container.querySelector('#rc3-el');
    const uuid = el.uuid;

    const targetCtx = ComponentContext.get('rc3-target');
    const rival = new ViewComponent('rival', {context: targetCtx, uuid});

    // this is the path where the throw reaches the caller synchronously, not the global error
    // event: `el.ns = …` runs `ns$.set()`, which runs the `ns$.onChange` listener, which runs
    // `componentContext$.set()`, whose effect is `#applyComponentContext`
    expect(() => {
      el.ns = 'rc3-target';
    }, 'the throw from the rejected join must not reach the property assignment').to.not.throw();

    expect(el.ns).to.equal('rc3-target');
    expect(el.componentContext, 'the signal already stands on the context the join could not enter').to.equal(targetCtx);
    expect(el.entParentNode?.id, 'the request for a parent still went out behind the rejected join').to.equal('rc3-gp');

    rival.destroy();
  });

  it('a disposed context does not escape the reconnect either', async () => {
    const container = mount('<shae-ent id="rc4" ns="rc4-a" token="probe"></shae-ent>');
    await customElements.whenDefined('shae-ent');

    const el = container.querySelector('#rc4');

    el.remove();
    el.ns = 'rc4-b';
    ComponentContext.get('rc4-b').dispose();

    const messages = withSwallowedErrors(() => {
      container.append(el);
    });

    expect(messages, 'the rejected join stays inside the element, no Uncaught error reaches the page').to.deep.equal([]);
    expect(el.viewComponent.isDestroyed, 'the ViewComponent could not join the disposed context').to.be.true;
  });

  it('the rejection heals on the next context change, not on writing the same namespace again', async () => {
    const container = mount('<shae-ent id="rc5" ns="rc5-a" token="probe"></shae-ent>');
    await customElements.whenDefined('shae-ent');

    const el = container.querySelector('#rc5');
    const ctx = el.componentContext;
    const uuid = el.uuid;
    const ns = el.ns;

    el.remove();
    const rival = new ViewComponent('rival', {context: ctx, uuid});
    withSwallowedErrors(() => container.append(el));
    expect(el.viewComponent.isDestroyed, 'the rejected join leaves the element stuck').to.be.true;

    rival.destroy();

    // the counter-check: the same namespace written again is not a change `componentContext$`
    // reports, so nothing retries the join even though the uuid is free again by now
    const stillNothing = withSwallowedErrors(() => {
      el.setAttribute('ns', ns);
      el.ns = ns;
    });
    expect(stillNothing, 'writing the same namespace throws nowhere').to.deep.equal([]);
    expect(el.viewComponent.isDestroyed, 'and does not retry the join either').to.be.true;

    // the actual heal: leaving and rejoining the tree always changes `componentContext$`, first to
    // `undefined` and then back to the same context — both are value changes the signal reports
    const noErrorsOnReconnect = withSwallowedErrors(() => {
      el.remove();
      container.append(el);
    });
    expect(noErrorsOnReconnect).to.deep.equal([]);
    expect(el.viewComponent.isDestroyed, 'the reconnect changed the signal value, so the retry ran and succeeded').to.be.false;
    expect(el.uuid, 'the uuid survives the whole episode').to.equal(uuid);
  });
});