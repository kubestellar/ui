import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Torus } from '@react-three/drei';
import * as THREE from 'three';
import { COLORS } from './globe/colors';
import CosmicDust from './globe/CosmicDust';
import DataPacket from './globe/DataPacket';
import LogoElement from './globe/LogoElement';
import Cluster from './globe/Cluster';

// Add this interface for the component props
interface NetworkGlobeProps {
  isLoaded?: boolean;
}

// Define interfaces for better type safety
interface FlowMaterial extends THREE.Material {
  opacity: number;
  color: THREE.Color;
  dashSize?: number;
  gapSize?: number;
}

interface FlowChild extends THREE.Object3D {
  material?: FlowMaterial;
}

interface CentralNodeChild extends THREE.Object3D {
  material?: THREE.Material & { opacity?: number };
}

// Update the main component to accept props
const NetworkGlobe = ({ isLoaded = true }: NetworkGlobeProps) => {
  const globeRef = useRef<THREE.Mesh>(null);
  const centralNodeRef = useRef<THREE.Group>(null);
  const dataFlowsRef = useRef<THREE.Group>(null);
  const frameCount = useRef(0);

  // Track document visibility to pause rendering when tab/page is not active
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);

  // Animation state for data flows
  const [activeFlows, setActiveFlows] = useState<number[]>([]);
  const [animationProgress, setAnimationProgress] = useState(0);

  // Handle visibility change to pause rendering
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

  // Create cluster configurations with updated names and descriptions
  const clusters = useMemo(
    () => [
      {
        name: 'Edge Cluster',
        position: [0, 3, 0] as [number, number, number],
        nodeCount: 6,
        radius: 0.8,
        color: COLORS.primary,
        description: 'Edge computing resources for low-latency processing',
      },
      {
        name: 'AI Inferencing Cluster',
        position: [3, 0, 0] as [number, number, number],
        nodeCount: 8,
        radius: 1,
        color: COLORS.aiInference,
        description: 'Real-time AI model inference and prediction services',
      },
      {
        name: 'AI Training Cluster',
        position: [0, -3, 0] as [number, number, number],
        nodeCount: 5,
        radius: 0.7,
        color: COLORS.aiTraining,
        description: 'High-performance compute for AI model training',
      },
      {
        name: 'Service Cluster',
        position: [-3, 0, 0] as [number, number, number],
        nodeCount: 7,
        radius: 0.9,
        color: COLORS.accent2,
        description: 'Core microservices and API endpoints',
      },
      {
        name: 'Compute Cluster',
        position: [2, 2, -2] as [number, number, number],
        nodeCount: 4,
        radius: 0.6,
        color: COLORS.success,
        description: 'General-purpose compute resources',
      },
    ],
    []
  );

  // Generate data flow paths - optimized to create fewer paths
  const dataFlows = useMemo(() => {
    const flows: { path: [number, number, number][]; id: number; type: string }[] = [];
    const centralPos: [number, number, number] = [0, 0, 0];

    // Connect central node to each cluster
    clusters.forEach((cluster, clusterIdx) => {
      flows.push({
        path: [centralPos, cluster.position],
        id: clusterIdx,
        type: 'control',
      });
    });

    // Add some cross-cluster connections with specific types
    // AI Training to AI Inferencing (model deployment)
    flows.push({
      path: [clusters[2].position, clusters[1].position],
      id: clusters.length + 1,
      type: 'model',
    });

    // Edge to AI Inferencing (inference requests)
    flows.push({
      path: [clusters[0].position, clusters[1].position],
      id: clusters.length + 2,
      type: 'inference',
    });

    // Add fewer cross-cluster connections
    const maxConnections = 3; // Limit the number of additional connections
    let connectionCount = 0;

    for (let i = 0; i < clusters.length && connectionCount < maxConnections; i++) {
      for (let j = i + 1; j < clusters.length && connectionCount < maxConnections; j++) {
        if (Math.random() > 0.5) {
          flows.push({
            path: [clusters[i].position, clusters[j].position],
            id: clusters.length + i * 10 + j,
            type: 'data',
          });
          connectionCount++;
        }
      }
    }

    return flows;
  }, [clusters]);

  // Shared materials for better performance
  const globeMaterial = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: COLORS.primary,
        transparent: true,
        wireframe: true,
        depthWrite: false,
      }),
    []
  );

  const gridMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: COLORS.primary,
        transparent: true,
        depthWrite: false,
      }),
    []
  );

  // Animate data flows - only start when loaded and throttle updates
  useEffect(() => {
    if (!isLoaded || !isDocumentVisible) return;

    const interval = setInterval(() => {
      // Activate fewer flows at once
      const numFlows = Math.min(Math.floor(dataFlows.length / 3), 3);
      const randomFlows = Array.from({ length: numFlows }, () =>
        Math.floor(Math.random() * dataFlows.length)
      );
      setActiveFlows(randomFlows);
    }, 4000); // Longer interval for better performance

    return () => clearInterval(interval);
  }, [dataFlows.length, isLoaded, isDocumentVisible]);

  // Optimize update function to run less frequently for non-critical animations
  const updateOpacity = useCallback(
    (material: FlowMaterial, targetOpacity: number, type: string) => {
      if (!material) return;

      // Set opacity with damping
      material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.1);

      // Set color based on flow type
      if (type === 'model') {
        material.color.set(COLORS.aiTraining);
      } else if (type === 'inference') {
        material.color.set(COLORS.aiInference);
      } else if (type === 'control') {
        material.color.set(COLORS.secondary);
      } else {
        material.color.set(COLORS.success);
      }

      // Update dash properties if available
      if (material.dashSize !== undefined) {
        material.dashSize = type === 'control' ? 0.1 : 0.05;
      }
      if (material.gapSize !== undefined) {
        material.gapSize = type === 'control' ? 0.05 : 0.1;
      }
    },
    []
  );

  // Animation frame updates with performance optimizations
  useFrame(state => {
    // Skip all rendering when document is not visible
    if (!isDocumentVisible) return;

    // Increment frame counter
    frameCount.current += 1;

    // Update animation progress for reveal effect - only when loading
    if (isLoaded && animationProgress < 1) {
      setAnimationProgress(Math.min(animationProgress + 0.01, 1));
    }

    // Rotate the globe slowly - limit updates for better performance
    if (globeRef.current && frameCount.current % 2 === 0) {
      globeRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
      globeRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.02;

      // Update material opacity
      if (globeMaterial.opacity !== 0.08 * animationProgress) {
        globeMaterial.opacity = 0.08 * animationProgress;
      }

      // Scale up the globe as it loads
      const scale = isLoaded ? 1 * animationProgress : 0.5;
      globeRef.current.scale.setScalar(scale);
    }

    // Animate central node - less frequently
    if (centralNodeRef.current && frameCount.current % 3 === 0) {
      centralNodeRef.current.rotation.y = state.clock.getElapsedTime() * 0.2;
      centralNodeRef.current.scale.setScalar(
        (1 + Math.sin(state.clock.getElapsedTime() * 1.5) * 0.05) * animationProgress
      );

      // Fade in the central node with throttled updates
      centralNodeRef.current.children.forEach((child: CentralNodeChild) => {
        if (child.material && typeof child.material.opacity !== 'undefined') {
          child.material.opacity = THREE.MathUtils.lerp(
            child.material.opacity || 0,
            animationProgress,
            0.1
          );
        }
      });
    }

    // Animate data flows - only every 3 frames
    if (dataFlowsRef.current && frameCount.current % 3 === 0) {
      dataFlowsRef.current.children.forEach((flow: FlowChild, i) => {
        if (flow.material) {
          const flowData = dataFlows[i];
          const flowType = flowData?.type || 'data';

          const targetOpacity = activeFlows.includes(i)
            ? 0.8 * animationProgress
            : 0.1 * animationProgress;

          updateOpacity(flow.material, targetOpacity, flowType);
        }
      });
    }
  });

  return (
    <group>
      {/* Background cosmic dust */}
      <CosmicDust isActive={isDocumentVisible} />

      {/* Main globe - represents the global network */}
      <Sphere ref={globeRef} args={[3.5, 32, 32]} frustumCulled>
        <primitive object={globeMaterial} />
      </Sphere>

      {/* Grid lines for the globe - optimized with shared geometry */}
      <group rotation={[0, 0, 0]}>
        {Array.from({ length: 4 }).map((_, idx) => (
          <Torus
            key={`h-${idx}`}
            args={[3.5, 0.01, 8, 50]}
            rotation={[0, 0, (Math.PI * idx) / 4]}
            frustumCulled
          >
            <primitive
              object={gridMaterial.clone()}
              attach="material"
              opacity={0.1 * animationProgress}
            />
          </Torus>
        ))}
        {Array.from({ length: 4 }).map((_, idx) => (
          <Torus
            key={`v-${idx}`}
            args={[3.5, 0.01, 8, 50]}
            rotation={[Math.PI / 2, (Math.PI * idx) / 4, 0]}
            frustumCulled
          >
            <primitive
              object={gridMaterial.clone()}
              attach="material"
              opacity={0.1 * animationProgress}
            />
          </Torus>
        ))}
      </group>

      {/* Central hub - representing the orchestration core */}
      <group ref={centralNodeRef}>
        <LogoElement animate={isLoaded && isDocumentVisible} />
      </group>

      {/* Clusters of nodes */}
      {clusters.map((cluster, idx) => (
        <Cluster key={idx} {...cluster} isActive={isDocumentVisible} />
      ))}

      {/* Data flow connections - use reduced detail and memoized materials */}
      <group ref={dataFlowsRef}>
        {dataFlows.map((flow, idx) => (
          <group key={idx} frustumCulled>
            {/* Only render active data packets to improve performance */}
            {activeFlows.includes(idx) && isDocumentVisible && (
              <DataPacket
                path={flow.path}
                speed={flow.type === 'control' ? 1.5 : 1}
                color={
                  flow.type === 'model'
                    ? COLORS.aiTraining
                    : flow.type === 'inference'
                      ? COLORS.aiInference
                      : flow.type === 'control'
                        ? COLORS.secondary
                        : COLORS.success
                }
                isActive={isDocumentVisible}
              />
            )}
          </group>
        ))}
      </group>
    </group>
  );
};

export default NetworkGlobe;
