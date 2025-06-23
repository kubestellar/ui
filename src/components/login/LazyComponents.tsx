import { lazy } from 'react';

// Lazily load 3D components that are only needed for the login page
export const LazyNetworkGlobe = lazy(() => import('./NetworkGlobe'));
export const LazyKubeStellarLayout = lazy(() => import('./KubeStellarLayout'));
export const LazyLoadingScreen = lazy(() => import('./LoadingScreen'));

// Lazily load expensive Three.js components
export const LazyCosmicDust = lazy(() => import('./globe/CosmicDust'));
export const LazyLogoElement = lazy(() => import('./globe/LogoElement'));
export const LazyDataPacket = lazy(() => import('./globe/DataPacket'));
