import '@spearwolf/shadow-objects/elements.js';
import './style.css';
import {runTestSuite} from './test-helpers/runTestSuite.js';
import {testBooleanAction} from './test-helpers/testBooleanAction.js';

runTestSuite(main);

async function main() {
  await customElements.whenDefined('shae-worker');
  await customElements.whenDefined('shae-ent');
  await customElements.whenDefined('shae-prop');

  // --- the markup path ----------------------------------------------

  const host = document.createElement('div');
  document.body.append(host);
  host.innerHTML = '<shae-ent token="from-markup"><shae-prop name="a" value="1"></shae-prop></shae-ent>';

  testBooleanAction('create-element-markup-path-upgrades', () => {
    const ent = host.querySelector('shae-ent');
    const prop = host.querySelector('shae-prop');
    return ent?.isShaeEntElement === true && prop?.isShaePropElement === true;
  });

  testBooleanAction('create-element-markup-path-has-view-component', () => {
    return host.querySelector('shae-ent')?.viewComponent != null;
  });

  // --- the programmatic path ----------------------------------------------

  const created = {};
  for (const tag of ['shae-ent', 'shae-prop', 'shae-worker']) {
    try {
      created[tag] = {el: document.createElement(tag)};
    } catch (error) {
      created[tag] = {error};
    }
  }

  testBooleanAction('create-element-shae-ent-upgrades', () => {
    const {el, error} = created['shae-ent'];
    if (error) throw error;
    if (el.constructor === HTMLUnknownElement) {
      throw new Error('document.createElement("shae-ent") returned an HTMLUnknownElement — the upgrade was aborted');
    }
    return el.isShaeEntElement === true;
  });

  testBooleanAction('create-element-shae-prop-upgrades', () => {
    const {el, error} = created['shae-prop'];
    if (error) throw error;
    if (el.constructor === HTMLUnknownElement) {
      throw new Error('document.createElement("shae-prop") returned an HTMLUnknownElement — the upgrade was aborted');
    }
    return el.isShaePropElement === true;
  });

  testBooleanAction('create-element-shae-worker-upgrades', () => {
    const {el, error} = created['shae-worker'];
    if (error) throw error;
    if (el.constructor === HTMLUnknownElement) {
      throw new Error('document.createElement("shae-worker") returned an HTMLUnknownElement — the upgrade was aborted');
    }
    return el.isShaeWorkerElement === true;
  });

  // A created element that is appended must behave like one that came from markup.
  testBooleanAction('create-element-appended-entity-becomes-live', () => {
    const {el} = created['shae-ent'];
    el.setAttribute('token', 'created-programmatically');
    document.body.append(el);
    return el.viewComponent != null;
  });
}
