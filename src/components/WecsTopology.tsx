import { useState, useEffect, useCallback, useRef, memo } from "react";
import { Box, Typography, Menu, MenuItem, Button, Alert, Snackbar } from "@mui/material";
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
import pod from "../assets/k8s_resources_logo/pod.svg";
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
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { isEqual } from "lodash";
import { useWebSocket } from "../context/WebSocketProvider";

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
  Pod: pod,
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

// Updated getNodeConfig function to match TreeViewComponent and support pods
const getNodeConfig = (type: string, label: string) => {
  console.log(label);
  // Normalize the type to match the iconMap keys (e.g., "deployment" -> "Deployment")
  const normalizedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  
  // Default icon and name based on the type
  let icon = iconMap[normalizedType] || cm; // Fallback to ConfigMap icon if type not found
  let dynamicText = type.toLowerCase(); // Use the type as the default name

  // Check the type to assign the icon and name
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
    case "pod":
      icon = pod;
      dynamicText = "pod";
      break;
    // New child node types
    case "envvar":
      icon = cm; // Use ConfigMap icon as a fallback
      dynamicText = "envvar";
      break;
    case "customresource":
      icon = crd; // Use CRD icon as a fallback
      dynamicText = "cr";
      break;
    case "controller":
      icon = deployicon; // Use Deployment icon as a fallback
      dynamicText = "controller";
      break;
    case "ingresscontroller":
      icon = ing; // Use Ingress icon
      dynamicText = "ingresscontroller";
      break;
    default:
      // If the type is not in the list, keep the default icon and name
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
  const [nodes, setNodes] = useState<CustomNode[]>([]);
  const [edges, setEdges] = useState<CustomEdge[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");
  const [contextMenu, setContextMenu] = useState<{ nodeId: string | null; x: number; y: number } | null>(null);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [activeOption, setActiveOption] = useState<string | null>("option1");
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [hasReceivedInitialData, setHasReceivedInitialData] = useState<boolean>(false);
  const nodeCache = useRef<Map<string, CustomNode>>(new Map());
  const edgeCache = useRef<Map<string, CustomEdge>>(new Map());
  const edgeIdCounter = useRef<number>(0);
  const prevNodes = useRef<CustomNode[]>([]);
  const renderStartTime = useRef<number>(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const { isConnected, connect } = useWebSocket();
  const queryClient = useQueryClient();
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
    connect(true);
  }, [connect]);

  useEffect(() => {
    if (namespaceData && namespaceData.length > 0 && !hasReceivedInitialData) {
      setHasReceivedInitialData(true);
    }
  }, [namespaceData, hasReceivedInitialData]);

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
          style: { ...nodeStyle, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "2px 12px" },
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
            style: { stroke: "#a3a3a3", strokeDasharray: "2,2" },
            markerEnd: { type: MarkerType.ArrowClosed },
          };
          newEdges.push(edge);
          edgeCache.current.set(edgeId, edge);
        } else {
          newEdges.push(cachedEdge);
        }
      }
    },
    [getTimeAgo, handleClosePanel, handleMenuOpen]
  );

  const transformDataToTree = useCallback(
    (data: NamespaceResource[]) => {
      const startTime = performance.now();
      console.log(`[TreeView] Starting transformDataToTree with ${data?.length || 0} namespaces at ${startTime - renderStartTime.current}ms`);

      if (!data || data.length === 0) {
        console.log(`[TreeView] No data to process, clearing nodes and edges at ${performance.now() - renderStartTime.current}ms`);
        nodeCache.current.clear();
        edgeCache.current.clear();
        edgeIdCounter.current = 0;
        ReactDOM.unstable_batchedUpdates(() => {
          setNodes([]);
          setEdges([]);
        });
        return;
      }

      nodeCache.current.clear();
      edgeCache.current.clear();
      edgeIdCounter.current = 0;

      const newNodes: CustomNode[] = [];
      const newEdges: CustomEdge[] = [];

      // Step 1: Iterate over each namespace
      data.forEach((namespace: NamespaceResource) => {
        const namespaceId = `namespace-${namespace.name}`;
        // Create a node for the namespace
        createNode(
          namespaceId,
          namespace.name,
          "namespace",
          namespace.status,
          "",
          namespace.name,
          { apiVersion: "v1", kind: "Namespace", metadata: { name: namespace.name, namespace: namespace.name, creationTimestamp: "" }, status: { phase: namespace.status } },
          null, // No parent for namespace nodes
          newNodes,
          newEdges
        );

        // Step 2: Prepare resources map
        const resourcesMap: ResourcesMap = {
          endpoints: namespace.resources[".v1/endpoints"] || [],
          endpointSlices: namespace.resources["discovery.k8s.io.v1/endpointslices"] || [],
          ...namespace.resources,
        };

        // Step 3: Iterate over each resource in the namespace
        Object.values(resourcesMap)
          .flat()
          .forEach((item: ResourceItem, index: number) => {
            const kindLower = item.kind.toLowerCase();
            const resourceId = `${namespaceId}-${kindLower}-${item.metadata.name}-${index}`;
            const status = item.status?.conditions?.some((c) => c.type === "Available" && c.status === "True") ? "Active" : "Inactive";

            // Create a node for the resource (child of the namespace)
            createNode(resourceId, item.metadata.name, kindLower, status, item.metadata.creationTimestamp, namespace.name, item, namespaceId, newNodes, newEdges);

            // Step 4: Create child nodes based on the specified hierarchy
            switch (kindLower) {
              case "configmap":
                {
                  // ConfigMap → Mounted as Volume or Environment Variables
                  createNode(
                    `${resourceId}-volume`,
                    `volume-${item.metadata.name}`,
                    "volume",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    resourceId,
                    newNodes,
                    newEdges
                  );
                  createNode(
                    `${resourceId}-envvar`,
                    `envvar-${item.metadata.name}`,
                    "envvar",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    resourceId,
                    newNodes,
                    newEdges
                  );
                }
                break;

              case "clusterrolebinding":
                {
                  // ClusterRoleBinding → ClusterRole → User/ServiceAccount/Group
                  const crbClusterRoleId = `${resourceId}-clusterrole`;
                  createNode(
                    crbClusterRoleId,
                    `clusterrole-${item.metadata.name}`,
                    "clusterrole",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    resourceId,
                    newNodes,
                    newEdges
                  );
                  createNode(
                    `${crbClusterRoleId}-user`,
                    `user-${item.metadata.name}`,
                    "user",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    crbClusterRoleId,
                    newNodes,
                    newEdges
                  );
                  createNode(
                    `${crbClusterRoleId}-serviceaccount`,
                    `serviceaccount-${item.metadata.name}`,
                    "serviceaccount",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    crbClusterRoleId,
                    newNodes,
                    newEdges
                  );
                  createNode(
                    `${crbClusterRoleId}-group`,
                    `group-${item.metadata.name}`,
                    "group",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    crbClusterRoleId,
                    newNodes,
                    newEdges
                  );
                }
                break;

              case "customresourcedefinition":
                {
                  // CustomResourceDefinition → Custom Resource (CR) → Controller
                  const crdCrId = `${resourceId}-customresource`;
                  createNode(
                    crdCrId,
                    `cr-${item.metadata.name}`,
                    "customresource",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    resourceId,
                    newNodes,
                    newEdges
                  );
                  createNode(
                    `${crdCrId}-controller`,
                    `controller-${item.metadata.name}`,
                    "controller",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    crdCrId,
                    newNodes,
                    newEdges
                  );
                }
                break;

              case "clusterrole":
                {
                  // ClusterRole → Assigned to Users, Groups, or ServiceAccounts via ClusterRoleBinding
                  const crClusterRoleBindingId = `${resourceId}-clusterrolebinding`;
                  createNode(
                    crClusterRoleBindingId,
                    `clusterrolebinding-${item.metadata.name}`,
                    "clusterrolebinding",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    resourceId,
                    newNodes,
                    newEdges
                  );
                  createNode(
                    `${crClusterRoleBindingId}-user`,
                    `user-${item.metadata.name}`,
                    "user",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    crClusterRoleBindingId,
                    newNodes,
                    newEdges
                  );
                  createNode(
                    `${crClusterRoleBindingId}-group`,
                    `group-${item.metadata.name}`,
                    "group",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    crClusterRoleBindingId,
                    newNodes,
                    newEdges
                  );
                  createNode(
                    `${crClusterRoleBindingId}-serviceaccount`,
                    `serviceaccount-${item.metadata.name}`,
                    "serviceaccount",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    crClusterRoleBindingId,
                    newNodes,
                    newEdges
                  );
                }
                break;

              case "cronjob":
                {
                  // CronJob → Job → Pod
                  const cronJobId = `${resourceId}-job`;
                  createNode(
                    cronJobId,
                    `job-${item.metadata.name}`,
                    "job",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    resourceId,
                    newNodes,
                    newEdges
                  );
                  createNode(
                    `${cronJobId}-pod`,
                    `pod-${item.metadata.name}`,
                    "pod",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    cronJobId,
                    newNodes,
                    newEdges
                  );
                }
                break;

              case "deployment":
                {
                  // Deployment → ReplicaSet → Pod
                  const deployReplicaSetId = `${resourceId}-replicaset`;
                  createNode(
                    deployReplicaSetId,
                    `replicaset-${item.metadata.name}`,
                    "replicaset",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    resourceId,
                    newNodes,
                    newEdges
                  );
                  createNode(
                    `${deployReplicaSetId}-pod`,
                    `pod-${item.metadata.name}`,
                    "pod",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    deployReplicaSetId,
                    newNodes,
                    newEdges
                  );
                }
                break;

              case "daemonset":
                createNode(
                  `${resourceId}-pod`,
                  `pod-${item.metadata.name}`,
                  "pod",
                  status,
                  undefined,
                  namespace.name,
                  item,
                  resourceId,
                  newNodes,
                  newEdges
                );
                break;

              case "service":
                {
                  // Service → Endpoints → Pod
                  const svcEndpointsId = `${resourceId}-endpoints`;
                  createNode(
                    svcEndpointsId,
                    `endpoints-${item.metadata.name}`,
                    "endpoints",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    resourceId,
                    newNodes,
                    newEdges
                  );
                  createNode(
                    `${svcEndpointsId}-pod`,
                    `pod-${item.metadata.name}`,
                    "pod",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    svcEndpointsId,
                    newNodes,
                    newEdges
                  );
                }
                break;

              case "endpoints":
                createNode(
                  `${resourceId}-pod`,
                  `pod-${item.metadata.name}`,
                  "pod",
                  status,
                  undefined,
                  namespace.name,
                  item,
                  resourceId,
                  newNodes,
                  newEdges
                );
                break;

              case "group":
                createNode(
                  `${resourceId}-user`,
                  `user-${item.metadata.name}`,
                  "user",
                  status,
                  undefined,
                  namespace.name,
                  item,
                  resourceId,
                  newNodes,
                  newEdges
                );
                break;

              case "horizontalpodautoscaler":
                {
                  // HPA → Scales Deployment/ReplicaSet/StatefulSet → Pod
                  const hpaDeployId = `${resourceId}-deployment`;
                  const hpaRsId = `${resourceId}-replicaset`;
                  const hpaStsId = `${resourceId}-statefulset`;
                  createNode(
                    hpaDeployId,
                    `deployment-${item.metadata.name}`,
                    "deployment",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    resourceId,
                    newNodes,
                    newEdges
                  );
                  createNode(
                    hpaRsId,
                    `replicaset-${item.metadata.name}`,
                    "replicaset",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    resourceId,
                    newNodes,
                    newEdges
                  );
                  createNode(
                    hpaStsId,
                    `statefulset-${item.metadata.name}`,
                    "statefulset",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    resourceId,
                    newNodes,
                    newEdges
                  );
                  createNode(
                    `${hpaDeployId}-pod`,
                    `pod-${item.metadata.name}-deploy`,
                    "pod",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    hpaDeployId,
                    newNodes,
                    newEdges
                  );
                  createNode(
                    `${hpaRsId}-pod`,
                    `pod-${item.metadata.name}-rs`,
                    "pod",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    hpaRsId,
                    newNodes,
                    newEdges
                  );
                  createNode(
                    `${hpaStsId}-pod`,
                    `pod-${item.metadata.name}-sts`,
                    "pod",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    hpaStsId,
                    newNodes,
                    newEdges
                  );
                }
                break;

              case "ingress":
                {
                  // Ingress → Ingress Controller → Service
                  const ingControllerId = `${resourceId}-ingresscontroller`;
                  createNode(
                    ingControllerId,
                    `ingresscontroller-${item.metadata.name}`,
                    "ingresscontroller",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    resourceId,
                    newNodes,
                    newEdges
                  );
                  createNode(
                    `${ingControllerId}-service`,
                    `service-${item.metadata.name}`,
                    "service",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    ingControllerId,
                    newNodes,
                    newEdges
                  );
                }
                break;

              case "job":
                createNode(
                  `${resourceId}-pod`,
                  `pod-${item.metadata.name}`,
                  "pod",
                  status,
                  undefined,
                  namespace.name,
                  item,
                  resourceId,
                  newNodes,
                  newEdges
                );
                break;

              case "limitrange":
                createNode(
                  `${resourceId}-namespace`,
                  `namespace-${item.metadata.name}`,
                  "namespace",
                  status,
                  undefined,
                  namespace.name,
                  item,
                  resourceId,
                  newNodes,
                  newEdges
                );
                break;

              case "networkpolicy":
                // NetworkPolicy (no children)
                break;

              case "podsecuritypolicy":
                // PodSecurityPolicy (no children)
                break;

              case "persistentvolume":
                createNode(
                  `${resourceId}-persistentvolumeclaim`,
                  `pvc-${item.metadata.name}`,
                  "persistentvolumeclaim",
                  status,
                  undefined,
                  namespace.name,
                  item,
                  resourceId,
                  newNodes,
                  newEdges
                );
                break;

              case "persistentvolumeclaim":
                createNode(
                  `${resourceId}-persistentvolume`,
                  `pv-${item.metadata.name}`,
                  "persistentvolume",
                  status,
                  undefined,
                  namespace.name,
                  item,
                  resourceId,
                  newNodes,
                  newEdges
                );
                break;

              case "resourcequota":
                createNode(
                  `${resourceId}-namespace`,
                  `namespace-${item.metadata.name}`,
                  "namespace",
                  status,
                  undefined,
                  namespace.name,
                  item,
                  resourceId,
                  newNodes,
                  newEdges
                );
                break;

              case "rolebinding":
                {
                  // RoleBinding → Role → User/ServiceAccount/Group
                  const rbRoleId = `${resourceId}-role`;
                  createNode(
                    rbRoleId,
                    `role-${item.metadata.name}`,
                    "role",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    resourceId,
                    newNodes,
                    newEdges
                  );
                  createNode(
                    `${rbRoleId}-user`,
                    `user-${item.metadata.name}`,
                    "user",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    rbRoleId,
                    newNodes,
                    newEdges
                  );
                  createNode(
                    `${rbRoleId}-serviceaccount`,
                    `serviceaccount-${item.metadata.name}`,
                    "serviceaccount",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    rbRoleId,
                    newNodes,
                    newEdges
                  );
                  createNode(
                    `${rbRoleId}-group`,
                    `group-${item.metadata.name}`,
                    "group",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    rbRoleId,
                    newNodes,
                    newEdges
                  );
                }
                break;

              case "role":
                createNode(
                  `${resourceId}-namespace`,
                  `namespace-${item.metadata.name}`,
                  "namespace",
                  status,
                  undefined,
                  namespace.name,
                  item,
                  resourceId,
                  newNodes,
                  newEdges
                );
                break;

              case "replicaset":
                createNode(
                  `${resourceId}-pod`,
                  `pod-${item.metadata.name}`,
                  "pod",
                  status,
                  undefined,
                  namespace.name,
                  item,
                  resourceId,
                  newNodes,
                  newEdges
                );
                break;

              case "serviceaccount":
                // ServiceAccount (no children)
                break;

              case "storageclass":
                createNode(
                  `${resourceId}-persistentvolume`,
                  `pv-${item.metadata.name}`,
                  "persistentvolume",
                  status,
                  undefined,
                  namespace.name,
                  item,
                  resourceId,
                  newNodes,
                  newEdges
                );
                break;

              case "secret":
                {
                  // Secret → Mounted as Volume or Environment Variables
                  createNode(
                    `${resourceId}-volume`,
                    `volume-${item.metadata.name}`,
                    "volume",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    resourceId,
                    newNodes,
                    newEdges
                  );
                  createNode(
                    `${resourceId}-envvar`,
                    `envvar-${item.metadata.name}`,
                    "envvar",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    resourceId,
                    newNodes,
                    newEdges
                  );
                }
                break;

              case "statefulset":
                createNode(
                  `${resourceId}-pod`,
                  `pod-${item.metadata.name}`,
                  "pod",
                  status,
                  undefined,
                  namespace.name,
                  item,
                  resourceId,
                  newNodes,
                  newEdges
                );
                break;

              case "user":
                {
                  // User → Assigned Roles or ClusterRoles
                  createNode(
                    `${resourceId}-role`,
                    `role-${item.metadata.name}`,
                    "role",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    resourceId,
                    newNodes,
                    newEdges
                  );
                  createNode(
                    `${resourceId}-clusterrole`,
                    `clusterrole-${item.metadata.name}`,
                    "clusterrole",
                    status,
                    undefined,
                    namespace.name,
                    item,
                    resourceId,
                    newNodes,
                    newEdges
                  );
                }
                break;

              case "volume":
                // Volume (no children)
                break;

              default:
                break;
            }
          });
      });

      // Step 5: Layout the nodes and edges
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges, "LR", prevNodes);
      ReactDOM.unstable_batchedUpdates(() => {
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
      });
      prevNodes.current = layoutedNodes;

      const endTime = performance.now();
      console.log(`[TreeView] Completed transformDataToTree: ${layoutedNodes.length} nodes, ${layoutedEdges.length} edges in ${endTime - startTime}ms`);
    },
    [createNode]
  );

  useEffect(() => {
    renderStartTime.current = performance.now();
    console.log(`[TreeView] Component mounted at 0ms`);
  }, []);

  useEffect(() => {
    if (namespaceData !== undefined) {
      console.log(
        `[TreeView] namespaceData received with ${namespaceData.length} namespaces at ${performance.now() - renderStartTime.current}ms`
      );
      transformDataToTree(namespaceData);
    }
  }, [namespaceData, transformDataToTree]);

  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      console.log(
        `[TreeView] Rendered successfully with ${nodes.length} nodes and ${edges.length} edges at ${performance.now() - renderStartTime.current}ms`
      );
    }
  }, [nodes, edges]);

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

  const deleteResourceMutation = useMutation({
    mutationFn: async ({ namespace, nodeName }: { nodeId: string; nodeType: string; namespace: string; nodeName: string }) => {
      const endpoint = `http://localhost:4000/api/namespaces/${namespace}/${nodeName}`;
      console.log(endpoint);
      throw new Error("API not implemented");
    },
    onMutate: async ({ nodeId }) => {
      await queryClient.cancelQueries({ queryKey: NAMESPACE_QUERY_KEY });
      const previousData = queryClient.getQueryData<NamespaceResource[]>(NAMESPACE_QUERY_KEY);
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return { previousData };

      const nodeIdParts = node.id.split("-");
      let namespace = "";
      const nodeName = node.data.label.props.label;

      if (node.id.startsWith("namespace-") && nodeIdParts.length === 2) {
        namespace = nodeName;
      } else {
        namespace = nodeIdParts[1];
      }

      const updatedData = previousData?.map((ns) => {
        if (ns.name !== namespace) return ns;
        const updatedResources = { ...ns.resources };
        Object.keys(updatedResources).forEach((key) => {
          updatedResources[key] = updatedResources[key].filter((item: ResourceItem) => item.metadata.name !== nodeName);
        });
        return { ...ns, resources: updatedResources };
      });

      queryClient.setQueryData(NAMESPACE_QUERY_KEY, updatedData);
      setNodes((prevNodes) => prevNodes.filter((n) => n.id !== nodeId));
      setEdges((prevEdges) => prevEdges.filter((e) => e.source !== nodeId && e.target !== nodeId));
      nodeCache.current.delete(nodeId);

      return { previousData };
    },
    onError: (error, variables, context) => {
      console.error(`[TreeView] Failed to delete node ${variables.nodeId} at ${performance.now() - renderStartTime.current}ms:`, error);
      setSnackbarMessage(`Failed to delete "${variables.nodeName}"`);
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      queryClient.setQueryData(NAMESPACE_QUERY_KEY, context?.previousData);
    },
    onSuccess: (_, variables) => {
      setSnackbarMessage(`"${variables.nodeName}" deleted successfully`);
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      queryClient.invalidateQueries({ queryKey: NAMESPACE_QUERY_KEY });
      console.log(`[TreeView] Node "${variables.nodeName}" deleted successfully at ${performance.now() - renderStartTime.current}ms`);
    },
  });

  const handleMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleMenuAction = useCallback(
    async (action: string) => {
      if (contextMenu?.nodeId) {
        const node = nodes.find((n) => n.id === contextMenu.nodeId);
        if (node) {
          const nodeIdParts = node.id.split("-");
          const nodeName = node.data.label.props.label;
          let namespace = "";
          let nodeType = "";

          if (node.id.startsWith("namespace-") && nodeIdParts.length === 2) {
            nodeType = "namespace";
            namespace = nodeName;
          } else {
            namespace = nodeIdParts[1];
            nodeType = nodeIdParts[2];
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
              });
              break;
            case "Delete":
              deleteResourceMutation.mutate({
                nodeId: contextMenu.nodeId,
                nodeType,
                namespace,
                nodeName,
              });
              break;
            case "Logs":
              // TODO: Implement logs functionality
              break;
            default:
              break;
          }
        }
      }
      handleMenuClose();
    },
    [contextMenu, nodes, handleClosePanel, deleteResourceMutation]
  );

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

  const isLoadingTree = !isConnected || !hasReceivedInitialData || (nodes.length === 0 && edges.length === 0);

  return (
    <Box sx={{ display: "flex", height: "100vh", width: "100%", position: "relative" }}>
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
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <Typography variant="h4" sx={{ color: "#4498FF", fontWeight: 700, fontSize: "30px", letterSpacing: "0.5px" }}>
            Remote-Cluster Treeview
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Plus size={20} />}
            onClick={handleCreateWorkloadClick}
            sx={{ borderColor: "#2f86ff", color: "#2f86ff", "&:hover": { borderColor: "#2f86ff" } }}
          >
            Create Workload
          </Button>
        </Box>

        {showCreateOptions && <CreateOptions activeOption={activeOption} setActiveOption={setActiveOption} onCancel={handleCancelCreateOptions} />}

        <Box sx={{ width: "100%", height: "calc(100% - 80px)", position: "relative" }}>
          {isLoadingTree ? (
            <LoadingFallback message="Loading the tree..." size="medium" />
          ) : nodes.length === 0 && edges.length === 0 ? (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                backgroundColor: "#fff",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                <Typography variant="h6" sx={{ color: "#333", fontWeight: 600, fontSize: "20px" }}>
                  No Workloads Found
                </Typography>
                <Typography variant="body2" sx={{ color: "#666", fontSize: "14px", mb: 2 }}>
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
          ) : (
            <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
              <ReactFlowProvider>
                <FlowCanvas nodes={nodes} edges={edges} renderStartTime={renderStartTime} />
                <ZoomControls />
              </ReactFlowProvider>
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
              <MenuItem onClick={() => handleMenuAction("Logs")}>Logs</MenuItem>
            </Menu>
          )}
        </Box>

        <Snackbar anchorOrigin={{ vertical: "top", horizontal: "center" }} open={snackbarOpen} autoHideDuration={4000} onClose={handleSnackbarClose}>
          <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: "100%" }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>

      <div ref={panelRef}>
        <DynamicDetailsPanel
          namespace={selectedNode?.namespace || ""}
          name={selectedNode?.name || ""}
          type={selectedNode?.type || ""}
          resourceData={selectedNode?.resourceData}
          onClose={handleClosePanel}
          isOpen={selectedNode?.isOpen || false}
        />
      </div>
    </Box>
  );
};

export default memo(WecsTreeview);