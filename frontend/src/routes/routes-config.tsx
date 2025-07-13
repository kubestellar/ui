import { RouteObject } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { lazy, Suspense } from 'react';
import LoadingFallback from '../components/LoadingFallback';
import ProtectedRoute from '../components/ProtectedRoute';
import PublicRoute from '../components/PublicRoute';
import KubeStellarStatusChecker from '../components/KubeStellarStatusChecker';
import UserManagement from '../components/admin/UserManagement';

const WDSLazy = lazy(() => import(/* webpackPrefetch: true */ '../pages/WDS'));
const BPLazy = lazy(() => import(/* webpackPrefetch: true */ '../pages/BP'));
const NotFoundPageLazy = lazy(() => import('../pages/NotFoundPage'));
const TreeViewLazy = lazy(() => import('../components/TreeViewComponent'));
const WecsTreeviewLazy = lazy(() => import('../components/WecsTopology'));
const PluginManagerLazy = lazy(() =>
  import('../components/PluginManager').then(module => ({ default: module.PluginManager }))
);
const KubeStellarVisualizationLazy = lazy(() => import('../components/login/index'));
const InstallationPageLazy = lazy(() => import('../pages/InstallationPage'));
const ClustersLazy = lazy(() => import(/* webpackPrefetch: true */ '../pages/Dashboard'));
const ITSLazy = lazy(() => import(/* webpackPrefetch: true */ '../pages/ITS'));
const MetricsDashboardLazy = lazy(() => import('../components/MetricsDashboard'));

export const routesConfig: RouteObject[] = [
  {
    path: '/login',
    element: (
      <PublicRoute>
        <KubeStellarStatusChecker>
          <Suspense fallback={<LoadingFallback message="Loading login..." size="medium" />}>
            <KubeStellarVisualizationLazy />
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
          <Suspense fallback={<LoadingFallback message="Loading installation..." size="medium" />}>
            <InstallationPageLazy />
          </Suspense>
        </KubeStellarStatusChecker>
      </PublicRoute>
    ),
  },
  {
    path: '/',
    element: (
      <KubeStellarStatusChecker>
        <Layout />
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
            <Suspense fallback={<LoadingFallback message="Loading Workloads..." size="medium" />}>
              <WDSLazy />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'bp/manage',
        element: (
          <ProtectedRoute>
            <Suspense
              fallback={<LoadingFallback message="Loading Binding Policies..." size="medium" />}
            >
              <BPLazy />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'wds/treeview',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback message="Loading Tree View..." size="medium" />}>
              <TreeViewLazy />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'wecs/treeview',
        element: (
          <ProtectedRoute>
            <Suspense
              fallback={<LoadingFallback message="Loading WECS Tree View..." size="medium" />}
            >
              <WecsTreeviewLazy />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'plugins/manage',
        element: (
          <ProtectedRoute>
            <Suspense
              fallback={<LoadingFallback message="Loading Plugin Manager..." size="medium" />}
            >
              <PluginManagerLazy />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/users',
        element: (
          <ProtectedRoute>
            <UserManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: 'metrics',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback message="Loading metrics..." size="medium" />}>
              <MetricsDashboardLazy />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: (
          <Suspense fallback={<LoadingFallback message="Loading..." size="small" />}>
            <NotFoundPageLazy />
          </Suspense>
        ),
      },
    ],
  },
];
