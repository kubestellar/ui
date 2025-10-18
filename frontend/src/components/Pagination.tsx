import { Box, Button, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { darkTheme, lightTheme } from '../lib/theme-utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  isDark: boolean;
}

const Pagination = ({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  isDark,
}: PaginationProps) => {
  const { t } = useTranslation();

  // Don't render if no items or only one page
  if (totalItems === 0 || totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <Box
      sx={{
        mt: 4,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap',
      }}
    >
      <Button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        variant="outlined"
        sx={{
          color:
            currentPage === 1
              ? isDark
                ? 'rgba(255, 255, 255, 0.3)'
                : 'rgba(0, 0, 0, 0.26)'
              : isDark
                ? darkTheme.brand.primary
                : lightTheme.brand.primary,
          borderColor:
            currentPage === 1
              ? isDark
                ? 'rgba(255, 255, 255, 0.3)'
                : 'rgba(0, 0, 0, 0.26)'
              : isDark
                ? darkTheme.brand.primary
                : lightTheme.brand.primary,
          backgroundColor: isDark && currentPage !== 1 ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
          '&:hover': {
            borderColor:
              currentPage !== 1
                ? isDark
                  ? darkTheme.brand.primaryLight
                  : lightTheme.brand.primaryLight
                : undefined,
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
          },
          textTransform: 'none',
          fontWeight: 600,
          px: 3,
          py: 1,
          borderRadius: '10px',
        }}
      >
        {t('common.previous')}
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 2,
            py: 1,
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
            borderRadius: '10px',
            border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'}`,
          }}
        >
          <Typography
            sx={{
              color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
              fontSize: '0.9rem',
              mr: 0.5,
            }}
          >
            {t('common.page')}
          </Typography>
          <Typography
            sx={{
              color: isDark ? darkTheme.brand.primary : lightTheme.brand.primary,
              fontWeight: 600,
              fontSize: '1.1rem',
              mx: 0.5,
            }}
          >
            {currentPage}
          </Typography>
          <Typography
            sx={{
              color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
              fontSize: '0.9rem',
            }}
          >
            {t('common.of')} {totalPages}
          </Typography>
        </Box>
        <Typography
          sx={{
            color: isDark ? darkTheme.text.secondary : lightTheme.text.secondary,
            fontSize: '0.9rem',
          }}
        >
          {`Showing ${startItem}-${endItem} of ${totalItems} ${totalItems === 1 ? 'item' : 'items'}`}
        </Typography>
      </Box>

      <Button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        variant="outlined"
        sx={{
          color:
            currentPage === totalPages
              ? isDark
                ? 'rgba(255, 255, 255, 0.3)'
                : 'rgba(0, 0, 0, 0.26)'
              : isDark
                ? darkTheme.brand.primary
                : lightTheme.brand.primary,
          borderColor:
            currentPage === totalPages
              ? isDark
                ? 'rgba(255, 255, 255, 0.3)'
                : 'rgba(0, 0, 0, 0.26)'
              : isDark
                ? darkTheme.brand.primary
                : lightTheme.brand.primary,
          backgroundColor:
            isDark && currentPage !== totalPages ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
          '&:hover': {
            borderColor:
              currentPage !== totalPages
                ? isDark
                  ? darkTheme.brand.primaryLight
                  : lightTheme.brand.primaryLight
                : undefined,
            backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
          },
          textTransform: 'none',
          fontWeight: 600,
          px: 3,
          py: 1,
          borderRadius: '10px',
        }}
      >
        {t('common.next')}
      </Button>
    </Box>
  );
};

export default Pagination;
