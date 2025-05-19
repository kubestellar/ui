import { Suspense, lazy } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import Header from './Header';
// Lazy load less critical components
const Menu = lazy(() => import('./menu/Menu'));
const Footer = lazy(() => import('./Footer'));

// Loading placeholder
const LoadingPlaceholder = () => (
  <div className="h-full animate-pulse bg-gray-200 dark:bg-gray-700"></div>
);

export function Layout() {
  // Log the commit hash to console for debugging
  console.log('Git Commit Hash:', import.meta.env.VITE_GIT_COMMIT_HASH);

  const commitHash = import.meta.env.VITE_GIT_COMMIT_HASH || 'unknown';

  const isLoading = false; // Set this based on your loading logic

  return (
    <div className="relative flex min-h-screen w-full flex-col justify-between">
      <ScrollRestoration />
      <div>
        <Header isLoading={isLoading} />
        <div className="mb-auto flex w-full gap-0 pt-20 xl:pt-[96px] 2xl:pt-[112px]">
          <div className="3xl:w-[350px] hidden w-[320px] border-r-2 border-base-300 px-3 dark:border-slate-700 xl:block xl:px-4 xl:py-1 2xl:w-[310px]">
            <Suspense fallback={<LoadingPlaceholder />}>
              <Menu />
            </Suspense>
          </div>
          <div className="w-full overflow-clip px-4 xl:px-4 xl:py-2 2xl:px-5">
            <Suspense fallback={<LoadingPlaceholder />}>
              <Outlet />
            </Suspense>
          </div>
        </div>
      </div>

      <Suspense fallback={<LoadingPlaceholder />}>
        <Footer commitHash={commitHash} />
      </Suspense>
    </div>
  );
}
