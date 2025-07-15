import { memo } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import useTheme from '../../stores/themeStore';

interface TreeViewFiltersProps {
  filteredContext: string;
}

const TreeViewFilters = memo<TreeViewFiltersProps>(({ filteredContext }) => {
  const { t } = useTranslation();
  const theme = useTheme(state => state.theme);

  return (
    <>
      <Box
        sx={{
          width: '100%',
          padding: '8px 16px',
          backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
          borderRadius: '4px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
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
            backgroundColor:
              theme === 'dark' ? 'rgba(144, 202, 249, 0.08)' : 'rgba(25, 118, 210, 0.08)',
            borderRadius: '4px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: theme === 'dark' ? '#90CAF9' : '#1976d2',
            }}
          >
            {t('treeView.filteringContext', { context: filteredContext })}
          </Typography>
        </Box>
      )}
    </>
  );
});

TreeViewFilters.displayName = 'TreeViewFilters';

export default TreeViewFilters;
