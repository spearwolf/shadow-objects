import {test} from '@playwright/test';
import {runPageTests} from './runPageTests.js';

test.describe('model-context-platform', () => {
  // The Chromium project is launched with `--enable-features=WebMCP` (playwright.config.ts); the
  // other two engines have no `document.modelContext`, and the page would report the platform as
  // absent. The fake-adapter page, `model-context.html`, is what proves the tools there.
  test.skip(({browserName}) => browserName !== 'chromium', 'WebMCP is a Chromium feature behind --enable-features=WebMCP');

  runPageTests('/pages/model-context-platform.html', [
    'mcp-expose-resolves',
    'mcp-model-context-is-available',
    'mcp-tools-are-listed-by-the-platform',
    'mcp-list-envs-executes-through-the-platform',
    'mcp-get-entity-tree-executes-through-the-platform',
    'mcp-find-entities-executes-through-the-platform',
    'mcp-a-refusal-comes-back-as-an-error-result',
    'mcp-dispose-takes-the-tools-back',
  ]);
});
