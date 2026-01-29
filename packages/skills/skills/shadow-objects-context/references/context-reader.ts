// @ts-nocheck
/**
 * Context Reader Pattern
 *
 * This pattern provides type-safe context access by creating
 * dedicated reader functions for each context type.
 *
 * Benefits:
 * - Type safety with full IDE support
 * - Single source of truth for context names
 * - Easy refactoring
 * - Self-documenting code
 */

import type {ShadowObjectCreationAPI} from '@spearwolf/shadow-objects';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * The useContext function type from ShadowObjectCreationAPI
 */
type ContextReader = <T>(name: string) => T | undefined;

/**
 * Example domain types
 */
interface Theme {
  primary: string;
  secondary: string;
  mode: 'light' | 'dark';
}

interface UserSession {
  userId: string;
  username: string;
  roles: string[];
}

interface GameState {
  level: number;
  score: number;
  lives: number;
  isPaused: boolean;
}

// ============================================
// CONTEXT READERS
// ============================================

/**
 * Theme Context Reader
 *
 * @example
 * const getTheme = ThemeContext(useContext);
 * const theme = getTheme(); // Theme | undefined
 */
export const ThemeContext = (useContext: ContextReader) => useContext<() => Theme>('app-theme');

/**
 * User Session Context Reader
 */
export const UserSessionContext = (useContext: ContextReader) => useContext<() => UserSession | null>('user-session');

/**
 * Game State Context Reader
 */
export const GameStateContext = (useContext: ContextReader) => useContext<() => GameState>('game-state');

/**
 * Audio Service Context Reader
 */
export const AudioServiceContext = (useContext: ContextReader) =>
  useContext<{
    play: (url: string) => void;
    stop: () => void;
    setVolume: (vol: number) => void;
  }>('audio-service');

/**
 * Feature Flags Context Reader
 */
export const FeatureFlagsContext = (useContext: ContextReader) =>
  useContext<{
    isEnabled: (feature: string) => boolean;
  }>('feature-flags');

// ============================================
// CONTEXT PROVIDERS
// ============================================

/**
 * Theme Provider
 *
 * Provides theme to all descendant Entities.
 */
export function ThemeProvider({createSignal, provideContext}: ShadowObjectCreationAPI) {
  const theme = createSignal<Theme>({
    primary: '#007bff',
    secondary: '#6c757d',
    mode: 'light',
  });

  provideContext('app-theme', theme);

  return {
    setTheme: (newTheme: Theme) => theme.set(newTheme),
    toggleMode: () =>
      theme.set((t) => ({
        ...t,
        mode: t.mode === 'light' ? 'dark' : 'light',
      })),
  };
}

/**
 * User Session Provider
 */
export function UserSessionProvider({createSignal, provideContext, onViewEvent}: ShadowObjectCreationAPI) {
  const session = createSignal<UserSession | null>(null);

  provideContext('user-session', session);

  onViewEvent((type, data) => {
    if (type === 'login') {
      session.set(data as UserSession);
    }
    if (type === 'logout') {
      session.set(null);
    }
  });

  return {
    isLoggedIn: () => session() !== null,
    getUser: () => session(),
  };
}

/**
 * Game State Provider
 */
export function GameStateProvider({createSignal, provideContext}: ShadowObjectCreationAPI) {
  const state = createSignal<GameState>({
    level: 1,
    score: 0,
    lives: 3,
    isPaused: false,
  });

  provideContext('game-state', state);

  return {
    addScore: (points: number) => state.set((s) => ({...s, score: s.score + points})),
    nextLevel: () => state.set((s) => ({...s, level: s.level + 1})),
    loseLife: () => state.set((s) => ({...s, lives: Math.max(0, s.lives - 1)})),
    togglePause: () => state.set((s) => ({...s, isPaused: !s.isPaused})),
    reset: () => state.set({level: 1, score: 0, lives: 3, isPaused: false}),
  };
}

// ============================================
// CONTEXT CONSUMERS
// ============================================

/**
 * Themed Button Consumer
 *
 * Uses the Context Reader pattern for type-safe context access.
 */
export function ThemedButton({useContext, createEffect, dispatchMessageToView}: ShadowObjectCreationAPI) {
  // Type-safe context access
  const getTheme = ThemeContext(useContext);

  createEffect(() => {
    const theme = getTheme?.();
    if (theme) {
      dispatchMessageToView('button-style', {
        backgroundColor: theme.primary,
        color: theme.mode === 'dark' ? '#fff' : '#000',
      });
    }
  });
}

/**
 * User Profile Consumer
 */
export function UserProfile({useContext, createEffect, dispatchMessageToView}: ShadowObjectCreationAPI) {
  const getSession = UserSessionContext(useContext);

  createEffect(() => {
    const session = getSession?.();
    dispatchMessageToView('profile-update', {
      isLoggedIn: session !== null,
      username: session?.username ?? 'Guest',
      roles: session?.roles ?? [],
    });
  });
}

/**
 * Score Display Consumer
 */
export function ScoreDisplay({useContext, createEffect, dispatchMessageToView}: ShadowObjectCreationAPI) {
  const getGameState = GameStateContext(useContext);

  createEffect(() => {
    const state = getGameState?.();
    if (state) {
      dispatchMessageToView('score-update', {
        score: state.score,
        level: state.level,
        lives: state.lives,
      });
    }
  });
}

/**
 * Feature-Gated Component
 *
 * Only activates if a feature flag is enabled.
 */
export function NewFeaturePanel({useContext, createEffect, dispatchMessageToView}: ShadowObjectCreationAPI) {
  const getFlags = FeatureFlagsContext(useContext);

  createEffect(() => {
    const flags = getFlags;
    const isEnabled = flags?.isEnabled('new-dashboard') ?? false;

    dispatchMessageToView('feature-panel-visibility', {
      visible: isEnabled,
    });
  });
}
