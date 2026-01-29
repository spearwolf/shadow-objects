// @ts-nocheck
/**
 * Memos and Computed Values
 *
 * createMemo creates cached computed values that only
 * recalculate when their dependencies change.
 */

import type {ShadowObjectCreationAPI} from '@spearwolf/shadow-objects';

// ============================================
// BASIC MEMOS
// ============================================

/**
 * Simple Computed Values
 */
export function BasicMemosDemo({createSignal, createMemo, createEffect}: ShadowObjectCreationAPI) {
  const firstName = createSignal('John');
  const lastName = createSignal('Doe');

  // Memo: fullName only recomputes when firstName or lastName changes
  const fullName = createMemo(() => `${firstName()} ${lastName()}`);

  // Memo can depend on other memos
  const greeting = createMemo(() => `Hello, ${fullName()}!`);

  createEffect(() => {
    console.log(greeting()); // "Hello, John Doe!"
  });

  // Later: only firstName changed, fullName and greeting recompute
  firstName.set('Jane'); // greeting becomes "Hello, Jane Doe!"
}

// ============================================
// EXPENSIVE COMPUTATIONS
// ============================================

/**
 * Caching Expensive Operations
 */
export function ExpensiveComputationDemo({
  createSignal,
  createMemo,
  createEffect,
  dispatchMessageToView,
}: ShadowObjectCreationAPI) {
  const items = createSignal<number[]>([]);
  const filterThreshold = createSignal(50);
  const sortOrder = createSignal<'asc' | 'desc'>('asc');

  // Each memo caches its result until dependencies change

  // Step 1: Filter (expensive for large arrays)
  const filteredItems = createMemo(() => {
    console.log('Filtering...'); // Only logs when items or threshold changes
    const threshold = filterThreshold();
    return items().filter((item) => item > threshold);
  });

  // Step 2: Sort (expensive for large arrays)
  const sortedItems = createMemo(() => {
    console.log('Sorting...'); // Only logs when filteredItems or sortOrder changes
    const order = sortOrder();
    return [...filteredItems()].sort((a, b) => (order === 'asc' ? a - b : b - a));
  });

  // Step 3: Statistics (depends on filtered data)
  const stats = createMemo(() => {
    const filtered = filteredItems();
    if (filtered.length === 0) {
      return {count: 0, sum: 0, avg: 0, min: 0, max: 0};
    }
    const sum = filtered.reduce((a, b) => a + b, 0);
    return {
      count: filtered.length,
      sum,
      avg: sum / filtered.length,
      min: Math.min(...filtered),
      max: Math.max(...filtered),
    };
  });

  // Only this effect runs when any computed value changes
  createEffect(() => {
    dispatchMessageToView('data-update', {
      items: sortedItems(),
      stats: stats(),
    });
  });

  // Example updates:
  // - Changing sortOrder only triggers sorting, not filtering
  // - Changing filterThreshold triggers both filtering and sorting
  // - Changing items triggers everything
}

// ============================================
// MEMO CHAINS
// ============================================

/**
 * Game Score System with Memo Chain
 */
export function ScoreSystemDemo({createSignal, createMemo, createEffect, dispatchMessageToView}: ShadowObjectCreationAPI) {
  // Base stats
  const baseScore = createSignal(0);
  const multiplier = createSignal(1);
  const bonusPoints = createSignal(0);
  const penaltyPoints = createSignal(0);

  // Computed scores (each depends on previous)
  const rawScore = createMemo(() => baseScore() * multiplier());

  const scoreWithBonus = createMemo(() => rawScore() + bonusPoints());

  const finalScore = createMemo(() => Math.max(0, scoreWithBonus() - penaltyPoints()));

  // Grade based on final score
  const grade = createMemo(() => {
    const score = finalScore();
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  });

  // High score check
  const highScore = createSignal(0);
  const isNewHighScore = createMemo(() => finalScore() > highScore());

  createEffect(() => {
    dispatchMessageToView('score-update', {
      rawScore: rawScore(),
      bonus: bonusPoints(),
      penalty: penaltyPoints(),
      final: finalScore(),
      grade: grade(),
      isNewHighScore: isNewHighScore(),
    });

    // Update high score if beaten
    if (isNewHighScore()) {
      highScore.set(finalScore());
    }
  });
}

// ============================================
// OBJECT AND ARRAY MEMOS
// ============================================

/**
 * Derived Collections
 */
export function CollectionMemosDemo({createSignal, createMemo}: ShadowObjectCreationAPI) {
  interface Todo {
    id: number;
    text: string;
    completed: boolean;
    priority: 'low' | 'medium' | 'high';
  }

  const todos = createSignal<Todo[]>([]);
  const filter = createSignal<'all' | 'active' | 'completed'>('all');
  const searchQuery = createSignal('');

  // Filtered by completion status
  const filteredByStatus = createMemo(() => {
    const f = filter();
    const items = todos();
    if (f === 'all') return items;
    return items.filter((t) => (f === 'completed' ? t.completed : !t.completed));
  });

  // Further filtered by search
  const filteredBySearch = createMemo(() => {
    const query = searchQuery().toLowerCase();
    if (!query) return filteredByStatus();
    return filteredByStatus().filter((t) => t.text.toLowerCase().includes(query));
  });

  // Grouped by priority
  const groupedByPriority = createMemo(() => {
    const items = filteredBySearch();
    return {
      high: items.filter((t) => t.priority === 'high'),
      medium: items.filter((t) => t.priority === 'medium'),
      low: items.filter((t) => t.priority === 'low'),
    };
  });

  // Statistics
  const todoStats = createMemo(() => {
    const all = todos();
    return {
      total: all.length,
      completed: all.filter((t) => t.completed).length,
      active: all.filter((t) => !t.completed).length,
      highPriority: all.filter((t) => t.priority === 'high' && !t.completed).length,
    };
  });
}

// ============================================
// CONDITIONAL MEMOS
// ============================================

/**
 * Feature-Flag Controlled Computation
 */
export function ConditionalMemoDemo({createSignal, createMemo, createEffect}: ShadowObjectCreationAPI) {
  const enableAdvancedStats = createSignal(false);
  const data = createSignal<number[]>([1, 2, 3, 4, 5]);

  // Basic stats always computed
  const basicStats = createMemo(() => {
    const d = data();
    return {
      count: d.length,
      sum: d.reduce((a, b) => a + b, 0),
    };
  });

  // Advanced stats only computed when feature is enabled
  const advancedStats = createMemo(() => {
    if (!enableAdvancedStats()) {
      return null; // Skip expensive computation
    }

    const d = data();
    const mean = d.reduce((a, b) => a + b, 0) / d.length;
    const variance = d.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / d.length;

    return {
      mean,
      variance,
      stdDev: Math.sqrt(variance),
      median: [...d].sort((a, b) => a - b)[Math.floor(d.length / 2)],
    };
  });

  createEffect(() => {
    console.log('Basic:', basicStats());
    console.log('Advanced:', advancedStats());
  });
}

// ============================================
// MEMO VS EFFECT
// ============================================

/**
 * When to Use Memo vs Effect
 *
 * Memo: For derived/computed VALUES that other code will read
 * Effect: For SIDE EFFECTS (logging, DOM updates, API calls)
 */
export function MemoVsEffectDemo({createSignal, createMemo, createEffect, dispatchMessageToView}: ShadowObjectCreationAPI) {
  const price = createSignal(100);
  const quantity = createSignal(2);
  const taxRate = createSignal(0.08);

  // USE MEMO: This is a derived value other code needs to read
  const subtotal = createMemo(() => price() * quantity());
  const tax = createMemo(() => subtotal() * taxRate());
  const total = createMemo(() => subtotal() + tax());

  // USE EFFECT: This performs a side effect (sending to View)
  createEffect(() => {
    dispatchMessageToView('price-update', {
      subtotal: subtotal(),
      tax: tax(),
      total: total(),
    });
  });

  // USE EFFECT: This performs a side effect (logging)
  createEffect(() => {
    if (total() > 1000) {
      console.log('High value order:', total());
    }
  });

  // DON'T: Use memo for side effects (bad practice)
  // const badMemo = createMemo(() => {
  //   console.log('Side effect in memo!'); // BAD!
  //   return price() * quantity();
  // });
}

// ============================================
// REGISTRY
// ============================================

export default {
  define: {
    'basic-memos': BasicMemosDemo,
    'expensive-computation': ExpensiveComputationDemo,
    'score-system': ScoreSystemDemo,
    'collection-memos': CollectionMemosDemo,
    'conditional-memo': ConditionalMemoDemo,
    'memo-vs-effect': MemoVsEffectDemo,
  },
};
