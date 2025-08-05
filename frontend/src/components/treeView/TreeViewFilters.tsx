import { memo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import useTheme from '../../stores/themeStore';
import ResourceFilters, { ResourceFilter } from '../ResourceFilters';
import { ResourceItem } from '../ListViewComponent';
import { darkTheme, lightTheme } from '../../lib/theme-utils';

interface TreeViewFiltersProps {
  filteredContext: string;
  resources?: ResourceItem[];
  onResourceFiltersChange?: (filters: ResourceFilter) => void;
}

const TreeViewFilters = memo<TreeViewFiltersProps>(
  ({ filteredContext, resources = [], onResourceFiltersChange }) => {
    const { t } = useTranslation();
    const theme = useTheme(state => state.theme);
    const isDark = theme === 'dark';
    const [resourceFilters, setResourceFilters] = useState<ResourceFilter>({});

    const handleResourceFiltersChange = (filters: ResourceFilter) => {
      setResourceFilters(filters);
      if (onResourceFiltersChange) {
        onResourceFiltersChange(filters);
      }
    };

    return (
      <>
        <Box
          sx={{
            width: '100%',
            padding: '8px 16px',
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
            borderRadius: '4px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            boxShadow: isDark ? darkTheme.shadow.sm : lightTheme.shadow.sm,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
            }}
          >
            {t('treeView.note')}
          </Typography>
        </Box>

        {filteredContext !== 'all' && (
          <Box
            sx={{
              width: '100%',
              padding: '8px 16px',
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(37, 99, 235, 0.08)',
              borderRadius: '4px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: isDark ? darkTheme.shadow.sm : lightTheme.shadow.sm,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: isDark ? darkTheme.brand.primaryLight : darkTheme.brand.primary,
              }}
            >
              {t('treeView.filteringContext', { context: filteredContext })}
            </Typography>
          </Box>
        )}

        {/* Add ResourceFilters component if resources are available */}
        {resources && resources.length > 0 && onResourceFiltersChange && (
          <ResourceFilters
            availableResources={resources}
            activeFilters={resourceFilters}
            onFiltersChange={handleResourceFiltersChange}
          />
        )}
      </>
    );
  }
);

TreeViewFilters.displayName = 'TreeViewFilters';

export default TreeViewFilters;
