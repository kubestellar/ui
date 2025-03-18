import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Particle system for cosmic dust
const CosmicDust = () => {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 500;
  
  // Create particles
  const particles = useMemo(() => {
    const temp = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const radius = 5 + Math.random() * 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      temp[i3] = radius * Math.sin(phi) * Math.cos(theta);
      temp[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      temp[i3 + 2] = radius * Math.cos(phi);
    }
    return temp;
  }, [count]);
  
  // Animate particles
  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
    }
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particles, 3, false]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#00C2FF"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
};

export default CosmicDust; 