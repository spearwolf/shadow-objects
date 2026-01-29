// @ts-nocheck
/**
 * Global Context Examples
 *
 * Global context is available to ALL Entities in the application,
 * regardless of their position in the Entity tree.
 */

import type {ShadowObjectCreationAPI} from '@spearwolf/shadow-objects';

// ============================================
// GLOBAL CONTEXT USE CASES
// ============================================

/**
 * Application Bootstrap
 *
 * Sets up global contexts during app initialization.
 * This typically runs on the root Entity.
 */
export function AppBootstrap({createSignal, provideGlobalContext, onViewEvent}: ShadowObjectCreationAPI) {
  // --------------------------------
  // Global App Settings
  // --------------------------------
  const appSettings = createSignal({
    apiBaseUrl: 'https://api.example.com',
    environment: 'production',
    version: '2.1.0',
    debugMode: false,
  });

  provideGlobalContext('app-settings', appSettings);

  // --------------------------------
  // Global User State
  // --------------------------------
  const currentUser = createSignal<{
    id: string;
    name: string;
    email: string;
    permissions: string[];
  } | null>(null);

  provideGlobalContext('current-user', currentUser);

  // --------------------------------
  // Global Notification Queue
  // --------------------------------
  const notifications = createSignal<
    Array<{
      id: string;
      type: 'info' | 'success' | 'warning' | 'error';
      message: string;
    }>
  >([]);

  const notificationService = {
    add: (type: 'info' | 'success' | 'warning' | 'error', message: string) => {
      const id = crypto.randomUUID();
      notifications.set((n) => [...n, {id, type, message}]);
      // Auto-remove after 5 seconds
      setTimeout(() => {
        notifications.set((n) => n.filter((item) => item.id !== id));
      }, 5000);
    },
    info: (message: string) => notificationService.add('info', message),
    success: (message: string) => notificationService.add('success', message),
    warning: (message: string) => notificationService.add('warning', message),
    error: (message: string) => notificationService.add('error', message),
    clear: () => notifications.set([]),
    getAll: () => notifications(),
  };

  provideGlobalContext('notifications', notificationService);

  // --------------------------------
  // Handle Authentication Events
  // --------------------------------
  onViewEvent((type, data) => {
    if (type === 'user-login') {
      currentUser.set(data as any);
      notificationService.success(`Welcome, ${(data as any).name}!`);
    }
    if (type === 'user-logout') {
      currentUser.set(null);
      notificationService.info('You have been logged out.');
    }
    if (type === 'toggle-debug') {
      appSettings.set((s) => ({...s, debugMode: !s.debugMode}));
    }
  });
}

// ============================================
// GLOBAL CONTEXT CONSUMERS
// ============================================

/**
 * API Client
 *
 * Uses global app settings for API configuration.
 * Can be attached to any Entity that needs API access.
 */
export function ApiClient({useContext}: ShadowObjectCreationAPI) {
  const getSettings = useContext<
    () => {
      apiBaseUrl: string;
      debugMode: boolean;
    }
  >('app-settings');

  const getUser = useContext<
    () => {
      id: string;
      permissions: string[];
    } | null
  >('current-user');

  // Return API methods that other Shadow Objects can use
  return {
    fetch: async (endpoint: string, options?: RequestInit) => {
      const settings = getSettings?.();
      const user = getUser?.();

      if (!settings) {
        throw new Error('App settings not available');
      }

      const url = `${settings.apiBaseUrl}${endpoint}`;

      if (settings.debugMode) {
        console.log(`[API] ${options?.method ?? 'GET'} ${url}`);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string>),
      };

      if (user) {
        headers['X-User-Id'] = user.id;
      }

      return fetch(url, {
        ...options,
        headers,
      });
    },

    hasPermission: (permission: string) => {
      const user = getUser?.();
      return user?.permissions.includes(permission) ?? false;
    },
  };
}

/**
 * Notification Display
 *
 * Renders notifications from the global notification queue.
 * Typically attached to a UI overlay Entity.
 */
export function NotificationDisplay({useContext, createEffect, dispatchMessageToView}: ShadowObjectCreationAPI) {
  const notifications = useContext<{
    getAll: () => Array<{
      id: string;
      type: string;
      message: string;
    }>;
  }>('notifications');

  createEffect(() => {
    const items = notifications?.getAll() ?? [];
    dispatchMessageToView('notifications-update', {items});
  });
}

/**
 * User Menu
 *
 * Displays user info and login/logout state.
 */
export function UserMenu({useContext, createEffect, dispatchMessageToView}: ShadowObjectCreationAPI) {
  const getUser = useContext<
    () => {
      name: string;
      email: string;
    } | null
  >('current-user');

  createEffect(() => {
    const user = getUser?.();
    dispatchMessageToView('user-menu-update', {
      isLoggedIn: user !== null,
      userName: user?.name ?? 'Guest',
      userEmail: user?.email ?? '',
    });
  });
}

/**
 * Permission Guard
 *
 * Conditionally enables features based on user permissions.
 */
export function PermissionGuard({useContext, useProperty, createEffect, dispatchMessageToView}: ShadowObjectCreationAPI) {
  const requiredPermission = useProperty<string>('permission');
  const getUser = useContext<
    () => {
      permissions: string[];
    } | null
  >('current-user');

  createEffect(() => {
    const permission = requiredPermission();
    const user = getUser?.();

    const hasPermission = user?.permissions.includes(permission ?? '') ?? false;

    dispatchMessageToView('permission-check', {
      permission,
      granted: hasPermission,
    });
  });
}

// ============================================
// GLOBAL VS HIERARCHICAL CONTEXT
// ============================================

/**
 * When to use Global Context:
 *
 * 1. User authentication state
 * 2. App-wide settings/configuration
 * 3. Notification systems
 * 4. Feature flags
 * 5. Shared services (logging, analytics, API clients)
 *
 * When to use Hierarchical Context:
 *
 * 1. UI themes (might vary per section)
 * 2. Form state (scoped to form subtree)
 * 3. List/item relationships
 * 4. Modal/dialog state
 * 5. Feature module state
 */

// ============================================
// REGISTRY
// ============================================

export default {
  define: {
    'app-bootstrap': AppBootstrap,
    'api-client': ApiClient,
    'notification-display': NotificationDisplay,
    'user-menu': UserMenu,
    'permission-guard': PermissionGuard,
  },
};
