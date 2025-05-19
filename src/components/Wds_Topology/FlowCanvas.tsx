import { memo, useMemo, useEffect, useCallback, useRef } from 'react';
import ReactFlow, { Background, useReactFlow, BackgroundVariant } from 'reactflow';
import { CustomNode, CustomEdge } from '../TreeViewComponent';
import useLabelHighlightStore from '../../stores/labelHighlightStore';

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
  const viewportRef = useRef({ x: 0, y: 0, zoom: 1.6 });

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
    if (nodes.length > 0) {
      const { minX, minY, maxY } = positions;
      const treeHeight = maxY - minY;

      const reactFlowContainer = document.querySelector('.react-flow') as HTMLElement;
      const viewportHeight = reactFlowContainer
        ? reactFlowContainer.offsetHeight
        : window.innerHeight;

      const padding = 20;
      const topMargin = 100;
      const initialZoom = 1.6;

      const centerX = -minX * initialZoom + 50;
      const centerY = -minY * initialZoom + topMargin;

      if (reactFlowContainer) {
        reactFlowContainer.style.minHeight = `${Math.max(treeHeight * initialZoom + padding * 2 + topMargin, viewportHeight)}px`;
      }

      if (
        viewportRef.current.zoom === 1.6 &&
        viewportRef.current.x === 0 &&
        viewportRef.current.y === 0
      ) {
        const initialViewport = { x: centerX, y: centerY, zoom: initialZoom };
        setViewport(initialViewport);
        viewportRef.current = initialViewport;
      } else {
        setViewport(viewportRef.current);
      }
    }
  }, [nodes, edges, setViewport, positions]);

  /**
   * Saves the current viewport position and zoom level when user stops panning or zooming.
   * This persists the view state between component re-renders.
   */
  const onMoveEnd = useCallback(() => {
    const currentViewport = getViewport();
    viewportRef.current = currentViewport;
  }, [getViewport]);

  /**
   * Custom wheel event handler that provides enhanced control over panning and zooming.
   * Enables horizontal scrolling with Shift key, zooming with Ctrl key, and vertical scrolling by default.
   * Clamps scrolling within appropriate boundaries based on tree dimensions.
   */
  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      const reactFlowContainer = document.querySelector('.react-flow');
      const isInsideTree = reactFlowContainer && reactFlowContainer.contains(event.target as Node);

      if (isInsideTree) {
        const { zoom, x, y } = getViewport();
        const scrollSpeed = 0.5;
        const zoomSpeed = 0.05;

        if (event.shiftKey) {
          const newX = x - event.deltaY * scrollSpeed;
          setViewport({ x: newX, y, zoom });
          viewportRef.current = { x: newX, y, zoom };
        } else if (event.ctrlKey) {
          const newZoom = Math.min(
            Math.max(zoom + (event.deltaY > 0 ? -zoomSpeed : zoomSpeed), 0.1),
            2
          );
          setViewport({ x, y, zoom: newZoom });
          viewportRef.current = { x, y, zoom: newZoom };
        } else {
          const { minY, maxY } = positions;
          const treeHeight = maxY - minY;
          const zoomedTreeHeight = treeHeight * zoom;
          const minScrollY = -zoomedTreeHeight + 10;
          const maxScrollY = 10;

          const newY = y - event.deltaY * scrollSpeed;
          const clampedY = Math.min(Math.max(newY, minScrollY), maxScrollY);
          setViewport({ x, y: clampedY, zoom });
          viewportRef.current = { x, y: clampedY, zoom };
        }
      }
    },
    [getViewport, setViewport, positions]
  );

  /**
   * Updates visualization when label highlighting state changes.
   * Allows nodes with highlighted labels to be visually distinct without resetting the viewport.
   */
  useEffect(() => {}, [highlightedLabels]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView={false}
      panOnDrag={true}
      zoomOnScroll={false}
      zoomOnDoubleClick={false}
      zoomOnPinch={false}
      onMoveEnd={onMoveEnd}
      style={{
        background: theme === 'dark' ? 'rgb(15, 23, 42)' : 'rgb(222, 230, 235)',
        width: '100%',
        height: '100%',
        borderRadius: '4px',
      }}
      onWheel={handleWheel}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={12}
        size={1}
        color={theme === 'dark' ? '#555' : '#bbb'}
      />
    </ReactFlow>
  );
});
