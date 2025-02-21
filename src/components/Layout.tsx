import { Suspense, lazy } from 'react';
import {
  Outlet,
  ScrollRestoration, 
} from "react-router-dom";
import Header from "./Header";
// Lazy load less critical components
const Menu = lazy(() => import("./menu/Menu"));
const Footer = lazy(() => import("./Footer"));

// Loading placeholder
const LoadingPlaceholder = () => (
  <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-full"></div>
);

export function Layout() {
  // Log the commit hash to console for debugging
  console.log('Git Commit Hash:', import.meta.env.VITE_GIT_COMMIT_HASH);

  const commitHash = import.meta.env.VITE_GIT_COMMIT_HASH || 'unknown';

  return (
    <div className="w-full min-h-screen flex flex-col justify-between relative">
      <ScrollRestoration /> 
      <div>
        <Header />
        <div className="w-full flex gap-0 pt-20 xl:pt-[96px] 2xl:pt-[112px] mb-auto">
          <div className="hidden xl:block xl:w-[250px] 2xl:w-[280px] 3xl:w-[350px] border-r-2 border-base-300 dark:border-slate-700 px-3 xl:px-4 xl:py-1">
            <Suspense fallback={<LoadingPlaceholder />}>
              <Menu />
            </Suspense>
          </div>
          <div className="w-full px-4 xl:px-4 2xl:px-5 xl:py-2 overflow-clip">
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