import { lazy } from 'react';

export const LazyLogModal = lazy(() => import(/* webpackPrefetch: true */ '../LogModal'));

export const LazyWecsDetailsPanel = lazy(() => import('../WecsDetailsPanel'));

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
