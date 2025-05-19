import React from 'react';
import { Box, Typography, Chip, useTheme, alpha } from '@mui/material';
import KubernetesIcon from './KubernetesIcon';

interface ItemTooltipProps {
  title: string;
  subtitle: string;
  labels: Record<string, string>;
  description: string;
  type: 'cluster' | 'workload' | 'policy';
}

const ItemTooltip: React.FC<ItemTooltipProps> = ({
  title,
  subtitle,
  labels,
  description,
  type,
}) => {
  const theme = useTheme();

  // Determine color based on item type
  const getColor = () => {
    switch (type) {
      case 'cluster':
        return theme.palette.info.main;
      case 'workload':
        return theme.palette.success.main;
      case 'policy':
        return theme.palette.secondary.main;
      default:
        return theme.palette.primary.main;
    }
  };

  // Get icon based on type - now using KubernetesIcon
  const getIcon = () => {
    return <KubernetesIcon type={type} size={20} />;
  };

  return (
    <Box
      sx={{
        backgroundColor: alpha(theme.palette.background.paper, 0.95),
        borderRadius: 1,
        p: 1.5,
        boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
        zIndex: 5,
        border: '1px solid',
        borderColor: getColor(),
        maxWidth: 300,
        minWidth: 200,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        {getIcon()}
        <Typography variant="subtitle2" sx={{ ml: 0.5, fontWeight: 'bold' }}>
          {title}
        </Typography>
      </Box>

      <Typography variant="caption" component="div" color="text.secondary" sx={{ mb: 0.5 }}>
        {subtitle}
      </Typography>

      {description && (
        <Typography variant="body2" sx={{ mb: 1, fontSize: '0.8rem' }}>
          {description}
        </Typography>
      )}

      {Object.keys(labels).length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'medium' }}>
            Labels:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {Object.entries(labels).map(([key, value]) => (
              <Chip
                key={key}
                label={`${key}: ${value}`}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.6rem' }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ItemTooltip;
