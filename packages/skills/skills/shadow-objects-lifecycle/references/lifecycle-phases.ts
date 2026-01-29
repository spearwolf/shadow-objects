// @ts-nocheck
/**
 * Lifecycle Phases Examples
 *
 * Demonstrates the three phases of a Shadow Object:
 * 1. Setup Phase - Function body runs once
 * 2. Runtime Phase - Effects re-run on dependency changes
 * 3. Teardown Phase - Cleanup on Entity destruction
 */

import type {ShadowObjectCreationAPI} from '@spearwolf/shadow-objects';

// ============================================
// BASIC LIFECYCLE DEMONSTRATION
// ============================================

/**
 * Simple Lifecycle Demo
 *
 * Shows the basic flow of Setup -> Runtime -> Teardown
 */
export function LifecycleDemo({entity, createSignal, createEffect, onViewEvent, onDestroy}: ShadowObjectCreationAPI) {
  // ========================================
  // SETUP PHASE (runs once)
  // ========================================
  console.log(`[${entity.token}] 1. SETUP PHASE STARTED`);

  // Initialize state
  const count = createSignal(0);
  console.log(`[${entity.token}] 2. Signal created, initial value: ${count()}`);

  // Register effect (doesn't run yet during setup registration)
  createEffect(() => {
    // ========================================
    // RUNTIME PHASE (runs on dependency changes)
    // ========================================
    console.log(`[${entity.token}] RUNTIME: Effect running, count = ${count()}`);
  });
  console.log(`[${entity.token}] 3. Effect registered`);

  // Register event handler
  onViewEvent((type) => {
    if (type === 'increment') {
      console.log(`[${entity.token}] RUNTIME: Event received, incrementing`);
      count.set((c) => c + 1);
    }
  });
  console.log(`[${entity.token}] 4. Event handler registered`);

  // Register cleanup
  onDestroy(() => {
    // ========================================
    // TEARDOWN PHASE (runs on destruction)
    // ========================================
    console.log(`[${entity.token}] TEARDOWN: Cleanup running`);
  });
  console.log(`[${entity.token}] 5. Cleanup registered`);

  console.log(`[${entity.token}] 6. SETUP PHASE COMPLETE`);

  // Expected console output:
  // 1. SETUP PHASE STARTED
  // 2. Signal created, initial value: 0
  // 3. Effect registered
  // 4. Event handler registered
  // 5. Cleanup registered
  // 6. SETUP PHASE COMPLETE
  // RUNTIME: Effect running, count = 0  (first effect run)
  // ... (on 'increment' event)
  // RUNTIME: Event received, incrementing
  // RUNTIME: Effect running, count = 1
  // ... (on Entity destruction)
  // TEARDOWN: Cleanup running
}

// ============================================
// ASYNC INITIALIZATION
// ============================================

/**
 * Async Initialization Pattern
 *
 * Shows how to handle async operations during setup.
 */
export function AsyncInitDemo({createSignal, createEffect, dispatchMessageToView, onDestroy}: ShadowObjectCreationAPI) {
  // Synchronous state for tracking init status
  const isInitialized = createSignal(false);
  const initError = createSignal<string | null>(null);
  const data = createSignal<unknown>(null);

  // Async initialization (starts during setup, completes during runtime)
  const initPromise = (async () => {
    try {
      dispatchMessageToView('init-started', {});

      // Simulate async work
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate data fetch
      const result = await fetchData();

      data.set(result);
      isInitialized.set(true);
      dispatchMessageToView('init-complete', {});
    } catch (error) {
      initError.set(String(error));
      dispatchMessageToView('init-error', {error: String(error)});
    }
  })();

  // Effect responds to initialization state
  createEffect(() => {
    if (isInitialized()) {
      console.log('Initialized with data:', data());
    }
    if (initError()) {
      console.error('Init failed:', initError());
    }
  });

  // Handle cleanup even if init is still in progress
  let aborted = false;
  onDestroy(() => {
    aborted = true;
  });
}

async function fetchData() {
  return {id: 1, name: 'Example'};
}

// ============================================
// CONDITIONAL LIFECYCLE
// ============================================

/**
 * Conditional Resource Lifecycle
 *
 * Resources that are created/destroyed based on conditions.
 */
export function ConditionalLifecycleDemo({useProperty, createSignal, createEffect, onDestroy}: ShadowObjectCreationAPI) {
  const enabled = useProperty<boolean>('enabled');

  // Track resource state
  const resource = createSignal<{id: number; dispose: () => void} | null>(null);
  let resourceCounter = 0;

  // Create/destroy resource based on 'enabled' prop
  createEffect(() => {
    const isEnabled = enabled();
    const currentResource = resource();

    if (isEnabled && !currentResource) {
      // Create resource when enabled
      const id = ++resourceCounter;
      console.log(`Creating resource #${id}`);

      resource.set({
        id,
        dispose: () => console.log(`Disposing resource #${id}`),
      });
    } else if (!isEnabled && currentResource) {
      // Destroy resource when disabled
      currentResource.dispose();
      resource.set(null);
    }
  });

  // Final cleanup
  onDestroy(() => {
    const currentResource = resource();
    if (currentResource) {
      currentResource.dispose();
    }
  });
}

// ============================================
// NESTED LIFECYCLE
// ============================================

/**
 * Parent-Child Lifecycle
 *
 * Demonstrates lifecycle order for nested Entities.
 */
export function ParentLifecycleDemo({entity, createSignal, provideContext, onDestroy}: ShadowObjectCreationAPI) {
  console.log(`[Parent] Setup started`);

  const parentState = createSignal('parent-data');
  provideContext('parent-state', parentState);

  onDestroy(() => {
    console.log(`[Parent] Teardown - children already destroyed`);
  });

  console.log(`[Parent] Setup complete`);
}

export function ChildLifecycleDemo({entity, useContext, createEffect, onDestroy}: ShadowObjectCreationAPI) {
  console.log(`[Child] Setup started`);

  const parentState = useContext<() => string>('parent-state');

  createEffect(() => {
    console.log(`[Child] Parent state: ${parentState?.()}`);
  });

  onDestroy(() => {
    console.log(`[Child] Teardown - before parent`);
  });

  console.log(`[Child] Setup complete`);

  // Lifecycle order:
  // 1. [Parent] Setup started
  // 2. [Parent] Setup complete
  // 3. [Child] Setup started
  // 4. [Child] Setup complete
  // 5. [Child] Parent state: parent-data
  //
  // On destruction (children first, then parents):
  // 6. [Child] Teardown - before parent
  // 7. [Parent] Teardown - children already destroyed
}

// ============================================
// MULTIPLE SHADOW OBJECTS LIFECYCLE
// ============================================

/**
 * Multiple Shadow Objects on Same Entity
 *
 * When an Entity has multiple Shadow Objects,
 * they all share the same lifecycle.
 */
export function FeatureA({entity, onDestroy}: ShadowObjectCreationAPI) {
  console.log(`[FeatureA on ${entity.token}] Setup`);

  onDestroy(() => {
    console.log(`[FeatureA on ${entity.token}] Teardown`);
  });
}

export function FeatureB({entity, onDestroy}: ShadowObjectCreationAPI) {
  console.log(`[FeatureB on ${entity.token}] Setup`);

  onDestroy(() => {
    console.log(`[FeatureB on ${entity.token}] Teardown`);
  });
}

// Registry with composition:
// {
//   define: { 'my-entity': FeatureA },
//   routes: { 'my-entity': ['feature-b'] }
// }
//
// Both FeatureA and FeatureB run setup when Entity is created
// Both run teardown when Entity is destroyed

// ============================================
// REGISTRY
// ============================================

export default {
  define: {
    'lifecycle-demo': LifecycleDemo,
    'async-init': AsyncInitDemo,
    'conditional-lifecycle': ConditionalLifecycleDemo,
    'parent-lifecycle': ParentLifecycleDemo,
    'child-lifecycle': ChildLifecycleDemo,
    'feature-a': FeatureA,
    'feature-b': FeatureB,
  },
  routes: {
    // Demonstrate multiple Shadow Objects
    'parent-lifecycle': ['child-lifecycle'],
  },
};
