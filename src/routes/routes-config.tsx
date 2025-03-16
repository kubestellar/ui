import { RouteObject } from "react-router-dom";
import { Layout } from "../components/Layout";
import WDS from "../pages/WDS";
import BP from "../pages/BP";
import NotFoundPage from "../pages/NotFoundPage";
import DeploymentDetails from "../components/DeploymentDetails";
import NameSpace from "../pages/NS";
import TreeView from "../components/TreeViewComponent";
import { lazy, Suspense } from "react";
import LoadingFallback from "../components/LoadingFallback";
import WecsTreeview from "../components/WecsTopology";
import Profile from "../components/Profile";
import ProtectedRoute from "../components/ProtectedRoute";
import PublicRoute from "../components/PublicRoute";

const ClustersLazy = lazy(() => import(/* webpackPrefetch: true */ "../components/Clusters"));
const ITSLazy = lazy(() => import(/* webpackPrefetch: true */ "../pages/ITS"));

export const routesConfig: RouteObject[] = [
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
        path: "namespaces", 
        element: (
          <ProtectedRoute>
            <NameSpace />
          </ProtectedRoute>
        ) 
      },
      { 
        path: "deploymentdetails/:namespace/:deploymentName", 
        element: (
          <ProtectedRoute>
            <DeploymentDetails />
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
        path: "profile", 
        element: (
          <PublicRoute>
            <Profile />
          </PublicRoute>
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