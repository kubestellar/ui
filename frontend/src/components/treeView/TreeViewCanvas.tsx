import React, { memo, useMemo } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { ReactFlowProvider } from 'reactflow';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useTheme from '../../stores/themeStore';
import { FlowCanvas } from '../wds_topology/FlowCanvas';
import { ZoomControls } from '../wds_topology/ZoomControls';

import ListViewComponent, { ResourceItem as ListViewResourceItem } from '../ListViewComponent';
import ListViewSkeleton from '../skeleton/ListViewSkeleton';
import UnifiedSkeleton from '../skeleton/UnifiedSkeleton';

import { CustomNode, CustomEdge, ResourceDataChangeEvent, ResourceItem } from './types';
import { ResourceFilter } from '../ResourceFilters';

// Helper function to adapt resource items
const adaptResourceItem = (item: ListViewResourceItem): ResourceItem => {
  return {
    apiVersion: item.version || '',
    kind: item.kind,
    metadata: {
      name: item.name,
      namespace: item.namespace,
      creationTimestamp: item.createdAt,
      labels: item.labels,
      uid: item.uid,
    },
  };
};

interface TreeViewCanvasProps {
  isLoading: boolean;
  viewMode: 'tiles' | 'list';
  nodes: CustomNode[];
  edges: CustomEdge[];
  renderStartTime: React.MutableRefObject<number>;
  filteredContext: string;
  onCreateWorkload: () => void;
  onResourceDataChange: (data: ResourceDataChangeEvent) => void;
  onToggleCollapse: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  isCollapsed: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  resourceFilters?: ResourceFilter;
  onResourceFiltersChange?: (filters: ResourceFilter) => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

const TreeViewCanvas = memo<TreeViewCanvasProps>(
  ({
    isLoading,
    viewMode,
    nodes,
    edges,
    renderStartTime,
    filteredContext,
    onCreateWorkload,
    onResourceDataChange,
    onToggleCollapse,
    onExpandAll,
    onCollapseAll,
    isCollapsed,
    resourceFilters,
    onResourceFiltersChange,
    onToggleFullscreen,
    isFullscreen = false,
  }) => {
    const { t } = useTranslation();
    const theme = useTheme(state => state.theme);

    const hasData = useMemo(
      () => nodes.length > 0 || edges.length > 0,
      [nodes.length, edges.length]
    );

    // Create a wrapper function that adapts the data before calling the original callback
    const handleResourceDataChange = useMemo(() => {
      if (!onResourceDataChange) return undefined;

      return (data: {
        resources: ListViewResourceItem[];
        filteredResources: ListViewResourceItem[];
        contextCounts: Record<string, number>;
        totalCount: number;
      }) => {
        const adaptedData: ResourceDataChangeEvent = {
          resources: data.resources.map(adaptResourceItem),
          filteredResources: data.filteredResources.map(adaptResourceItem),
          contextCounts: data.contextCounts,
          totalCount: data.totalCount,
        };
        onResourceDataChange(adaptedData);
      };
    }, [onResourceDataChange]);

    if (isLoading) {
      return viewMode === 'list' ? <ListViewSkeleton itemCount={8} /> : <UnifiedSkeleton />;
    }

    if (viewMode === 'list') {
      return (
        <ListViewComponent
          filteredContext={filteredContext}
          onResourceDataChange={handleResourceDataChange}
          initialResourceFilters={resourceFilters}
          onResourceFiltersChange={onResourceFiltersChange}
        />
      );
    }

    if (!hasData) {
      return (
        <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
          <ReactFlowProvider>
            <FlowCanvas nodes={[]} edges={[]} renderStartTime={renderStartTime} theme={theme} />
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  background:
                    theme === 'dark'
                      ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))'
                      : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95))',
                  padding: 6,
                  borderRadius: '20px',
                  boxShadow:
                    theme === 'dark'
                      ? '0 20px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                      : '0 20px 60px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                  border:
                    theme === 'dark'
                      ? '1px solid rgba(148, 163, 184, 0.2)'
                      : '1px solid rgba(148, 163, 184, 0.3)',
                  backdropFilter: 'blur(20px)',
                  maxWidth: '400px',
                  textAlign: 'center',
                  animation: 'bounceIn 0.8s ease-out',
                  position: 'relative',
                }}
              >
                {/* Adorable empty state illustration */}
                <Box
                  sx={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background:
                      theme === 'dark'
                        ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
                        : 'linear-gradient(135deg, #60a5fa, #3b82f6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 2,
                    position: 'relative',
                    boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3)',
                    animation: 'float 3s ease-in-out infinite',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: '-4px',
                      left: '-4px',
                      right: '-4px',
                      bottom: '-4px',
                      borderRadius: '50%',
                      background:
                        theme === 'dark'
                          ? 'linear-gradient(135deg, #1e293b, #334155)'
                          : 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                      zIndex: -1,
                    },
                  }}
                >
                  <Plus
                    size={50}
                    color="white"
                    style={{
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                      animation: 'pulse 2s ease-in-out infinite',
                    }}
                  />

                  {/* Floating sparkles */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#fbbf24',
                      animation: 'sparkle 2s ease-in-out infinite',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: '20px',
                      left: '15px',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#34d399',
                      animation: 'sparkle 2s ease-in-out infinite 0.5s',
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '30px',
                      left: '5px',
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      background: '#f472b6',
                      animation: 'sparkle 2s ease-in-out infinite 1s',
                    }}
                  />
                </Box>

                <Typography
                  sx={{
                    background:
                      theme === 'dark'
                        ? 'linear-gradient(135deg, #f1f5f9, #e2e8f0)'
                        : 'linear-gradient(135deg, #1e293b, #334155)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontWeight: 700,
                    fontSize: '28px',
                    letterSpacing: '0.5px',
                    marginBottom: 1,
                  }}
                >
                  ✨ {t('treeView.emptyState.title')} ✨
                </Typography>

                <Typography
                  variant="body1"
                  sx={{
                    color: theme === 'dark' ? '#94a3b8' : '#64748b',
                    fontSize: '16px',
                    lineHeight: 1.6,
                    marginBottom: 3,
                    fontWeight: '500',
                  }}
                >
                  {t('treeView.emptyState.description')}
                </Typography>

                <Button
                  variant="contained"
                  startIcon={<Plus size={20} />}
                  onClick={onCreateWorkload}
                  sx={{
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    color: '#ffffff',
                    fontWeight: '600',
                    fontSize: '16px',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    textTransform: 'none',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                      transform: 'translateY(-2px) scale(1.02)',
                      boxShadow: '0 12px 32px rgba(59, 130, 246, 0.4)',
                    },
                    '&:active': {
                      transform: 'translateY(0) scale(0.98)',
                    },
                  }}
                >
                  {t('treeView.createWorkload')}
                </Button>

                {/* Decorative elements */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                    animation: 'bounce 2s ease-in-out infinite',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: '-8px',
                    left: '-8px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10b981, #34d399)',
                    animation: 'bounce 2s ease-in-out infinite 1s',
                  }}
                />
              </Box>
            </Box>
          </ReactFlowProvider>

          {/* Enhanced animations for adorable empty state - GPU optimized */}
          <style>{`
            @keyframes float {
              0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
              33% { transform: translate3d(0, -10px, 0) rotate(1deg); }
              66% { transform: translate3d(0, -5px, 0) rotate(-1deg); }
            }
            @keyframes sparkle {
              0%, 100% { opacity: 0; transform: scale3d(0, 0, 1) rotate(0deg); }
              50% { opacity: 1; transform: scale3d(1, 1, 1) rotate(180deg); }
            }
            @keyframes bounce {
              0%, 100% { transform: translate3d(0, 0, 0); }
              50% { transform: translate3d(0, -10px, 0); }
            }
            @keyframes pulse {
              0%, 100% { transform: scale3d(1, 1, 1); }
              50% { transform: scale3d(1.1, 1.1, 1); }
            }
            @keyframes bounceIn {
              0% { transform: scale3d(0.3, 0.3, 1) translate3d(0, 20px, 0); opacity: 0; }
              50% { transform: scale3d(1.05, 1.05, 1) translate3d(0, -10px, 0); }
              70% { transform: scale3d(0.9, 0.9, 1) translate3d(0, 5px, 0); }
              100% { transform: scale3d(1, 1, 1) translate3d(0, 0, 0); opacity: 1; }
            }
          `}</style>
        </Box>
      );
    }

    return (
      <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
        <ReactFlowProvider>
          <FlowCanvas nodes={nodes} edges={edges} renderStartTime={renderStartTime} theme={theme} />
          <ZoomControls
            theme={theme}
            onToggleCollapse={onToggleCollapse}
            isCollapsed={isCollapsed}
            onExpandAll={onExpandAll}
            onCollapseAll={onCollapseAll}
            onToggleFullscreen={onToggleFullscreen}
            isFullscreen={isFullscreen}
            translationPrefix="treeView"
          />
        </ReactFlowProvider>
      </Box>
    );
  }
);

TreeViewCanvas.displayName = 'TreeViewCanvas';

export default TreeViewCanvas;
