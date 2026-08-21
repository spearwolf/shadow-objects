import {expect} from '@esm-bundle/chai';
import {ComponentContext, RequestEntParentEventName, ViewComponent} from '@spearwolf/shadow-objects';
import '@spearwolf/shadow-objects/shae-ent.js';
import {mount, unmountAll} from '../src/mount.js';

/**
 * A `<slot>` decides what sits below which entity: everything it projects hangs on the closest
 * entity above the slot, not above the projected node. Moving the slot itself therefore moves a
 * binding without touching either side of it.
 *
 * It runs in real Chromium, because every mechanism involved is one happy-dom does not reproduce:
 * slot assignment across a shadow boundary, the flattened tree that follows from it, and the
 * moment `slotchange` reports a new assignment — one microtask checkpoint after the mutation, and
 * at the new location only.
 *
 * Assertions go through `entParentNode?.id` rather than element identity: in the red state the
 * message then names the two ids instead of two serialized elements.
 */

/**
 * `slotchange` arrives at a microtask checkpoint, and the parent request it sets off is answered
 * in the same turn — one task later everything has settled.
 */
const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Counts the parent requests of one specific entity while `action` runs and for one turn after.
 *
 * A `<shae-prop>` sends the same request under the same event name, and so does every other
 * entity in the document, so the requester decides what is counted — this file asks what reaches
 * the bystander, not how much traffic there is.
 */
const countRequestsOf = async (element, action) => {
  let requests = 0;
  const listener = (event) => {
    if (event.detail?.requester === element) {
      requests += 1;
    }
  };
  document.addEventListener(RequestEntParentEventName, listener, {capture: true});
  try {
    await action();
    await nextTask();
    return requests;
  } finally {
    document.removeEventListener(RequestEntParentEventName, listener, {capture: true});
  }
};

afterEach(() => {
  unmountAll();
});

describe('shae-ent and a slot that moves', () => {
  it('an entity projected through a slot follows the slot into another entity', async () => {
    const container = mount(
      '<shae-ent id="sm-outer" token="outer">' +
        '<div id="sm-div"><shae-ent id="sm-child" token="child"></shae-ent></div>' +
        '</shae-ent>',
    );
    await customElements.whenDefined('shae-ent');

    const shadowRoot = container.querySelector('#sm-div').attachShadow({mode: 'open'});
    shadowRoot.innerHTML =
      '<shae-ent id="sm-from" token="from"><slot id="sm-slot"></slot></shae-ent><shae-ent id="sm-to" token="to"></shae-ent>';
    await nextTask();

    const child = container.querySelector('#sm-child');
    const to = shadowRoot.getElementById('sm-to');

    expect(child.entParentNode?.id, 'the slot projects the entity into the one holding it').to.equal('sm-from');

    to.appendChild(shadowRoot.getElementById('sm-slot'));
    await nextTask();

    expect(child.entParentNode?.id, 'the slot takes its projection along').to.equal('sm-to');
    expect(child.viewComponent.parent, 'and the entity tree says the same').to.equal(to.viewComponent);
  });

  // The destination has no entity of its own, so nothing at the new location can report the move:
  // whatever notices it has to be the entity that gave the slot away.
  it('follows the slot into a part of the shadow root with no entity above it', async () => {
    const container = mount(
      '<shae-ent id="sm-outer" token="outer">' +
        '<div id="sm-div"><shae-ent id="sm-child" token="child"></shae-ent></div>' +
        '</shae-ent>',
    );
    await customElements.whenDefined('shae-ent');

    const shadowRoot = container.querySelector('#sm-div').attachShadow({mode: 'open'});
    shadowRoot.innerHTML = '<shae-ent id="sm-from" token="from"><slot id="sm-slot"></slot></shae-ent><div id="sm-plain"></div>';
    await nextTask();

    const child = container.querySelector('#sm-child');
    const outer = container.querySelector('#sm-outer');

    expect(child.entParentNode?.id, 'the slot projects the entity into the one holding it').to.equal('sm-from');

    shadowRoot.getElementById('sm-plain').appendChild(shadowRoot.getElementById('sm-slot'));
    await nextTask();

    // the ascent runs from the child over the slot into the shadow root, past the host `#sm-div`,
    // and arrives at the entity around it
    expect(child.entParentNode?.id, 'no entity stands above the slot any more').to.equal('sm-outer');
    expect(child.viewComponent.parent, 'and the entity tree says the same').to.equal(outer.viewComponent);
  });

  // The same window seen from the other end: between `slot.remove()` and a re-insertion the
  // projection is simply gone, and the projected node sits where it stands in the light DOM.
  it('lets go when the slot leaves the shadow root altogether', async () => {
    const container = mount(
      '<shae-ent id="sm-outer" token="outer">' +
        '<div id="sm-div"><shae-ent id="sm-child" token="child"></shae-ent></div>' +
        '</shae-ent>',
    );
    await customElements.whenDefined('shae-ent');

    const shadowRoot = container.querySelector('#sm-div').attachShadow({mode: 'open'});
    shadowRoot.innerHTML = '<shae-ent id="sm-from" token="from"><slot id="sm-slot"></slot></shae-ent><div id="sm-plain"></div>';
    await nextTask();

    const child = container.querySelector('#sm-child');
    const outer = container.querySelector('#sm-outer');

    expect(child.entParentNode?.id, 'the slot projects the entity into the one holding it').to.equal('sm-from');

    shadowRoot.getElementById('sm-slot').remove();
    await nextTask();

    expect(child.entParentNode?.id, 'unassigned, the child hangs where its own ancestors are').to.equal('sm-outer');
    expect(child.viewComponent.parent, 'and the entity tree says the same').to.equal(outer.viewComponent);
  });

  // A re-request round asks, it does not decide. What an entity finds at the new place is its own
  // answer, and the absence of one is an answer too — while every binding the round did not
  // concern stays exactly where it was.
  it('drops the parent binding when nothing in its namespace answers at the new place', async () => {
    const container = mount(
      '<shae-ent id="v19-outer" token="outer">' +
        '<div id="v19-div"><shae-ent id="v19-child" ns="x" token="child"></shae-ent></div>' +
        '</shae-ent>' +
        '<shae-ent id="v19-keep" ns="x" token="keep">' +
        '<shae-ent id="v19-kid" ns="x" token="kid"></shae-ent>' +
        '<shae-ent id="v19-kid2" ns="x" token="kid2"></shae-ent>' +
        '</shae-ent>',
    );
    await customElements.whenDefined('shae-ent');

    const shadowRoot = container.querySelector('#v19-div').attachShadow({mode: 'open'});
    shadowRoot.innerHTML =
      '<shae-ent id="v19-from" ns="x" token="from"><slot id="v19-slot"></slot></shae-ent>' +
      '<shae-ent id="v19-to" token="to"></shae-ent>';
    await nextTask();

    const child = container.querySelector('#v19-child');
    const keep = container.querySelector('#v19-keep');
    const kid = container.querySelector('#v19-kid');
    const kid2 = container.querySelector('#v19-kid2');
    const ctx = ComponentContext.get('x');
    const childrenOfKeep = () => ctx.getChildren(keep.viewComponent).map((vc) => vc.uuid);

    // a component with no element behind it, hung between the two element-backed ones: it hears
    // the round like everyone else and answers nothing, which is what makes the order readable.
    // A round that released every binding before searching would take the two entities out and
    // append them behind this one, and the array would say so
    const plain = new ViewComponent('plain', {parent: keep.viewComponent, context: ctx});

    expect(child.entParentNode?.id, 'the slot projects it into an entity of its own namespace').to.equal('v19-from');
    expect(kid.entParentNode?.id, 'the bystander is bound to its own parent').to.equal('v19-keep');
    expect(childrenOfKeep(), 'the bystanders stand in the order they were built in').to.deep.equal([
      kid.uuid,
      kid2.uuid,
      plain.uuid,
    ]);

    shadowRoot.getElementById('v19-to').appendChild(shadowRoot.getElementById('v19-slot'));
    await nextTask();

    // `v19-to` carries the default namespace and is therefore no candidate: above the slot there
    // is nobody left in `x`, and a binding nobody answers for is a root of its context
    expect(child.entParentNode, 'nothing in its namespace answers, so it has no parent').to.be.undefined;
    expect(child.viewComponent.parent, 'and the entity tree says the same').to.be.undefined;

    // not just the binding: the position in the parent's children as well. A round that released
    // first and searched afterwards would hand the same answer back and still take every bystander
    // out of its parent's children to append it again
    expect(kid.entParentNode?.id, 'the round leaves a correctly bound bystander alone').to.equal('v19-keep');
    expect(childrenOfKeep(), 'and leaves it standing where it stood').to.deep.equal([kid.uuid, kid2.uuid, plain.uuid]);

    // no element carries this one out of the context, and the context outlives the case
    plain.destroy();
  });

  // An entity takes up the slots below it when it enters the tree, and that is what carries
  // this case: the assignment inside a shadow root does not change while its host leaves the
  // document and comes back, so nothing reports and there is nothing to hear. The entity has
  // to look for itself, and once it holds the slot again it hears the move out of every
  // entity — the one move that no receiving side is there to announce.
  it('follows a slot moving out of every entity after its shadow host left the document and came back', async () => {
    const container = mount(
      '<shae-ent id="th-outer" token="outer">' +
        '<div id="th-div"><shae-ent id="th-child" token="child"></shae-ent></div>' +
        '</shae-ent>',
    );
    await customElements.whenDefined('shae-ent');

    const div = container.querySelector('#th-div');
    const shadowRoot = div.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = '<shae-ent id="th-from" token="from"><slot id="th-slot"></slot></shae-ent><div id="th-plain"></div>';
    await nextTask();

    expect(
      container.querySelector('#th-child').entParentNode?.id,
      'the slot projects the entity into the one holding it',
    ).to.equal('th-from');

    const outer = container.querySelector('#th-outer');
    div.remove();
    await nextTask();
    outer.appendChild(div);
    await nextTask();

    const child = container.querySelector('#th-child');
    expect(child.entParentNode?.id, 'the round trip leaves the binding as it was').to.equal('th-from');

    shadowRoot.getElementById('th-plain').appendChild(shadowRoot.getElementById('th-slot'));
    await nextTask();

    // the ascent runs from the child over the slot into the shadow root, past the host `#th-div`,
    // and arrives at the entity around it
    expect(child.entParentNode?.id, 'and the move that follows is seen').to.equal('th-outer');
    expect(child.viewComponent.parent, 'and the entity tree says the same').to.equal(outer.viewComponent);

    // inserted next to what is already there, never through `shadowRoot.innerHTML`: writing that
    // property rebuilds the whole shadow root, and the case would go on to measure fresh elements
    // instead of the ones that came back from the round trip
    shadowRoot.getElementById('th-plain').insertAdjacentHTML('afterend', '<shae-ent id="th-to" token="to"></shae-ent>');
    await nextTask();

    shadowRoot.getElementById('th-to').appendChild(shadowRoot.getElementById('th-slot'));
    await nextTask();

    expect(child.entParentNode?.id, 'while a move into another entity carries as always').to.equal('th-to');
  });

  // Taking the slots up again is a local matter: the register and the listeners are written, and
  // nothing is broadcast. The register can only go stale while the entities holding it are out of
  // the tree, and they are only out of it together with the shadow root of their host — so
  // everything the slot projects is out of the tree as well and asks for its parent on the way
  // back in anyway.
  it('sets off no re-request round when a shadow host comes back into the document', async () => {
    const container = mount(
      '<shae-ent id="q-outer" token="outer">' +
        '<div id="q-div"><shae-ent id="q-child" token="child"></shae-ent></div>' +
        '</shae-ent>' +
        '<shae-ent id="q-parent" token="bystander"><shae-ent id="q-kid" token="bystander-kid"></shae-ent></shae-ent>',
    );
    await customElements.whenDefined('shae-ent');

    const div = container.querySelector('#q-div');
    const shadowRoot = div.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = '<shae-ent id="q-from" token="from"><slot id="q-slot"></slot></shae-ent>';
    await nextTask();

    const outer = container.querySelector('#q-outer');
    const kid = container.querySelector('#q-kid');

    expect(
      container.querySelector('#q-child').entParentNode?.id,
      'the slot projects the entity into the one holding it',
    ).to.equal('q-from');
    expect(kid.entParentNode?.id, 'the bystander is bound and has no reason to ask again').to.equal('q-parent');

    const rounds = await countRequestsOf(kid, async () => {
      div.remove();
      await nextTask();
      outer.appendChild(div);
    });

    expect(rounds, 'taking the slots below it back up is a matter between the entity and the register').to.equal(0);
  });

  // The register is what decides whether a later `slotchange` is a move or just new content, so
  // the entity that takes a slot up on the way in has to be the one the register names.
  it('claims a slot that changed hands while its shadow host was out of the document', async () => {
    const container = mount(
      '<shae-ent id="r-outer" token="outer">' +
        '<div id="r-div"><shae-ent id="r-child" token="child"></shae-ent></div>' +
        '</shae-ent>' +
        '<shae-ent id="r-parent" token="bystander"><shae-ent id="r-kid" token="bystander-kid"></shae-ent></shae-ent>',
    );
    await customElements.whenDefined('shae-ent');

    const div = container.querySelector('#r-div');
    const shadowRoot = div.attachShadow({mode: 'open'});
    shadowRoot.innerHTML =
      '<shae-ent id="r-from" token="from"><slot id="r-slot"></slot></shae-ent><shae-ent id="r-to" token="to"></shae-ent>';
    await nextTask();

    const outer = container.querySelector('#r-outer');
    const kid = container.querySelector('#r-kid');
    const child = container.querySelector('#r-child');

    expect(child.entParentNode?.id, 'the slot projects the entity into the one holding it').to.equal('r-from');

    div.remove();
    await nextTask();

    // the slot changes hands with nobody in the tree to hear it, and the turn ends before the host
    // goes back in: `slotchange` reaches an entity that has taken its listeners off, so the report
    // is spent by the time anyone could act on it. What carries the change is the assignment
    // itself, which is computed at the mutation
    shadowRoot.getElementById('r-to').appendChild(shadowRoot.getElementById('r-slot'));
    await nextTask();

    outer.appendChild(div);
    await nextTask();

    expect(child.entParentNode?.id, 'the projection arrives under the entity the slot now sits in').to.equal('r-to');

    // the entity that took the slot up on the way in is the one the register names, so content
    // arriving in the slot afterwards moves no binding and asks nobody
    const rounds = await countRequestsOf(kid, async () => {
      container.querySelector('#r-div').appendChild(document.createElement('span'));
    });

    expect(rounds, 'a slot whose entity has not changed asks nobody').to.equal(0);
  });

  // The gate in front of the re-request round, and the only assertion that notices its absence:
  // the round reaches every entity in every namespace, so neither a slot reporting its first
  // assignment nor one reporting changed content may set one off, and a slot that changed the
  // entity above it must. Each half of the gate has its own count here — a gate that opens on the
  // first report is green in every other case in the suite, and only the number sees it.
  it('sets off a re-request round when the entity above the slot changes, and only then', async () => {
    const container = mount(
      '<shae-ent id="by-outer" token="outer">' +
        '<div id="by-div"><span id="by-light">a</span></div>' +
        '</shae-ent>' +
        '<shae-ent id="by-parent" token="bystander"><shae-ent id="by-kid" token="bystander-kid"></shae-ent></shae-ent>',
    );
    await customElements.whenDefined('shae-ent');

    const kid = container.querySelector('#by-kid');
    expect(kid.entParentNode?.id, 'the bystander is bound and has no reason to ask again').to.equal('by-parent');

    let shadowRoot;
    const onSlotBirth = await countRequestsOf(kid, async () => {
      shadowRoot = container.querySelector('#by-div').attachShadow({mode: 'open'});
      shadowRoot.innerHTML =
        '<shae-ent id="by-from" token="from"><slot id="by-slot"></slot></shae-ent><shae-ent id="by-to" token="to"></shae-ent>';
    });

    expect(onSlotBirth, 'a slot reporting its first assignment has taken nothing from anyone').to.equal(0);

    const onContentChange = await countRequestsOf(kid, async () => {
      container.querySelector('#by-div').appendChild(document.createElement('span'));
    });

    expect(onContentChange, 'a slot that gets new content stays where it is, so nobody has to ask').to.equal(0);

    const onSlotMove = await countRequestsOf(kid, async () => {
      shadowRoot.getElementById('by-to').appendChild(shadowRoot.getElementById('by-slot'));
    });

    // exactly one: both sides of the move see the same `slotchange` — the entity losing the slot
    // as a listener on the slot itself, the one gaining it while the event bubbles — and the round
    // they would each start is the same round over the whole document
    expect(onSlotMove, 'a slot that changes the entity above it can move any binding in the document').to.equal(1);
  });
});