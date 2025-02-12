import { RouteObject } from "react-router-dom";
import Clusters from "../components/Clusters";
import { Layout } from "../components/Layout";
import ITS from "../pages/ITS";
import CreateCluster from "../pages/CreateCluster"; // Ensure that the file exists at this path
import WDS from "../pages/WDS";
import BP from "../pages/BP";
import NotFoundPage from "../pages/NotFoundPage";
import ShowLogs from "../components/Logs";

export const routesConfig: RouteObject[] = [
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Clusters /> },
      { path: "its", element: <ITS /> },
      { path: "createCluster", element: <CreateCluster /> },
      { path: "wds", element: <WDS /> },
      { path: "bp", element: <BP /> },
      { path: "*", element: <NotFoundPage /> },
      {path: "logs/:deployment/:namespace", element: <ShowLogs />} // TODO: remove it in future after deployment details page
    ],
  },
];
