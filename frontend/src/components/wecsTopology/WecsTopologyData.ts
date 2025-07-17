import { useCallback } from 'react';
import ReactDOM from 'react-dom';
import { isEqual } from 'lodash';
import { api } from '../../lib/api';
import {
  CustomNode,
  CustomEdge,
  WecsCluster,
  ResourceItem,
  WecsResource,
  WecsResourceType,
  WecsNamespace,
  SelectedNode,
} from './WecsTopologyInterfaces';
import { createNode } from './WecsTopologyNodeHandling';
import { getLayoutedElements } from './WecsTopologyLayout';

interface PodData {
  name: string;
  raw: ResourceItem;
  creationTimestamp?: string;
}

interface ReplicaSetData {
  name: string;
  raw: ResourceItem;
  pods?: PodData[];
  creationTimestamp?: string;
}

interface ClusterData {
  cluster: string;
  namespaces: WecsNamespace[];
}

interface TransformDataParams {
  setNodes: React.Dispatch<React.SetStateAction<CustomNode[]>>;
  setEdges: React.Dispatch<React.SetStateAction<CustomEdge[]>>;
  setIsTransforming: React.Dispatch<React.SetStateAction<boolean>>;
  prevNodes: React.MutableRefObject<CustomNode[]>;
  currentZoom: number;
  edgeType: string;
  theme: string;
  getScaledNodeStyle: (zoom: number) => React.CSSProperties;
  nodeCache: React.MutableRefObject<Map<string, CustomNode>>;
  edgeCache: React.MutableRefObject<Map<string, CustomEdge>>;
  edgeIdCounter: React.MutableRefObject<number>;
  stateRef: React.MutableRefObject<{ isCollapsed: boolean; isExpanded: boolean }>;
  nodes: CustomNode[];
  edges: CustomEdge[];
  t: (key: string, options?: { count?: number }) => string;
  setSelectedNode: (node: SelectedNode | null) => void;
  handleClosePanel: () => void;
  handleMenuOpen: (event: React.MouseEvent, nodeId: string) => void;
}

export const getClusterCreationTimestamp = async (name: string): Promise<string> => {
  try {
    const response = await api.get(`/api/cluster/details/${encodeURIComponent(name)}`);
    const data = response.data;

    const creationTime =
      data.itsManagedClusters && data.itsManagedClusters.length > 0
        ? data.itsManagedClusters[0].creationTime
        : new Date().toISOString();

    return creationTime;
  } catch (error) {
    console.error(error);
    return '';
  }
};

export const useFetchAllClusterTimestamps = () => {
  return useCallback(async (clusterData: WecsCluster[]) => {
    try {
      const clusterNames = clusterData.map(cluster => cluster.cluster);
      const timestamps = await Promise.all(
        clusterNames.map(name => getClusterCreationTimestamp(name))
      );

      const timestampMap = new Map(clusterNames.map((name, index) => [name, timestamps[index]]));

      return timestampMap;
    } catch (error) {
      console.error('Error fetching cluster timestamps:', error);
      return new Map();
    }
  }, []);
};

export const useTransformDataToTree = (params: TransformDataParams) => {
  const fetchAllClusterTimestamps = useFetchAllClusterTimestamps();

  return useCallback(
    async (data: WecsCluster[]) => {
      if (!data || !Array.isArray(data) || data.length === 0) {
        ReactDOM.unstable_batchedUpdates(() => {
          params.setNodes([]);
          params.setEdges([]);
          params.setIsTransforming(false);
        });
        return;
      }

      const clusterTimestampMap = await fetchAllClusterTimestamps(data);

      // Clear caches when theme changes to ensure proper styling
      params.nodeCache.current.clear();
      params.edgeCache.current.clear();
      params.edgeIdCounter.current = 0;

      const newNodes: CustomNode[] = [];
      const newEdges: CustomEdge[] = [];

      if (!params.stateRef.current.isExpanded) {
        data.forEach(cluster => {
          const clusterId = `cluster:${cluster.cluster}`;
          const timestamp = clusterTimestampMap.get(cluster.cluster) || '';

          createNode({
            id: clusterId,
            label: cluster.cluster,
            type: 'cluster',
            status: 'Active',
            timestamp,
            namespace: undefined,
            resourceData: {
              apiVersion: 'v1',
              kind: 'Cluster',
              metadata: { name: cluster.cluster, namespace: '', creationTimestamp: timestamp },
              status: { phase: 'Active' },
            },
            parent: null,
            newNodes,
            newEdges,
            theme: params.theme,
            currentZoom: params.currentZoom,
            getScaledNodeStyle: params.getScaledNodeStyle,
            edgeType: params.edgeType,
            nodeCache: params.nodeCache,
            edgeCache: params.edgeCache,
            edgeIdCounter: params.edgeIdCounter,
            stateRef: params.stateRef,
            t: params.t,
            setSelectedNode: params.setSelectedNode,
            handleClosePanel: params.handleClosePanel,
            handleMenuOpen: params.handleMenuOpen,
          });
        });
      } else {
        await processExpandedView(data, clusterTimestampMap, newNodes, newEdges, params);
      }

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        newNodes,
        newEdges,
        'LR',
        params.prevNodes,
        params.currentZoom
      );

      ReactDOM.unstable_batchedUpdates(() => {
        if (!isEqual(params.nodes, layoutedNodes)) params.setNodes(layoutedNodes);
        if (!isEqual(params.edges, layoutedEdges)) params.setEdges(layoutedEdges);
        params.setIsTransforming(false);
      });
      params.prevNodes.current = layoutedNodes;
      params.setIsTransforming(false);
    },
    [fetchAllClusterTimestamps, params]
  );
};

const processExpandedView = async (
  data: WecsCluster[],
  clusterTimestampMap: Map<string, string>,
  newNodes: CustomNode[],
  newEdges: CustomEdge[],
  params: TransformDataParams
) => {
  data.forEach(cluster => {
    const clusterId = `cluster:${cluster.cluster}`;
    const timestamp = clusterTimestampMap.get(cluster.cluster) || '';

    createNode({
      id: clusterId,
      label: cluster.cluster,
      type: 'cluster',
      status: 'Active',
      timestamp,
      namespace: undefined,
      resourceData: {
        apiVersion: 'v1',
        kind: 'Cluster',
        metadata: { name: cluster.cluster, namespace: '', creationTimestamp: timestamp },
        status: { phase: 'Active' },
      },
      parent: null,
      newNodes,
      newEdges,
      theme: params.theme,
      currentZoom: params.currentZoom,
      getScaledNodeStyle: params.getScaledNodeStyle,
      edgeType: params.edgeType,
      nodeCache: params.nodeCache,
      edgeCache: params.edgeCache,
      edgeIdCounter: params.edgeIdCounter,
      stateRef: params.stateRef,
      t: params.t,
      setSelectedNode: params.setSelectedNode,
      handleClosePanel: params.handleClosePanel,
      handleMenuOpen: params.handleMenuOpen,
    });

    if (cluster.namespaces && Array.isArray(cluster.namespaces)) {
      cluster.namespaces.forEach(namespace => {
        const namespaceId = `ns:${cluster.cluster}:${namespace.namespace}`;
        createNode({
          id: namespaceId,
          label: namespace.namespace,
          type: 'namespace',
          status: 'Active',
          timestamp: '',
          namespace: namespace.namespace,
          resourceData: {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: {
              name: namespace.namespace,
              namespace: namespace.namespace,
              creationTimestamp: '',
            },
            status: { phase: 'Active' },
          },
          parent: clusterId,
          newNodes,
          newEdges,
          theme: params.theme,
          currentZoom: params.currentZoom,
          getScaledNodeStyle: params.getScaledNodeStyle,
          edgeType: params.edgeType,
          nodeCache: params.nodeCache,
          edgeCache: params.edgeCache,
          edgeIdCounter: params.edgeIdCounter,
          stateRef: params.stateRef,
          t: params.t,
          setSelectedNode: params.setSelectedNode,
          handleClosePanel: params.handleClosePanel,
          handleMenuOpen: params.handleMenuOpen,
        });

        if (namespace.resourceTypes && Array.isArray(namespace.resourceTypes)) {
          if (params.stateRef.current.isCollapsed) {
            processCollapsedResources(cluster, namespace, namespaceId, newNodes, newEdges, params);
          } else {
            processExpandedResources(cluster, namespace, namespaceId, newNodes, newEdges, params);
          }
        }
      });
    }
  });
};

const processCollapsedResources = (
  cluster: ClusterData,
  namespace: WecsNamespace,
  namespaceId: string,
  newNodes: CustomNode[],
  newEdges: CustomEdge[],
  params: TransformDataParams
) => {
  const resourceGroups: Record<string, ResourceItem[]> = {};

  namespace.resourceTypes.forEach((resourceType: WecsResourceType) => {
    // Skip Event type resources
    if (resourceType.kind.toLowerCase() === 'event') return;

    resourceType.resources.forEach((resource: WecsResource) => {
      const kindLower = resourceType.kind.toLowerCase();
      if (!resourceGroups[kindLower]) {
        resourceGroups[kindLower] = [];
      }
      resourceGroups[kindLower].push(resource.raw);
    });
  });

  Object.entries(resourceGroups).forEach(([kindLower, items]) => {
    const count = items.length;
    const groupId = `ns:${cluster.cluster}:${namespace.namespace}:${kindLower}:group`;
    const status = items.some(item => item.status?.phase === 'Running') ? 'Active' : 'Inactive';
    const label = `${count} ${kindLower}${count !== 1 ? 's' : ''}`;

    createNode({
      id: groupId,
      label,
      type: kindLower,
      status,
      timestamp: items[0]?.metadata.creationTimestamp,
      namespace: namespace.namespace,
      resourceData: items[0],
      parent: namespaceId,
      newNodes,
      newEdges,
      theme: params.theme,
      currentZoom: params.currentZoom,
      getScaledNodeStyle: params.getScaledNodeStyle,
      edgeType: params.edgeType,
      nodeCache: params.nodeCache,
      edgeCache: params.edgeCache,
      edgeIdCounter: params.edgeIdCounter,
      stateRef: params.stateRef,
      t: params.t,
      setSelectedNode: params.setSelectedNode,
      handleClosePanel: params.handleClosePanel,
      handleMenuOpen: params.handleMenuOpen,
    });
  });
};

const processExpandedResources = (
  cluster: ClusterData,
  namespace: WecsNamespace,
  namespaceId: string,
  newNodes: CustomNode[],
  newEdges: CustomEdge[],
  params: TransformDataParams
) => {
  // First collect all ReplicaSet names that are children of deployments
  const childReplicaSets = new Set<string>();

  namespace.resourceTypes.forEach((resourceType: WecsResourceType) => {
    if (resourceType.kind.toLowerCase() === 'deployment') {
      resourceType.resources.forEach((resource: WecsResource) => {
        if (resource && resource.replicaSets && Array.isArray(resource.replicaSets)) {
          resource.replicaSets.forEach((rs: ReplicaSetData) => {
            if (rs && rs.name) {
              childReplicaSets.add(rs.name);
            }
          });
        }
      });
    }
  });

  // Now process all resources while filtering ReplicaSets that are children
  namespace.resourceTypes.forEach((resourceType: WecsResourceType) => {
    // Skip Event type resources
    if (resourceType.kind.toLowerCase() === 'event') return;

    const kindLower = resourceType.kind.toLowerCase();

    resourceType.resources.forEach((resource: WecsResource, index: number) => {
      if (!resource || typeof resource !== 'object' || !resource.raw) return;
      const rawResource = resource.raw;
      if (
        !rawResource.metadata ||
        typeof rawResource.metadata !== 'object' ||
        !rawResource.metadata.name
      )
        return;

      // Skip ReplicaSets that are already children of Deployments
      if (kindLower === 'replicaset' && childReplicaSets.has(rawResource.metadata.name)) {
        return;
      }

      const resourceId = `${kindLower}:${cluster.cluster}:${namespace.namespace}:${rawResource.metadata.name}:${index}`;
      const status = rawResource.status?.phase || 'Active';

      createNode({
        id: resourceId,
        label: rawResource.metadata.name,
        type: kindLower,
        status,
        timestamp: rawResource.metadata.creationTimestamp,
        namespace: namespace.namespace,
        resourceData: rawResource,
        parent: namespaceId,
        newNodes,
        newEdges,
        theme: params.theme,
        currentZoom: params.currentZoom,
        getScaledNodeStyle: params.getScaledNodeStyle,
        edgeType: params.edgeType,
        nodeCache: params.nodeCache,
        edgeCache: params.edgeCache,
        edgeIdCounter: params.edgeIdCounter,
        stateRef: params.stateRef,
        t: params.t,
        setSelectedNode: params.setSelectedNode,
        handleClosePanel: params.handleClosePanel,
        handleMenuOpen: params.handleMenuOpen,
      });

      // Process specific resource types with their children
      processResourceChildren(
        resource,
        resourceId,
        kindLower,
        rawResource,
        status,
        cluster,
        namespace,
        newNodes,
        newEdges,
        params
      );
    });
  });
};

const processResourceChildren = (
  resource: WecsResource,
  resourceId: string,
  kindLower: string,
  rawResource: ResourceItem,
  status: string,
  cluster: ClusterData,
  namespace: WecsNamespace,
  newNodes: CustomNode[],
  newEdges: CustomEdge[],
  params: TransformDataParams
) => {
  const createChildNode = (
    childData: PodData | ReplicaSetData | { name: string; raw: ResourceItem },
    childType: string,
    parentId: string
  ) => {
    createNode({
      id: `${childType}:${cluster.cluster}:${namespace.namespace}:${childData.name}:${Math.random()}`,
      label: childData.name,
      type: childType,
      status: childData.raw.status?.phase || status,
      timestamp: childData.raw.metadata.creationTimestamp,
      namespace: namespace.namespace,
      resourceData: childData.raw,
      parent: parentId,
      newNodes,
      newEdges,
      theme: params.theme,
      currentZoom: params.currentZoom,
      getScaledNodeStyle: params.getScaledNodeStyle,
      edgeType: params.edgeType,
      nodeCache: params.nodeCache,
      edgeCache: params.edgeCache,
      edgeIdCounter: params.edgeIdCounter,
      stateRef: params.stateRef,
      t: params.t,
      setSelectedNode: params.setSelectedNode,
      handleClosePanel: params.handleClosePanel,
      handleMenuOpen: params.handleMenuOpen,
    });
  };

  if (kindLower === 'deployment' && rawResource.spec) {
    if (resource.replicaSets && Array.isArray(resource.replicaSets)) {
      resource.replicaSets.forEach((rs: ReplicaSetData, rsIndex: number) => {
        const replicaSetId = `replicaset:${cluster.cluster}:${namespace.namespace}:${rs.name}:${rsIndex}`;
        createChildNode(rs, 'replicaset', resourceId);

        if (rs.pods && Array.isArray(rs.pods)) {
          rs.pods.forEach((pod: PodData) => {
            createChildNode(pod, 'pod', replicaSetId);
          });
        }
      });
    }
  } else if (
    ['statefulset', 'daemonset', 'replicationcontroller', 'job'].includes(kindLower) &&
    rawResource.spec
  ) {
    if (resource.pods && Array.isArray(resource.pods)) {
      resource.pods.forEach((pod: PodData) => {
        createChildNode(pod, 'pod', resourceId);
      });
    }
  } else if (kindLower === 'replicaset' && rawResource.spec) {
    if (
      resource.replicaSets &&
      Array.isArray(resource.replicaSets) &&
      resource.replicaSets.length > 0
    ) {
      const pods = resource.replicaSets[0].pods;
      if (pods && Array.isArray(pods)) {
        pods.forEach((pod: PodData) => {
          createChildNode(pod, 'pod', resourceId);
        });
      }
    }
  } else if (kindLower === 'service' && rawResource.spec) {
    createChildNode(
      { name: `endpoints-${rawResource.metadata.name}`, raw: rawResource },
      'endpoints',
      resourceId
    );
  } else if (kindLower === 'configmap') {
    createChildNode(
      { name: `volume-${rawResource.metadata.name}`, raw: rawResource },
      'volume',
      resourceId
    );
  } else if (kindLower === 'secret') {
    createChildNode(
      { name: `envvar-${rawResource.metadata.name}`, raw: rawResource },
      'envvar',
      resourceId
    );
  }
};
