import { memo, useMemo, useEffect, useCallback } from "react";
import ReactFlow, { Background, useReactFlow, BackgroundVariant } from "reactflow";
import { CustomNode, CustomEdge } from "../TreeViewComponent";

interface FlowCanvasProps {
  nodes: CustomNode[];
  edges: CustomEdge[];
  renderStartTime: React.MutableRefObject<number>;
  theme: string; // Add theme prop
}

export const FlowCanvas = memo<FlowCanvasProps>(({ nodes, edges, theme }) => {
  // renderStartTime betwwen the nodes and edges 
  const { setViewport, getViewport } = useReactFlow();
  // const startRenderTime = performance.now();
  // console.log(`FlowCanvas starting render with ${nodes.length} nodes and ${edges.length} edges at ${startRenderTime - renderStartTime.current}ms`);

  const positions = useMemo(() => {
    if (nodes.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    const minX = Math.min(...nodes.map((node) => node.position.x));
    const maxX = Math.max(
      ...nodes.map((node) => {
        const width = typeof node.style?.width === "string" ? parseInt(node.style.width) : node.style?.width || 146;
        return node.position.x + width;
      })
    );
    const minY = Math.min(...nodes.map((node) => node.position.y));
    const maxY = Math.max(
      ...nodes.map((node) => {
        const height = typeof node.style?.height === "string" ? parseInt(node.style.height) : node.style?.height || 30;
        return node.position.y + height;
      })
    );
    return { minX, maxX, minY, maxY };
  }, [nodes]);

  useEffect(() => {
    if (nodes.length > 0) {
      const { minX, minY, maxY } = positions;
      const treeHeight = maxY - minY;

      const reactFlowContainer = document.querySelector(".react-flow") as HTMLElement;
      const viewportHeight = reactFlowContainer ? reactFlowContainer.offsetHeight : window.innerHeight;

      const padding = 20;
      const topMargin = 100;
      const initialZoom = 1.6;

      const centerX = -minX * initialZoom + 50;
      const centerY = -minY * initialZoom + topMargin;

      if (reactFlowContainer) {
        reactFlowContainer.style.minHeight = `${Math.max(treeHeight * initialZoom + padding * 2 + topMargin, viewportHeight)}px`;
      }

      setViewport({ x: centerX, y: centerY, zoom: initialZoom });
    }
  }, [nodes, edges, setViewport, positions]);

  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      const reactFlowContainer = document.querySelector(".react-flow");
      const isInsideTree = reactFlowContainer && reactFlowContainer.contains(event.target as Node);

      if (isInsideTree) {
        const { zoom, x, y } = getViewport();
        const scrollSpeed = 0.5;
        const zoomSpeed = 0.05;

        if (event.shiftKey) {
          const newX = x - event.deltaY * scrollSpeed;
          setViewport({ x: newX, y, zoom });
        } else if (event.ctrlKey) {
          const newZoom = Math.min(Math.max(zoom + (event.deltaY > 0 ? -zoomSpeed : zoomSpeed), 0.1), 2);
          setViewport({ x, y, zoom: newZoom });
        } else {
          const { minY, maxY } = positions;
          const treeHeight = maxY - minY;
          const zoomedTreeHeight = treeHeight * zoom;
          const minScrollY = -zoomedTreeHeight + 10;
          const maxScrollY = 10;

          const newY = y - event.deltaY * scrollSpeed;
          const clampedY = Math.min(Math.max(newY, minScrollY), maxScrollY);
          setViewport({ x, y: clampedY, zoom });
        }
      }
    },
    [getViewport, setViewport, positions]
  );

  // const endRenderTime = performance.now();
  // console.log(`FlowCanvas completed render in ${endRenderTime - startRenderTime}ms at ${endRenderTime - renderStartTime.current}ms`);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView={false}
      panOnDrag={true}
      zoomOnScroll={false}
      zoomOnDoubleClick={false}
      zoomOnPinch={false}
      style={{ 
        background: theme === "dark" ? "rgb(15, 23, 42)" : "rgb(222, 230, 235)", 
        width: "100%", 
        height: "100%", 
        borderRadius:"4px"
      }}
      onWheel={handleWheel}
    >
      <Background 
        variant={BackgroundVariant.Dots} 
        gap={12} 
        size={1} 
        color={theme === "dark" ? "#555" : "#bbb"} // Dark mode background dots
      />
    </ReactFlow>
  );
});