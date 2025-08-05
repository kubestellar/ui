import { useCallback, useMemo } from 'react';
import { MarkerType } from 'reactflow';
import { CustomEdge } from './types';
import useEdgeTypeStore from '../../stores/edgeTypeStore';

interface TreeViewEdgesProps {
  theme: 'light' | 'dark';
}

export const useTreeViewEdges = ({ theme }: TreeViewEdgesProps) => {
  const { edgeType } = useEdgeTypeStore();

  // Enhanced color schemes for different edge types
  const edgeStyles = useMemo(
    () => ({
      default: {
        stroke: theme === 'dark' ? 'url(#edge-gradient-dark)' : 'url(#edge-gradient-light)',
        strokeWidth: 2,
        opacity: 0.8, // Increased opacity for better visibility
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
      },
      active: {
        stroke:
          theme === 'dark' ? 'url(#edge-gradient-active-dark)' : 'url(#edge-gradient-active-light)',
        strokeWidth: 3,
        opacity: 1,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
      },
      success: {
        stroke:
          theme === 'dark'
            ? 'url(#edge-gradient-success-dark)'
            : 'url(#edge-gradient-success-light)',
        strokeWidth: 2.5,
        opacity: 0.9,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
      },
      warning: {
        stroke:
          theme === 'dark'
            ? 'url(#edge-gradient-warning-dark)'
            : 'url(#edge-gradient-warning-light)',
        strokeWidth: 2.5,
        opacity: 0.9,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
      },
      error: {
        stroke:
          theme === 'dark' ? 'url(#edge-gradient-error-dark)' : 'url(#edge-gradient-error-light)',
        strokeWidth: 2.5,
        opacity: 0.9,
        strokeLinecap: 'round' as const,
        strokeLinejoin: 'round' as const,
      },
    }),
    [theme]
  );

  type EdgeStatus = 'default' | 'active' | 'success' | 'warning' | 'error';

  const createEdge = useCallback(
    (
      source: string,
      target: string,
      edgeId: string,
      animated: boolean = true,
      status: EdgeStatus = 'default'
    ): CustomEdge => {
      const style = edgeStyles[status];

      return {
        id: edgeId,
        source,
        target,
        type: edgeType,
        animated,
        style: {
          ...style,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          filter:
            theme === 'dark'
              ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
              : 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 12,
          height: 12,
          color:
            status === 'default'
              ? theme === 'dark'
                ? '#64748b'
                : '#94a3b8'
              : status === 'success'
                ? '#10b981'
                : status === 'warning'
                  ? '#f59e0b'
                  : status === 'error'
                    ? '#ef4444'
                    : '#3b82f6', // active
        },
        data: {
          status,
          animated,
        },
      };
    },
    [theme, edgeType, edgeStyles]
  );

  const updateEdgeStyles = useCallback(
    (edges: CustomEdge[], highlightedNodes?: string[]) => {
      return edges.map(edge => {
        const isHighlighted =
          highlightedNodes &&
          (highlightedNodes.includes(edge.source) || highlightedNodes.includes(edge.target));

        const status = (isHighlighted ? 'active' : edge.data?.status || 'default') as EdgeStatus;
        const style = edgeStyles[status];

        return {
          ...edge,
          style: {
            ...style,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            filter:
              theme === 'dark'
                ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                : 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
            animation: isHighlighted ? 'edge-pulse 2s ease-in-out infinite' : 'none',
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: isHighlighted ? 14 : 12,
            height: isHighlighted ? 14 : 12,
            color:
              status === 'default'
                ? theme === 'dark'
                  ? '#64748b'
                  : '#94a3b8'
                : status === 'success'
                  ? '#10b981'
                  : status === 'warning'
                    ? '#f59e0b'
                    : status === 'error'
                      ? '#ef4444'
                      : '#3b82f6', // active
          },
          animated: edge.animated || isHighlighted,
        };
      });
    },
    [theme, edgeStyles]
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

  // SVG gradient definitions for beautiful edge styling
  const edgeGradients = useMemo(
    () => (
      <defs>
        {/* Default gradients */}
        <linearGradient id="edge-gradient-dark" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#64748b" stopOpacity="0.3" />
          <stop offset="50%" stopColor="#94a3b8" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#64748b" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="edge-gradient-light" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#64748b" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.4" />
        </linearGradient>

        {/* Active gradients */}
        <linearGradient id="edge-gradient-active-dark" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#6366f1" stopOpacity="1" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="edge-gradient-active-light" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.7" />
        </linearGradient>

        {/* Success gradients */}
        <linearGradient id="edge-gradient-success-dark" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#34d399" stopOpacity="1" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="edge-gradient-success-light" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.7" />
        </linearGradient>

        {/* Warning gradients */}
        <linearGradient id="edge-gradient-warning-dark" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#fbbf24" stopOpacity="1" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="edge-gradient-warning-light" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#f59e0b" stopOpacity="1" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.7" />
        </linearGradient>

        {/* Error gradients */}
        <linearGradient id="edge-gradient-error-dark" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#f87171" stopOpacity="1" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="edge-gradient-error-light" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f87171" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#ef4444" stopOpacity="1" />
          <stop offset="100%" stopColor="#f87171" stopOpacity="0.7" />
        </linearGradient>
      </defs>
    ),
    []
  );

  return {
    createEdge,
    updateEdgeStyles,
    filterEdgesByNodes,
    getConnectedEdges,
    getDescendantEdges,
    edgeGradients,
  };
};
