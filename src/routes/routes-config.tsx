import { RouteObject } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import LoadingFallback from '../components/LoadingFallback';
import ProtectedRoute from '../components/ProtectedRoute';
import PublicRoute from '../components/PublicRoute';
import KubeStellarStatusChecker from '../components/KubeStellarStatusChecker';
import { PluginManager } from '../components/PluginManager';

const Layout = lazy(() =>
  import('../components/Layout').then(module => ({
    default: module.Layout,
  }))
);
const KubeStellarVisualization = lazy(() => import('../components/login/index.optimized'));
const InstallationPage = lazy(() => import('../pages/InstallationPage'));
const WDS = lazy(() => import('../pages/WDS'));
const BP = lazy(() => import('../pages/BP'));
const TreeView = lazy(() => import('../components/TreeViewComponent'));
const WecsTreeview = lazy(() => import('../components/WecsTopology'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));
const ClustersLazy = lazy(() => import('../components/Clusters'));
const ITSLazy = lazy(() => import('../pages/ITS'));

export const routesConfig: RouteObject[] = [
  {
    path: '/login',
    element: (
      <PublicRoute>
        <KubeStellarStatusChecker>
          <Suspense fallback={<LoadingFallback message="Loading login page..." size="medium" />}>
            <KubeStellarVisualization />
          </Suspense>
        </KubeStellarStatusChecker>
      </PublicRoute>
    ),
  },
  {
    path: '/install',
    element: (
      <PublicRoute>
        <KubeStellarStatusChecker>
          <Suspense
            fallback={<LoadingFallback message="Loading installation page..." size="medium" />}
          >
            <InstallationPage />
          </Suspense>
        </KubeStellarStatusChecker>
      </PublicRoute>
    ),
  },
  {
    path: '/',
    element: (
      <KubeStellarStatusChecker>
        <Suspense fallback={<LoadingFallback message="Loading application..." size="medium" />}>
          <Layout />
        </Suspense>
      </KubeStellarStatusChecker>
    ),
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback message="Loading clusters..." size="medium" />}>
              <ClustersLazy />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'its',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback message="Loading ITS..." size="small" />}>
              <ITSLazy />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'workloads/manage',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback message="Loading workloads..." size="medium" />}>
              <WDS />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'bp/manage',
        element: (
          <ProtectedRoute>
            <Suspense
              fallback={<LoadingFallback message="Loading binding policies..." size="medium" />}
            >
              <BP />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'wds/treeview',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback message="Loading tree view..." size="medium" />}>
              <TreeView />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'wecs/treeview',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback message="Loading topology..." size="medium" />}>
              <WecsTreeview />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'plugins/manage',
        element: (
          <ProtectedRoute>
            <PluginManager />
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: (
          <Suspense fallback={<LoadingFallback message="Page not found" size="small" />}>
            <NotFoundPage />
          </Suspense>
        ),
      },
    ],
  },
];
