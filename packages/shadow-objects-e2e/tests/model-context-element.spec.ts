import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('model-context-element', () => {
  runPageTests('/pages/model-context-element.html', [
    'mce-envs-ready',
    'mce-first-sync',
    'mce-exposure-resolves',
    'mce-attribute-registers-five-tools',
    'mce-element-without-attribute-has-no-exposure',
    'mce-list-envs-names-only-the-exposed-environment',
    'mce-hidden-namespace-is-refused-like-an-unknown-one',
    'mce-redact-props-hides-the-value-across-the-wire',
    'mce-second-element-joins-the-same-registration',
    'mce-redaction-cumulates-across-elements',
    'mce-removing-the-attribute-leaves-and-its-rule-goes-with-it',
    'mce-removing-the-last-element-takes-the-tools-back',
  ]);
});
