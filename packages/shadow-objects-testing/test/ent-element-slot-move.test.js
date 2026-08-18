import {expect} from '@esm-bundle/chai';
import {RequestEntParentEventName} from '@spearwolf/shadow-objects';
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

    expect(onSlotMove, 'a slot that changes the entity above it can move any binding in the document').to.be.at.least(1);
  });
});