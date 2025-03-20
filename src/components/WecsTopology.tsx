import { useState, useEffect, useCallback, useRef, memo } from "react";
import { Box, Typography, Menu, MenuItem, Button, Alert, Snackbar } from "@mui/material";
import axios from "axios";
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

// Interfaces (unchanged)
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

export interface NamespaceResource {
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

// Dynamic icon mapping for all imported icons (unchanged)
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

// Dynamic node config with icon mapping (unchanged)
const getNodeConfig = (type: string, label: string) => {
  const normalizedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  const icon = iconMap[normalizedType] || cm;
  const dynamicText = normalizedType.toLowerCase();

  if (label.toLowerCase().includes("namespace")) {
    return { icon: ns, dynamicText: "ns" };
  } else if (label.toLowerCase().includes("deploy")) {
    return { icon: deployicon, dynamicText: "deploy" };
  } else if (label.toLowerCase().includes("svc") || label.toLowerCase().includes("service")) {
    return { icon: svc, dynamicText: "svc" };
  } else if (label.toLowerCase().includes("replica")) {
    return { icon: rs, dynamicText: "replica" };
  } else if (label.toLowerCase().includes("endpoint")) {
    return { icon: ep, dynamicText: label.toLowerCase().startsWith("endpoint") ? label.substring(8) : "endpoint" };
  } else if (label.toLowerCase().includes("port")) {
    return { icon: svc, dynamicText: "port" };
  } else if (label.toLowerCase().includes("data")) {
    return { icon: cm, dynamicText: "data" };
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
  const nodeCache = useRef<Map<string, CustomNode>>(new Map());
  const edgeCache = useRef<Map<string, CustomEdge>>(new Map());
  const edgeIdCounter = useRef<number>(0);
  const prevNodes = useRef<CustomNode[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [hasReceivedInitialData, setHasReceivedInitialData] = useState<boolean>(false);
  const renderStartTime = useRef<number>(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const dataReceiveTime = useRef<number | null>(null);

  const queryClient = useQueryClient();
  const NAMESPACE_QUERY_KEY = ["namespaces"];

  const { data: namespaceData } = useQuery({
    queryKey: NAMESPACE_QUERY_KEY,
    queryFn: async () => {
      const response = await axios.get("http://localhost:4000/api/namespaces");
      return response.data;
    },
    enabled: false,
    initialData: [],
  });

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
      console.log(`[Transform] Starting transformDataToTree with ${data?.length || 0} namespaces at ${startTime - renderStartTime.current}ms`);

      if (!data || data.length === 0) {
        console.log(`[Transform] No data to process, clearing nodes and edges at ${performance.now() - renderStartTime.current}ms`);
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

      data.forEach((namespace: NamespaceResource) => {
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

        const resourcesMap: ResourcesMap = {
          endpoints: namespace.resources[".v1/endpoints"] || [],
          endpointSlices: namespace.resources["discovery.k8s.io.v1/endpointslices"] || [],
          ...namespace.resources,
        };

        Object.values(resourcesMap)
          .flat()
          .forEach((item: ResourceItem, index: number) => {
            const kindLower = item.kind.toLowerCase();
            const resourceId = `${namespaceId}-${kindLower}-${item.metadata.name}-${index}`;
            const status = item.status?.conditions?.some((c) => c.type === "Available" && c.status === "True") ? "Active" : "Inactive";

            createNode(resourceId, item.metadata.name, kindLower, status, item.metadata.creationTimestamp, namespace.name, item, namespaceId, newNodes, newEdges);

            if (kindLower === "configmap" && item.data) {
              Object.keys(item.data).forEach((key) =>
                createNode(`${resourceId}-data-${key}`, key, "data", status, undefined, namespace.name, item, resourceId, newNodes, newEdges)
              );
            } else if (kindLower === "service") {
              item.spec?.ports?.forEach((port) =>
                createNode(`${resourceId}-port-${port.name}`, `${port.name} (${port.port})`, "port", status, undefined, namespace.name, item, resourceId, newNodes, newEdges)
              );

              const endpoints = resourcesMap.endpoints.find((ep) => ep.metadata.name === item.metadata.name);
              if (endpoints) {
                const endpointId = `${resourceId}-endpoints-${endpoints.metadata.name}`;
                createNode(endpointId, endpoints.metadata.name, "endpoints", status, undefined, namespace.name, endpoints, resourceId, newNodes, newEdges);
                endpoints.subsets?.forEach((subset, idx) => {
                  const subsetId = `${endpointId}-subset-${idx}`;
                  createNode(subsetId, `Subset ${idx + 1}`, "subset", status, undefined, namespace.name, endpoints, endpointId, newNodes, newEdges);
                  subset.addresses?.forEach((addr) =>
                    createNode(`${subsetId}-addr-${addr.ip}`, addr.ip, "data", status, undefined, namespace.name, endpoints, subsetId, newNodes, newEdges)
                  );
                  subset.ports?.forEach((port) =>
                    createNode(
                      `${subsetId}-port-${port.name || idx}`,
                      `${port.name || "port"} (${port.port})`,
                      "port",
                      status,
                      undefined,
                      namespace.name,
                      endpoints,
                      subsetId,
                      newNodes,
                      newEdges
                    )
                  );
                });
              }

              const endpointSlices = resourcesMap.endpointSlices.filter((es) => es.metadata.labels?.["kubernetes.io/service-name"] === item.metadata.name);
              endpointSlices.forEach((es) => {
                const esId = `${resourceId}-endpointslice-${es.metadata.name}`;
                createNode(esId, es.metadata.name, "endpointslice", status, undefined, namespace.name, es, resourceId, newNodes, newEdges);
                es.endpoints?.forEach((endpoint, idx) => {
                  const endpointId = `${esId}-endpoint-${idx}`;
                  createNode(endpointId, `Endpoint ${idx + 1}`, "data", status, undefined, namespace.name, es, esId, newNodes, newEdges);
                  endpoint.addresses?.forEach((addr) =>
                    createNode(`${endpointId}-addr-${addr}`, addr, "data", status, undefined, namespace.name, es, endpointId, newNodes, newEdges)
                  );
                  es.ports?.forEach((port) =>
                    createNode(
                      `${endpointId}-port-${port.name || idx}`,
                      `${port.name || "port"} (${port.port})`,
                      "port",
                      status,
                      undefined,
                      namespace.name,
                      es,
                      endpointId,
                      newNodes,
                      newEdges
                    )
                  );
                });
              });
            } else if (kindLower === "deployment") {
              createNode(
                `${resourceId}-replicaset`,
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
            } else if (kindLower === "lease" && item.spec) {
              createNode(
                `${resourceId}-holder`,
                item.spec.holderIdentity || "Unknown Holder",
                "data",
                status,
                undefined,
                namespace.name,
                item,
                resourceId,
                newNodes,
                newEdges
              );
            } else if (kindLower === "rolebinding") {
              item.subjects?.forEach((subject, idx) =>
                createNode(`${resourceId}-subject-${idx}`, subject.name, "subject", status, undefined, namespace.name, item, resourceId, newNodes, newEdges)
              );
              createNode(
                `${resourceId}-roleref`,
                item.roleRef?.name || "Unknown Role",
                "ruleref",
                status,
                undefined,
                namespace.name,
                item,
                resourceId,
                newNodes,
                newEdges
              );
            } else if (kindLower === "role") {
              item.rules?.forEach((rule, idx) => {
                const ruleLabel = `${rule.verbs?.join("/") || ""} ${rule.resources?.join(",") || "all"}`;
                createNode(`${resourceId}-rule-${idx}`, ruleLabel, "ruleref", status, undefined, namespace.name, item, resourceId, newNodes, newEdges);
              });
            }
          });
      });

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges, "LR", prevNodes);

      ReactDOM.unstable_batchedUpdates(() => {
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
      });
      prevNodes.current = layoutedNodes;

      const endTime = performance.now();
      console.log(`[Transform] Completed transformDataToTree: ${layoutedNodes.length} nodes, ${layoutedEdges.length} edges in ${endTime - startTime}ms`);
      if (dataReceiveTime.current !== null) {
        const rebuildTime = endTime - dataReceiveTime.current;
        console.log(`[Transform] Tree rebuilt in ${rebuildTime}ms after data received`);
        dataReceiveTime.current = null;
      }
    },
    [createNode]
  );

  const sortNamespaceData = (data: NamespaceResource[]): NamespaceResource[] => {
    return [...data]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((ns) => ({
        ...ns,
        resources: Object.fromEntries(
          Object.entries(ns.resources).map(([key, resources]) => [key, [...resources].sort((a, b) => a.metadata.name.localeCompare(b.metadata.name))])
        ),
      }));
  };

  const connectWebSocket = useCallback(
    (reconnectFunc: () => void): WebSocket => {
      const ws = new WebSocket("ws://localhost:4000/ws/namespaces");
      wsRef.current = ws;

      const updateCache = (filteredData: NamespaceResource[]) => {
        const currentData = queryClient.getQueryData<NamespaceResource[]>(NAMESPACE_QUERY_KEY);
        const sortedFilteredData = sortNamespaceData(filteredData);
        const sortedCurrentData = currentData ? sortNamespaceData(currentData) : null;
        if (!sortedCurrentData || !isEqual(sortedFilteredData, sortedCurrentData)) {
          console.log(`[WebSocket] Data changed, updating cache at ${performance.now() - renderStartTime.current}ms`);
          queryClient.setQueryData(NAMESPACE_QUERY_KEY, filteredData);
        } else {
          console.log(`[WebSocket] Data unchanged, skipping cache update at ${performance.now() - renderStartTime.current}ms`);
        }
      };

      ws.onopen = () => {
        console.log(`[WebSocket] Connected at ${performance.now() - renderStartTime.current}ms`);
        setIsWsConnected(true);
      };

      ws.onmessage = (event) => {
        const receiveTime = performance.now();
        console.log(`[WebSocket] Data received at ${receiveTime - renderStartTime.current}ms, readyState: ${ws.readyState}`);
        let data: NamespaceResource[] = [];
        try {
          data = JSON.parse(event.data);
        } catch (error) {
          console.error(`[WebSocket] Failed to parse data at ${performance.now() - renderStartTime.current}ms:`, error);
          return;
        }
        const totalObjects = data.reduce((count, namespace) => {
          const resourceCount = Object.values(namespace.resources).reduce((sum, resources) => sum + resources.length, 0);
          return count + resourceCount;
        }, 0);
        console.log(`[WebSocket] Received ${totalObjects} objects across ${data.length} namespaces at ${performance.now() - renderStartTime.current}ms`);
        const filteredData = JSON.parse(JSON.stringify(data)).filter(
          (namespace: NamespaceResource) => !["kubestellar-report", "kube-node-lease", "kube-public", "kube-system"].includes(namespace.name)
        );
        console.log(`[WebSocket] Filtered ${filteredData.length} namespaces from ${data.length} at ${performance.now() - renderStartTime.current}ms`);
        dataReceiveTime.current = receiveTime;
        // Batch updates
        ReactDOM.unstable_batchedUpdates(() => {
          setHasReceivedInitialData(true);
          updateCache(filteredData);
        });
      };

      ws.onerror = (error) => {
        console.error(`[WebSocket] Error at ${performance.now() - renderStartTime.current}ms:`, error);
        setIsWsConnected(false);
      };

      ws.onclose = () => {
        console.log(`[WebSocket] Disconnected at ${performance.now() - renderStartTime.current}ms, attempting reconnect...`);
        setIsWsConnected(false);
        setHasReceivedInitialData(false); // Reset for reconnect
        wsRef.current = null;
        reconnectFunc();
      };

      return ws;
    },
    [queryClient]
  );

  const reconnectWebSocket = useCallback((): void => {
    let retryCount = 0;
    const maxBackoff = 500;
    const initialDelay = 10;

    const attemptReconnect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const delay = Math.min(initialDelay * Math.pow(2, retryCount), maxBackoff);
      retryCount++;

      setTimeout(() => {
        console.log(`[WebSocket] Reconnecting (attempt ${retryCount}, delay ${delay}ms) at ${performance.now() - renderStartTime.current}ms`);
        connectWebSocket(reconnectWebSocket);
      }, delay);
    };

    attemptReconnect();
  }, [connectWebSocket]);

  useEffect(() => {
    renderStartTime.current = performance.now();
    console.log(`[Lifecycle] TreeView mounted at 0ms`);
    connectWebSocket(reconnectWebSocket);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectWebSocket, reconnectWebSocket]);

  useEffect(() => {
    if (namespaceData !== undefined) {
      console.log(
        `[State] namespaceData updated, triggering transformDataToTree with ${namespaceData.length} namespaces at ${performance.now() - renderStartTime.current}ms`
      );
      transformDataToTree(namespaceData);
    }
  }, [namespaceData, transformDataToTree]);

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
      await axios.delete(endpoint);
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
      console.error(`[Delete] Failed to delete node ${variables.nodeId}:`, error);
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
            Manage Workloads
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
          {(!isWsConnected || !hasReceivedInitialData) ? (
            <LoadingFallback message="Loading the WDS tree.." size="medium" />
          ) : namespaceData.length === 0 ? (
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