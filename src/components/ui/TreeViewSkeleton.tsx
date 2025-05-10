import React from 'react';
import useTheme from '../../stores/themeStore';
import Skeleton from './Skeleton';

const TreeViewSkeleton: React.FC = () => {
  const theme = useTheme((state) => state.theme);
  const isDark = theme === 'dark';

  // Generate different sizes of node skeletons to create a more realistic tree structure
  const createNodeSkeleton = (key: string, width: number) => (
    <div 
      key={key}
      className="absolute rounded-md overflow-hidden"
      style={{
        width: width,
        height: 30,
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.07)',
        borderLeft: '4px solid #4498FF',
      }}
    />
  );

  // Create node skeletons for the left column (typically contexts)
  const contextNodes = [
    { key: 'c1', top: 50, left: 50, width: 146 },
    { key: 'c2', top: 150, left: 50, width: 146 },
    { key: 'c3', top: 250, left: 50, width: 146 },
    { key: 'c4', top: 350, left: 50, width: 146 },
  ];

  // Create node skeletons for the second column (typically namespaces)
  const namespaceNodes = [
    { key: 'n1', top: 40, left: 250, width: 146 },
    { key: 'n2', top: 90, left: 250, width: 146 },
    { key: 'n3', top: 140, left: 250, width: 146 },
    { key: 'n4', top: 240, left: 250, width: 146 },
    { key: 'n5', top: 290, left: 250, width: 146 },
    { key: 'n6', top: 340, left: 250, width: 146 },
    { key: 'n7', top: 390, left: 250, width: 146 },
  ];

  // Create node skeletons for the third column (typically deployments, services, etc.)
  const resourceNodes = [
    { key: 'r1', top: 30, left: 450, width: 146 },
    { key: 'r2', top: 80, left: 450, width: 146 },
    { key: 'r3', top: 130, left: 450, width: 146 },
    { key: 'r4', top: 180, left: 450, width: 146 },
    { key: 'r5', top: 230, left: 450, width: 146 },
    { key: 'r6', top: 280, left: 450, width: 146 },
    { key: 'r7', top: 330, left: 450, width: 146 },
    { key: 'r8', top: 380, left: 450, width: 146 },
  ];

  // Create node skeletons for the fourth column (typically pods, configmaps, etc.)
  const detailNodes = [
    { key: 'd1', top: 25, left: 650, width: 146 },
    { key: 'd2', top: 75, left: 650, width: 146 },
    { key: 'd3', top: 125, left: 650, width: 146 },
    { key: 'd4', top: 175, left: 650, width: 146 },
    { key: 'd5', top: 225, left: 650, width: 146 },
    { key: 'd6', top: 275, left: 650, width: 146 },
    { key: 'd7', top: 325, left: 650, width: 146 },
    { key: 'd8', top: 375, left: 650, width: 146 },
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

  // Create edges between contexts and namespaces
  const contextToNamespaceEdges = [
    { key: 'e1', x1: 196, y1: 65, x2: 250, y2: 55 },
    { key: 'e2', x1: 196, y1: 65, x2: 250, y2: 105 },
    { key: 'e3', x1: 196, y1: 165, x2: 250, y2: 155 },
    { key: 'e4', x1: 196, y1: 265, x2: 250, y2: 255 },
    { key: 'e5', x1: 196, y1: 265, x2: 250, y2: 305 },
    { key: 'e6', x1: 196, y1: 365, x2: 250, y2: 355 },
    { key: 'e7', x1: 196, y1: 365, x2: 250, y2: 405 },
  ];

  // Create edges between namespaces and resources
  const namespaceToResourceEdges = [
    { key: 'e8', x1: 396, y1: 55, x2: 450, y2: 45 },
    { key: 'e9', x1: 396, y1: 55, x2: 450, y2: 95 },
    { key: 'e10', x1: 396, y1: 105, x2: 450, y2: 145 },
    { key: 'e11', x1: 396, y1: 155, x2: 450, y2: 195 },
    { key: 'e12', x1: 396, y1: 255, x2: 450, y2: 245 },
    { key: 'e13', x1: 396, y1: 305, x2: 450, y2: 295 },
    { key: 'e14', x1: 396, y1: 355, x2: 450, y2: 345 },
    { key: 'e15', x1: 396, y1: 405, x2: 450, y2: 395 },
  ];

  // Create edges between resources and details
  const resourceToDetailEdges = [
    { key: 'e16', x1: 596, y1: 45, x2: 650, y2: 40 },
    { key: 'e17', x1: 596, y1: 95, x2: 650, y2: 90 },
    { key: 'e18', x1: 596, y1: 145, x2: 650, y2: 140 },
    { key: 'e19', x1: 596, y1: 195, x2: 650, y2: 190 },
    { key: 'e20', x1: 596, y1: 245, x2: 650, y2: 240 },
    { key: 'e21', x1: 596, y1: 295, x2: 650, y2: 290 },
    { key: 'e22', x1: 596, y1: 345, x2: 650, y2: 340 },
    { key: 'e23', x1: 596, y1: 395, x2: 650, y2: 390 },
  ];

  return (
    <div className="w-full h-full relative overflow-hidden" style={{
      backgroundColor: isDark ? 'rgb(15, 23, 42)' : '#ffffff',
    }}>
      {/* Header bar skeleton */}
      <div className="w-full flex items-center justify-between p-4 mb-4 rounded" style={{
        backgroundColor: isDark ? 'rgb(15, 23, 42)' : '#ffffff',
        boxShadow: '0 6px 6px rgba(0,0,0,0.1)',
      }}>
        <Skeleton width={220} height={30} className="rounded" />
        <div className="flex items-center gap-2">
          <Skeleton width={180} height={36} className="rounded" />
          <Skeleton width={40} height={40} className="rounded-full" />
          <Skeleton width={40} height={40} className="rounded-full" />
          <Skeleton width={150} height={36} className="rounded" />
        </div>
      </div>

      {/* Info banners */}
      <div className="w-full p-2 mb-3 rounded" style={{
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
      }}>
        <Skeleton width="60%" height={20} className="rounded" />
      </div>

      {/* React Flow canvas area */}
      <div className="w-full relative" style={{ height: 'calc(100% - 150px)' }}>
        {/* Controls */}
        <div className="absolute right-4 top-4 z-10 flex flex-col gap-2 p-2 rounded-md" style={{
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(248, 250, 252, 0.8)',
        }}>
          <Skeleton width={36} height={36} className="rounded-full" />
          <Skeleton width={36} height={36} className="rounded-full" />
          <Skeleton width={36} height={36} className="rounded-full" />
          <Skeleton width={36} height={36} className="rounded-full" />
        </div>

        {/* Render edges first so they appear behind nodes */}
        {contextToNamespaceEdges.map(edge => createEdgeSkeleton(edge.key, edge.x1, edge.y1, edge.x2, edge.y2))}
        {namespaceToResourceEdges.map(edge => createEdgeSkeleton(edge.key, edge.x1, edge.y1, edge.x2, edge.y2))}
        {resourceToDetailEdges.map(edge => createEdgeSkeleton(edge.key, edge.x1, edge.y1, edge.x2, edge.y2))}
        
        {/* Render node columns */}
        {contextNodes.map(node => (
          <div 
            key={node.key}
            className="absolute animate-pulse"
            style={{ top: node.top, left: node.left }}
          >
            {createNodeSkeleton(node.key, node.width)}
          </div>
        ))}
        
        {namespaceNodes.map(node => (
          <div 
            key={node.key}
            className="absolute animate-pulse"
            style={{ top: node.top, left: node.left }}
          >
            {createNodeSkeleton(node.key, node.width)}
          </div>
        ))}
        
        {resourceNodes.map(node => (
          <div 
            key={node.key}
            className="absolute animate-pulse"
            style={{ top: node.top, left: node.left }}
          >
            {createNodeSkeleton(node.key, node.width)}
          </div>
        ))}
        
        {detailNodes.map(node => (
          <div 
            key={node.key}
            className="absolute animate-pulse"
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
          <div className="absolute left-2 top-2 w-5 h-1 rounded-sm bg-blue-400 opacity-30"></div>
          <div className="absolute left-2 top-5 w-5 h-1 rounded-sm bg-blue-400 opacity-30"></div>
          <div className="absolute left-2 top-8 w-5 h-1 rounded-sm bg-blue-400 opacity-30"></div>
          
          <div className="absolute left-10 top-3 w-5 h-1 rounded-sm bg-blue-400 opacity-30"></div>
          <div className="absolute left-10 top-6 w-5 h-1 rounded-sm bg-blue-400 opacity-30"></div>
          
          <div className="absolute left-18 top-2 w-5 h-1 rounded-sm bg-blue-400 opacity-30"></div>
          <div className="absolute left-18 top-5 w-5 h-1 rounded-sm bg-blue-400 opacity-30"></div>
          <div className="absolute left-18 top-8 w-5 h-1 rounded-sm bg-blue-400 opacity-30"></div>
        </div>
      </div>
    </div>
  );
};

export default TreeViewSkeleton;