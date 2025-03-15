import { useState, useEffect, useCallback } from "react";
import {
  TextField,
  Button,
  Box,
  Alert,
  AlertTitle,
  CircularProgress,
  Typography,
  Snackbar,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import axios, { AxiosError } from "axios";
import ReactFlow, { Background, useReactFlow, BackgroundVariant, Position, MarkerType } from "reactflow";
import { ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";
import deployicon from "../assets/deploy.svg";
import ns from "../assets/ns.svg";
import svc from "../assets/svc.svg";
import rs from "../assets/rs.svg";
import config from "../assets/cm.svg";
import ep from "../assets/ep.svg";
import { ZoomIn, ZoomOut } from "@mui/icons-material";
import { FiMoreVertical } from "react-icons/fi";
import "@fortawesome/fontawesome-free/css/all.min.css";
import LoadingFallback from "./LoadingFallback";
import DynamicDetailsPanel from "./DynamicDetailsPanel";

// Interfaces
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

// CustomZoomControls component (unchanged)
const CustomZoomControls = () => {
  const { getZoom, setViewport } = useReactFlow();
  const [zoomLevel, setZoomLevel] = useState<number>(200);

  useEffect(() => {
    setZoomLevel(Math.round(getZoom() * 200));
  }, [getZoom]);

  const handleZoomIn = () => {
    const newZoom = Math.min(getZoom() + 0.1, 2);
    setViewport({ zoom: newZoom, x: 0, y: 10 });
    setZoomLevel(Math.round(newZoom * 100));
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(getZoom() - 0.1, 0);
    setViewport({ zoom: newZoom, x: 0, y: 10 });
    setZoomLevel(Math.round(newZoom * 100));
  };

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
};

// FlowWithScroll component (unchanged)
const FlowWithScroll = ({ nodes, edges }: { nodes: CustomNode[]; edges: CustomEdge[] }) => {
  const { setViewport, getViewport } = useReactFlow();

  const handleWheel = (event: React.WheelEvent) => {
    const reactFlowContainer = document.querySelector(".react-flow");
    const isInsideTree = reactFlowContainer && reactFlowContainer.contains(event.target as Node);

    if (isInsideTree) {
      const { zoom, x, y } = getViewport();
      const scrollSpeed = 0.5;

      const minY = Math.min(...nodes.map((node) => node.position.y));
      const maxY = Math.max(
        ...nodes.map((node) => {
          const height = node.style?.height;
          return node.position.y + (typeof height === "string" ? parseInt(height) : height || 30);
        })
      );
      const treeHeight = maxY - minY;
      const zoomedTreeHeight = treeHeight * zoom;
      const minScrollY = -zoomedTreeHeight + 10;
      const maxScrollY = 10;

      const newY = y - event.deltaY * scrollSpeed;
      const clampedY = Math.min(Math.max(newY, minScrollY), maxScrollY);

      setViewport({
        x,
        y: clampedY,
        zoom,
      });
    }
  };

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
      panOnDrag={false}
      zoomOnScroll={false}
      zoomOnDoubleClick={false}
      zoomOnPinch={false}
      onInit={(instance) => instance.setViewport({ zoom: 2, x: -0, y: 10 })}
      style={{
        background: "rgb(222, 230, 235)",
        width: "100%",
        minHeight: `${nodes.length * 60}px`,
        height: "auto",
      }}
      onWheel={handleWheel}
    >
      <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
    </ReactFlow>
  );
};

// TreeView component
const TreeView = () => {
  const [formData, setFormData] = useState<{ githuburl: string; path: string }>({ githuburl: "", path: "" });
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

  const transformDataToTree = useCallback((data: NamespaceResource[]) => {
    const nodes: CustomNode[] = [];
    const edges: CustomEdge[] = [];
    const horizontalSpacing = 200;
    const verticalSpacing = 40;
    const additionalTopLevelSpacing = verticalSpacing / 2;
    let globalY = 40;

    const getTimeAgo = (timestamp: string | undefined): string => {
      if (!timestamp) return "Unknown";
      const now = new Date();
      const then = new Date(timestamp);
      const diffMs = now.getTime() - then.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return diffDays === 0 ? "Today" : `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    };

    const addNode = (
      id: string,
      label: string,
      posX: number,
      posY: number,
      parent: string | null = null,
      type: string = "",
      status: string = "Active",
      timestamp?: string,
      namespace?: string,
      resourceData?: ResourceItem
    ) => {
      let icon: string = "";
      let dynamicText: string = "";
      const heartColor: string = status === "Active" ? "rgb(24, 190, 148)" : "#ff0000";

      switch (type.toLowerCase()) {
        case "namespace":
          icon = ns;
          dynamicText = "ns";
          break;
        case "deployment":
          icon = deployicon;
          dynamicText = "deploy";
          break;
        case "service":
          icon = svc;
          dynamicText = "svc";
          break;
        case "replicaset":
          icon = rs;
          dynamicText = "replica";
          break;
        case "container":
          icon = deployicon;
          dynamicText = "container";
          break;
        case "configmap":
          icon = config;
          dynamicText = "config";
          break;
        case "data":
          icon = config;
          dynamicText = "data";
          break;
        case "endpoints":
          icon = ep;
          dynamicText = "endpoint";
          break;
        case "endpointslice":
          icon = ep;
          dynamicText = "slice";
          break;
        case "subset":
          icon = ep;
          dynamicText = "subset";
          break;
        case "serviceaccount":
          icon = config;
          dynamicText = "sa";
          break;
        case "lease":
          icon = config;
          dynamicText = "lease";
          break;
        case "role":
          icon = config;
          dynamicText = "role";
          break;
        case "rolebinding":
          icon = config;
          dynamicText = "rb";
          break;
        case "subject":
          icon = config;
          dynamicText = "subject";
          break;
        case "ruleref":
          icon = config;
          dynamicText = "rule";
          break;
        case "port":
          icon = svc;
          dynamicText = "port";
          break;
        default:
          icon = config;
          dynamicText = type.toLowerCase();
      }

      const timeAgo = getTimeAgo(timestamp);

      nodes.push({
        id,
        data: {
          label: (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              }}
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
                  onClick={(e) => handleMenuOpen(e, id)}
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
          ),
        },
        position: { x: posX, y: posY },
        style: {
          ...nodeStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "2px 12px",
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });

      if (parent) {
        edges.push({
          id: `edge-${parent}-${id}`,
          source: parent,
          target: id,
          type: "step",
          animated: true,
          style: { stroke: "#a3a3a3", strokeDasharray: "2,2" },
          markerEnd: { type: MarkerType.ArrowClosed },
        });
      }
    };

    data.forEach((namespace: NamespaceResource, nsIndex: number) => {
      const namespaceId = `namespace-${namespace.name}`;
      const x = 15;
      let currentY = globalY;
      let minY = Infinity;
      let maxY = -Infinity;

      // Preprocess resources into a typed map
      const resourcesMap: ResourcesMap = {
        endpoints: namespace.resources[".v1/endpoints"] || [],
        endpointSlices: namespace.resources["discovery.k8s.io.v1/endpointslices"] || [],
      };
      Object.entries(namespace.resources).forEach(([key, value]) => {
        if (key !== ".v1/endpoints" && key !== "discovery.k8s.io.v1/endpointslices") {
          resourcesMap[key] = value;
        }
      });

      const resourceHeights: Record<string, number> = {};

      Object.entries(resourcesMap).forEach(([, resourceItems]) => {
        resourceItems.forEach((item: ResourceItem) => {
          const kindLower = item.kind.toLowerCase();
          const resourceId = `${namespaceId}-${kindLower}-${item.metadata.name}`;
          let totalHeight = 0;

          if (kindLower === "configmap" && item.data) {
            const numData = Object.keys(item.data).length;
            totalHeight = numData > 0 ? numData * verticalSpacing : verticalSpacing;
          } else if (kindLower === "service") {
            const numPorts = item.spec?.ports?.length || 0;
            const endpoints = resourcesMap.endpoints.find(
              (ep: ResourceItem) => ep.metadata.name === item.metadata.name
            );
            const numSubsets = endpoints?.subsets?.length || 0;
            const endpointSlices = resourcesMap.endpointSlices.filter(
              (es: ResourceItem) => es.metadata.labels?.["kubernetes.io/service-name"] === item.metadata.name
            );
            const numSlices = endpointSlices.length;

            let totalChildren = numPorts;
            if (endpoints) {
              totalChildren += 1;
              if (numSubsets) {
                totalChildren += numSubsets;
                endpoints.subsets?.forEach((subset) => {
                  const numAddresses = subset.addresses?.length || 0;
                  const numSubsetPorts = subset.ports?.length || 0;
                  totalChildren += numAddresses + numSubsetPorts;
                });
              }
            }
            if (numSlices) {
              endpointSlices.forEach((es) => {
                const numEndpoints = es.endpoints?.length || 0;
                totalChildren += numEndpoints;
                es.endpoints?.forEach((endpoint) => {
                  const numAddresses = endpoint.addresses?.length || 0;
                  const numEsPorts = es.ports?.length || 0;
                  totalChildren += numAddresses + numEsPorts;
                });
              });
            }

            totalHeight = totalChildren > 0 ? totalChildren * verticalSpacing : verticalSpacing;
          } else if (kindLower === "deployment") {
            totalHeight = verticalSpacing;
          } else if (kindLower === "lease" && item.spec) {
            totalHeight = verticalSpacing * 2;
          } else if (kindLower === "rolebinding") {
            const numSubjects = item.subjects?.length || 0;
            totalHeight = (numSubjects + 1) > 0 ? (numSubjects + 1) * verticalSpacing : verticalSpacing;
          } else if (kindLower === "role") {
            totalHeight = item.rules?.length ? item.rules.length * verticalSpacing : verticalSpacing;
          } else {
            totalHeight = verticalSpacing;
          }

          resourceHeights[resourceId] = totalHeight;
          minY = Math.min(minY, currentY);
          maxY = Math.max(maxY, currentY + totalHeight);
          currentY += totalHeight + additionalTopLevelSpacing;
        });
      });

      if (!Object.keys(resourcesMap).length) {
        minY = currentY;
        maxY = currentY;
      }

      const totalChildHeight = maxY - minY;
      const namespaceY = minY + totalChildHeight / 2;
      addNode(namespaceId, namespace.name, x, namespaceY, null, "namespace", namespace.status, "", namespace.name, {
        apiVersion: "v1",
        kind: "Namespace",
        metadata: { 
          name: namespace.name, 
          namespace: namespace.name,
          creationTimestamp: ""
        },
        status: { phase: namespace.status },
      });

      currentY = minY;

      Object.entries(resourcesMap).forEach(([, resourceItems]) => {
        resourceItems.forEach((item: ResourceItem) => {
          const kindLower = item.kind.toLowerCase();
          const resourceId = `${namespaceId}-${kindLower}-${item.metadata.name}`;
          const status = item.status?.conditions?.some((c) => c.type === "Available" && c.status === "True")
            ? "Active"
            : "Inactive";

          const resourceHeight = resourceHeights[resourceId] || verticalSpacing;
          const resourceY = currentY + resourceHeight / 2;
          let nestedY = currentY;

          if (kindLower === "configmap" && item.data) {
            const numData = Object.keys(item.data).length;
            const dataHeight = numData > 1 ? numData * verticalSpacing - verticalSpacing : 0;
            const adjustedY = numData === 1 ? currentY : currentY + dataHeight / 2;
            addNode(resourceId, item.metadata.name, x + horizontalSpacing, adjustedY, namespaceId, kindLower, status, item.metadata.creationTimestamp, namespace.name, item);
            Object.keys(item.data).forEach((key, i) => {
              const dataId = `${resourceId}-data-${key}`;
              const dataY = numData === 1 ? currentY : currentY + i * verticalSpacing;
              addNode(dataId, key, x + horizontalSpacing * 2, dataY, resourceId, "data", status, undefined, namespace.name, item);
            });
          } else if (kindLower === "service") {
            const numPorts = item.spec?.ports?.length || 0;
            const endpoints = resourcesMap.endpoints.find(
              (ep: ResourceItem) => ep.metadata.name === item.metadata.name
            );
            const numSubsets = endpoints?.subsets?.length || 0;
            const endpointSlices = resourcesMap.endpointSlices.filter(
              (es: ResourceItem) => es.metadata.labels?.["kubernetes.io/service-name"] === item.metadata.name
            );
            const numSlices = endpointSlices.length;

            let totalServiceChildren = numPorts;
            if (endpoints) totalServiceChildren += 1;
            if (numSlices) totalServiceChildren += numSlices;

            const adjustedServiceY = totalServiceChildren > 1 ? currentY + ((totalServiceChildren - 1) * verticalSpacing) / 2 : currentY;

            addNode(resourceId, item.metadata.name, x + horizontalSpacing, adjustedServiceY, namespaceId, kindLower, status, item.metadata.creationTimestamp, namespace.name, item);

            item.spec?.ports?.forEach((port) => {
              const portId = `${resourceId}-port-${port.name}`;
              const portY = numPorts === 1 && !endpoints && !numSlices ? adjustedServiceY : nestedY;
              addNode(portId, `${port.name} (${port.port})`, x + horizontalSpacing * 2, portY, resourceId, "port", status, undefined, namespace.name, item);
              nestedY += verticalSpacing;
            });

            if (endpoints) {
              const endpointId = `${resourceId}-endpoints-${endpoints.metadata.name}`;
              const totalEndpointChildren = numSubsets || 0;
              const adjustedEndpointY = totalServiceChildren === 1 ? adjustedServiceY : totalEndpointChildren > 1 ? nestedY + ((totalEndpointChildren - 1) * verticalSpacing) / 2 : nestedY;

              addNode(endpointId, endpoints.metadata.name, x + horizontalSpacing * 2, adjustedEndpointY, resourceId, "endpoints", status, undefined, namespace.name, endpoints);

              endpoints.subsets?.forEach((subset, idx: number) => {
                const subsetId = `${endpointId}-subset-${idx}`;
                const numAddresses = subset.addresses?.length || 0;
                const numSubsetPorts = subset.ports?.length || 0;
                const totalSubsetChildren = numAddresses + numSubsetPorts;
                const adjustedSubsetY = totalEndpointChildren === 1 ? adjustedEndpointY : totalSubsetChildren > 1 ? nestedY + ((totalSubsetChildren - 1) * verticalSpacing) / 2 : nestedY;

                addNode(subsetId, `Subset ${idx + 1}`, x + horizontalSpacing * 3, adjustedSubsetY, endpointId, "subset", status, undefined, namespace.name, endpoints);

                subset.addresses?.forEach((addr) => {
                  const addrId = `${subsetId}-addr-${addr.ip}`;
                  const addrY = totalSubsetChildren === 1 ? adjustedSubsetY : nestedY;
                  addNode(addrId, addr.ip, x + horizontalSpacing * 4, addrY, subsetId, "data", status, undefined, namespace.name, endpoints);
                  nestedY += verticalSpacing;
                });

                subset.ports?.forEach((port) => {
                  const portId = `${subsetId}-port-${port.name}`;
                  const portY = totalSubsetChildren === 1 && !subset.addresses?.length ? adjustedSubsetY : nestedY;
                  addNode(portId, `${port.name} (${port.port})`, x + horizontalSpacing * 4, portY, subsetId, "port", status, undefined, namespace.name, endpoints);
                  nestedY += verticalSpacing;
                });
              });

              if (totalEndpointChildren > 0) {
                nestedY += totalEndpointChildren * verticalSpacing;
              } else {
                nestedY += verticalSpacing;
              }
            }

            endpointSlices.forEach((es) => {
              const esId = `${resourceId}-endpointslice-${es.metadata.name}`;
              const numEndpoints = es.endpoints?.length || 0;
              const totalEsChildren = numEndpoints;
              const adjustedEsY = totalServiceChildren === 1 ? adjustedServiceY : totalEsChildren > 1 ? nestedY + ((totalEsChildren - 1) * verticalSpacing) / 2 : nestedY;

              addNode(esId, es.metadata.name, x + horizontalSpacing * 2, adjustedEsY, resourceId, "endpointslice", status, undefined, namespace.name, es);

              es.endpoints?.forEach((endpoint, idx: number) => {
                const endpointId = `${esId}-endpoint-${idx}`;
                const numAddresses = endpoint.addresses?.length || 0;
                const numEsPorts = es.ports?.length || 0;
                const totalEndpointChildren = numAddresses + numEsPorts;
                const adjustedEndpointY = totalEsChildren === 1 ? adjustedEsY : totalEndpointChildren > 1 ? nestedY + ((totalEndpointChildren - 1) * verticalSpacing) / 2 : nestedY;

                addNode(endpointId, `Endpoint ${idx + 1}`, x + horizontalSpacing * 3, adjustedEndpointY, esId, "data", status, undefined, namespace.name, es);

                endpoint.addresses?.forEach((addr: string) => {
                  const addrId = `${endpointId}-addr-${addr}`;
                  const addrY = totalEndpointChildren === 1 ? adjustedEndpointY : nestedY;
                  addNode(addrId, addr, x + horizontalSpacing * 4, addrY, endpointId, "data", status, undefined, namespace.name, es);
                  nestedY += verticalSpacing;
                });

                es.ports?.forEach((port) => {
                  const portId = `${endpointId}-port-${port.name}`;
                  const portY = totalEndpointChildren === 1 && !endpoint.addresses?.length ? adjustedEndpointY : nestedY;
                  addNode(portId, `${port.name} (${port.port})`, x + horizontalSpacing * 4, portY, endpointId, "port", status, undefined, namespace.name, es);
                  nestedY += verticalSpacing;
                });
              });

              if (totalEsChildren > 0) {
                nestedY += totalEsChildren * verticalSpacing;
              } else {
                nestedY += verticalSpacing;
              }
            });
          } else if (kindLower === "deployment") {
            addNode(resourceId, item.metadata.name, x + horizontalSpacing, resourceY, namespaceId, kindLower, status, item.metadata.creationTimestamp, namespace.name, item);
            const replicasetId = `${resourceId}-replicaset`;
            addNode(replicasetId, `replicaset-${item.metadata.name}`, x + horizontalSpacing * 2, resourceY, resourceId, "replicaset", status, undefined, namespace.name, item);
          } else if (kindLower === "lease" && item.spec) {
            addNode(resourceId, item.metadata.name, x + horizontalSpacing, resourceY, namespaceId, kindLower, status, item.metadata.creationTimestamp, namespace.name, item);
            const holderId = `${resourceId}-holder`;
            addNode(holderId, item.spec.holderIdentity || "Unknown Holder", x + horizontalSpacing * 2, nestedY, resourceId, "data", status, undefined, namespace.name, item);
          } else if (kindLower === "rolebinding") {
            addNode(resourceId, item.metadata.name, x + horizontalSpacing, resourceY, namespaceId, kindLower, status, item.metadata.creationTimestamp, namespace.name, item);

            item.subjects?.forEach((subject, idx: number) => {
              const subjectId = `${resourceId}-subject-${idx}`;
              addNode(subjectId, subject.name, x + horizontalSpacing * 2, nestedY, resourceId, "subject", status, undefined, namespace.name, item);
              nestedY += verticalSpacing;
            });
            const roleRefId = `${resourceId}-roleref`;
            addNode(roleRefId, item.roleRef?.name || "Unknown Role", x + horizontalSpacing * 2, nestedY, resourceId, "ruleref", status, undefined, namespace.name, item);
          } else if (kindLower === "role") {
            addNode(resourceId, item.metadata.name, x + horizontalSpacing, resourceY, namespaceId, kindLower, status, item.metadata.creationTimestamp, namespace.name, item);

            item.rules?.forEach((rule, idx: number) => {
              const ruleId = `${resourceId}-rule-${idx}`;
              const ruleLabel = `${rule.verbs?.join("/") || ""} ${rule.resources?.join(",") || "all"}`;
              addNode(ruleId, ruleLabel, x + horizontalSpacing * 2, nestedY, resourceId, "ruleref", status, undefined, namespace.name, item);
              nestedY += verticalSpacing;
            });
          } else {
            addNode(resourceId, item.metadata.name, x + horizontalSpacing, resourceY, namespaceId, kindLower, status, item.metadata.creationTimestamp, namespace.name, item);
          }

          currentY += resourceHeight + additionalTopLevelSpacing;
        });
      });

      globalY = currentY + verticalSpacing * (nsIndex + 1);
    });

    setNodes(nodes);
    setEdges(edges);

    const totalHeight = globalY + 50;
    const reactFlowContainer = document.querySelector(".react-flow") as HTMLElement | null;
    if (reactFlowContainer) {
      reactFlowContainer.style.height = `${totalHeight}px`;
    }
  }, []);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4000/ws/namespaces");

    ws.onmessage = (event) => {
      const data: NamespaceResource[] = JSON.parse(event.data);
      const filteredData = data.filter(
        (namespace) =>
          namespace.name !== "kubestellar-report" &&
          namespace.name !== "kube-node-lease" &&
          namespace.name !== "kube-public" &&
          namespace.name !== "default" &&
          namespace.name !== "kube-system"
      );
      console.log("WebSocket data received:", filteredData);
      setResponseData(filteredData);
      transformDataToTree(filteredData);
    };

    ws.onerror = () => {
      console.log("WebSocket error occurred");
      setResponseData([]);
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      if (!responseData) setResponseData([]);
    };

    return () => {
      ws.close();
    };
  }, [transformDataToTree]);

  const handleDeploy = async () => {
    if (!formData.githuburl || !formData.path) {
      setSnackbarMessage("Please fill both GitHub URL and Path fields!");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post("http://localhost:4000/api/deploy", {
        repo_url: formData.githuburl,
        folder_path: formData.path,
      });

      console.log("Deploy response:", response);

      if (response.status === 200) {
        setSnackbarMessage("Deployed successfully!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);

        if (Array.isArray(response.data)) {
          setResponseData(response.data);
          transformDataToTree(response.data);
        } else {
          console.warn("Unexpected data format:", response.data);
          setResponseData([]);
        }
      } else {
        throw new Error("Unexpected response status: " + response.status);
      }
    } catch (error: unknown) {
      const err = error as AxiosError;
      console.error("Deploy error:", err);

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
      setFormData({ githuburl: "", path: "" });
    }
  };

  const handleMenuOpen = (event: React.MouseEvent, nodeId: string) => {
    event.preventDefault();
    setContextMenu({
      nodeId,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleMenuClose = () => {
    setContextMenu(null);
  };

  const handleMenuAction = (action: string) => {
    if (contextMenu?.nodeId) {
      const node = nodes.find((n) => n.id === contextMenu.nodeId);
      if (node) {
        switch (action) {
          case "Details":
            console.log(`Showing details for node ${node.id}`);
            break;
          case "Sync":
            console.log(`Syncing node ${node.id}`);
            break;
          case "Delete":
            console.log(`Deleting node ${node.id}`);
            setNodes(nodes.filter((n) => n.id !== node.id));
            setEdges(edges.filter((e) => e.source !== node.id && e.target !== node.id));
            break;
          case "Logs":
            console.log(`Showing logs for node ${node.id}`);
            break;
          case "Restart":
            console.log(`Restarting node ${node.id}`);
            break;
          case "Resume":
            console.log(`Resuming node ${node.id}`);
            break;
          default:
            break;
        }
      }
    }
    handleMenuClose();
  };

  const handleSnackbarClose = () => {
    console.log("Snackbar Closing");
    setSnackbarOpen(false);
  };

  const handleDialogOpen = () => {
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setFormData({ githuburl: "", path: "" });
  };

  const handleClosePanel = () => {
    if (selectedNode) {
      setSelectedNode({ ...selectedNode, isOpen: false });
      setTimeout(() => setSelectedNode(null), 400); // Match transition duration
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        width: "100%",
        position: "relative",
      }}
    >
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
          <Typography variant="h4">Tree View Deployment</Typography>
          <Button variant="contained" onClick={handleDialogOpen}>
            + New App
          </Button>
        </Box>

        <Alert severity="info" sx={{ mb: 4 }}>
          <AlertTitle>Info</AlertTitle>
          Click "+ New App" to deploy your Kubernetes application.
        </Alert>

        <Box mt={3} style={{ width: "82vw", position: "relative" }}>
          {(!responseData || responseData.length === 0) ? (
            <LoadingFallback message="Wds Tree-View is Loading..." size="medium" />
          ) : (
            <ReactFlowProvider>
              <FlowWithScroll nodes={nodes} edges={edges} />
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
              <MenuItem onClick={() => handleMenuAction("Sync")}>Sync</MenuItem>
              <MenuItem onClick={() => handleMenuAction("Delete")}>Delete</MenuItem>
              <MenuItem onClick={() => handleMenuAction("Logs")}>Logs</MenuItem>
              <MenuItem onClick={() => handleMenuAction("Restart")}>Restart</MenuItem>
              <MenuItem onClick={() => handleMenuAction("Resume")}>Resume</MenuItem>
            </Menu>
          )}
        </Box>

        <Dialog
          open={dialogOpen}
          onClose={handleDialogClose}
          sx={{
            "& .MuiDialog-paper": {
              position: "fixed",
              right: 0,
              top: 0,
              bottom: 0,
              margin: 0,
              maxWidth: "1200px",
              width: "100%",
              height: "100%",
              borderRadius: 0,
            },
          }}
        >
          <DialogTitle>Create New App</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="GitHub URL"
              value={formData.githuburl}
              onChange={(e) => setFormData((prev) => ({ ...prev, githuburl: e.target.value }))}
              sx={{ mt: 2, mb: 2 }}
            />
            <TextField
              fullWidth
              label="Path"
              value={formData.path}
              onChange={(e) => setFormData((prev) => ({ ...prev, path: e.target.value }))}
              sx={{ mb: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose} color="secondary">
              Cancel
            </Button>
            <Button variant="contained" onClick={handleDeploy} disabled={loading}>
              {loading ? <CircularProgress size={24} /> : "Deploy"}
            </Button>
          </DialogActions>
        </Dialog>

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

export default TreeView;