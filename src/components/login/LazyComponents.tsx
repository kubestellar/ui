import { lazy } from 'react';

export const LazyNetworkGlobe = lazy(() => import('./NetworkGlobe'));
export const LazyKubeStellarLayout = lazy(() => import('./KubeStellarLayout'));
export const LazyLoadingScreen = lazy(() => import('./LoadingScreen'));

export const LazyCosmicDust = lazy(() => import('./globe/CosmicDust'));
export const LazyLogoElement = lazy(() => import('./globe/LogoElement'));
export const LazyDataPacket = lazy(() => import('./globe/DataPacket'));
