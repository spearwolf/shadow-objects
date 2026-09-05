import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('inspect-worker-env', () => {
  runPageTests('/pages/inspect-worker-env.html', [
    'inspect-env-ready',
    'inspect-importScript',
    'inspect-first-sync',
    'inspect-answers',
    'inspect-kind-is-worker',
    'inspect-kernel-was-built-in-the-worker',
    'inspect-view-and-kernel-agree',
    'inspect-props-crossed-the-wire',
    'inspect-shadow-objects-are-described',
    'inspect-registry-crossed-the-wire',
    'inspect-snapshot-is-json-safe',
    'inspect-honours-the-request',
    'inspect-aborted-signal-rejects-with-its-reason',
    'inspect-after-destroy-rejects',
  ]);
});
