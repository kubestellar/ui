import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from '../../../context/webSocketExports';
import { useLocation } from 'react-router-dom';
import * as dagre from 'dagre';
import { isEqual } from 'lodash';
import useTheme from '../../../stores/themeStore';
import useZoomStore from '../../../stores/zoomStore';
import {
  NamespaceResource,
  CustomNode,
  CustomEdge,
  ResourceItem,
  ResourceDataChangeEvent,
} from '../types';
import { useTreeViewNodes } from '../TreeViewNodes';
import { useTreeViewEdges } from '../TreeViewEdges';

interface UseTreeViewDataProps {
  filteredContext: string;
  isCollapsed: boolean;
  isExpanded: boolean;
  onNodeSelect: (nodeData: {
    namespace: string;
    name: string;
    type: string;
    resourceData?: ResourceItem;
    isGroup?: boolean;
    groupItems?: ResourceItem[];
  }) => void;
  onMenuOpen: (event: React.MouseEvent, nodeId: string) => void;
}

export const useTreeViewData = ({
  filteredContext,
  isCollapsed,
  isExpanded,
  onNodeSelect,
  onMenuOpen,
}: UseTreeViewDataProps) => {
  const location = useLocation();
  const { isConnected, connect, hasValidData } = useWebSocket();
  const [nodes, setNodes] = useState<CustomNode[]>([]);
  const [edges, setEdges] = useState<CustomEdge[]>([]);
  const [isTransforming, setIsTransforming] = useState<boolean>(false);
  const [dataReceived, setDataReceived] = useState<boolean>(false);
  const [minimumLoadingTimeElapsed, setMinimumLoadingTimeElapsed] = useState<boolean>(false);
  const [contextResourceCounts, setContextResourceCounts] = useState<Record<string, number>>({});
  const [totalResourceCount, setTotalResourceCount] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'tiles' | 'list'>('tiles');

  const prevNodes = useRef<CustomNode[]>([]);
  const renderStartTime = useRef<number>(0);
  const isInitialRender = useRef(true);

  const NAMESPACE_QUERY_KEY = ['namespaces'];

  const { data: websocketData } = useQuery<NamespaceResource[]>({
    queryKey: NAMESPACE_QUERY_KEY,
    queryFn: async () => {
      throw new Error('API not implemented');
    },
    enabled: false,
    initialData: [],
  });

  const { createNode, clearNodeCache, updateNodeStyles } = useTreeViewNodes({
    onNodeSelect,
    onMenuOpen,
    isExpanded,
  });

  const theme = useTheme(state => state.theme);
  const { getDescendantEdges } = useTreeViewEdges({ theme: theme as 'light' | 'dark' });

  // Component mount effect
  useEffect(() => {
    if (isInitialRender.current) {
      renderStartTime.current = performance.now();
      isInitialRender.current = false;
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinimumLoadingTimeElapsed(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    connect(true);
  }, [connect]);

  useEffect(() => {
    if (websocketData !== undefined && !dataReceived) {
      setDataReceived(true);
    }
  }, [websocketData, dataReceived]);

  // Check for create=true in URL parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('create') === 'true') {
      // Handle create dialog opening
    }
  }, [location.search]);

  const getLayoutedElements = useCallback(
    (nodes: CustomNode[], edges: CustomEdge[], direction = 'LR') => {
      const { currentZoom } = useZoomStore.getState();
      const scaleFactor = Math.max(0.5, Math.min(2.0, currentZoom));

      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setDefaultEdgeLabel(() => ({}));
      dagreGraph.setGraph({
        rankdir: direction,
        nodesep: 50 * scaleFactor, // Increased from 30
        ranksep: 130 * scaleFactor, // Increased from 60
      });

      const nodeMap = new Map<string, CustomNode>();
      const newNodes: CustomNode[] = [];

      const shouldRecalculate = true;
      if (!shouldRecalculate && Math.abs(nodes.length - prevNodes.current.length) <= 5) {
        prevNodes.current.forEach(node => nodeMap.set(node.id, node));
      }

      nodes.forEach(node => {
        const cachedNode = nodeMap.get(node.id);
        if (!cachedNode || !isEqual(cachedNode, node) || shouldRecalculate) {
          dagreGraph.setNode(node.id, {
            width: 146 * scaleFactor,
            height: 30 * scaleFactor, // Match the actual node height from zoom store
          });
          newNodes.push(node);
        } else {
          newNodes.push({ ...cachedNode, ...node });
        }
      });

      edges.forEach(edge => {
        dagreGraph.setEdge(edge.source, edge.target);
      });

      dagre.layout(dagreGraph);

      const layoutedNodes = newNodes.map(node => {
        const dagreNode = dagreGraph.node(node.id);
        return dagreNode
          ? {
              ...node,
              position: {
                x: dagreNode.x - 73 * scaleFactor + 50 * scaleFactor,
                y: dagreNode.y - 15 * scaleFactor + 50 * scaleFactor, // This is correct: 30/2 = 15
              },
            }
          : node;
      });

      return { nodes: layoutedNodes, edges };
    },
    // Include dependencies for useZoomStore.getState() and any other external values
    [prevNodes]
  );

  const transformDataToTree = useCallback(
    (data: NamespaceResource[]) => {
      setIsTransforming(true);

      try {
        clearNodeCache();

        const newNodes: CustomNode[] = [];
        const newEdges: CustomEdge[] = [];

        const filteredData =
          filteredContext === 'all'
            ? data
            : data.filter(namespace => namespace.context === filteredContext);

        if (filteredData && filteredData.length > 0) {
          // Create context nodes
          filteredData.forEach((namespace: NamespaceResource) => {
            const contextId = `context:${namespace.context}`;
            createNode(
              contextId,
              namespace.context,
              'context',
              'Active',
              '',
              undefined,
              undefined,
              null,
              newNodes,
              newEdges
            );
          });

          if (isExpanded) {
            // Add namespace nodes and their children
            filteredData.forEach((namespace: NamespaceResource) => {
              const contextId = `context:${namespace.context}`;
              const namespaceId = `ns:${namespace.name}`;

              createNode(
                namespaceId,
                namespace.name,
                'namespace',
                namespace.status,
                '',
                namespace.name,
                {
                  apiVersion: 'v1',
                  kind: 'Namespace',
                  metadata: {
                    name: namespace.name,
                    namespace: namespace.name,
                    creationTimestamp: '',
                    labels: namespace.labels,
                  },
                  status: { phase: namespace.status },
                },
                contextId,
                newNodes,
                newEdges
              );

              // Process resources
              const resourcesMap = {
                endpoints: namespace.resources['.v1/endpoints'] || [],
                endpointSlices: namespace.resources['discovery.k8s.io.v1/endpointslices'] || [],
                ...namespace.resources,
              };

              if (isCollapsed) {
                // Handle collapsed view
                const resourceGroups: Record<string, ResourceItem[]> = {};

                Object.entries(resourcesMap).forEach(([key, items]) => {
                  // Group items by kind for collapsed view
                  console.log(`Processing resource type: ${key} with ${items.length} items`);
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
                  const status = items.some(item =>
                    item.status?.conditions?.some(
                      c => c.type === 'Available' && c.status === 'True'
                    )
                  )
                    ? 'Active'
                    : 'Inactive';
                  const label = `${count} ${kindLower}${count !== 1 ? 's' : ''}`;

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
                // Handle expanded view - process individual resources
                Object.entries(resourcesMap).forEach(([key, items]) => {
                  console.log(`Processing resource type: ${key}`);
                  items.forEach((item: ResourceItem, index: number) => {
                    const kindLower = item.kind.toLowerCase();
                    const resourceId = `ns:${namespace.name}:${kindLower}:${item.metadata.name}:${index}`;
                    const status = item.status?.conditions?.some(
                      c => c.type === 'Available' && c.status === 'True'
                    )
                      ? 'Active'
                      : 'Inactive';

                    createNode(
                      resourceId,
                      item.metadata.name,
                      kindLower,
                      status,
                      item.metadata.creationTimestamp,
                      namespace.name,
                      item,
                      namespaceId,
                      newNodes,
                      newEdges
                    );

                    // Add child nodes based on resource type
                    // This is a simplified version - you would add all the child node creation logic here
                  });
                });
              }
            });
          }
        }

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          newNodes,
          newEdges,
          'LR'
        );

        // React 18 automatically batches updates, no need for unstable_batchedUpdates
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        setIsTransforming(false);

        prevNodes.current = layoutedNodes;

        // Calculate resource counts
        const tempContextCounts: Record<string, number> = {};
        let tempTotalCount = 0;

        data.forEach(namespace => {
          const context = namespace.context || 'default';
          let namespaceResourceCount = 0;

          Object.keys(namespace.resources).forEach(resourceType => {
            const resourceList = namespace.resources[resourceType];
            if (Array.isArray(resourceList)) {
              namespaceResourceCount += resourceList.length;
            }
          });

          tempContextCounts[context] = (tempContextCounts[context] || 0) + namespaceResourceCount;
          tempTotalCount += namespaceResourceCount;
        });

        setContextResourceCounts(tempContextCounts);
        setTotalResourceCount(tempTotalCount);
      } catch (error) {
        console.error('Error transforming data to tree:', error);
      } finally {
        setIsTransforming(false);
      }
    },
    [filteredContext, isCollapsed, isExpanded, createNode, clearNodeCache, getLayoutedElements]
  );

  useEffect(() => {
    if (websocketData !== undefined) {
      setIsTransforming(true);
      transformDataToTree(websocketData);
    }
  }, [websocketData, transformDataToTree]);

  const handleResourceDataChange = useCallback(
    (data: ResourceDataChangeEvent) => {
      if (viewMode === 'list') {
        setContextResourceCounts(data.contextCounts);
        setTotalResourceCount(data.totalCount);
      }
    },
    [viewMode]
  );

  const isLoading = useMemo(
    () => !isConnected || !hasValidData || isTransforming || !minimumLoadingTimeElapsed,
    [isConnected, hasValidData, isTransforming, minimumLoadingTimeElapsed]
  );

  return {
    nodes,
    edges,
    isLoading,
    viewMode,
    setViewMode,
    contextResourceCounts,
    totalResourceCount,
    renderStartTime,
    handleResourceDataChange,
    updateNodeStyles,
    getDescendantEdges,
  };
};
