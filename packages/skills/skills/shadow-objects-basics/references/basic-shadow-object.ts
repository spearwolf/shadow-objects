// @ts-nocheck
/**
 * Basic Shadow Object Template
 *
 * A Shadow Object is a function that receives the ShadowObjectCreationAPI
 * and sets up reactive logic for an Entity.
 *
 * @example
 * // In your registry module (e.g., my-logic.ts):
 * import { Counter } from './basic-shadow-object';
 *
 * export default {
 *   define: {
 *     'counter': Counter,
 *   },
 * };
 */

import type {ShadowObjectCreationAPI} from '@spearwolf/shadow-objects';

// NOTE: This is a reference file for the shadow-objects-basics skill.
// In a real project, install @spearwolf/shadow-objects and import the types from there.

/**
 * Counter Shadow Object
 *
 * Demonstrates:
 * - Reading properties from View with useProperty
 * - Creating local reactive state with createSignal
 * - Reacting to changes with createEffect
 * - Handling View events with onViewEvent
 * - Sending messages to View with dispatchMessageToView
 * - Cleanup with onDestroy
 */
export function Counter({
  useProperty,
  createSignal,
  createEffect,
  onViewEvent,
  dispatchMessageToView,
  onDestroy,
}: ShadowObjectCreationAPI) {
  // ============================================
  // SETUP PHASE (runs once on creation)
  // ============================================

  // Read the 'count' property from the View
  // This creates a reactive signal that updates when the View property changes
  const countFromView = useProperty<number>('count');

  // Create local reactive state, initialized from View property
  const count = createSignal(countFromView() ?? 0);

  // ============================================
  // REACTIVE PHASE (runs when dependencies change)
  // ============================================

  // Effect: Notify View whenever count changes
  createEffect(() => {
    const currentCount = count();
    dispatchMessageToView('count-changed', {
      value: currentCount,
      timestamp: Date.now(),
    });
  });

  // Effect: Sync with View property changes (optional two-way binding)
  createEffect(() => {
    const viewCount = countFromView();
    if (viewCount !== undefined && viewCount !== count()) {
      count.set(viewCount);
    }
  });

  // ============================================
  // EVENT HANDLERS
  // ============================================

  // Listen for events from the View
  onViewEvent((eventType, eventData) => {
    switch (eventType) {
      case 'increment':
        count.set((c) => c + (eventData?.amount ?? 1));
        break;
      case 'decrement':
        count.set((c) => c - (eventData?.amount ?? 1));
        break;
      case 'reset':
        count.set(0);
        break;
    }
  });

  // ============================================
  // CLEANUP (runs on Entity destruction)
  // ============================================

  // Use onDestroy for external resources not managed by the framework
  // Note: Signals, effects, and event listeners are cleaned up automatically
  onDestroy(() => {
    console.log('Counter Shadow Object destroyed');
  });
}

/**
 * Minimal Shadow Object Example
 *
 * Shows the simplest possible Shadow Object - just logging.
 */
export function Logger({entity}: ShadowObjectCreationAPI) {
  console.log(`[Logger] Shadow Object attached to Entity: ${entity.token}`);
}

/**
 * Shadow Object with Multiple Properties
 *
 * Demonstrates useProperties for reading multiple values at once.
 */
export function Player({useProperties, createEffect, createMemo, dispatchMessageToView}: ShadowObjectCreationAPI) {
  // Read multiple properties with a mapping object
  const props = useProperties<{
    x: number;
    y: number;
    name: string;
    health: number;
  }>({
    x: 'position-x',
    y: 'position-y',
    name: 'player-name',
    health: 'player-health',
  });

  // Create a computed value (memo) from multiple signals
  const status = createMemo(() => {
    const h = props.health() ?? 100;
    if (h <= 0) return 'dead';
    if (h < 30) return 'critical';
    if (h < 70) return 'wounded';
    return 'healthy';
  });

  // Effect runs whenever any dependency changes
  createEffect(() => {
    dispatchMessageToView('player-update', {
      name: props.name(),
      position: {x: props.x(), y: props.y()},
      health: props.health(),
      status: status(),
    });
  });
}

/**
 * Shadow Object with Context Provider
 *
 * Provides shared state to all descendant Entities.
 */
export function GameStateProvider({createSignal, provideContext}: ShadowObjectCreationAPI) {
  const score = createSignal(0);
  const level = createSignal(1);
  const isPaused = createSignal(false);

  // Make these signals available to all descendants via Context
  provideContext('game-score', score);
  provideContext('game-level', level);
  provideContext('game-paused', isPaused);

  // Return an API for other Shadow Objects on the same Entity
  return {
    addScore: (points: number) => score.set((s) => s + points),
    nextLevel: () => level.set((l) => l + 1),
    togglePause: () => isPaused.set((p) => !p),
  };
}

/**
 * Shadow Object with Context Consumer
 *
 * Reads shared state from ancestor Entities.
 */
export function ScoreDisplay({useContext, createEffect, dispatchMessageToView}: ShadowObjectCreationAPI) {
  // Read context provided by an ancestor
  const score = useContext<() => number>('game-score');
  const level = useContext<() => number>('game-level');

  createEffect(() => {
    // Both score() and level() are tracked as dependencies
    dispatchMessageToView('score-display-update', {
      score: score?.() ?? 0,
      level: level?.() ?? 1,
    });
  });
}
