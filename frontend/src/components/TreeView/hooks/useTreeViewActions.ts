import { useState, useCallback } from 'react';
import axios from 'axios';
import { CustomNode, CustomEdge, DeleteNodeDetails, ContextMenuState } from '../types';
import { kindToPluralMap } from '../types';

interface UseTreeViewActionsProps {
  nodes: CustomNode[];
  edges: CustomEdge[];
  onNodesUpdate: (nodes: CustomNode[]) => void;
  onEdgesUpdate: (edges: CustomEdge[]) => void;
  getDescendantEdges: (nodeId: string, edges: CustomEdge[]) => CustomEdge[];
}

export const useTreeViewActions = ({
  nodes,
  edges,
  onNodesUpdate,
  onEdgesUpdate,
  getDescendantEdges,
}: UseTreeViewActionsProps) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [deleteNodeDetails, setDeleteNodeDetails] = useState<DeleteNodeDetails | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const handleMenuOpen = useCallback((event: React.MouseEvent, nodeId: string) => {
    event.preventDefault();
    event.stopPropagation();
    const nodeType: string = nodeId.split(':')[0] || '';
    setContextMenu({ nodeId, x: event.clientX, y: event.clientY, nodeType: nodeType });
  }, []);

  const handleMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleDeleteNode = useCallback(
    async (namespace: string, nodeType: string, nodeName: string, nodeId: string) => {
      try {
        let endpoint: string;

        if (nodeType.toLowerCase() === 'namespace') {
          endpoint = `${process.env.VITE_BASE_URL}/api/namespaces/delete/${namespace}`;
        } else {
          const kind = nodeType.charAt(0).toUpperCase() + nodeType.slice(1);
          const pluralForm = kindToPluralMap[kind] || `${nodeType.toLowerCase()}s`;
          endpoint = `${process.env.VITE_BASE_URL}/api/${pluralForm}/${namespace}/${nodeName}`;
        }

        await axios.delete(endpoint);

        const descendantNodeIds = getDescendantEdges(nodeId, edges).map(edge => edge.target);
        const nodesToDelete = [nodeId, ...descendantNodeIds];

        onNodesUpdate(nodes.filter(n => !nodesToDelete.includes(n.id)));
        onEdgesUpdate(
          edges.filter(e => !nodesToDelete.includes(e.source) && !nodesToDelete.includes(e.target))
        );

        setSnackbarMessage(`"${nodeName}" and its children deleted successfully`);
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } catch (error) {
        console.error('Failed to delete node:', error);
        setSnackbarMessage(`Failed to delete "${nodeName}"`);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    },
    [edges, getDescendantEdges, nodes, onNodesUpdate, onEdgesUpdate]
  );

  const handleMenuAction = useCallback(
    async (action: string) => {
      if (contextMenu?.nodeId) {
        const node = nodes.find(n => n.id === contextMenu.nodeId);
        if (node) {
          const nodeIdParts = node.id.split(':');
          const nodeName = node.data.label.props.label;
          let namespace = '';
          let nodeType = '';

          if (node.id.startsWith('ns:') && nodeIdParts.length === 2) {
            nodeType = 'namespace';
            namespace = nodeIdParts[1];
          } else if (nodeIdParts.length >= 4) {
            namespace = nodeIdParts[1];
            nodeType = nodeIdParts[2];
          } else if (node.id.startsWith('context:') && nodeIdParts.length === 2) {
            nodeType = 'context';
            namespace = nodeIdParts[0];
          } else {
            return;
          }

          switch (action) {
            case 'Delete':
              setDeleteNodeDetails({
                namespace,
                nodeType,
                nodeName,
                nodeId: contextMenu.nodeId,
              });
              setDeleteDialogOpen(true);
              break;
            case 'Details':
            case 'Edit':
            case 'Logs':
              // These actions would be handled by the parent component
              // through the onNodeSelect callback
              break;
            default:
              break;
          }
        }
      }
      handleMenuClose();
    },
    [contextMenu, nodes, handleMenuClose]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteNodeDetails) {
      const { namespace, nodeType, nodeName, nodeId } = deleteNodeDetails;
      await handleDeleteNode(namespace, nodeType, nodeName, nodeId);
    }
    setDeleteDialogOpen(false);
    setDeleteNodeDetails(null);
  }, [deleteNodeDetails, handleDeleteNode]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
    setDeleteNodeDetails(null);
  }, []);

  const handleSnackbarClose = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  return {
    contextMenu,
    deleteDialogOpen,
    deleteNodeDetails,
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    handleMenuOpen,
    handleMenuClose,
    handleMenuAction,
    handleDeleteConfirm,
    handleDeleteCancel,
    handleSnackbarClose,
  };
};
