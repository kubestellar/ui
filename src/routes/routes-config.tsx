import { RouteObject } from 'react-router-dom';
import { Layout } from '../components/Layout';
import WDS from '../pages/WDS';
import BP from '../pages/BP';
import NotFoundPage from '../pages/NotFoundPage';
import TreeView from '../components/TreeViewComponent';
import { lazy, Suspense } from 'react';
import LoadingFallback from '../components/LoadingFallback';
import WecsTreeview from '../components/WecsTopology';
import ProtectedRoute from '../components/ProtectedRoute';
import PublicRoute from '../components/PublicRoute';
import KubeStellarVisualization from '../components/login/index';
import InstallationPage from '../pages/InstallationPage';
import KubeStellarStatusChecker from '../components/KubeStellarStatusChecker';
import PluginDashboard from '../pages/PluginDashboard';

const ClustersLazy = lazy(() => import(/* webpackPrefetch: true */ '../components/Clusters'));
const ITSLazy = lazy(() => import(/* webpackPrefetch: true */ '../pages/ITS'));

export const routesConfig: RouteObject[] = [
  {
    path: '/login',
    element: (
      <PublicRoute>
        <KubeStellarStatusChecker>
          <KubeStellarVisualization />
        </KubeStellarStatusChecker>
      </PublicRoute>
    ),
  },
  {
    path: '/install',
    element: (
      <KubeStellarStatusChecker>
        <InstallationPage />
      </KubeStellarStatusChecker>
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
            <Suspense fallback={<LoadingFallback />}>
              <ClustersLazy />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'its',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <ITSLazy />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'workloads/manage',
        element: (
          <ProtectedRoute>
            <WDS />
          </ProtectedRoute>
        ),
      },
      {
        path: 'bp/manage',
        element: (
          <ProtectedRoute>
            <BP />
          </ProtectedRoute>
        ),
      },
      {
        path: 'wds/treeview',
        element: (
          <ProtectedRoute>
            <TreeView />
          </ProtectedRoute>
        ),
      },
      {
        path: 'wecs/treeview',
        element: (
          <ProtectedRoute>
            <WecsTreeview />
          </ProtectedRoute>
        ),
      },
      {
        path: 'plugins',
        element: (
          <ProtectedRoute>
            <PluginDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
];
