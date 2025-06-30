import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Optimized glowing sphere effect
interface GlowingSphereProps {
  position?: [number, number, number];
  color: string;
  size?: number;
  intensity?: number;
}

const GlowingSphere = ({
  position = [0, 0, 0],
  color,
  size = 0.3,
  intensity = 1.0,
}: GlowingSphereProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const frameCount = useRef(0);

  // Create shared geometries to reduce draw calls
  const coreGeometry = useMemo(() => new THREE.SphereGeometry(size, 16, 16), [size]);
  const outerGeometry = useMemo(() => new THREE.SphereGeometry(size * 1.2, 12, 12), [size]);
  const innerGeometry = useMemo(() => new THREE.SphereGeometry(size * 0.8, 12, 12), [size]);

  // Create shared materials
  const coreMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: color,
      }),
    [color]
  );

  const outerMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.3 * intensity,
        depthWrite: false,
      }),
    [color, intensity]
  );

  const innerMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 'white',
        transparent: true,
        opacity: 0.7 * intensity,
        depthWrite: false,
      }),
    [intensity]
  );

  // Optimize animation to run less frequently
  useFrame(({ clock }) => {
    // Skip frames for better performance
    frameCount.current += 1;
    if (frameCount.current % 2 !== 0) return;

    if (meshRef.current) {
      const t = clock.getElapsedTime();
      // Use less intensive math operations
      meshRef.current.scale.setScalar(1 + Math.sin(t * 2) * 0.1 * intensity);
    }
  });

  return (
    <group position={position} frustumCulled>
      {/* Core sphere - reduced polygon count */}
      <mesh ref={meshRef} geometry={coreGeometry} material={coreMaterial} />

      {/* Outer glow - reduced polygon count */}
      <mesh geometry={outerGeometry} material={outerMaterial} />

      {/* Brightest inner glow - reduced polygon count */}
      <mesh geometry={innerGeometry} material={innerMaterial} />
    </group>
  );
};

export default GlowingSphere;
