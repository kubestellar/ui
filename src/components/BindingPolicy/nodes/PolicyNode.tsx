import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Typography, Chip } from '@mui/material';
import KubernetesIcon from '../KubernetesIcon';

interface PolicyNodeData {
  policy: {
    status: string;
    clusterList?: string[];
    workloadList?: string[];
  };
  label: string;
  isActive: boolean;
  theme: string;
}

const PolicyNode: React.FC<NodeProps<PolicyNodeData>> = ({ data }) => {
  const { policy, label, isActive, theme } = data;
  
  return (
    <>
      <Handle type="target" position={Position.Left} style={{ background: '#555' }} />
      
      <Box
        sx={{
          textAlign: 'center',
          background: theme === 'dark' ? '#374151' : '#F3F4F6',
          border: `2px solid ${isActive ? '#10B981' : '#2563EB'}`,
          borderRadius: '8px',
          padding: '12px',
          width: 180,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 1,
          }}
        >
          <KubernetesIcon type="policy" size={30} sx={{ mr: 1 }} />
          <Typography 
            variant="subtitle2" 
            sx={{ 
              fontWeight: 600, 
              color: theme === 'dark' ? '#fff' : '#000',
            }}
          >
            {label}
          </Typography>
        </Box>
        
        <Chip 
          label={policy.status} 
          size="small"
          color={isActive ? "success" : "default"}
          sx={{ 
            mb: 1,
            fontWeight: 500,
            fontSize: '0.7rem'
          }} 
        />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <KubernetesIcon type="cluster" size={16} sx={{ mr: 0.5 }} />
            <Typography variant="caption" sx={{ color: theme === 'dark' ? '#ccc' : '#666' }}>
              {policy.clusterList?.length || 0}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <KubernetesIcon type="workload" size={16} sx={{ mr: 0.5 }} />
            <Typography variant="caption" sx={{ color: theme === 'dark' ? '#ccc' : '#666' }}>
              {policy.workloadList?.length || 0}
            </Typography>
          </Box>
        </Box>
      </Box>
      
      <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
    </>
  );
};

export default memo(PolicyNode);