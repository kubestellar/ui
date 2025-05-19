import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Optimized particle system for cosmic dust
interface CosmicDustProps {
  isActive?: boolean;
}

const CosmicDust = ({ isActive = true }: CosmicDustProps) => {
  const particlesRef = useRef<THREE.Points>(null);
  // Reduced particle count for better performance
  const count = 200;

  // Create particles with optimized buffer geometry and attributes
  const { positions, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const radius = 5 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      // Vary sizes slightly for more natural look
      sizes[i] = 0.03 + Math.random() * 0.04;
    }

    return { positions, sizes };
  }, [count]);

  // Optimize animation with throttled updates
  useFrame(state => {
    // Skip animation when component is not active
    if (!isActive || !particlesRef.current) return;

    // Reduce rotation frequency for better performance
    particlesRef.current.rotation.y = state.clock.getElapsedTime() * 0.025;
  });

  return (
    <points ref={particlesRef} frustumCulled>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
          usage={THREE.StaticDrawUsage}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
          usage={THREE.StaticDrawUsage}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#00C2FF"
        transparent
        opacity={0.6}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

export default CosmicDust;
