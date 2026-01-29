// @ts-nocheck
/**
 * Cleanup Patterns
 *
 * Best practices for cleaning up resources when Shadow Objects
 * are destroyed or when conditions change.
 */

import type {ShadowObjectCreationAPI} from '@spearwolf/shadow-objects';

// ============================================
// TIMER CLEANUP
// ============================================

/**
 * Interval Timer Cleanup
 */
export function IntervalCleanup({createSignal, createEffect, dispatchMessageToView, onDestroy}: ShadowObjectCreationAPI) {
  const elapsed = createSignal(0);

  // Create interval
  const intervalId = setInterval(() => {
    elapsed.set((e) => e + 1);
  }, 1000);

  // Sync to View
  createEffect(() => {
    dispatchMessageToView('timer-tick', {elapsed: elapsed()});
  });

  // CRITICAL: Clean up interval on destroy
  onDestroy(() => {
    clearInterval(intervalId);
  });
}

/**
 * Timeout Cleanup
 */
export function TimeoutCleanup({createSignal, onViewEvent, onDestroy}: ShadowObjectCreationAPI) {
  const pendingTimeouts = createSignal<number[]>([]);

  onViewEvent((type, data) => {
    if (type === 'schedule') {
      const timeoutId = setTimeout(() => {
        console.log('Timeout fired:', data?.message);
        // Remove from pending
        pendingTimeouts.set((t) => t.filter((id) => id !== timeoutId));
      }, data?.delay ?? 1000);

      pendingTimeouts.set((t) => [...t, timeoutId]);
    }
  });

  // Clean up ALL pending timeouts
  onDestroy(() => {
    pendingTimeouts().forEach((id) => clearTimeout(id));
  });
}

/**
 * Animation Frame Cleanup
 */
export function AnimationFrameCleanup({createSignal, createEffect, onDestroy}: ShadowObjectCreationAPI) {
  const isRunning = createSignal(true);
  let rafId: number;

  const animate = () => {
    if (!isRunning()) return;

    // Do animation work...
    console.log('Frame');

    rafId = requestAnimationFrame(animate);
  };

  // Start animation loop
  rafId = requestAnimationFrame(animate);

  onDestroy(() => {
    isRunning.set(false);
    cancelAnimationFrame(rafId);
  });
}

// ============================================
// EVENT LISTENER CLEANUP
// ============================================

/**
 * Window Event Listener Cleanup
 */
export function WindowEventCleanup({createSignal, createEffect, dispatchMessageToView, onDestroy}: ShadowObjectCreationAPI) {
  const windowSize = createSignal({width: 0, height: 0});

  // Event handler (must be same reference for removal)
  const handleResize = () => {
    windowSize.set({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  };

  // Add listener
  window.addEventListener('resize', handleResize);

  // Initial size
  handleResize();

  // Sync to View
  createEffect(() => {
    dispatchMessageToView('window-resize', windowSize());
  });

  // CRITICAL: Remove listener on destroy
  onDestroy(() => {
    window.removeEventListener('resize', handleResize);
  });
}

/**
 * Multiple Event Listeners Cleanup
 */
export function MultipleListenersCleanup({onDestroy}: ShadowObjectCreationAPI) {
  const handleKeyDown = (e: KeyboardEvent) => console.log('Key down:', e.key);
  const handleKeyUp = (e: KeyboardEvent) => console.log('Key up:', e.key);
  const handleMouseMove = (e: MouseEvent) => console.log('Mouse:', e.x, e.y);

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('mousemove', handleMouseMove);

  // Clean up all listeners
  onDestroy(() => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('mousemove', handleMouseMove);
  });
}

/**
 * AbortController Pattern (Modern Approach)
 */
export function AbortControllerCleanup({dispatchMessageToView, onDestroy}: ShadowObjectCreationAPI) {
  const controller = new AbortController();

  // Add listeners with signal
  window.addEventListener('resize', () => dispatchMessageToView('resize', {}), {signal: controller.signal});

  window.addEventListener('scroll', () => dispatchMessageToView('scroll', {}), {signal: controller.signal});

  document.addEventListener('visibilitychange', () => dispatchMessageToView('visibility', {}), {signal: controller.signal});

  // Single abort removes ALL listeners
  onDestroy(() => {
    controller.abort();
  });
}

// ============================================
// NETWORK CLEANUP
// ============================================

/**
 * Fetch Request Cleanup
 */
export function FetchCleanup({
  useProperty,
  createSignal,
  createEffect,
  dispatchMessageToView,
  onDestroy,
}: ShadowObjectCreationAPI) {
  const url = useProperty<string>('url');
  const data = createSignal<unknown>(null);
  const loading = createSignal(false);
  const error = createSignal<string | null>(null);

  // AbortController for fetch
  let abortController: AbortController | null = null;

  createEffect(() => {
    const fetchUrl = url();
    if (!fetchUrl) return;

    // Abort previous request
    abortController?.abort();
    abortController = new AbortController();

    loading.set(true);
    error.set(null);

    fetch(fetchUrl, {signal: abortController.signal})
      .then((res) => res.json())
      .then((json) => {
        data.set(json);
        loading.set(false);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          error.set(err.message);
          loading.set(false);
        }
      });
  });

  createEffect(() => {
    dispatchMessageToView('fetch-state', {
      data: data(),
      loading: loading(),
      error: error(),
    });
  });

  // Abort on destroy
  onDestroy(() => {
    abortController?.abort();
  });
}

/**
 * WebSocket Cleanup
 */
export function WebSocketCleanup({useProperty, createSignal, onDestroy}: ShadowObjectCreationAPI) {
  const wsUrl = useProperty<string>('ws-url');
  const socket = createSignal<WebSocket | null>(null);

  // Connect when URL is available
  const currentUrl = wsUrl();
  if (currentUrl) {
    const ws = new WebSocket(currentUrl);
    socket.set(ws);
  }

  // Clean up WebSocket
  onDestroy(() => {
    const ws = socket();
    if (ws) {
      ws.close(1000, 'Component destroyed');
    }
  });
}

// ============================================
// SUBSCRIPTION CLEANUP
// ============================================

/**
 * Event Emitter Subscription Cleanup
 */
export function SubscriptionCleanup({useContext, createEffect, onDestroy}: ShadowObjectCreationAPI) {
  const eventBus = useContext<EventEmitter>('event-bus');
  const subscriptions: Array<() => void> = [];

  if (eventBus) {
    // Subscribe to events
    subscriptions.push(
      eventBus.on('user-login', (user) => {
        console.log('User logged in:', user);
      }),
    );

    subscriptions.push(
      eventBus.on('notification', (msg) => {
        console.log('Notification:', msg);
      }),
    );
  }

  // Unsubscribe all
  onDestroy(() => {
    subscriptions.forEach((unsub) => unsub());
  });
}

// Event emitter type stub
interface EventEmitter {
  on(event: string, handler: (data: unknown) => void): () => void;
}

// ============================================
// GRAPHICS CLEANUP
// ============================================

/**
 * Three.js Complete Cleanup
 */
export function ThreeJsCleanup({useContext, createSignal, onDestroy}: ShadowObjectCreationAPI) {
  const getScene = useContext<() => {add: Function; remove: Function}>('scene');

  // Track all created objects
  const geometries = createSignal<Array<{dispose: () => void}>>([]);
  const materials = createSignal<Array<{dispose: () => void}>>([]);
  const textures = createSignal<Array<{dispose: () => void}>>([]);
  const meshes = createSignal<Array<{removeFromParent: () => void}>>([]);

  // Helper to track created resources
  const trackGeometry = (geo: {dispose: () => void}) => {
    geometries.set((g) => [...g, geo]);
    return geo;
  };

  const trackMaterial = (mat: {dispose: () => void}) => {
    materials.set((m) => [...m, mat]);
    return mat;
  };

  const trackTexture = (tex: {dispose: () => void}) => {
    textures.set((t) => [...t, tex]);
    return tex;
  };

  const trackMesh = (mesh: {removeFromParent: () => void}) => {
    meshes.set((m) => [...m, mesh]);
    return mesh;
  };

  // Comprehensive cleanup
  onDestroy(() => {
    // Remove meshes from scene first
    meshes().forEach((mesh) => mesh.removeFromParent());

    // Dispose in reverse dependency order
    materials().forEach((mat) => mat.dispose());
    geometries().forEach((geo) => geo.dispose());
    textures().forEach((tex) => tex.dispose());
  });

  return {trackGeometry, trackMaterial, trackTexture, trackMesh};
}

// ============================================
// CLEANUP PATTERNS SUMMARY
// ============================================

/**
 * Cleanup Checklist Shadow Object
 *
 * Template showing all common cleanup patterns.
 */
export function CleanupChecklist({createSignal, createEffect, onDestroy}: ShadowObjectCreationAPI) {
  // 1. TIMERS
  const intervalId = setInterval(() => {}, 1000);
  const timeoutId = setTimeout(() => {}, 5000);
  let rafId = requestAnimationFrame(function loop() {
    rafId = requestAnimationFrame(loop);
  });

  // 2. EVENT LISTENERS
  const handleResize = () => {};
  window.addEventListener('resize', handleResize);

  // 3. ABORT CONTROLLER (for fetch and listeners)
  const controller = new AbortController();
  fetch('/api/data', {signal: controller.signal});

  // 4. WEBSOCKET
  const socket = new WebSocket('wss://example.com');

  // 5. SUBSCRIPTIONS (if using external libraries)
  // const subscription = observable.subscribe(...);

  // 6. GRAPHICS RESOURCES
  // const geometry = new THREE.BoxGeometry();
  // const material = new THREE.MeshBasicMaterial();

  // CLEANUP ALL
  onDestroy(() => {
    // 1. Timers
    clearInterval(intervalId);
    clearTimeout(timeoutId);
    cancelAnimationFrame(rafId);

    // 2. Event listeners
    window.removeEventListener('resize', handleResize);

    // 3. Abort controller
    controller.abort();

    // 4. WebSocket
    socket.close();

    // 5. Subscriptions
    // subscription.unsubscribe();

    // 6. Graphics
    // geometry.dispose();
    // material.dispose();
  });
}

// ============================================
// REGISTRY
// ============================================

export default {
  define: {
    'interval-cleanup': IntervalCleanup,
    'timeout-cleanup': TimeoutCleanup,
    'animation-frame-cleanup': AnimationFrameCleanup,
    'window-event-cleanup': WindowEventCleanup,
    'multiple-listeners-cleanup': MultipleListenersCleanup,
    'abort-controller-cleanup': AbortControllerCleanup,
    'fetch-cleanup': FetchCleanup,
    'websocket-cleanup': WebSocketCleanup,
    'subscription-cleanup': SubscriptionCleanup,
    'threejs-cleanup': ThreeJsCleanup,
    'cleanup-checklist': CleanupChecklist,
  },
};
