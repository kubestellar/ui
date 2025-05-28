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
import Plugins from '../pages/Plugins';
import LogSummarizer from '../pages/LogSummarizer';
import QuotaVisualizer from '../pages/QuotaVisualizer';
import SecretsManager from '../pages/SecretsManager.tsx';

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
      <PublicRoute>
        <KubeStellarStatusChecker>
          <InstallationPage />
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
        path: 'plugin/log-summarizer',
        element: (
          <ProtectedRoute>
            <LogSummarizer />
          </ProtectedRoute>
        ),
      },
      {
        path: 'plugin/quota-visualiser',
        element: (
          <ProtectedRoute>
            <QuotaVisualizer />
          </ProtectedRoute>
        ),
      },
      {
        path: 'plugins',
        element: (
          <ProtectedRoute>
            <Plugins />
          </ProtectedRoute>
        ),
      },
      {
        path: 'plugins/secrets-ui-manager',
        element: (
          <ProtectedRoute>
            <SecretsManager />
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
