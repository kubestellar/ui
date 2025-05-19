import { Suspense, useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useProgress, Html } from '@react-three/drei';
import NetworkGlobe from './NetworkGlobe';
import KubeStellarLayout from './KubeStellarLayout';
import LoadingScreen from './LoadingScreen';

// Custom Stars component instead of using the one from drei
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

// Loading indicator for 3D content
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

/**
 * KubeStellarVisualization component for KubeStellar visualization
 *
 * This component orchestrates:
 * 1. Initial loading animation
 * 2. 3D visualization of KubeStellar architecture
 * 3. Login form with animations
 *
 * For easy implementation:
 * - Use the entire component for a full-page experience
 * - Or use individual components (NetworkGlobe, LoginForm) separately
 */
export function KubeStellarVisualization() {
  // State for controlling animations and component visibility
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);

  // Track document visibility to pause rendering when tab/page is not active
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentVisible(!document.hidden);
    };

    // Add event listener for visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up event listener
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Simulate initial loading state - streamlined to reduce unnecessary delay
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 600);
    // Show login form with a slight delay after the main content loads
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
        {/* Global loading overlay */}
        <LoadingScreen isLoaded={isLoaded} />

        {/* Main KubeStellar Layout */}
        <KubeStellarLayout
          isLoaded={isLoaded}
          showLogin={showLogin}
          leftSide={
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <Canvas
                camera={{ position: [0, 0, 12], fov: 40 }}
                gl={{ antialias: true, alpha: false }}
                dpr={[1, 2]} // Responsive pixel ratio
                frameloop={isDocumentVisible ? 'always' : 'never'} // Stop the render loop when tab is not visible
              >
                <color attach="background" args={['#050a15']} />

                {/* Enhanced lighting to simulate bloom effect */}
                <ambientLight intensity={0.3} />
                <pointLight position={[10, 10, 10]} intensity={1.2} />
                <pointLight position={[-10, -10, -10]} intensity={0.8} color="#6236FF" />
                <pointLight position={[0, 5, 5]} intensity={0.5} color="#00C2FF" />

                {/* Add extra lights to enhance glow */}
                <pointLight position={[5, 0, 5]} intensity={0.4} color="#FF5E84" />
                <pointLight position={[-5, 0, -5]} intensity={0.4} color="#FFD166" />

                {/* Custom stars implementation */}
                <CustomStars count={3000} />

                <Suspense fallback={<Loader />}>
                  <NetworkGlobe isLoaded={isLoaded} />
                </Suspense>

                <OrbitControls
                  enableZoom={true}
                  enablePan={false}
                  autoRotate={isDocumentVisible} // Only auto-rotate when tab is visible
                  autoRotateSpeed={0.3}
                  minDistance={8}
                  maxDistance={20}
                  maxPolarAngle={Math.PI * 0.8}
                  minPolarAngle={Math.PI * 0.2}
                  enableDamping
                  dampingFactor={0.05}
                />
              </Canvas>
            </div>
          }
        />
      </div>
    </div>
  );
}

// Export individual components for more flexibility
// Fix the incorrect export path
export { default as NetworkGlobe } from './NetworkGlobe';
export { default as KubeStellarLayout } from './KubeStellarLayout';
export { default as LoadingScreen } from './LoadingScreen';

// Default export for simpler imports
export default KubeStellarVisualization;
