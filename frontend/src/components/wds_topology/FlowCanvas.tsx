import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, { Background, BackgroundVariant, useReactFlow, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import useLabelHighlightStore from '../../stores/labelHighlightStore';
import useZoomStore from '../../stores/zoomStore';
import useEdgeTypeStore from '../../stores/edgeTypeStore';
import { CustomEdge, CustomNode } from '../TreeViewComponent';
import { useTreeViewEdges } from '../../components/treeView/TreeViewEdges';

interface FlowCanvasProps {
  nodes: CustomNode[];
  edges: CustomEdge[];
  renderStartTime: React.MutableRefObject<number>;
  theme: string;
}

// FlowCanvas: renders a flow diagram for cloud resource visualization using ReactFlow.
export const FlowCanvas = memo<FlowCanvasProps>(({ nodes, edges, theme }) => {
  const { setViewport, getViewport } = useReactFlow();
  const highlightedLabels = useLabelHighlightStore(state => state.highlightedLabels);
  const { currentZoom, getScaledNodeStyle, setZoom } = useZoomStore();
  const viewportRef = useRef({ x: 0, y: 0, zoom: currentZoom });
  const initializedRef = useRef(false);
  const lastTouchDistance = useRef<number | null>(null);
  const reactFlowContainerRef = useRef<HTMLDivElement>(null);
  const { edgeType } = useEdgeTypeStore();

  // Get edge gradients
  const { edgeGradients } = useTreeViewEdges({ theme: theme as 'light' | 'dark' });

  // Calculate spacing for nodes based on zoom and density
  const calculateGlobalSpacing = useCallback(
    (allNodes: CustomNode[], allEdges: CustomEdge[], zoomLevel: number) => {
      const BASE_MIN_DISTANCE = Math.max(100, 200 / Math.max(zoomLevel, 0.2));
      const EDGE_FACTOR = 2.0;
      // Map node connections
      const connectionMap = new Map<string, Set<string>>();
      allEdges.forEach(edge => {
        if (!connectionMap.has(edge.source)) connectionMap.set(edge.source, new Set());
        if (!connectionMap.has(edge.target)) connectionMap.set(edge.target, new Set());
        connectionMap.get(edge.source)!.add(edge.target);
        connectionMap.get(edge.target)!.add(edge.source);
      });

      return { BASE_MIN_DISTANCE, EDGE_FACTOR, connectionMap };
    },
    []
  );

  // Position nodes to prevent overlaps
  const repositionAllNodes = useCallback(
    (processedNodes: CustomNode[], zoomLevel: number) => {
      const { BASE_MIN_DISTANCE, EDGE_FACTOR, connectionMap } = calculateGlobalSpacing(
        processedNodes,
        edges,
        zoomLevel
      );
      const adjustedNodes = [...processedNodes];
      const MAX_ITERATIONS = 75;
      const DAMPING = 0.9;

      // Force-based positioning
      for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
        const forces = new Map<string, { x: number; y: number }>();
        let hasMovement = false;

        // Initialize force vectors
        adjustedNodes.forEach(node => {
          forces.set(node.id, { x: 0, y: 0 });
        });

        // Calculate repulsive forces
        for (let i = 0; i < adjustedNodes.length; i++) {
          for (let j = i + 1; j < adjustedNodes.length; j++) {
            const nodeA = adjustedNodes[i];
            const nodeB = adjustedNodes[j];

            const dx = nodeA.position.x - nodeB.position.x;
            const dy = nodeA.position.y - nodeB.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Determine required minimum distance
            const areConnected =
              connectionMap.get(nodeA.id)?.has(nodeB.id) ||
              connectionMap.get(nodeB.id)?.has(nodeA.id);
            const minDistance = areConnected ? BASE_MIN_DISTANCE * EDGE_FACTOR : BASE_MIN_DISTANCE;

            if (distance < minDistance && distance > 0) {
              hasMovement = true;
              const force = ((minDistance - distance) / distance) * 1.2; // Increased force multiplier
              const forceX = (dx / distance) * force * 0.6; // Increased force application
              const forceY = (dy / distance) * force * 0.6;

              // Apply repulsive force
              const forceA = forces.get(nodeA.id)!;
              const forceB = forces.get(nodeB.id)!;
              forceA.x += forceX;
              forceA.y += forceY;
              forceB.x -= forceX;
              forceB.y -= forceY;
            }
          }
        }

        // Apply forces with damping
        adjustedNodes.forEach((node, index) => {
          const force = forces.get(node.id)!;
          if (Math.abs(force.x) > 0.05 || Math.abs(force.y) > 0.05) {
            // Lower threshold for more movement
            adjustedNodes[index] = {
              ...node,
              position: {
                x: node.position.x + force.x * DAMPING,
                y: node.position.y + force.y * DAMPING,
              },
            };
          }
        });

        // Stop early if no significant movement
        if (!hasMovement) break;
      }

      return adjustedNodes;
    },
    [calculateGlobalSpacing, edges]
  );

  // Scale nodes and apply spacing
  const scaledNodes = useMemo(() => {
    const { zoom } = getViewport();
    const actualZoom = zoom || currentZoom;

    // Apply scaling to nodes
    const scaledNodesWithStyle = nodes.map(node => ({
      ...node,
      style: {
        ...node.style,
        ...getScaledNodeStyle(actualZoom),
      },
    }));

    // Apply positioning to prevent overlaps
    return repositionAllNodes(scaledNodesWithStyle, actualZoom);
  }, [nodes, currentZoom, getViewport, getScaledNodeStyle, repositionAllNodes]);

  // Process edges with zoom-responsive spacing and routing
  const processedEdges = useMemo(() => {
    const { zoom } = getViewport();
    const actualZoom = zoom || currentZoom;

    // Edge spacing increases when zoom decreases
    const edgeSpacing = Math.max(30, 80 / Math.max(actualZoom, 0.2));

    // Ensure minimum edge thickness at all zoom levels
    const strokeWidth = Math.max(1.5, Math.min(4, 2 / Math.max(actualZoom, 0.5)));

    // Group edges by source-target pairs
    const edgeGroups = new Map<string, CustomEdge[]>();

    edges.forEach(edge => {
      const key = `${edge.source}-${edge.target}`;
      if (!edgeGroups.has(key)) {
        edgeGroups.set(key, []);
      }
      edgeGroups.get(key)!.push(edge);
    });

    const processedEdges: CustomEdge[] = [];

    edgeGroups.forEach(groupEdges => {
      if (groupEdges.length === 1) {
        // Single edge with visibility at all zoom levels
        processedEdges.push({
          ...groupEdges[0],
          style: {
            ...groupEdges[0].style,
            strokeWidth: strokeWidth,
            opacity: Math.max(0.7, Math.min(1, 0.6 + actualZoom * 0.4)), // Never too faint
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: Math.max(4, Math.min(12, 8 * actualZoom)), // Bounded arrow size
            height: Math.max(4, Math.min(12, 8 * actualZoom)),
            color: groupEdges[0].style?.stroke || '#666',
          },
        });
      } else {
        // Multiple edges between same nodes
        groupEdges.forEach((edge, index) => {
          const offset = (index - (groupEdges.length - 1) / 2) * edgeSpacing;

          processedEdges.push({
            ...edge,
            id: `${edge.id}-${index}`,
            style: {
              ...edge.style,
              strokeWidth: strokeWidth * 0.8, // Slightly thinner but still visible
              opacity: Math.max(0.6, Math.min(1, 0.5 + actualZoom * 0.5)), // Never too faint
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: Math.max(3, Math.min(10, 6 * actualZoom)), // Bounded smaller arrows
              height: Math.max(3, Math.min(10, 6 * actualZoom)),
              color: edge.style?.stroke || '#666',
            },
            // Add path offset for ReactFlow
            data: {
              ...edge.data,
              pathOffset: offset,
              isMultiple: true,
            },
          });
        });
      }
    });

    return processedEdges;
  }, [edges, getViewport, currentZoom]);

  // Calculate boundaries of all nodes for positioning and scaling
  const positions = useMemo(() => {
    if (scaledNodes.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    const minX = Math.min(...scaledNodes.map(node => node.position.x));
    const maxX = Math.max(
      ...scaledNodes.map(node => {
        const width =
          typeof node.style?.width === 'string'
            ? parseInt(node.style.width)
            : node.style?.width || 146;
        return node.position.x + width;
      })
    );
    const minY = Math.min(...scaledNodes.map(node => node.position.y));
    const maxY = Math.max(
      ...scaledNodes.map(node => {
        const height =
          typeof node.style?.height === 'string'
            ? parseInt(node.style.height)
            : node.style?.height || 30;
        return node.position.y + height;
      })
    );
    return { minX, maxX, minY, maxY };
  }, [scaledNodes]);

  // Update the viewport and handle zoom changes
  useEffect(() => {
    const { zoom } = getViewport();
    const actualZoom = zoom || currentZoom;

    // Update CSS custom property for zoom-responsive styling
    if (reactFlowContainerRef.current) {
      reactFlowContainerRef.current.style.setProperty('--zoom-level', actualZoom.toString());
    }
  }, [getViewport, currentZoom]);

  // Initialize the viewport based on node positions or restore previous viewport
  useEffect(() => {
    if (scaledNodes.length > 0 && !initializedRef.current) {
      const { minX, minY, maxY } = positions;
      const treeHeight = maxY - minY;
      const reactFlowContainer = reactFlowContainerRef.current;
      const viewportHeight = reactFlowContainer
        ? reactFlowContainer.offsetHeight
        : window.innerHeight;
      const padding = 20;
      const topMargin = 100;
      const initialZoom = currentZoom;
      const centerX = -minX * initialZoom + 50;
      const centerY = -minY * initialZoom + topMargin;
      if (reactFlowContainer) {
        reactFlowContainer.style.minHeight = `${Math.max(treeHeight * initialZoom + padding * 2 + topMargin, viewportHeight)}px`;
      }
      setViewport({ x: centerX, y: centerY, zoom: initialZoom });
      viewportRef.current = { x: centerX, y: centerY, zoom: initialZoom };
      initializedRef.current = true;
    }
  }, [scaledNodes, positions, setViewport, currentZoom]);

  // Save the current viewport position and zoom level
  const onMoveEnd = useCallback(() => {
    const currentViewport = getViewport();
    viewportRef.current = currentViewport;
  }, [getViewport]);

  // Pinch-to-zoom for touch devices
  useEffect(() => {
    const reactFlowContainer = reactFlowContainerRef.current;
    if (!reactFlowContainer) return;
    function getDistance(touches: TouchList) {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }
    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        lastTouchDistance.current = getDistance(e.touches);
      }
    }
    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length === 2 && lastTouchDistance.current !== null) {
        const { zoom, x, y } = getViewport();
        const newDistance = getDistance(e.touches);
        const delta = newDistance - lastTouchDistance.current;
        let newZoom = zoom + delta * 0.0025;
        newZoom = Math.max(0.1, Math.min(2, newZoom));
        setViewport({ x, y, zoom: newZoom });
        setZoom(newZoom); // Update zoom store
        lastTouchDistance.current = newDistance;
      }
    }
    function handleTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) {
        lastTouchDistance.current = null;
      }
    }
    reactFlowContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    reactFlowContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    reactFlowContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
    return () => {
      reactFlowContainer.removeEventListener('touchstart', handleTouchStart);
      reactFlowContainer.removeEventListener('touchmove', handleTouchMove);
      reactFlowContainer.removeEventListener('touchend', handleTouchEnd);
    };
  }, [getViewport, setViewport, setZoom]);

  // Mouse wheel zoom (Shift for horizontal pan)
  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      const reactFlowContainer = reactFlowContainerRef.current;
      const isInsideTree = reactFlowContainer && reactFlowContainer.contains(event.target as Node);
      if (isInsideTree) {
        const { zoom, x, y } = getViewport();
        const scrollSpeed = 0.5;
        const zoomSpeed = 0.05;
        if (event.shiftKey) {
          const newX = x - event.deltaY * scrollSpeed;
          setViewport({ x: newX, y, zoom });
          viewportRef.current = { x: newX, y, zoom };
        } else {
          let newZoom = zoom + (event.deltaY > 0 ? -zoomSpeed : zoomSpeed);
          newZoom = Math.max(0.1, Math.min(2, newZoom));
          setViewport({ x, y, zoom: newZoom });
          setZoom(newZoom); // Update zoom store
          viewportRef.current = { x, y, zoom: newZoom };
        }
      }
    },
    [getViewport, setViewport, setZoom]
  );

  // Add wheel event handler with passive: false
  useEffect(() => {
    const reactFlowContainer = reactFlowContainerRef.current;
    if (!reactFlowContainer) return;

    const wheelHandler = (e: WheelEvent) => {
      const isInsideTree = reactFlowContainer.contains(e.target as Node);
      if (isInsideTree) {
        e.preventDefault();
      }
    };

    reactFlowContainer.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
      reactFlowContainer.removeEventListener('wheel', wheelHandler);
    };
  }, []);

  // Update visualization when label highlighting state changes
  useEffect(() => {}, [highlightedLabels]);

  // Set background styles based on theme
  const backgroundStyle =
    theme === 'dark'
      ? {
          background: `
          radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(16, 185, 129, 0.1) 0%, transparent 50%),
          linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)
        `,
        }
      : {
          background: `
          radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(16, 185, 129, 0.05) 0%, transparent 50%),
          linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)
        `,
        };

  return (
    <div className="relative h-full w-full" ref={reactFlowContainerRef}>
      {/* Animated background overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          ...backgroundStyle,
          zIndex: -1,
        }}
      />

      {/* Subtle animated particles for extra adorableness */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            theme === 'dark'
              ? `
              radial-gradient(circle at 10% 20%, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
              radial-gradient(circle at 90% 80%, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
              radial-gradient(circle at 50% 10%, rgba(255, 255, 255, 0.01) 1px, transparent 1px)
            `
              : `
              radial-gradient(circle at 10% 20%, rgba(0, 0, 0, 0.02) 1px, transparent 1px),
              radial-gradient(circle at 90% 80%, rgba(0, 0, 0, 0.02) 1px, transparent 1px),
              radial-gradient(circle at 50% 10%, rgba(0, 0, 0, 0.01) 1px, transparent 1px)
            `,
          animation: 'float 20s ease-in-out infinite',
          zIndex: -1,
        }}
      />

      <ReactFlow
        nodes={scaledNodes}
        edges={processedEdges}
        fitView={false}
        panOnDrag={true}
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        zoomOnPinch={false}
        panOnScroll={false}
        onMoveEnd={onMoveEnd}
        style={{
          background: 'transparent',
          width: '100%',
          height: '100%',
          borderRadius: '12px',
          border:
            theme === 'dark'
              ? '1px solid rgba(148, 163, 184, 0.1)'
              : '1px solid rgba(148, 163, 184, 0.2)',
          boxShadow:
            theme === 'dark'
              ? 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
              : 'inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          pointerEvents: 'auto', // Ensure events are captured
        }}
        onWheel={handleWheel}
        defaultEdgeOptions={{ type: edgeType }}
      >
        {/* Enhanced edge gradients for beautiful connections */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0 }}>
          {edgeGradients}
        </svg>

        <Background
          variant={BackgroundVariant.Dots}
          gap={12}
          size={1}
          color={theme === 'dark' ? '#334155' : '#cbd5e1'}
          style={{ opacity: 0.4 }}
        />

        {/* Additional decorative background pattern */}
        <Background
          variant={BackgroundVariant.Lines}
          gap={64}
          size={0.5}
          color={theme === 'dark' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.03)'}
          style={{
            opacity: 0.3,
          }}
        />
      </ReactFlow>

      {/* Enhanced animations with improved edge visibility */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          33% { transform: translate3d(0, -10px, 0) rotate(1deg); }
          66% { transform: translate3d(0, -5px, 0) rotate(-1deg); }
        }
        
        @keyframes edge-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }

        /* Hide connection handles but keep edges */
        .react-flow__handle {
          opacity: 0 !important;
          pointer-events: none !important;
          background: transparent !important;
          border: none !important;
          width: 0 !important;
          height: 0 !important;
        }

        /* Keep edges visible and interactive */
        .react-flow__edge {
          pointer-events: all !important;
        }

        /* FIXED: Enhanced zoom-responsive edge styling with guaranteed minimum visibility */
        .react-flow__edge-path {
          stroke-width: var(--edge-width, 2);
          stroke-dasharray: none;
          transition: stroke-width 0.2s ease, opacity 0.2s ease;
          /* Ensure minimum visibility at all zoom levels */
          min-stroke-width: 1.5px !important;
        }

        /* Properly sized arrow markers for edges */
        .react-flow__arrowhead {
          width: 8px !important;
          height: 8px !important;
          min-width: 4px !important;
          min-height: 4px !important;
        }

        /* Smaller but still visible arrows for multiple edges */
        .react-flow__edge[data-multiple="true"] .react-flow__arrowhead {
          width: 6px !important;
          height: 6px !important;
          min-width: 3px !important;
          min-height: 3px !important;
        }

        /* FIXED: Zoom-responsive sizing with guaranteed minimum visibility */
        .react-flow__edge {
          --edge-width: max(1.5px, min(4px, calc(2px / max(var(--zoom-level, 1), 0.5))));
          --arrow-size: max(4px, min(12px, calc(8px * var(--zoom-level, 1))));
        }

        .react-flow__arrowhead {
          width: var(--arrow-size) !important;
          height: var(--arrow-size) !important;
        }

        /* Enhanced hover effects with better visibility */
        .react-flow__edge:hover .react-flow__edge-path {
          stroke-width: calc(var(--edge-width, 2) * 1.3);
          opacity: 1 !important;
        }

        /* Smooth curves and animations for multiple edges */
        .react-flow__edge-path[data-multiple="true"] {
          stroke-dasharray: 5,5;
          animation: edge-flow 2s linear infinite;
        }

        @keyframes edge-flow {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 10; }
        }

        /* Better node spacing visualization at different zoom levels */
        .react-flow__node {
          transition: transform 0.3s ease;
        }

        /* FIXED: Enhanced visual feedback maintaining minimum visibility */
        .react-flow__edge-path[stroke-width] {
          min-stroke-width: 1.5px !important;
          opacity: 0.8 !important;
        }

        /* FIXED: Ensure edges are never invisible at any zoom level */
        .react-flow__edge-path {
          stroke-width: max(1.5px, var(--edge-width, 2px)) !important;
          opacity: max(0.6, var(--edge-opacity, 0.8)) !important;
        }

        /* Ensure menu buttons are always clickable */
        .react-flow__node button {
          pointer-events: auto !important;
          z-index: 10 !important;
        }

        /* Ensure node content is interactive */
        .react-flow__node > div {
          pointer-events: auto !important;
        }
      `}</style>
    </div>
  );
});
