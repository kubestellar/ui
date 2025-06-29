import React, { memo, useMemo } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { ReactFlowProvider } from 'reactflow';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useTheme from '../../stores/themeStore';
import { FlowCanvas } from '../Wds_Topology/FlowCanvas';
import { ZoomControls } from '../Wds_Topology/ZoomControls';
import FullScreenToggle from '../ui/FullScreenToggle';
import ListViewComponent from '../ListViewComponent';
import ListViewSkeleton from '../ui/ListViewSkeleton';
import TreeViewSkeleton from '../ui/TreeViewSkeleton';
import { CustomNode, CustomEdge, ResourceDataChangeEvent } from './types';

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
  }) => {
    const { t } = useTranslation();
    const theme = useTheme(state => state.theme);

    const hasData = useMemo(
      () => nodes.length > 0 || edges.length > 0,
      [nodes.length, edges.length]
    );

    if (isLoading) {
      return viewMode === 'list' ? <ListViewSkeleton itemCount={8} /> : <TreeViewSkeleton />;
    }

    if (viewMode === 'list') {
      return (
        <ListViewComponent
          filteredContext={filteredContext}
          onResourceDataChange={onResourceDataChange}
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
                    theme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                  padding: 4,
                  borderRadius: 2,
                }}
              >
                <Typography
                  sx={{
                    color: theme === 'dark' ? '#fff' : '#333',
                    fontWeight: 500,
                    fontSize: '22px',
                  }}
                >
                  {t('treeView.emptyState.title')}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#00000099',
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
                    backgroundColor: '#2f86ff',
                    color: '#fff',
                    '&:hover': { backgroundColor: '#1f76e5' },
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
