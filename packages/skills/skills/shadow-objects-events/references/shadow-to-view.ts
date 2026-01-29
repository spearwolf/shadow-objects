// @ts-nocheck
/**
 * Shadow to View Event Communication
 *
 * This file demonstrates how to send events from Shadow Objects
 * back to the View Layer (DOM).
 */

import type {ShadowObjectCreationAPI} from '@spearwolf/shadow-objects';
import {on} from '@spearwolf/eventize';

// =============================================================================
// SHADOW OBJECT: Basic dispatchMessageToView
// =============================================================================

/**
 * A counter that notifies the View whenever its value changes.
 */
export function Counter({createSignal, createEffect, dispatchMessageToView, onViewEvent}: ShadowObjectCreationAPI) {
  const [count, setCount] = createSignal(0);

  // Automatically dispatch to View when count changes
  createEffect(() => {
    dispatchMessageToView('count-changed', {
      value: count(),
      timestamp: Date.now(),
    });
  });

  // Handle increment/decrement from View
  onViewEvent((type, data) => {
    if (type === 'increment') {
      setCount((c) => c + (data?.amount ?? 1));
    } else if (type === 'decrement') {
      setCount((c) => c - (data?.amount ?? 1));
    } else if (type === 'reset') {
      setCount(0);
    }
  });
}

// =============================================================================
// SHADOW OBJECT: Multiple Event Types
// =============================================================================

/**
 * A game controller that dispatches various event types to the View.
 */
export function GameController({createSignal, createEffect, dispatchMessageToView, onDestroy}: ShadowObjectCreationAPI) {
  const [score, setScore] = createSignal(0);
  const [health, setHealth] = createSignal(100);
  const [level, setLevel] = createSignal(1);
  const [gameState, setGameState] = createSignal<'playing' | 'paused' | 'gameover'>('playing');

  // Notify View of score changes
  createEffect(() => {
    dispatchMessageToView('score-update', {score: score()});
  });

  // Notify View of health changes
  createEffect(() => {
    const currentHealth = health();
    dispatchMessageToView('health-update', {health: currentHealth});

    if (currentHealth <= 0) {
      setGameState('gameover');
      dispatchMessageToView('game-over', {
        finalScore: score(),
        level: level(),
      });
    }
  });

  // Notify View of level changes
  createEffect(() => {
    dispatchMessageToView('level-changed', {
      level: level(),
      message: `Welcome to Level ${level()}!`,
    });
  });

  // Game state changes
  createEffect(() => {
    dispatchMessageToView('state-changed', {state: gameState()});
  });

  // Public methods for game logic
  function addScore(points: number) {
    setScore((s) => s + points);

    // Achievement notification
    if (score() >= 1000 && score() - points < 1000) {
      dispatchMessageToView('achievement-unlocked', {
        id: 'score-master',
        title: 'Score Master',
        description: 'Reached 1000 points!',
      });
    }
  }

  function takeDamage(amount: number) {
    setHealth((h) => Math.max(0, h - amount));
    dispatchMessageToView('damage-taken', {amount, remaining: health()});
  }
}

// =============================================================================
// SHADOW OBJECT: Transferable Objects (Large Data)
// =============================================================================

/**
 * Demonstrates sending large binary data back to the View efficiently.
 */
export function DataGenerator({dispatchMessageToView}: ShadowObjectCreationAPI) {
  function generateAndSendData(size: number) {
    // Create a large typed array
    const buffer = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      buffer[i] = Math.sin(i * 0.01) * Math.random();
    }

    // Transfer the buffer (zero-copy) instead of cloning
    dispatchMessageToView(
      'data-generated',
      {
        size,
        buffer: buffer.buffer,
        type: 'Float32Array',
      },
      [buffer.buffer], // Transferables array
    );

    // Note: buffer is now detached and can't be used here anymore
  }

  function sendImageData(width: number, height: number, pixels: Uint8ClampedArray) {
    dispatchMessageToView('render-frame', {width, height, pixels: pixels.buffer}, [pixels.buffer]);
  }
}

// =============================================================================
// SHADOW OBJECT: Broadcasting to Children
// =============================================================================

/**
 * A root controller that broadcasts events to the entire View hierarchy.
 * Use traverseChildren=true to reach all descendant ViewComponents.
 */
export function ThemeController({createSignal, dispatchMessageToView, onViewEvent}: ShadowObjectCreationAPI) {
  const [theme, setTheme] = createSignal<'light' | 'dark'>('light');

  onViewEvent((type, data) => {
    if (type === 'toggle-theme') {
      const newTheme = theme() === 'light' ? 'dark' : 'light';
      setTheme(newTheme);

      // Broadcast to this ViewComponent AND all children
      dispatchMessageToView(
        'theme-changed',
        {theme: newTheme},
        undefined, // no transferables
        true, // traverseChildren = true
      );
    }
  });
}

// =============================================================================
// VIEW LAYER: Receiving Events with eventize
// =============================================================================

/**
 * Example View Layer code showing how to listen for Shadow events.
 *
 * import { on } from '@spearwolf/eventize';
 *
 * // Get the <shae-ent> element
 * const gameEnt = document.querySelector('shae-ent[token="game-controller"]');
 *
 * // Subscribe to events from the Shadow Object
 * on(gameEnt.viewComponent, 'score-update', (data) => {
 *   document.getElementById('score').textContent = `Score: ${data.score}`;
 * });
 *
 * on(gameEnt.viewComponent, 'health-update', (data) => {
 *   const healthBar = document.getElementById('health-bar');
 *   healthBar.style.width = `${data.health}%`;
 * });
 *
 * on(gameEnt.viewComponent, 'game-over', (data) => {
 *   showGameOverModal(data.finalScore, data.level);
 * });
 *
 * on(gameEnt.viewComponent, 'achievement-unlocked', (data) => {
 *   showAchievementToast(data.title, data.description);
 * });
 */

// =============================================================================
// VIEW LAYER: Using forward-custom-events (DOM Events)
// =============================================================================

/**
 * HTML setup using forward-custom-events attribute.
 * Events are automatically converted to DOM CustomEvents.
 *
 * <!-- Forward ALL events as DOM CustomEvents -->
 * <shae-ent token="game-controller" forward-custom-events>
 *   <div id="game-ui">
 *     <span id="score">Score: 0</span>
 *     <div id="health-bar"></div>
 *   </div>
 * </shae-ent>
 *
 * <!-- Forward only specific events -->
 * <shae-ent
 *   token="game-controller"
 *   forward-custom-events="score-update,health-update,game-over"
 * >
 *   ...
 * </shae-ent>
 *
 * <script>
 *   const gameEnt = document.querySelector('shae-ent[token="game-controller"]');
 *
 *   // Standard DOM event listeners
 *   gameEnt.addEventListener('score-update', (e) => {
 *     document.getElementById('score').textContent = `Score: ${e.detail.score}`;
 *   });
 *
 *   gameEnt.addEventListener('health-update', (e) => {
 *     const healthBar = document.getElementById('health-bar');
 *     healthBar.style.width = `${e.detail.health}%`;
 *   });
 *
 *   gameEnt.addEventListener('game-over', (e) => {
 *     alert(`Game Over! Final Score: ${e.detail.finalScore}`);
 *   });
 * </script>
 */

// =============================================================================
// VIEW LAYER: Typed Event Listener Helper
// =============================================================================

/**
 * Type-safe event listener setup for the View Layer.
 */
interface GameEvents {
  'score-update': {score: number};
  'health-update': {health: number};
  'level-changed': {level: number; message: string};
  'game-over': {finalScore: number; level: number};
  'achievement-unlocked': {id: string; title: string; description: string};
  'damage-taken': {amount: number; remaining: number};
  'state-changed': {state: 'playing' | 'paused' | 'gameover'};
}

interface ShaeEntElement extends HTMLElement {
  viewComponent: object;
}

/**
 * Creates a type-safe event listener for Shadow Object events.
 */
function createShadowEventListener<T extends Record<string, unknown>>(elementSelector: string) {
  const element = document.querySelector(elementSelector) as ShaeEntElement | null;

  if (!element?.viewComponent) {
    throw new Error(`Element ${elementSelector} not found or not a <shae-ent>`);
  }

  return {
    on<K extends keyof T>(eventName: K, callback: (data: T[K]) => void) {
      on(element.viewComponent, eventName as string, callback);
    },
  };
}

// Usage example:
// const gameEvents = createShadowEventListener<GameEvents>('shae-ent[token="game"]');
// gameEvents.on('score-update', (data) => console.log(data.score));
// gameEvents.on('game-over', (data) => console.log(data.finalScore, data.level));

// =============================================================================
// PATTERN: Debounced Updates
// =============================================================================

/**
 * Demonstrates debouncing rapid updates before sending to View.
 * Useful for high-frequency state changes.
 */
export function PositionTracker({createSignal, createEffect, dispatchMessageToView, onDestroy}: ShadowObjectCreationAPI) {
  const [position, setPosition] = createSignal({x: 0, y: 0});

  let pendingUpdate: {x: number; y: number} | null = null;
  let frameId: number | null = null;

  // Debounce position updates to animation frame
  createEffect(() => {
    const pos = position();
    pendingUpdate = pos;

    if (frameId === null) {
      frameId = requestAnimationFrame(() => {
        if (pendingUpdate) {
          dispatchMessageToView('position-update', pendingUpdate);
          pendingUpdate = null;
        }
        frameId = null;
      });
    }
  });

  onDestroy(() => {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
    }
  });

  // Call this many times per frame - only one update sent
  function updatePosition(x: number, y: number) {
    setPosition({x, y});
  }
}
