---
name: shadow-objects-signals
description: Master reactive programming with Signals, Effects, and Memos in Shadow Objects. Use this skill when implementing reactive state management, creating computed values, binding View properties to Shadow Object logic, or understanding automatic dependency tracking with @spearwolf/signalize.
---

# Shadow Objects Signals

Signals are the foundation of reactivity in Shadow Objects. They provide automatic dependency tracking, efficient updates, and a clean mental model for state management.

## When to Use This Skill

Use this skill when:

- Creating reactive local state in Shadow Objects
- Binding to View properties with `useProperty`
- Creating computed/derived values with `createMemo`
- Running side effects with `createEffect`
- Understanding automatic dependency tracking
- Optimizing reactive performance

## Core Concepts

### What is a Signal?

A Signal is a reactive container for a value. When you read a Signal inside an Effect or Memo, a dependency is automatically tracked. When the Signal's value changes, all dependents re-run.

```typescript
const count = createSignal(0);

// Read: count()
console.log(count()); // 0

// Write: count.set(value) or count.set(fn)
count.set(1);
count.set(c => c + 1);
```

### The Reactive Primitives

| Primitive | Purpose | Re-runs when... |
|-----------|---------|-----------------|
| `createSignal` | Holds state | Never (it's the source) |
| `useProperty` | Reads View property as Signal | View property changes |
| `createEffect` | Runs side effects | Any read Signal changes |
| `createMemo` | Computes derived values | Any read Signal changes |

## Creating Signals

### `createSignal` - Local State

```typescript
export function Counter({ createSignal }: ShadowObjectCreationAPI) {
  // Simple value
  const count = createSignal(0);
  
  // Object state
  const player = createSignal({
    name: 'Hero',
    health: 100,
    position: { x: 0, y: 0 },
  });
  
  // Read
  console.log(count());           // 0
  console.log(player().name);     // 'Hero'
  
  // Write with value
  count.set(10);
  
  // Write with updater function (recommended for derived updates)
  count.set(c => c + 1);
  player.set(p => ({ ...p, health: p.health - 10 }));
}
```

### `useProperty` - View Property Binding

```typescript
export function Player({ useProperty }: ShadowObjectCreationAPI) {
  // Single property
  const name = useProperty<string>('player-name');
  const health = useProperty<number>('health');
  
  // Reading (returns undefined if not set)
  const playerName = name() ?? 'Unknown';
  const currentHealth = health() ?? 100;
}
```

### `useProperties` - Multiple Properties

```typescript
export function Sprite({
  useProperties,
}: ShadowObjectCreationAPI) {
  // Map multiple properties at once
  const props = useProperties<{
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
  }>({
    x: 'position-x',      // property name in View
    y: 'position-y',
    width: 'sprite-width',
    height: 'sprite-height',
    visible: 'is-visible',
  });
  
  // Each is a Signal
  const x = props.x() ?? 0;
  const y = props.y() ?? 0;
  const visible = props.visible() ?? true;
}
```

## Creating Effects

Effects run side effects whenever their dependencies change. Dependencies are automatically tracked.

### Basic Effect

```typescript
export function Logger({
  useProperty,
  createEffect,
}: ShadowObjectCreationAPI) {
  const message = useProperty<string>('message');
  
  // Runs immediately, then re-runs when message() changes
  createEffect(() => {
    console.log('Message:', message());
  });
}
```

### Effect with Multiple Dependencies

```typescript
export function PositionTracker({
  useProperty,
  createEffect,
  dispatchMessageToView,
}: ShadowObjectCreationAPI) {
  const x = useProperty<number>('x');
  const y = useProperty<number>('y');
  
  // Re-runs when EITHER x() OR y() changes
  createEffect(() => {
    const position = { x: x() ?? 0, y: y() ?? 0 };
    dispatchMessageToView('position-changed', position);
  });
}
```

### Conditional Dependencies

Only Signals actually read during execution are tracked:

```typescript
createEffect(() => {
  if (isEnabled()) {
    // 'value' is only tracked when isEnabled() is true
    console.log(value());
  }
});
```

## Creating Memos

Memos compute derived values that are cached and only recomputed when dependencies change.

### Basic Memo

```typescript
export function Player({
  useProperty,
  createMemo,
}: ShadowObjectCreationAPI) {
  const health = useProperty<number>('health');
  const maxHealth = useProperty<number>('max-health');
  
  // Computed value - cached until health or maxHealth changes
  const healthPercent = createMemo(() => {
    const h = health() ?? 0;
    const max = maxHealth() ?? 100;
    return Math.round((h / max) * 100);
  });
  
  // Use like a Signal
  console.log(healthPercent()); // e.g., 75
}
```

### Memo with Complex Computation

```typescript
export function Inventory({
  useProperty,
  createMemo,
}: ShadowObjectCreationAPI) {
  const items = useProperty<Item[]>('items');
  
  // Only recomputes when items change
  const totalWeight = createMemo(() => {
    return (items() ?? []).reduce((sum, item) => sum + item.weight, 0);
  });
  
  const totalValue = createMemo(() => {
    return (items() ?? []).reduce((sum, item) => sum + item.value, 0);
  });
  
  // Memo depending on other memos
  const canCarryMore = createMemo(() => {
    return totalWeight() < 100; // max weight capacity
  });
}
```

## Dependency Tracking Rules

### Rule 1: Only Synchronous Reads are Tracked

```typescript
// GOOD: Synchronous read - tracked
createEffect(() => {
  const value = count(); // tracked
  console.log(value);
});

// BAD: Async read - NOT tracked
createEffect(() => {
  setTimeout(() => {
    const value = count(); // NOT tracked!
  }, 1000);
});
```

### Rule 2: Read During Execution

```typescript
const a = createSignal(1);
const b = createSignal(2);
const condition = createSignal(true);

createEffect(() => {
  if (condition()) {
    console.log(a()); // tracked when condition is true
  } else {
    console.log(b()); // tracked when condition is false
  }
  // 'condition' is always tracked
});
```

### Rule 3: Effects Don't Track Writes

```typescript
createEffect(() => {
  const value = input(); // tracked (read)
  output.set(value * 2); // NOT tracked (write)
});
```

## Common Patterns

### Pattern 1: Derived State

```typescript
export function ShoppingCart({ createSignal, createMemo }) {
  const items = createSignal<CartItem[]>([]);
  const taxRate = createSignal(0.08);
  
  const subtotal = createMemo(() =>
    items().reduce((sum, item) => sum + item.price * item.qty, 0)
  );
  
  const tax = createMemo(() => subtotal() * taxRate());
  
  const total = createMemo(() => subtotal() + tax());
}
```

### Pattern 2: Debounced Effect

```typescript
export function Search({
  useProperty,
  createSignal,
  createEffect,
  onDestroy,
}) {
  const searchTerm = useProperty<string>('search');
  const debouncedTerm = createSignal('');
  
  let timeoutId: number;
  
  createEffect(() => {
    const term = searchTerm() ?? '';
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      debouncedTerm.set(term);
    }, 300);
  });
  
  // Use debouncedTerm for actual search
  createEffect(() => {
    const term = debouncedTerm();
    if (term) {
      performSearch(term);
    }
  });
  
  onDestroy(() => clearTimeout(timeoutId));
}
```

### Pattern 3: Previous Value Tracking

```typescript
export function Transition({
  useProperty,
  createSignal,
  createEffect,
}) {
  const value = useProperty<number>('value');
  const previousValue = createSignal<number | undefined>(undefined);
  
  createEffect(() => {
    const current = value();
    const previous = previousValue();
    
    if (previous !== undefined && current !== previous) {
      console.log(`Changed from ${previous} to ${current}`);
    }
    
    // Update previous after processing
    previousValue.set(current);
  });
}
```

### Pattern 4: Conditional Activation

```typescript
export function OptionalFeature({
  useProperty,
  createSignal,
  createEffect,
}) {
  const enabled = useProperty<boolean>('enabled');
  const data = useProperty<string>('data');
  
  createEffect(() => {
    // Only process data when enabled
    if (!enabled()) return;
    
    const value = data();
    console.log('Processing:', value);
  });
}
```

## Performance Tips

### 1. Keep Signals Granular

```typescript
// BAD: Entire object updates on any change
const state = createSignal({ x: 0, y: 0, health: 100 });

// GOOD: Independent signals for independent values
const x = createSignal(0);
const y = createSignal(0);
const health = createSignal(100);
```

### 2. Use Memos for Expensive Computations

```typescript
// BAD: Recomputes every time ANY dependency changes
createEffect(() => {
  const filtered = items().filter(complexFilterFn); // expensive
  const sorted = filtered.sort(complexSortFn);      // expensive
  render(sorted);
});

// GOOD: Cache intermediate results
const filtered = createMemo(() => items().filter(complexFilterFn));
const sorted = createMemo(() => filtered().sort(complexSortFn));

createEffect(() => {
  render(sorted()); // Only runs when sorted actually changes
});
```

### 3. Avoid Creating Signals in Effects

```typescript
// BAD: Creates new signal on every effect run
createEffect(() => {
  const temp = createSignal(count()); // Don't do this!
});

// GOOD: Create signals in setup phase
const temp = createSignal(0);
createEffect(() => {
  temp.set(count());
});
```

## Best Practices

1. **Prefer updater functions**: Use `count.set(c => c + 1)` over reading and writing
2. **Keep effects focused**: One effect per concern
3. **Use memos for derived data**: Don't duplicate computed logic
4. **Clean up external resources**: Use `onDestroy` for timers, subscriptions
5. **Type your signals**: `createSignal<MyType>(initialValue)`

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Async code not tracking | Move Signal reads outside async callbacks |
| Infinite loops | Don't read and write same Signal in effect without guard |
| Stale closures | Read Signals inside effects, not in setup |
| Memory leaks | Clean up timers/subscriptions in `onDestroy` |
| Over-rendering | Use Memos to cache expensive computations |

## Complete Example

See [references/signals-effects.ts](references/signals-effects.ts) for comprehensive examples.

## Related Skills

- **shadow-objects-basics**: Understanding the Shadow Object model
- **shadow-objects-context**: Using Signals with Context for shared state
- **shadow-objects-lifecycle**: Properly cleaning up Signal-based resources
