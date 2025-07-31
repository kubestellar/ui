import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Box } from '@react-three/drei';
import { ColorTheme } from '../types';
import * as THREE from 'three';

interface ClusterVisualizationProps {
  available: boolean;
  isDark: boolean;
  colors: ColorTheme;
  size?: number;
}

// Pod component that floats around the master node
const Pod = ({
  position,
  color,
  speed = 1,
}: {
  position: [number, number, number];
  color: string;
  speed?: number;
}) => {
  const ref = useRef<THREE.Mesh>(null!);
  const radius = 0.15;
  const initialPosition = useRef(position);
  const time = useRef(Math.random() * 100);

  useFrame(() => {
    // Reduced speed by 40%
    time.current += 0.006 * speed;

    // Create orbital motion around the center
    const x = initialPosition.current[0] + Math.sin(time.current) * 0.5;
    const y = initialPosition.current[1] + Math.cos(time.current * 0.7) * 0.2;
    const z = initialPosition.current[2] + Math.cos(time.current) * 0.5;

    ref.current.position.set(x, y, z);

    // Gentle rotation with reduced speed
    ref.current.rotation.x += 0.006;
    ref.current.rotation.y += 0.006;
  });

  return (
    <Box ref={ref} args={[radius, radius, radius]} position={position}>
      <meshStandardMaterial color={color} />
    </Box>
  );
};

// Master node component
const MasterNode = ({ color }: { color: string }) => {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    // Reduced speed by 40%
    ref.current.rotation.y += 0.003;
  });

  return (
    <Sphere ref={ref} args={[0.4, 16, 16]}>
      <meshStandardMaterial color={color} />
    </Sphere>
  );
};

// Service component
const Service = ({ color, position }: { color: string; position: [number, number, number] }) => {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    // Reduced speed by 40%
    ref.current.rotation.y += 0.006;
  });

  return (
    <Box ref={ref} args={[0.3, 0.3, 0.3]} position={position}>
      <meshStandardMaterial color={color} transparent opacity={0.7} />
    </Box>
  );
};

// Main cluster visualization component
const ClusterScene: React.FC<ClusterVisualizationProps> = ({ available, colors }) => {
  const groupRef = useRef<THREE.Group>(null!);

  // Colors for different states - memoized to prevent recalculation
  const { masterColor, podColor, serviceColor } = useMemo(
    () => ({
      masterColor: available ? colors.success : colors.error,
      podColor: available ? colors.primary : colors.disabled,
      serviceColor: available ? colors.primaryLight : colors.disabled,
    }),
    [available, colors]
  );

  // Memoize pod configurations for better performance
  const pods = useMemo(
    () => [
      { position: [0.8, 0, 0] as [number, number, number], speed: 1.2 },
      { position: [-0.7, 0.2, 0.3] as [number, number, number], speed: 0.8 },
      { position: [0.2, 0.5, -0.7] as [number, number, number], speed: 1.0 },
      { position: [-0.3, -0.4, 0.6] as [number, number, number], speed: 1.1 },
      { position: [0.5, -0.3, -0.5] as [number, number, number], speed: 0.9 },
    ],
    []
  );

  // Memoize service configurations
  const services = useMemo(
    () => [
      { position: [0, 0.8, 0] as [number, number, number] },
      { position: [0, -0.8, 0] as [number, number, number] },
    ],
    []
  );

  // Animation for the whole group
  useFrame(state => {
    if (groupRef.current) {
      // Gentle floating animation with reduced speed
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Master node in the center */}
      <MasterNode color={masterColor} />

      {/* Pods orbiting around - using memoized array */}
      {pods.map((pod, index) => (
        <Pod key={index} position={pod.position} color={podColor} speed={pod.speed} />
      ))}

      {/* Services - using memoized array */}
      {services.map((service, index) => (
        <Service key={index} position={service.position} color={serviceColor} />
      ))}
    </group>
  );
};

const ClusterVisualization: React.FC<ClusterVisualizationProps> = ({
  available,
  isDark,
  colors,
  size = 100,
}) => {
  // Memoize the entire scene for better performance
  const scene = useMemo(
    () => <ClusterScene available={available} isDark={isDark} colors={colors} />,
    [available, isDark, colors]
  );

  // Memoize controls for better performance
  const controls = useMemo(
    () => (
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableRotate={true}
        autoRotate={true}
        autoRotateSpeed={0.6} // Reduced rotation speed
      />
    ),
    []
  );

  return (
    <div style={{ width: size, height: size }}>
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        {scene}
        {controls}
      </Canvas>
    </div>
  );
};

export default React.memo(ClusterVisualization);
