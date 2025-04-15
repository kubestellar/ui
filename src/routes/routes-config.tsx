import { RouteObject } from "react-router-dom";
import { Layout } from "../components/Layout";
import WDS from "../pages/WDS";
import BP from "../pages/BP";
import NotFoundPage from "../pages/NotFoundPage";
import TreeView from "../components/TreeViewComponent";
import { lazy, Suspense } from "react";
import LoadingFallback from "../components/LoadingFallback";
import WecsTreeview from "../components/WecsTopology";
import ProtectedRoute from "../components/ProtectedRoute";
import PublicRoute from "../components/PublicRoute";
import KubeStellarVisualization from "../components/login/index";

const ClustersLazy = lazy(() => import(/* webpackPrefetch: true */ "../components/Clusters"));
const ITSLazy = lazy(() => import(/* webpackPrefetch: true */ "../pages/ITS"));

export const routesConfig: RouteObject[] = [
  {
    path: "/login", 
    element: (
      <PublicRoute>
        <KubeStellarVisualization />
      </PublicRoute>
    ) 
  },
  {
    path: "/",
    element: <Layout />, 
    children: [
      { 
        index: true, 
        element: (
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback message="Loading clusters..." size="medium" />}>
              <ClustersLazy />
            </Suspense>
          </ProtectedRoute>
        ) 
      },
      { 
        path: "its", 
        element: (
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback message="Loading ITS..." size="small" />}>
              <ITSLazy />
            </Suspense>
          </ProtectedRoute>
        ) 
      },
      { 
        path: "workloads/manage", 
        element: (
          <ProtectedRoute>
            <WDS />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "bp/manage", 
        element: (
          <ProtectedRoute>
            <BP />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "wds/treeview", 
        element: (
          <ProtectedRoute>
            <TreeView />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "wecs/treeview", 
        element: (
          <ProtectedRoute>
            <WecsTreeview />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "*", 
        element: (
          <NotFoundPage />
        ) 
      },
    ],
  },
];