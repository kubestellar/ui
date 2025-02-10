import React from "react";
import { Link } from "react-router-dom";
import { HiBars3CenterLeft } from "react-icons/hi2";
import { RxEnterFullScreen, RxExitFullScreen } from "react-icons/rx";
import ChangeThemes from "./ChangeThemes";
import { menu } from "./menu/data";
import MenuItem from "./menu/MenuItem";
import { useCluster } from "../context/ClusterContext";
import { api } from "../lib/api";

interface Context {
  name: string;
  cluster: string;
}

const Header = () => {
  const [isFullScreen, setIsFullScreen] = React.useState(true);
  const element = document.getElementById("root");
  const [contexts, setContexts] = React.useState<Context[]>([]);
  const [currentContext, setCurrentContext] = React.useState("");
  const { setSelectedCluster, setHasAvailableClusters } = useCluster();

  const [isDrawerOpen, setDrawerOpen] = React.useState(false);
  const toggleDrawer = () => setDrawerOpen(!isDrawerOpen);

  const toggleFullScreen = () => {
    setIsFullScreen((prev) => !prev);
  };

  React.useEffect(() => {
    api
      .get("/api/clusters")
      .then((response) => {
        const data = response.data;
        const kubeflexContexts = data.contexts.filter(
          (ctx: Context) =>
            ctx.name.endsWith("-kubeflex") || ctx.cluster.endsWith("-kubeflex")

        );

        console.log("Kubeflex contexts:", kubeflexContexts);

        setContexts(kubeflexContexts);
        setHasAvailableClusters(kubeflexContexts.length > 0);

        let currentKubeflexContext = "";
        if (data.currentContext?.endsWith("-kubeflex")) {
          currentKubeflexContext = data.currentContext;
        } else if (kubeflexContexts.length > 0) {
          currentKubeflexContext = kubeflexContexts[0].name;
        }

        console.log("Selected context:", currentKubeflexContext);
        setCurrentContext(currentKubeflexContext);
        setSelectedCluster(currentKubeflexContext);
      })
      .catch((error) => {
        console.error("Error fetching contexts:", error);
        setHasAvailableClusters(false);
        setSelectedCluster(null);
      });
  }, [setSelectedCluster, setHasAvailableClusters]);

  React.useEffect(() => {
    if (isFullScreen) {
      document.exitFullscreen();
    } else {
      element?.requestFullscreen({ navigationUI: "auto" });
    }
  }, [element, isFullScreen]);

  const handleClusterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCluster = e.target.value;
    setCurrentContext(newCluster);
    setSelectedCluster(newCluster || null);
  };

  return (
    <div className="fixed z-[3] top-0 left-0 right-0 bg-base-100 w-full flex justify-between px-3 xl:px-4 py-3 xl:py-5 gap-4 xl:gap-0">
      <div className="flex gap-3 items-center">
        <div className="drawer w-auto p-0 mr-1 xl:hidden">
          <input
            id="drawer-navbar-mobile"
            type="checkbox"
            className="drawer-toggle"
            checked={isDrawerOpen}
            onChange={toggleDrawer}
          />
          <div className="p-0 w-auto drawer-content">
            <label
              htmlFor="drawer-navbar-mobile"
              className="p-0 btn btn-ghost drawer-button"
            >
              <HiBars3CenterLeft className="text-2xl" />
            </label>
          </div>
          <div className="drawer-side z-[99]">
            <label
              htmlFor="drawer-navbar-mobile"
              aria-label="close sidebar"
              className="drawer-overlay"
            ></label>
            <div className="menu p-4 w-auto min-h-full bg-base-200 text-base-content">
              <Link
                to={"/"}
                className="flex items-center gap-1 xl:gap-2 mt-1 mb-5"
              >
                <span className="text-[16px] leading-[1.2] sm:text-lg xl:text-xl 2xl:text-2xl font-semibold text-base-content dark:text-neutral-200">
                  <img
                    src="/KubeStellar.png"
                    alt="logo"
                    className="w-44 h-auto object-contain"
                  />
                </span>
              </Link>
              {menu.map((item, index) => (
                <MenuItem
                  onClick={toggleDrawer}
                  key={index}
                  catalog={item.catalog}
                  listItems={item.listItems}
                />
              ))}
            </div>
          </div>
        </div>

        <Link to={"/"} className="flex items-center gap-1 xl:gap-2">
          <span className="text-[16px] leading-[1.2] sm:text-lg xl:text-xl 2xl:text-2xl font-semibold text-base-content dark:text-neutral-200">
            <img
              src="/KubeStellar.png"
              alt="logo"
              className="w-44 h-auto object-contain"
            />
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-0 xl:gap-1 2xl:gap-2 3xl:gap-5">
        <select
          className="select select-bordered w-[200px] mr-4"
          value={currentContext}
          onChange={handleClusterChange}
        >
          <option value="" disabled>
            Select cluster
          </option>
          {contexts.map((ctx) => (
            <option key={ctx.name} value={ctx.name}>
              {ctx.name}
            </option>
          ))}
        </select>
        <button
          onClick={toggleFullScreen}
          className="hidden xl:inline-flex btn btn-circle btn-ghost"
        >
          {isFullScreen ? (
            <RxEnterFullScreen className="xl:text-xl 2xl:text-2xl 3xl:text-3xl" />
          ) : (
            <RxExitFullScreen className="xl:text-xl 2xl:text-2xl 3xl:text-3xl" />
          )}
        </button>

        {/* Theme Switcher */}
        <div className="px-0 xl:px-auto btn btn-circle btn-ghost xl:mr-1">
          <ChangeThemes />
        </div>
      </div>
    </div>
  );
};

export default Header;
