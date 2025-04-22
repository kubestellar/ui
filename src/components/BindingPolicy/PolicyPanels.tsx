import React from 'react';
import { Box } from '@mui/material';
import { ManagedCluster, Workload } from '../../types/bindingPolicy';
import ClusterPanel from './ClusterPanel';
import WorkloadPanel from './WorkloadPanel';

interface ClusterPanelContainerProps {
  clusters: ManagedCluster[];
  loading: boolean;
  error: string | undefined;
  compact?: boolean;
  onItemClick?: (clusterId: string) => void; 
}

interface WorkloadPanelContainerProps {
  workloads: Workload[];
  loading: boolean;
  error: string | undefined;
  compact?: boolean;
  onItemClick?: (clusterId: string) => void; 
}

export const ClusterPanelContainer: React.FC<ClusterPanelContainerProps> = ({
  clusters,
  loading,
  error,
  onItemClick

}) => {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
     
      <ClusterPanel 
        clusters={clusters} 
        loading={loading}
        error={error}
        
        onItemClick={onItemClick} 
      />
    </Box>
  );
};

export const WorkloadPanelContainer: React.FC<WorkloadPanelContainerProps> = ({
  workloads,
  loading,
  error,
  onItemClick // Missing

}) => {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
     
      <WorkloadPanel 
        workloads={workloads} 
        loading={loading}
        error={error}
        
        onItemClick={onItemClick} // Add this
      />
    </Box>
  );
};

// Keep the original component for backward compatibility
interface PolicyPanelsProps {
  clusters: ManagedCluster[];
  workloads: Workload[];
  loading: {
    policies: boolean;
    workloads: boolean;
    clusters: boolean;
  };
  error: {
    policies?: string;
    clusters?: string;
    workloads?: string;
  };
}

const PolicyPanels: React.FC<PolicyPanelsProps> = ({
  clusters,
  workloads,
  loading,
  error
}) => {
  return (
    <>
      <ClusterPanelContainer 
        clusters={clusters} 
        loading={loading.clusters}
        error={error.clusters}
      />
      <WorkloadPanelContainer 
        workloads={workloads} 
        loading={loading.workloads}
        error={error.workloads}
      />
    </>
  );
};

export default React.memo(PolicyPanels); 