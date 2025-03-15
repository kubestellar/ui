import React from 'react';
import { Box, Typography } from '@mui/material';
import { ManagedCluster, Workload } from '../../types/bindingPolicy';
import ClusterPanel from './ClusterPanel';
import WorkloadPanel from './WorkloadPanel';

interface ClusterPanelContainerProps {
  clusters: ManagedCluster[];
  loading: boolean;
  error?: string;
}

interface WorkloadPanelContainerProps {
  workloads: Workload[];
  loading: boolean;
  error?: string;
}

export const ClusterPanelContainer: React.FC<ClusterPanelContainerProps> = ({
  clusters,
  loading,
  error
}) => {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" align="center" sx={{ mb: 1, bgcolor: '#1976d2', color: 'white', p: 1, borderRadius: '4px 4px 0 0' }}>
        Clusters
      </Typography>
      <ClusterPanel 
        clusters={clusters} 
        loading={loading}
        error={error}
      />
    </Box>
  );
};

export const WorkloadPanelContainer: React.FC<WorkloadPanelContainerProps> = ({
  workloads,
  loading,
  error
}) => {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" align="center" sx={{ mb: 1, bgcolor: '#4caf50', color: 'white', p: 1, borderRadius: '4px 4px 0 0' }}>
        Workloads
      </Typography>
      <WorkloadPanel 
        workloads={workloads} 
        loading={loading}
        error={error}
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