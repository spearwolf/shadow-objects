import {expect} from '@esm-bundle/chai';
import {ComponentChangeType, ComponentContext, ShadowEnv, ShaeEntElement} from '@spearwolf/shadow-objects';
import {ConsoleLogger} from '@spearwolf/shadow-objects/ConsoleLogger.js';
import '@spearwolf/shadow-objects/shae-ent.js';
import '@spearwolf/shadow-objects/shae-prop.js';
import '@spearwolf/shadow-objects/shae-worker.js';
import sinon from 'sinon';
import {findElementsById} from '../src/findElementsById.js';
import {mount, unmountAll} from '../src/mount.js';
import {render} from '../src/render.js';

/**
 * A `<shae-prop>` asks for the entity above it and takes the first one that answers. Only a
 * `<shae-ent>` answers such a request — a `<shae-prop>` in between passes it on, and the flag
 * `isShaeEntElement` keeps meaning "this is a `<shae-ent>`" and nothing else.
 */
describe('shae-prop host lookup', () => {
  beforeEach(async () => {
    render(`
      <shae-ent id="host" token="host">
        <shae-prop id="outer" name="outer" value="1">
          <shae-prop id="inner" name="inner" value="2"></shae-prop>
        </shae-prop>
      </shae-ent>
    `);

    await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));
  });

  afterEach(() => {
    ComponentContext.get().clear();
  });

  it('does not identify itself as an entity element', () => {
    const [outer] = findElementsById('outer');

    expect(outer.isShaePropElement).to.be.true;
    expect(outer.isShaeEntElement).to.be.undefined;
  });

  it('has no namespace of its own', () => {
    const [outer] = findElementsById('outer');

    expect(outer.constructor.observedAttributes, 'a namespace decides nothing for a property').to.not.include('ns');
    expect(outer.ns, 'and the element carries none').to.be.undefined;
  });

  // Mutation that turns this red: give `ShaePropElement` a `shaeRequestEntParent` listener that
  // calls `answer(this)` — the inner prop then binds to the outer one instead of to the entity.
  it('walks past a nested shae-prop to the real host entity', () => {
    const [host, outer, inner] = findElementsById('host', 'outer', 'inner');

    expect(outer.entNode).to.equal(host);
    expect(inner.entNode, 'the inner prop must not mistake the outer prop for its host').to.equal(host);
  });
});

/**
 * The host of a `<shae-prop>` is the closest entity above it in the flattened tree — the tree the
 * user sees, with shadow roots opened up and slotted content sitting where it is projected to.
 *
 * These cases run in real Chromium because every one of them stands on a mechanism happy-dom does
 * not reproduce: shadow roots, slot assignment, and closed boundaries that hide their content from
 * every node reference the outside holds.
 *
 * Assertions go through `entNode?.id`, never through element identity: in the red state the
 * message then names two ids instead of two serialized elements.
 */

/**
 * The element decides one microtask after `disconnectedCallback` whether it really left the tree,
 * and the environments sync on a microtask of their own. One turn of the task queue covers both.
 */
const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

/** The property list of the change-properties entry for `uuid`, or `undefined` if there is none. */
const propsOf = (trail, uuid) =>
  trail.find((entry) => entry.type === ComponentChangeType.ChangeProperties && entry.uuid === uuid)?.properties;

describe('shae-prop host lookup across shadow boundaries', () => {
  afterEach(() => {
    unmountAll();
  });

  it('binds to the entity around its shadow host', async () => {
    const container = mount('<shae-ent id="sr-host" token="host"><div id="sr-div"></div></shae-ent>');
    await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));

    const shadowRoot = container.querySelector('#sr-div').attachShadow({mode: 'open'});
    shadowRoot.innerHTML = '<shae-prop id="sr-prop" name="inside" value="42"></shae-prop>';

    const prop = shadowRoot.getElementById('sr-prop');

    expect(prop.entNode?.id).to.equal('sr-host');
  });

  it('binds to the entity that holds the slot it is projected into', async () => {
    const container = mount('<shae-ent id="sp-outer" token="outer"><div id="sp-div"></div></shae-ent>');
    await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));

    const div = container.querySelector('#sp-div');
    const shadowRoot = div.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = '<shae-ent id="sp-inner" token="inner"><slot></slot></shae-ent>';

    // the slot stands before the element that gets projected into it: the assignment is then in
    // place the moment the element connects
    div.insertAdjacentHTML('beforeend', '<shae-prop id="sp-prop" name="inside" value="42"></shae-prop>');

    const prop = container.querySelector('#sp-prop');

    expect(prop.entNode?.id).to.equal('sp-inner');
  });

  it('binds across a closed shadow boundary', async () => {
    const container = mount('<shae-ent id="cp-outer" token="outer"><div id="cp-div"></div></shae-ent>');
    await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));

    const div = container.querySelector('#cp-div');
    // the return value of `attachShadow` is the only handle on a closed root — `div.shadowRoot`
    // stays `null` for it, which is the whole point of the mode
    const shadowRoot = div.attachShadow({mode: 'closed'});
    shadowRoot.innerHTML = '<shae-ent id="cp-inner" token="inner"><slot></slot></shae-ent>';

    div.insertAdjacentHTML('beforeend', '<shae-prop id="cp-prop" name="inside" value="42"></shae-prop>');

    const prop = container.querySelector('#cp-prop');

    expect(prop.entNode?.id).to.equal('cp-inner');
  });

  it('lets go of its host when it moves to a place with no entity above it', async () => {
    const container = mount(`
      <shae-ent id="hl-host" ns="ns-p2" token="host">
        <shae-prop id="hl-prop" name="x" value="7" type="number"></shae-prop>
      </shae-ent>
      <div id="hl-elsewhere"></div>
    `);
    await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));

    const ent = container.querySelector('#hl-host');
    const prop = container.querySelector('#hl-prop');
    const ctx = ComponentContext.get('ns-p2');

    // the first trail creates the entity, so the property sits in a `CreateEntities` entry here
    const created = ctx.buildChangeTrails().find((entry) => entry.uuid === ent.uuid);
    expect(created?.properties, 'the property starts out on the entity').to.deep.equal([['x', 7]]);

    container.querySelector('#hl-elsewhere').append(prop);
    await nextTask();

    expect(prop.entNode?.id, 'nothing above it answers, so it has no host').to.be.undefined;
    expect(propsOf(ctx.buildChangeTrails(), ent.uuid), 'and the entity it left loses the property').to.deep.equal([
      ['x', undefined],
    ]);

    prop.value = 42;
    await nextTask();

    expect(ctx.buildChangeTrails(), 'a value written from there reaches nothing at all').to.have.lengthOf(0);
  });

  // A property belongs to the closest entity, whatever namespace that entity is in.
  // Mutation that turns this red: give the host request of `ShaePropElement` an `ns` of its own
  // (`ns: GlobalNS`) — `ns-inner` then skips the request and the outer entity answers instead.
  it('the nearest entity answers, regardless of its namespace', async () => {
    const container = mount(`
      <shae-ent id="ns-outer" token="outer">
        <shae-ent id="ns-inner" ns="ns-p3" token="inner">
          <shae-prop id="ns-prop" name="inside" value="42"></shae-prop>
        </shae-ent>
      </shae-ent>
    `);
    await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));

    const prop = container.querySelector('#ns-prop');

    expect(prop.entNode?.id).to.equal('ns-inner');
  });
});

/**
 * The host of a `<shae-prop>` is not decided once and kept. Every way an element has of becoming
 * the closest entity above a property — a late definition, a shadow root attached afterwards, a
 * slot assignment that changes, a `<slot>` that moves into another entity — moves the binding,
 * and so does every way of ceasing to be one.
 *
 * A definition is global and permanent, so each case here registers a tag name of its own.
 */
describe('shae-prop follows its host entity', () => {
  afterEach(() => {
    unmountAll();
  });

  it('finds a host whose element is defined after it', async () => {
    const container = mount(`
      <late-ent-h id="lh-host" token="host">
        <shae-prop id="lh-prop" name="x" value="1"></shae-prop>
      </late-ent-h>
    `);
    await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));

    const prop = container.querySelector('#lh-prop');

    customElements.define('late-ent-h', class extends ShaeEntElement {});
    await customElements.whenDefined('late-ent-h');
    await nextTask();

    expect(prop.entNode?.id).to.equal('lh-host');
  });

  it('moves to an entity that upgrades between it and its current host', async () => {
    const container = mount(`
      <shae-ent id="mv-gp" token="gp">
        <late-ent-m id="mv-mid" token="mid">
          <shae-prop id="mv-prop" name="x" value="1"></shae-prop>
        </late-ent-m>
      </shae-ent>
    `);
    await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));

    const prop = container.querySelector('#mv-prop');

    // the starting point, not a defect: the closer ancestor is not an entity yet
    expect(prop.entNode?.id, 'it starts at the only entity above it').to.equal('mv-gp');

    customElements.define('late-ent-m', class extends ShaeEntElement {});
    await customElements.whenDefined('late-ent-m');
    await nextTask();

    expect(prop.entNode?.id, 'and moves to the entity that arrived in between').to.equal('mv-mid');
  });

  it('binds to an entity in a shadow root attached after it', async () => {
    const container = mount('<div id="la-div"><shae-prop id="la-prop" name="x" value="1"></shae-prop></div>');
    await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));

    const shadowRoot = container.querySelector('#la-div').attachShadow({mode: 'open'});
    shadowRoot.innerHTML = '<shae-ent id="la-inner" token="inner"><slot></slot></shae-ent>';
    await nextTask();

    const prop = container.querySelector('#la-prop');

    expect(prop.entNode?.id).to.equal('la-inner');
  });

  it('looks for the next entity up when its host leaves the tree', async () => {
    const container = mount(`
      <shae-ent id="lv-outer" token="outer">
        <div id="lv-div"><shae-prop id="lv-prop" name="x" value="1"></shae-prop></div>
      </shae-ent>
    `);
    await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));

    const shadowRoot = container.querySelector('#lv-div').attachShadow({mode: 'open'});
    shadowRoot.innerHTML = '<shae-ent id="lv-inner" token="inner"><slot></slot></shae-ent>';
    await nextTask();

    const prop = container.querySelector('#lv-prop');

    expect(prop.entNode?.id, 'the slot projects it into the closer entity').to.equal('lv-inner');

    shadowRoot.getElementById('lv-inner').remove();
    await nextTask();

    expect(prop.entNode?.id, 'and it falls back to the entity that is still above it').to.equal('lv-outer');
  });

  // The counterpart to `lets go of its host when it moves to a place with no entity above it`:
  // there the element moves, here its host does. Both end in the same decision — a binding with no
  // answer left belongs to a place that is gone.
  //
  // Mutation that turns this red: guard the assignment in `#findEntNode` with
  // `if (found != null)`. The property then keeps writing into an entity it does not sit under.
  it('lets go of its host when the entity above it leaves the tree', async () => {
    const container = mount('<div id="lg-div"><shae-prop id="lg-prop" name="x" value="7" type="number"></shae-prop></div>');
    await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));

    const shadowRoot = container.querySelector('#lg-div').attachShadow({mode: 'open'});
    shadowRoot.innerHTML = '<shae-ent id="lg-inner" ns="ns-p1" token="inner"><slot></slot></shae-ent>';
    await nextTask();

    const prop = container.querySelector('#lg-prop');
    const ctx = ComponentContext.get('ns-p1');

    expect(prop.entNode?.id, 'the slot projects it into the entity').to.equal('lg-inner');

    shadowRoot.getElementById('lg-inner').remove();
    await nextTask();

    expect(prop.entNode?.id, 'nothing is left above it, so it has no host').to.be.undefined;

    // drains the trail that the departure itself produced
    ctx.buildChangeTrails();

    prop.value = 42;
    await nextTask();

    expect(ctx.buildChangeTrails(), 'a value written from there reaches nothing at all').to.have.lengthOf(0);
  });

  it('reports a property with no entity in its ancestor path', async () => {
    // `ConsoleLogger.sharedConfig.enable` is derived from the host name of the page and then
    // reloaded from localStorage — neither is under this case's control, so it is set here. The
    // opposite of `the conversion failure is reported through the ConsoleLogger` in
    // `prop-element-types.test.js`, which turns the switch *off* because it checks `logger.error`.
    const previousEnable = ConsoleLogger.sharedConfig.enable;
    ConsoleLogger.sharedConfig.enable = true;
    const warn = sinon.stub(console, 'warn');
    try {
      mount('<shae-prop id="lonely" name="lonely-x" value="1"></shae-prop>');
      await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));

      // counted by content, not by call count: an unrelated report during mount must not decide
      // this case either way
      const reports = warn
        .getCalls()
        .filter((call) => call.args.some((arg) => typeof arg === 'string' && arg.includes('lonely-x')));
      expect(reports, 'reports naming the property').to.have.lengthOf(1);
    } finally {
      warn.restore();
      ConsoleLogger.sharedConfig.enable = previousEnable;
    }
  });

  // Mutation that turns this red: drop the `#reportedMissingHost` guard. Every entity that shows
  // up anywhere above the property repeats the request, and with it the report.
  it('reports the missing host once, not once per entity that arrives', async () => {
    const previousEnable = ConsoleLogger.sharedConfig.enable;
    ConsoleLogger.sharedConfig.enable = true;
    const warn = sinon.stub(console, 'warn');
    try {
      const container = mount('<div id="rg-box"><shae-prop id="rg-prop" name="rg-x" value="1"></shae-prop></div>');
      await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));

      const count = () =>
        warn.getCalls().filter((call) => call.args.some((arg) => typeof arg === 'string' && arg.includes('rg-x'))).length;

      const afterMount = count();

      // a *sibling* entity: it announces itself without ever becoming a host. The markup goes into
      // a node that is already connected, because only an element upgraded in place announces
      // itself at all
      container.querySelector('#rg-box').insertAdjacentHTML('beforeend', '<shae-ent id="rg-sibling" token="sibling"></shae-ent>');
      await nextTask();

      expect({afterMount, afterSibling: count()}).to.deep.equal({afterMount: 1, afterSibling: 1});
    } finally {
      warn.restore();
      ConsoleLogger.sharedConfig.enable = previousEnable;
    }
  });

  // The `<slot>` moves, not the property and not the entity: what a property sits below changes
  // without anything in its own ancestor path being touched. The second property sits one level
  // deeper than the assigned node, which holds that the binding follows the projection and not
  // just the nodes the slot names.
  it('follows the slot it is projected into when the slot moves to another entity', async () => {
    const container = mount(
      '<shae-ent id="sm-outer" token="outer">' +
        '<div id="sm-div">' +
        '<shae-prop id="sm-prop" name="x" value="1"></shae-prop>' +
        '<div id="sm-wrap"><shae-prop id="sm-deep" name="y" value="2"></shae-prop></div>' +
        '</div>' +
        '</shae-ent>',
    );
    await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));

    const shadowRoot = container.querySelector('#sm-div').attachShadow({mode: 'open'});
    shadowRoot.innerHTML =
      '<shae-ent id="sm-from" token="from"><slot id="sm-slot"></slot></shae-ent><shae-ent id="sm-to" token="to"></shae-ent>';
    await nextTask();

    const prop = container.querySelector('#sm-prop');
    const deep = container.querySelector('#sm-deep');

    expect(prop.entNode?.id, 'the slot projects the property into the entity holding it').to.equal('sm-from');
    expect(deep.entNode?.id, 'and the one below the assigned node with it').to.equal('sm-from');

    shadowRoot.getElementById('sm-to').appendChild(shadowRoot.getElementById('sm-slot'));
    await nextTask();

    expect(prop.entNode?.id, 'the slot takes its projection along').to.equal('sm-to');
    expect(deep.entNode?.id, 'down to the property below the assigned node').to.equal('sm-to');
  });

  // The destination holds no entity, so nothing there can report the move — the entity that gave
  // the slot away is the only side that still knows about it.
  it('follows the slot into a place with no entity above it', async () => {
    const container = mount(
      '<shae-ent id="sn-outer" token="outer">' +
        '<div id="sn-div">' +
        '<shae-prop id="sn-prop" name="x" value="1"></shae-prop>' +
        '<div id="sn-wrap"><shae-prop id="sn-deep" name="y" value="2"></shae-prop></div>' +
        '</div>' +
        '</shae-ent>',
    );
    await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));

    const shadowRoot = container.querySelector('#sn-div').attachShadow({mode: 'open'});
    shadowRoot.innerHTML = '<shae-ent id="sn-from" token="from"><slot id="sn-slot"></slot></shae-ent><div id="sn-plain"></div>';
    await nextTask();

    const prop = container.querySelector('#sn-prop');
    const deep = container.querySelector('#sn-deep');

    expect(prop.entNode?.id, 'the slot projects the property into the entity holding it').to.equal('sn-from');
    expect(deep.entNode?.id, 'and the one below the assigned node with it').to.equal('sn-from');

    shadowRoot.getElementById('sn-plain').appendChild(shadowRoot.getElementById('sn-slot'));
    await nextTask();

    // the ascent leaves the shadow root over its host and arrives at the entity around it
    expect(prop.entNode?.id, 'no entity stands above the slot any more').to.equal('sn-outer');
    expect(deep.entNode?.id, 'down to the property below the assigned node').to.equal('sn-outer');
  });

  // The same move, with a round trip of the shadow host in front of it. The entity holding the
  // slot is the only side that can report a move to a place with no entity above it, so it has to
  // hold the slot again after the round trip — and it takes the slots below it up when it enters
  // the tree, because the assignment inside the shadow root does not change on the way and
  // nothing reports it.
  it('follows the slot out of every entity after its shadow host left the document and came back', async () => {
    const container = mount(
      '<shae-ent id="sq-outer" token="outer">' +
        '<div id="sq-div">' +
        '<shae-prop id="sq-prop" name="x" value="1"></shae-prop>' +
        '<div id="sq-wrap"><shae-prop id="sq-deep" name="y" value="2"></shae-prop></div>' +
        '</div>' +
        '</shae-ent>',
    );
    await Promise.all(['shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));

    const div = container.querySelector('#sq-div');
    const shadowRoot = div.attachShadow({mode: 'open'});
    shadowRoot.innerHTML = '<shae-ent id="sq-from" token="from"><slot id="sq-slot"></slot></shae-ent><div id="sq-plain"></div>';
    await nextTask();

    expect(container.querySelector('#sq-prop').entNode?.id, 'the slot projects the property into the entity holding it').to.equal(
      'sq-from',
    );

    const outer = container.querySelector('#sq-outer');
    div.remove();
    await nextTask();
    outer.appendChild(div);
    await nextTask();

    const prop = container.querySelector('#sq-prop');
    const deep = container.querySelector('#sq-deep');

    expect(prop.entNode?.id, 'the round trip leaves the binding as it was').to.equal('sq-from');
    expect(deep.entNode?.id, 'and the one below the assigned node with it').to.equal('sq-from');

    shadowRoot.getElementById('sq-plain').appendChild(shadowRoot.getElementById('sq-slot'));
    await nextTask();

    // the ascent leaves the shadow root over its host and arrives at the entity around it
    expect(prop.entNode?.id, 'no entity stands above the slot any more').to.equal('sq-outer');
    expect(deep.entNode?.id, 'down to the property below the assigned node').to.equal('sq-outer');
  });
});

/**
 * `<shae-prop>` has no namespace of its own (see the class comment on `ShaePropElement`) and
 * delegates every sync to `entNode`, its host. This is the one case that reads the result of
 * that delegation instead of just the DOM-level binding: it names the environment the sync has
 * to land in, not merely that a sync happened.
 */
describe('shae-prop syncs the environment its host lives in', () => {
  afterEach(() => {
    unmountAll();
  });

  it('syncs the environment of its host entity when the binding ends', async () => {
    const container = mount(
      '<shae-worker local auto-sync="off" ns="hs-ns" id="hs-worker"></shae-worker>' +
        '<shae-ent ns="hs-ns" token="host"><shae-prop id="hs-prop" name="x" value="1"></shae-prop></shae-ent>',
    );
    await Promise.all(['shae-worker', 'shae-ent', 'shae-prop'].map((name) => customElements.whenDefined(name)));
    await nextTask();

    const prop = container.querySelector('#hs-prop');
    const hostEnv = ShadowEnv.get('hs-ns');
    expect(hostEnv, 'the host entity brings its environment up with it').to.exist;
    const sync = sinon.spy(hostEnv, 'sync');

    prop.remove();
    await nextTask();

    expect(sync.callCount, 'the environment of the host entity is the one that has to hear about it').to.be.greaterThan(0);
  });
});