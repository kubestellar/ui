/**
 * Utility for prefetching routes in the background
 * to improve perceived performance when navigating between pages
 */

// Route definitions for prefetching
interface PrefetchRoute {
  path: string;
  load: () => Promise<unknown>;
  importance: 'high' | 'medium' | 'low';
}

// Define routes with their importance level
const routes: PrefetchRoute[] = [
  {
    path: '/',
    load: () => import('../components/Clusters'),
    importance: 'high',
  },
  {
    path: '/workloads/manage',
    load: () => import('../pages/WDS'),
    importance: 'medium',
  },
  {
    path: '/bp/manage',
    load: () => import('../pages/BP'),
    importance: 'medium',
  },
  {
    path: '/wds/treeview',
    load: () => import('../components/TreeViewComponent'),
    importance: 'low',
  },
  {
    path: '/wecs/treeview',
    load: () => import('../components/WecsTopology'),
    importance: 'low',
  },
];

// State to track already prefetched routes
const prefetchedRoutes = new Set<string>();

/**
 * Prefetch high-priority routes after the main page has loaded
 */
export function prefetchHighPriorityRoutes(): void {
  // Wait until the main page is interactive
  if (document.readyState === 'complete') {
    doHighPriorityPrefetch();
  } else {
    window.addEventListener('load', doHighPriorityPrefetch);
  }
}

/**
 * Prefetch a specific route
 * @param path - The route path to prefetch
 * @returns Promise that resolves when prefetching is complete
 */
export function prefetchRoute(path: string): Promise<unknown> | null {
  if (prefetchedRoutes.has(path)) {
    return null; // Already prefetched
  }

  const route = routes.find(r => r.path === path);
  if (!route) return null;

  console.log(`Prefetching route: ${path}`);
  prefetchedRoutes.add(path);

  // Use requestIdleCallback when available to avoid impacting performance
  if ('requestIdleCallback' in window) {
    return new Promise(resolve => {
      window.requestIdleCallback(() => {
        route.load().then(resolve);
      });
    });
  }

  // Fall back to setTimeout for browsers without requestIdleCallback
  return new Promise(resolve => {
    setTimeout(() => {
      route.load().then(resolve);
    }, 1000); // Wait 1 second before prefetching
  });
}

/**
 * Prefetch routes based on user navigation patterns
 * @param currentPath - The current route path
 */
export function prefetchRelatedRoutes(currentPath: string): void {
  // Map of related routes to prefetch when on a specific path
  const relatedRoutes: Record<string, string[]> = {
    '/': ['/workloads/manage', '/bp/manage'],
    '/workloads/manage': ['/wds/treeview', '/bp/manage'],
    '/bp/manage': ['/workloads/manage'],
    '/wds/treeview': ['/wecs/treeview'],
    '/wecs/treeview': ['/wds/treeview'],
  };

  if (relatedRoutes[currentPath]) {
    // Use requestIdleCallback to avoid impacting current page performance
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(
        () => {
          relatedRoutes[currentPath].forEach(path => prefetchRoute(path));
        },
        { timeout: 2000 }
      );
    } else {
      // Fall back to setTimeout for browsers without requestIdleCallback
      setTimeout(() => {
        relatedRoutes[currentPath].forEach(path => prefetchRoute(path));
      }, 2000);
    }
  }
}

// Internal function to prefetch high priority routes
function doHighPriorityPrefetch(): void {
  // Get all high priority routes
  const highPriorityRoutes = routes.filter(r => r.importance === 'high');

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(
      () => {
        highPriorityRoutes.forEach(route => {
          if (!prefetchedRoutes.has(route.path)) {
            prefetchedRoutes.add(route.path);
            route.load();
          }
        });
      },
      { timeout: 3000 }
    );
  } else {
    setTimeout(() => {
      highPriorityRoutes.forEach(route => {
        if (!prefetchedRoutes.has(route.path)) {
          prefetchedRoutes.add(route.path);
          route.load();
        }
      });
    }, 1500);
  }
}
