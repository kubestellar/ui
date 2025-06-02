// import { lazy, Suspense } from 'react';
// import { RouteObject } from 'react-router-dom';
// import KubeStellarStatusChecker from '../components/KubeStellarStatusChecker';
// import { Layout } from '../components/Layout';
// import LoadingFallback from '../components/LoadingFallback';
// import ProtectedRoute from '../components/ProtectedRoute';
// import PublicRoute from '../components/PublicRoute';
// import TreeView from '../components/TreeViewComponent';
// import WecsTreeview from '../components/WecsTopology';
// import KubeStellarVisualization from '../components/login/index';
// import BP from '../pages/BP';
// import InstallationPage from '../pages/InstallationPage';
// import NotFoundPage from '../pages/NotFoundPage';
// import Plugins from '../pages/Plugins';
// import TestPluginPage from '../pages/TestPluginPage';
// import WDS from '../pages/WDS';
// const ClustersLazy = lazy(() => import(/* webpackPrefetch: true */ '../components/Clusters'));
// const ITSLazy = lazy(() => import(/* webpackPrefetch: true */ '../pages/ITS'));
// // const TestPluginPageLazy = lazy(() => import('../pages/TestPluginPage'));

// export const routesConfig: RouteObject[] = [
//   {
//     path: '/login',
//     element: (
//       <PublicRoute>
//         <KubeStellarStatusChecker>
//           <KubeStellarVisualization />
//         </KubeStellarStatusChecker>
//       </PublicRoute>
//     ),
//   },
//   {
//     path: '/install',
//     element: (
//       <PublicRoute>
//         <KubeStellarStatusChecker>
//           <InstallationPage />
//         </KubeStellarStatusChecker>
//       </PublicRoute>
//     ),
//   },
//   {
//     path: '/',
//     element: (
//       <KubeStellarStatusChecker>
//         <Layout />
//       </KubeStellarStatusChecker>
//     ),
//     children: [
//       {
//         index: true,
//         element: (
//           <ProtectedRoute>
//             <Suspense fallback={<LoadingFallback message="Loading clusters..." size="medium" />}>
//               <ClustersLazy />
//             </Suspense>
//           </ProtectedRoute>
//         ),
//       },
//       {
//         path: 'its',
//         element: (
//           <ProtectedRoute>
//             <Suspense fallback={<LoadingFallback message="Loading ITS..." size="small" />}>
//               <ITSLazy />
//             </Suspense>
//           </ProtectedRoute>
//         ),
//       },
//       {
//         path: 'workloads/manage',
//         element: (
//           <ProtectedRoute>
//             <WDS />
//           </ProtectedRoute>
//         ),
//       },
//       {
//         path: 'bp/manage',
//         element: (
//           <ProtectedRoute>
//             <BP />
//           </ProtectedRoute>
//         ),
//       },
//       {
//         path: 'wds/treeview',
//         element: (
//           <ProtectedRoute>
//             <TreeView />
//           </ProtectedRoute>
//         ),
//       },
//       {
//         path: 'wecs/treeview',
//         element: (
//           <ProtectedRoute>
//             <WecsTreeview />
//           </ProtectedRoute>
//         ),
//       },
//       {
//         path: 'plugins',
//         element: (
//           <ProtectedRoute>
//             <Plugins />
//           </ProtectedRoute>
//         ),
//         children: [
//           {
//             path: 'test-plugin',
//             element: (
//               <Suspense fallback={<LoadingFallback message="Loading plugin..." size="small" />}>
//                 <TestPluginPage />
//               </Suspense>
//             ),
//           },
//         ],
//       },
//       {
//         path: '*',
//         element: <NotFoundPage />,
//       },
//     ],
//   },
// ];


// import { lazy, Suspense } from 'react';
// import { RouteObject } from 'react-router-dom';
// import KubeStellarStatusChecker from '../components/KubeStellarStatusChecker';
// import { Layout } from '../components/Layout';
// import LoadingFallback from '../components/LoadingFallback';
// import ProtectedRoute from '../components/ProtectedRoute';
// import PublicRoute from '../components/PublicRoute';
// import TreeView from '../components/TreeViewComponent';
// import WecsTreeview from '../components/WecsTopology';
// import KubeStellarVisualization from '../components/login/index';
// import BP from '../pages/BP';
// import InstallationPage from '../pages/InstallationPage';
// import NotFoundPage from '../pages/NotFoundPage';
// import Plugins from '../pages/Plugins';
// import TestPluginPage from '../pages/TestPluginPage';
// import WDS from '../pages/WDS';

// const ClustersLazy = lazy(() => import(/* webpackPrefetch: true */ '../components/Clusters'));
// const ITSLazy = lazy(() => import(/* webpackPrefetch: true */ '../pages/ITS'));

// export const routesConfig: RouteObject[] = [
//   {
//     path: '/login',
//     element: (
//       <PublicRoute>
//         <KubeStellarStatusChecker>
//           <KubeStellarVisualization />
//         </KubeStellarStatusChecker>
//       </PublicRoute>
//     ),
//   },
//   {
//     path: '/install',
//     element: (
//       <PublicRoute>
//         <KubeStellarStatusChecker>
//           <InstallationPage />
//         </KubeStellarStatusChecker>
//       </PublicRoute>
//     ),
//   },
//   {
//     path: '/',
//     element: (
//       <KubeStellarStatusChecker>
//         <Layout />
//       </KubeStellarStatusChecker>
//     ),
//     children: [
//       {
//         index: true,
//         element: (
//           <ProtectedRoute>
//             <Suspense fallback={<LoadingFallback message="Loading clusters..." size="medium" />}>
//               <ClustersLazy />
//             </Suspense>
//           </ProtectedRoute>
//         ),
//       },
//       {
//         path: 'its',
//         element: (
//           <ProtectedRoute>
//             <Suspense fallback={<LoadingFallback message="Loading ITS..." size="small" />}>
//               <ITSLazy />
//             </Suspense>
//           </ProtectedRoute>
//         ),
//       },
//       {
//         path: 'workloads/manage',
//         element: (
//           <ProtectedRoute>
//             <WDS />
//           </ProtectedRoute>
//         ),
//       },
//       {
//         path: 'bp/manage',
//         element: (
//           <ProtectedRoute>
//             <BP />
//           </ProtectedRoute>
//         ),
//       },
//       {
//         path: 'wds/treeview',
//         element: (
//           <ProtectedRoute>
//             <TreeView />
//           </ProtectedRoute>
//         ),
//       },
//       {
//         path: 'wecs/treeview',
//         element: (
//           <ProtectedRoute>
//             <WecsTreeview />
//           </ProtectedRoute>
//         ),
//       },
//       {
//         path: 'plugins',
//         element: (
//           <ProtectedRoute>
//             <Plugins />
//           </ProtectedRoute>
//         ),
//         children: [
//           {
//             path: 'test-plugin',
//             element: (
//               <Suspense fallback={<LoadingFallback message="Loading plugin..." size="small" />}>
//                 <TestPluginPage />
//               </Suspense>
//             ),
//           },
//         ],
//       },    {
//         path: 'onboard',
//         element: (
//           <ProtectedRoute>
//             {window.KubeStellarPlugin?.OnboardForm ? (
//               <window.KubeStellarPlugin.OnboardForm />
//             ) : (
//               <div>Plugin Component Not Loaded</div>
//             )}
//           </ProtectedRoute>
//         ),
//       },
//       {
//         path: 'detach',
//         element: (
//           <ProtectedRoute>
//             {window.KubeStellarPlugin?.DetachForm ? (
//               <window.KubeStellarPlugin.DetachForm />
//             ) : (
//               <div>Plugin Component Not Loaded</div>
//             )}
//           </ProtectedRoute>
//         ),
//       },
//       {
//         path: '*',
//         element: <NotFoundPage />,
//       },
//     ],
//   },
// ];




import { lazy, Suspense } from 'react';
import { RouteObject } from 'react-router-dom';
import KubeStellarStatusChecker from '../components/KubeStellarStatusChecker';
import { Layout } from '../components/Layout';
import LoadingFallback from '../components/LoadingFallback';
import ProtectedRoute from '../components/ProtectedRoute';
import PublicRoute from '../components/PublicRoute';
import TreeView from '../components/TreeViewComponent';
import WecsTreeview from '../components/WecsTopology';
import KubeStellarVisualization from '../components/login/index';
import BP from '../pages/BP';
import InstallationPage from '../pages/InstallationPage';
import NotFoundPage from '../pages/NotFoundPage';
import Plugins from '../pages/Plugins';
import TestPluginPage from '../pages/TestPluginPage';
import WDS from '../pages/WDS';

const ClustersLazy = lazy(() => import(/* webpackPrefetch: true */ '../components/Clusters'));
const ITSLazy = lazy(() => import(/* webpackPrefetch: true */ '../pages/ITS'));

export const routesConfig: RouteObject[] = [
  {
    path: '/login',
    element: (
      <PublicRoute>
        <KubeStellarStatusChecker>
          <KubeStellarVisualization />
        </KubeStellarStatusChecker>
      </PublicRoute>
    ),
  },
  {
    path: '/install',
    element: (
      <PublicRoute>
        <KubeStellarStatusChecker>
          <InstallationPage />
        </KubeStellarStatusChecker>
      </PublicRoute>
    ),
  },
  {
    path: '/',
    element: (
      <KubeStellarStatusChecker>
        <Layout />
      </KubeStellarStatusChecker>
    ),
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback message="Loading clusters..." size="medium" />}>
              <ClustersLazy />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'its',
        element: (
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback message="Loading ITS..." size="small" />}>
              <ITSLazy />
            </Suspense>
          </ProtectedRoute>
        ),
      },
      {
        path: 'workloads/manage',
        element: (
          <ProtectedRoute>
            <WDS />
          </ProtectedRoute>
        ),
      },
      {
        path: 'bp/manage',
        element: (
          <ProtectedRoute>
            <BP />
          </ProtectedRoute>
        ),
      },
      {
        path: 'wds/treeview',
        element: (
          <ProtectedRoute>
            <TreeView />
          </ProtectedRoute>
        ),
      },
      {
        path: 'wecs/treeview',
        element: (
          <ProtectedRoute>
            <WecsTreeview />
          </ProtectedRoute>
        ),
      },
      {
        path: 'plugins',
        element: (
          <ProtectedRoute>
            <Plugins />
          </ProtectedRoute>
        ),
        children: [
          {
            path: 'test-plugin',
            element: (
              <Suspense fallback={<LoadingFallback message="Loading plugin..." size="small" />}>
                <TestPluginPage />
              </Suspense>
            ),
            children: [
              {
                path: 'clusters/api/onboard',
                element: (
                  <>
                    {console.log('[Router] Matched route: /clusters/onboard')}
                    <ProtectedRoute>
                      <>
                        {console.log('[ProtectedRoute] Rendering children')}
                        {window.KubeStellarPlugin ? (
                          window.KubeStellarPlugin.OnboardForm ? (
                            <>
                              {console.log('[Plugin] OnboardForm component found')}
                              <window.KubeStellarPlugin.OnboardForm />
                            </>
                          ) : (
                            <>
                              {console.warn('[Plugin] OnboardForm is missing from KubeStellarPlugin')}
                              <div>Plugin Component Not Loaded (OnboardForm missing)</div>
                            </>
                          )
                        ) : (
                          <>
                            {console.warn('[Plugin] KubeStellarPlugin is not defined')}
                            <div>Plugin Component Not Loaded (Plugin not available)</div>
                          </>
                        )}
                      </>
                    </ProtectedRoute>
                  </>
                ),
              }
              ,
              {
                path: 'clusters/api/detach',
                element: (
                  <ProtectedRoute>
                    {window.KubeStellarPlugin?.DetachForm ? (
                      <window.KubeStellarPlugin.DetachForm />
                    ) : (
                      <div>Plugin Component Not Loaded</div>
                    )}
                  </ProtectedRoute>
                ),
              },
            ],
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
];
