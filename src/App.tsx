import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  ScrollRestoration,
} from "react-router-dom";
import Clusters from "./components/Clusters";
import Header from "./components/Header";
import ITS from "./pages/ITS";
import WDS from "./pages/WDS";
import Menu from "./components/menu/Menu";

function Layout() {
  return (
    <div className="w-full min-h-screen flex flex-col justify-between">
      <ScrollRestoration />
      <div>
        <Header />
        <div className="w-full flex gap-0 pt-20 xl:pt-[96px] 2xl:pt-[112px] mb-auto">
          <div className="hidden xl:block xl:w-[250px] 2xl:w-[280px] 3xl:w-[350px] border-r-2 border-base-300 dark:border-slate-700 px-3 xl:px-4 xl:py-1">
            <Menu />
          </div>
          <div className="w-full px-4 xl:px-4 2xl:px-5 xl:py-2 overflow-clip">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { path: "/", element: <Clusters /> },
      { path: "/its", element: <ITS /> },
      { path: "/wds", element: <WDS /> },
    ],
    errorElement: <>Error ...</>,
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
