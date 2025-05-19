import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Typography } from '@mui/material';
import KubernetesIcon from '../KubernetesIcon';

interface ClusterNodeData {
  label: string;
  theme: string;
}

const ClusterNode: React.FC<NodeProps<ClusterNodeData>> = ({ data }) => {
  const { label, theme } = data;

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ background: '#555' }} />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: theme === 'dark' ? '#1F2937' : '#fff',
          border: '1px solid #6B7280',
          borderRadius: '8px',
          padding: '12px',
          width: 160,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme === 'dark' ? '#374151' : '#F3F4F6',
            borderRadius: '50%',
            width: 48,
            height: 48,
            mb: 1,
            padding: '4px',
          }}
        >
          <KubernetesIcon type="cluster" size={40} />
        </Box>

        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            color: theme === 'dark' ? '#fff' : '#000',
            textAlign: 'center',
            wordBreak: 'break-word',
          }}
        >
          {label}
        </Typography>

        <Typography
          variant="caption"
          sx={{
            color: theme === 'dark' ? '#9CA3AF' : '#6B7280',
            textTransform: 'uppercase',
            mt: 0.5,
          }}
        >
          Target Cluster
        </Typography>
      </Box>

      <Handle type="source" position={Position.Right} style={{ background: '#555' }} />
    </>
  );
};

export default memo(ClusterNode);
