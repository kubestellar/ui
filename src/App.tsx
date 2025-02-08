import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routesConfig } from "./routes/routes-config";
import { ClusterProvider } from "./context/ClusterContext";

const router = createBrowserRouter(routesConfig);

const App: React.FC = () => {
  return (
    <ClusterProvider>
      <RouterProvider router={router} />
    </ClusterProvider>
  );
};

export default App;
