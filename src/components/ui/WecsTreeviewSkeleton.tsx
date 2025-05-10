import React from 'react';
import useTheme from '../../stores/themeStore';
import Skeleton from './Skeleton';
import { Box, Typography } from '@mui/material';

const WecsTreeviewSkeleton: React.FC = () => {
  const theme = useTheme((state) => state.theme);
  const isDark = theme === 'dark';

  // Generate different sizes of node skeletons to create a realistic tree structure
  const createNodeSkeleton = (key: string, width: number) => (
    <div 
      key={key}
      className="absolute rounded-md overflow-hidden animate-pulse"
      style={{
        width: width,
        height: 30,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.07)',
        borderLeft: '4px solid #4498FF',
      }}
    />
  );

  // Create node skeletons for the cluster column
  const clusterNodes = [
    { key: 'c1', top: 50, left: 50, width: 146 },
    { key: 'c2', top: 150, left: 50, width: 146 },
  ];

  // Create node skeletons for the namespace column
  const namespaceNodes = [
    { key: 'n1', top: 30, left: 250, width: 146 },
    { key: 'n2', top: 90, left: 250, width: 146 },
    { key: 'n3', top: 150, left: 250, width: 146 },
    { key: 'n4', top: 210, left: 250, width: 146 },
  ];

  // Create node skeletons for the deployment/service column
  const deploymentNodes = [
    { key: 'd1', top: 20, left: 450, width: 146 },
    { key: 'd2', top: 60, left: 450, width: 146 },
    { key: 'd3', top: 100, left: 450, width: 146 },
    { key: 'd4', top: 140, left: 450, width: 146 },
    { key: 'd5', top: 200, left: 450, width: 146 },
    { key: 'd6', top: 240, left: 450, width: 146 },
  ];

  // Create node skeletons for the pod/replica column
  const podNodes = [
    { key: 'p1', top: 10, left: 650, width: 146 },
    { key: 'p2', top: 50, left: 650, width: 146 },
    { key: 'p3', top: 90, left: 650, width: 146 },
    { key: 'p4', top: 130, left: 650, width: 146 },
    { key: 'p5', top: 190, left: 650, width: 146 },
    { key: 'p6', top: 230, left: 650, width: 146 },
    { key: 'p7', top: 270, left: 650, width: 146 },
  ];

  // Create edge skeletons to connect the nodes
  const createEdgeSkeleton = (key: string, x1: number, y1: number, x2: number, y2: number) => {
    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    
    return (
      <div 
        key={key}
        className="absolute"
        style={{
          width: length,
          height: 1,
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
          transformOrigin: '0 0',
          transform: `translate(${x1}px, ${y1 + 15}px) rotate(${angle}deg)`,
        }}
      />
    );
  };

  // Connect clusters to namespaces
  const clusterToNamespaceEdges = [
    { key: 'e1', x1: 196, y1: 65, x2: 250, y2: 45 },
    { key: 'e2', x1: 196, y1: 65, x2: 250, y2: 105 },
    { key: 'e3', x1: 196, y1: 165, x2: 250, y2: 165 },
    { key: 'e4', x1: 196, y1: 165, x2: 250, y2: 225 },
  ];

  // Connect namespaces to deployments
  const namespaceToDeploymentEdges = [
    { key: 'e5', x1: 396, y1: 45, x2: 450, y2: 35 },
    { key: 'e6', x1: 396, y1: 45, x2: 450, y2: 75 },
    { key: 'e7', x1: 396, y1: 105, x2: 450, y2: 115 },
    { key: 'e8', x1: 396, y1: 165, x2: 450, y2: 155 },
    { key: 'e9', x1: 396, y1: 225, x2: 450, y2: 215 },
    { key: 'e10', x1: 396, y1: 225, x2: 450, y2: 255 },
  ];

  // Connect deployments to pods
  const deploymentToPodEdges = [
    { key: 'e11', x1: 596, y1: 35, x2: 650, y2: 25 },
    { key: 'e12', x1: 596, y1: 35, x2: 650, y2: 65 },
    { key: 'e13', x1: 596, y1: 75, x2: 650, y2: 105 },
    { key: 'e14', x1: 596, y1: 115, x2: 650, y2: 145 },
    { key: 'e15', x1: 596, y1: 215, x2: 650, y2: 205 },
    { key: 'e16', x1: 596, y1: 215, x2: 650, y2: 245 },
    { key: 'e17', x1: 596, y1: 255, x2: 650, y2: 285 },
  ];

  return (
    <Box sx={{ display: "flex", height: "85vh", width: "100%", position: "relative" }}>
      <Box
        sx={{
          flex: 1,
          position: "relative",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            mb: 4,
            display: "flex",
            alignItems: "center",
            gap: 2,
            flex: 1,
            justifyContent: "space-between",
            padding: 2,
            borderRadius: 1,
            boxShadow: "0 6px 6px rgba(0,0,0,0.1)",
            background: isDark ? "rgb(15, 23, 42)" : "#fff",
          }}
        >
          <div className="h-8 w-64 rounded animate-pulse" style={{ 
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' 
          }}></div>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <div className="h-10 w-10 rounded-full animate-pulse" style={{ 
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' 
            }}></div>
            <div className="h-10 w-10 rounded-full animate-pulse" style={{ 
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' 
            }}></div>
            <div className="h-10 w-32 rounded animate-pulse" style={{ 
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' 
            }}></div>
          </Box>
        </Box>

        {/* Info banner */}
        <Box 
          sx={{ 
            width: "100%", 
            padding: "8px 16px",
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
            borderRadius: "4px",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center"
          }}
        >
          <div className="h-4 w-3/4 rounded animate-pulse" style={{ 
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' 
          }}></div>
        </Box>

        {/* Main content */}
        <Box sx={{ width: "100%", height: "calc(100% - 80px)", position: "relative" }}>
          <div className="w-full h-full relative overflow-hidden" style={{
            backgroundColor: isDark ? 'rgb(15, 23, 42)' : '#ffffff',
          }}>
            {/* Controls */}
            <div className="absolute right-4 top-4 z-10 flex flex-col gap-2 p-2 rounded-md" style={{
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(248, 250, 252, 0.8)',
            }}>
              <div className="h-9 w-9 rounded-full animate-pulse" style={{ 
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' 
              }}></div>
              <div className="h-9 w-9 rounded-full animate-pulse" style={{ 
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' 
              }}></div>
              <div className="h-9 w-9 rounded-full animate-pulse" style={{ 
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' 
              }}></div>
            </div>

            {/* Render edges first so they appear behind nodes */}
            {clusterToNamespaceEdges.map(edge => createEdgeSkeleton(edge.key, edge.x1, edge.y1, edge.x2, edge.y2))}
            {namespaceToDeploymentEdges.map(edge => createEdgeSkeleton(edge.key, edge.x1, edge.y1, edge.x2, edge.y2))}
            {deploymentToPodEdges.map(edge => createEdgeSkeleton(edge.key, edge.x1, edge.y1, edge.x2, edge.y2))}
            
            {/* Render nodes */}
            {clusterNodes.map(node => (
              <div 
                key={node.key}
                className="absolute"
                style={{ top: node.top, left: node.left }}
              >
                {createNodeSkeleton(node.key, node.width)}
              </div>
            ))}
            
            {namespaceNodes.map(node => (
              <div 
                key={node.key}
                className="absolute"
                style={{ top: node.top, left: node.left }}
              >
                {createNodeSkeleton(node.key, node.width)}
              </div>
            ))}
            
            {deploymentNodes.map(node => (
              <div 
                key={node.key}
                className="absolute"
                style={{ top: node.top, left: node.left }}
              >
                {createNodeSkeleton(node.key, node.width)}
              </div>
            ))}
            
            {podNodes.map(node => (
              <div 
                key={node.key}
                className="absolute"
                style={{ top: node.top, left: node.left }}
              >
                {createNodeSkeleton(node.key, node.width)}
              </div>
            ))}

            {/* Mini-map skeleton */}
            <div className="absolute right-4 bottom-4 z-10 p-1 rounded-md" style={{
              width: 120,
              height: 80,
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(248, 250, 252, 0.5)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
            }}>
              {/* Minimap nodes */}
              <div className="absolute left-2 top-2 w-4 h-1 rounded-sm bg-blue-400 opacity-30"></div>
              <div className="absolute left-2 top-5 w-4 h-1 rounded-sm bg-blue-400 opacity-30"></div>
              <div className="absolute left-2 top-8 w-4 h-1 rounded-sm bg-blue-400 opacity-30"></div>
              
              <div className="absolute left-10 top-3 w-4 h-1 rounded-sm bg-blue-400 opacity-30"></div>
              <div className="absolute left-10 top-6 w-4 h-1 rounded-sm bg-blue-400 opacity-30"></div>
              
              <div className="absolute left-18 top-2 w-4 h-1 rounded-sm bg-blue-400 opacity-30"></div>
              <div className="absolute left-18 top-5 w-4 h-1 rounded-sm bg-blue-400 opacity-30"></div>
              <div className="absolute left-18 top-8 w-4 h-1 rounded-sm bg-blue-400 opacity-30"></div>
            </div>
          </div>
        </Box>
      </Box>
    </Box>
  );
};

export default WecsTreeviewSkeleton;