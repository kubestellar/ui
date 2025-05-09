import React from 'react';
import { Box, Typography, SxProps, Theme } from '@mui/material';

export type IconType = 'workload' | 'cluster' | 'policy' | 'namespace';

interface KubernetesIconProps {
  type: IconType;
  size?: number;
  sx?: SxProps<Theme>;
}

const KubernetesIcon: React.FC<KubernetesIconProps> = ({ type, size = 24, sx = {} }) => {
  // Define colors based on type
  const getTypeColor = (): string => {
    switch (type) {
      case 'workload':
        return '#326ce5'; // Kubernetes blue
      case 'cluster':
        return '#2196f3'; // Material blue
      case 'policy':
        return '#9c27b0'; // Purple for policies
      case 'namespace':
        return '#00bcd4'; // Cyan for namespaces
      default:
        return '#326ce5';
    }
  };

  // Define label based on type
  const getTypeLabel = (): string => {
    switch (type) {
      case 'workload':
        return 'WD';
      case 'cluster':
        return 'CL';
      case 'policy':
        return 'BP';
      case 'namespace':
        return 'NS';
      default:
        return '';
    }
  };

  const baseColor = getTypeColor();

  return (
    <Box
      sx={{
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...sx
      }}
    >
      {/* Kubernetes heptagon shape (7-sided) */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Heptagon background */}
        <path
          d="M12 2L5.15 5.35L2 12L5.15 18.65L12 22L18.85 18.65L22 12L18.85 5.35L12 2Z"
          fill={baseColor}
          opacity="0.8"
        />
        <path
          d="M12 2L5.15 5.35L2 12L5.15 18.65L12 22L18.85 18.65L22 12L18.85 5.35L12 2Z"
          stroke={baseColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      
      {/* Text label */}
      <Typography
        variant="caption"
        component="span"
        sx={{
          position: 'absolute',
          color: 'white',
          fontWeight: 'bold',
          fontSize: size * 0.35,
          lineHeight: 1,
          textAlign: 'center',
          userSelect: 'none'
        }}
      >
        {getTypeLabel()}
      </Typography>
    </Box>
  );
};

export default KubernetesIcon; 