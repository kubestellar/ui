// // PluginLoader.tsx
// // Dynamically loads and renders frontend plugins based on manifest metadata

// import React, { useEffect, useState, Suspense } from 'react';
// import { PluginManifest, fetchManifests } from './PluginAPI';

// type LoadedPlugin = {
//   manifest: PluginManifest;
//   Component: React.LazyExoticComponent<React.ComponentType<any>>;
// };

// export const PluginLoader: React.FC = () => {
//   const [plugins, setPlugins] = useState<LoadedPlugin[]>([]);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     fetchManifests()
//       .then(manifests => {
//         const loaded = manifests.map(manifest => {
//           const url = manifest.entry as string;
//           const Component = React.lazy(() => import(/* webpackIgnore: true */ url));
//           return { manifest, Component };
//         });
//         setPlugins(loaded);
//       })
//       .catch(err => {
//         console.error('Failed to fetch plugin manifests', err);
//         setError('Could not load plugins');
//       });
//   }, []);

//   if (error) {
//     return <div className="plugin-error">{error}</div>;
//   }

//   return (
//     <div className="plugin-container">
//       {plugins.map(({ manifest, Component }) => (
//         <div key={manifest.name} className="plugin-wrapper">
//           <h3>{manifest.displayName}</h3>
//           <Suspense fallback={<div>Loading {manifest.displayName}…</div>}>
//             <Component />
//           </Suspense>
//         </div>
//       ))}
//     </div>
//   );
// };
