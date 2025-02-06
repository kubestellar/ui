import { RouteObject } from "react-router-dom";
import Clusters from "../components/Clusters";
import { Layout } from "../components/Layout";
import ITS from "../pages/ITS";
import WDS from "../pages/WDS";
import BP from "../pages/BP";

export const routesConfig: RouteObject[] = [
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Clusters /> },
      { path: "its", element: <ITS /> },
      { path: "wds", element: <WDS /> },
      { path: "bp", element: <BP /> },
    ],
    errorElement: <>Error ...</>,
  },
];
