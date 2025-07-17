import React from 'react';
import { Position, MarkerType } from 'reactflow';
import { NodeLabel } from '../wds_topology/NodeLabel';
import { CustomNode, CustomEdge, ResourceItem, SelectedNode } from './WecsTopologyInterfaces';
import { getNodeConfig, getTimeAgo, isDeploymentOrJobPod } from './WecsTopologyUtils';

interface CreateNodeParams {
  id: string;
  label: string;
  type: string;
  status: string;
  timestamp: string | undefined;
  namespace: string | undefined;
  resourceData: ResourceItem | undefined;
  parent: string | null;
  newNodes: CustomNode[];
  newEdges: CustomEdge[];
  theme: string;
  currentZoom: number;
  getScaledNodeStyle: (zoom: number) => React.CSSProperties;
  edgeType: string;
  nodeCache: React.MutableRefObject<Map<string, CustomNode>>;
  edgeCache: React.MutableRefObject<Map<string, CustomEdge>>;
  edgeIdCounter: React.MutableRefObject<number>;
  stateRef: React.MutableRefObject<{ isCollapsed: boolean; isExpanded: boolean }>;
  t: (key: string, options?: { count?: number }) => string;
  setSelectedNode: (node: SelectedNode | null) => void;
  handleClosePanel: () => void;
  handleMenuOpen: (event: React.MouseEvent, nodeId: string) => void;
}

export const createNode = ({
  id,
  label,
  type,
  status,
  timestamp,
  namespace,
  resourceData,
  parent,
  newNodes,
  newEdges,
  theme,
  currentZoom,
  getScaledNodeStyle,
  edgeType,
  nodeCache,
  edgeCache,
  edgeIdCounter,
  stateRef,
  t,
  setSelectedNode,
  handleClosePanel,
  handleMenuOpen,
}: CreateNodeParams) => {
  const config = getNodeConfig(type.toLowerCase());
  const timeAgo = getTimeAgo(timestamp, t);
  const cachedNode = nodeCache.current.get(id);

  const isDeploymentOrJobPodNode = isDeploymentOrJobPod(type, parent);

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
            onClick={e => {
              if (
                (e.target as HTMLElement).tagName === 'svg' ||
                (e.target as HTMLElement).closest('svg')
              )
                return;
              if (type.toLowerCase() === 'namespace') return;
              const nodeIdParts = id.split(':');
              let cluster = '';
              if (type.toLowerCase() === 'cluster' && nodeIdParts.length === 2) {
                cluster = nodeIdParts[1];
              } else if (type.toLowerCase() === 'namespace' && nodeIdParts.length === 3) {
                cluster = nodeIdParts[1];
              } else if (nodeIdParts.length >= 4) {
                cluster = nodeIdParts[1];
              }
              setSelectedNode({
                namespace: namespace || 'default',
                name: label,
                type: type.toLowerCase(),
                onClose: handleClosePanel,
                isOpen: true,
                resourceData,
                initialTab: 0,
                cluster,
                isDeploymentOrJobPod: isDeploymentOrJobPodNode,
              });
            }}
            onMenuClick={e => handleMenuOpen(e, id)}
          />
        ),
        isDeploymentOrJobPod: isDeploymentOrJobPodNode,
      },
      position: { x: 0, y: 0 },
      style: {
        ...getScaledNodeStyle(currentZoom),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme === 'dark' ? '#333' : '#fff',
        color: theme === 'dark' ? '#fff' : '#000',
        transition: 'all 0.2s ease-in-out',
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    } as CustomNode);

  if (cachedNode) {
    node.style = {
      ...getScaledNodeStyle(currentZoom),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme === 'dark' ? '#333' : '#fff',
      color: theme === 'dark' ? '#fff' : '#000',
      transition: 'all 0.2s ease-in-out',
    };
  }

  if (!cachedNode) nodeCache.current.set(id, node);
  newNodes.push(node);

  if (parent && stateRef.current.isExpanded) {
    const uniqueSuffix = resourceData?.metadata?.uid || edgeIdCounter.current++;
    const edgeId = `edge-${parent}-${id}-${uniqueSuffix}`;
    const cachedEdge = edgeCache.current.get(edgeId);
    if (!cachedEdge) {
      const edge = {
        id: edgeId,
        source: parent,
        target: id,
        type: edgeType,
        animated: true,
        style: { stroke: theme === 'dark' ? '#ccc' : '#a3a3a3', strokeDasharray: '2,2' },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: theme === 'dark' ? '#ccc' : '#a3a3a3',
        },
      };
      newEdges.push(edge);
      edgeCache.current.set(edgeId, edge);
    } else {
      // Update cached edge styles for the current theme
      const markerEnd: { type: MarkerType; color?: string; width?: number; height?: number } = {
        type: cachedEdge.markerEnd?.type || MarkerType.ArrowClosed,
        color: theme === 'dark' ? '#ccc' : '#a3a3a3',
      };

      const updatedEdge = {
        ...cachedEdge,
        style: { stroke: theme === 'dark' ? '#ccc' : '#a3a3a3', strokeDasharray: '2,2' },
        markerEnd,
        type: edgeType,
      };
      newEdges.push(updatedEdge);
    }
  }
};

export const updateNodeStyles = (
  nodes: CustomNode[],
  theme: string,
  currentZoom: number,
  getScaledNodeStyle: (zoom: number) => React.CSSProperties
): CustomNode[] => {
  return nodes.map(node => {
    return {
      ...node,
      style: {
        ...getScaledNodeStyle(currentZoom),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme === 'dark' ? '#333' : '#fff',
        color: theme === 'dark' ? '#fff' : '#000',
        transition: 'all 0.2s ease-in-out',
      },
    };
  });
};

export const updateEdgeStyles = (edges: CustomEdge[], theme: string): CustomEdge[] => {
  return edges.map(edge => {
    // Make a type-safe copy of the marker end
    const markerEnd: { type: MarkerType; color?: string; width?: number; height?: number } = {
      type: edge.markerEnd?.type || MarkerType.ArrowClosed,
      color: theme === 'dark' ? '#ccc' : '#a3a3a3',
    };

    // If the original marker has width and height, preserve them
    if (edge.markerEnd?.width) {
      markerEnd.width = edge.markerEnd.width;
    }

    if (edge.markerEnd?.height) {
      markerEnd.height = edge.markerEnd.height;
    }

    return {
      ...edge,
      style: {
        stroke: theme === 'dark' ? '#ccc' : '#a3a3a3',
        strokeDasharray: '2,2',
      },
      markerEnd,
    };
  });
};
