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
// import ShowLogs from "../components/Logs";

// Improve lazy loading with prefetch
const ClustersLazy = lazy(() => import(/* webpackPrefetch: true */ "../components/Clusters"));
const ITSLazy = lazy(() => import(/* webpackPrefetch: true */ "../pages/ITS"));
// ... update other lazy imports similarly ...

export const routesConfig: RouteObject[] = [
  {
    path: "/",
    element: <Layout />,
    children: [
      { 
        index: true, 
        element: (
          <Suspense fallback={<LoadingFallback message="Loading clusters..." size="medium" />}>
            <ClustersLazy />
          </Suspense>
        ) 
      },
      { 
        path: "its", 
        element: (
          <Suspense fallback={<LoadingFallback message="Loading ITS..." size="small" />}>
            <ITSLazy />
          </Suspense>
        ) 
      },
      { path: "wds", element: <WDS /> },
      { path: "bp", element: <BP /> },
      { path: "namespaces" , element: <NameSpace />},
      { path: "namespaces" , element: <NameSpace />},
      { path: "deploymentdetails/:namespace/:deploymentName", element: <DeploymentDetails /> },
      { path: "treeview", element: <TreeView /> },
      { path: "treeview", element: <TreeView /> },
      { path: "*", element: <NotFoundPage /> },
      // {path: "logs/:deployment/:namespace", element: <ShowLogs />} // TODO: remove it in future after deployment details page
    ],
  },
];
