import { lazy } from 'react';

/**
 * Lazy loaded terminal components to reduce initial bundle size
 * Terminal components include xterm.js which is quite large and only used in specific views
 */

// Lazy load LogModal with prioritized loading
export const LazyLogModal = lazy(() => import(/* webpackPrefetch: true */ '../LogModal'));

// Lazy load WecsDetailsPanel with terminal functionality
export const LazyWecsDetailsPanel = lazy(() => import('../WecsDetailsPanel'));

// Export a loading placeholder that matches the terminal style
export const TerminalLoadingPlaceholder = () => (
  <div
    style={{
      background: '#1e1e1e',
      color: '#f0f0f0',
      padding: '16px',
      fontFamily: 'monospace',
      borderRadius: '4px',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    Loading terminal...
  </div>
);
