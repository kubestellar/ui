import React from 'react';
import { Box, SxProps, Theme } from '@mui/material';

interface ConnectionIconProps {
  size?: number;
  color?: string;
  direction?: 'left-to-right' | 'right-to-left' | 'bidirectional';
  sx?: SxProps<Theme>;
}

const ConnectionIcon: React.FC<ConnectionIconProps> = ({ 
  size = 24, 
  color = '#9c27b0', 
  direction = 'left-to-right',
  sx = {}
}) => {
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
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Base connection line */}
        <path
          d="M4 12H20"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        
        {/* Direction arrows */}
        {(direction === 'left-to-right' || direction === 'bidirectional') && (
          <path
            d="M16 8L20 12L16 16"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        
        {(direction === 'right-to-left' || direction === 'bidirectional') && (
          <path
            d="M8 8L4 12L8 16"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        
        {/* Connection dots */}
        <circle cx="12" cy="12" r="2" fill={color} />
      </svg>
    </Box>
  );
};

export default ConnectionIcon; 