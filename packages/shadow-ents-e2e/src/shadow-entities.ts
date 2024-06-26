import type {LocalShadowObjectEnv, ShadowEntityElement, ShadowEnvElement} from '@spearwolf/shadow-ents';
import '@spearwolf/shadow-ents/shadow-entity.js';
import '@spearwolf/shadow-ents/shadow-env.js';
import './style.css';
import {testAsyncAction} from './testAsyncAction.js';

console.log('hello, hello');

main();

async function main() {
  await testAsyncAction('custom-element-shadow-env-exists', () => customElements.whenDefined('shadow-env'));
  await testAsyncAction('custom-element-shadow-entity-exists', () => customElements.whenDefined('shadow-entity'));

  const shadowEnvElement = document.querySelector('[data-testid=localEnv0]') as ShadowEnvElement;
  const {shadowEnv} = shadowEnvElement;
  const kernel = (shadowEnv.envProxy as LocalShadowObjectEnv).kernel;

  console.log('shadowEnvElement', shadowEnvElement);
  console.log('shadowEnv', shadowEnv);
  console.log('kernel', kernel);

  await testAsyncAction('shadow-env-ready', () => shadowEnv.ready());

  const seBase0 = document.querySelector('[data-testid=seBase0]') as ShadowEntityElement;

  console.log('seBase0:element', seBase0);
  console.log('seBase0:viewComponent', seBase0.viewComponent);
}
