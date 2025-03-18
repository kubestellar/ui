import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import {
  Box,
  Typography,
  Menu,
  MenuItem,
  Button,
  Alert,
  AlertTitle,
  Snackbar,
} from "@mui/material";
import axios, { AxiosError } from "axios";
import ReactFlow, { Background, useReactFlow, BackgroundVariant, Position, MarkerType } from "reactflow";
import { ReactFlowProvider } from "reactflow";
import * as dagre from "dagre";
import "reactflow/dist/style.css";
import deployicon from "../assets/deploy.svg";
import ns from "../assets/ns.svg";
import svc from "../assets/svc.svg";
import rs from "../assets/rs.svg";
import cm from "../assets/cm.svg";
import ep from "../assets/ep.svg";
import { ZoomIn, ZoomOut } from "@mui/icons-material";
import { FiMoreVertical } from "react-icons/fi";
import "@fortawesome/fontawesome-free/css/all.min.css";
import LoadingFallback from "./LoadingFallback";
import DynamicDetailsPanel from "./DynamicDetailsPanel";
import NewAppDialog from "./NewAppDialog";
import ReactDOM from "react-dom";

// Interfaces (unchanged)
interface NodeData {
  label: JSX.Element;
}

interface BaseNode {
  id: string;
  data: NodeData;
  position: { x: number; y: number };
  style?: React.CSSProperties;
}

interface CustomNode extends BaseNode {
  sourcePosition?: Position;
  targetPosition?: Position;
  collapsed?: boolean;
  showMenu?: boolean;
}

interface BaseEdge {
  id: string;
  source: string;
  target: string;
}

interface CustomEdge extends BaseEdge {
  type?: string;
  animated?: boolean;
  style?: React.CSSProperties;
  markerEnd?: {
    type: MarkerType;
    width?: number;
    height?: number;
    color?: string;
  };
}

interface NamespaceResource {
  name: string;
  status: string;
  labels: Record<string, string>;
  resources: Record<string, ResourceItem[]>;
}

export interface ResourceItem {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp: string;
    labels?: Record<string, string>;
    [key: string]: string | undefined | Record<string, string>;
  };
  spec?: {
    ports?: Array<{ name: string; port: number }>;
    holderIdentity?: string;
  };
  status?: {
    conditions?: Array<{ type: string; status: string }>;
    phase?: string;
  };
  data?: Record<string, string>;
  subsets?: Array<{
    addresses?: Array<{ ip: string }>;
    ports?: Array<{ name?: string; port?: number }>;
  }>;
  endpoints?: Array<{
    addresses?: string[];
    ports?: Array<{ name?: string; port?: number }>;
  }>;
  ports?: Array<{ name?: string; port?: number }>;
  subjects?: Array<{ name: string }>;
  roleRef?: { name: string };
  rules?: Array<{
    verbs?: string[];
    resources?: string[];
  }>;
}

interface SelectedNode {
  namespace: string;
  name: string;
  type: string;
  onClose: () => void;
  isOpen: boolean;
  resourceData?: ResourceItem;
}

interface ResourcesMap {
  endpoints: ResourceItem[];
  endpointSlices: ResourceItem[];
  [key: string]: ResourceItem[];
}

const nodeStyle: React.CSSProperties = {
  padding: "2px 12px",
  fontSize: "6px",
  border: "none",
  width: "146px",
  height: "30px",
};

// Type definition for NODE_TYPE_CONFIG (unchanged)
interface NodeTypeConfig {
  icon: string;
  dynamicText: string;
}

const NODE_TYPE_CONFIG: { [key: string]: NodeTypeConfig } = {
  namespace: { icon: ns, dynamicText: "ns" },
  deployment: { icon: deployicon, dynamicText: "deploy" },
  service: { icon: svc, dynamicText: "svc" },
  replicaset: { icon: rs, dynamicText: "replica" },
  container: { icon: deployicon, dynamicText: "container" },
  configmap: { icon: cm, dynamicText: "config" },
  data: { icon: cm, dynamicText: "data" },
  endpoints: { icon: ep, dynamicText: "endpoint" },
  endpointslice: { icon: ep, dynamicText: "slice" },
  subset: { icon: ep, dynamicText: "subset" },
  serviceaccount: { icon: cm, dynamicText: "sa" },
  lease: { icon: cm, dynamicText: "lease" },
  role: { icon: cm, dynamicText: "role" },
  rolebinding: { icon: cm, dynamicText: "rb" },
  subject: { icon: cm, dynamicText: "subject" },
  ruleref: { icon: cm, dynamicText: "rule" },
  port: { icon: svc, dynamicText: "port" },
};

// NodeLabel component (unchanged)
const NodeLabel = memo(
  ({
    label,
    icon,
    dynamicText,
    status,
    timeAgo,
    onClick,
    onMenuClick,
  }: {
    label: string;
    icon: string;
    dynamicText: string;
    status: string;
    timeAgo?: string;
    onClick: (e: React.MouseEvent) => void;
    onMenuClick: (e: React.MouseEvent) => void;
    resourceData?: ResourceItem;
  }) => {
    const heartColor = status === "Active" ? "rgb(24, 190, 148)" : "#ff0000";

    return (
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}
        onClick={onClick}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "-5px" }}>
          <div>
            <img src={icon} alt={label} width="18" height="18" />
            <span style={{ color: "gray", fontWeight: 500 }}>{dynamicText}</span>
          </div>
          <div style={{ textAlign: "left" }}>
            <div>{label}</div>
            <div style={{ display: "flex", gap: "1px" }}>
              <i className="fas fa-heart" style={{ color: heartColor, fontSize: "6px" }}></i>
              {heartColor === "#ff0000" ? (
                <i className="fa fa-times-circle" style={{ color: "#ff0000", marginRight: "4px" }}></i>
              ) : (
                <i className="fa fa-check-circle" style={{ color: "rgb(24, 190, 148)", marginRight: "4px" }}></i>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <FiMoreVertical
            style={{ fontSize: "11px", color: "#34aadc", marginRight: "-10px", cursor: "pointer" }}
            onClick={onMenuClick}
          />
        </div>
        {timeAgo && (
          <div
            style={{
              position: "absolute",
              bottom: "-6px",
              right: "-10px",
              fontSize: "5px",
              color: "#495763",
              background: "#ccd6dd",
              padding: "0 2px",
              border: "1px solid #8fa4b1",
              borderRadius: "3px",
            }}
          >
            {timeAgo}
          </div>
        )}
      </div>
    );
  }
);

// CustomZoomControls (unchanged)
const CustomZoomControls = memo(() => {
  const { getZoom, setViewport } = useReactFlow();
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const snapToStep = useCallback((zoom: number) => {
    const step = 10;
    return Math.round(zoom / step) * step;
  }, []);

  useEffect(() => {
    const currentZoom = getZoom() * 100;
    const snappedZoom = snapToStep(currentZoom);
    setZoomLevel(Math.min(Math.max(snappedZoom, 10), 200));
  }, [getZoom, snapToStep]);

  const animateZoom = useCallback((targetZoom: number, duration: number = 200) => {
    const startZoom = getZoom();
    const startTime = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const newZoom = startZoom + (targetZoom - startZoom) * progress;
      setViewport({ zoom: newZoom, x: 0, y: 10 });

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setZoomLevel(snapToStep(newZoom * 100));
      }
    };

    requestAnimationFrame(step);
  }, [getZoom, setViewport, snapToStep]);

  const handleZoomIn = useCallback(() => {
    const currentZoom = getZoom() * 100;
    const newZoomPercentage = snapToStep(currentZoom + 10);
    const newZoom = Math.min(newZoomPercentage / 100, 2);
    animateZoom(newZoom);
  }, [animateZoom, getZoom, snapToStep]);

  const handleZoomOut = useCallback(() => {
    const currentZoom = getZoom() * 100;
    const newZoomPercentage = snapToStep(currentZoom - 10);
    const newZoom = Math.max(newZoomPercentage / 100, 0.1);
    animateZoom(newZoom);
  }, [animateZoom, getZoom, snapToStep]);

  return (
    <Box
      sx={{
        position: "absolute",
        top: 20,
        left: 20,
        display: "flex",
        gap: 1,
        background: "#fff",
        padding: "4px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
      }}
    >
      <Button variant="text" onClick={handleZoomIn}>
        <ZoomIn />
      </Button>
      <Button variant="text" onClick={handleZoomOut}>
        <ZoomOut />
      </Button>
      <Typography
        variant="body1"
        sx={{
          border: "2px solid #1976d2",
          backgroundColor: "#e3f2fd",
          padding: "4px 8px",
          textAlign: "center",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "50px",
        }}
      >
        {zoomLevel}%
      </Typography>
    </Box>
  );
});

// FlowWithScroll (unchanged)
const FlowWithScroll = memo(({ nodes, edges, renderStartTime }: { nodes: CustomNode[]; edges: CustomEdge[]; renderStartTime: React.MutableRefObject<number> }) => {
  const { setViewport, getViewport } = useReactFlow();
  const startRenderTime = performance.now();
  console.log(`FlowWithScroll starting render with ${nodes.length} nodes and ${edges.length} edges at ${startRenderTime - renderStartTime.current}ms`);

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
      const { minX, maxX, minY, maxY } = positions;
      const treeWidth = maxX - minX;
      const treeHeight = maxY - minY;

      const reactFlowContainer = document.querySelector(".react-flow") as HTMLElement;
      const viewportWidth = reactFlowContainer ? reactFlowContainer.offsetWidth : window.innerWidth;
      const viewportHeight = reactFlowContainer ? reactFlowContainer.offsetHeight : window.innerHeight;

      const padding = 20;
      const topMargin = 100;
      const zoomX = (viewportWidth - padding * 2) / treeWidth;
      const zoomY = (viewportHeight - padding * 2 - topMargin) / treeHeight;
      const initialZoom = Math.min(Math.max(Math.min(zoomX, zoomY), 0.1), 2);

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

  const endRenderTime = performance.now();
  console.log(`FlowWithScroll completed render in ${endRenderTime - startRenderTime}ms at ${endRenderTime - renderStartTime.current}ms`);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView={false}
      panOnDrag={true}
      zoomOnScroll={false}
      zoomOnDoubleClick={false}
      zoomOnPinch={false}
      style={{ background: "rgb(222, 230, 235)", width: "100%", height: "100%" }}
      onWheel={handleWheel}
    >
      <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
    </ReactFlow>
  );
});

// getLayoutedElements (unchanged)
const getLayoutedElements = (nodes: CustomNode[], edges: CustomEdge[], direction = "LR", prevNodes: React.MutableRefObject<CustomNode[]>) => {
  console.time("getLayoutedElements");
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 40, ranksep: 100 });

  const nodeMap = new Map<string, CustomNode>(prevNodes.current.map(node => [node.id, node]));
  const newNodes: CustomNode[] = [];

  nodes.forEach((node) => {
    const cachedNode = nodeMap.get(node.id);
    if (!cachedNode || JSON.stringify(cachedNode) !== JSON.stringify(node)) {
      dagreGraph.setNode(node.id, { width: 110, height: 30 });
      newNodes.push(node);
    } else {
      newNodes.push(cachedNode);
    }
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = newNodes.map((node) => {
    const dagreNode = dagreGraph.node(node.id);
    return dagreNode ? {
      ...node,
      position: {
        x: dagreNode.x - 73 + 50,
        y: dagreNode.y - 15 + 50,
      },
    } : node;
  });

  console.timeEnd("getLayoutedElements");
  return { nodes: layoutedNodes, edges };
};

// TreeView component with fixes
const TreeView = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [responseData, setResponseData] = useState<NamespaceResource[] | null>(null);
  const [nodes, setNodes] = useState<CustomNode[]>([]);
  const [edges, setEdges] = useState<CustomEdge[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");
  const [contextMenu, setContextMenu] = useState<{ nodeId: string | null; x: number; y: number } | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const nodeCache = useRef<Map<string, CustomNode>>(new Map());
  const edgeCache = useRef<Map<string, CustomEdge>>(new Map());
  const prevNodes = useRef<CustomNode[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const renderStartTime = useRef<number>(0);

  const getTimeAgo = useCallback((timestamp: string | undefined): string => {
    if (!timestamp) return "Unknown";
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? "Today" : `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  }, []);

  const handleMenuOpen = useCallback((event: React.MouseEvent, nodeId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ nodeId, x: event.clientX, y: event.clientY });
  }, []);

  const handleClosePanel = useCallback(() => {
    if (selectedNode) {
      setSelectedNode({ ...selectedNode, isOpen: false });
      setTimeout(() => setSelectedNode(null), 400);
    }
  }, [selectedNode]);

  const createNode = useCallback((
    id: string,
    label: string,
    type: string,
    status: string,
    timestamp: string | undefined,
    namespace: string | undefined,
    resourceData: ResourceItem | undefined,
    parent: string | null,
    newNodes: CustomNode[],
    newEdges: CustomEdge[]
  ) => {
    console.log(`Creating node: id=${id}, type=${type}, label=${label}, parent=${parent || "none"} at ${performance.now() - renderStartTime.current}ms`);
    const config = NODE_TYPE_CONFIG[type.toLowerCase()] || { icon: cm, dynamicText: type.toLowerCase() };
    const timeAgo = getTimeAgo(timestamp);
    const cachedNode = nodeCache.current.get(id);

    const node = cachedNode || {
      id,
      data: {
        label: (
          <NodeLabel
            label={label}
            icon={config.icon}
            dynamicText={config.dynamicText}
            status={status}
            timeAgo={timeAgo}
            onClick={(e) => {
              if ((e.target as HTMLElement).tagName === "svg" || (e.target as HTMLElement).closest("svg")) return;
              setSelectedNode({
                namespace: namespace || "default",
                name: label,
                type: type.toLowerCase(),
                onClose: handleClosePanel,
                isOpen: true,
                resourceData,
              });
            }}
            onMenuClick={(e) => handleMenuOpen(e, id)}
          />
        ),
      },
      position: { x: 0, y: 0 },
      style: { ...nodeStyle, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 12px" },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    };

    if (!cachedNode) nodeCache.current.set(id, node);
    newNodes.push(node);

    if (parent) {
      const edgeId = `edge-${parent}-${id}`;
      const cachedEdge = edgeCache.current.get(edgeId);
      if (!cachedEdge) {
        const edge = {
          id: edgeId,
          source: parent,
          target: id,
          type: "step",
          animated: true,
          style: { stroke: "#a3a3a3", strokeDasharray: "2,2" },
          markerEnd: { type: MarkerType.ArrowClosed },
        };
        newEdges.push(edge);
        edgeCache.current.set(edgeId, edge);
      } else {
        newEdges.push(cachedEdge);
      }
    }
  }, [getTimeAgo, handleClosePanel, handleMenuOpen]);

  const transformDataToTree = useCallback(
    (data: NamespaceResource[]) => {
      const startTransformTime = performance.now();
      console.log(`transformDataToTree received ${data.length} namespaces at ${startTransformTime - renderStartTime.current}ms`);
      if (!data || data.length === 0) {
        console.log(`Skipping transformDataToTree: no data to process at ${performance.now() - renderStartTime.current}ms`);
        setNodes([]);
        setEdges([]);
        return;
      }

      const newNodes: CustomNode[] = [];
      const newEdges: CustomEdge[] = [];
      const resourceMap = new Map<string, ResourceItem>();

      data.forEach((namespace) => {
        const resourcesMap: ResourcesMap = {
          endpoints: namespace.resources[".v1/endpoints"] || [],
          endpointSlices: namespace.resources["discovery.k8s.io.v1/endpointslices"] || [],
          ...namespace.resources,
        };
        console.log(`Namespace ${namespace.name} has ${Object.values(resourcesMap).flat().length} resources at ${performance.now() - renderStartTime.current}ms`);
        Object.values(resourcesMap).flat().forEach((item) => {
          resourceMap.set(`${namespace.name}-${item.kind.toLowerCase()}-${item.metadata.name}`, item);
        });
      });

      data.forEach((namespace) => {
        const namespaceId = `namespace-${namespace.name}`;
        createNode(
          namespaceId,
          namespace.name,
          "namespace",
          namespace.status,
          "",
          namespace.name,
          { apiVersion: "v1", kind: "Namespace", metadata: { name: namespace.name, namespace: namespace.name, creationTimestamp: "" }, status: { phase: namespace.status } },
          null,
          newNodes,
          newEdges
        );
        console.log(`After creating namespace ${namespace.name}: ${newNodes.length} nodes, ${newEdges.length} edges at ${performance.now() - renderStartTime.current}ms`);

        const resourcesMap: ResourcesMap = {
          endpoints: namespace.resources[".v1/endpoints"] || [],
          endpointSlices: namespace.resources["discovery.k8s.io.v1/endpointslices"] || [],
          ...namespace.resources,
        };

        Object.values(resourcesMap).flat().forEach((item) => {
          const kindLower = item.kind.toLowerCase();
          const resourceId = `${namespaceId}-${kindLower}-${item.metadata.name}`;
          const status = item.status?.conditions?.some((c) => c.type === "Available" && c.status === "True") ? "Active" : "Inactive";

          createNode(resourceId, item.metadata.name, kindLower, status, item.metadata.creationTimestamp, namespace.name, item, namespaceId, newNodes, newEdges);

          if (kindLower === "configmap" && item.data) {
            Object.keys(item.data).forEach((key) => createNode(`${resourceId}-data-${key}`, key, "data", status, undefined, namespace.name, item, resourceId, newNodes, newEdges));
          } else if (kindLower === "service") {
            item.spec?.ports?.forEach((port) => createNode(`${resourceId}-port-${port.name}`, `${port.name} (${port.port})`, "port", status, undefined, namespace.name, item, resourceId, newNodes, newEdges));

            const endpoints = resourcesMap.endpoints.find((ep) => ep.metadata.name === item.metadata.name);
            if (endpoints) {
              const endpointId = `${resourceId}-endpoints-${endpoints.metadata.name}`;
              createNode(endpointId, endpoints.metadata.name, "endpoints", status, undefined, namespace.name, endpoints, resourceId, newNodes, newEdges);
              endpoints.subsets?.forEach((subset, idx) => {
                const subsetId = `${endpointId}-subset-${idx}`;
                createNode(subsetId, `Subset ${idx + 1}`, "subset", status, undefined, namespace.name, endpoints, endpointId, newNodes, newEdges);
                subset.addresses?.forEach((addr) => createNode(`${subsetId}-addr-${addr.ip}`, addr.ip, "data", status, undefined, namespace.name, endpoints, subsetId, newNodes, newEdges));
                subset.ports?.forEach((port) => createNode(`${subsetId}-port-${port.name || idx}`, `${port.name || "port"} (${port.port})`, "port", status, undefined, namespace.name, endpoints, subsetId, newNodes, newEdges));
              });
            }

            const endpointSlices = resourcesMap.endpointSlices.filter((es) => es.metadata.labels?.["kubernetes.io/service-name"] === item.metadata.name);
            endpointSlices.forEach((es) => {
              const esId = `${resourceId}-endpointslice-${es.metadata.name}`;
              createNode(esId, es.metadata.name, "endpointslice", status, undefined, namespace.name, es, resourceId, newNodes, newEdges);
              es.endpoints?.forEach((endpoint, idx) => {
                const endpointId = `${esId}-endpoint-${idx}`;
                createNode(endpointId, `Endpoint ${idx + 1}`, "data", status, undefined, namespace.name, es, esId, newNodes, newEdges);
                endpoint.addresses?.forEach((addr) => createNode(`${endpointId}-addr-${addr}`, addr, "data", status, undefined, namespace.name, es, endpointId, newNodes, newEdges));
                es.ports?.forEach((port) => createNode(`${endpointId}-port-${port.name || idx}`, `${port.name || "port"} (${port.port})`, "port", status, undefined, namespace.name, es, endpointId, newNodes, newEdges));
              });
            });
          } else if (kindLower === "deployment") {
            createNode(`${resourceId}-replicaset`, `replicaset-${item.metadata.name}`, "replicaset", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
          } else if (kindLower === "lease" && item.spec) {
            createNode(`${resourceId}-holder`, item.spec.holderIdentity || "Unknown Holder", "data", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
          } else if (kindLower === "rolebinding") {
            item.subjects?.forEach((subject, idx) => createNode(`${resourceId}-subject-${idx}`, subject.name, "subject", status, undefined, namespace.name, item, resourceId, newNodes, newEdges));
            createNode(`${resourceId}-roleref`, item.roleRef?.name || "Unknown Role", "ruleref", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
          } else if (kindLower === "role") {
            item.rules?.forEach((rule, idx) => {
              const ruleLabel = `${rule.verbs?.join("/") || ""} ${rule.resources?.join(",") || "all"}`;
              createNode(`${resourceId}-rule-${idx}`, ruleLabel, "ruleref", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
            });
          }
        });
      });

      console.log(`Final transformDataToTree: ${newNodes.length} nodes, ${newEdges.length} edges at ${performance.now() - renderStartTime.current}ms`);
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges, "LR", prevNodes);
      
      ReactDOM.unstable_batchedUpdates(() => {
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
      });
      prevNodes.current = layoutedNodes;
      console.log(`transformDataToTree completed in ${performance.now() - startTransformTime}ms`);
    },
    [createNode]
  );

  const connectWebSocket = useCallback((reconnectFunc: () => void): WebSocket => {
    const ws = new WebSocket("ws://localhost:4000/ws/namespaces");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`WebSocket connected at ${performance.now() - renderStartTime.current}ms`);
      setIsWsConnected(true);
    };

    ws.onmessage = (event) => {
      const receiveTime = performance.now();
      console.log(`Raw WebSocket data received at ${receiveTime - renderStartTime.current}ms`);

      const startParseTime = performance.now();
      let data: NamespaceResource[] = [];
      try {
        data = JSON.parse(event.data);
      } catch (error) {
        console.error(`Failed to parse WebSocket data at ${performance.now() - renderStartTime.current}ms:`, error);
        return;
      }
      console.log(`Parsed ${data.length} namespaces in ${performance.now() - startParseTime}ms`);

      const startFilterTime = performance.now();
      const filteredData = data.filter(
        (namespace) => !["kubestellar-report", "kube-node-lease", "kube-public", "default", "kube-system"].includes(namespace.name)
      );
      console.log(`After filtering, ${filteredData.length} namespaces remain in ${performance.now() - startFilterTime}ms at ${performance.now() - renderStartTime.current}ms`);

      requestIdleCallback(() => {
        setResponseData(filteredData);
      }, { timeout: 100 });

      if (filteredData.length > 0) {
        transformDataToTree(filteredData);
      } else {
        console.log(`No namespaces to process after filtering at ${performance.now() - renderStartTime.current}ms`);
        ReactDOM.unstable_batchedUpdates(() => {
          setNodes([]);
          setEdges([]);
        });
      }
    };

    ws.onerror = (error) => {
      console.log(`WebSocket error occurred at ${performance.now() - renderStartTime.current}ms:`, error);
      setIsWsConnected(false);
    };

    ws.onclose = () => {
      console.log(`WebSocket disconnected at ${performance.now() - renderStartTime.current}ms, attempting to reconnect...`);
      setIsWsConnected(false);
      wsRef.current = null;
      reconnectFunc();
    };

    return ws;
  }, [transformDataToTree]);

  const reconnectWebSocket = useCallback((): void => {
    let retryCount = 0;
    const maxBackoff = 500;
    const initialDelay = 50;

    const attemptReconnect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const delay = Math.min(initialDelay * Math.pow(2, retryCount), maxBackoff);
      retryCount++;

      setTimeout(() => {
        console.log(`Reconnecting WebSocket (attempt ${retryCount}, delay ${delay}ms) at ${performance.now() - renderStartTime.current}ms...`);
        connectWebSocket(reconnectWebSocket);
      }, delay);
    };

    attemptReconnect();
  }, [connectWebSocket]);

  useEffect(() => {
    renderStartTime.current = performance.now();
    console.log(`TreeView mounted at 0ms`);
    connectWebSocket(reconnectWebSocket);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectWebSocket, reconnectWebSocket]);

  const handleDeploy = useCallback(async (githubUrl: string, path: string) => {
    if (!githubUrl || !path) {
      setSnackbarMessage("Please fill both GitHub URL and Path fields!");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post("http://localhost:4000/api/deploy", {
        repo_url: githubUrl,
        folder_path: path,
      });

      console.log(`Deploy response at ${performance.now() - renderStartTime.current}ms:`, response);

      if (response.status === 200) {
        setSnackbarMessage("Deployed successfully!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);

        if (Array.isArray(response.data)) {
          setResponseData(response.data);
          transformDataToTree(response.data);
        } else {
          console.warn(`Unexpected data format at ${performance.now() - renderStartTime.current}ms:`, response.data);
          setResponseData([]);
        }
      } else {
        throw new Error(`Unexpected response status: ${response.status} at ${performance.now() - renderStartTime.current}ms`);
      }
    } catch (error: unknown) {
      const err = error as AxiosError;
      console.error(`Deploy error at ${performance.now() - renderStartTime.current}ms:`, err);

      if (err.response) {
        if (err.response.status === 500) {
          setSnackbarMessage("Deploy already exists!");
        } else if (err.response.status === 409) {
          setSnackbarMessage("Conflict error: Deployment already in progress!");
        } else {
          setSnackbarMessage(`Deployment failed! (${err.response.status})`);
        }
      } else {
        setSnackbarMessage("Deployment failed due to network error!");
      }

      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      setResponseData([]);
    } finally {
      setLoading(false);
      setDialogOpen(false);
    }
  }, [transformDataToTree]);

  const handleMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleMenuAction = useCallback(
    (action: string) => {
      if (contextMenu?.nodeId) {
        const node = nodes.find((n) => n.id === contextMenu.nodeId);
        if (node) {
          const nodeType = node.id.split("-")[1];
          const nodeName = node.data.label.props.label;
          const namespace = nodeType === "namespace" ? nodeName : node.id.split("-")[0].replace("namespace-", "");

          switch (action) {
            case "Details":
              setSelectedNode({
                namespace: namespace || "default",
                name: nodeName,
                type: nodeType,
                onClose: handleClosePanel,
                isOpen: true,
                resourceData: node.data.label.props.resourceData,
              });
              break;
            case "Delete":
              console.log(`Deleting node ${node.id} at ${performance.now() - renderStartTime.current}ms`);
              setNodes(nodes.filter((n) => n.id !== node.id));
              setEdges(edges.filter((e) => e.source !== node.id && e.target !== node.id));
              nodeCache.current.delete(node.id);
              break;
            case "Logs":
              console.log(`Showing logs for node ${node.id} at ${performance.now() - renderStartTime.current}ms`);
              break;
            default:
              break;
          }
        }
      }
      handleMenuClose();
    },
    [contextMenu, nodes, edges, handleMenuClose, handleClosePanel]
  );

  const handleSnackbarClose = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  const handleDialogOpen = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
  }, []);

  return (
    <Box sx={{ display: "flex", height: "100vh", width: "100%", position: "relative" }}>
      <Box
        sx={{
          flex: 1,
          position: "relative",
          filter: selectedNode?.isOpen ? "blur(5px)" : "none",
          transition: "filter 0.3s ease-in-out",
          pointerEvents: selectedNode?.isOpen ? "none" : "auto",
        }}
      >
        <Box sx={{ mb: 4, display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h4">Tree-View Workloads</Typography>
          <Button variant="contained" onClick={handleDialogOpen}>
            + New App
          </Button>
        </Box>

        <Alert severity={isWsConnected ? "info" : "warning"} sx={{ mb: 4 }}>
          <AlertTitle>{isWsConnected ? "Info" : "Warning"}</AlertTitle>
          {isWsConnected
            ? "Click '+ New App' to deploy your Kubernetes application."
            : "WebSocket disconnected. Reconnecting..."}
        </Alert>

        <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
          {(!responseData || responseData.length === 0) ? (
            <LoadingFallback message={isWsConnected ? "Wds Tree-View is Loading..." : "Waiting for WebSocket connection..."} size="medium" />
          ) : (
            <ReactFlowProvider>
              <FlowWithScroll nodes={nodes} edges={edges} renderStartTime={renderStartTime} />
              <CustomZoomControls />
            </ReactFlowProvider>
          )}

          {contextMenu && (
            <Menu
              open={Boolean(contextMenu)}
              onClose={handleMenuClose}
              anchorReference="anchorPosition"
              anchorPosition={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined}
            >
              <MenuItem onClick={() => handleMenuAction("Details")}>Details</MenuItem>
              <MenuItem onClick={() => handleMenuAction("Delete")}>Delete</MenuItem>
              <MenuItem onClick={() => handleMenuAction("Logs")}>Logs</MenuItem>
            </Menu>
          )}
        </Box>

        <NewAppDialog open={dialogOpen} onClose={handleDialogClose} onDeploy={handleDeploy} loading={loading} />

        <Snackbar
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={handleSnackbarClose}
        >
          <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: "100%" }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>

      <DynamicDetailsPanel
        namespace={selectedNode?.namespace || ""}
        name={selectedNode?.name || ""}
        type={selectedNode?.type || ""}
        resourceData={selectedNode?.resourceData}
        onClose={handleClosePanel}
        isOpen={selectedNode?.isOpen || false}
      />
    </Box>
  );
};

export default memo(TreeView);