import { Suspense, lazy, useState, useEffect } from 'react';
import { Spinner } from './ui/Spinner';
import useTheme from '../stores/themeStore';

const LazyApp = lazy(() => import('../App'));

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

const AppLoader = () => {
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const minLoadingTime = 800;
    const startTime = Date.now();
    Promise.all([
      import('../App'),
      new Promise(resolve => {
        const elapsed = Date.now() - startTime;
        const timeRemaining = Math.max(0, minLoadingTime - elapsed);
        setTimeout(resolve, timeRemaining);
      }),
    ]).then(() => {
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <LazyApp />
    </Suspense>
  );
};

export default AppLoader;
