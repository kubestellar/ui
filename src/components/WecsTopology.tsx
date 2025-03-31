import { useState, useEffect, useCallback, useRef, memo } from "react";
import { Box, Typography, Menu, MenuItem, Button, Alert, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { ReactFlowProvider, Position, MarkerType } from "reactflow";
import * as dagre from "dagre";
import "reactflow/dist/style.css";
import cm from "../assets/k8s_resources_logo/cm.svg";
import crb from "../assets/k8s_resources_logo/crb.svg";
import crd from "../assets/k8s_resources_logo/crd.svg";
import cRole from "../assets/k8s_resources_logo/c-role.svg";
import cronjob from "../assets/k8s_resources_logo/cronjob.svg";
import deployicon from "../assets/k8s_resources_logo/deploy.svg";
import ds from "../assets/k8s_resources_logo/ds.svg";
import ep from "../assets/k8s_resources_logo/ep.svg";
import group from "../assets/k8s_resources_logo/group.svg";
import hpa from "../assets/k8s_resources_logo/hpa.svg";
import ing from "../assets/k8s_resources_logo/ing.svg";
import job from "../assets/k8s_resources_logo/job.svg";
import limits from "../assets/k8s_resources_logo/limits.svg";
import netpol from "../assets/k8s_resources_logo/netpol.svg";
import ns from "../assets/k8s_resources_logo/ns.svg";
import psp from "../assets/k8s_resources_logo/psp.svg";
import pv from "../assets/k8s_resources_logo/pv.svg";
import pvc from "../assets/k8s_resources_logo/pvc.svg";
import quota from "../assets/k8s_resources_logo/quota.svg";
import rb from "../assets/k8s_resources_logo/rb.svg";
import role from "../assets/k8s_resources_logo/role.svg";
import rs from "../assets/k8s_resources_logo/rs.svg";
import sa from "../assets/k8s_resources_logo/sa.svg";
import sc from "../assets/k8s_resources_logo/sc.svg";
import secret from "../assets/k8s_resources_logo/secret.svg";
import sts from "../assets/k8s_resources_logo/sts.svg";
import svc from "../assets/k8s_resources_logo/svc.svg";
import cluster from "../assets/k8s_resources_logo/kubernetes-logo.svg"
import pod from "../assets/k8s_resources_logo/pod.png"
import user from "../assets/k8s_resources_logo/user.svg";
import vol from "../assets/k8s_resources_logo/vol.svg";
import { Plus } from "lucide-react";
import CreateOptions from "../components/CreateOptions";
import { NodeLabel } from "../components/Wds_Topology/NodeLabel";
import { ZoomControls } from "../components/Wds_Topology/ZoomControls";
import { FlowCanvas } from "../components/Wds_Topology/FlowCanvas";
import LoadingFallback from "./LoadingFallback";
import ReactDOM from "react-dom";
import { isEqual } from "lodash";
import { useWebSocket } from "../context/WebSocketProvider";
import useTheme from "../stores/themeStore";
import axios from "axios";
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

// Import the new WecsDetailsPanel
import WecsDetailsPanel from "./WecsDetailsPanel";

// Interfaces
export interface NodeData {
  label: JSX.Element;
}

export interface BaseNode {
  id: string;
  data: NodeData;
  position: { x: number; y: number };
  style?: React.CSSProperties;
}

export interface CustomNode extends BaseNode {
  sourcePosition?: Position;
  targetPosition?: Position;
  collapsed?: boolean;
  showMenu?: boolean;
}

export interface BaseEdge {
  id: string;
  source: string;
  target: string;
}

export interface CustomEdge extends BaseEdge {
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

export interface ResourceItem {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp: string;
    labels?: Record<string, string>;
    uid?: string;
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
  ports?: Array<{ name: string; port: number }>;
  subjects?: Array<{ name: string }>;
  roleRef?: { name: string };
  rules?: Array<{
    verbs?: string[];
    resources?: string[];
  }>;
}

interface PodItem {
  name: string;
  raw: ResourceItem;
}

interface SelectedNode {
  namespace: string;
  name: string;
  type: string;
  onClose: () => void;
  isOpen: boolean;
  resourceData?: ResourceItem;
  initialTab?: number;
  cluster?: string; // Added to store cluster name for pods
}

const nodeStyle: React.CSSProperties = {
  padding: "2px 12px",
  fontSize: "6px",
  border: "none",
  width: "146px",
  height: "30px",
};

// Mapping of kind to the correct plural form for API endpoints
const kindToPluralMap: Record<string, string> = {
  Binding: "bindings",
  ComponentStatus: "componentstatuses",
  ConfigMap: "configmaps",
  Endpoints: "endpoints",
  Event: "events",
  LimitRange: "limitranges",
  Namespace: "namespaces",
  Node: "nodes",
  PersistentVolumeClaim: "persistentvolumeclaims",
  PersistentVolume: "persistentvolumes",
  Pod: "pods",
  PodTemplate: "podtemplates",
  ReplicationController: "replicationcontrollers",
  ResourceQuota: "resourcequotas",
  Secret: "secrets",
  ServiceAccount: "serviceaccounts",
  Service: "services",
  MutatingWebhookConfiguration: "mutatingwebhookconfigurations",
  ValidatingWebhookConfiguration: "validatingwebhookconfigurations",
  CustomResourceDefinition: "customresourcedefinitions",
  APIService: "apiservices",
  ControllerRevision: "controllerrevisions",
  DaemonSet: "daemonsets",
  Deployment: "deployments",
  ReplicaSet: "replicasets",
  StatefulSet: "statefulsets",
  Application: "applications",
  ApplicationSet: "applicationsets",
  AppProject: "appprojects",
  SelfSubjectReview: "selfsubjectreviews",
  TokenReview: "tokenreviews",
  LocalSubjectAccessReview: "localsubjectaccessreviews",
  SelfSubjectAccessReview: "selfsubjectaccessreviews",
  SelfSubjectRulesReview: "selfsubjectrulesreviews",
  SubjectAccessReview: "subjectaccessreviews",
  HorizontalPodAutoscaler: "horizontalpodautoscalers",
  CronJob: "cronjobs",
  Job: "jobs",
  CertificateSigningRequest: "certificatesigningrequests",
  BindingPolicy: "bindingpolicies",
  CombinedStatus: "combinedstatuses",
  CustomTransform: "customtransforms",
  StatusCollector: "statuscollectors",
  Lease: "leases",
  EndpointSlice: "endpointslices",
  FlowSchema: "flowschemas",
  PriorityLevelConfiguration: "prioritylevelconfigurations",
  IngressClass: "ingressclasses",
  Ingress: "ingresses",
  NetworkPolicy: "networkpolicies",
  RuntimeClass: "runtimeclasses",
  PodDisruptionBudget: "poddisruptionbudgets",
  ClusterRoleBinding: "clusterrolebindings",
  ClusterRole: "clusterroles",
  RoleBinding: "rolebindings",
  Role: "roles",
  PriorityClass: "priorityclasses",
  CSIDriver: "csidrivers",
  CSINode: "csinodes",
  CSIStorageCapacity: "csistoragecapacities",
  StorageClass: "storageclasses",
  VolumeAttachment: "volumeattachments",
};

// Dynamic icon mapping for all imported icons
const iconMap: Record<string, string> = {
  ConfigMap: cm,
  ClusterRoleBinding: crb,
  CustomResourceDefinition: crd,
  ClusterRole: cRole,
  CronJob: cronjob,
  Deployment: deployicon,
  DaemonSet: ds,
  Endpoints: ep,
  Group: group,
  HorizontalPodAutoscaler: hpa,
  Ingress: ing,
  Job: job,
  LimitRange: limits,
  NetworkPolicy: netpol,
  Namespace: deployicon,
  PodSecurityPolicy: psp,
  PersistentVolume: pv,
  PersistentVolumeClaim: pvc,
  ResourceQuota: quota,
  RoleBinding: rb,
  Role: role,
  ReplicaSet: rs,
  ServiceAccount: sa,
  StorageClass: sc,
  Secret: secret,
  StatefulSet: sts,
  Service: svc,
  User: user,
  Volume: vol,
  Pod: deployicon,
  Cluster: group,
};

// Updated getNodeConfig function to support cluster and pod
const getNodeConfig = (type: string) => {
  const normalizedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  
  let icon = iconMap[normalizedType] || cm;
  let dynamicText = type.toLowerCase();

  switch (type.toLowerCase()) {
    case "cluster":
      icon = cluster;
      dynamicText = "cluster";
      break;
    case "namespace":
      icon = ns;
      dynamicText = "ns";
      break;
    case "pod":
      icon = pod;
      dynamicText = "pod";
      break;
    default:
      break;
  }

  return { icon, dynamicText };
};

// Layout function (unchanged)
const getLayoutedElements = (
  nodes: CustomNode[],
  edges: CustomEdge[],
  direction = "LR",
  prevNodes: React.MutableRefObject<CustomNode[]>
) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 30, ranksep: 60 });

  const nodeMap = new Map<string, CustomNode>();
  const newNodes: CustomNode[] = [];

  const shouldRecalculate = true;
  if (!shouldRecalculate && Math.abs(nodes.length - prevNodes.current.length) <= 5) {
    prevNodes.current.forEach((node) => nodeMap.set(node.id, node));
  }

  nodes.forEach((node) => {
    const cachedNode = nodeMap.get(node.id);
    if (!cachedNode || !isEqual(cachedNode, node) || shouldRecalculate) {
      dagreGraph.setNode(node.id, { width: 146, height: 30 });
      newNodes.push(node);
    } else {
      newNodes.push({ ...cachedNode, ...node });
    }
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = newNodes.map((node) => {
    const dagreNode = dagreGraph.node(node.id);
    return dagreNode
      ? {
          ...node,
          position: {
            x: dagreNode.x - 73 + 50,
            y: dagreNode.y - 15 + 50,
          },
        }
      : node;
  });

  return { nodes: layoutedNodes, edges };
};

const WecsTreeview = () => {
  const theme = useTheme((state) => state.theme);
  const [nodes, setNodes] = useState<CustomNode[]>([]);
  const [edges, setEdges] = useState<CustomEdge[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");
  const [contextMenu, setContextMenu] = useState<{ nodeId: string | null; x: number; y: number } | null>(null);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [activeOption, setActiveOption] = useState<string | null>("option1");
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [isTransforming, setIsTransforming] = useState<boolean>(false);
  const [dataReceived, setDataReceived] = useState<boolean>(false);
  const [minimumLoadingTimeElapsed, setMinimumLoadingTimeElapsed] = useState<boolean>(false);
  const nodeCache = useRef<Map<string, CustomNode>>(new Map());
  const edgeCache = useRef<Map<string, CustomEdge>>(new Map());
  const edgeIdCounter = useRef<number>(0);
  const prevNodes = useRef<CustomNode[]>([]);
  const renderStartTime = useRef<number>(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [deleteNodeDetails, setDeleteNodeDetails] = useState<{
    namespace: string;
    nodeType: string;
    nodeName: string;
    nodeId: string;
  } | null>(null);

  const { wecsIsConnected, hasValidWecsData, wecsData } = useWebSocket();

  useEffect(() => {
    renderStartTime.current = performance.now();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinimumLoadingTimeElapsed(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (wecsData !== null && !dataReceived) {
      setDataReceived(true);
    }
  }, [wecsData, dataReceived]);

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

  const createNode = useCallback(
    (
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
      const config = getNodeConfig(type.toLowerCase());
      const timeAgo = getTimeAgo(timestamp);
      const cachedNode = nodeCache.current.get(id);

      const node =
        cachedNode ||
        ({
          id,
          data: {
            label: (
              <NodeLabel
                label={label}
                icon={config.icon}
                dynamicText={config.dynamicText}
                status={status}
                timeAgo={timeAgo}
                resourceData={resourceData}
                onClick={(e) => {
                  if ((e.target as HTMLElement).tagName === "svg" || (e.target as HTMLElement).closest("svg")) return;
                  // Only open the panel for pod nodes, not cluster or namespace
                  if (type.toLowerCase() === "cluster" || type.toLowerCase() === "namespace") return;
                  const nodeIdParts = id.split(":");
                  let cluster = "";
                  if (type.toLowerCase() === "namespace" && nodeIdParts.length === 3) {
                    cluster = nodeIdParts[1];
                  } else if (type.toLowerCase() === "pod" && nodeIdParts.length >= 4) {
                    cluster = nodeIdParts[1];
                  }
                  setSelectedNode({
                    namespace: namespace || "default",
                    name: label,
                    type: type.toLowerCase(),
                    onClose: handleClosePanel,
                    isOpen: true,
                    resourceData,
                    cluster, // Pass the cluster name for pods
                  });
                }}
                onMenuClick={(e) => handleMenuOpen(e, id)}
              />
            ),
          },
          position: { x: 0, y: 0 },
          style: {
            ...nodeStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "2px 12px",
            backgroundColor: theme === "dark" ? "#333" : "#fff",
            color: theme === "dark" ? "#fff" : "#000",
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        } as CustomNode);

      if (!cachedNode) nodeCache.current.set(id, node);
      newNodes.push(node);

      if (parent) {
        const uniqueSuffix = resourceData?.metadata?.uid || edgeIdCounter.current++;
        const edgeId = `edge-${parent}-${id}-${uniqueSuffix}`;
        const cachedEdge = edgeCache.current.get(edgeId);
        if (!cachedEdge) {
          const edge = {
            id: edgeId,
            source: parent,
            target: id,
            type: "step",
            animated: true,
            style: { stroke: theme === "dark" ? "#ccc" : "#a3a3a3", strokeDasharray: "2,2" },
            markerEnd: { type: MarkerType.ArrowClosed, color: theme === "dark" ? "#ccc" : "#a3a3a3" },
          };
          newEdges.push(edge);
          edgeCache.current.set(edgeId, edge);
        } else {
          newEdges.push(cachedEdge);
        }
      }
    },
    [getTimeAgo, handleClosePanel, handleMenuOpen, theme]
  );

  const transformDataToTree = useCallback(
    (data: { cluster: string; namespaces: { namespace: string; pods: PodItem[] }[] }[]) => {
      nodeCache.current.clear();
      edgeCache.current.clear();
      edgeIdCounter.current = 0;
  
      const newNodes: CustomNode[] = [];
      const newEdges: CustomEdge[] = [];
  
      if (data && data.length > 0) {
        data.forEach((cluster) => {
          const clusterId = `cluster:${cluster.cluster}`;
          createNode(
            clusterId,
            cluster.cluster,
            "cluster",
            "Active",
            "",
            undefined,
            { apiVersion: "v1", kind: "Cluster", metadata: { name: cluster.cluster, namespace: "", creationTimestamp: "" }, status: { phase: "Active" } },
            null,
            newNodes,
            newEdges
          );
  
          cluster.namespaces.forEach((namespace) => {
            const namespaceId = `ns:${cluster.cluster}:${namespace.namespace}`;
            createNode(
              namespaceId,
              namespace.namespace,
              "namespace",
              "Active",
              "",
              namespace.namespace,
              { apiVersion: "v1", kind: "Namespace", metadata: { name: namespace.namespace, namespace: namespace.namespace, creationTimestamp: "" }, status: { phase: "Active" } },
              clusterId,
              newNodes,
              newEdges
            );
  
            const pods = namespace.pods || [];
            if (pods.length > 0) {
              pods.forEach((pod, index) => {
                if (!pod || typeof pod !== "object" || !pod.raw) {
                  return;
                }
  
                const rawPod = pod.raw;
                if (!rawPod.metadata || typeof rawPod.metadata !== "object" || !rawPod.metadata.name) {
                  return;
                }
  
                const podId = `pod:${cluster.cluster}:${namespace.namespace}:${rawPod.metadata.name}:${index}`;
                const status = rawPod.status?.phase || "Unknown";
                createNode(
                  podId,
                  rawPod.metadata.name,
                  "pod",
                  status,
                  rawPod.metadata.creationTimestamp,
                  namespace.namespace,
                  rawPod,
                  namespaceId,
                  newNodes,
                  newEdges
                );
              });
            }
          });
        });
      }
  
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges, "LR", prevNodes);
      ReactDOM.unstable_batchedUpdates(() => {
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        setIsTransforming(false);
      });
      prevNodes.current = layoutedNodes;
    },
    [createNode]
  );

  useEffect(() => {
    if (wecsData !== null) {
      setIsTransforming(true);
      transformDataToTree(wecsData);
    }
  }, [wecsData, transformDataToTree]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectedNode?.isOpen && panelRef.current && !panelRef.current.contains(event.target as Node)) {
        handleClosePanel();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedNode, handleClosePanel]);

  const findDescendantNodes = useCallback((nodeId: string, edges: CustomEdge[]): string[] => {
    const descendants: string[] = [];
    const queue: string[] = [nodeId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      if (visited.has(currentNodeId)) continue;
      visited.add(currentNodeId);

      const children = edges
        .filter((edge) => edge.source === currentNodeId)
        .map((edge) => edge.target);

      children.forEach((childId) => {
        if (!visited.has(childId)) {
          descendants.push(childId);
          queue.push(childId);
        }
      });
    }

    return descendants;
  }, []);

  const handleDeleteNode = useCallback(
    async (namespace: string, nodeType: string, nodeName: string, nodeId: string) => {
      try {
        if (nodeType.toLowerCase() === "pod") {
          // For pods, show "API not implemented" in snackbar
          setSnackbarMessage(`API not implemented for deleting pod "${nodeName}"`);
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
          return;
        }

        let endpoint: string;

        if (nodeType.toLowerCase() === "namespace") {
          endpoint = `${process.env.VITE_BASE_URL}/api/namespaces/delete/${namespace}`;
        } else {
          const kind = nodeType.charAt(0).toUpperCase() + nodeType.slice(1);
          const pluralForm = kindToPluralMap[kind] || `${nodeType.toLowerCase()}s`;
          endpoint = `${process.env.VITE_BASE_URL}/api/${pluralForm}/${namespace}/${nodeName}`;
        }

        await axios.delete(endpoint);

        const descendantNodeIds = findDescendantNodes(nodeId, edges);
        const nodesToDelete = [nodeId, ...descendantNodeIds];

        setNodes((prevNodes) => {
          const remainingNodes = prevNodes.filter((n) => !nodesToDelete.includes(n.id));
          return remainingNodes;
        });

        setEdges((prevEdges) => {
          const remainingEdges = prevEdges.filter(
            (e) => !nodesToDelete.includes(e.source) && !nodesToDelete.includes(e.target)
          );
          return remainingEdges;
        });

        nodesToDelete.forEach((id) => {
          nodeCache.current.delete(id);
        });
        edgeCache.current.forEach((edge, edgeId) => {
          if (nodesToDelete.includes(edge.source) || nodesToDelete.includes(edge.target)) {
            edgeCache.current.delete(edgeId);
          }
        });

        setSnackbarMessage(`"${nodeName}" and its children deleted successfully`);
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      } catch (error) {
        setSnackbarMessage(`Failed to delete "${nodeName}"`);
        setSnackbarSeverity("error");
        console.log(error);
        setSnackbarOpen(true);
      }
    },
    [edges, findDescendantNodes]
  );

  const handleMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleMenuAction = useCallback(
    async (action: string) => {
      if (contextMenu?.nodeId) {
        const node = nodes.find((n) => n.id === contextMenu.nodeId);
        if (node) {
          const nodeIdParts = node.id.split(":");
          const nodeName = node.data.label.props.label;
          let namespace = "";
          let nodeType = "";
          let cluster = "";

          if (node.id.startsWith("cluster:") && nodeIdParts.length === 2) {
            nodeType = "cluster";
            namespace = "";
            cluster = nodeIdParts[1];
          } else if (node.id.startsWith("ns:") && nodeIdParts.length === 3) {
            nodeType = "namespace";
            namespace = nodeIdParts[2];
            cluster = nodeIdParts[1];
          } else if (nodeIdParts.length >= 4) {
            nodeType = "pod";
            namespace = nodeIdParts[2];
            cluster = nodeIdParts[1];
          } else {
            return;
          }

          // Do not open the panel or perform actions for cluster nodes
          if (nodeType === "cluster") {
            handleMenuClose();
            return;
          }

          const resourceData = node.data.label.props.resourceData;

          switch (action) {
            case "Details":
              setSelectedNode({
                namespace: namespace || "default",
                name: nodeName,
                type: nodeType,
                onClose: handleClosePanel,
                isOpen: true,
                resourceData,
                initialTab: 0,
                cluster,
              });
              break;
            case "Delete":
              setDeleteNodeDetails({
                namespace,
                nodeType,
                nodeName,
                nodeId: contextMenu.nodeId,
              });
              setDeleteDialogOpen(true);
              break;
            case "Edit":
              setSelectedNode({
                namespace: namespace || "default",
                name: nodeName,
                type: nodeType,
                onClose: handleClosePanel,
                isOpen: true,
                resourceData,
                initialTab: 1,
                cluster,
              });
              break;
            case "Logs":
              setSelectedNode({
                namespace: namespace || "default",
                name: nodeName,
                type: nodeType,
                onClose: handleClosePanel,
                isOpen: true,
                resourceData,
                initialTab: 2,
                cluster,
              });
              break;
            default:
              break;
          }
        }
      }
      handleMenuClose();
    },
    [contextMenu, nodes, handleClosePanel]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteNodeDetails) {
      const { namespace, nodeType, nodeName, nodeId } = deleteNodeDetails;
      await handleDeleteNode(namespace, nodeType, nodeName, nodeId);
    }
    setDeleteDialogOpen(false);
    setDeleteNodeDetails(null);
  }, [deleteNodeDetails, handleDeleteNode]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
    setDeleteNodeDetails(null);
  }, []);

  const handleSnackbarClose = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  const handleCancelCreateOptions = () => {
    setShowCreateOptions(false);
  };

  const handleCreateWorkloadClick = () => {
    setShowCreateOptions(true);
    setActiveOption("option1");
  };

  const isLoading = !wecsIsConnected || !hasValidWecsData || isTransforming || !minimumLoadingTimeElapsed;

  return (
    <Box sx={{ display: "flex", height: "85vh", width: "100%", position: "relative" }}>
      <Box
        sx={{
          flex: 1,
          position: "relative",
          filter: selectedNode?.isOpen ? "blur(5px)" : "none",
          transition: "filter 0.2s ease-in-out",
          pointerEvents: selectedNode?.isOpen ? "none" : "auto",
        }}
      >
        <Box
          sx={{
            mb: 4,
            display: "flex",
            alignItems: "center",
            gap: 2,
            flex: 1,
            justifyContent: "space-between",
            padding: 2,
            borderRadius: 1,
            boxShadow: "0 6px 6px rgba(0,0,0,0.1)",
            background: theme === "dark" ? "rgb(15, 23, 42)" : "#fff", 
          }}
        >
          <Typography variant="h4" sx={{ color: "#4498FF", fontWeight: 700, fontSize: "30px", letterSpacing: "0.5px" }}>
            Remote-Cluster Treeview
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Plus size={20} />}
            onClick={handleCreateWorkloadClick}
            sx={{
              color: "#FFFFFF",
              backgroundColor: "#2F86FF",
              padding: "8px 20px",
              fontWeight: "600",
              borderRadius: "8px",
              textTransform: "none",
            }}
          >
            Create Workload
          </Button>
        </Box>

        {showCreateOptions && <CreateOptions activeOption={activeOption} setActiveOption={setActiveOption} onCancel={handleCancelCreateOptions} />}

        <Box sx={{ width: "100%", height: "calc(100% - 80px)", position: "relative" }}>
          {isLoading ? (
            <LoadingFallback message="Loading the tree..." size="medium" />
          ) : nodes.length > 0 || edges.length > 0 ? (
            <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
              <ReactFlowProvider>
                <FlowCanvas nodes={nodes} edges={edges} renderStartTime={renderStartTime} theme={theme} />
                <ZoomControls theme={theme} />
              </ReactFlowProvider>
            </Box>
          ) : (
            <Box
              sx={{
                width: "100%",
                backgroundColor: theme === "dark" ? "var(--fallback-b1,oklch(var(--b1)/var(--tw-bg-opacity)))" : "#fff",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginTop: "250px",
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                <Typography sx={{ color: theme === "dark" ? "#fff" : "#333", fontWeight: 500, fontSize: "22px" }}>
                  No Workloads Found
                </Typography>
                <Typography variant="body2" sx={{ color: "#00000099", fontSize: "17px", mb: 2 }}>
                  Get started by creating your first workload
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Plus size={20} />}
                  onClick={handleCreateWorkloadClick}
                  sx={{ backgroundColor: "#2f86ff", color: "#fff", "&:hover": { backgroundColor: "#1f76e5" } }}
                >
                  Create Workload
                </Button>
              </Box>
            </Box>
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
              <MenuItem onClick={() => handleMenuAction("Edit")}>Edit</MenuItem>
              <MenuItem onClick={() => handleMenuAction("Logs")}>Logs</MenuItem>
            </Menu>
          )}
        </Box>

        <Snackbar anchorOrigin={{ vertical: "top", horizontal: "center" }} open={snackbarOpen} autoHideDuration={4000} onClose={handleSnackbarClose}>
          <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: "100%" }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>

        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
          aria-labelledby="delete-confirmation-dialog-title"
          sx={{
            "& .MuiDialog-paper": {
              padding: "16px",
              width: "500px",
              backgroundColor: theme === "dark" ? "rgb(15, 23, 42)" : "#fff",
              borderRadius: "4px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
              maxWidth: "480px",
              height: "250px",
            },
          }}
        >
          <DialogTitle id="delete-confirmation-dialog-title" sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "18px", fontWeight: 600, color: theme === "dark" ? "#fff" : "333" }}>
            <WarningAmberIcon sx={{ color: "#FFA500", fontSize: "34px" }} />
            Confirm Resource Deletion
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: "16px", color: theme === "dark" ? "#fff" : "333", mt: 2 }}>
              Are you sure you want to delete "{deleteNodeDetails?.nodeName}"? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ justifyContent: "space-between", padding: "0 16px 16px 16px" }}>
            <Button
              onClick={handleDeleteCancel}
              sx={{
                textTransform: "none",
                color: "#2F86FF",
                fontWeight: 600,
                "&:hover": { backgroundColor: "rgba(47, 134, 255, 0.1)" },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              sx={{
                textTransform: "none",
                fontWeight: 500,
                backgroundColor: "#d32f2f",
                color: "#fff",
                padding: "6px 16px",
                borderRadius: "4px",
                "&:hover": {
                  backgroundColor: "#b71c1c",
                },
              }}
            >
              Yes, Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

      <div ref={panelRef}>
        <WecsDetailsPanel
          namespace={selectedNode?.namespace || ""}
          name={selectedNode?.name || ""}
          type={selectedNode?.type || ""}
          resourceData={selectedNode?.resourceData}
          onClose={handleClosePanel}
          isOpen={selectedNode?.isOpen || false}
          initialTab={selectedNode?.initialTab}
          cluster={selectedNode?.cluster || ""}
          onDelete={deleteNodeDetails ? () => handleDeleteNode(
            deleteNodeDetails.namespace,
            deleteNodeDetails.nodeType,
            deleteNodeDetails.nodeName,
            deleteNodeDetails.nodeId
          ) : undefined}
        />
      </div>
    </Box>
  );
};

export default memo(WecsTreeview);