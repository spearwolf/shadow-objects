import {expect} from '@esm-bundle/chai';
import {on} from '@spearwolf/eventize';
import {ComponentChangeType, ComponentContext, ShaeEntElement} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import {unmountAll} from '../src/mount.js';
import {withSwallowedErrors} from '../src/withSwallowedErrors.js';

/**
 * An element that becomes an entity while the tree around it already stands asks its peers to
 * look for their parent once more. This spec pins what that round costs and what it delivers:
 * everything arriving in one task shares a single round, and no entity ends up on the wrong
 * parent because of it.
 *
 * The cost is asserted as an exact message count on the channel the round travels, never as a
 * duration — the difference between one round and one round per entity is a whole number.
 *
 * Every case builds its markup with `innerHTML`/`insertAdjacentHTML` into a container that is
 * already in the document. `mount()` from `../src/mount.js` parses into a detached `<div>`, which
 * leaves the elements reporting that they were not upgraded in place — the peer round does not
 * run for them at all.
 *
 * A custom element name can be defined only once per document, so the cases that register one
 * bring their own.
 */

/** One task is long enough for the collected round and for slot assignment to be reported. */
const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

const containers = [];
const counters = [];

function connectedContainer() {
  const container = document.createElement('div');
  document.body.append(container);
  containers.push(container);
  return container;
}

/**
 * Count the messages a context delivers, by type and receiver.
 *
 * The counter sits on the instance and shadows the method of the prototype, so it is in place
 * before the first element upgrades — a listener on a `ViewComponent` could only be attached
 * once that component exists, which is after the round its own arrival starts.
 */
function countMessages(ctx) {
  const counts = new Map();
  const original = Object.getPrototypeOf(ctx).dispatchMessage;

  ctx.dispatchMessage = function countingDispatchMessage(uuid, type, data, traverseChildren) {
    let perType = counts.get(type);
    if (perType === undefined) {
      perType = new Map();
      counts.set(type, perType);
    }
    perType.set(uuid, (perType.get(uuid) ?? 0) + 1);
    return original.call(this, uuid, type, data, traverseChildren);
  };

  const counter = {
    of: (type, uuid) => counts.get(type)?.get(uuid) ?? 0,
    total: (type) => Array.from(counts.get(type)?.values() ?? [], (n) => n).reduce((a, b) => a + b, 0),
    restore: () => {
      delete ctx.dispatchMessage;
    },
  };

  counters.push(counter);
  return counter;
}

afterEach(() => {
  for (const counter of counters) counter.restore();
  counters.length = 0;
  for (const container of containers) container.remove();
  containers.length = 0;
  unmountAll();
});

describe('shae-ent and the peer re-request round', () => {
  it('every entity arriving in the same task shares one round over the roots', async () => {
    const ns = 'peer-round-roots';
    const messages = countMessages(ComponentContext.get(ns));

    const container = connectedContainer();
    container.innerHTML = `<shae-ent ns="${ns}" token="root"></shae-ent>`.repeat(5);

    await nextTask();

    const uuids = Array.from(container.children, (el) => el.viewComponent.uuid);
    expect(uuids, 'all five elements became entities').to.have.lengthOf(5);

    expect(
      uuids.map((uuid) => messages.of(ComponentContext.ReRequestParentRoots, uuid)),
      'each root is asked once, however many entities arrived alongside it',
    ).to.deep.equal([1, 1, 1, 1, 1]);

    expect(messages.total(ComponentContext.ReRequestParentRoots), 'five roots cost five messages').to.equal(5);
  });

  it('every entity arriving in the same task shares one round over its siblings', async () => {
    const ns = 'peer-round-siblings';
    const messages = countMessages(ComponentContext.get(ns));

    const container = connectedContainer();
    container.innerHTML =
      `<shae-ent id="pr2-parent" ns="${ns}" token="parent">` +
      `<shae-ent ns="${ns}" token="child"></shae-ent>`.repeat(5) +
      '</shae-ent>';

    await nextTask();

    const parent = container.querySelector('#pr2-parent');
    const uuids = Array.from(parent.children, (el) => el.viewComponent.uuid);
    expect(uuids, 'all five children became entities').to.have.lengthOf(5);

    expect(
      uuids.map((uuid) => messages.of(ComponentContext.ReRequestParent, uuid)),
      'each sibling is asked once, however many entities arrived alongside it',
    ).to.deep.equal([1, 1, 1, 1, 1]);

    expect(messages.total(ComponentContext.ReRequestParent), 'five siblings cost five messages').to.equal(5);
  });

  it('an element that becomes an entity late takes the entity below it', async () => {
    const ns = 'peer-round-late';
    const container = connectedContainer();
    container.innerHTML =
      `<shae-ent id="pr3-gp" ns="${ns}" token="gp">` +
      `<pr3-mid id="pr3-mid" ns="${ns}" token="mid">` +
      `<shae-ent id="pr3-kid" ns="${ns}" token="kid"></shae-ent>` +
      '</pr3-mid>' +
      '</shae-ent>';

    await nextTask();

    const mid = container.querySelector('#pr3-mid');
    const kid = container.querySelector('#pr3-kid');

    expect(kid.entParentNode?.id, 'while nothing sits in between, the kid binds to the outer entity').to.equal('pr3-gp');

    customElements.define('pr3-mid', class extends ShaeEntElement {});

    await nextTask();

    expect(kid.entParentNode?.id).to.equal('pr3-mid');
    expect(kid.viewComponent.parent).to.equal(mid.viewComponent);
    expect(mid.viewComponent.parent, 'the new entity keeps its own parent').to.equal(
      container.querySelector('#pr3-gp').viewComponent,
    );
  });

  it('an entity arriving during a round gets a round of its own', async () => {
    const ns = 'peer-round-latecomer';
    const container = connectedContainer();
    container.innerHTML =
      `<shae-ent id="pr4-gp" ns="${ns}" token="gp">` +
      `<pr4-mid id="pr4-mid" ns="${ns}" token="mid">` +
      `<shae-ent id="pr4-kid" ns="${ns}" token="kid"></shae-ent>` +
      '</pr4-mid>' +
      '</shae-ent>';

    await nextTask();

    const gp = container.querySelector('#pr4-gp');
    const mid = container.querySelector('#pr4-mid');
    const kid = container.querySelector('#pr4-kid');

    expect(kid.entParentNode?.id).to.equal('pr4-gp');

    // the definition happens while the round is being delivered: the entity it creates arrives
    // too late for the round that is running and has to be answered by the next one
    let defined = false;
    on(kid.viewComponent, ComponentContext.ReRequestParent, () => {
      if (defined) return;
      defined = true;
      customElements.define('pr4-mid', class extends ShaeEntElement {});
    });

    gp.insertAdjacentHTML('beforeend', `<shae-ent id="pr4-trigger" ns="${ns}" token="trigger"></shae-ent>`);

    await nextTask();

    expect(defined, 'the round reached the listener').to.be.true;
    expect(mid.entParentNode?.id, 'the entity that arrived during the round found its own parent').to.equal('pr4-gp');
    expect(kid.entParentNode?.id, 'and the entity below it was asked again').to.equal('pr4-mid');
    expect(kid.viewComponent.parent).to.equal(mid.viewComponent);
  });

  it('an entity that leaves the tree again in the same task starts no round', async () => {
    const ns = 'peer-round-sender-leaves';
    const container = connectedContainer();
    container.innerHTML = `<shae-ent id="pr5-gp" ns="${ns}" token="gp"><shae-ent id="pr5-kid" ns="${ns}" token="kid"></shae-ent></shae-ent>`;

    await nextTask();

    const gp = container.querySelector('#pr5-gp');
    const kid = container.querySelector('#pr5-kid');
    const ctx = ComponentContext.get(ns);

    const errors = withSwallowedErrors(() => {
      gp.insertAdjacentHTML('beforeend', `<shae-ent id="pr5-mid" ns="${ns}" token="mid"></shae-ent>`);
      const mid = container.querySelector('#pr5-mid');
      mid.append(kid);
      gp.append(kid);
      mid.remove();
    });

    await nextTask();

    expect(errors, 'nothing is reported to the page').to.deep.equal([]);
    expect(kid.entParentNode?.id, 'the entity stands where it stood').to.equal('pr5-gp');
    expect(kid.viewComponent.parent).to.equal(gp.viewComponent);
    expect(
      ctx.getChildren(gp.viewComponent).map((vc) => vc.uuid),
      'the entity that came and went holds no place in the tree',
    ).to.deep.equal([kid.viewComponent.uuid]);
  });

  it('an entity that comes and goes in the same task asks nobody at all', async () => {
    // a round is a broadcast, and the entity that would have started this one is gone. Asking
    // anyway would make every root of the namespace drop its parent and look for it again — work
    // for an ancestor that no longer exists
    const ns = 'peer-round-departed-sender';
    const container = connectedContainer();
    container.innerHTML = [1, 2, 3].map((n) => `<shae-ent id="pr9-r${n}" ns="${ns}" token="root"></shae-ent>`).join('');

    await nextTask();

    const messages = countMessages(ComponentContext.get(ns));

    const errors = withSwallowedErrors(() => {
      container.insertAdjacentHTML('beforeend', `<shae-ent id="pr9-gone" ns="${ns}" token="gone"></shae-ent>`);
      container.querySelector('#pr9-gone').remove();
    });

    await nextTask();

    expect(errors, 'nothing is reported to the page').to.deep.equal([]);
    expect(messages.total(ComponentContext.ReRequestParentRoots), 'the roots are left alone').to.equal(0);
    expect(messages.total(ComponentContext.ReRequestParent), 'and so is every other candidate set').to.equal(0);
  });

  it('a receiver told about an ancestor that has left the tree asks anyway', async () => {
    const ns = 'peer-round-departed-ancestor';
    const container = connectedContainer();
    container.innerHTML =
      `<shae-ent id="pr10-gp" ns="${ns}" token="gp">` +
      `<shae-ent id="pr10-peer" ns="${ns}" token="peer"></shae-ent>` +
      `<shae-ent id="pr10-gone" ns="${ns}" token="gone"></shae-ent>` +
      `<div id="pr10-host"><shae-ent id="pr10-kid" ns="${ns}" token="kid"></shae-ent></div>` +
      '</shae-ent>';

    await nextTask();

    const peer = container.querySelector('#pr10-peer');
    const gone = container.querySelector('#pr10-gone');
    const host = container.querySelector('#pr10-host');
    const kid = container.querySelector('#pr10-kid');

    expect(kid.entParentNode?.id, 'nothing sits between the kid and the outer entity yet').to.equal('pr10-gp');

    gone.remove();

    // an entity does come to sit between them: a slot assignment is in place the moment the shadow
    // root holds a slot, while the browser reports it a task later — so nothing has told the kid
    host.attachShadow({mode: 'open'}).innerHTML = `<shae-ent id="pr10-inner" ns="${ns}" token="inner"><slot></slot></shae-ent>`;

    // the round names an ancestor that is out of the tree by the time it runs. An ascent against a
    // detached element answers "not below" for every receiver alike, so a round that filtered on
    // that answer would leave the kid on the parent it no longer belongs to
    ComponentContext.get(ns).dispatchReRequestParentSiblings(peer.viewComponent, {newAncestor: gone});

    expect(kid.entParentNode?.id, 'the kid asked, and found the entity that stands above it now').to.equal('pr10-inner');
  });

  it('a receiver that leaves the tree before the round costs nobody their parent', async () => {
    const ns = 'peer-round-receiver-leaves';
    const container = connectedContainer();
    container.innerHTML = `<shae-ent id="pr6-parent" ns="${ns}" token="parent"></shae-ent>`;

    await nextTask();

    const parent = container.querySelector('#pr6-parent');

    const errors = withSwallowedErrors(() => {
      parent.insertAdjacentHTML(
        'beforeend',
        [1, 2, 3, 4].map((n) => `<shae-ent id="pr6-k${n}" ns="${ns}" token="kid"></shae-ent>`).join(''),
      );
      container.querySelector('#pr6-k2').remove();
      container.querySelector('#pr6-k4').remove();
    });

    await nextTask();

    expect(errors, 'nothing is reported to the page').to.deep.equal([]);

    const staying = [container.querySelector('#pr6-k1'), container.querySelector('#pr6-k3')];
    expect(
      staying.map((el) => el.entParentNode?.id),
      'the entities that stayed are bound to their parent',
    ).to.deep.equal(['pr6-parent', 'pr6-parent']);
    expect(staying.map((el) => el.viewComponent.parent)).to.deep.equal([parent.viewComponent, parent.viewComponent]);
  });

  it('the change trail built right after a late definition carries the new parent', async () => {
    const ns = 'peer-round-trail';
    const container = connectedContainer();
    container.innerHTML =
      `<shae-ent id="pr7-gp" ns="${ns}" token="gp">` +
      `<pr7-mid id="pr7-mid" ns="${ns}" token="mid">` +
      `<shae-ent id="pr7-kid" ns="${ns}" token="kid"></shae-ent>` +
      '</pr7-mid>' +
      '</shae-ent>';

    await nextTask();

    const ctx = ComponentContext.get(ns);
    ctx.buildChangeTrails();

    const mid = container.querySelector('#pr7-mid');
    const kid = container.querySelector('#pr7-kid');

    customElements.define('pr7-mid', class extends ShaeEntElement {});

    // no await: the trail is built in the same task the definition ran in
    const trail = ctx.buildChangeTrails();

    expect(
      trail.filter((entry) => entry.type === ComponentChangeType.SetParent),
      'the entity below the new element arrives under it in this very trail',
    ).to.deep.equal([{type: ComponentChangeType.SetParent, uuid: kid.viewComponent.uuid, parentUuid: mid.viewComponent.uuid}]);
  });

  it('a round whose receiver throws costs the rest of that round and no other round', async () => {
    const ns = 'peer-round-throwing-receiver';
    const container = connectedContainer();
    container.innerHTML =
      `<shae-ent id="pr8-a" ns="${ns}" token="a"><shae-ent id="pr8-a1" ns="${ns}" token="kid"></shae-ent></shae-ent>` +
      `<shae-ent id="pr8-b" ns="${ns}" token="b"><shae-ent id="pr8-b1" ns="${ns}" token="kid"></shae-ent></shae-ent>`;

    await nextTask();

    const a = container.querySelector('#pr8-a');
    const b = container.querySelector('#pr8-b');
    const a1 = container.querySelector('#pr8-a1');
    const b1 = container.querySelector('#pr8-b1');

    const messages = countMessages(ComponentContext.get(ns));

    // a message goes out over eventize, which delivers synchronously and hands what a listener
    // throws straight back to the round that is being delivered
    on(a1.viewComponent, ComponentContext.ReRequestParent, () => {
      throw new Error('a receiver of the first round failed');
    });

    const reports = [];
    const consoleError = console.error;
    console.error = (...args) => reports.push(args);

    try {
      // two senders under two different parents, so the task collects two rounds: one over the
      // children of a, one over the children of b
      a.insertAdjacentHTML('beforeend', `<shae-ent id="pr8-a2" ns="${ns}" token="late"></shae-ent>`);
      b.insertAdjacentHTML('beforeend', `<shae-ent id="pr8-b2" ns="${ns}" token="late"></shae-ent>`);

      await nextTask();
    } finally {
      console.error = consoleError;
    }

    const a2 = container.querySelector('#pr8-a2');
    const b2 = container.querySelector('#pr8-b2');

    expect(messages.of(ComponentContext.ReRequestParent, a1.viewComponent.uuid), 'the receiver that throws was asked').to.equal(
      1,
    );
    expect(
      messages.of(ComponentContext.ReRequestParent, a2.viewComponent.uuid),
      'and what its failure costs is the rest of its own round',
    ).to.equal(0);

    expect(
      [b1, b2].map((el) => messages.of(ComponentContext.ReRequestParent, el.viewComponent.uuid)),
      'the round waiting behind it is delivered in full',
    ).to.deep.equal([1, 1]);

    expect(reports.length, 'the failure is reported once').to.equal(1);
    expect(reports[0].join(' '), 'and the report names the candidate set it belonged to').to.contain(a.viewComponent.uuid);
  });
});
