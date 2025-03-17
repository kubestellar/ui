import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Line, Text, Torus, Billboard } from '@react-three/drei';
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
  
  // Animation state for data flows
  const [activeFlows, setActiveFlows] = useState<number[]>([]);
  const [animationProgress, setAnimationProgress] = useState(0);
  
  // Create cluster configurations with updated names and descriptions
  const clusters = useMemo(() => [
    { 
      name: "Edge Cluster",
      position: [0, 3, 0] as [number, number, number], 
      nodeCount: 6,
      radius: 0.8,
      color: COLORS.primary,
      description: "Edge computing resources for low-latency processing"
    },
    { 
      name: "AI Inferencing Cluster",
      position: [3, 0, 0] as [number, number, number], 
      nodeCount: 8,
      radius: 1,
      color: COLORS.aiInference,
      description: "Real-time AI model inference and prediction services"
    },
    { 
      name: "AI Training Cluster",
      position: [0, -3, 0] as [number, number, number], 
      nodeCount: 5,
      radius: 0.7,
      color: COLORS.aiTraining,
      description: "High-performance compute for AI model training"
    },
    { 
      name: "Service Cluster",
      position: [-3, 0, 0] as [number, number, number], 
      nodeCount: 7,
      radius: 0.9,
      color: COLORS.accent2,
      description: "Core microservices and API endpoints"
    },
    { 
      name: "Compute Cluster",
      position: [2, 2, -2] as [number, number, number], 
      nodeCount: 4,
      radius: 0.6,
      color: COLORS.success,
      description: "General-purpose compute resources"
    },
  ], []);
  
  // Generate data flow paths
  const dataFlows = useMemo(() => {
    const flows: { path: [number, number, number][], id: number, type: string }[] = [];
    const centralPos: [number, number, number] = [0, 0, 0];
    
    // Connect central node to each cluster
    clusters.forEach((cluster, clusterIdx) => {
      flows.push({
        path: [centralPos, cluster.position],
        id: clusterIdx,
        type: "control"
      });
    });
    
    // Add some cross-cluster connections with specific types
    // AI Training to AI Inferencing (model deployment)
    flows.push({
      path: [clusters[2].position, clusters[1].position],
      id: clusters.length + 1,
      type: "model"
    });
    
    // Edge to AI Inferencing (inference requests)
    flows.push({
      path: [clusters[0].position, clusters[1].position],
      id: clusters.length + 2,
      type: "inference"
    });
    
    // Add some other cross-cluster connections
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        if (Math.random() > 0.7) {
          flows.push({
            path: [clusters[i].position, clusters[j].position],
            id: clusters.length + i * 10 + j,
            type: "data"
          });
        }
      }
    }
    
    return flows;
  }, [clusters]);
  
  // Animate data flows - only start when loaded
  useEffect(() => {
    if (!isLoaded) return;
    
    const interval = setInterval(() => {
      const randomFlows = Array.from(
        { length: Math.floor(dataFlows.length / 2) }, 
        () => Math.floor(Math.random() * dataFlows.length)
      );
      setActiveFlows(randomFlows);
    }, 4000);
    
    return () => clearInterval(interval);
  }, [dataFlows.length, isLoaded]);
  
  // Animation frame updates with progressive reveal
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Update animation progress for reveal effect
    if (isLoaded && animationProgress < 1) {
      setAnimationProgress(Math.min(animationProgress + 0.01, 1));
    }
    
    // Rotate the globe slowly
    if (globeRef.current) {
      globeRef.current.rotation.y = time * 0.05;
      globeRef.current.rotation.x = Math.sin(time * 0.2) * 0.02;
      
      // Scale up the globe as it loads
      const scale = isLoaded ? 1 * animationProgress : 0.5;
      globeRef.current.scale.setScalar(scale);
    }
    
    // Animate central node
    if (centralNodeRef.current) {
      centralNodeRef.current.rotation.y = time * 0.2;
      centralNodeRef.current.scale.setScalar((1 + Math.sin(time * 1.5) * 0.05) * animationProgress);
      
      // Fade in the central node
      centralNodeRef.current.children.forEach((child: CentralNodeChild) => {
        if (child.material && typeof child.material.opacity !== 'undefined') {
          child.material.opacity = Math.min(child.material.opacity + 0.01, animationProgress);
        }
      });
    }
    
    // Animate data flows
    if (dataFlowsRef.current) {
      dataFlowsRef.current.children.forEach((flow: FlowChild, i) => {
        if (flow.material) {
          const flowData = dataFlows[i];
          const flowType = flowData?.type || "data";
          
          if (activeFlows.includes(i)) {
            flow.material.opacity = Math.min(flow.material.opacity + 0.05, 0.8 * animationProgress);
            
            // Set color based on flow type
            if (flowType === "model") {
              flow.material.color.set(COLORS.aiTraining);
            } else if (flowType === "inference") {
              flow.material.color.set(COLORS.aiInference);
            } else if (flowType === "control") {
              flow.material.color.set(COLORS.secondary);
            } else {
              flow.material.color.set(COLORS.success);
            }
            
            if (flow.material.dashSize !== undefined) {
              flow.material.dashSize = 0.1;
            }
            if (flow.material.gapSize !== undefined) {
              flow.material.gapSize = 0.05;
            }
          } else {
            flow.material.opacity = Math.max(flow.material.opacity - 0.02, 0.1 * animationProgress);
            flow.material.color.set(COLORS.primary);
            
            if (flow.material.dashSize !== undefined) {
              flow.material.dashSize = 0.05;
            }
            if (flow.material.gapSize !== undefined) {
              flow.material.gapSize = 0.1;
            }
          }
        }
      });
    }
  });

  return (
    <group>
      {/* Background cosmic dust */}
      <CosmicDust />
      
      {/* Main globe - represents the global network */}
      <Sphere ref={globeRef} args={[3.5, 64, 64]}>
        <meshPhongMaterial
          color={COLORS.primary}
          transparent
          opacity={0.08 * animationProgress}
          wireframe
        />
      </Sphere>
      
      {/* Grid lines for the globe */}
      <group rotation={[0, 0, 0]}>
        {Array.from({ length: 8 }).map((_, idx) => (
          <Torus key={idx} args={[3.5, 0.01, 16, 100]} rotation={[0, 0, Math.PI * idx / 8]}>
            <meshBasicMaterial 
              color={COLORS.primary} 
              transparent 
              opacity={0.1 * animationProgress} 
            />
          </Torus>
        ))}
        {Array.from({ length: 8 }).map((_, idx) => (
          <Torus key={idx} args={[3.5, 0.01, 16, 100]} rotation={[Math.PI / 2, Math.PI * idx / 8, 0]}>
            <meshBasicMaterial 
              color={COLORS.primary} 
              transparent 
              opacity={0.1 * animationProgress} 
            />
          </Torus>
        ))}
      </group>
      
      {/* Central KubeStellar control plane */}
      <group ref={centralNodeRef}>
        <LogoElement position={[0, 0, 0]} rotation={[0, 0, 0]} scale={1} />
        
        <Billboard position={[0, 1, 0]}>
          <Text
            fontSize={0.2}
            color={COLORS.highlight}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor={COLORS.background}
            fillOpacity={animationProgress}
          >
            KubeStellar
          </Text>
          <Text
            position={[0, -0.25, 0]}
            fontSize={0.1}
            color={COLORS.primary}
            anchorX="center"
            anchorY="middle"
            fillOpacity={animationProgress}
          >
            Control Plane
          </Text>
        </Billboard>
      </group>
      
      {/* Clusters with staggered appearance */}
      {clusters.map((cluster, idx) => (
        <group 
          key={idx} 
          scale={animationProgress > idx * 0.15 ? animationProgress : 0}
          position={[
            cluster.position[0] * animationProgress,
            cluster.position[1] * animationProgress,
            cluster.position[2] * animationProgress
          ]}
        >
          <Cluster
            position={[0, 0, 0]}
            name={cluster.name}
            nodeCount={cluster.nodeCount}
            radius={cluster.radius}
            color={cluster.color}
            description={cluster.description}
          />
        </group>
      ))}
      
      {/* Data flow connections */}
      <group ref={dataFlowsRef}>
        {dataFlows.map((flow, idx) => (
          <Line
            key={idx}
            points={flow.path}
            color={activeFlows.includes(idx) ? 
              (flow.type === "model" ? COLORS.aiTraining : 
               flow.type === "inference" ? COLORS.aiInference : 
               flow.type === "control" ? COLORS.secondary : 
               COLORS.success) : 
              COLORS.primary}
            lineWidth={1.5}
            transparent
            opacity={(activeFlows.includes(idx) ? 0.8 : 0.1) * animationProgress}
            dashed
            dashSize={0.1}
            gapSize={0.1}
          />
        ))}
      </group>
      
      {/* Data packets traveling along active connections */}
      {isLoaded && animationProgress > 0.7 && dataFlows.map((flow, idx) => 
        activeFlows.includes(idx) && (
          <DataPacket 
            key={idx} 
            path={flow.path} 
            speed={1 + Math.random()} 
            color={flow.type === "model" ? COLORS.aiTraining : 
                  flow.type === "inference" ? COLORS.aiInference : 
                  flow.type === "control" ? COLORS.secondary : 
                  idx % 2 === 0 ? COLORS.highlight : COLORS.success}
          />
        )
      )}
    </group>
  );
};

export default NetworkGlobe;