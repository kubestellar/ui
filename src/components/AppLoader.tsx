import { Suspense, lazy, useState, useEffect } from 'react';
import { Spinner } from './ui/Spinner';
import useTheme from '../stores/themeStore';

// Lazy load the actual App component
const LazyApp = lazy(() => import('../App'));

/**
 * Spinner component shown while the app is loading
 */
const LoadingSpinner = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ backgroundColor: isDark ? '#0a0f1c' : '#f9fafb' }}
    >
      <img
        src="/KubeStellar.png"
        alt="KubeStellar Logo"
        className="mb-8 w-64 animate-pulse"
        style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
      />
      <Spinner size="large" />
      <div className="mt-4 text-lg font-medium" style={{ color: isDark ? '#e2e8f0' : '#334155' }}>
        Loading KubeStellar...
      </div>
    </div>
  );
};

/**
 * AppLoader component with intelligent loading behavior
 * - Shows a splash screen while loading
 * - Handles loading states
 * - Lazy loads the actual app component
 */
const AppLoader = () => {
  // Track loading state
  const [isLoading, setIsLoading] = useState(true);

  // Set up loading timeout and fake minimum loading time
  // for smoother perceived performance
  useEffect(() => {
    const minLoadingTime = 800; // ms
    const startTime = Date.now();

    // Start loading the main app immediately
    Promise.all([
      // Start loading the app component
      import('../App'),

      // Ensure minimum loading time for better UX
      new Promise(resolve => {
        const elapsed = Date.now() - startTime;
        const timeRemaining = Math.max(0, minLoadingTime - elapsed);
        setTimeout(resolve, timeRemaining);
      }),
    ]).then(() => {
      setIsLoading(false);
    });
  }, []);

  // Show loading spinner while loading app
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Render the actual app when loaded
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <LazyApp />
    </Suspense>
  );
};

export default AppLoader;
