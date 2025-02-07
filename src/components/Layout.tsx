import {

    Outlet,
    ScrollRestoration,
  } from "react-router-dom";
import Header from "./Header";
import Menu from "./menu/Menu";
 
 
export function Layout() {
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