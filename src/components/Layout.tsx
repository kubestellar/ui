import {
  Outlet,
  ScrollRestoration, 
} from "react-router-dom";
import Header from "./Header";
import Menu from "./menu/Menu";
import Footer from "./Footer";

export function Layout() {
  // Log the commit hash to console for debugging
  console.log('Git Commit Hash:', import.meta.env.VITE_GIT_COMMIT_HASH);

  const commitHash = import.meta.env.VITE_GIT_COMMIT_HASH || 'unknown';

  return (
    <div className="w-full min-h-screen flex flex-col justify-between relative">
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
      
      <Footer commitHash={commitHash} />
    </div>
  );
}