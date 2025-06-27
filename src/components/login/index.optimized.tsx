import { Suspense, useState, useEffect, useMemo, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import { useProgress, Html } from '@react-three/drei';
import { useTranslation } from 'react-i18next';

import { LazyNetworkGlobe, LazyKubeStellarLayout, LazyLoadingScreen } from './LazyComponents';

const OrbitControls = lazy(() =>
  import('@react-three/drei').then(module => ({ default: module.OrbitControls }))
);

function CustomStars({ count = 3000 }) {
  const positions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 200;
      positions[i3 + 1] = (Math.random() - 0.5) * 200;
      positions[i3 + 2] = (Math.random() - 0.5) * 200;
    }
    return positions;
  }, [count]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3, false]} />
      </bufferGeometry>
      <pointsMaterial size={0.5} color="#ffffff" sizeAttenuation transparent opacity={0.8} />
    </points>
  );
}

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center">
        <div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500"></div>
        <p className="font-medium text-blue-300">{progress.toFixed(0)}% loaded</p>
      </div>
    </Html>
  );
}

export function KubeStellarVisualization() {
  const { t } = useTranslation();

  const [isLoaded, setIsLoaded] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [is3DEnabled, setIs3DEnabled] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentVisible(!document.hidden);
    };

    const checkDeviceCapabilities = () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      const navWithMemory = navigator as Navigator & { deviceMemory?: number };
      const hasLowMemory = navWithMemory.deviceMemory && navWithMemory.deviceMemory < 4;

      if (isMobile || hasLowMemory) {
        setIs3DEnabled(false);
      }
    };

    checkDeviceCapabilities();

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 600);
    const loginTimer = setTimeout(() => setShowLogin(true), 900);

    return () => {
      clearTimeout(timer);
      clearTimeout(loginTimer);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        zIndex: 9999,
        background: '#0a0f1c',
      }}
    >
      <div className="flex min-h-screen flex-col bg-[#0a0f1c] md:flex-row">
        <Suspense fallback={<div className="loading-fallback">{t('Loading...')}</div>}>
          <LazyLoadingScreen isLoaded={isLoaded} />
        </Suspense>

        <Suspense fallback={<div className="loading-fallback">{t('Loading interface...')}</div>}>
          <LazyKubeStellarLayout
            isLoaded={isLoaded}
            showLogin={showLogin}
            leftSide={
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                {is3DEnabled ? (
                  <Canvas
                    camera={{ position: [0, 0, 12], fov: 40 }}
                    gl={{ antialias: true, alpha: false }}
                    dpr={window.devicePixelRatio > 2 ? 2 : window.devicePixelRatio} // Limit DPR for performance
                    frameloop={isDocumentVisible ? 'always' : 'never'} // Stop the render loop when tab is not visible
                  >
                    <color attach="background" args={['#050a15']} />

                    <ambientLight intensity={0.3} />
                    <pointLight position={[10, 10, 10]} intensity={1.2} />
                    <pointLight position={[-10, -10, -10]} intensity={0.8} color="#6236FF" />

                    <CustomStars count={window.innerWidth < 768 ? 1500 : 3000} />

                    <Suspense fallback={<Loader />}>
                      <LazyNetworkGlobe isLoaded={isLoaded} />
                    </Suspense>

                    <Suspense fallback={null}>
                      <OrbitControls
                        enableZoom={true}
                        enablePan={false}
                        autoRotate={isDocumentVisible}
                        autoRotateSpeed={0.3}
                        minDistance={8}
                        maxDistance={20}
                        maxPolarAngle={Math.PI * 0.8}
                        minPolarAngle={Math.PI * 0.2}
                        enableDamping
                        dampingFactor={0.05}
                      />
                    </Suspense>
                  </Canvas>
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#050a15]">
                    <div className="text-center">
                      <h1 className="mb-4 text-3xl font-bold text-blue-400">KubeStellar</h1>
                      <p className="text-lg text-blue-300">
                        {t(
                          'Multi-cluster Configuration Management for Edge, Multi-Cloud, and Hybrid Cloud'
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            }
          />
        </Suspense>
      </div>
    </div>
  );
}

export { LazyNetworkGlobe as NetworkGlobe };
export { LazyKubeStellarLayout as KubeStellarLayout };
export { LazyLoadingScreen as LoadingScreen };

export default KubeStellarVisualization;
