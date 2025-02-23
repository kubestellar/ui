import { useState } from 'react';
import TreeView from '@mui/lab/TreeView';
import TreeItem from '@mui/lab/TreeItem';
import { useWDSQueries } from '../hooks/queries/useWDSQueries';
import { useNamespaceQueries } from '../hooks/queries/useNamespaceQueries';
import LoadingFallback from './LoadingFallback';
import { Box, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

const TreeViewComponent = () => {
  const [expanded, setExpanded] = useState<string[]>([]);

  const wdsQueries = useWDSQueries();
  const namespaceQueries = useNamespaceQueries();

  const { data: workloads = [], isLoading: workloadsLoading } = wdsQueries.useWorkloads();
  const { data: namespaces = [], isLoading: namespacesLoading } = namespaceQueries.useNamespaces();

  if (workloadsLoading || namespacesLoading) {
    return <LoadingFallback message="Loading resources..." />;
  }

  // Group workloads by namespace
  const workloadsByNamespace = workloads.reduce((acc, workload) => {
    if (!acc[workload.namespace]) {
      acc[workload.namespace] = [];
    }
    acc[workload.namespace].push(workload);
    return acc;
  }, {} as Record<string, typeof workloads>);

  const handleToggle = (_: React.SyntheticEvent, nodeIds: string[]) => {
    setExpanded(nodeIds);
  };

  return (
    <Box sx={{ maxWidth: 400, width: '100%' }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Resource Explorer
      </Typography>
      <TreeView
        defaultCollapseIcon={<ExpandMoreIcon />}
        defaultExpandIcon={<ChevronRightIcon />}
        expanded={expanded}
        onNodeToggle={handleToggle}
        sx={{ 
          flexGrow: 1, 
          overflowY: 'auto',
          '& .MuiTreeItem-root': {
            '& .MuiTreeItem-content': {
              padding: '4px 0',
            },
          },
        }}
      >
        {namespaces.map((namespace) => (
          <TreeItem 
            key={namespace.name} 
            nodeId={namespace.name}
            label={namespace.name}
          >
            {workloadsByNamespace[namespace.name]?.map((workload) => (
              <TreeItem
                key={`${namespace.name}-${workload.name}`}
                nodeId={`${namespace.name}-${workload.name}`}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">
                      {workload.name} ({workload.kind})
                    </Typography>
                  </Box>
                }
              />
            ))}
          </TreeItem>
        ))}
      </TreeView>
    </Box>
  );
};

export default TreeViewComponent;
