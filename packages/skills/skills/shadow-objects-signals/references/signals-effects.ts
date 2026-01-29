// @ts-nocheck
/**
 * Signals and Effects Examples
 *
 * Comprehensive examples of reactive programming patterns
 * using createSignal, createEffect, and createMemo.
 */

import type {ShadowObjectCreationAPI} from '@spearwolf/shadow-objects';

// ============================================
// BASIC SIGNAL USAGE
// ============================================

/**
 * Counter with various Signal operations
 */
export function CounterDemo({createSignal, createEffect, onViewEvent, dispatchMessageToView}: ShadowObjectCreationAPI) {
  // Create a simple signal
  const count = createSignal(0);

  // Create a signal with object value
  const stats = createSignal({
    incrementCount: 0,
    decrementCount: 0,
    resetCount: 0,
  });

  // Effect: runs whenever count changes
  createEffect(() => {
    const currentCount = count();
    dispatchMessageToView('count-updated', {value: currentCount});
  });

  // Effect: runs whenever stats changes
  createEffect(() => {
    const currentStats = stats();
    dispatchMessageToView('stats-updated', currentStats);
  });

  // Handle events
  onViewEvent((type) => {
    switch (type) {
      case 'increment':
        count.set((c) => c + 1);
        stats.set((s) => ({...s, incrementCount: s.incrementCount + 1}));
        break;

      case 'decrement':
        count.set((c) => c - 1);
        stats.set((s) => ({...s, decrementCount: s.decrementCount + 1}));
        break;

      case 'reset':
        count.set(0);
        stats.set((s) => ({...s, resetCount: s.resetCount + 1}));
        break;
    }
  });
}

// ============================================
// PROPERTY BINDING
// ============================================

/**
 * Single Property Binding
 */
export function SinglePropertyDemo({useProperty, createEffect, dispatchMessageToView}: ShadowObjectCreationAPI) {
  // Bind to a single View property
  const title = useProperty<string>('title');
  const count = useProperty<number>('count');
  const enabled = useProperty<boolean>('enabled');

  createEffect(() => {
    dispatchMessageToView('properties-sync', {
      title: title() ?? 'Untitled',
      count: count() ?? 0,
      enabled: enabled() ?? true,
    });
  });
}

/**
 * Multiple Properties with useProperties
 */
export function MultiPropertyDemo({useProperties, createEffect, dispatchMessageToView}: ShadowObjectCreationAPI) {
  // Bind multiple properties at once with type mapping
  const props = useProperties<{
    x: number;
    y: number;
    z: number;
    scale: number;
    rotation: number;
    visible: boolean;
  }>({
    x: 'position-x',
    y: 'position-y',
    z: 'position-z',
    scale: 'object-scale',
    rotation: 'object-rotation',
    visible: 'is-visible',
  });

  createEffect(() => {
    dispatchMessageToView('transform-update', {
      position: {
        x: props.x() ?? 0,
        y: props.y() ?? 0,
        z: props.z() ?? 0,
      },
      scale: props.scale() ?? 1,
      rotation: props.rotation() ?? 0,
      visible: props.visible() ?? true,
    });
  });
}

// ============================================
// MEMOS (COMPUTED VALUES)
// ============================================

/**
 * Shopping Cart with derived state
 */
export function ShoppingCartDemo({
  createSignal,
  createMemo,
  createEffect,
  onViewEvent,
  dispatchMessageToView,
}: ShadowObjectCreationAPI) {
  // Core state
  const items = createSignal<
    Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
    }>
  >([]);

  const taxRate = createSignal(0.08);
  const discountCode = createSignal<string | null>(null);

  // Derived state with memos (cached computations)
  const itemCount = createMemo(() => items().reduce((sum, item) => sum + item.quantity, 0));

  const subtotal = createMemo(() => items().reduce((sum, item) => sum + item.price * item.quantity, 0));

  const discount = createMemo(() => {
    const code = discountCode();
    const sub = subtotal();
    if (code === 'SAVE10') return sub * 0.1;
    if (code === 'SAVE20') return sub * 0.2;
    return 0;
  });

  const afterDiscount = createMemo(() => subtotal() - discount());

  const tax = createMemo(() => afterDiscount() * taxRate());

  const total = createMemo(() => afterDiscount() + tax());

  // Effect only runs when derived values change
  createEffect(() => {
    dispatchMessageToView('cart-summary', {
      itemCount: itemCount(),
      subtotal: subtotal().toFixed(2),
      discount: discount().toFixed(2),
      tax: tax().toFixed(2),
      total: total().toFixed(2),
    });
  });

  // Handle cart operations
  onViewEvent((type, data) => {
    switch (type) {
      case 'add-item':
        items.set((current) => [...current, data as any]);
        break;

      case 'remove-item':
        items.set((current) => current.filter((item) => item.id !== data?.id));
        break;

      case 'update-quantity':
        items.set((current) => current.map((item) => (item.id === data?.id ? {...item, quantity: data.quantity} : item)));
        break;

      case 'apply-discount':
        discountCode.set(data?.code ?? null);
        break;

      case 'clear-cart':
        items.set([]);
        discountCode.set(null);
        break;
    }
  });
}

// ============================================
// DEPENDENCY TRACKING
// ============================================

/**
 * Conditional Dependency Demo
 *
 * Shows how dependencies are tracked based on execution path.
 */
export function ConditionalDepsDemo({createSignal, createEffect}: ShadowObjectCreationAPI) {
  const mode = createSignal<'a' | 'b'>('a');
  const valueA = createSignal(100);
  const valueB = createSignal(200);

  createEffect(() => {
    // 'mode' is always tracked
    if (mode() === 'a') {
      // 'valueA' only tracked when mode is 'a'
      console.log('Mode A, value:', valueA());
    } else {
      // 'valueB' only tracked when mode is 'b'
      console.log('Mode B, value:', valueB());
    }
  });

  // Changing valueB won't trigger effect while mode is 'a'
}

/**
 * Early Return Pattern
 *
 * Signals read after early return are not tracked.
 */
export function EarlyReturnDemo({createSignal, createEffect}: ShadowObjectCreationAPI) {
  const enabled = createSignal(false);
  const data = createSignal('some data');

  createEffect(() => {
    // 'enabled' is always tracked
    if (!enabled()) {
      return; // Early return when disabled
    }

    // 'data' is only tracked when enabled is true
    console.log('Processing:', data());
  });
}

// ============================================
// ADVANCED PATTERNS
// ============================================

/**
 * Debounced Search
 */
export function DebouncedSearchDemo({
  useProperty,
  createSignal,
  createEffect,
  dispatchMessageToView,
  onDestroy,
}: ShadowObjectCreationAPI) {
  const searchInput = useProperty<string>('search');
  const debouncedSearch = createSignal('');
  const isSearching = createSignal(false);
  const results = createSignal<string[]>([]);

  let debounceTimer: ReturnType<typeof setTimeout>;

  // Debounce the search input
  createEffect(() => {
    const input = searchInput() ?? '';

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debouncedSearch.set(input);
    }, 300);
  });

  // Perform search when debounced value changes
  createEffect(() => {
    const query = debouncedSearch();
    if (!query) {
      results.set([]);
      return;
    }

    isSearching.set(true);

    // Simulate async search
    setTimeout(() => {
      results.set([`Result 1 for "${query}"`, `Result 2 for "${query}"`]);
      isSearching.set(false);
    }, 500);
  });

  // Update View
  createEffect(() => {
    dispatchMessageToView('search-state', {
      query: debouncedSearch(),
      isSearching: isSearching(),
      results: results(),
    });
  });

  onDestroy(() => clearTimeout(debounceTimer));
}

/**
 * Previous Value Comparison
 */
export function ValueComparisonDemo({useProperty, createSignal, createEffect, dispatchMessageToView}: ShadowObjectCreationAPI) {
  const currentValue = useProperty<number>('value');
  const previousValue = createSignal<number | null>(null);

  createEffect(() => {
    const current = currentValue() ?? 0;
    const previous = previousValue();

    if (previous !== null) {
      const delta = current - previous;
      const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'unchanged';

      dispatchMessageToView('value-change', {
        current,
        previous,
        delta,
        direction,
      });
    }

    // Store current as previous for next comparison
    previousValue.set(current);
  });
}

/**
 * Batched Updates
 *
 * Multiple signal updates in same sync block are batched.
 */
export function BatchedUpdatesDemo({createSignal, createEffect, onViewEvent}: ShadowObjectCreationAPI) {
  const x = createSignal(0);
  const y = createSignal(0);
  const z = createSignal(0);

  let effectRunCount = 0;

  createEffect(() => {
    // This effect depends on all three signals
    console.log(`Effect run #${++effectRunCount}: x=${x()}, y=${y()}, z=${z()}`);
  });

  onViewEvent((type) => {
    if (type === 'update-all') {
      // These three updates happen in the same sync block,
      // so the effect only runs ONCE after all updates
      x.set(1);
      y.set(2);
      z.set(3);
      // Effect runs once with x=1, y=2, z=3
    }
  });
}

// ============================================
// SIGNAL COMPOSITION
// ============================================

/**
 * Signal-based State Machine
 */
export function StateMachineDemo({
  createSignal,
  createMemo,
  createEffect,
  onViewEvent,
  dispatchMessageToView,
}: ShadowObjectCreationAPI) {
  type State = 'idle' | 'loading' | 'success' | 'error';

  const state = createSignal<State>('idle');
  const data = createSignal<unknown>(null);
  const error = createSignal<string | null>(null);

  // Derived state
  const isLoading = createMemo(() => state() === 'loading');
  const hasData = createMemo(() => state() === 'success' && data() !== null);
  const hasError = createMemo(() => state() === 'error' && error() !== null);

  // State transitions
  const actions = {
    startLoading: () => {
      state.set('loading');
      error.set(null);
    },
    setSuccess: (newData: unknown) => {
      data.set(newData);
      state.set('success');
    },
    setError: (message: string) => {
      error.set(message);
      state.set('error');
    },
    reset: () => {
      state.set('idle');
      data.set(null);
      error.set(null);
    },
  };

  // Sync to View
  createEffect(() => {
    dispatchMessageToView('state-update', {
      state: state(),
      isLoading: isLoading(),
      hasData: hasData(),
      hasError: hasError(),
      data: data(),
      error: error(),
    });
  });

  onViewEvent((type, eventData) => {
    switch (type) {
      case 'fetch':
        actions.startLoading();
        // Simulate fetch
        setTimeout(() => {
          if (Math.random() > 0.3) {
            actions.setSuccess({id: 1, name: 'Fetched Data'});
          } else {
            actions.setError('Network error');
          }
        }, 1000);
        break;
      case 'reset':
        actions.reset();
        break;
    }
  });
}

// ============================================
// REGISTRY
// ============================================

export default {
  define: {
    'counter-demo': CounterDemo,
    'single-property-demo': SinglePropertyDemo,
    'multi-property-demo': MultiPropertyDemo,
    'shopping-cart-demo': ShoppingCartDemo,
    'conditional-deps-demo': ConditionalDepsDemo,
    'early-return-demo': EarlyReturnDemo,
    'debounced-search-demo': DebouncedSearchDemo,
    'value-comparison-demo': ValueComparisonDemo,
    'batched-updates-demo': BatchedUpdatesDemo,
    'state-machine-demo': StateMachineDemo,
  },
};
