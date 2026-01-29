// @ts-nocheck
/**
 * Provider/Consumer Pattern Examples
 *
 * Complete examples showing how to structure provider and consumer
 * Shadow Objects for effective state sharing.
 */

import type {ShadowObjectCreationAPI} from '@spearwolf/shadow-objects';

// ============================================
// PATTERN 1: SIMPLE VALUE PROVIDER
// ============================================

/**
 * Configuration Provider
 *
 * Provides static configuration to descendants.
 * Good for values that don't change during runtime.
 */
export function ConfigProvider({provideContext}: ShadowObjectCreationAPI) {
  const config = {
    apiUrl: 'https://api.example.com',
    maxRetries: 3,
    timeout: 5000,
  };

  // Provide plain object (not reactive)
  provideContext('app-config', config);
}

// ============================================
// PATTERN 2: REACTIVE STATE PROVIDER
// ============================================

/**
 * Theme Provider with Reactive State
 *
 * Provides a Signal that consumers can react to.
 */
export function ThemeProvider({createSignal, provideContext, onViewEvent, dispatchMessageToView}: ShadowObjectCreationAPI) {
  // Create reactive state
  const theme = createSignal({
    primary: '#007bff',
    secondary: '#6c757d',
    background: '#ffffff',
    text: '#212529',
    mode: 'light' as 'light' | 'dark',
  });

  // Provide the signal (not the value!)
  provideContext('theme', theme);

  // Handle View events to change theme
  onViewEvent((type, data) => {
    if (type === 'set-theme-mode') {
      const mode = data?.mode as 'light' | 'dark';
      if (mode === 'dark') {
        theme.set({
          primary: '#0d6efd',
          secondary: '#adb5bd',
          background: '#212529',
          text: '#f8f9fa',
          mode: 'dark',
        });
      } else {
        theme.set({
          primary: '#007bff',
          secondary: '#6c757d',
          background: '#ffffff',
          text: '#212529',
          mode: 'light',
        });
      }
      // Notify View of theme change
      dispatchMessageToView('theme-changed', theme());
    }
  });
}

/**
 * Theme Consumer
 *
 * Reacts to theme changes from the provider.
 */
export function ThemeConsumer({useContext, createEffect, dispatchMessageToView}: ShadowObjectCreationAPI) {
  // Get the theme signal from context
  const theme = useContext<() => {mode: string; primary: string}>('theme');

  // Effect runs whenever theme() changes
  createEffect(() => {
    const currentTheme = theme?.();
    if (currentTheme) {
      dispatchMessageToView('apply-theme', {
        mode: currentTheme.mode,
        primaryColor: currentTheme.primary,
      });
    }
  });
}

// ============================================
// PATTERN 3: SERVICE PROVIDER
// ============================================

/**
 * Logger Service Provider
 *
 * Provides a service API to descendants.
 */
export function LoggerProvider({createSignal, provideContext}: ShadowObjectCreationAPI) {
  const logs = createSignal<string[]>([]);

  const logger = {
    log: (message: string) => {
      console.log(`[LOG] ${message}`);
      logs.set((l) => [...l, `[LOG] ${message}`]);
    },
    warn: (message: string) => {
      console.warn(`[WARN] ${message}`);
      logs.set((l) => [...l, `[WARN] ${message}`]);
    },
    error: (message: string) => {
      console.error(`[ERROR] ${message}`);
      logs.set((l) => [...l, `[ERROR] ${message}`]);
    },
    getLogs: () => logs(),
    clear: () => logs.set([]),
  };

  provideContext('logger', logger);
}

/**
 * Logger Consumer
 *
 * Uses the logger service from context.
 */
export function SomeFeature({useContext, onViewEvent}: ShadowObjectCreationAPI) {
  const logger = useContext<{
    log: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  }>('logger');

  onViewEvent((type, data) => {
    logger?.log(`Received event: ${type}`);

    if (type === 'error') {
      logger?.error(`Error occurred: ${data?.message}`);
    }
  });
}

// ============================================
// PATTERN 4: NESTED PROVIDERS
// ============================================

/**
 * App Root Provider
 *
 * Top-level provider that sets up global context.
 */
export function AppRootProvider({createSignal, provideContext}: ShadowObjectCreationAPI) {
  const appState = createSignal({
    initialized: false,
    version: '1.0.0',
  });

  provideContext('app-state', appState);

  // Mark as initialized
  appState.set((s) => ({...s, initialized: true}));
}

/**
 * Feature Module Provider
 *
 * Nested provider that adds feature-specific context.
 * Descendants have access to both app-state AND feature-state.
 */
export function FeatureModuleProvider({useContext, createSignal, provideContext}: ShadowObjectCreationAPI) {
  // Can access parent context
  const appState = useContext<() => {initialized: boolean}>('app-state');

  // Provide additional context for this subtree
  const featureState = createSignal({
    featureName: 'Dashboard',
    isActive: false,
  });

  provideContext('feature-state', featureState);

  // Wait for app to be initialized
  if (appState?.().initialized) {
    featureState.set((s) => ({...s, isActive: true}));
  }
}

/**
 * Deep Nested Consumer
 *
 * Has access to all ancestor contexts.
 */
export function DeepNestedComponent({useContext, createEffect}: ShadowObjectCreationAPI) {
  // Access context from different ancestor levels
  const appState = useContext<() => {version: string}>('app-state');
  const featureState = useContext<() => {featureName: string}>('feature-state');
  const theme = useContext<() => {mode: string}>('theme');

  createEffect(() => {
    console.log('App version:', appState?.().version);
    console.log('Feature:', featureState?.().featureName);
    console.log('Theme mode:', theme?.().mode);
  });
}

// ============================================
// PATTERN 5: GLOBAL CONTEXT
// ============================================

/**
 * Global Settings Provider
 *
 * Uses provideGlobalContext to make settings available
 * to ALL Entities, regardless of tree position.
 */
export function GlobalSettingsProvider({createSignal, provideGlobalContext}: ShadowObjectCreationAPI) {
  const settings = createSignal({
    language: 'en',
    timezone: 'UTC',
    notifications: true,
  });

  // Global context - available everywhere!
  provideGlobalContext('global-settings', settings);
}

/**
 * Settings Consumer (works anywhere in tree)
 *
 * Can access global settings even without being
 * a descendant of GlobalSettingsProvider.
 */
export function AnywhereConsumer({useContext, createEffect}: ShadowObjectCreationAPI) {
  // This works even if provider is in a different subtree
  const settings = useContext<() => {language: string}>('global-settings');

  createEffect(() => {
    console.log('Language:', settings?.().language);
  });
}

// ============================================
// REGISTRY CONFIGURATION
// ============================================

export default {
  define: {
    // Providers
    'app-root': AppRootProvider,
    'theme-provider': ThemeProvider,
    'logger-provider': LoggerProvider,
    'config-provider': ConfigProvider,
    'feature-module': FeatureModuleProvider,
    'global-settings': GlobalSettingsProvider,

    // Consumers
    'theme-consumer': ThemeConsumer,
    'some-feature': SomeFeature,
    'deep-nested': DeepNestedComponent,
    'anywhere-consumer': AnywhereConsumer,
  },
  routes: {
    // App root always loads logger and config
    'app-root': ['logger-provider', 'config-provider'],
  },
};
