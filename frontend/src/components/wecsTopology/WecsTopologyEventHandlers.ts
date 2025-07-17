import { useCallback } from 'react';
import { CustomNode, SelectedNode, ContextMenuState, WecsCluster } from './WecsTopologyInterfaces';
import { parseNodeId } from './WecsTopologyUtils';

export const useContextMenuHandlers = (
  setContextMenu: (menu: ContextMenuState | null) => void,
  setSelectedNode: (node: SelectedNode | null) => void,
  handleClosePanel: () => void,
  nodes: CustomNode[]
) => {
  const handleMenuOpen = useCallback(
    (event: React.MouseEvent, nodeId: string) => {
      event.preventDefault();
      event.stopPropagation();
      let nodeType: string | null = null;
      if (nodeId.includes(':')) {
        const nodeIdParts = nodeId.split(':');
        nodeType = nodeIdParts[0];
      }
      setContextMenu({ nodeId, x: event.clientX, y: event.clientY, nodeType });
    },
    [setContextMenu]
  );

  const handleMenuClose = useCallback(() => setContextMenu(null), [setContextMenu]);

  const handleMenuAction = useCallback(
    async (action: string, contextMenu: ContextMenuState | null) => {
      if (contextMenu?.nodeId) {
        const node = nodes.find(n => n.id === contextMenu.nodeId);
        if (node) {
          const nodeName = node.data.label.props.label;
          const { cluster, namespace, nodeType } = parseNodeId(node.id);

          if (!nodeType) return;

          const resourceData = node.data.label.props.resourceData;
          const isDeploymentOrJobPod = node.data.isDeploymentOrJobPod;

          switch (action) {
            case 'Details':
              setSelectedNode({
                namespace: namespace || 'default',
                name: nodeName,
                type: nodeType,
                onClose: handleClosePanel,
                isOpen: true,
                resourceData,
                initialTab: 0,
                cluster,
                isDeploymentOrJobPod,
              });
              break;
            case 'Edit':
              setSelectedNode({
                namespace: namespace || 'default',
                name: nodeName,
                type: nodeType,
                onClose: handleClosePanel,
                isOpen: true,
                resourceData,
                initialTab: 1,
                cluster,
                isDeploymentOrJobPod,
              });
              break;
            case 'Logs':
              if (nodeType === 'pod' && isDeploymentOrJobPod) {
                setSelectedNode({
                  namespace: namespace || 'default',
                  name: nodeName,
                  type: nodeType,
                  onClose: handleClosePanel,
                  isOpen: true,
                  resourceData,
                  initialTab: 2,
                  cluster,
                  isDeploymentOrJobPod,
                });
              }
              break;
            case 'ExecPod':
              if (nodeType === 'pod') {
                setSelectedNode({
                  namespace: namespace || 'default',
                  name: nodeName,
                  type: nodeType,
                  onClose: handleClosePanel,
                  isOpen: true,
                  resourceData,
                  initialTab: 3,
                  cluster,
                  isDeploymentOrJobPod,
                });
              }
              break;
            default:
              break;
          }
        }
      }
      handleMenuClose();
    },
    [nodes, handleClosePanel, handleMenuClose, setSelectedNode]
  );

  return {
    handleMenuOpen,
    handleMenuClose,
    handleMenuAction,
  };
};

export const useViewToggleHandlers = (
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>,
  setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>,
  setIsTransforming: React.Dispatch<React.SetStateAction<boolean>>,
  stateRef: React.MutableRefObject<{ isCollapsed: boolean; isExpanded: boolean }>,
  transformDataToTree: (data: WecsCluster[]) => void,
  wecsData: WecsCluster[] | null
) => {
  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const newCollapsed = !prev;
      stateRef.current.isCollapsed = newCollapsed;
      setIsTransforming(true);
      if (wecsData) {
        transformDataToTree(wecsData);
      }
      return newCollapsed;
    });
  }, [wecsData, transformDataToTree, setIsCollapsed, setIsTransforming, stateRef]);

  const handleExpandAll = useCallback(() => {
    setIsExpanded(() => {
      const newExpanded = true;
      stateRef.current.isExpanded = newExpanded;
      setIsTransforming(true);
      if (wecsData) {
        transformDataToTree(wecsData);
      }
      return newExpanded;
    });
  }, [wecsData, transformDataToTree, setIsExpanded, setIsTransforming, stateRef]);

  const handleCollapseAll = useCallback(() => {
    setIsExpanded(() => {
      const newExpanded = false;
      stateRef.current.isExpanded = newExpanded;
      setIsTransforming(true);
      if (wecsData) {
        transformDataToTree(wecsData);
      }
      return newExpanded;
    });
  }, [wecsData, transformDataToTree, setIsExpanded, setIsTransforming, stateRef]);

  return {
    handleToggleCollapse,
    handleExpandAll,
    handleCollapseAll,
  };
};

export const useCreateOptionsHandlers = (
  setShowCreateOptions: React.Dispatch<React.SetStateAction<boolean>>,
  setActiveOption: React.Dispatch<React.SetStateAction<string | null>>
) => {
  const handleCancelCreateOptions = useCallback(() => {
    setShowCreateOptions(false);
  }, [setShowCreateOptions]);

  const handleCreateWorkloadClick = useCallback(() => {
    setShowCreateOptions(true);
    setActiveOption('option1');
  }, [setShowCreateOptions, setActiveOption]);

  return {
    handleCancelCreateOptions,
    handleCreateWorkloadClick,
  };
};

export const usePanelHandlers = (
  selectedNode: SelectedNode | null,
  setSelectedNode: React.Dispatch<React.SetStateAction<SelectedNode | null>>
) => {
  const handleClosePanel = useCallback(() => {
    if (selectedNode) {
      setSelectedNode({ ...selectedNode, isOpen: false });
      setTimeout(() => setSelectedNode(null), 400);
    }
  }, [selectedNode, setSelectedNode]);

  return {
    handleClosePanel,
  };
};
