import React, { memo, useMemo } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { ReactFlowProvider } from 'reactflow';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useTheme from '../../stores/themeStore';
import { FlowCanvas } from '../wds_topology/FlowCanvas';
import { ZoomControls } from '../wds_topology/ZoomControls';
import FullScreenToggle from '../skeleton/FullScreenToggle';
import ListViewComponent, { ResourceItem as ListViewResourceItem } from '../ListViewComponent';
import ListViewSkeleton from '../skeleton/ListViewSkeleton';
import TreeViewSkeleton from '../skeleton/TreeViewSkeleton';
import { darkTheme, lightTheme } from '../../lib/theme-utils';
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
    containerRef,
    resourceFilters,
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
      return viewMode === 'list' ? <ListViewSkeleton itemCount={8} /> : <TreeViewSkeleton />;
    }

    if (viewMode === 'list') {
      return (
        <ListViewComponent
          filteredContext={filteredContext}
          onResourceDataChange={handleResourceDataChange}
          initialResourceFilters={resourceFilters}
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
                  gap: 1,
                  backgroundColor:
                    theme === 'dark' ? darkTheme.element.card : lightTheme.element.card,
                  padding: 4,
                  borderRadius: 2,
                  boxShadow: theme === 'dark' ? darkTheme.shadow.md : lightTheme.shadow.md,
                }}
              >
                <Typography
                  sx={{
                    color: theme === 'dark' ? darkTheme.text.primary : lightTheme.text.primary,
                    fontWeight: 500,
                    fontSize: '22px',
                  }}
                >
                  {t('treeView.emptyState.title')}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: theme === 'dark' ? darkTheme.text.secondary : lightTheme.text.secondary,
                    fontSize: '17px',
                    mb: 2,
                  }}
                >
                  {t('treeView.emptyState.description')}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Plus size={20} />}
                  onClick={onCreateWorkload}
                  sx={{
                    backgroundColor:
                      theme === 'dark' ? darkTheme.brand.primary : lightTheme.brand.primary,
                    color: '#fff',
                    '&:hover': {
                      backgroundColor:
                        theme === 'dark'
                          ? darkTheme.brand.primaryDark
                          : lightTheme.brand.primaryDark,
                    },
                    boxShadow: theme === 'dark' ? darkTheme.shadow.md : lightTheme.shadow.md,
                  }}
                >
                  {t('treeView.createWorkload')}
                </Button>
              </Box>
            </Box>
            <FullScreenToggle
              containerRef={containerRef}
              position="top-right"
              tooltipPosition="left"
              tooltipText={t('treeView.fullscreen.toggle')}
            />
          </ReactFlowProvider>
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
          />
          <FullScreenToggle
            containerRef={containerRef}
            position="top-right"
            tooltipPosition="left"
            tooltipText={t('treeView.fullscreen.toggle')}
          />
        </ReactFlowProvider>
      </Box>
    );
  }
);

TreeViewCanvas.displayName = 'TreeViewCanvas';

export default TreeViewCanvas;
