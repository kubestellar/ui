/**
 * Utility functions for route-related operations
 */

/**
 * Check if the current page is the login page
 * @returns {boolean} True if user is on login page, false otherwise
 */
export const isOnLoginPage = (): boolean => {
  return window.location.pathname === '/login' || window.location.pathname.startsWith('/login');
};

/**
 * Check if the current page is a public route that doesn't require authentication
 * @returns {boolean} True if user is on a public page, false otherwise
 */
export const isOnPublicRoute = (): boolean => {
  const publicRoutes = ['/login', '/install'];
  const currentPath = window.location.pathname;
  return publicRoutes.some(route => currentPath === route || currentPath.startsWith(route));
};
