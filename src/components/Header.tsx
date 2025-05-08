import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HiBars3CenterLeft, HiArrowRightOnRectangle, HiUserCircle } from "react-icons/hi2";
import { RxEnterFullScreen, RxExitFullScreen } from "react-icons/rx";
import { FiLogIn, FiLogOut } from "react-icons/fi";
import { FiSun, FiMoon } from "react-icons/fi";
import { menu } from "./menu/data";
import MenuItem from "./menu/MenuItem";
import { api } from "../lib/api";
import useClusterStore from "../stores/clusterStore";
import useTheme from "../stores/themeStore";
import { useHeaderQueries } from '../hooks/queries/useHeaderQueries';
import LoadingFallback from './LoadingFallback';

interface Context {
  name: string;
  cluster: string;
}

// Array of profile icon components to randomly select from
const profileIcons = [
  HiUserCircle,
  // Add more icon components if desired
];

const Header = ({ isLoading }: { isLoading: boolean }) => {
  const [isFullScreen, setIsFullScreen] = React.useState(false);
  const element = document.getElementById("root");
  const { useContexts } = useHeaderQueries();
  const { data, error } = useContexts();
  const setSelectedCluster = useClusterStore((state) => state.setSelectedCluster)
  const setHasAvailableClusters = useClusterStore((state) => state.setHasAvailableClusters)
  const navigate = useNavigate();

  const [isDrawerOpen, setDrawerOpen] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");

  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  
  // Randomly select a profile icon
  const [ProfileIcon] = useState(() => {
    const randomIndex = Math.floor(Math.random() * profileIcons.length);
    return profileIcons[randomIndex];
  });

  const toggleDrawer = () => setDrawerOpen(!isDrawerOpen);

  const toggleFullScreen = () => {
    setIsFullScreen((prev) => !prev);
  };

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem("jwtToken");
    if (token) {
      api
        .get("/api/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((response) => {
          setUsername(response.data.username);
        })
        .catch((error) => {
          console.error("Error fetching user data:", error);
        });
    }
    setIsLoggedIn(!!token);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuRef]);

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

        setHasAvailableClusters(kubeflexContexts.length > 0);

        let currentKubeflexContext = "";
        if (data.currentContext?.endsWith("-kubeflex")) {
          currentKubeflexContext = data.currentContext;
        } else if (kubeflexContexts.length > 0) {
          currentKubeflexContext = kubeflexContexts[0].name;
        }

        console.log("Selected context:", currentKubeflexContext);
        setSelectedCluster(currentKubeflexContext);
      })
      .catch((error) => {
        console.error("Error fetching contexts:", error);
        setHasAvailableClusters(false);
        setSelectedCluster(null);
      });
  }, [setSelectedCluster, setHasAvailableClusters]);

  React.useEffect(() => {
    if (!isFullScreen && document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.error("Error exiting full screen:", err.message);
      });
    } else if (isFullScreen && !document.fullscreenElement) {
      element?.requestFullscreen({ navigationUI: "auto" }).catch((err) => {
        console.error("Error entering full screen:", err.message);
      });
    }
  }, [element, isFullScreen]);

  const handleClusterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCluster = e.target.value;
    setSelectedCluster(newCluster || null);
  };

  const handleLogout = () => {
    // Record logout timestamp
    localStorage.setItem("tokenRemovalTime", Date.now().toString());
    
    // Remove JWT token
    localStorage.removeItem("jwtToken");
    setIsLoggedIn(false);
    setShowUserMenu(false);
    
    // Navigate to login page
    navigate("/login", { 
      state: { 
        infoMessage: "You have been successfully logged out."
      }
    });
  };

  // Access the theme store
  const { theme, toggleTheme } = useTheme();

  if (isLoading) return <LoadingFallback message="Loading contexts..." size="small" />;
  if (error) return <div>Error loading contexts: {error.message}</div>;

  const contexts = data?.contexts || [];
  const currentContext = data?.currentContext || '';

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
              
              {/* Mobile Logout Button */}
              {isLoggedIn && (
                <div className="mt-6 border-t border-base-300 pt-4">
                  <button 
                    onClick={() => {
                      toggleDrawer(); // Close drawer first
                      handleLogout(); // Then logout
                    }}
                    className="btn btn-outline btn-error w-full flex items-center justify-start gap-2"
                  >
                    <HiArrowRightOnRectangle size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
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
        {isLoggedIn ? (
          <>
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
            
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="btn btn-circle btn-ghost hover:bg-base-200 transition-colors duration-200"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <FiMoon className="text-xl text-indigo-500" />
              ) : (
                <FiSun className="text-xl text-yellow-500" />
              )}
            </button>
            
            {/* User Profile Icon with Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="btn w-auto h-auto btn-ghost border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all duration-300"
              >
                <div className="mr-3">{username}</div>
                <ProfileIcon className="text-4xl text-primary" />
              </button>
              
              {/* User Dropdown Menu */}
        {showUserMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-950 shadow-xl z-50
            border border-gray-100 dark:border-gray-700 animate-fadeIn overflow-hidden rounded-xl">
            <button 
              onClick={handleLogout}
              className="w-full group text-left px-4 py-3 text-sm font-medium 
                bg-white dark:bg-transparent
                hover:bg-gray-50 dark:hover:bg-gray-700/30 
                text-gray-700 dark:text-gray-200
                transition-all duration-200 flex items-center
                focus:outline-none active:outline-none"
            >
              <div className="flex items-center gap-3 w-full">
                <div className="p-2 rounded-full bg-red-50 dark:bg-red-500/10 
                  group-hover:bg-red-100 dark:group-hover:bg-red-500/20
                  transition-colors duration-200 flex-shrink-0">
                  <FiLogOut className="text-red-500 dark:text-red-400" size={18} />
                </div>
                <span className="group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors duration-200">
                  Sign Out
                </span>
              </div>
            </button>
          </div>
          )}
            </div>
          </>
        ) : (
          <>
            {/* Theme Toggle Button (for logged out state) */}
            <button
              onClick={toggleTheme}
              className="btn btn-circle btn-ghost hover:bg-base-200 mr-2 transition-colors duration-200"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <FiMoon className="text-xl text-indigo-500" />
              ) : (
                <FiSun className="text-xl text-yellow-500" />
              )}
            </button>
            
            {/* Modern Login Button */}
            <Link to="/login" className="flex items-center">
              <button className="btn bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 
                text-white border-none shadow-lg hover:shadow-blue-500/25 px-5 rounded-full 
                flex items-center gap-2 transition-all duration-300 transform hover:scale-105">
                <FiLogIn className="text-lg" />
                <span className="font-medium">Sign In</span>
                <span className="hidden md:inline-block ml-1 opacity-75">to KubeStellar</span>
              </button>
            </Link>
          </>
        )}
        
        <button
          onClick={toggleFullScreen}
          className="hidden xl:inline-flex btn btn-circle btn-ghost"
        >
          {!isFullScreen ? (
            <RxEnterFullScreen className="xl:text-xl 2xl:text-2xl 3xl:text-3xl" />
          ) : (
            <RxExitFullScreen className="xl:text-xl 2xl:text-2xl 3xl:text-3xl" />
          )}
        </button>
      </div>
    </div>
  );
};

export default Header;