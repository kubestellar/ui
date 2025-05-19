import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Typography } from '@mui/material';
import KubernetesIcon from '../KubernetesIcon';

interface WorkloadNodeData {
  label: string;
  policy: string;
  theme: string;
}

const WorkloadNode: React.FC<NodeProps<WorkloadNodeData>> = ({ data }) => {
  const { label, policy, theme } = data;

  // Parse the workload name to display type and name separately if possible
  const parts = label.includes('/') ? label.split('/') : ['', label];
  const workloadType = parts[0] || 'Deployment';
  const workloadName = parts[1];

  return (
    <>
      <Handle type="source" position={Position.Bottom} style={{ background: '#3B82F6' }} />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: theme === 'dark' ? '#111827' : '#EFF6FF',
          border: '1px solid #3B82F6',
          borderRadius: '4px',
          padding: '8px',
          width: 140,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
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
          <KubernetesIcon type="workload" size={26} />
        </Box>

        <Typography
          variant="caption"
          sx={{
            color: theme === 'dark' ? '#9CA3AF' : '#4B5563',
            fontWeight: 600,
            textTransform: 'uppercase',
            fontSize: '0.65rem',
          }}
        >
          {workloadType}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color: theme === 'dark' ? '#fff' : '#000',
            textAlign: 'center',
            wordBreak: 'break-word',
          }}
        >
          {workloadName}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
          <KubernetesIcon type="policy" size={14} sx={{ mr: 0.5 }} />
          <Typography
            variant="caption"
            sx={{
              color: theme === 'dark' ? '#9CA3AF' : '#6B7280',
              fontSize: '0.65rem',
            }}
          >
            {policy}
          </Typography>
        </Box>
      </Box>

      <Handle type="target" position={Position.Top} style={{ background: '#3B82F6' }} />
    </>
  );
};

export default memo(WorkloadNode);
