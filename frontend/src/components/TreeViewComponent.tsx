import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Box, Alert, Snackbar } from '@mui/material';
import useTheme from '../stores/themeStore';
import ContextDropdown from './ContextDropdown';
import CreateOptions from './CreateOptions';
import TreeViewHeader from './treeView/TreeViewHeader';
import TreeViewFilters from './treeView/TreeViewFilters';
import TreeViewCanvas from './treeView/TreeViewCanvas';
import NodeDetailsPanel from './treeView/NodeDetailsPanel';
import TreeViewContextMenu from './treeView/TreeViewContextMenu';
import TreeViewDeleteDialog from './treeView/TreeViewDeleteDialog';
import { useTreeViewData } from './treeView/hooks/useTreeViewData';
import { useTreeViewActions } from './treeView/hooks/useTreeViewActions';
import { ResourceItem as TreeResourceItem, CustomNode, CustomEdge } from './treeView/types';
import { ResourceFilter } from './ResourceFilters';
import { ResourceItem as ListResourceItem } from './ListViewComponent';

// Re-export types for other components to import
export type { ResourceItem as TreeResourceItem, CustomNode, CustomEdge } from './treeView/types';

interface TreeViewComponentProps {
  onViewModeChange?: (viewMode: 'tiles' | 'list') => void;
}

const TreeViewComponent = memo<TreeViewComponentProps>(props => {
  const theme = useTheme(state => state.theme);

  // State management
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [activeOption, setActiveOption] = useState<string | null>('option1');
  const [selectedNode, setSelectedNode] = useState<{
    namespace: string;
    name: string;
    type: string;
    resourceData?: TreeResourceItem;
    isGroup?: boolean;
    groupItems?: TreeResourceItem[];
    initialTab?: number;
  } | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [filteredContext, setFilteredContext] = useState<string>('all');
  const [allResources] = useState<ListResourceItem[]>([]);
  const [resourceFilters, setResourceFilters] = useState<ResourceFilter>({});

  const containerRef = useRef<HTMLDivElement>(null);

  // Node selection handler
  const handleNodeSelect = useCallback(
    (nodeData: {
      namespace: string;
      name: string;
      type: string;
      resourceData?: TreeResourceItem;
      isGroup?: boolean;
      groupItems?: TreeResourceItem[];
      initialTab?: number;
    }) => {
      setSelectedNode(nodeData);
    },
    []
  );

  // Temporary menu open handler - will be updated after actions hook is created
  const [handleMenuOpen, setHandleMenuOpen] = useState<
    ((event: React.MouseEvent, nodeId: string) => void) | null
  >(null);

  // Data management hook
  const {
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
  } = useTreeViewData({
    filteredContext,
    isCollapsed,
    isExpanded,
    onNodeSelect: handleNodeSelect,
    onMenuOpen: handleMenuOpen || (() => {}),
  });

  // Actions management hook
  const {
    contextMenu,
    deleteDialogOpen,
    deleteNodeDetails,
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    handleMenuOpen: handleMenuOpenFromActions,
    handleMenuClose,
    handleMenuAction,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleSnackbarClose,
  } = useTreeViewActions({
    nodes,
    edges,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onNodesUpdate: (_newNodes: CustomNode[]) => {
      // Update nodes state - handled by the data hook
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onEdgesUpdate: (_newEdges: CustomEdge[]) => {
      // Update edges state - handled by the data hook
    },
    getDescendantEdges,
    onNodeSelect: handleNodeSelect,
  });

  // Update the menu open handler after actions hook is created
  useEffect(() => {
    setHandleMenuOpen(() => handleMenuOpenFromActions);
  }, [handleMenuOpenFromActions]);

  // Panel close handler
  const handleClosePanel = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Context filter handler

  const handleContextFilter = useCallback((context: string) => {
    setFilteredContext(context);
  }, []);
  // Create options handlers
  const handleCancelCreateOptions = useCallback(() => {
    setShowCreateOptions(false);
  }, []);

  const handleCreateWorkloadClick = useCallback(() => {
    setShowCreateOptions(true);
    setActiveOption('option1');
  }, []);

  // Collapse/Expand handlers
  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const handleExpandAll = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const handleCollapseAll = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const handleResourceFiltersChange = useCallback((filters: ResourceFilter) => {
    setResourceFilters(filters);
  }, []);

  // Update node styles when theme or highlighting changes
  useEffect(() => {
    if (nodes.length > 0) {
      // Update nodes state with new styles - handled by the data hook
      updateNodeStyles(nodes);
    }
  }, [theme, nodes.length, updateNodeStyles, nodes]);

  // Notify parent component of view mode changes
  useEffect(() => {
    if (props.onViewModeChange) {
      props.onViewModeChange(viewMode);
    }
  }, [viewMode, props]);

  return (
    <Box
      ref={containerRef}
      sx={{
        display: 'flex',
        height: isFullscreen ? '100vh' : '85vh',
        width: '100%',
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 9999 : 'auto',
        backgroundColor: isFullscreen ? (theme === 'dark' ? '#0f172a' : '#ffffff') : 'transparent',
      }}
    >
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          filter: selectedNode ? 'blur(5px)' : 'none',
          transition: 'filter 0.2s ease-in-out',
          pointerEvents: selectedNode ? 'none' : 'auto',
        }}
      >
        <TreeViewHeader
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onCreateWorkload={handleCreateWorkloadClick}
        >
          <ContextDropdown
            onContextFilter={handleContextFilter}
            resourceCounts={contextResourceCounts}
            totalResourceCount={totalResourceCount}
          />
        </TreeViewHeader>

        {showCreateOptions && (
          <CreateOptions
            activeOption={activeOption}
            setActiveOption={setActiveOption}
            onCancel={handleCancelCreateOptions}
          />
        )}

        <TreeViewFilters
          filteredContext={filteredContext}
          resources={allResources}
          onResourceFiltersChange={handleResourceFiltersChange}
        />

        <Box sx={{ width: '100%', height: 'calc(100% - 80px)', position: 'relative' }}>
          <TreeViewCanvas
            isLoading={isLoading}
            viewMode={viewMode}
            nodes={nodes}
            edges={edges}
            renderStartTime={renderStartTime}
            filteredContext={filteredContext}
            onCreateWorkload={handleCreateWorkloadClick}
            onResourceDataChange={handleResourceDataChange}
            onToggleCollapse={handleToggleCollapse}
            onExpandAll={handleExpandAll}
            onCollapseAll={handleCollapseAll}
            isCollapsed={isCollapsed}
            containerRef={containerRef}
            resourceFilters={resourceFilters}
            onToggleFullscreen={handleToggleFullscreen}
            isFullscreen={isFullscreen}
          />

          <TreeViewContextMenu
            contextMenu={contextMenu}
            onClose={handleMenuClose}
            onAction={handleMenuAction}
          />
        </Box>

        <Snackbar
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={handleSnackbarClose}
        >
          <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>

        <TreeViewDeleteDialog
          open={deleteDialogOpen}
          deleteNodeDetails={deleteNodeDetails}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      </Box>

      <NodeDetailsPanel
        selectedNode={selectedNode}
        isOpen={!!selectedNode}
        onClose={handleClosePanel}
        onDelete={
          deleteNodeDetails
            ? () => {
                // Handle delete through actions hook
                if (deleteNodeDetails) {
                  handleDeleteConfirm();
                }
              }
            : undefined
        }
      />
    </Box>
  );
});

TreeViewComponent.displayName = 'TreeViewComponent';

export default TreeViewComponent;
