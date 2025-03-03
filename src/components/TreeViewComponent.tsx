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
import pod from "../assets/pod.svg";
import config from "../assets/cm.svg";
import ep from "../assets/ep.svg";
import { ZoomIn, ZoomOut } from "@mui/icons-material";
import { FiMoreVertical } from "react-icons/fi";
import "@fortawesome/fontawesome-free/css/all.min.css";
import LoadingFallback from "./LoadingFallback";

// Define interfaces (unchanged)
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

interface Namespace {
  name: string;
  status?: string;
  deployments?: Deployment[];
  services?: Service[];
  configmaps?: ConfigMap[];
}

interface Deployment {
  metadata: { name: string; creationTimestamp?: string };
  spec: { replicas: number };
  status?: string;
}

interface Service {
  metadata: { name: string; creationTimestamp?: string };
  spec?: { clusterIP?: string };
  status?: { loadBalancer?: { ingress?: { hostname?: string; ip?: string }[] } } & { status?: string };
}

interface ConfigMap {
  metadata: { name: string; creationTimestamp?: string };
}

const nodeStyle: React.CSSProperties = {
  padding: "2px 12px",
  fontSize: "6px",
  border: "none",
  width: "146px",
  height: "30px",
};

// CustomZoomControls and FlowWithScroll components remain unchanged
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

const FlowWithScroll = ({ nodes, edges }: { nodes: CustomNode[]; edges: CustomEdge[] }) => {
  const { setViewport, getViewport } = useReactFlow();

  const handleWheel = (event: React.WheelEvent) => {
    const reactFlowContainer = document.querySelector('.react-flow');
    const isInsideTree = reactFlowContainer && reactFlowContainer.contains(event.target as Node);

    if (isInsideTree) {
      event.preventDefault();
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

const TreeView = () => {
  const [formData, setFormData] = useState<{ githuburl: string; path: string }>({ githuburl: "", path: "" });
  const [loading, setLoading] = useState<boolean>(false);
  const [responseData, setResponseData] = useState<Namespace[] | null>(null);
  const [nodes, setNodes] = useState<CustomNode[]>([]);
  const [edges, setEdges] = useState<CustomEdge[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");
  const [contextMenu, setContextMenu] = useState<{ nodeId: string | null; x: number; y: number } | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false); // New state for dialog

  const transformDataToTree = useCallback((data: Namespace[]) => {
    const nodes: CustomNode[] = [];
    const edges: CustomEdge[] = [];
    const horizontalSpacing = 200;
    const verticalSpacing = 40;
    const additionalTopLevelSpacing = verticalSpacing / 2;
    const podVerticalSpacing = verticalSpacing + additionalTopLevelSpacing;
  
    let globalY = 40;
  
    const getDaysAgo = (creationTimestamp: string | undefined): string => {
      if (!creationTimestamp) return "";
      const currentDate = new Date("2025-02-25");
      const createdDate = new Date(creationTimestamp);
      const diffMs = currentDate.getTime() - createdDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? `${diffDays} days` : "Today";
    };
  
    const addNode = (
      id: string,
      label: string,
      posX: number,
      posY: number,
      parent: string | null = null,
      type: string = "",
      collapsed: boolean = false,
      parentDeploymentStatus?: string
    ) => {
      let icon: string = "";
      let dynamicText: string = "";
      let heartColor: string = "rgb(24, 190, 148)";
  
      if (type === "namespace" && parent === null) {
        if (!data.find((ns) => ns.name === label)?.status || data.find((ns) => ns.name === label)?.status !== "Active") {
          heartColor = "#ff0000";
        }
      } else if (type === "deployment") {
        const deployment = data.flatMap((ns) => ns.deployments || []).find((dep) => dep.metadata.name === label);
        if (!deployment?.status || deployment.status !== "Active") {
          heartColor = "#ff0000";
        }
      } else if (type === "service") {
        const service = data.flatMap((ns) => ns.services || []).find((svc) => svc.metadata.name === label);
        if (label === "kubernetes") {
          if (service?.spec?.clusterIP || (service?.status?.loadBalancer?.ingress && service.status.loadBalancer.ingress.length > 0)) {
            heartColor = "rgb(24, 190, 148)";
          } else {
            heartColor = "#ff0000";
          }
        } else if (!service?.status?.status || service.status.status !== "Active") {
          if (!service?.status?.loadBalancer?.ingress || service.status.loadBalancer.ingress.length === 0) {
            heartColor = "#ff0000";
          }
        }
      } else if (type === "replicaset" || type === "pod") {
        if (parentDeploymentStatus && parentDeploymentStatus !== "Active") {
          heartColor = "#ff0000";
        }
      } else if (type === "endpoint") {
        const service = data.flatMap((ns) => ns.services || []).find((svc) => svc.metadata.name === parent?.replace("service-", ""));
        if (!service?.status?.status || service.status.status !== "Active") {
          heartColor = "#ff0000";
        }
      }
  
      if (type === "namespace") {
        icon = ns;
        dynamicText = "ns";
      } else if (type === "service") {
        icon = svc;
        dynamicText = "svc";
      } else if (type === "deployment") {
        icon = deployicon;
        dynamicText = "deploy";
      } else if (type === "replicaset") {
        icon = rs;
        dynamicText = "replica";
      } else if (type === "pod") {
        icon = pod;
        dynamicText = "pod";
      } else if (type === "config") {
        icon = config;
        dynamicText = "config";
      } else if (type === "endpoint") {
        icon = ep;
        dynamicText = "endpoint";
      }
  
      const iconSrc = icon || "";
  
      let creationTimestamp: string | undefined = "";
      if (type === "namespace") {
        const ns = data.find((ns) => ns.name === label);
        creationTimestamp = ns?.name === "default" ? "2025-02-21T14:23:27Z" : ns?.status ? new Date().toISOString() : undefined;
      } else if (type === "deployment") {
        const deployment = data.flatMap((ns) => ns.deployments || []).find((dep) => dep.metadata.name === label);
        creationTimestamp = deployment?.metadata.creationTimestamp || new Date().toISOString();
      } else if (type === "service") {
        const service = data.flatMap((ns) => ns.services || []).find((svc) => svc.metadata.name === label);
        creationTimestamp = service?.metadata.creationTimestamp || new Date().toISOString();
      } else if (type === "config") {
        const config = data.flatMap((ns) => ns.configmaps || []).find((cm) => cm.metadata.name === label);
        creationTimestamp = config?.metadata.creationTimestamp || new Date().toISOString();
      } else if (type === "replicaset" || type === "pod") {
        const deployment = data.flatMap((ns) => ns.deployments || []).find((dep) => dep.metadata.name === parent?.replace("deployment-", ""));
        creationTimestamp = deployment?.metadata.creationTimestamp || new Date().toISOString();
      } else if (type === "endpoint") {
        const service = data.flatMap((ns) => ns.services || []).find((svc) => svc.metadata.name === parent?.replace("service-", ""));
        creationTimestamp = service?.metadata.creationTimestamp || new Date().toISOString();
      }
  
      const timeAgo = getDaysAgo(creationTimestamp);
  
      nodes.push({
        id,
        data: {
          label: (
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "-5px" }}>
                <div>
                  <img src={iconSrc} alt={label} width="18" height="18" />
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
        collapsed,
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
  
    data.forEach((namespace: Namespace, nsIndex: number) => {
      const namespaceId = `namespace-${namespace.name}`;
      const x = 15;
  
      let currentY = globalY;
      let minY = Infinity;
      let maxY = -Infinity;
  
      // Calculate vertical space for deployments
      if (namespace.deployments?.length) {
        namespace.deployments.forEach((deployment: Deployment) => {
          const numPods = deployment.spec.replicas;
          const podHeight = numPods > 1 ? (numPods * podVerticalSpacing) - podVerticalSpacing : 0;
          const deploymentY = numPods === 1 ? currentY : currentY + (podHeight / 2);
          minY = Math.min(minY, numPods === 1 ? deploymentY : deploymentY - (podHeight / 2));
          maxY = Math.max(maxY, numPods === 1 ? deploymentY + verticalSpacing : deploymentY + (podHeight / 2));
          currentY = numPods === 1 ? deploymentY + verticalSpacing : deploymentY + (podHeight / 2) + verticalSpacing;
          currentY += additionalTopLevelSpacing;
        });
      }
  
      // Calculate vertical space for services
      if (namespace.services?.length) {
        namespace.services.forEach((service: Service) => {
          const numEndpoints = service.status?.loadBalancer?.ingress?.length || 0;
          const endpointHeight = numEndpoints > 1 ? (numEndpoints * verticalSpacing) - verticalSpacing : 0;
          const serviceY = numEndpoints === 1 ? currentY : currentY + (endpointHeight / 2);
          minY = Math.min(minY, numEndpoints === 1 ? serviceY : serviceY - (endpointHeight / 2));
          maxY = Math.max(maxY, numEndpoints === 1 ? serviceY + verticalSpacing : serviceY + (endpointHeight / 2));
          currentY = numEndpoints === 1 ? serviceY + verticalSpacing : serviceY + (endpointHeight / 2) + verticalSpacing;
          currentY += additionalTopLevelSpacing;
        });
      }
  
      // Calculate vertical space for configmaps
      if (namespace.configmaps?.length) {
        const numConfigs = namespace.configmaps.length;
        const configHeight = numConfigs > 1 ? (numConfigs * verticalSpacing) - verticalSpacing : 0;
        const configStartY = currentY + (configHeight / 2);
        minY = Math.min(minY, currentY);
        maxY = Math.max(maxY, configStartY + (configHeight / 2));
        currentY = configStartY + (configHeight / 2) + verticalSpacing;
        currentY += additionalTopLevelSpacing;
      }
  
      if (!namespace.deployments?.length && !namespace.services?.length && !namespace.configmaps?.length) {
        minY = currentY;
        maxY = currentY;
      }
  
      const totalChildHeight = maxY - minY;
      const namespaceY = minY + (totalChildHeight / 2);
      addNode(namespaceId, namespace.name, x, namespaceY, null, "namespace", false);
  
      currentY = namespaceY - (totalChildHeight / 2);
  
      // Add deployments and replicasets
      if (namespace.deployments?.length) {
        namespace.deployments.forEach((deployment: Deployment) => {
          const deploymentId = `deployment-${deployment.metadata.name}`;
          const numPods = deployment.spec.replicas;
          const podHeight = numPods > 1 ? (numPods * podVerticalSpacing) - podVerticalSpacing : 0;
          const deploymentY = numPods === 1 ? currentY : currentY + (podHeight / 2);
          addNode(deploymentId, deployment.metadata.name, x + horizontalSpacing, deploymentY, namespaceId, "deployment", false, deployment.status);
  
          // Add replicaset as child of deployment
          if (deployment.spec.replicas > 0) {
            const replicasetId = `replicaset-${deployment.metadata.name}`;
            addNode(replicasetId, "replica", x + horizontalSpacing * 2, deploymentY, deploymentId, "replicaset", false, deployment.status);
          }
  
          currentY = numPods === 1 ? deploymentY + verticalSpacing : deploymentY + (podHeight / 2) + verticalSpacing;
          currentY += additionalTopLevelSpacing;
        });
      }
  
      // Add services and endpoints
      if (namespace.services?.length) {
        namespace.services.forEach((service: Service) => {
          const serviceId = `service-${service.metadata.name}`;
          const numEndpoints = service.status?.loadBalancer?.ingress?.length || 0;
          const endpointHeight = numEndpoints > 1 ? (numEndpoints * verticalSpacing) - verticalSpacing : 0;
          const serviceY = numEndpoints === 1 ? currentY : currentY + (endpointHeight / 2);
          addNode(serviceId, service.metadata.name, x + horizontalSpacing, serviceY, namespaceId, "service", false);
  
          // Add endpoints as children of service
          if (service.status?.loadBalancer?.ingress) {
            service.status.loadBalancer.ingress.forEach((endpoint, j: number) => {
              const endpointId = `endpoint-${service.metadata.name}-${j}`;
              const endpointY = numEndpoints === 1 ? serviceY : serviceY + (j * verticalSpacing) - (endpointHeight / 2);
              addNode(endpointId, endpoint.hostname || endpoint.ip || "Endpoint", x + horizontalSpacing * 2, endpointY, serviceId, "endpoint", false);
            });
          }
  
          currentY = numEndpoints === 1 ? serviceY + verticalSpacing : serviceY + (endpointHeight / 2) + verticalSpacing;
          currentY += additionalTopLevelSpacing;
        });
      }
  
      // Add configmaps (including specific 'config-kuberoot-ca.crt' if present)
      if (namespace.configmaps?.length) {
        const configParentId = `configs-parent-${namespace.name}`;
        const numConfigs = namespace.configmaps.length;
        const configHeight = numConfigs > 1 ? (numConfigs * verticalSpacing) - verticalSpacing : 0;
        const configParentY = currentY + (configHeight / 2);
        addNode(configParentId, "Configs", x + horizontalSpacing, configParentY, namespaceId, "config", false);
  
        namespace.configmaps.forEach((config: ConfigMap, i: number) => {
          const configId = `config-${config.metadata.name}`;
          const configY = numConfigs === 1 ? configParentY : configParentY + (i * verticalSpacing) - (configHeight / 2);
          addNode(configId, config.metadata.name, x + horizontalSpacing * 2, configY, configParentId, "config", false);
        });
  
        currentY = configParentY + (configHeight / 2) + verticalSpacing;
        currentY += additionalTopLevelSpacing;
      }
  
      globalY = currentY + verticalSpacing * (nsIndex + 1); // Ensure each namespace starts fresh
    });
  
    setNodes(nodes);
    setEdges(edges);
  
    const totalHeight = globalY + 50;
    const reactFlowContainer = document.querySelector('.react-flow') as HTMLElement | null;
    if (reactFlowContainer) {
      reactFlowContainer.style.height = `${totalHeight}px`;
    }
  }, []);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4000/ws/namespaces");

    ws.onmessage = (event) => {
      const data: Namespace[] = JSON.parse(event.data);
      const filteredData = data.filter(
        (namespace) =>
          namespace.name !== "kubestellar-report" &&
          namespace.name !== "kube-node-lease" &&
          namespace.name !== "kube-public" &&
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
      setDialogOpen(false); // Close dialog after deploy attempt
      setFormData({ githuburl: "", path: "" }); // Reset form data
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
    setFormData({ githuburl: "", path: "" }); // Reset form data on close
  };

  return (
    <Box>
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
            anchorPosition={
              contextMenu
                ? { top: contextMenu.y, left: contextMenu.x }
                : undefined
            }
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
          <Button
            variant="contained"
            onClick={handleDeploy}
            disabled={loading}
          >
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
  );
};

export default TreeView;