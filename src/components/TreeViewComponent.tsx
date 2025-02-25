import { useState, useEffect } from "react";
import { TextField, Button, Box, Alert, AlertTitle, CircularProgress, Typography, Snackbar, Menu, MenuItem } from "@mui/material";
import axios from "axios";
import ReactFlow, { Background, useReactFlow, BackgroundVariant, Position, Node as RFNode, Edge as RFEdge, MarkerType } from "reactflow";
import { ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";
import deployicon from "../assets/deploy.svg";
import ns from "../assets/ns.svg";
import svc from "../assets/svc.svg";
import { ZoomIn, ZoomOut } from "@mui/icons-material";
import { FiMoreVertical } from "react-icons/fi";
import "@fortawesome/fontawesome-free/css/all.min.css";

// Define NodeData interface
interface NodeData {
  label: JSX.Element;
}

// Define custom Node type extending reactflow's Node
interface CustomNode extends RFNode<NodeData> {
  sourcePosition?: Position;
  targetPosition?: Position;
  collapsed?: boolean;
  showMenu?: boolean; // Add this to track if the menu is open for this node
}

// Define custom Edge type extending reactflow's Edge
interface CustomEdge extends RFEdge {
  id: string; // Required property
  source: string; // Required property
  target: string; // Required property
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
  status?: string; // Add status field (e.g., "Active" or other statuses)
  deployments?: Deployment[];
  services?: Service[];
  configmaps?: ConfigMap[];
}

interface Deployment {
  metadata: { name: string; creationTimestamp?: string }; // Add creationTimestamp
  spec: { replicas: number };
  status?: string; // Add status field (e.g., "Active" or other statuses)
}

interface Service {
  metadata: { name: string; creationTimestamp?: string }; // Add creationTimestamp
  status?: { loadBalancer?: { ingress?: { hostname?: string; ip?: string }[] } } & { status?: string }; // Add status field
}

interface ConfigMap {
  metadata: { name: string; creationTimestamp?: string }; // Add creationTimestamp
}

const nodeStyle: React.CSSProperties = {
  padding: "2px 12px",
  fontSize: "6px",
  border: "none",
  width: "135px",
};

const CustomZoomControls = () => {
  const { zoomIn, zoomOut, getZoom, setViewport } = useReactFlow();
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

const TreeView = () => {
  const [formData, setFormData] = useState<{ githuburl: string; path: string }>({ githuburl: "", path: "" });
  const [loading, setLoading] = useState<boolean>(false);
  const [responseData, setResponseData] = useState<Namespace[] | null>(null);
  const [error, setError] = useState<string>("");
  const [nodes, setNodes] = useState<CustomNode[]>([]);
  const [edges, setEdges] = useState<CustomEdge[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");
  const [contextMenu, setContextMenu] = useState<{ nodeId: string | null; x: number; y: number } | null>(null); // Track which node’s menu is open and its position

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:4000/ws/namespaces");

    ws.onmessage = (event) => {
      const data: Namespace[] = JSON.parse(event.data);

      // Filter out unwanted namespaces
      const filteredData = data.filter(
        (namespace) =>
          namespace.name !== "kubestellar-report" &&
          namespace.name !== "kube-node-lease" &&
          namespace.name !== "kube-public" &&
          namespace.name !== "kube-system"
      );
      console.log("connection correct");
      setResponseData(filteredData);
      transformDataToTree(filteredData);
    };

    ws.onerror = (error) => {
      setError("WebSocket error. Please check the connection.");
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed.");
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleDeploy = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axios.post("http://localhost:4000/api/deploy", {
        repo_url: formData.githuburl,
        folder_path: formData.path,
      });

      setResponseData(response.data);
      transformDataToTree(response.data);
      setSnackbarMessage("Deployment successful!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (err) {
      setSnackbarMessage("Deployment failed!");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
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
        // Handle the action based on the node type and action
        switch (action) {
          case "Details":
            console.log(`Showing details for node ${node.id}`);
            // Add logic to fetch or display details
            break;
          case "Sync":
            console.log(`Syncing node ${node.id}`);
            // Add sync logic
            break;
          case "Delete":
            console.log(`Deleting node ${node.id}`);
            // Add delete logic (e.g., filter out the node and update nodes/edges)
            setNodes(nodes.filter((n) => n.id !== node.id));
            setEdges(edges.filter((e) => e.source !== node.id && e.target !== node.id));
            break;
          case "Logs":
            console.log(`Showing logs for node ${node.id}`);
            // Add logs logic
            break;
          case "Restart":
            console.log(`Restarting node ${node.id}`);
            // Add restart logic
            break;
          case "Resume":
            console.log(`Resuming node ${node.id}`);
            // Add resume logic
            break;
          default:
            break;
        }
      }
    }
    handleMenuClose();
  };

  const transformDataToTree = (data: Namespace[]) => {
    const nodes: CustomNode[] = [];
    const edges: CustomEdge[] = [];
    const horizontalSpacing = 200; // Horizontal spacing between levels
    const verticalSpacing = 30; // Default vertical spacing between nodes
    const additionalTopLevelSpacing = verticalSpacing / 2; // Additional spacing (15px) for deploy, svc, config
    const podVerticalSpacing = verticalSpacing + additionalTopLevelSpacing; // Pod spacing matches top-level (45px)
  
    let globalY = 50; // Starting y position for the entire tree
  
    const getDaysAgo = (creationTimestamp: string | undefined): string => {
      if (!creationTimestamp) return "";
      const currentDate = new Date("2025-02-25"); // Current date as February 25, 2025
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
      let heartColor: string = "rgb(24, 190, 148)"; // Default green heart for healthy (Active) status
  
      // Status and heart color logic remains unchanged
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
        icon = deployicon;
        dynamicText = "replica";
      } else if (type === "pod") {
        icon = deployicon;
        dynamicText = "pod";
      } else if (type === "config") {
        icon = deployicon;
        dynamicText = "config";
      }
  
      const iconSrc = icon || "";
  
      // Determine creation timestamp based on node type
      let creationTimestamp: string | undefined = "";
      if (type === "namespace") {
        const ns = data.find((ns) => ns.name === label);
        creationTimestamp = ns?.name === "default" ? "2025-02-21T14:23:27Z" : undefined; // Example for default namespace
      } else if (type === "deployment") {
        const deployment = data.flatMap((ns) => ns.deployments || []).find((dep) => dep.metadata.name === label);
        creationTimestamp = deployment?.metadata.creationTimestamp;
      } else if (type === "service") {
        const service = data.flatMap((ns) => ns.services || []).find((svc) => svc.metadata.name === label);
        creationTimestamp = service?.metadata.creationTimestamp;
      } else if (type === "config") {
        const config = data.flatMap((ns) => ns.configmaps || []).find((cm) => cm.metadata.name === label);
        creationTimestamp = config?.metadata.creationTimestamp;
      }

      const timeAgo = getDaysAgo(creationTimestamp);

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
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "-5px" }}>
                <div>
                  <img src={iconSrc} alt={label} width="15" height="15" />
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
                {timeAgo && <span style={{ fontSize: "8px", color: "#666" }}>{timeAgo}</span>}
                <FiMoreVertical
                  style={{ fontSize: "11px", color: "#34aadc", marginRight: "-10px", cursor: "pointer" }}
                  onClick={(e) => handleMenuOpen(e, id)}
                />
              </div>
            </div>
          ),
        },
        position: { x: posX, y: posY },
        style: {
          ...nodeStyle,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
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
  
    data.forEach((namespace: Namespace, namespaceIndex: number) => {
      const namespaceId = `namespace-${namespace.name}`;
      let x = 30;
  
      // Calculate total vertical span for namespace centering
      let simulatedY = globalY; // Start at globalY to match rendering
      let minY = Infinity; // Top-most position
      let maxY = -Infinity; // Bottom-most position

      // Deployments (ns -> deploy -> replica -> pods)
      if (namespace.deployments?.length) {
        namespace.deployments.forEach((deployment: Deployment, i: number) => {
          const numPods = deployment.spec.replicas;
          const podHeight = numPods > 1 ? (numPods * podVerticalSpacing) - podVerticalSpacing : 0;
          const deploymentY = numPods === 1 ? simulatedY : simulatedY + (podHeight / 2);

          // Update minY and maxY for deployment subtree
          if (numPods > 1) {
            const topPodY = deploymentY - (podHeight / 2); // Top-most pod
            const bottomPodY = deploymentY + (podHeight / 2); // Bottom-most pod
            minY = Math.min(minY, topPodY);
            maxY = Math.max(maxY, bottomPodY);
          } else {
            minY = Math.min(minY, deploymentY);
            maxY = Math.max(maxY, deploymentY + verticalSpacing); // Include single pod/no pod height
          }

          // Update simulatedY for next node
          simulatedY = numPods === 1 ? deploymentY + verticalSpacing : deploymentY + (podHeight / 2) + verticalSpacing;
          if (i < namespace.deployments.length - 1 || namespace.services?.length || namespace.configmaps?.length) {
            simulatedY += additionalTopLevelSpacing; // Add 15px for 45px total spacing
          }
        });
      }

      // Services (ns -> svc -> endpoints)
      if (namespace.services?.length) {
        namespace.services.forEach((service: Service, i: number) => {
          const numEndpoints = service.status?.loadBalancer?.ingress?.length || 0;
          const endpointHeight = numEndpoints > 1 ? (numEndpoints * verticalSpacing) - verticalSpacing : 0;
          const serviceY = numEndpoints === 1 ? simulatedY : simulatedY + (endpointHeight / 2);

          // Update minY and maxY for service subtree
          if (numEndpoints > 1) {
            const topEndpointY = serviceY - (endpointHeight / 2); // Top-most endpoint
            const bottomEndpointY = serviceY + (endpointHeight / 2); // Bottom-most endpoint
            minY = Math.min(minY, topEndpointY);
            maxY = Math.max(maxY, bottomEndpointY);
          } else {
            minY = Math.min(minY, serviceY);
            maxY = Math.max(maxY, serviceY + verticalSpacing); // Include single/no endpoint height
          }

          // Update simulatedY for next node
          simulatedY = numEndpoints === 1 ? serviceY + verticalSpacing : serviceY + (endpointHeight / 2) + verticalSpacing;
          if (i < namespace.services.length - 1 || namespace.configmaps?.length) {
            simulatedY += additionalTopLevelSpacing; // Add 15px for 45px total spacing
          }
        });
      }

      // ConfigMaps (ns -> config -> certificates/child nodes)
      if (namespace.configmaps?.length) {
        const configParentY = simulatedY;
        const numConfigs = namespace.configmaps.length;
        const configHeight = (numConfigs * verticalSpacing) - verticalSpacing;
        const configStartY = configParentY + verticalSpacing + (configHeight / 2);

        // Update minY and maxY for config subtree
        const topConfigY = configParentY; // Config parent is the top-most node
        const bottomConfigY = configStartY + (configHeight / 2); // Bottom-most config child
        minY = Math.min(minY, topConfigY);
        maxY = Math.max(maxY, bottomConfigY);

        // Update simulatedY (for consistency with rendering)
        simulatedY = configStartY + (configHeight / 2) + verticalSpacing;
      }

      // If no child nodes, set a minimal height to avoid infinity issues
      if (!namespace.deployments?.length && !namespace.services?.length && !namespace.configmaps?.length) {
        minY = globalY;
        maxY = globalY;
      }

      // Calculate total height and center namespace
      const totalChildHeight = maxY - minY;
      const namespaceY = minY + (totalChildHeight / 2); // Exact vertical center
      addNode(namespaceId, namespace.name, x, namespaceY, null, "namespace", false);
  
      let currentY = globalY;
  
      // Deployments
      if (namespace.deployments) {
        namespace.deployments.forEach((deployment: Deployment, i: number) => {
          const deploymentId = `deployment-${deployment.metadata.name}`;
          const numPods = deployment.spec.replicas;
          const podHeight = numPods > 1
            ? (numPods * podVerticalSpacing) - podVerticalSpacing // Use podVerticalSpacing (45px)
            : 0; // No height offset for single pod or no pods
          const deploymentY = numPods === 1 ? currentY : currentY + (podHeight / 2); // Single pod aligns with deployment, multiple center over pods
          addNode(deploymentId, deployment.metadata.name, x + horizontalSpacing, deploymentY, namespaceId, "deployment", false, deployment.status);
  
          if (deployment.spec.replicas > 0) {
            const replicasetId = `replicaset-${deployment.metadata.name}`;
            const replicasetY = deploymentY; // Always align with deployment
            addNode(replicasetId, "replica", x + horizontalSpacing * 2, replicasetY, deploymentId, "replicaset", false, deployment.status);
  
            let maxPodY = replicasetY; // Track the maximum y position of pods
            for (let j = 0; j < numPods; j++) {
              const podId = `pod-${deployment.metadata.name}-${j}`;
              const podY = numPods === 1
                ? replicasetY // Single pod aligns with replica set (and deployment)
                : replicasetY + (j * podVerticalSpacing) - (podHeight / 2); // Multiple pods centered under replica set with 45px spacing
              const podX = x + horizontalSpacing * 3;
              addNode(podId, `Pod ${j + 1}`, podX, podY, replicasetId, "pod", false, deployment.status);
              if (numPods > 1) {
                maxPodY = Math.max(maxPodY, podY); // Update maxPodY for multiple pods
              }
            }
  
            currentY = numPods === 1
              ? replicasetY + verticalSpacing // Single pod: maintain original spacing
              : maxPodY + verticalSpacing; // Multiple pods: extend to bottom pod
          } else {
            currentY = deploymentY + verticalSpacing;
          }
  
          // Add additional spacing after each deployment except the last one
          if (i < (namespace.deployments?.length || 0) - 1 || namespace.services || namespace.configmaps) {
            currentY += additionalTopLevelSpacing; // Add 15px extra spacing
          }
        });
      }
  
      // Services
      if (namespace.services) {
        namespace.services.forEach((service: Service, i: number) => {
          const serviceId = `service-${service.metadata.name}`;
          const numEndpoints = service.status?.loadBalancer?.ingress?.length || 0;
          const endpointHeight = numEndpoints > 1
            ? (numEndpoints * verticalSpacing) - verticalSpacing
            : 0; // No height offset for single endpoint or no endpoints
          const serviceY = numEndpoints === 1 ? currentY : currentY + (endpointHeight / 2); // Single endpoint aligns with service, multiple center over endpoints
          addNode(serviceId, service.metadata.name, x + horizontalSpacing, serviceY, namespaceId, "service", false);
  
          if (service.status?.loadBalancer?.ingress) {
            let maxEndpointY = serviceY; // Track the maximum y position of endpoints
            service.status.loadBalancer.ingress.forEach((endpoint, j: number) => {
              const endpointId = `endpoint-${service.metadata.name}-${j}`;
              const endpointY = numEndpoints === 1
                ? serviceY // Single endpoint aligns with service
                : serviceY + (j * verticalSpacing) - (endpointHeight / 2); // Multiple endpoints centered under service
              addNode(endpointId, endpoint.hostname || endpoint.ip || "Endpoint", x + horizontalSpacing * 2, endpointY, serviceId, "endpoint", false);
              if (numEndpoints > 1) {
                maxEndpointY = Math.max(maxEndpointY, endpointY); // Update maxEndpointY for multiple endpoints
              }
            });
            currentY = numEndpoints === 1
              ? serviceY + verticalSpacing // Single endpoint maintains original spacing
              : maxEndpointY + verticalSpacing; // Multiple endpoints extend to bottom endpoint
          } else {
            currentY = serviceY + verticalSpacing;
          }
  
          // Add additional spacing after each service except the last one if configmaps follow
          if (i < (namespace.services?.length || 0) - 1 || namespace.configmaps) {
            currentY += additionalTopLevelSpacing; // Add 15px extra spacing
          }
        });
      }
  
      // ConfigMaps
      if (namespace.configmaps && namespace.configmaps.length > 0) {
        const configParentY = currentY;
        const configParentId = `configs-parent-${namespace.name}`;
        addNode(configParentId, "Configs", x + horizontalSpacing, configParentY, namespaceId, "config", false);
  
        const numConfigs = namespace.configmaps.length;
        const configHeight = (numConfigs * verticalSpacing) - verticalSpacing;
        const configStartY = configParentY + verticalSpacing + (configHeight / 2);
  
        namespace.configmaps.forEach((config: ConfigMap, i: number) => {
          const configId = `config-${config.metadata.name}`;
          const configY = configStartY + (i * verticalSpacing) - (configHeight / 2);
          addNode(configId, config.metadata.name, x + horizontalSpacing * 2, configY, configParentId, "config", false);
        });
        currentY = configStartY + (configHeight / 2) + verticalSpacing;
      }
  
      globalY = currentY + verticalSpacing;
    });
  
    setNodes(nodes);
    setEdges(edges);
  
    const totalHeight = globalY + 50;
    const reactFlowContainer = document.querySelector('.react-flow');
    if (reactFlowContainer) {
      reactFlowContainer.style.height = `${totalHeight}px`;
    }
};

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Tree View Deployment
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        <AlertTitle>Info</AlertTitle>
        Enter the details below to deploy your Kubernetes application.
      </Alert>

      <TextField
        fullWidth
        label="GitHub URL"
        value={formData.githuburl}
        onChange={(e) => setFormData((prev) => ({ ...prev, githuburl: e.target.value }))}
        sx={{ mb: 2 }}
      />

      <TextField
        fullWidth
        label="Path"
        value={formData.path}
        onChange={(e) => setFormData((prev) => ({ ...prev, path: e.target.value }))}
        sx={{ mb: 2 }}
      />

      <Button variant="contained" onClick={handleDeploy} disabled={loading} sx={{ mb: 2 }}>
        {loading ? <CircularProgress size={24} /> : "Deploy"}
      </Button>

      {responseData && (
        <Box mt={3} style={{ width: "85vw", height: "", position: "relative" }}>
          <ReactFlowProvider>
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
                minHeight: `${nodes.length * 60}px`, // Adjust height dynamically
                height: "auto", // Allow it to grow
              }}
              onWheel={(event) => event.stopPropagation()}
            >
              <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlow>
            <CustomZoomControls />
          </ReactFlowProvider>

          {/* Context Menu */}
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
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TreeView;