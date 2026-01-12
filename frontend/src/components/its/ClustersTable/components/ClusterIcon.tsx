import React from 'react';
import HubIcon from '@mui/icons-material/Hub';
import { ColorTheme } from '../types';

interface ClusterIconProps {
  available: boolean;
  isDark: boolean;
  colors: ColorTheme;
}

const ClusterIcon: React.FC<ClusterIconProps> = ({ available, isDark, colors }) => {
  return (
    <div
      className="flex items-center justify-center p-2 rounded-full"
      style={{
        backgroundColor: available
          ? isDark
            ? 'rgba(103, 192, 115, 0.2)'
            : 'rgba(103, 192, 115, 0.1)'
          : isDark
            ? 'rgba(255, 107, 107, 0.2)'
            : 'rgba(255, 107, 107, 0.1)',
      }}
    >
      <HubIcon
        style={{
          color: available ? colors.success : colors.error,
          fontSize: '1.5rem',
        }}
      />
    </div>
  );
};

export default ClusterIcon;
