// @ts-nocheck
/**
 * Property Binding Examples
 *
 * Demonstrates useProperty and useProperties for binding
 * View properties to Shadow Object reactive state.
 */

import type {ShadowObjectCreationAPI} from '@spearwolf/shadow-objects';

// ============================================
// SINGLE PROPERTY BINDING
// ============================================

/**
 * Basic useProperty Usage
 */
export function SinglePropertyBinding({useProperty, createEffect, dispatchMessageToView}: ShadowObjectCreationAPI) {
  // Each useProperty creates a Signal bound to a View property
  const title = useProperty<string>('title');
  const count = useProperty<number>('count');
  const enabled = useProperty<boolean>('enabled');
  const config = useProperty<{theme: string; lang: string}>('config');

  // Properties can be undefined if not set in View
  createEffect(() => {
    const t = title() ?? 'Default Title';
    const c = count() ?? 0;
    const e = enabled() ?? true;
    const cfg = config() ?? {theme: 'light', lang: 'en'};

    dispatchMessageToView('state-sync', {
      title: t,
      count: c,
      enabled: e,
      config: cfg,
    });
  });
}

/**
 * Property Type Coercion
 *
 * View properties come from <shae-prop> with type attribute.
 * useProperty receives the already-parsed value.
 */
export function PropertyTypesDemo({useProperty, createEffect}: ShadowObjectCreationAPI) {
  // String (default in View)
  // <shae-prop name="name" value="John" type="string">
  const name = useProperty<string>('name');

  // Number
  // <shae-prop name="score" value="100" type="number">
  const score = useProperty<number>('score');

  // Integer
  // <shae-prop name="level" value="5" type="int">
  const level = useProperty<number>('level');

  // Boolean
  // <shae-prop name="active" value="true" type="boolean">
  const active = useProperty<boolean>('active');

  // JSON object
  // <shae-prop name="settings" value='{"volume":80}' type="json">
  const settings = useProperty<{volume: number}>('settings');

  // Number array
  // <shae-prop name="scores" value="10,20,30" type="number[]">
  const scores = useProperty<number[]>('scores');

  // Float32Array (for WebGL, etc.)
  // <shae-prop name="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1" type="float32array">
  const matrix = useProperty<Float32Array>('matrix');

  createEffect(() => {
    console.log('Name (string):', name());
    console.log('Score (number):', score());
    console.log('Level (int):', level());
    console.log('Active (boolean):', active());
    console.log('Settings (json):', settings());
    console.log('Scores (number[]):', scores());
    console.log('Matrix (Float32Array):', matrix());
  });
}

// ============================================
// MULTIPLE PROPERTY BINDING
// ============================================

/**
 * useProperties for Multiple Props
 */
export function MultiplePropertyBinding({useProperties, createEffect, dispatchMessageToView}: ShadowObjectCreationAPI) {
  // Map multiple View properties with type definitions
  const props = useProperties<{
    x: number;
    y: number;
    z: number;
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    scaleX: number;
    scaleY: number;
    scaleZ: number;
    visible: boolean;
    opacity: number;
  }>({
    // TypeScript key -> View property name
    x: 'position-x',
    y: 'position-y',
    z: 'position-z',
    rotationX: 'rotation-x',
    rotationY: 'rotation-y',
    rotationZ: 'rotation-z',
    scaleX: 'scale-x',
    scaleY: 'scale-y',
    scaleZ: 'scale-z',
    visible: 'is-visible',
    opacity: 'opacity',
  });

  // Each property is a separate Signal
  createEffect(() => {
    dispatchMessageToView('transform-update', {
      position: {
        x: props.x() ?? 0,
        y: props.y() ?? 0,
        z: props.z() ?? 0,
      },
      rotation: {
        x: props.rotationX() ?? 0,
        y: props.rotationY() ?? 0,
        z: props.rotationZ() ?? 0,
      },
      scale: {
        x: props.scaleX() ?? 1,
        y: props.scaleY() ?? 1,
        z: props.scaleZ() ?? 1,
      },
      visible: props.visible() ?? true,
      opacity: props.opacity() ?? 1,
    });
  });
}

// ============================================
// PROPERTY CHANGE DETECTION
// ============================================

/**
 * Detecting Property Changes
 */
export function PropertyChangeDetection({
  useProperty,
  createSignal,
  createEffect,
  dispatchMessageToView,
}: ShadowObjectCreationAPI) {
  const value = useProperty<number>('value');
  const previousValue = createSignal<number | undefined>(undefined);

  createEffect(() => {
    const current = value();
    const previous = previousValue();

    if (previous !== undefined && current !== previous) {
      dispatchMessageToView('value-changed', {
        from: previous,
        to: current,
        delta: (current ?? 0) - (previous ?? 0),
      });
    }

    previousValue.set(current);
  });
}

// ============================================
// TWO-WAY BINDING PATTERN
// ============================================

/**
 * Two-Way Property Binding
 *
 * Pattern for syncing local state with View property.
 */
export function TwoWayBinding({
  useProperty,
  createSignal,
  createEffect,
  onViewEvent,
  dispatchMessageToView,
}: ShadowObjectCreationAPI) {
  // View property (external source of truth)
  const viewValue = useProperty<number>('value');

  // Local state (for immediate updates)
  const localValue = createSignal(viewValue() ?? 0);

  // Sync View -> Local when View property changes
  createEffect(() => {
    const v = viewValue();
    if (v !== undefined && v !== localValue()) {
      localValue.set(v);
    }
  });

  // Handle local updates
  onViewEvent((type, data) => {
    if (type === 'increment') {
      const newValue = localValue() + 1;
      localValue.set(newValue);
      // Request View to update its property
      dispatchMessageToView('request-value-update', {value: newValue});
    }
  });

  // Sync local changes to View
  createEffect(() => {
    dispatchMessageToView('value-display', {value: localValue()});
  });
}

// ============================================
// OPTIONAL PROPERTIES
// ============================================

/**
 * Handling Optional Properties
 */
export function OptionalProperties({useProperty, createMemo, createEffect}: ShadowObjectCreationAPI) {
  // These might not be set in View
  const optionalTitle = useProperty<string>('title');
  const optionalCount = useProperty<number>('count');
  const optionalConfig = useProperty<{enabled: boolean}>('config');

  // Use memos to provide defaults and derived values
  const title = createMemo(() => optionalTitle() ?? 'Untitled');
  const count = createMemo(() => optionalCount() ?? 0);
  const isEnabled = createMemo(() => optionalConfig()?.enabled ?? true);

  // Check if property was actually provided
  const hasTitle = createMemo(() => optionalTitle() !== undefined);
  const hasCount = createMemo(() => optionalCount() !== undefined);
  const hasConfig = createMemo(() => optionalConfig() !== undefined);

  createEffect(() => {
    console.log('Title:', title(), '(provided:', hasTitle(), ')');
    console.log('Count:', count(), '(provided:', hasCount(), ')');
    console.log('Enabled:', isEnabled(), '(config provided:', hasConfig(), ')');
  });
}

// ============================================
// COMPLEX PROPERTY STRUCTURES
// ============================================

/**
 * Working with Complex JSON Properties
 */
export function ComplexPropertyDemo({useProperty, createMemo, createEffect, dispatchMessageToView}: ShadowObjectCreationAPI) {
  interface PlayerData {
    name: string;
    level: number;
    stats: {
      health: number;
      mana: number;
      strength: number;
      agility: number;
    };
    inventory: Array<{
      id: string;
      name: string;
      quantity: number;
    }>;
    achievements: string[];
  }

  // Complex JSON property from View
  // <shae-prop name="player" value='{"name":"Hero",...}' type="json">
  const playerData = useProperty<PlayerData>('player');

  // Derived values from nested data
  const playerName = createMemo(() => playerData()?.name ?? 'Unknown');
  const playerLevel = createMemo(() => playerData()?.level ?? 1);
  const healthPercent = createMemo(() => {
    const stats = playerData()?.stats;
    if (!stats) return 100;
    return Math.round((stats.health / 100) * 100);
  });
  const inventoryCount = createMemo(() => playerData()?.inventory?.length ?? 0);
  const hasAchievements = createMemo(() => (playerData()?.achievements?.length ?? 0) > 0);

  createEffect(() => {
    dispatchMessageToView('player-summary', {
      name: playerName(),
      level: playerLevel(),
      healthPercent: healthPercent(),
      inventoryCount: inventoryCount(),
      hasAchievements: hasAchievements(),
    });
  });
}

// ============================================
// REGISTRY
// ============================================

export default {
  define: {
    'single-property': SinglePropertyBinding,
    'property-types': PropertyTypesDemo,
    'multiple-properties': MultiplePropertyBinding,
    'change-detection': PropertyChangeDetection,
    'two-way-binding': TwoWayBinding,
    'optional-properties': OptionalProperties,
    'complex-property': ComplexPropertyDemo,
  },
};
