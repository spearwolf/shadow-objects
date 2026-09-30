import {on} from '@spearwolf/eventize';
import '@spearwolf/shadow-objects/elements.js';
import './style.css';
import {runTestSuite} from './test-helpers/runTestSuite.js';
import {testAsyncAction} from './test-helpers/testAsyncAction.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';
import {waitUntil} from './test-helpers/waitUntil.js';

const MODULE_URL = '/mod-deferred-render.js';

const byId = (id) => document.getElementById(id);
const entIn = (hostId, entId) => byId(hostId).shadowRoot.getElementById(entId);

const PROJECTED = ['import-inner', 'create-inner', 'of-hero', 'if-hero'];

const importNodeOf = (html) => () => {
  const template = document.createElement('template');
  template.innerHTML = html;
  return document.importNode(template.content, true);
};

const createElementOf = (id, token) => () => {
  const ent = document.createElement('shae-ent');
  ent.id = id;
  ent.setAttribute('token', token);
  ent.append(document.createElement('slot'));
  return ent;
};

/** A host that fills its shadow root a microtask after it connected, the way Lit renders. */
const defineDeferredHost = (tag, build) => {
  customElements.define(
    tag,
    class extends HTMLElement {
      connectedCallback() {
        if (this.shadowRoot) return;
        const root = this.attachShadow({mode: 'open'});
        queueMicrotask(() => root.append(build()));
      }
    },
  );
};

const WORLD = importNodeOf('<shae-ent id="world"><slot></slot></shae-ent>');
const DISPLAY = importNodeOf('<shae-ent id="display" token="provider"><slot></slot></shae-ent>');

runTestSuite(main);

async function main() {
  // --- DEFER-1 … DEFER-3: the hosts arrive after the entities they project ------------

  let askedFirst = false;

  await testAsyncAction('deferred-render-definitions-arrive', async () => {
    defineDeferredHost('deferred-import-host', importNodeOf('<shae-ent id="outer" token="provider"><slot></slot></shae-ent>'));
    defineDeferredHost('deferred-create-host', createElementOf('outer', 'provider'));
    defineDeferredHost('of-world-host', WORLD);
    defineDeferredHost('of-display-host', DISPLAY);
    defineDeferredHost('if-display-host', DISPLAY);
    defineDeferredHost('if-world-host', WORLD);

    // read before the render microtasks run: every host has upgraded and none has rendered yet
    askedFirst = PROJECTED.every((id) => byId(id).entParentNode === undefined);

    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  // the starting point, not a defect: this is the timing the page exists for
  testBooleanAction('deferred-render-projected-entities-asked-first', () => askedFirst);

  const adoptedBy = (el, parent) => el.entParentNode === parent && el.viewComponent.parent === parent.viewComponent;

  // DEFER-1
  testBooleanAction('deferred-render-import-node-adopts', () => adoptedBy(byId('import-inner'), entIn('import-host', 'outer')));
  testBooleanAction('deferred-render-create-element-adopts', () =>
    adoptedBy(byId('create-inner'), entIn('create-host', 'outer')),
  );

  // DEFER-2
  const chainOf = (prefix) => {
    const world = entIn(`${prefix}-world-host`, 'world');
    const display = entIn(`${prefix}-display-host`, 'display');
    return adoptedBy(byId(`${prefix}-hero`), display) && adoptedBy(display, world) && world.viewComponent.parent == null;
  };

  testBooleanAction('deferred-render-outer-first-builds-the-chain', () => chainOf('of'));
  testBooleanAction('deferred-render-inner-first-builds-the-chain', () => chainOf('if'));

  // --- DEFER-3: the context arrives in the worker from the closest provider ------------

  const stageSeen = new Map();
  for (const id of PROJECTED) {
    on(byId(id).viewComponent, 'stage', (value) => stageSeen.set(id, value));
  }

  const providerOf = {
    'import-inner': () => entIn('import-host', 'outer'),
    'create-inner': () => entIn('create-host', 'outer'),
    'of-hero': () => entIn('of-display-host', 'display'),
    'if-hero': () => entIn('if-display-host', 'display'),
  };

  const env = byId('env');
  env.start();

  await testAsyncAction('deferred-render-env-ready', () => env.shadowEnv.ready());
  await testAsyncAction('deferred-render-import-module', () => env.importScript(MODULE_URL));
  await testAsyncAction('deferred-render-sync', () => env.shadowEnv.syncWait());

  await testAsyncAction('deferred-render-context-reaches-the-projected-entities', () =>
    waitUntil('every projected entity reads the stage of its closest provider', () =>
      PROJECTED.every((id) => stageSeen.get(id) === providerOf[id]().uuid),
    ),
  );
}
