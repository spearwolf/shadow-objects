import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('multi-env', () => {
  runPageTests('/pages/multi-env.html', [
    // MULTI-1: three environments side by side
    'multi-envs-ready',
    'multi-envs-are-distinct',
    'multi-envs-have-separate-contexts',
    'multi-envs-mix-remote-and-local',
    'multi-envs-import-module',
    'multi-envs-first-sync',
    'multi-envs-entities-created',
    // MULTI-6: same token, independent instances
    'multi-env-same-token-stays-independent',
    'multi-env-initial-values-arrived',
    // MULTI-7: cross-namespace nesting
    'multi-env-cross-ns-child-becomes-root',
    'multi-env-cross-ns-child-has-no-view-parent',
    'multi-env-same-ns-child-is-linked',
    // MULTI-2 / MULTI-3: property sync and isolation
    'multi-env-alpha-change-syncs',
    'multi-env-alpha-received-change',
    'multi-env-isolation-barrier',
    'multi-env-other-namespaces-unaffected',
    'multi-env-no-foreign-envName-leaked',
    // MULTI-4: simultaneous changes
    'multi-env-simultaneous-change-syncs',
    'multi-env-simultaneous-changes-arrived',
    'multi-env-simultaneous-barrier',
    'multi-env-simultaneous-changes-did-not-cross',
    // MULTI-5: request into one namespace, answered there only
    'multi-env-request-syncs',
    'multi-env-request-answered',
    'multi-env-request-answer-is-correct',
    'multi-env-request-barrier',
    'multi-env-request-reached-no-other-namespace',
    // MULTI-8: a namespace change at runtime
    'multi-env-ns-switch-syncs',
    'multi-env-ns-switch-left-the-old-env',
    'multi-env-ns-switch-joined-the-new-env',
    'multi-env-ns-switch-view-matches-tree',
    'multi-env-ns-switch-back-restores-the-tree',
  ]);
});