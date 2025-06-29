import React, { memo, useCallback, useEffect, useRef } from 'react';
import DynamicDetailsPanel from '../DynamicDetailsPanel';
import GroupPanel from '../GroupPanel';
import { ResourceItem } from './types';

interface NodeDetailsPanelProps {
  selectedNode: {
    namespace: string;
    name: string;
    type: string;
    resourceData?: ResourceItem;
    isGroup?: boolean;
    groupItems?: ResourceItem[];
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: () => void;
}

const NodeDetailsPanel = memo<NodeDetailsPanelProps>(
  ({ selectedNode, isOpen, onClose, onDelete }) => {
    const panelRef = useRef<HTMLDivElement>(null);

    const handleClickOutside = useCallback(
      (event: MouseEvent) => {
        if (isOpen && panelRef.current && !panelRef.current.contains(event.target as Node)) {
          onClose();
        }
      },
      [isOpen, onClose]
    );

    useEffect(() => {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [handleClickOutside]);

    useEffect(() => {
      const handleEsc = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && isOpen) {
          onClose();
        }
      };
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!selectedNode) return null;

    return (
      <div ref={panelRef}>
        {selectedNode.isGroup && selectedNode.groupItems ? (
          <GroupPanel
            namespace={selectedNode.namespace}
            groupType={selectedNode.type}
            groupItems={selectedNode.groupItems}
            onClose={onClose}
            isOpen={isOpen}
            onItemSelect={item => {
              // Handle item selection from group panel
              // This would typically update the selectedNode state
              console.log('Selected item:', item);
              onClose();
            }}
          />
        ) : (
          <DynamicDetailsPanel
            namespace={selectedNode.namespace}
            name={selectedNode.name}
            type={selectedNode.type}
            resourceData={selectedNode.resourceData}
            onClose={onClose}
            isOpen={isOpen}
            onDelete={onDelete}
          />
        )}
      </div>
    );
  }
);

NodeDetailsPanel.displayName = 'NodeDetailsPanel';

export default NodeDetailsPanel;
