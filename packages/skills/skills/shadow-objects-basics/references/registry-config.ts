// @ts-nocheck
/**
 * Registry Configuration Examples
 *
 * The Registry maps Tokens to Shadow Object constructors and defines
 * composition rules for which Shadow Objects load together.
 *
 * @example
 * // Use as default export for <shae-worker src="./registry.ts">
 * export default {
 *   define: { ... },
 *   routes: { ... },
 * };
 */

import type {ShadowObjectCreationAPI} from '@spearwolf/shadow-objects';

// NOTE: This is a reference file for the shadow-objects-basics skill.
// In a real project, install @spearwolf/shadow-objects and import the types from there.

// ============================================
// EXAMPLE SHADOW OBJECTS
// ============================================

/**
 * Simple Counter Shadow Object
 */
function Counter({useProperty, createSignal, createEffect, onViewEvent, dispatchMessageToView}: ShadowObjectCreationAPI) {
  const initialCount = useProperty<number>('count');
  const count = createSignal(initialCount() ?? 0);

  createEffect(() => {
    dispatchMessageToView('count-changed', {value: count()});
  });

  onViewEvent((type, data) => {
    if (type === 'increment') count.set((c) => c + 1);
    if (type === 'decrement') count.set((c) => c - 1);
    if (type === 'reset') count.set(0);
  });
}

/**
 * Logger Shadow Object - logs Entity events
 */
function Logger({entity}: ShadowObjectCreationAPI) {
  console.log(`[Logger] Entity created: ${entity.token}`);
}

/**
 * Analytics Tracker - tracks View events
 */
function AnalyticsTracker({entity, onViewEvent}: ShadowObjectCreationAPI) {
  onViewEvent((type, data) => {
    console.log(`[Analytics] ${entity.token}: ${type}`, data);
    // In a real app, send to analytics service
  });
}

/**
 * Debug Panel - only loads when debug mode is enabled
 */
function DebugPanel({useProperty, createEffect, dispatchMessageToView}: ShadowObjectCreationAPI) {
  const debugMode = useProperty<boolean>('debug');

  createEffect(() => {
    if (debugMode()) {
      dispatchMessageToView('debug-panel-active', {active: true});
    }
  });
}

/**
 * Performance Monitor - tracks frame timing
 */
function PerformanceMonitor({createSignal, createEffect, onDestroy}: ShadowObjectCreationAPI) {
  const fps = createSignal(0);
  let lastTime = performance.now();
  let frameCount = 0;

  const intervalId = setInterval(() => {
    const now = performance.now();
    const elapsed = now - lastTime;
    fps.set(Math.round((frameCount * 1000) / elapsed));
    frameCount = 0;
    lastTime = now;
  }, 1000);

  createEffect(() => {
    console.log(`[Perf] FPS: ${fps()}`);
  });

  onDestroy(() => {
    clearInterval(intervalId);
  });
}

// ============================================
// REGISTRY CONFIGURATIONS
// ============================================

/**
 * Basic Registry Configuration
 *
 * Simple mapping of tokens to Shadow Object constructors.
 */
export const basicRegistry = {
  define: {
    counter: Counter,
    logger: Logger,
  },
};

/**
 * Registry with Composition Routes
 *
 * Routes define which additional Shadow Objects load with a Token.
 * When 'counter' Entity is created, 'logger' and 'analytics' also load.
 */
export const compositionRegistry = {
  define: {
    counter: Counter,
    logger: Logger,
    analytics: AnalyticsTracker,
    'debug-panel': DebugPanel,
    'perf-monitor': PerformanceMonitor,
  },
  routes: {
    // Whenever 'counter' loads, also load 'logger' and 'analytics'
    counter: ['logger', 'analytics'],
  },
};

/**
 * Registry with Conditional Routes
 *
 * Use @ prefix for conditional routing based on properties.
 * The route '@debug' only activates if the Entity has a truthy 'debug' property.
 */
export const conditionalRegistry = {
  define: {
    counter: Counter,
    logger: Logger,
    'debug-panel': DebugPanel,
    'perf-monitor': PerformanceMonitor,
  },
  routes: {
    // 'counter' always loads 'logger', and conditionally '@debug'
    counter: ['logger', '@debug'],
    // '@debug' resolves to these when 'debug' property is truthy
    '@debug': ['debug-panel', 'perf-monitor'],
  },
};

/**
 * Registry with Nested Routes
 *
 * Routes can reference other routes for complex composition trees.
 */
export const nestedRoutesRegistry = {
  define: {
    'game-scene': GameScene,
    player: Player,
    enemy: Enemy,
    'collision-system': CollisionSystem,
    'audio-system': AudioSystem,
    'particle-system': ParticleSystem,
  },
  routes: {
    // 'game-scene' loads core systems
    'game-scene': ['collision-system', 'audio-system'],
    // 'player' loads particle effects
    player: ['particle-system'],
    // 'enemy' also loads particle effects (shares the same definition)
    enemy: ['particle-system'],
  },
};

// Placeholder Shadow Objects for nested routes example
function GameScene() {}
function Player() {}
function Enemy() {}
function CollisionSystem() {}
function AudioSystem() {}
function ParticleSystem() {}

/**
 * Default Export
 *
 * Use the default export for the module loaded by <shae-worker src="...">.
 */
export default compositionRegistry;
