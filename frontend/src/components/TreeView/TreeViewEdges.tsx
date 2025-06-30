import { useCallback } from 'react';
import { MarkerType } from 'reactflow';
import { CustomEdge } from './types';

interface TreeViewEdgesProps {
  theme: 'light' | 'dark';
}

export const useTreeViewEdges = ({ theme }: TreeViewEdgesProps) => {
  const createEdge = useCallback(
    (source: string, target: string, edgeId: string, animated: boolean = true): CustomEdge => {
      return {
        id: edgeId,
        source,
        target,
        type: 'step',
        animated,
        style: {
          stroke: theme === 'dark' ? '#777' : '#a3a3a3',
          strokeDasharray: '2,2',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: theme === 'dark' ? '#777' : '#a3a3a3',
        },
      };
    },
    [theme]
  );

  const updateEdgeStyles = useCallback(
    (edges: CustomEdge[]) => {
      return edges.map(edge => ({
        ...edge,
        style: {
          stroke: theme === 'dark' ? '#777' : '#a3a3a3',
          strokeDasharray: '2,2',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: theme === 'dark' ? '#777' : '#a3a3a3',
        },
      }));
    },
    [theme]
  );

  const filterEdgesByNodes = useCallback((edges: CustomEdge[], nodeIds: string[]) => {
    return edges.filter(edge => nodeIds.includes(edge.source) && nodeIds.includes(edge.target));
  }, []);

  const getConnectedEdges = useCallback((nodeId: string, edges: CustomEdge[]) => {
    return edges.filter(edge => edge.source === nodeId || edge.target === nodeId);
  }, []);

  const getDescendantEdges = useCallback((nodeId: string, edges: CustomEdge[]) => {
    const descendantEdges: CustomEdge[] = [];
    const queue: string[] = [nodeId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentNodeId = queue.shift()!;
      if (visited.has(currentNodeId)) continue;
      visited.add(currentNodeId);

      const children = edges.filter(edge => edge.source === currentNodeId).map(edge => edge.target);

      children.forEach(childId => {
        if (!visited.has(childId)) {
          const edge = edges.find(e => e.source === currentNodeId && e.target === childId);
          if (edge) {
            descendantEdges.push(edge);
          }
          queue.push(childId);
        }
      });
    }

    return descendantEdges;
  }, []);

  return {
    createEdge,
    updateEdgeStyles,
    filterEdgesByNodes,
    getConnectedEdges,
    getDescendantEdges,
  };
};
