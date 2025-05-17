import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import { Box, Typography, Menu, MenuItem, Button, Alert, Snackbar, Dialog, DialogTitle, DialogContent, DialogActions, IconButton } from "@mui/material";
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
import user from "../assets/k8s_resources_logo/user.svg";
import vol from "../assets/k8s_resources_logo/vol.svg";
import { Plus } from "lucide-react";
import CreateOptions from "../components/CreateOptions";
import { NodeLabel } from "../components/Wds_Topology/NodeLabel";
import { ZoomControls } from "../components/Wds_Topology/ZoomControls";
import { FlowCanvas } from "../components/Wds_Topology/FlowCanvas";
import ListViewSkeleton from "./ui/ListViewSkeleton";
import TreeViewSkeleton from "./ui/TreeViewSkeleton";
import DynamicDetailsPanel from "./DynamicDetailsPanel";
import GroupPanel from "./GroupPanel";
import ReactDOM from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { isEqual } from "lodash";
import { useWebSocket } from "../context/WebSocketProvider";
import useTheme from "../stores/themeStore";
import axios from "axios";
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ListViewComponent from "../components/ListViewComponent";
import ContextDropdown from "../components/ContextDropdown";
import { ResourceItem as ListResourceItem } from "./ListViewComponent"; // Import ResourceItem from ListViewComponent
import useLabelHighlightStore from "../stores/labelHighlightStore";
import { useLocation } from "react-router-dom";
import FullScreenToggle from "./ui/FullScreenToggle";

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
  isGroup?: boolean;
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
    replicas?: number;
    scaleTargetRef?: {
      apiVersion?: string;
      kind?: string;
      name?: string;
    };
    configMap?: {
      name: string;
      items?: Array<{ key: string; path: string }>;
    };
    secret?: {
      secretName: string;
      items?: Array<{ key: string; path: string }>;
    };
    [key: string]: unknown;
  };
  status?: {
    conditions?: Array<{ type: string; status: string }>;
    phase?: string;
    containerStatuses?: Array<{
      name: string;
      state?: Record<string, unknown>;
      ready?: boolean;
      restartCount?: number;
      image?: string;
      imageID?: string;
      containerID?: string;
      started?: boolean;
    }>;
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
  subjects?: Array<{ 
    name: string;
    kind?: string;
    namespace?: string;
  }>;
  roleRef?: { name: string };
  rules?: Array<{
    verbs?: string[];
    resources?: string[];
  }>;
  parentConfigMap?: {
    name: string;
    namespace: string;
    kind: string;
  };
  parentSecret?: {
    name: string;
    namespace: string;
    kind: string;
  };
  [key: string]: unknown;
}

export interface NamespaceResource {
  name: string;
  status: string;
  labels: Record<string, string>;
  resources: Record<string, ResourceItem[]>;
  context: string;
}

interface SelectedNode {
  namespace: string;
  name: string;
  type: string;
  onClose: () => void;
  isOpen: boolean;
  resourceData?: ResourceItem;
  initialTab?: number;
}

interface GroupPanelState {
  isOpen: boolean;
  namespace: string;
  groupType: string;
  groupItems: ResourceItem[];
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
  Namespace: ns,
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
};

const getNodeConfig = (type: string, label: string) => {
  console.log(label);
  const normalizedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  let icon = iconMap[normalizedType] || cm;
  let dynamicText = type.toLowerCase();

  switch (type.toLowerCase()) {
    case "namespace":
      icon = ns;
      dynamicText = "ns";
      break;
    case "deployment":
      icon = deployicon;
      dynamicText = "deploy";
      break;
    case "replicaset":
      icon = rs;
      dynamicText = "replica";
      break;
    case "service":
      icon = svc;
      dynamicText = "svc";
      break;
    case "endpoints":
      icon = ep;
      dynamicText = "endpoints";
      break;
    case "endpointslice":
      icon = ep;
      dynamicText = "endpointslice";
      break;
    case "configmap":
      icon = cm;
      dynamicText = "configmap";
      break;
    case "clusterrolebinding":
      icon = crb;
      dynamicText = "clusterrolebinding";
      break;
    case "customresourcedefinition":
      icon = crd;
      dynamicText = "crd";
      break;
    case "clusterrole":
      icon = cRole;
      dynamicText = "clusterrole";
      break;
    case "cronjob":
      icon = cronjob;
      dynamicText = "cronjob";
      break;
    case "daemonset":
      icon = ds;
      dynamicText = "daemonset";
      break;
    case "group":
      icon = group;
      dynamicText = "group";
      break;
    case "horizontalpodautoscaler":
      icon = hpa;
      dynamicText = "hpa";
      break;
    case "ingress":
      icon = ing;
      dynamicText = "ingress";
      break;
    case "job":
      icon = job;
      dynamicText = "job";
      break;
    case "limitrange":
      icon = limits;
      dynamicText = "limitrange";
      break;
    case "networkpolicy":
      icon = netpol;
      dynamicText = "netpol";
      break;
    case "podsecuritypolicy":
      icon = psp;
      dynamicText = "psp";
      break;
    case "persistentvolume":
      icon = pv;
      dynamicText = "pv";
      break;
    case "persistentvolumeclaim":
      icon = pvc;
      dynamicText = "pvc";
      break;
    case "resourcequota":
      icon = quota;
      dynamicText = "quota";
      break;
    case "rolebinding":
      icon = rb;
      dynamicText = "rolebinding";
      break;
    case "role":
      icon = role;
      dynamicText = "role";
      break;
    case "serviceaccount":
      icon = sa;
      dynamicText = "sa";
      break;
    case "storageclass":
      icon = sc;
      dynamicText = "storageclass";
      break;
    case "secret":
      icon = secret;
      dynamicText = "secret";
      break;
    case "statefulset":
      icon = sts;
      dynamicText = "statefulset";
      break;
    case "user":
      icon = user;
      dynamicText = "user";
      break;
    case "volume":
      icon = vol;
      dynamicText = "volume";
      break;
    case "envvar":
      icon = cm;
      dynamicText = "envvar";
      break;
    case "customresource":
      icon = crd;
      dynamicText = "cr";
      break;
    case "controller":
      icon = deployicon;
      dynamicText = "controller";
      break;
    case "ingresscontroller":
      icon = ing;
      dynamicText = "ingresscontroller";
      break;
    case "context":
      icon = group;
      dynamicText = "context";
      break;
    default:
      break;
  }

  return { icon, dynamicText };
};

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
      dagreGraph.setNode(node.id, { width: 146, height: 20 });
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

export interface TreeViewComponentProps {
  // Props for the TreeView component
  onViewModeChange?: (viewMode: 'tiles' | 'list') => void;
}

// Modified to accommodate different resource item types
interface ResourceDataChangeEvent {
  resources: ListResourceItem[];
  filteredResources: ListResourceItem[];
  contextCounts: Record<string, number>;
  totalCount: number;
}

interface ContextMenuState {
  nodeId: string | null;
  x: number;
  y: number; 
  nodeType: string | null;
}


const TreeViewComponent = (_props: TreeViewComponentProps) => {
  const theme = useTheme((state) => state.theme);
  const highlightedLabels = useLabelHighlightStore((state) => state.highlightedLabels);
  const [nodes, setNodes] = useState<CustomNode[]>([]);
  const [edges, setEdges] = useState<CustomEdge[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [activeOption, setActiveOption] = useState<string | null>("option1");
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [isTransforming, setIsTransforming] = useState<boolean>(false);
  const [dataReceived, setDataReceived] = useState<boolean>(false);
  const [minimumLoadingTimeElapsed, setMinimumLoadingTimeElapsed] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [groupPanel, setGroupPanel] = useState<GroupPanelState | null>(null);
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
  const [viewMode, setViewMode] = useState<'tiles' | 'list'>('tiles');
  const [filteredContext, setFilteredContext] = useState<string>("all");
   
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [contextResourceCounts, setContextResourceCounts] = useState<Record<string, number>>({});
  const [totalResourceCount, setTotalResourceCount] = useState<number>(0);
  const location = useLocation();

  const { isConnected, connect, hasValidData } = useWebSocket();
  const NAMESPACE_QUERY_KEY = ["namespaces"];

  const { data: websocketData } = useQuery<NamespaceResource[]>({
    queryKey: NAMESPACE_QUERY_KEY,
    queryFn: async () => {
      throw new Error("API not implemented");
    },
    enabled: false,
    initialData: [],
  });

  // Use a ref to track if this is the initial render
  const isInitialRender = useRef(true);
  console.log(resources);
  console.log(_props);
  
  // Component mount effect - only run once using a ref flag
  useEffect(() => {
    if (isInitialRender.current) {
      renderStartTime.current = performance.now();
      console.log(`[TreeView] Component mounted at 0ms`);
      console.log(`[TreeView] Initial state - isConnected: ${isConnected}, dataReceived: ${dataReceived}, isTransforming: ${isTransforming}, minimumLoadingTimeElapsed: ${minimumLoadingTimeElapsed}, nodes: ${nodes.length}, edges: ${edges.length}`);
      isInitialRender.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array with lint disable - this should only run once on mount

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinimumLoadingTimeElapsed(true);
      console.log(`[TreeView] Minimum loading time elapsed at ${performance.now() - renderStartTime.current}ms`);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    console.log(`[TreeView] Initiating WebSocket connection at ${performance.now() - renderStartTime.current}ms`);
    connect(true);
  }, [connect]);

  useEffect(() => {
    if (websocketData !== undefined && !dataReceived) {
      console.log(`[TreeView] Setting dataReceived to true at ${performance.now() - renderStartTime.current}ms`);
      console.log(`[TreeView] websocketData length: ${websocketData?.length || 0}`);
      setDataReceived(true);
    }
  }, [websocketData, dataReceived]);

  // Check for create=true in URL parameter to automatically open dialog
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('create') === 'true') {
      setShowCreateOptions(true);
      setActiveOption("option1");
    }
  }, [location.search]);

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
    const nodeType : string = nodeId.split(":")[0] || '';
    setContextMenu({ nodeId, x: event.clientX, y: event.clientY, nodeType: nodeType });
  }, []);

  const handleClosePanel = useCallback(() => {
    if (selectedNode) {
      setSelectedNode((prev) => (prev ? { ...prev, isOpen: false } : null));
      setTimeout(() => {
        setSelectedNode(null);
      }, 400);
    }
    if (groupPanel) {
      setGroupPanel((prev) => (prev ? { ...prev, isOpen: false } : null));
      setTimeout(() => {
        setGroupPanel(null);
      }, 400);
    }
  }, [selectedNode, groupPanel]);

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
      newEdges: CustomEdge[],
      groupItems?: ResourceItem[]
    ) => {
      const config = getNodeConfig(type.toLowerCase(), label);
      const timeAgo = getTimeAgo(timestamp);
      const cachedNode = nodeCache.current.get(id);

      const isGroupNode = id.includes(":group");
      
      // Check if this node has the highlighted label
      const hasHighlightedLabel = highlightedLabels && 
        resourceData?.metadata?.labels && 
        resourceData.metadata.labels[highlightedLabels.key] === highlightedLabels.value;

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
                  if (isGroupNode && groupItems) {
                    setGroupPanel({
                      isOpen: true,
                      namespace: namespace || "default",
                      groupType: type.toLowerCase(),
                      groupItems: groupItems,
                    });
                  } else {
                    setSelectedNode({
                      namespace: namespace || "default",
                      name: label,
                      type: type.toLowerCase(),
                      onClose: handleClosePanel,
                      isOpen: true,
                      resourceData,
                    });
                  }
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
            color: theme === "dark" ? "#fff" : "#000",
            ...(hasHighlightedLabel ? {
              boxShadow: `0 0 0 2px ${theme === "dark" ? '#41dc8e' : '#41dc8e'}`,
              backgroundColor: theme === "dark" ? 'rgba(68, 152, 255, 0.15)' : 'rgba(68, 152, 255, 0.08)',
              zIndex: 1000, // Bring highlighted nodes to front
              opacity: 1,
              transition: "all 0.2s ease-in-out"
            } : {
              // Always set default bg color even when not highlighted
              backgroundColor: theme === "dark" ? "#333" : "#fff",
              transition: "all 0.2s ease-in-out",
              ...(highlightedLabels ? {
                // If highlighting is active but this node doesn't match
                opacity: 0.5
              } : {})
            }),
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          isGroup: isGroupNode,
        } as CustomNode);

      // If the node is already cached but highlighting changed, update style
      if (cachedNode) {
        // Always update theme-dependent styles for cached nodes
        node.style = {
          ...node.style,
          backgroundColor: hasHighlightedLabel 
            ? (theme === "dark" ? 'rgba(68, 152, 255, 0.15)' : 'rgba(68, 152, 255, 0.08)')
            : (theme === "dark" ? "#333" : "#fff"),
          color: theme === "dark" ? "#fff" : "#000",
          ...(hasHighlightedLabel ? {
            boxShadow: `0 0 0 2px ${theme === "dark" ? '#41dc8e' : '#41dc8e'}`,
            zIndex: 1000,
            opacity: 1,
            transition: "all 0.2s ease-in-out"
          } : highlightedLabels ? {
            boxShadow: 'none',
            zIndex: 0,
            opacity: 0.5,
            transition: "all 0.2s ease-in-out"
          } : {}),
        };
      }

      if (!cachedNode) nodeCache.current.set(id, node);
      newNodes.push(node);

      // Add direct edge from parent to node if it's a parent-child relationship
      if (parent && isExpanded) {
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
            style: { stroke: theme === "dark" ? "#777" : "#a3a3a3", strokeDasharray: "2,2" },
            markerEnd: { type: MarkerType.ArrowClosed, color: theme === "dark" ? "#777" : "#a3a3a3" },
          };
          newEdges.push(edge);
          edgeCache.current.set(edgeId, edge);
        } else {
          // Update the cached edge with current theme colors
          const updatedEdge = {
            ...cachedEdge,
            style: { stroke: theme === "dark" ? "#777" : "#a3a3a3", strokeDasharray: "2,2" },
            markerEnd: { type: MarkerType.ArrowClosed, color: theme === "dark" ? "#777" : "#a3a3a3" }
          };
          newEdges.push(updatedEdge);
        }
      }
    },
    [getTimeAgo, handleClosePanel, handleMenuOpen, theme, isExpanded, highlightedLabels]
  );

  const handleContextFilter = useCallback((context: string) => {
    setFilteredContext(context);
  }, []);

  const transformDataToTree = useCallback(
    (data: NamespaceResource[]) => {
      setIsTransforming(true);
      
      try {
        // Clear caches to ensure proper redraw with current theme
        nodeCache.current.clear();
        edgeCache.current.clear();
        edgeIdCounter.current = 0;

        const newNodes: CustomNode[] = [];
        const newEdges: CustomEdge[] = [];
        
        // Filter by selected context if not "all"
        const filteredData = filteredContext === "all" 
          ? data 
          : data.filter((namespace) => namespace.context === filteredContext);

        if (filteredData && filteredData.length > 0) {
          // First, create all context nodes
          filteredData.forEach((namespace: NamespaceResource) => {
            const contextId = `context:${namespace.context}`;
            createNode(
              contextId,
              namespace.context,
              "context",
              "Active",
              "",
              undefined,
              undefined,
              null,
              newNodes,
              newEdges
            );
          });

          // If expanded, add namespace nodes and their children
          if (isExpanded) {
            filteredData.forEach((namespace: NamespaceResource) => {
              const contextId = `context:${namespace.context}`;
              const namespaceId = `ns:${namespace.name}`;
              createNode(
                namespaceId,
                namespace.name,
                "namespace",
                namespace.status,
                "",
                namespace.name,
                { apiVersion: "v1", kind: "Namespace", metadata: { name: namespace.name, namespace: namespace.name, creationTimestamp: "", labels: namespace.labels }, status: { phase: namespace.status } },
                contextId,
                newNodes,
                newEdges
              );

              const resourcesMap: ResourcesMap = {
                endpoints: namespace.resources[".v1/endpoints"] || [],
                endpointSlices: namespace.resources["discovery.k8s.io.v1/endpointslices"] || [],
                ...namespace.resources,
              };

              if (isCollapsed) {
                const resourceGroups: Record<string, ResourceItem[]> = {};

                Object.entries(resourcesMap).forEach(([key, items]) => {
                  console.log(key);
                  items.forEach((item: ResourceItem) => {
                    const kindLower = item.kind.toLowerCase();
                    if (!resourceGroups[kindLower]) {
                      resourceGroups[kindLower] = [];
                    }
                    resourceGroups[kindLower].push(item);
                  });
                });

                Object.entries(resourceGroups).forEach(([kindLower, items]) => {
                  const count = items.length;
                  const groupId = `ns:${namespace.name}:${kindLower}:group`;
                  const status = items.some(item => item.status?.conditions?.some((c) => c.type === "Available" && c.status === "True")) ? "Active" : "Inactive";
                  const label = `${count} ${kindLower}${count !== 1 ? "s" : ""}`;

                  createNode(
                    groupId,
                    label,
                    kindLower,
                    status,
                    items[0]?.metadata.creationTimestamp,
                    namespace.name,
                    items[0],
                    namespaceId,
                    newNodes,
                    newEdges,
                    items
                  );
                });
              } else {
                Object.values(resourcesMap)
                  .flat()
                  .forEach((item: ResourceItem, index: number) => {
                    const kindLower = item.kind.toLowerCase();
                    const resourceId = `ns:${namespace.name}:${kindLower}:${item.metadata.name}:${index}`;
                    const status = item.status?.conditions?.some((c) => c.type === "Available" && c.status === "True") ? "Active" : "Inactive";

                    createNode(resourceId, item.metadata.name, kindLower, status, item.metadata.creationTimestamp, namespace.name, item, namespaceId, newNodes, newEdges);

                    switch (kindLower) {
                      case "configmap":
                        createNode(`${resourceId}:volume`, `volume-${item.metadata.name}`, "volume", status, undefined, namespace.name, {
                          ...item,
                          kind: "Volume",
                          parentConfigMap: {
                            name: item.metadata.name,
                            namespace: namespace.name,
                            kind: "ConfigMap"
                          },
                          spec: {
                            configMap: {
                              name: item.metadata.name,
                              items: item.data ? Object.keys(item.data).map(key => ({ key, path: key })) : []
                            }
                          }
                        }, resourceId, newNodes, newEdges);
                        
                        createNode(`${resourceId}:envvar`, `envvar-${item.metadata.name}`, "envvar", status, undefined, namespace.name, {
                          ...item,
                          kind: "EnvVar",
                          parentConfigMap: {
                            name: item.metadata.name,
                            namespace: namespace.name,
                            kind: "ConfigMap"
                          }
                        }, resourceId, newNodes, newEdges);
                        break;

                      case "clusterrolebinding": {
                        const crbClusterRoleId = `${resourceId}:clusterrole`;
                        createNode(crbClusterRoleId, `clusterrole-${item.metadata.name}`, "clusterrole", status, undefined, namespace.name, {
                          apiVersion: "rbac.authorization.k8s.io/v1",
                          kind: "ClusterRole",
                          metadata: {
                            name: item.roleRef?.name || `${item.metadata.name}-clusterrole`,
                            namespace: namespace.name,
                            creationTimestamp: item.metadata.creationTimestamp
                          },
                          parentClusterRoleBinding: {
                            name: item.metadata.name,
                            namespace: namespace.name,
                            kind: "ClusterRoleBinding"
                          },
                          rules: []
                        }, resourceId, newNodes, newEdges);
                        
                        // User subject for clusterrole
                        createNode(`${crbClusterRoleId}:user`, `user-${item.metadata.name}`, "user", status, undefined, namespace.name, {
                          apiVersion: "rbac.authorization.k8s.io/v1",
                          kind: "User",
                          metadata: {
                            name: item.subjects?.find(s => s.kind === "User")?.name || `${item.metadata.name}-user`,
                            namespace: namespace.name,
                            creationTimestamp: item.metadata.creationTimestamp
                          },
                          parentClusterRole: {
                            name: item.roleRef?.name || `${item.metadata.name}-clusterrole`,
                            namespace: namespace.name,
                            kind: "ClusterRole"
                          },
                          parentClusterRoleBinding: {
                            name: item.metadata.name,
                            namespace: namespace.name,
                            kind: "ClusterRoleBinding"
                          }
                        }, crbClusterRoleId, newNodes, newEdges);
                        
                        // ServiceAccount subject for clusterrole
                        createNode(`${crbClusterRoleId}:serviceaccount`, `serviceaccount-${item.metadata.name}`, "serviceaccount", status, undefined, namespace.name, {
                          apiVersion: "v1",
                          kind: "ServiceAccount",
                          metadata: {
                            name: item.subjects?.find(s => s.kind === "ServiceAccount")?.name || `${item.metadata.name}-sa`,
                            namespace: namespace.name,
                            creationTimestamp: item.metadata.creationTimestamp
                          },
                          parentClusterRole: {
                            name: item.roleRef?.name || `${item.metadata.name}-clusterrole`,
                            namespace: namespace.name,
                            kind: "ClusterRole"
                          },
                          parentClusterRoleBinding: {
                            name: item.metadata.name,
                            namespace: namespace.name,
                            kind: "ClusterRoleBinding"
                          }
                        }, crbClusterRoleId, newNodes, newEdges);
                        
                        // Group subject for clusterrole
                        createNode(`${crbClusterRoleId}:group`, `group-${item.metadata.name}`, "group", status, undefined, namespace.name, {
                          apiVersion: "rbac.authorization.k8s.io/v1",
                          kind: "Group",
                          metadata: {
                            name: item.subjects?.find(s => s.kind === "Group")?.name || `${item.metadata.name}-group`,
                            namespace: namespace.name,
                            creationTimestamp: item.metadata.creationTimestamp
                          },
                          parentClusterRole: {
                            name: item.roleRef?.name || `${item.metadata.name}-clusterrole`,
                            namespace: namespace.name,
                            kind: "ClusterRole"
                          },
                          parentClusterRoleBinding: {
                            name: item.metadata.name,
                            namespace: namespace.name,
                            kind: "ClusterRoleBinding"
                          }
                        }, crbClusterRoleId, newNodes, newEdges);
                        break;
                      }

                      case "customresourcedefinition": {
                        const crdCrId = `${resourceId}:customresource`;
                        createNode(crdCrId, `cr-${item.metadata.name}`, "customresource", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
                        createNode(`${crdCrId}:controller`, `controller-${item.metadata.name}`, "controller", status, undefined, namespace.name, item, crdCrId, newNodes, newEdges);
                        break;
                      }

                      case "clusterrole": {
                        const crClusterRoleBindingId = `${resourceId}:clusterrolebinding`;
                        createNode(crClusterRoleBindingId, `clusterrolebinding-${item.metadata.name}`, "clusterrolebinding", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
                        createNode(`${crClusterRoleBindingId}:user`, `user-${item.metadata.name}`, "user", status, undefined, namespace.name, item, crClusterRoleBindingId, newNodes, newEdges);
                        createNode(`${crClusterRoleBindingId}:group`, `group-${item.metadata.name}`, "group", status, undefined, namespace.name, item, crClusterRoleBindingId, newNodes, newEdges);
                        createNode(`${crClusterRoleBindingId}:serviceaccount`, `serviceaccount-${item.metadata.name}`, "serviceaccount", status, undefined, namespace.name, item, crClusterRoleBindingId, newNodes, newEdges);
                        break;
                      }

                      case "cronjob":
                        createNode(`${resourceId}:job`, `job-${item.metadata.name}`, "job", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
                        break;

                      case "deployment":
                        break;

                      case "daemonset":
                        break;

                      case "service":
                        createNode(`${resourceId}:endpoints`, `endpoints-${item.metadata.name}`, "endpoints", status, undefined, namespace.name, {
                          apiVersion: "v1",
                          kind: "Endpoints",
                          metadata: {
                            name: item.metadata.name,
                            namespace: namespace.name,
                            creationTimestamp: item.metadata.creationTimestamp,
                            labels: item.metadata.labels
                          },
                          parentService: {
                            name: item.metadata.name,
                            namespace: namespace.name,
                            kind: "Service"
                          },
                          subsets: item.subsets || [],
                          ports: item.spec?.ports || []
                        }, resourceId, newNodes, newEdges);
                        break;

                      case "endpoints":
                        break;

                      case "group":
                        createNode(`${resourceId}:user`, `user-${item.metadata.name}`, "user", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
                        break;

                      case "horizontalpodautoscaler":
                        createNode(`${resourceId}:deployment`, `deployment-${item.metadata.name}`, "deployment", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
                        createNode(`${resourceId}:replicaset`, `replicaset-${item.metadata.name}`, "replicaset", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
                        createNode(`${resourceId}:statefulset`, `statefulset-${item.metadata.name}`, "statefulset", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
                        break;

                      case "ingress": {
                        const ingControllerId = `${resourceId}:ingresscontroller`;
                        createNode(ingControllerId, `ingresscontroller-${item.metadata.name}`, "ingresscontroller", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
                        createNode(`${ingControllerId}:service`, `service-${item.metadata.name}`, "service", status, undefined, namespace.name, item, ingControllerId, newNodes, newEdges);
                        break;
                      }

                      case "job":
                        break;

                      case "limitrange":
                        createNode(`${resourceId}:namespace`, `namespace-${item.metadata.name}`, "namespace", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
                        break;

                      case "networkpolicy":
                        break;

                      case "podsecuritypolicy":
                        break;

                      case "persistentvolume":
                        createNode(`${resourceId}:persistentvolumeclaim`, `pvc-${item.metadata.name}`, "persistentvolumeclaim", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
                        break;

                      case "persistentvolumeclaim":
                        createNode(`${resourceId}:persistentvolume`, `pv-${item.metadata.name}`, "persistentvolume", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
                        break;

                      case "resourcequota":
                        createNode(`${resourceId}:namespace`, `namespace-${item.metadata.name}`, "namespace", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
                        break;

                      case "rolebinding": {
                        const rbRoleId = `${resourceId}:role`;
                        createNode(rbRoleId, `role-${item.metadata.name}`, "role", status, undefined, namespace.name, {
                          apiVersion: "rbac.authorization.k8s.io/v1",
                          kind: "Role",
                          metadata: {
                            name: item.roleRef?.name || `${item.metadata.name}-role`,
                            namespace: namespace.name,
                            creationTimestamp: item.metadata.creationTimestamp
                          },
                          parentRoleBinding: {
                            name: item.metadata.name,
                            namespace: namespace.name,
                            kind: "RoleBinding"
                          },
                          rules: []
                        }, resourceId, newNodes, newEdges);
                        
                        // User subject for role
                        createNode(`${rbRoleId}:user`, `user-${item.metadata.name}`, "user", status, undefined, namespace.name, {
                          apiVersion: "rbac.authorization.k8s.io/v1",
                          kind: "User",
                          metadata: {
                            name: item.subjects?.find(s => s.kind === "User")?.name || `${item.metadata.name}-user`,
                            namespace: namespace.name,
                            creationTimestamp: item.metadata.creationTimestamp
                          },
                          parentRole: {
                            name: item.roleRef?.name || `${item.metadata.name}-role`,
                            namespace: namespace.name,
                            kind: "Role"
                          },
                          parentRoleBinding: {
                            name: item.metadata.name,
                            namespace: namespace.name,
                            kind: "RoleBinding"
                          }
                        }, rbRoleId, newNodes, newEdges);
                        
                        // ServiceAccount subject for role
                        createNode(`${rbRoleId}:serviceaccount`, `serviceaccount-${item.metadata.name}`, "serviceaccount", status, undefined, namespace.name, {
                          apiVersion: "v1",
                          kind: "ServiceAccount",
                          metadata: {
                            name: item.subjects?.find(s => s.kind === "ServiceAccount")?.name || `${item.metadata.name}-sa`,
                            namespace: namespace.name,
                            creationTimestamp: item.metadata.creationTimestamp
                          },
                          parentRole: {
                            name: item.roleRef?.name || `${item.metadata.name}-role`,
                            namespace: namespace.name,
                            kind: "Role"
                          },
                          parentRoleBinding: {
                            name: item.metadata.name,
                            namespace: namespace.name,
                            kind: "RoleBinding"
                          }
                        }, rbRoleId, newNodes, newEdges);
                        
                        // Group subject for role
                        createNode(`${rbRoleId}:group`, `group-${item.metadata.name}`, "group", status, undefined, namespace.name, {
                          apiVersion: "rbac.authorization.k8s.io/v1",
                          kind: "Group",
                          metadata: {
                            name: item.subjects?.find(s => s.kind === "Group")?.name || `${item.metadata.name}-group`,
                            namespace: namespace.name,
                            creationTimestamp: item.metadata.creationTimestamp
                          },
                          parentRole: {
                            name: item.roleRef?.name || `${item.metadata.name}-role`,
                            namespace: namespace.name,
                            kind: "Role"
                          },
                          parentRoleBinding: {
                            name: item.metadata.name,
                            namespace: namespace.name,
                            kind: "RoleBinding"
                          }
                        }, rbRoleId, newNodes, newEdges);
                        break;
                      }

                      case "role":
                        createNode(`${resourceId}:namespace`, `namespace-${item.metadata.name}`, "namespace", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
                        break;

                      case "replicaset":
                        break;

                      case "serviceaccount":
                        break;

                      case "storageclass":
                        createNode(`${resourceId}:persistentvolume`, `pv-${item.metadata.name}`, "persistentvolume", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
                        break;

                      case "secret":
                        createNode(`${resourceId}:volume`, `volume-${item.metadata.name}`, "volume", status, undefined, namespace.name, {
                          ...item,
                          kind: "Volume",
                          parentSecret: {
                            name: item.metadata.name,
                            namespace: namespace.name,
                            kind: "Secret"
                          },
                          spec: {
                            secret: {
                              secretName: item.metadata.name,
                              items: item.data ? Object.keys(item.data).map(key => ({ key, path: key })) : []
                            }
                          }
                        }, resourceId, newNodes, newEdges);
                        
                        createNode(`${resourceId}:envvar`, `envvar-${item.metadata.name}`, "envvar", status, undefined, namespace.name, {
                          ...item,
                          kind: "EnvVar",
                          parentSecret: {
                            name: item.metadata.name,
                            namespace: namespace.name,
                            kind: "Secret"
                          }
                        }, resourceId, newNodes, newEdges);
                        break;

                      case "statefulset":
                        break;

                      case "user":
                        createNode(`${resourceId}:role`, `role-${item.metadata.name}`, "role", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
                        createNode(`${resourceId}:clusterrole`, `clusterrole-${item.metadata.name}`, "clusterrole", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
                        break;

                      case "volume":
                        break;

                      default:
                        break;
                    }
                  });
              }
            });
          }
        }

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges, "LR", prevNodes);
        ReactDOM.unstable_batchedUpdates(() => {
          setNodes(layoutedNodes);
          setEdges(layoutedEdges);
          setIsTransforming(false);
        });
        prevNodes.current = layoutedNodes;

        // Calculate resource counts for context filtering
        const tempContextCounts: Record<string, number> = {};
        let tempTotalCount = 0;
        
        // Count resources by context
        data.forEach(namespace => {
          // Get the context for this namespace
          const context = namespace.context || "default";
          
          // Count all resources in this namespace
          let namespaceResourceCount = 0;
          Object.keys(namespace.resources).forEach(resourceType => {
            const resourceList = namespace.resources[resourceType];
            if (Array.isArray(resourceList)) {
              namespaceResourceCount += resourceList.length;
            }
          });
          
          // Add to context count
          tempContextCounts[context] = (tempContextCounts[context] || 0) + namespaceResourceCount;
          tempTotalCount += namespaceResourceCount;
        });
        
        // Update counts
        setContextResourceCounts(tempContextCounts);
        setTotalResourceCount(tempTotalCount);
        
        console.log("[TreeViewComponent] Tree resources calculated:", {
          byContext: tempContextCounts,
          total: tempTotalCount
        });
      } catch (error) {
        console.error("Error transforming data to tree:", error);
      } finally {
        setIsTransforming(false);
      }
    },
    [filteredContext, isCollapsed, isExpanded, createNode]
  );

  useEffect(() => {
    if (websocketData !== undefined) {
      console.log(
        `[TreeView] websocketData received with ${websocketData.length} namespaces at ${performance.now() - renderStartTime.current}ms`
      );
      setIsTransforming(true);
      transformDataToTree(websocketData);
    }
  }, [websocketData, transformDataToTree]);

  useEffect(() => {
    console.log(`[TreeView] State update at ${performance.now() - renderStartTime.current}ms`);
    console.log(`[TreeView] isConnected: ${isConnected}, hasValidData: ${hasValidData}, isTransforming: ${isTransforming}, minimumLoadingTimeElapsed: ${minimumLoadingTimeElapsed}, nodes: ${nodes.length}, edges: ${edges.length}`);
    if (nodes.length > 0 || edges.length > 0) {
      console.log(
        `[TreeView] Rendered successfully with ${nodes.length} nodes and ${edges.length} edges`
      );
    } else {
      console.log(`[TreeView] Nodes and edges are empty`);
    }
  }, [nodes, edges, isConnected, hasValidData, isTransforming, minimumLoadingTimeElapsed, dataReceived]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((selectedNode?.isOpen || groupPanel?.isOpen) && panelRef.current && !panelRef.current.contains(event.target as Node)) {
        if (selectedNode?.isOpen) {
          setSelectedNode((prev) => (prev ? { ...prev, isOpen: false } : null));
          setTimeout(() => {
            setSelectedNode(null);
          }, 400);
        }
        if (groupPanel?.isOpen) {
          setGroupPanel((prev) => (prev ? { ...prev, isOpen: false } : null));
          setTimeout(() => {
            setGroupPanel(null);
          }, 400);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedNode, groupPanel]);

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
        console.log(`[TreeView] Node "${nodeName}" and its ${descendantNodeIds.length} descendants deleted successfully at ${performance.now() - renderStartTime.current}ms`);
      } catch (error) {
        console.error(`[TreeView] Failed to delete node ${nodeId} at ${performance.now() - renderStartTime.current}ms:`, error);
        setSnackbarMessage(`Failed to delete "${nodeName}"`);
        setSnackbarSeverity("error");
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

          if (node.id.startsWith("ns:") && nodeIdParts.length === 2) {
            nodeType = "namespace";
            namespace = nodeIdParts[1];
          } else if (nodeIdParts.length >= 4) {
            namespace = nodeIdParts[1];
            nodeType = nodeIdParts[2];
          } else if(node.id.startsWith("context:") && nodeIdParts.length === 2){
            nodeType = "context";
            namespace = nodeIdParts[0];
          } else {
            console.error(`[TreeView] Invalid node ID format: ${node.id}`);
            return;
          }
          const resourceData = node.data.label.props.resourceData;
          switch (action) {
            case "Details":
              if (node.isGroup && resourceData) {
                setGroupPanel({
                  isOpen: true,
                  namespace: namespace || "default",
                  groupType: nodeType,
                  groupItems: nodeCache.current.get(node.id)?.data.label.props.resourceData ? [resourceData] : [],
                });
              } else {
                setSelectedNode({
                  namespace: namespace || "default",  
                  name: nodeName,
                  type: nodeType,
                  onClose: handleClosePanel,
                  isOpen: true,
                  resourceData,
                  initialTab: 0,
                });
              }
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
              });
              break;
            default:
              break;
          }
        }
      }
      handleMenuClose();
    },
    [contextMenu, nodes, handleClosePanel, handleMenuClose]
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

  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev);
    setIsTransforming(true);
    transformDataToTree(websocketData);
  }, [websocketData, transformDataToTree]);

  const handleExpandAll = useCallback(() => {
    setIsExpanded(true);
    setIsTransforming(true);
    transformDataToTree(websocketData);
  }, [websocketData, transformDataToTree]);

  const handleCollapseAll = useCallback(() => {
    setIsExpanded(false);
    setIsTransforming(true);
    transformDataToTree(websocketData);
  }, [websocketData, transformDataToTree]);

  const isLoading = !isConnected || !hasValidData || isTransforming || !minimumLoadingTimeElapsed;

  useEffect(() => {
    // Only log to console when specific values change to reduce unnecessary renders
    const logState = () => {
      console.log(`[TreeView] Rendering decision at ${performance.now() - renderStartTime.current}ms`);
      console.log(`[TreeView] isLoading: ${isLoading}, nodes: ${nodes.length}, edges: ${edges.length}`);
      if (isLoading) {
        console.log(`[TreeView] Showing loading spinner because isLoading is true`);
      } else if (nodes.length > 0 || edges.length > 0) {
        console.log(`[TreeView] Showing React Flow canvas with ${nodes.length} nodes and ${edges.length} edges`);
      } else {
        console.log(`[TreeView] Showing "No Workloads Found" because nodes and edges are empty`);
      }
    };

    // Only call logState for actual rendering changes
    logState();
  }, [isLoading, nodes, edges, dataReceived, isConnected, isTransforming, minimumLoadingTimeElapsed]);

  // Update resource handling for initial data load - this runs for both view modes
  useEffect(() => {
    if (dataReceived && !isTransforming) {
      // When data is initially received, do a preliminary count regardless of view mode
      if (websocketData && Array.isArray(websocketData)) {
        try {
          // Calculate resource counts for context filtering
          const initialContextCounts: Record<string, number> = {};
          let initialTotalCount = 0;
          
          websocketData.forEach(namespace => {
            // Get the context for this namespace
            const context = namespace.context || "default";
            
            // Count all resources in this namespace
            let namespaceResourceCount = 0;
            Object.keys(namespace.resources).forEach(resourceType => {
              const resourceList = namespace.resources[resourceType];
              if (Array.isArray(resourceList)) {
                namespaceResourceCount += resourceList.length;
              }
            });
            
            // Add to context count
            initialContextCounts[context] = (initialContextCounts[context] || 0) + namespaceResourceCount;
            initialTotalCount += namespaceResourceCount;
          });
          
          // Update counts - only if we don't already have counts from ListView
          if (totalResourceCount === 0) {
            setContextResourceCounts(initialContextCounts);
            setTotalResourceCount(initialTotalCount);
            
            console.log("[TreeViewComponent] Initial resources calculated:", {
              byContext: initialContextCounts,
              total: initialTotalCount
            });
          }
        } catch (error) {
          console.error("Error calculating initial resource counts:", error);
        }
      }
    }
  }, [dataReceived, websocketData, isTransforming, totalResourceCount]);

  // Handle resource data changes from ListViewComponent
  const handleResourceDataChange = useCallback((data: ResourceDataChangeEvent) => {
    // Only update counts if we're in list view to avoid overriding tree view counts
    if (viewMode === 'list') {
      setResources(data.resources as unknown as ResourceItem[]);
      setContextResourceCounts(data.contextCounts);
      setTotalResourceCount(data.totalCount);
      
      console.log("[TreeViewComponent] List view resource data received:", {
        totalResources: data.totalCount,
        filteredCount: data.filteredResources.length,
        contextCounts: data.contextCounts
      });
    }
  }, [viewMode]);

  // Within the TreeViewComponent function, add this useEffect
  useEffect(() => {
    // This effect runs when the view mode changes
    // Recalculate resource counts when switching back to tree view
    if (viewMode === 'tiles' && websocketData && Array.isArray(websocketData)) {
      try {
        // Calculate resource counts for tree view specifically
        const treeViewContextCounts: Record<string, number> = {};
        let treeViewTotalCount = 0;
        
        websocketData.forEach(namespace => {
          // Get the context for this namespace
          const context = namespace.context || "default";
          
          // Count all resources in this namespace
          let namespaceResourceCount = 0;
          Object.keys(namespace.resources).forEach(resourceType => {
            const resourceList = namespace.resources[resourceType];
            if (Array.isArray(resourceList)) {
              namespaceResourceCount += resourceList.length;
            }
          });
          
          // Add to context count
          treeViewContextCounts[context] = (treeViewContextCounts[context] || 0) + namespaceResourceCount;
          treeViewTotalCount += namespaceResourceCount;
        });
        
        // Update counts
        setContextResourceCounts(treeViewContextCounts);
        setTotalResourceCount(treeViewTotalCount);
        
        console.log("[TreeViewComponent] Tree view activated, recalculated resource counts:", {
          byContext: treeViewContextCounts,
          total: treeViewTotalCount
        });
      } catch (error) {
        console.error("Error calculating tree view resource counts:", error);
      }
    }
  }, [viewMode, websocketData]);

  // Add a specific effect to handle theme changes
  useEffect(() => {
    if (nodes.length > 0) {
      console.log("[TreeView] Theme changed, updating node styles");
      
      // Update node styles when theme changes without recreating the nodes
      setNodes(currentNodes => {
        // Create a new array with updated styles but preserve all other node properties
        const updatedNodes = currentNodes.map(node => {
          // Extract resourceData from node label props
          const resourceData = node.data?.label?.props?.resourceData;
          
          // Check if this node has the highlighted label
          const hasHighlightedLabel = 
            resourceData?.metadata?.labels && 
            highlightedLabels &&
            resourceData.metadata.labels[highlightedLabels.key] === highlightedLabels.value;
          
          // Create a new style object with the correct properties
          const newStyle = {
            ...node.style,
            backgroundColor: hasHighlightedLabel 
              ? (theme === "dark" ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.12)')
              : (theme === "dark" ? "#333" : "#fff"),
            color: theme === "dark" ? "#fff" : "#000",
            boxShadow: hasHighlightedLabel 
              ? `0 0 0 2px ${theme === "dark" ? '#41dc8e' : '#41dc8e'}`
              : 'none',
            transition: "all 0.2s ease-in-out"
          };
          
          // Return the node with updated style
          return {
            ...node,
            style: newStyle
          };
        });
        
        return updatedNodes;
      });
    }
  }, [theme, nodes.length, highlightedLabels]);

  // Force a re-render when highlighted labels change
  useEffect(() => {
    if (dataReceived && websocketData) {
      console.log("[TreeView] Highlighted labels changed, updating node styles");
      
      // Update node styles directly based on highlighted labels without recreating the nodes
      setNodes(currentNodes => {
        // Create a new array with updated styles but preserve all other node properties
        const updatedNodes = currentNodes.map(node => {
          // Extract resourceData from node label props
          const resourceData = node.data?.label?.props?.resourceData;
          
          // Check if this node has the highlighted label
          const hasHighlightedLabel = 
            resourceData?.metadata?.labels && 
            highlightedLabels &&
            resourceData.metadata.labels[highlightedLabels.key] === highlightedLabels.value;
          
          // Create a new style object with the correct properties
          const newStyle = {
            ...node.style,
            boxShadow: hasHighlightedLabel 
              ? `0 0 0 2px #2F86FF` 
              : 'none',
            backgroundColor: hasHighlightedLabel 
              ? (theme === "dark" ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.12)')
              : (theme === "dark" ? "#333" : "#fff"),
            color: theme === "dark" ? "#fff" : "#000",
            zIndex: hasHighlightedLabel ? 1000 : 0,
            opacity: !highlightedLabels ? 1 : (hasHighlightedLabel ? 1 : 0.5),
            transition: "all 0.2s ease-in-out"
          };
          
          // Return the node with updated style
          return {
            ...node,
            style: newStyle
          };
        });
        
        return updatedNodes;
      });
    }
  }, [highlightedLabels, dataReceived, websocketData, theme]);

  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <Box ref={containerRef} sx={{ display: "flex", height: "85vh", width: "100%", position: "relative" }}>
      <Box
        sx={{
          flex: 1,
          position: "relative",
          filter: (selectedNode?.isOpen || groupPanel?.isOpen) ? "blur(5px)" : "none",
          transition: "filter 0.2s ease-in-out",
          pointerEvents: (selectedNode?.isOpen || groupPanel?.isOpen) ? "none" : "auto",
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
            Manage Workloads
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <ContextDropdown 
              onContextFilter={handleContextFilter} 
              resourceCounts={contextResourceCounts}
              totalResourceCount={totalResourceCount}
            />
            <IconButton
              color={viewMode === 'tiles' ? "primary" : "default"}
              onClick={() => setViewMode('tiles')}
              sx={{ 
                  padding: 1,
                  borderRadius: "50%",
                  width: 40,         
                  height: 40,         
                  
                  bgcolor: theme === "dark" && viewMode === 'tiles' ? "rgba(144, 202, 249, 0.15)" : "transparent",
                  "&:hover": {
                    bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                  }
              }}
            >
              <span>
                <i 
                  className="fa fa-th menu_icon" 
                  title="Tiles"
                  style={{ 
                    color: theme === "dark" 
                      ? viewMode === 'tiles' ? "#90CAF9" : "#FFFFFF" 
                      : undefined 
                  }}
                ></i>
              </span>
            </IconButton>
            <IconButton
              color={viewMode === 'list' ? "primary" : "default"}
              onClick={() => setViewMode('list')}
              sx={{
                padding: 1,
                borderRadius: "50%", 
                width: 40,         
                height: 40,         
                
                bgcolor: theme === "dark" && viewMode === 'list' ? "rgba(144, 202, 249, 0.15)" : "transparent",
                "&:hover": {
                  bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                }
              }}
            >
              <span>
                <i 
                  className="fa fa-th-list selected menu_icon" 
                  title="List"
                  style={{ 
                    color: theme === "dark" 
                      ? viewMode === 'list' ? "#90CAF9" : "#FFFFFF" 
                      : undefined 
                  }}
                ></i>
              </span>
            </IconButton>
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
        </Box>

        {showCreateOptions && <CreateOptions activeOption={activeOption} setActiveOption={setActiveOption} onCancel={handleCancelCreateOptions} />}

        <Box 
          sx={{ 
            width: "100%", 
            padding: "8px 16px",
            backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
            borderRadius: "4px",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center"
          }}
        >
          <Typography variant="body2" sx={{ color: theme === "dark" ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.6)" }}>
            Note: Default, Kubernetes system, and OpenShift namespaces are filtered out from this view.
          </Typography>
        </Box>

        {filteredContext !== "all" && (
          <Box 
            sx={{ 
              width: "100%", 
              padding: "8px 16px",
              backgroundColor: theme === "dark" ? "rgba(144, 202, 249, 0.08)" : "rgba(25, 118, 210, 0.08)",
              borderRadius: "4px",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center"
            }}
          >
            <Typography variant="body2" sx={{ color: theme === "dark" ? "#90CAF9" : "#1976d2" }}>
              Filtering: Showing only resources from the <strong>{filteredContext}</strong> context.
            </Typography>
          </Box>
        )}

        <Box sx={{ width: "100%", height: "calc(100% - 80px)", position: "relative" }}>
          {isLoading ? (
            viewMode === 'list' ? (
              <ListViewSkeleton itemCount={8} />
            ) : (
              <TreeViewSkeleton />
            )
          ) : viewMode === 'tiles' && (nodes.length > 0 || edges.length > 0) ? (
            <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
              <ReactFlowProvider>
                <FlowCanvas nodes={nodes} edges={edges} renderStartTime={renderStartTime} theme={theme} />
                <ZoomControls theme={theme} onToggleCollapse={handleToggleCollapse} isCollapsed={isCollapsed} onExpandAll={handleExpandAll} onCollapseAll={handleCollapseAll} />
                <FullScreenToggle 
                  containerRef={containerRef} 
                  position="top-right" 
                  tooltipPosition="left"
                  tooltipText="Toggle fullscreen view" 
                />
              </ReactFlowProvider>
            </Box>
          ) : viewMode === 'list' ? (
            <ListViewComponent 
              filteredContext={filteredContext} 
              onResourceDataChange={handleResourceDataChange}
            />
          ) : (
            <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
              <ReactFlowProvider>
                <FlowCanvas nodes={[]} edges={[]} renderStartTime={renderStartTime} theme={theme} />
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 10,
                  }}
                >
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, backgroundColor: theme === "dark" ? "rgba(15, 23, 42, 0.8)" : "rgba(255, 255, 255, 0.8)", padding: 4, borderRadius: 2 }}>
                    <Typography sx={{ color: theme === "dark" ? "#fff" : "#333", fontWeight: 500, fontSize: "22px" }}>
                      No Workloads Found
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme === "dark" ? "rgba(255, 255, 255, 0.7)" : "#00000099", fontSize: "17px", mb: 2 }}>
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
                <FullScreenToggle 
                  containerRef={containerRef} 
                  position="top-right" 
                  tooltipPosition="left"
                  tooltipText="Toggle fullscreen view" 
                />
              </ReactFlowProvider>
            </Box>
          )}

          {contextMenu && (
            <Menu
              open={Boolean(contextMenu)}
              onClose={handleMenuClose}
              anchorReference="anchorPosition"
              anchorPosition={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined}
              PaperProps={{
                style: {
                  backgroundColor: theme === "dark" ? "#1F2937" : "#fff",
                  color: theme === "dark" ? "#fff" : "inherit",
                  boxShadow: theme === "dark" ? "0 4px 20px rgba(0, 0, 0, 0.5)" : "0 4px 20px rgba(0, 0, 0, 0.15)"
                }
              }}
            >
              <MenuItem 
                onClick={() => handleMenuAction("Details")}
                sx={{
                  color: theme === "dark" ? "#fff" : "inherit",
                  "&:hover": {
                    backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)"
                  }
                }}
              >
                Details
              </MenuItem>
              {contextMenu.nodeType !== "context" && (
                <React.Fragment>
                  <MenuItem 
                    onClick={() => handleMenuAction("Delete")}
                    sx={{
                      color: theme === "dark" ? "#fff" : "inherit",
                      "&:hover": {
                        backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)"
                      }
                    }}
                  >
                    Delete
                  </MenuItem>
                  <MenuItem 
                    onClick={() => handleMenuAction("Edit")}
                    sx={{
                      color: theme === "dark" ? "#fff" : "inherit",
                      "&:hover": {
                        backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)"
                      }
                    }}
                  >
                    Edit
                  </MenuItem>
                  <MenuItem 
                    onClick={() => handleMenuAction("Logs")}
                    sx={{
                      color: theme === "dark" ? "#fff" : "inherit",
                      "&:hover": {
                        backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)"
                      }
                    }}
                  >
                    Logs
                  </MenuItem>
                </React.Fragment>
              )}
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
        {selectedNode && (
          <DynamicDetailsPanel
            namespace={selectedNode.namespace}
            name={selectedNode.name}
            type={selectedNode.type}
            resourceData={selectedNode.resourceData}
            onClose={handleClosePanel}
            isOpen={selectedNode.isOpen}
            initialTab={selectedNode.initialTab}
            onDelete={deleteNodeDetails ? () => handleDeleteNode(
              deleteNodeDetails.namespace,
              deleteNodeDetails.nodeType,
              deleteNodeDetails.nodeName,
              deleteNodeDetails.nodeId
            ) : undefined}
          />
        )}
        {groupPanel && (
          <GroupPanel
            namespace={groupPanel.namespace}
            groupType={groupPanel.groupType}
            groupItems={groupPanel.groupItems}
            onClose={handleClosePanel}
            isOpen={groupPanel.isOpen}
            onItemSelect={(item) => {
              setSelectedNode({
                namespace: groupPanel.namespace,
                name: item.metadata.name,
                type: groupPanel.groupType,
                onClose: handleClosePanel,
                isOpen: true,
                resourceData: item,
              });
              setGroupPanel((prev) => (prev ? { ...prev, isOpen: false } : null));
              setTimeout(() => {
                setGroupPanel(null);
              }, 400);
            }}
          />
        )}
      </div>
    </Box>
  );
};


export default memo(TreeViewComponent);