import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, { Background, BackgroundVariant, useReactFlow } from 'reactflow';
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

/**
 * Renders a beautiful flow diagram canvas with custom nodes and edges in a ReactFlow container.
 * Features dynamic centering, stunning gradients, patterns, and animations for an optimal user experience.
 * Provides smooth zooming, panning, and intelligent auto-centering functionality for the Kubernetes resource visualization.
 */
export const FlowCanvas = memo<FlowCanvasProps>(({ nodes, edges, theme }) => {
  const { setViewport, getViewport } = useReactFlow();
  const highlightedLabels = useLabelHighlightStore(state => state.highlightedLabels);
  const { currentZoom } = useZoomStore();
  const viewportRef = useRef({ x: 0, y: 0, zoom: currentZoom });
  const initializedRef = useRef(false);
  const lastTouchDistance = useRef<number | null>(null);
  const reactFlowContainerRef = useRef<HTMLDivElement>(null);
  const { edgeType } = useEdgeTypeStore();

  // Get enhanced edge gradients
  const { edgeGradients } = useTreeViewEdges({ theme: theme as 'light' | 'dark' });

  /**
   * Calculates comprehensive node boundaries and dimensions for optimal viewport positioning.
   * Returns detailed positioning data including center points and content dimensions.
   */
  const nodeMetrics = useMemo(() => {
    if (nodes.length === 0) {
      return {
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0,
        centerX: 0,
        centerY: 0,
        contentWidth: 0,
        contentHeight: 0,
        totalNodes: 0,
      };
    }

    // Calculate node boundaries with proper width/height handling
    const positions = nodes.map(node => {
      const width =
        typeof node.style?.width === 'string'
          ? parseInt(node.style.width)
          : node.style?.width || 146;
      const height =
        typeof node.style?.height === 'string'
          ? parseInt(node.style.height)
          : node.style?.height || 30;

      return {
        left: node.position.x,
        right: node.position.x + width,
        top: node.position.y,
        bottom: node.position.y + height,
        centerX: node.position.x + width / 2,
        centerY: node.position.y + height / 2,
      };
    });

    const minX = Math.min(...positions.map(p => p.left));
    const maxX = Math.max(...positions.map(p => p.right));
    const minY = Math.min(...positions.map(p => p.top));
    const maxY = Math.max(...positions.map(p => p.bottom));

    // Calculate true center based on content bounds
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    return {
      minX,
      maxX,
      minY,
      maxY,
      centerX,
      centerY,
      contentWidth,
      contentHeight,
      totalNodes: nodes.length,
    };
  }, [nodes]);

  /**
   * Calculates optimal viewport settings based on container size and content dimensions.
   * Provides intelligent centering and scaling for the best viewing experience.
   */
  const calculateOptimalViewport = useCallback(() => {
    const container = reactFlowContainerRef.current;
    if (!container || nodes.length === 0) return null;

    const containerRect = container.getBoundingClientRect();
    if (!containerRect.width || !containerRect.height) return null;
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    // Dynamic padding based on container size and content
    const basePadding = Math.min(containerWidth, containerHeight) * 0.05;
    const minPadding = 40;
    const maxPadding = 120;
    const padding = Math.max(minPadding, Math.min(maxPadding, basePadding));

    // Calculate optimal zoom to fit content with padding
    const availableWidth = containerWidth - padding * 2;
    const availableHeight = containerHeight - padding * 2;

    const optimalZoomX =
      nodeMetrics.contentWidth > 0 ? availableWidth / nodeMetrics.contentWidth : 1;
    const optimalZoomY =
      nodeMetrics.contentHeight > 0 ? availableHeight / nodeMetrics.contentHeight : 1;

    // Use the more restrictive zoom factor, but respect user's preferred zoom if reasonable
    let optimalZoom = Math.min(optimalZoomX, optimalZoomY, currentZoom || 1);
    optimalZoom = Math.max(0.1, Math.min(2, optimalZoom));

    // Calculate center position to perfectly center the content
    const scaledContentHeight = nodeMetrics.contentHeight * optimalZoom;

    // Position to center the content in the viewport
    const viewportCenterX = containerWidth / 2;
    const viewportCenterY = containerHeight / 2;

    const x = viewportCenterX - nodeMetrics.centerX * optimalZoom;
    const y = viewportCenterY - nodeMetrics.centerY * optimalZoom;

    // Adjust container height to accommodate content if needed
    const minRequiredHeight = scaledContentHeight + padding * 2;
    if (containerHeight < minRequiredHeight) {
      container.style.minHeight = `${minRequiredHeight}px`;
    }

    return { x, y, zoom: optimalZoom };
  }, [nodes.length, nodeMetrics, currentZoom]);

  /**
   * Initializes the viewport with intelligent positioning based on content and container dimensions.
   * Only runs once per node set to avoid disrupting user interactions.
   */
  useEffect(() => {
    if (nodes.length > 0 && !initializedRef.current) {
      const optimalViewport = calculateOptimalViewport();

      if (optimalViewport) {
        setViewport(optimalViewport);
        viewportRef.current = optimalViewport;
        initializedRef.current = true;
      }
    }
  }, [nodes, calculateOptimalViewport, setViewport]);

  /**
   * Resets initialization when nodes change significantly to allow re-centering.
   */
  useEffect(() => {
    // Reset initialization when nodes change significantly
    initializedRef.current = false;
  }, [nodeMetrics.totalNodes, nodeMetrics.contentWidth, nodeMetrics.contentHeight]);

  /**
   * Saves the current viewport position and zoom level when user stops panning or zooming.
   * This persists the view state between component re-renders.
   */
  const onMoveEnd = useCallback(() => {
    const currentViewport = getViewport();
    viewportRef.current = currentViewport;
  }, [getViewport]);

  // Enhanced pinch-to-zoom for touch devices with better sensitivity
  useEffect(() => {
    const reactFlowContainer = reactFlowContainerRef.current;
    if (!reactFlowContainer) return;

    function getDistance(touches: TouchList) {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function getTouchCenter(touches: TouchList) {
      if (touches.length < 2) return { x: 0, y: 0 };
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };
    }

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        lastTouchDistance.current = getDistance(e.touches);
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length === 2 && lastTouchDistance.current !== null) {
        e.preventDefault();

        const { zoom, x, y } = getViewport();
        const newDistance = getDistance(e.touches);
        const touchCenter = getTouchCenter(e.touches);

        // Calculate zoom change
        const delta = newDistance - lastTouchDistance.current;
        let newZoom = zoom + delta * 0.003; // More sensitive zoom
        newZoom = Math.max(0.1, Math.min(2, newZoom));

        // Calculate new position to zoom toward touch center
        const zoomFactor = newZoom / zoom;
        if (!reactFlowContainer) return;

        const rect = reactFlowContainer.getBoundingClientRect();
        if (!rect) return;

        const relativeX = touchCenter.x - rect.left;
        const relativeY = touchCenter.y - rect.top;

        const newX = relativeX - (relativeX - x) * zoomFactor;
        const newY = relativeY - (relativeY - y) * zoomFactor;

        setViewport({ x: newX, y: newY, zoom: newZoom });
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
  }, [getViewport, setViewport]);

  // Enhanced mouse wheel zoom with improved sensitivity and centering
  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      const reactFlowContainer = reactFlowContainerRef.current;
      const isInsideTree = reactFlowContainer && reactFlowContainer.contains(event.target as Node);

      if (isInsideTree) {
        const { zoom, x, y } = getViewport();
        const scrollSpeed = 0.8; // Improved scroll speed
        const zoomSpeed = 0.08; // More responsive zoom

        if (event.shiftKey) {
          // Horizontal panning with Shift key
          const newX = x - event.deltaY * scrollSpeed;
          setViewport({ x: newX, y, zoom });
          viewportRef.current = { x: newX, y, zoom };
        } else {
          // Zoom toward mouse position
          const rect = reactFlowContainer.getBoundingClientRect();
          if (!rect) return;

          const mouseX = event.clientX - rect.left;
          const mouseY = event.clientY - rect.top;

          let newZoom = zoom + (event.deltaY > 0 ? -zoomSpeed : zoomSpeed);
          newZoom = Math.max(0.1, Math.min(2, newZoom));

          // Calculate new position to zoom toward mouse
          const zoomFactor = newZoom / zoom;
          const newX = mouseX - (mouseX - x) * zoomFactor;
          const newY = mouseY - (mouseY - y) * zoomFactor;

          setViewport({ x: newX, y: newY, zoom: newZoom });
          viewportRef.current = { x: newX, y: newY, zoom: newZoom };
        }
      }
    },
    [getViewport, setViewport]
  );

  // Prevent default wheel behavior inside the flow container
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

  /**
   * Updates visualization when label highlighting state changes.
   * Maintains current viewport while refreshing visual states.
   */
  useEffect(() => {
    // Visual update trigger for highlighting - no viewport changes needed
  }, [highlightedLabels]);

  // Enhanced gradient background with better visual depth
  const backgroundStyle = useMemo(() => {
    const isDark = theme === 'dark';

    return isDark
      ? {
          background: `
        radial-gradient(ellipse at top left, rgba(59, 130, 246, 0.18) 0%, transparent 60%),
        radial-gradient(ellipse at top right, rgba(139, 92, 246, 0.18) 0%, transparent 60%),
        radial-gradient(ellipse at bottom center, rgba(16, 185, 129, 0.12) 0%, transparent 60%),
        linear-gradient(135deg, 
          hsl(222, 84%, 5%) 0%, 
          hsl(215, 28%, 17%) 30%, 
          hsl(215, 20%, 25%) 60%,
          hsl(215, 16%, 32%) 100%
        )
      `,
        }
      : {
          background: `
        radial-gradient(ellipse at top left, rgba(59, 130, 246, 0.12) 0%, transparent 60%),
        radial-gradient(ellipse at top right, rgba(139, 92, 246, 0.12) 0%, transparent 60%),
        radial-gradient(ellipse at bottom center, rgba(16, 185, 129, 0.08) 0%, transparent 60%),
        linear-gradient(135deg, 
          hsl(210, 40%, 98%) 0%, 
          hsl(214, 32%, 91%) 30%, 
          hsl(213, 27%, 84%) 60%,
          hsl(215, 20%, 77%) 100%
        )
      `,
        };
  }, [theme]);

  return (
    <div className="relative h-full w-full overflow-hidden" ref={reactFlowContainerRef}>
      {/* Enhanced animated background overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          ...backgroundStyle,
          zIndex: -2,
        }}
      />

      {/* Floating particles animation with better distribution */}
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
            radial-gradient(circle at 15% 25%, rgba(255, 255, 255, 0.025) 2px, transparent 2px),
            radial-gradient(circle at 85% 75%, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
            radial-gradient(circle at 45% 15%, rgba(255, 255, 255, 0.02) 1.5px, transparent 1.5px),
            radial-gradient(circle at 75% 45%, rgba(255, 255, 255, 0.015) 1px, transparent 1px)
          `
              : `
            radial-gradient(circle at 15% 25%, rgba(0, 0, 0, 0.025) 2px, transparent 2px),
            radial-gradient(circle at 85% 75%, rgba(0, 0, 0, 0.025) 1px, transparent 1px),
            radial-gradient(circle at 45% 15%, rgba(0, 0, 0, 0.02) 1.5px, transparent 1.5px),
            radial-gradient(circle at 75% 45%, rgba(0, 0, 0, 0.015) 1px, transparent 1px)
          `,
          animation: 'floatParticles 25s ease-in-out infinite',
          zIndex: -1,
        }}
      />

      <ReactFlow
        nodes={nodes}
        edges={edges}
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
          borderRadius: '16px',
          border:
            theme === 'dark'
              ? '1px solid rgba(148, 163, 184, 0.08)'
              : '1px solid rgba(148, 163, 184, 0.15)',
          boxShadow:
            theme === 'dark'
              ? `
              inset 0 1px 0 rgba(255, 255, 255, 0.03),
              0 4px 24px rgba(0, 0, 0, 0.15),
              0 2px 8px rgba(0, 0, 0, 0.1)
            `
              : `
              inset 0 1px 0 rgba(255, 255, 255, 0.9),
              0 4px 24px rgba(0, 0, 0, 0.04),
              0 2px 8px rgba(0, 0, 0, 0.02)
            `,
          pointerEvents: 'auto',
        }}
        onWheel={handleWheel}
        defaultEdgeOptions={{ type: edgeType }}
      >
        {/* Enhanced edge gradients */}
        <svg style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0 }}>
          {edgeGradients}
        </svg>

        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1.2}
          color={theme === 'dark' ? 'rgba(148, 163, 184, 0.15)' : 'rgba(148, 163, 184, 0.25)'}
          style={{ opacity: 0.6 }}
        />

        <Background
          variant={BackgroundVariant.Lines}
          gap={80}
          size={0.8}
          color={theme === 'dark' ? 'rgba(59, 130, 246, 0.06)' : 'rgba(59, 130, 246, 0.04)'}
          style={{ opacity: 0.4 }}
        />
      </ReactFlow>

      {/* Enhanced CSS animations */}
      <style>{`
        @keyframes floatParticles {
          0%, 100% { 
            transform: translate3d(0, 0, 0) rotate(0deg) scale(1); 
            opacity: 0.6;
          }
          25% { 
            transform: translate3d(-8px, -12px, 0) rotate(2deg) scale(1.05); 
            opacity: 0.8;
          }
          50% { 
            transform: translate3d(12px, -8px, 0) rotate(-1deg) scale(0.95); 
            opacity: 1;
          }
          75% { 
            transform: translate3d(-6px, 10px, 0) rotate(1.5deg) scale(1.02); 
            opacity: 0.7;
          }
        }
        
        @keyframes edgePulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }

        /* Optimized handle hiding */
        .react-flow__handle {
          opacity: 0 !important;
          pointer-events: none !important;
          background: transparent !important;
          border: none !important;
          width: 0 !important;
          height: 0 !important;
        }

        /* Enhanced edge visibility */
        .react-flow__edge {
          pointer-events: all !important;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
        }

        .react-flow__edge-path {
          stroke-width: 2.5;
          stroke-dasharray: none;
          transition: stroke-width 0.2s ease;
        }

        .react-flow__edge:hover .react-flow__edge-path {
          stroke-width: 3;
        }

        /* Enhanced interactive elements */
        .react-flow__node button {
          pointer-events: auto !important;
          z-index: 15 !important;
          transition: all 0.2s ease;
        }

        .react-flow__node button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .react-flow__node > div {
          pointer-events: auto !important;
        }

        /* Smooth transitions */
        .react-flow__node {
          transition: transform 0.2s ease;
        }

        .react-flow__node:hover {
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
});
