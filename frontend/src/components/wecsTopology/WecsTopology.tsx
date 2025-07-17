import { useState, useEffect, useRef, memo } from 'react';
import { Box, Typography, Menu, MenuItem, Button, IconButton } from '@mui/material';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus } from 'lucide-react';
import CreateOptions from '../CreateOptions';
import { ZoomControls } from '../wds_topology/ZoomControls';
import WecsTreeviewSkeleton from '../skeleton/WecsTreeviewSkeleton';
import ListViewSkeleton from '../skeleton/ListViewSkeleton';
import { useTranslation } from 'react-i18next';
import { useWebSocket } from '../../context/webSocketExports';
import useTheme from '../../stores/themeStore';
import useZoomStore from '../../stores/zoomStore';
import WecsDetailsPanel from '../WecsDetailsPanel';
import { FlowCanvas } from '../wds_topology/FlowCanvas';
import ListViewComponent from '../ListViewComponent';
import FullScreenToggle from '../skeleton/FullScreenToggle';
import useEdgeTypeStore from '../../stores/edgeTypeStore';
import {
  CustomNode,
  CustomEdge,
  WecsCluster,
  SelectedNode,
  ContextMenuState,
} from './WecsTopologyInterfaces';
import { useTransformDataToTree } from './WecsTopologyData';
import {
  useContextMenuHandlers,
  useViewToggleHandlers,
  useCreateOptionsHandlers,
  usePanelHandlers,
} from './WecsTopologyEventHandlers';
import { updateNodeStyles, updateEdgeStyles } from './WecsTopologyNodeHandling';
import { isEqual } from 'lodash';

const WecsTreeview = () => {
  const { t } = useTranslation();
  const theme = useTheme(state => state.theme);
  const { currentZoom, getScaledNodeStyle } = useZoomStore();
  const { edgeType } = useEdgeTypeStore();
  const [nodes, setNodes] = useState<CustomNode[]>([]);
  const [edges, setEdges] = useState<CustomEdge[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [activeOption, setActiveOption] = useState<string | null>('option1');
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [isTransforming, setIsTransforming] = useState<boolean>(false);
  const [dataReceived, setDataReceived] = useState<boolean>(false);
  const [minimumLoadingTimeElapsed, setMinimumLoadingTimeElapsed] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const nodeCache = useRef<Map<string, CustomNode>>(new Map());
  const edgeCache = useRef<Map<string, CustomEdge>>(new Map());
  const edgeIdCounter = useRef<number>(0);
  const prevNodes = useRef<CustomNode[]>([]);
  const renderStartTime = useRef<number>(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevWecsData = useRef<WecsCluster[] | null>(null);
  const stateRef = useRef({ isCollapsed, isExpanded });
  const [viewMode, setViewMode] = useState<'tiles' | 'list'>('tiles');
  const containerRef = useRef<HTMLDivElement>(null);

  const { wecsIsConnected, hasValidWecsData, wecsData } = useWebSocket();

  // Initialize hooks for modular functionality
  const { handleClosePanel } = usePanelHandlers(selectedNode, setSelectedNode);
  const { handleMenuOpen, handleMenuClose, handleMenuAction } = useContextMenuHandlers(
    setContextMenu,
    setSelectedNode,
    handleClosePanel,
    nodes
  );
  const { handleToggleCollapse, handleExpandAll, handleCollapseAll } = useViewToggleHandlers(
    setIsCollapsed,
    setIsExpanded,
    setIsTransforming,
    stateRef,
    data => transformDataToTree(data),
    wecsData as WecsCluster[] | null
  );
  const { handleCancelCreateOptions, handleCreateWorkloadClick } = useCreateOptionsHandlers(
    setShowCreateOptions,
    setActiveOption
  );

  // Initialize data transformation hook
  const transformDataToTree = useTransformDataToTree({
    setNodes,
    setEdges,
    setIsTransforming,
    prevNodes,
    currentZoom,
    edgeType,
    theme,
    getScaledNodeStyle,
    nodeCache,
    edgeCache,
    edgeIdCounter,
    stateRef,
    nodes,
    edges,
    t,
    setSelectedNode,
    handleClosePanel,
    handleMenuOpen,
  });

  useEffect(() => {
    renderStartTime.current = performance.now();
  }, []);

  // Add effect to update node styles when theme or zoom changes
  useEffect(() => {
    if (nodes.length > 0) {
      setNodes(currentNodes =>
        updateNodeStyles(currentNodes, theme, currentZoom, getScaledNodeStyle)
      );
      setEdges(currentEdges => updateEdgeStyles(currentEdges, theme));
    }
  }, [theme, nodes.length, currentZoom, getScaledNodeStyle]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinimumLoadingTimeElapsed(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (wecsData !== null && !dataReceived) {
      setDataReceived(true);
    }
  }, [wecsData, dataReceived]);

  useEffect(() => {
    stateRef.current = { isCollapsed, isExpanded };
  }, [isCollapsed, isExpanded]);

  useEffect(() => {
    if (wecsData !== null && !isEqual(wecsData, prevWecsData.current)) {
      setIsTransforming(true);

      const processData = async () => {
        try {
          await transformDataToTree(wecsData as WecsCluster[]);
          prevWecsData.current = wecsData as WecsCluster[];
        } catch (error) {
          console.error('Error transforming data:', error);
          setIsTransforming(false);
        }
      };

      processData();
    }
  }, [transformDataToTree, wecsData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectedNode?.isOpen &&
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        handleClosePanel();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedNode, handleClosePanel]);

  const isLoading =
    !wecsIsConnected || !hasValidWecsData || isTransforming || !minimumLoadingTimeElapsed;

  return (
    <Box
      ref={containerRef}
      sx={{ display: 'flex', height: '85vh', width: '100%', position: 'relative' }}
    >
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          filter: selectedNode?.isOpen ? 'blur(5px)' : 'none',
          transition: 'filter 0.2s ease-in-out',
          pointerEvents: selectedNode?.isOpen ? 'none' : 'auto',
        }}
      >
        <Box
          sx={{
            mb: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flex: 1,
            justifyContent: 'space-between',
            padding: 2,
            borderRadius: 1,
            boxShadow: '0 6px 6px rgba(0,0,0,0.1)',
            background: theme === 'dark' ? 'rgb(15, 23, 42)' : '#fff',
          }}
        >
          <Typography
            variant="h4"
            sx={{ color: '#4498FF', fontWeight: 700, fontSize: '30px', letterSpacing: '0.5px' }}
          >
            {t('wecsTopology.title')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              color={viewMode === 'tiles' ? 'primary' : 'default'}
              onClick={() => setViewMode('tiles')}
              sx={{
                padding: 1,
                borderRadius: '50%',
                width: 40,
                height: 40,
                bgcolor:
                  theme === 'dark' && viewMode === 'tiles'
                    ? 'rgba(144, 202, 249, 0.15)'
                    : 'transparent',
                '&:hover': {
                  bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                },
              }}
            >
              <span>
                <i
                  className="fa fa-th menu_icon"
                  title={t('wecsTopology.viewModes.tiles')}
                  style={{
                    color:
                      theme === 'dark' ? (viewMode === 'tiles' ? '#90CAF9' : '#FFFFFF') : undefined,
                  }}
                ></i>
              </span>
            </IconButton>
            <IconButton
              color={viewMode === 'list' ? 'primary' : 'default'}
              onClick={() => setViewMode('list')}
              sx={{
                padding: 1,
                borderRadius: '50%',
                width: 40,
                height: 40,

                bgcolor:
                  theme === 'dark' && viewMode === 'list'
                    ? 'rgba(144, 202, 249, 0.15)'
                    : 'transparent',
                '&:hover': {
                  bgcolor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                },
              }}
            >
              <span>
                <i
                  className="fa fa-th-list menu_icon"
                  title={t('wecsTopology.viewModes.list')}
                  style={{
                    color:
                      theme === 'dark' ? (viewMode === 'list' ? '#90CAF9' : '#FFFFFF') : undefined,
                  }}
                ></i>
              </span>
            </IconButton>
            <Button
              variant="outlined"
              startIcon={<Plus size={20} />}
              onClick={handleCreateWorkloadClick}
              sx={{
                color: '#FFFFFF',
                backgroundColor: '#2F86FF',
                padding: '8px 20px',
                fontWeight: '600',
                borderRadius: '8px',
                textTransform: 'none',
              }}
            >
              {t('wecsTopology.createWorkload')}
            </Button>
          </Box>
        </Box>

        {showCreateOptions && (
          <CreateOptions
            activeOption={activeOption}
            setActiveOption={setActiveOption}
            onCancel={handleCancelCreateOptions}
          />
        )}

        <Box
          sx={{
            width: '100%',
            padding: '8px 16px',
            backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
            borderRadius: '4px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }}
          >
            {t('wecsTopology.note')}
          </Typography>
        </Box>

        <Box sx={{ width: '100%', height: 'calc(100% - 80px)', position: 'relative' }}>
          {isLoading ? (
            viewMode === 'list' ? (
              <ListViewSkeleton itemCount={8} />
            ) : (
              <WecsTreeviewSkeleton />
            )
          ) : viewMode === 'list' ? (
            <ListViewComponent />
          ) : nodes.length > 0 || edges.length > 0 ? (
            <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
              <ReactFlowProvider>
                <FlowCanvas
                  nodes={nodes}
                  edges={edges}
                  renderStartTime={renderStartTime}
                  theme={theme}
                />
                <ZoomControls
                  theme={theme}
                  onToggleCollapse={handleToggleCollapse}
                  isCollapsed={isCollapsed}
                  onExpandAll={handleExpandAll}
                  onCollapseAll={handleCollapseAll}
                />
                <FullScreenToggle
                  containerRef={containerRef}
                  position="top-right"
                  tooltipPosition="left"
                  tooltipText={t('wecsTopology.fullscreen.toggle')}
                />
              </ReactFlowProvider>
            </Box>
          ) : (
            <Box
              sx={{
                width: '100%',
                backgroundColor:
                  theme === 'dark'
                    ? 'var(--fallback-b1,oklch(var(--b1)/var(--tw-bg-opacity)))'
                    : '#fff',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: '250px',
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <Typography
                  sx={{
                    color: theme === 'dark' ? '#fff' : '#333',
                    fontWeight: 500,
                    fontSize: '22px',
                  }}
                >
                  {t('wecsTopology.emptyState.title')}
                </Typography>
                <Typography variant="body2" sx={{ color: '#00000099', fontSize: '17px', mb: 2 }}>
                  {t('wecsTopology.emptyState.description')}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Plus size={20} />}
                  onClick={handleCreateWorkloadClick}
                  sx={{
                    backgroundColor: '#2f86ff',
                    color: '#fff',
                    '&:hover': { backgroundColor: '#1f76e5' },
                  }}
                >
                  {t('wecsTopology.createWorkload')}
                </Button>
              </Box>
            </Box>
          )}

          {contextMenu && (
            <Menu
              open={Boolean(contextMenu)}
              onClose={handleMenuClose}
              anchorReference="anchorPosition"
              anchorPosition={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined}
              PaperProps={{
                sx: {
                  backgroundColor: theme === 'dark' ? '#0F172A' : '#ffffff',
                  color: theme === 'dark' ? '#ffffff' : '#000000',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                  borderRadius: 1,
                  minWidth: 180,
                },
              }}
            >
              <MenuItem
                onClick={() => handleMenuAction('Details', contextMenu)}
                sx={{
                  color: theme === 'dark' ? '#DEE6EB' : '#000000',
                  '&:hover': {
                    backgroundColor:
                      theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                {t('wecsTopology.contextMenu.details')}
              </MenuItem>

              <MenuItem
                onClick={() => handleMenuAction('Edit', contextMenu)}
                sx={{
                  color: theme === 'dark' ? '#DEE6EB' : '#000000',
                  '&:hover': {
                    backgroundColor:
                      theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                {t('wecsTopology.contextMenu.edit')}
              </MenuItem>
              {contextMenu.nodeType === 'pod' &&
                contextMenu.nodeId &&
                contextMenu.nodeId.startsWith('pod:') &&
                nodes.find(n => n.id === contextMenu.nodeId)?.data?.isDeploymentOrJobPod && (
                  <MenuItem
                    onClick={() => handleMenuAction('Logs', contextMenu)}
                    sx={{
                      color: theme === 'dark' ? '#DEE6EB' : '#000000',
                      '&:hover': {
                        backgroundColor:
                          theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                  >
                    {t('wecsTopology.contextMenu.logs')}
                  </MenuItem>
                )}
              {contextMenu.nodeType === 'pod' &&
                contextMenu.nodeId &&
                contextMenu.nodeId.startsWith('pod:') &&
                nodes.find(n => n.id === contextMenu.nodeId)?.data?.isDeploymentOrJobPod && (
                  <MenuItem
                    onClick={() => handleMenuAction('ExecPod', contextMenu)}
                    sx={{
                      color: theme === 'dark' ? '#fff' : 'inherit',
                      '&:hover': {
                        backgroundColor:
                          theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                  >
                    {t('wecsTopology.contextMenu.execPods')}
                  </MenuItem>
                )}
            </Menu>
          )}
        </Box>
      </Box>

      <div ref={panelRef}>
        <WecsDetailsPanel
          namespace={selectedNode?.namespace || ''}
          name={selectedNode?.name || ''}
          type={selectedNode?.type || ''}
          resourceData={selectedNode?.resourceData}
          onClose={handleClosePanel}
          isOpen={selectedNode?.isOpen || false}
          initialTab={selectedNode?.initialTab}
          cluster={selectedNode?.cluster || ''}
          isDeploymentOrJobPod={selectedNode?.isDeploymentOrJobPod}
        />
      </div>
    </Box>
  );
};

export default memo(WecsTreeview);
