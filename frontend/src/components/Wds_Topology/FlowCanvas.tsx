import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, { Background, BackgroundVariant, PanOnScrollMode, useReactFlow } from 'reactflow';
import useLabelHighlightStore from '../../stores/labelHighlightStore';
import useZoomStore from '../../stores/zoomStore';
import useEdgeTypeStore from '../../stores/edgeTypeStore';
import { CustomEdge, CustomNode } from '../TreeViewComponent';

interface FlowCanvasProps {
  nodes: CustomNode[];
  edges: CustomEdge[];
  renderStartTime: React.MutableRefObject<number>;
  theme: string; // Add theme prop
}

/**
 * Renders a flow diagram canvas with custom nodes and edges in a ReactFlow container.
 * Provides zooming, panning, and auto-centering functionality for the Kubernetes resource visualization.
 * Handles viewport positioning and maintains view state between renders.
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

  /**
   * Updates visualization when label highlighting state changes.
   * Allows nodes with highlighted labels to be visually distinct without resetting the viewport.
   */
  useEffect(() => {}, [highlightedLabels]);

  return (
    <div ref={reactFlowContainerRef} style={{ width: '100%', height: '100%' }}>
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView={false}
      panOnDrag={true}
      zoomOnScroll={false}
      zoomOnDoubleClick={false}
      zoomOnPinch={false}
      panOnScroll={true}
      panOnScrollMode={PanOnScrollMode.Free}
      onMoveEnd={onMoveEnd}
      style={{
        background: theme === 'dark' ? 'rgb(15, 23, 42)' : 'rgb(222, 230, 235)',
        width: '100%',
        height: '100%',
        borderRadius: '4px',
      }}
      onWheel={handleWheel}
        defaultEdgeOptions={{ type: edgeType }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={12}
        size={1}
        color={theme === 'dark' ? '#555' : '#bbb'}
      />
    </ReactFlow>
    </div>
  );
});
