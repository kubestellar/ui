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
 * Features stunning gradients, patterns, and animations for an adorable user experience.
 * Provides smooth zooming, panning, and auto-centering functionality for the Kubernetes resource visualization.
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
   * Calculates the boundaries of all nodes in the flow to determine positioning and scaling.
   * Returns the minimum and maximum x/y coordinates considering both node positions and dimensions.
   */
  const positions = useMemo(() => {
    if (nodes.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    const minX = Math.min(...nodes.map(node => node.position.x));
    const maxX = Math.max(
      ...nodes.map(node => {
        const width =
          typeof node.style?.width === 'string'
            ? parseInt(node.style.width)
            : node.style?.width || 146;
        return node.position.x + width;
      })
    );
    const minY = Math.min(...nodes.map(node => node.position.y));
    const maxY = Math.max(
      ...nodes.map(node => {
        const height =
          typeof node.style?.height === 'string'
            ? parseInt(node.style.height)
            : node.style?.height || 30;
        return node.position.y + height;
      })
    );
    return { minX, maxX, minY, maxY };
  }, [nodes]);

  /**
   * Initializes the viewport based on node positions or restores a previously saved viewport.
   * Adjusts the container height based on the content and sets proper zoom level for optimal viewing.
   */
  useEffect(() => {
    if (nodes.length > 0 && !initializedRef.current) {
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
  }, [nodes, positions, setViewport, currentZoom]);

  /**
   * Saves the current viewport position and zoom level when user stops panning or zooming.
   * This persists the view state between component re-renders.
   */
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

  // Enhanced mouse wheel zoom: zoom with wheel unless Shift (pan horizontally)
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
          viewportRef.current = { x, y, zoom: newZoom };
        }
      }
    },
    [getViewport, setViewport]
  );

  // Add a separate wheel event handler with passive: false
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
   * Allows nodes with highlighted labels to be visually distinct without resetting the viewport.
   */
  useEffect(() => {}, [highlightedLabels]);

  // Beautiful background styles based on theme
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

      {/* Enhanced animations */}
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

        /* Ensure edge paths remain visible */
        .react-flow__edge-path {
          stroke-width: 2;
          stroke-dasharray: none;
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
