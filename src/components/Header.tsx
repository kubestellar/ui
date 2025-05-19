import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiBars3CenterLeft, HiArrowRightOnRectangle, HiUserCircle } from 'react-icons/hi2';
import { FiLogOut } from 'react-icons/fi';
import { FiSun, FiMoon } from 'react-icons/fi';
import { menu } from './menu/data';
import MenuItem from './menu/MenuItem';
import { api } from '../lib/api';
import useClusterStore from '../stores/clusterStore';
import useTheme from '../stores/themeStore';
import { useHeaderQueries } from '../hooks/queries/useHeaderQueries';
import HeaderSkeleton from './ui/HeaderSkeleton';
import { useAuth, useAuthActions } from '../hooks/useAuth';
import FullScreenToggle from './ui/FullScreenToggle';

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
  const { useContexts } = useHeaderQueries();
  const { data: contextsData, error } = useContexts();
  const setSelectedCluster = useClusterStore(state => state.setSelectedCluster);
  const setHasAvailableClusters = useClusterStore(state => state.setHasAvailableClusters);
  const navigate = useNavigate();

  const [isDrawerOpen, setDrawerOpen] = React.useState(false);
  const [username, setUsername] = useState('');

  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const { data: authData } = useAuth();
  const { logout } = useAuthActions();

  // Randomly select a profile icon
  const [ProfileIcon] = useState(() => {
    const randomIndex = Math.floor(Math.random() * profileIcons.length);
    return profileIcons[randomIndex];
  });

  const toggleDrawer = () => setDrawerOpen(!isDrawerOpen);

  useEffect(() => {
    if (authData?.isAuthenticated) {
      const token = localStorage.getItem('jwtToken');
      if (token) {
        api
          .get('/api/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          .then(response => {
            setUsername(response.data.username);
          })
          .catch(error => {
            console.error('Error fetching user data:', error);
          });
      }
    }
  }, [authData?.isAuthenticated]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuRef]);

  React.useEffect(() => {
    api
      .get('/api/clusters')
      .then(response => {
        const data = response.data;
        const kubeflexContexts = data.contexts.filter(
          (ctx: Context) => ctx.name.endsWith('-kubeflex') || ctx.cluster.endsWith('-kubeflex')
        );

        console.log('Kubeflex contexts:', kubeflexContexts);

        setHasAvailableClusters(kubeflexContexts.length > 0);

        let currentKubeflexContext = '';
        if (data.currentContext?.endsWith('-kubeflex')) {
          currentKubeflexContext = data.currentContext;
        } else if (kubeflexContexts.length > 0) {
          currentKubeflexContext = kubeflexContexts[0].name;
        }

        console.log('Selected context:', currentKubeflexContext);
        setSelectedCluster(currentKubeflexContext);
      })
      .catch(error => {
        console.error('Error fetching contexts:', error);
        setHasAvailableClusters(false);
        setSelectedCluster(null);
      });
  }, [setSelectedCluster, setHasAvailableClusters]);

  const handleClusterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCluster = e.target.value;
    setSelectedCluster(newCluster || null);
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);

    // Navigate to login page
    navigate('/login', {
      state: {
        infoMessage: 'You have been successfully logged out.',
      },
    });
  };

  // Access the theme store
  const { theme, toggleTheme } = useTheme();

  if (isLoading) return <HeaderSkeleton />;
  if (error) return <div>Error loading contexts: {error.message}</div>;

  const contexts = contextsData?.contexts || [];
  const currentContext = contextsData?.currentContext || '';

  return (
    <div className="fixed left-0 right-0 top-0 z-[3] flex w-full justify-between gap-4 bg-base-100 px-3 py-3 xl:gap-0 xl:px-4 xl:py-5">
      <div className="flex items-center gap-3">
        <div className="drawer mr-1 w-auto p-0 xl:hidden">
          <input
            id="drawer-navbar-mobile"
            type="checkbox"
            className="drawer-toggle"
            checked={isDrawerOpen}
            onChange={toggleDrawer}
          />
          <div className="drawer-content w-auto p-0">
            <label htmlFor="drawer-navbar-mobile" className="btn btn-ghost drawer-button p-0">
              <HiBars3CenterLeft className="text-2xl" />
            </label>
          </div>
          <div className="drawer-side z-[99]">
            <label
              htmlFor="drawer-navbar-mobile"
              aria-label="close sidebar"
              className="drawer-overlay"
            ></label>
            <div className="menu min-h-full w-auto bg-base-200 p-4 text-base-content">
              <Link to={'/'} className="mb-5 mt-1 flex items-center gap-1 xl:gap-2">
                <span className="text-[16px] font-semibold leading-[1.2] text-base-content dark:text-neutral-200 sm:text-lg xl:text-xl 2xl:text-2xl">
                  <img src="/KubeStellar.png" alt="logo" className="h-auto w-52 object-contain" />
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
              {authData?.isAuthenticated && (
                <div className="mt-6 border-t border-base-300 pt-4">
                  <button
                    onClick={() => {
                      toggleDrawer(); // Close drawer first
                      handleLogout(); // Then logout
                    }}
                    className="btn btn-outline btn-error flex w-full items-center justify-start gap-2"
                  >
                    <HiArrowRightOnRectangle size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <Link to={'/'} className="flex items-center gap-1 xl:gap-2">
          <span className="text-[16px] font-semibold leading-[1.2] text-base-content dark:text-neutral-200 sm:text-lg xl:text-xl 2xl:text-2xl">
            <img src="/KubeStellar.png" alt="logo" className="h-auto w-52 object-contain" />
          </span>
        </Link>
      </div>

      <div className="3xl:gap-6 flex items-center gap-4 xl:gap-5">
        {authData?.isAuthenticated ? (
          <>
            <select
              className="select select-bordered mr-2 w-[200px]"
              value={currentContext}
              onChange={handleClusterChange}
            >
              <option value="" disabled>
                Select cluster
              </option>
              {contexts.map(ctx => (
                <option key={ctx.name} value={ctx.name}>
                  {ctx.name}
                </option>
              ))}
            </select>

            {/* User Profile Icon with Enhanced Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="btn btn-circle btn-ghost border-2 border-primary/30 bg-primary/5 transition-all duration-300 hover:scale-105 hover:bg-primary/10"
              >
                <ProfileIcon className="text-xl text-primary" />
              </button>

              {/* Enhanced User Dropdown Menu - CENTERED */}
              {showUserMenu && (
                <div
                  className="animate-fadeIn absolute left-1/2 z-50 mt-2 w-64 -translate-x-1/2 transform overflow-hidden rounded-xl
                  border border-gray-100 bg-white shadow-xl backdrop-blur-sm dark:border-gray-800
                  dark:bg-gray-900 dark:backdrop-blur-md"
                  style={{
                    boxShadow:
                      theme === 'dark'
                        ? '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                        : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  {/* User Info Section */}
                  <div className="border-b border-gray-100 bg-gradient-to-r from-primary/5 to-transparent p-5 dark:border-gray-800 dark:from-primary/20">
                    <div className="flex items-center justify-center">
                      <div className="text-center">
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 dark:border-primary/30">
                          <ProfileIcon className="text-3xl text-primary" />
                        </div>
                        <div className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Account
                        </div>
                        <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                          {username || 'Admin'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sign Out Button - Red Hover Only */}
                  <div className="p-3">
                    <button
                      onClick={handleLogout}
                      className="group w-full rounded-lg border-0 bg-white px-4 py-3 
      text-center
      text-sm font-medium
      text-gray-700 outline-none 
      transition-all duration-200
      hover:bg-red-50 focus:border-0
      focus:outline-none focus:ring-0
      focus:ring-offset-0 active:outline-none dark:bg-transparent
      dark:text-gray-200 dark:hover:bg-red-900/20
      dark:focus:border-0"
                    >
                      <div className="flex w-full items-center justify-start gap-3 pl-9">
                        <div
                          className="rounded-full bg-red-50 p-2 transition-colors 
        duration-200 group-hover:bg-red-100
        dark:bg-red-500/10 dark:group-hover:bg-red-500/20"
                        >
                          <FiLogOut className="text-red-500 dark:text-red-400" size={18} />
                        </div>
                        <span className="transition-colors duration-200 group-hover:text-red-500 dark:group-hover:text-red-400">
                          Sign Out
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle Button - MOVED AFTER profile button */}
            <button
              onClick={toggleTheme}
              className="btn btn-circle btn-ghost transition-colors duration-200 hover:bg-base-200"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <FiMoon className="text-xl text-indigo-500" />
              ) : (
                <FiSun className="text-xl text-yellow-500" />
              )}
            </button>
          </>
        ) : (
          <>
            {/* Theme Toggle Button (for logged out state) */}
            <button
              onClick={toggleTheme}
              className="btn btn-circle btn-ghost mr-2 transition-colors duration-200 hover:bg-base-200"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? (
                <FiMoon className="text-xl text-indigo-500" />
              ) : (
                <FiSun className="text-xl text-yellow-500" />
              )}
            </button>
          </>
        )}

        {/* Replace the fullscreen button with our component */}
        <div className="hidden xl:inline-flex">
          <FullScreenToggle position="inline" className="btn btn-circle btn-ghost" iconSize={20} />
        </div>
      </div>
    </div>
  );
};

export default Header;
