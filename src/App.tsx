import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routesConfig } from "./routes/routes-config";
import { ClusterProvider } from "./context/ClusterContext";
import { Toaster } from 'react-hot-toast';

const router = createBrowserRouter(routesConfig);

const App: React.FC = () => {
  return (
    <ClusterProvider>
      <RouterProvider router={router} />
      <Toaster position="bottom-center" />
    </ClusterProvider>
  );
};

export default App;
