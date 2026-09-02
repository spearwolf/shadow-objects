import {expect} from '@esm-bundle/chai';
import {on} from '@spearwolf/eventize';
import {ComponentContext, RequestEntParentEventName, ShaeEntElement, ViewComponent} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-prop.js';
import '@spearwolf/shadow-objects/shae-worker.js';
import {mount, unmountAll} from '../src/mount.js';

/**
 * The namespace of a `<shae-ent>` can change while the element sits in the tree, and the change
 * moves the entity from one environment into another. This spec pins what happens to the parent
 * binding on the way: the element's own, and the one of every entity that hung on it.
 *
 * It runs in real Chromium, because every mechanism involved is one that happy-dom does not
 * reproduce: custom element reactions in their specified order, `MutationObserver` timing against
 * `disconnectedCallback`, and `moveBefore` with its `connectedMoveCallback` opt-out.
 *
 * A custom element name can be defined only once per document, so the cases that need a class of
 * their own bring their own names. Every case uses its own ids and its own namespaces, which
 * keeps the file independent of the order its cases run in.
 *
 * Assertions go through `entParentNode?.id` and through a string derived from the entity tree
 * (`vc.parent === gp.viewComponent ? 'gp-n2' : null`), never through element identity: in the red
 * state the message then names two ids instead of two serialized elements.
 */

/**
 * A namespace change runs synchronously, but two of the mechanisms it triggers do not: the parent
 * request that `#setParent` re-schedules lands in a microtask, and a `MutationObserver` reports
 * one checkpoint later.
 */
const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Counts the parent requests of entities travelling through the document while `action` runs, then
 * keeps counting for three more turns and returns both numbers.
 *
 * A `<shae-prop>` sends the same request under the same event name, so the requester decides what
 * is counted here — otherwise a case that adds a property to its markup silently changes the
 * numbers this file asserts.
 */
const countRequestsWhile = async (action) => {
  let requests = 0;
  const listener = (event) => {
    if (event.detail?.requester?.isShaeEntElement !== true) return;
    requests += 1;
  };
  document.addEventListener(RequestEntParentEventName, listener, {capture: true});
  try {
    await action();
    await nextTask();
    const settled = requests;
    await nextTask();
    await nextTask();
    await nextTask();
    return {settled, afterwards: requests};
  } finally {
    document.removeEventListener(RequestEntParentEventName, listener, {capture: true});
  }
};

afterEach(() => {
  unmountAll();
});

describe('shae-ent and a namespace change', () => {
  it('a namespace change releases the current parent', async () => {
    const container = mount('<shae-ent id="gp-n1" token="gp"><shae-ent id="kid-n1" token="child"></shae-ent></shae-ent>');
    await customElements.whenDefined('shae-ent');

    const kid = container.querySelector('#kid-n1');

    expect(kid.entParentNode?.id, 'the child starts out bound to the element above it').to.equal('gp-n1');

    kid.setAttribute('ns', 'ns-n1');
    await nextTask();

    expect(kid.entParentNode?.id, 'no ancestor answers in the new namespace').to.be.undefined;
  });

  it('the DOM view and the entity tree say the same thing after a namespace change', async () => {
    const container = mount('<shae-ent id="gp-n2" token="gp"><shae-ent id="kid-n2" token="child"></shae-ent></shae-ent>');
    await customElements.whenDefined('shae-ent');

    const gp = container.querySelector('#gp-n2');
    const kid = container.querySelector('#kid-n2');

    const domSays = () => kid.entParentNode?.id ?? null;
    const treeSays = () => (kid.viewComponent?.parent != null && kid.viewComponent.parent === gp.viewComponent ? 'gp-n2' : null);

    expect(domSays(), 'both sides agree before the change').to.equal(treeSays());

    kid.ns = 'ns-n2';
    await nextTask();

    expect(domSays(), 'entParentNode must not claim a parent the entity tree does not have').to.equal(treeSays());
  });

  it('the entity leaves the old context and joins the new one', async () => {
    const container = mount('<shae-ent id="gp-n3" token="gp"><shae-ent id="kid-n3" token="child"></shae-ent></shae-ent>');
    await customElements.whenDefined('shae-ent');

    const gp = container.querySelector('#gp-n3');
    const kid = container.querySelector('#kid-n3');

    kid.ns = 'ns-n3';
    await nextTask();

    expect(kid.viewComponent?.context, 'the entity joined the context of its new namespace').to.equal(
      ComponentContext.get('ns-n3'),
    );
    expect(ComponentContext.get().getChildren(gp.viewComponent), 'the ancestor it left has no children left').to.have.lengthOf(0);
    expect(kid.entParentNode?.id, 'and no parent in the new one').to.be.undefined;
  });

  it('the way back to the original namespace restores the entity tree', async () => {
    const container = mount('<shae-ent id="gp-n4" token="gp"><shae-ent id="kid-n4" token="child"></shae-ent></shae-ent>');
    await customElements.whenDefined('shae-ent');

    const gp = container.querySelector('#gp-n4');
    const kid = container.querySelector('#kid-n4');

    kid.setAttribute('ns', 'ns-n4');
    await nextTask();

    kid.removeAttribute('ns');
    await nextTask();

    expect(kid.entParentNode?.id, 'the element points at its ancestor again').to.equal('gp-n4');
    expect(
      kid.viewComponent?.parent != null && kid.viewComponent.parent === gp.viewComponent ? 'gp-n4' : null,
      'the entity is a child again',
    ).to.equal('gp-n4');
    expect(ComponentContext.get().getChildren(gp.viewComponent), 'and the ancestor has it back').to.have.lengthOf(1);
  });

  it('an element that loses its namespace adopts the entities below it', async () => {
    const container = mount(
      '<shae-ent id="gp-n5" token="gp">' +
        '<shae-ent id="mid-n5" ns="ns-n5" token="mid">' +
        '<shae-ent id="kid-n5" token="child"></shae-ent>' +
        '</shae-ent>' +
        '</shae-ent>',
    );
    await customElements.whenDefined('shae-ent');

    const mid = container.querySelector('#mid-n5');
    const kid = container.querySelector('#kid-n5');

    expect(kid.entParentNode?.id, 'the element in between answers in another namespace, so it is skipped').to.equal('gp-n5');

    mid.removeAttribute('ns');
    await nextTask();

    expect(kid.entParentNode?.id).to.equal('mid-n5');
    expect(kid.viewComponent.parent, 'and the entity tree follows').to.equal(mid.viewComponent);
  });

  it('an element that gains a namespace hands its entities to the next ancestor', async () => {
    const container = mount(
      '<shae-ent id="gp-n6" token="gp">' +
        '<shae-ent id="mid-n6" token="mid">' +
        '<shae-ent id="kid-n6" token="child"></shae-ent>' +
        '</shae-ent>' +
        '</shae-ent>',
    );
    await customElements.whenDefined('shae-ent');

    const gp = container.querySelector('#gp-n6');
    const mid = container.querySelector('#mid-n6');
    const kid = container.querySelector('#kid-n6');

    expect(kid.entParentNode?.id, 'the child starts out on the element in between').to.equal('mid-n6');

    mid.setAttribute('ns', 'ns-n6');
    await nextTask();

    expect(kid.entParentNode?.id).to.equal('gp-n6');
    expect(kid.viewComponent.parent, 'and the entity tree follows').to.equal(gp.viewComponent);
  });

  it('a namespace change reaches the entities that hung on the element and no one else', async () => {
    // the candidate set is the point of this case. Only what hung on the element can get a
    // different answer once it is gone; the entities beside it keep the ancestor they have, and
    // asking them anyway would take each of them out of its parent's children and append it again
    const container = mount(
      '<shae-ent id="gp-n7" token="gp">' +
        '<shae-ent id="s1-n7" token="child"></shae-ent>' +
        '<shae-ent id="mid-n7" token="mid">' +
        '<shae-ent id="kid-n7" token="child"></shae-ent>' +
        '</shae-ent>' +
        '<shae-ent id="s2-n7" token="child"></shae-ent>' +
        '<shae-ent id="s3-n7" token="child"></shae-ent>' +
        '</shae-ent>',
    );
    await customElements.whenDefined('shae-ent');

    const byId = (id) => container.querySelector(`#${id}`);
    const gp = byId('gp-n7');
    const mid = byId('mid-n7');

    const told = new Map();
    for (const id of ['gp-n7', 's1-n7', 's2-n7', 's3-n7', 'kid-n7']) {
      const count = () => told.set(id, (told.get(id) ?? 0) + 1);
      on(byId(id).viewComponent, ComponentContext.ReRequestParentRoots, count);
      on(byId(id).viewComponent, ComponentContext.ReRequestParent, count);
    }

    const childUuids = () =>
      ComponentContext.get()
        .getChildren(gp.viewComponent)
        .map((vc) => vc.uuid);

    const before = childUuids();
    expect(before, 'four entities are bound before the change').to.have.lengthOf(4);

    const midUuid = mid.uuid;
    mid.setAttribute('ns', 'ns-n7');
    await nextTask();

    expect(told.get('kid-n7'), 'the entity that hung on the element is told exactly once').to.equal(1);
    expect(
      ['gp-n7', 's1-n7', 's2-n7', 's3-n7'].map((id) => told.get(id) ?? 0),
      'and nobody beside it is told at all',
    ).to.deep.equal([0, 0, 0, 0]);
    const after = childUuids();
    expect(after.slice(0, 3), 'the children that stay keep their places').to.deep.equal(before.filter((u) => u !== midUuid));
    expect(after[3], 'and the one that climbed up is appended behind them').to.equal(byId('kid-n7').uuid);
  });

  it('an entity whose ancestor leaves the tree looks for a new one', async () => {
    // the ancestor sits in a shadow root while the entity below it stays in the light DOM, so
    // removing the ancestor takes the slot along and leaves the entity connected — no lifecycle
    // callback runs on this side. The entity tree has let go by then (`ViewComponent.destroy()`
    // promotes the children to roots) and the element side would be the only one still claiming a
    // parent. The microtask in the parent effect is no way out either: it reads the signal
    // `viewComponent$` of the ancestor, and leaving the tree does not move that signal
    const container = mount(
      '<shae-ent id="a-nx" token="a">' +
        '<div id="host-nx">' +
        '<shae-ent id="e-nx" token="e"></shae-ent>' +
        '</div>' +
        '</shae-ent>',
    );
    await customElements.whenDefined('shae-ent');

    const host = container.querySelector('#host-nx');
    host.attachShadow({mode: 'open'}).innerHTML = '<shae-ent id="x-nx" token="x"><slot></slot></shae-ent>';
    await nextTask();

    const a = container.querySelector('#a-nx');
    const e = container.querySelector('#e-nx');

    expect(e.entParentNode?.id, 'the projected entity binds to the element holding the slot').to.equal('x-nx');

    host.shadowRoot.getElementById('x-nx').remove();
    await nextTask();

    expect(e.entParentNode?.id, 'the entity moves up to the ancestor that is still there').to.equal('a-nx');
    expect(e.viewComponent.parent, 'and the entity tree says the same').to.equal(a.viewComponent);
  });

  it('an element that gets its namespace before it enters the tree becomes an entity', async () => {
    await customElements.whenDefined('shae-ent');

    // the fragment parser upgrades both elements right away, so their constructors have run while
    // nothing is connected yet. The namespace is written into that window, and it is the only
    // window in which the context signal can move before the element ever sees connectedCallback
    const detached = document.createElement('div');
    detached.innerHTML = '<shae-ent id="p-n8" token="probe"><shae-ent id="k-n8" token="child"></shae-ent></shae-ent>';

    const p = detached.querySelector('#p-n8');
    const k = detached.querySelector('#k-n8');

    // the JS property on one, the attribute on the other: both write the same signal
    p.ns = 'ns-n8';
    k.setAttribute('ns', 'ns-n8');

    mount('').append(detached);
    await nextTask();

    expect(p.viewComponent, 'the element joined its namespace').to.exist;
    expect(k.viewComponent, 'and so did the one below it').to.exist;
    expect(k.entParentNode?.id, 'the hierarchy stands').to.equal('p-n8');
    expect(k.viewComponent.parent, 'in the entity tree too').to.equal(p.viewComponent);
    expect(
      ComponentContext.get('ns-n8').traverseLevelOrderBFS(),
      'and the namespace context holds exactly these two',
    ).to.have.lengthOf(2);
  });

  it('an element whose namespace changed while it was detached comes back alive', async () => {
    const container = mount('<shae-ent id="p-n8b" token="probe"></shae-ent>');
    await customElements.whenDefined('shae-ent');

    const p = container.querySelector('#p-n8b');

    expect(p.viewComponent?.isDestroyed, 'it starts out alive').to.equal(false);

    // leaving the tree destroys the entity and clears the context signal; the namespace change
    // then moves the signal on to its new value, with nothing left listening to it
    p.remove();
    p.setAttribute('ns', 'ns-n8b');
    container.append(p);
    await nextTask();

    expect(p.viewComponent?.isDestroyed, 'the entity is alive again').to.equal(false);
    expect(p.viewComponent.context, 'in the context of its new namespace').to.equal(ComponentContext.get('ns-n8b'));
    expect(ComponentContext.get('ns-n8b').traverseLevelOrderBFS(), 'which holds exactly this one entity').to.have.lengthOf(1);
  });

  it('the parent observer follows the element to its new parent', async () => {
    // `moveBefore` is the only way this observer is ever reached. Over `append` and `remove` the
    // element runs through `disconnectedCallback` first, which is a synchronous custom element
    // reaction: it disconnects the observer and drops the records already queued. A subclass with
    // `connectedMoveCallback` keeps that lifecycle pair from running, so the observer survives the
    // move, reports it — and is the only thing that reports it
    customElements.define(
      'move-ent-n9',
      class extends ShaeEntElement {
        connectedMoveCallback() {}
      },
    );

    const container = mount(
      '<shae-ent id="a-n9" token="a">' +
        '<span id="pin-n9"></span>' +
        '<move-ent-n9 id="mover-n9" token="mover"></move-ent-n9>' +
        '</shae-ent>' +
        '<shae-ent id="c-n9" token="c"></shae-ent>',
    );
    await customElements.whenDefined('move-ent-n9');

    const a = container.querySelector('#a-n9');
    const c = container.querySelector('#c-n9');
    const mover = container.querySelector('#mover-n9');

    expect(mover.entParentNode?.id, 'it starts under the first parent').to.equal('a-n9');

    a.moveBefore(mover, container.querySelector('#pin-n9'));
    await nextTask();

    expect(mover.entParentNode?.id, 'a move inside the same parent changes nothing').to.equal('a-n9');

    c.moveBefore(mover, null);
    await nextTask();

    expect(mover.entParentNode?.id).to.equal('c-n9');

    a.moveBefore(mover, null);
    await nextTask();

    expect(mover.entParentNode?.id, 'and back again').to.equal('a-n9');
  });

  it('says nothing about a move that puts the element back under the node it came from', async () => {
    // `moveBefore` is the only move that reaches the observer without a lifecycle callback of
    // its own, and a reorder among siblings is the one that ends where it started: the record
    // names the element as removed, and the node it hangs on once the record comes due is the
    // node it was registered on
    customElements.define(
      'move-ent-n9d',
      class extends ShaeEntElement {
        parentChanges = [];
        connectedMoveCallback() {}
        onParentChanged(newParent, oldParent) {
          this.parentChanges.push([newParent?.id, oldParent?.id]);
          super.onParentChanged(newParent, oldParent);
        }
      },
    );

    const container = mount(
      '<shae-ent id="a-n9d" token="a">' +
        '<span id="pin-n9d"></span>' +
        '<move-ent-n9d id="mover-n9d" token="mover"></move-ent-n9d>' +
        '</shae-ent>' +
        '<shae-ent id="c-n9d" token="c"></shae-ent>',
    );
    await customElements.whenDefined('move-ent-n9d');

    const a = container.querySelector('#a-n9d');
    const c = container.querySelector('#c-n9d');
    const mover = container.querySelector('#mover-n9d');

    a.moveBefore(mover, container.querySelector('#pin-n9d'));
    await nextTask();

    expect(mover.parentChanges, 'a reorder among siblings is no parent change').to.deep.equal([]);
    expect(mover.entParentNode?.id, 'and the element hangs where it hung').to.equal('a-n9d');

    // the observation is what the suppressed report would otherwise have renewed — without it
    // the next move goes unnoticed
    c.moveBefore(mover, null);
    await nextTask();

    expect(mover.parentChanges, 'a move to another node is reported once').to.deep.equal([['c-n9d', 'a-n9d']]);
    expect(mover.entParentNode?.id).to.equal('c-n9d');
  });

  it('the parent observer follows an element moved while its own registration was running', async () => {
    // A registration runs foreign code before it takes its own watcher: the records the parent has
    // come due for are delivered first, and one of those watchers can be an `onParentChanged`
    // override — a documented extension point. Here it answers with a `moveBefore`, the one move
    // that runs no `connectedCallback` of its own, so the registration under way is the only thing
    // left that can put the observation on the node the element ends up under
    customElements.define(
      'move-ent-n9b',
      class extends ShaeEntElement {
        connectedMoveCallback() {}
      },
    );
    customElements.define(
      'hand-ent-n9b',
      class extends ShaeEntElement {
        connectedMoveCallback() {}
        onParentChanged(newParent, oldParent) {
          this.whenParentChanged?.();
          super.onParentChanged(newParent, oldParent);
        }
      },
    );

    const container = mount(
      '<shae-ent id="from-n9b" token="from">' +
        '<hand-ent-n9b id="hand-n9b" token="hand"></hand-ent-n9b>' +
        '</shae-ent>' +
        '<shae-ent id="to-n9b" token="to"></shae-ent>' +
        '<shae-ent id="third-n9b" token="third"></shae-ent>',
    );
    await customElements.whenDefined('hand-ent-n9b');

    const from = container.querySelector('#from-n9b');
    const to = container.querySelector('#to-n9b');
    const third = container.querySelector('#third-n9b');
    const hand = container.querySelector('#hand-n9b');

    const mover = document.createElement('move-ent-n9b');
    mover.id = 'mover-n9b';
    mover.setAttribute('token', 'mover');

    hand.whenParentChanged = () => {
      to.moveBefore(mover, null);
    };

    // arms the record: this takes `hand` out of the child list of `from` without running the
    // lifecycle pair, so its watcher on `from` is still standing when the record comes due
    to.moveBefore(hand, null);

    // still the same task, so the record is still waiting — and this registration is what delivers
    // it. The watcher above answers by moving this very element off the node it registers on
    from.appendChild(mover);

    expect(mover.parentNode?.id, 'the foreign watcher moved it during its own registration').to.equal('to-n9b');

    await nextTask();

    // where the element hangs is where its entity hangs. The move ran no lifecycle callback of its
    // own, so the registration under way is also the only thing that can say the parent changed
    expect(mover.entParentNode?.id, 'the entity followed the move it was never told about').to.equal('to-n9b');

    // the move it has to report: nothing but the observation on `to` can reach it
    third.moveBefore(mover, null);
    await nextTask();

    expect(mover.entParentNode?.id, 'and the observation came along to where it landed').to.equal('third-n9b');
  });

  it('a throwing override in the registration window costs the notification and nothing behind it', async () => {
    // The parent change of this window is reported by the registration itself, and it reports it
    // into `onParentChanged` — a documented extension point, which is foreign code. A throw from
    // there is written to `console.error` and stops where it happened. What sits behind the
    // notification is the rest of `connectedCallback`: an element whose override takes that with
    // it hangs connected in the tree and was never synced into its environment
    customElements.define(
      'move-ent-n9c',
      class extends ShaeEntElement {
        syncCalls = 0;
        connectedMoveCallback() {}
        onParentChanged() {
          this.syncCallsAtThrow = this.syncCalls;
          throw new Error('this element refuses to hear about its parent');
        }
        syncShadowObjects() {
          this.syncCalls += 1;
          super.syncShadowObjects();
        }
      },
    );
    customElements.define(
      'hand-ent-n9c',
      class extends ShaeEntElement {
        connectedMoveCallback() {}
        onParentChanged(newParent, oldParent) {
          this.whenParentChanged?.();
          super.onParentChanged(newParent, oldParent);
        }
      },
    );

    const container = mount(
      '<shae-ent id="from-n9c" token="from">' +
        '<hand-ent-n9c id="hand-n9c" token="hand"></hand-ent-n9c>' +
        '</shae-ent>' +
        '<shae-ent id="to-n9c" token="to"></shae-ent>',
    );
    await customElements.whenDefined('hand-ent-n9c');

    const from = container.querySelector('#from-n9c');
    const to = container.querySelector('#to-n9c');
    const hand = container.querySelector('#hand-n9c');

    const mover = document.createElement('move-ent-n9c');
    mover.id = 'mover-n9c';
    mover.setAttribute('token', 'mover');

    hand.whenParentChanged = () => {
      to.moveBefore(mover, null);
    };

    // the same arrangement as the case above: this arms the record that the registration below
    // delivers, and the watcher it reaches moves this element off the node it registers on
    to.moveBefore(hand, null);

    const reports = [];
    const consoleError = console.error;
    console.error = (...args) => reports.push(args);
    try {
      from.appendChild(mover);
    } finally {
      console.error = consoleError;
    }

    expect(mover.parentNode?.id, 'the foreign watcher moved it during its own registration').to.equal('to-n9c');
    expect(
      reports.map(([message]) => message),
      'the throw is reported once and reaches no caller',
    ).to.deep.equal(['a removal watcher failed:']);
    // counted against the state the override saw, not against a fixed number: what this pins is
    // that a sync happened behind the notification, and connectedCallback syncs on its way there
    expect(mover.syncCalls, 'connectedCallback ran past the notification and synced the element').to.be.greaterThan(
      mover.syncCallsAtThrow,
    );
  });

  it('an ancestor without a view component settles instead of asking again and again', async () => {
    // whether an element answers depends on `connectedCallback` and on `ns`, not on whether it has
    // an entity of its own. An ancestor without one binds the requester to itself and leaves
    // `vc.parent` empty — which is what schedules the microtask that asks once more
    const container = mount('<shae-ent id="gp-na" token="gp"><shae-ent id="kid-na" token="child"></shae-ent></shae-ent>');
    await customElements.whenDefined('shae-ent');

    const gp = container.querySelector('#gp-na');
    const kid = container.querySelector('#kid-na');

    const {settled, afterwards} = await countRequestsWhile(() => {
      gp.viewComponent$.set(undefined);
    });

    expect(afterwards, 'the requests stop instead of feeding themselves').to.equal(settled);
    // both bounds: an upper one alone is vacuously true for a counter that never counts, and the
    // filter in `countRequestsWhile` is one changed `detail` shape away from being exactly that
    expect(settled, 'and the whole exchange is a handful of events').to.be.within(1, 2);
    expect(kid.entParentNode?.id, 'the binding stands where it was').to.equal('gp-na');
    expect(kid.viewComponent.parent, 'and the entity has no parent to show for it').to.be.undefined;
  });

  it('an ancestor in another component context settles instead of asking again and again', async () => {
    // the second way into the same state: `ns` decides who answers, the `ComponentContext` decides
    // whether the answer can become a parent link. Pushing a foreign context into the ancestor
    // makes the two disagree, and no attribute leads here — only writing the signal from outside
    const container = mount('<shae-ent id="gp-nb" token="gp"><shae-ent id="kid-nb" token="child"></shae-ent></shae-ent>');
    await customElements.whenDefined('shae-ent');

    const gp = container.querySelector('#gp-nb');
    const kid = container.querySelector('#kid-nb');

    const {settled, afterwards} = await countRequestsWhile(() => {
      gp.viewComponent$.set(new ViewComponent('gp', {context: ComponentContext.get('ns-nb')}));
    });

    expect(afterwards, 'the requests stop instead of feeding themselves').to.equal(settled);
    // both bounds: an upper one alone is vacuously true for a counter that never counts, and the
    // filter in `countRequestsWhile` is one changed `detail` shape away from being exactly that
    expect(settled, 'and the whole exchange is a handful of events').to.be.within(1, 2);
    expect(kid.entParentNode?.id, 'the binding stands where it was').to.equal('gp-nb');
    expect(kid.viewComponent.parent, 'and the entity has no parent to show for it').to.be.undefined;
  });
});

describe('namespace change and properties', () => {
  it('a shae-prop value arrives in the new namespace', async () => {
    const container = mount(
      '<shae-ent id="p-nc1" ns="ns-nc1a" token="probe"><shae-prop name="x" value="7" type="number"></shae-prop></shae-ent>',
    );
    await customElements.whenDefined('shae-prop');

    const p = container.querySelector('#p-nc1');

    ComponentContext.get('ns-nc1a').buildChangeTrails();

    p.ns = 'ns-nc1b';
    await nextTask();

    const trail = ComponentContext.get('ns-nc1b').buildChangeTrails();

    expect(
      trail.find((entry) => entry.uuid === p.uuid)?.properties,
      'the entity is created in the new namespace with the value it had',
    ).to.deep.equal([['x', 7]]);
  });

  it('the environment of the namespace it leaves is told to sync', async () => {
    // the entity has no children on purpose: everything else about the change reaches the old
    // environment through one of them. Without a sync the destruction sits in the old context
    // until something unrelated happens to flush it
    const container = mount(
      '<shae-worker id="wa-nc2" local auto-sync="off" ns="ns-nc2a"></shae-worker>' +
        '<shae-worker id="wb-nc2" local auto-sync="off" ns="ns-nc2b"></shae-worker>' +
        '<shae-ent id="p-nc2" ns="ns-nc2a" token="probe"></shae-ent>',
    );
    await Promise.all(['shae-worker', 'shae-ent'].map((name) => customElements.whenDefined(name)));
    await nextTask();

    const synced = [];
    for (const [name, id] of [
      ['a', '#wa-nc2'],
      ['b', '#wb-nc2'],
    ]) {
      const env = container.querySelector(id).shadowEnv;
      const sync = env.sync.bind(env);
      env.sync = (...args) => {
        synced.push(name);
        return sync(...args);
      };
    }

    container.querySelector('#p-nc2').ns = 'ns-nc2b';
    await nextTask();

    // the order is not asserted: the collecting microtask works through both namespaces in one go
    expect(Array.from(new Set(synced)), 'both environments are told, the one it leaves included').to.have.same.members([
      'a',
      'b',
    ]);
  });
});
