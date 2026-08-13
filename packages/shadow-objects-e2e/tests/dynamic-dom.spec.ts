import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('dynamic-dom', () => {
  runPageTests(
    '/pages/dynamic-dom.html',
    [
      'dynamic-dom-env-ready',
      'dynamic-dom-import-module',
      'dynamic-dom-initial-snapshot',
      // DOM-1: createElement + appendChild
      'dynamic-dom-append-syncs',
      'dynamic-dom-appended-entity-exists',
      'dynamic-dom-appended-entity-has-parent',
      'dynamic-dom-appended-entity-uuid-matches-view',
      'dynamic-dom-plain-append-syncs',
      'dynamic-dom-entity-below-plain-element-is-root',
      // DOM-2: subtree in one step
      'dynamic-dom-subtree-syncs',
      'dynamic-dom-subtree-fully-created',
      'dynamic-dom-subtree-hierarchy-is-correct',
      'dynamic-dom-parents-created-before-children',
      // DOM-3: move to a different parent
      'dynamic-dom-move-syncs',
      'dynamic-dom-moved-entity-changed-parent',
      'dynamic-dom-moved-entity-kept-identity',
      'dynamic-dom-move-did-not-recreate',
      // DOM-6: property elements added, changed and removed at runtime
      'dynamic-dom-added-prop-syncs',
      'dynamic-dom-added-prop-arrived',
      'dynamic-dom-changed-prop-syncs',
      'dynamic-dom-changed-prop-arrived',
      'dynamic-dom-removed-prop-syncs',
      'dynamic-dom-removed-prop-is-gone',
      // DOM-4: removal
      'dynamic-dom-remove-syncs',
      'dynamic-dom-removed-entity-is-gone',
      'dynamic-dom-removed-entity-ran-on-destroy',
      'dynamic-dom-subtree-remove-syncs',
      'dynamic-dom-removed-subtree-is-fully-gone',
      // DOM-8: remove and re-append in the same microtask
      'dynamic-dom-flicker-created',
      'dynamic-dom-flicker-syncs',
      'dynamic-dom-flicker-survives-as-live-entity',
      'dynamic-dom-flicker-keeps-its-uuid',
    ],
    {
      // DEFECT-2: removing a <shae-prop> leaves the property in place — ShaePropElement never
      // calls ViewComponent.removeProperty(). See KNOWN-DEFECTS.md.
      knownFailures: ['dynamic-dom-removed-prop-is-gone'],
    },
  );
});