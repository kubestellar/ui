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
import user from "../assets/k8s_resources_logo/user.svg";
import vol from "../assets/k8s_resources_logo/vol.svg";
import { Plus } from "lucide-react";
import CreateOptions from "../components/CreateOptions";
import { NodeLabel } from "../components/Wds_Topology/NodeLabel";
import { ZoomControls } from "../components/Wds_Topology/ZoomControls";
import { FlowCanvas } from "../components/Wds_Topology/FlowCanvas";
import LoadingFallback from "./LoadingFallback";
import DynamicDetailsPanel from "./DynamicDetailsPanel";
import ReactDOM from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { isEqual } from "lodash";
import { useWebSocket } from "../context/WebSocketProvider";
import useTheme from "../stores/themeStore";
import axios from "axios";
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

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
  ports?: Array<{ name?: string; port?: number }>;
  subjects?: Array<{ name: string }>;
  roleRef?: { name: string };
  rules?: Array<{
    verbs?: string[];
    resources?: string[];
  }>;
}

export interface NamespaceResource {
  name: string;
  status: string;
  labels: Record<string, string>;
  resources: Record<string, ResourceItem[]>;
}

interface SelectedNode {
  namespace: string;
  name: string;
  type: string;
  onClose: () => void;
  isOpen: boolean;
  resourceData?: ResourceItem;
  initialTab?: number; // Add initialTab to specify which tab to open
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

// Updated getNodeConfig function to support new child node types
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

const TreeViewComponent = () => {
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

  const { isConnected, connect, hasValidData } = useWebSocket();
  const NAMESPACE_QUERY_KEY = ["namespaces"];

  const { data: namespaceData } = useQuery<NamespaceResource[]>({
    queryKey: NAMESPACE_QUERY_KEY,
    queryFn: async () => {
      throw new Error("API not implemented");
    },
    enabled: false,
    initialData: [],
  });

  useEffect(() => {
    renderStartTime.current = performance.now();
    console.log(`[TreeView] Component mounted at 0ms`);
    console.log(`[TreeView] Initial state - isConnected: ${isConnected}, dataReceived: ${dataReceived}, isTransforming: ${isTransforming}, minimumLoadingTimeElapsed: ${minimumLoadingTimeElapsed}, nodes: ${nodes.length}, edges: ${edges.length}`);
  }, []);

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
    if (namespaceData !== undefined && !dataReceived) {
      console.log(`[TreeView] Setting dataReceived to true at ${performance.now() - renderStartTime.current}ms`);
      console.log(`[TreeView] namespaceData length: ${namespaceData?.length || 0}`);
      setDataReceived(true);
    }
  }, [namespaceData, dataReceived]);

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
      const config = getNodeConfig(type.toLowerCase(), label);
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
    (data: NamespaceResource[]) => {
      const startTime = performance.now();
      console.log(`[TreeView] Starting transformDataToTree with ${data?.length || 0} namespaces at ${startTime - renderStartTime.current}ms`);

      nodeCache.current.clear();
      edgeCache.current.clear();
      edgeIdCounter.current = 0;

      const newNodes: CustomNode[] = [];
      const newEdges: CustomEdge[] = [];

      if (data && data.length > 0) {
        data.forEach((namespace: NamespaceResource) => {
          const namespaceId = `ns:${namespace.name}`;
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

          const resourcesMap: ResourcesMap = {
            endpoints: namespace.resources[".v1/endpoints"] || [],
            endpointSlices: namespace.resources["discovery.k8s.io.v1/endpointslices"] || [],
            ...namespace.resources,
          };

          Object.values(resourcesMap)
            .flat()
            .forEach((item: ResourceItem, index: number) => {
              const kindLower = item.kind.toLowerCase();
              const resourceId = `ns:${namespace.name}:${kindLower}:${item.metadata.name}:${index}`;
              const status = item.status?.conditions?.some((c) => c.type === "Available" && c.status === "True") ? "Active" : "Inactive";

              createNode(resourceId, item.metadata.name, kindLower, status, item.metadata.creationTimestamp, namespace.name, item, namespaceId, newNodes, newEdges);

              switch (kindLower) {
                case "configmap":
                  createNode(`${resourceId}:volume`, `volume-${item.metadata.name}`, "volume", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
                  createNode(`${resourceId}:envvar`, `envvar-${item.metadata.name}`, "envvar", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
                  break;

                case "clusterrolebinding": {
                  const crbClusterRoleId = `${resourceId}:clusterrole`;
                  createNode(crbClusterRoleId, `clusterrole-${item.metadata.name}`, "clusterrole", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
                  createNode(`${crbClusterRoleId}:user`, `user-${item.metadata.name}`, "user", status, undefined, namespace.name, item, crbClusterRoleId, newNodes, newEdges);
                  createNode(`${crbClusterRoleId}:serviceaccount`, `serviceaccount-${item.metadata.name}`, "serviceaccount", status, undefined, namespace.name, item, crbClusterRoleId, newNodes, newEdges);
                  createNode(`${crbClusterRoleId}:group`, `group-${item.metadata.name}`, "group", status, undefined, namespace.name, item, crbClusterRoleId, newNodes, newEdges);
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
                  createNode(`${resourceId}:replicaset`, `replicaset-${item.metadata.name}`, "replicaset", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
                  break;

                case "daemonset":
                  break;

                case "service":
                  createNode(`${resourceId}:endpoints`, `endpoints-${item.metadata.name}`, "endpoints", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
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
                  createNode(rbRoleId, `role-${item.metadata.name}`, "role", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
                  createNode(`${rbRoleId}:user`, `user-${item.metadata.name}`, "user", status, undefined, namespace.name, item, rbRoleId, newNodes, newEdges);
                  createNode(`${rbRoleId}:serviceaccount`, `serviceaccount-${item.metadata.name}`, "serviceaccount", status, undefined, namespace.name, item, rbRoleId, newNodes, newEdges);
                  createNode(`${rbRoleId}:group`, `group-${item.metadata.name}`, "group", status, undefined, namespace.name, item, rbRoleId, newNodes, newEdges);
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
                  createNode(`${resourceId}:volume`, `volume-${item.metadata.name}`, "volume", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
                  createNode(`${resourceId}:envvar`, `envvar-${item.metadata.name}`, "envvar", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
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
        });
      }

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges, "LR", prevNodes);
      ReactDOM.unstable_batchedUpdates(() => {
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        setIsTransforming(false);
      });
      prevNodes.current = layoutedNodes;

      const endTime = performance.now();
      console.log(`[TreeView] Completed transformDataToTree: ${layoutedNodes.length} nodes, ${layoutedEdges.length} edges in ${endTime - startTime}ms`);
    },
    [createNode]
  );

  useEffect(() => {
    if (namespaceData !== undefined) {
      console.log(
        `[TreeView] namespaceData received with ${namespaceData.length} namespaces at ${performance.now() - renderStartTime.current}ms`
      );
      setIsTransforming(true);
      transformDataToTree(namespaceData);
    }
  }, [namespaceData, transformDataToTree]);

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
  }, [nodes, edges, isConnected, hasValidData, isTransforming, minimumLoadingTimeElapsed]);

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

  // Function to find all descendant nodes of a given node
  const findDescendantNodes = useCallback((nodeId: string, edges: CustomEdge[]): string[] => {
    const descendants: string[] = [];
    const queue: string[] = [nodeId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      if (visited.has(currentNodeId)) continue;
      visited.add(currentNodeId);

      // Find all direct children of the current node
      const children = edges
        .filter((edge) => edge.source === currentNodeId)
        .map((edge) => edge.target);

      // Add children to descendants and queue for further traversal
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

        // Use a different endpoint for namespace deletion
        if (nodeType.toLowerCase() === "namespace") {
          endpoint = `${process.env.VITE_BASE_URL}/api/namespaces/delete/${namespace}`;
        } else {
          // For all other resource types, use the existing endpoint pattern
          const kind = nodeType.charAt(0).toUpperCase() + nodeType.slice(1); // e.g., "ingress" → "Ingress"
          const pluralForm = kindToPluralMap[kind] || `${nodeType.toLowerCase()}s`; // Fallback to adding "s" if not found
          endpoint = `${process.env.VITE_BASE_URL}/api/${pluralForm}/${namespace}/${nodeName}`;
        }

        // Send DELETE request to the backend
        await axios.delete(endpoint);

        // Find all descendant nodes of the node being deleted
        const descendantNodeIds = findDescendantNodes(nodeId, edges);
        // Include the node itself in the list of nodes to delete
        const nodesToDelete = [nodeId, ...descendantNodeIds];

        // Remove the node and its descendants from the nodes state
        setNodes((prevNodes) => {
          const remainingNodes = prevNodes.filter((n) => !nodesToDelete.includes(n.id));
          return remainingNodes;
        });

        // Remove edges that reference any of the deleted nodes (as source or target)
        setEdges((prevEdges) => {
          const remainingEdges = prevEdges.filter(
            (e) => !nodesToDelete.includes(e.source) && !nodesToDelete.includes(e.target)
          );
          return remainingEdges;
        });

        // Update caches
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
          } else {
            console.error(`[TreeView] Invalid node ID format: ${node.id}`);
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
                initialTab: 0, // Open with "SUMMARY" tab (default)
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
            case "Edit": // Handle the "Edit" action
              setSelectedNode({
                namespace: namespace || "default",
                name: nodeName,
                type: nodeType,
                onClose: handleClosePanel,
                isOpen: true,
                resourceData,
                initialTab: 1, // Open with "EDIT" tab
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
                initialTab: 2, // Open with "LOGS" tab
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

  const isLoading = !isConnected || !hasValidData || isTransforming || !minimumLoadingTimeElapsed;

  useEffect(() => {
    console.log(`[TreeView] Rendering decision at ${performance.now() - renderStartTime.current}ms`);
    console.log(`[TreeView] isLoading: ${isLoading}, nodes: ${nodes.length}, edges: ${edges.length}`);
    if (isLoading) {
      console.log(`[TreeView] Showing loading spinner because isLoading is true`);
    } else if (nodes.length > 0 || edges.length > 0) {
      console.log(`[TreeView] Showing React Flow canvas with ${nodes.length} nodes and ${edges.length} edges`);
    } else {
      console.log(`[TreeView] Showing "No Workloads Found" because nodes and edges are empty`);
    }
  }, [isLoading, nodes, edges]);

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
            Manage Workloads
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
              <MenuItem onClick={() => handleMenuAction("Edit")}>Edit</MenuItem> {/* Added Edit option */}
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
        <DynamicDetailsPanel
          namespace={selectedNode?.namespace || ""}
          name={selectedNode?.name || ""}
          type={selectedNode?.type || ""}
          resourceData={selectedNode?.resourceData}
          onClose={handleClosePanel}
          isOpen={selectedNode?.isOpen || false}
          initialTab={selectedNode?.initialTab} // Pass initialTab to DynamicDetailsPanel
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

export default memo(TreeViewComponent);