import { Box, Button, Typography } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';
import useTheme from '../../stores/themeStore';

interface PaginationProps {
  filteredCount: number;
  totalCount: number;
  itemsPerPage?: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

const BPPagination: React.FC<PaginationProps> = ({
  filteredCount,
  totalCount,
  itemsPerPage = 10,
  currentPage,
  onPageChange,
}) => {
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';
  const { t } = useTranslation();
  const totalPages = Math.ceil(filteredCount / itemsPerPage);

  const colors = {
    primary: '#2f86ff',
    primaryLight: '#9ad6f9',
    primaryDark: '#1a65cc',
    white: '#ffffff',
    text: isDark ? '#f1f5f9' : '#1e293b',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    disabled: isDark ? '#475569' : '#94a3b8',
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  return (
    <div className="mt-6 flex items-center justify-between px-2">
      <Button
        disabled={currentPage === 1}
        onClick={() => handlePageChange(currentPage - 1)}
        sx={{
          color: currentPage === 1 ? colors.disabled : colors.primary,
          borderColor: currentPage === 1 ? colors.disabled : colors.primary,
          backgroundColor: isDark && currentPage !== 1 ? 'rgba(47, 134, 255, 0.1)' : 'transparent',
          '&:hover': {
            borderColor: colors.primaryLight,
            backgroundColor: isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)',
            transform: currentPage !== 1 ? 'translateX(-2px)' : 'none',
          },
          '&.Mui-disabled': {
            color: colors.disabled,
            borderColor: colors.disabled,
          },
          textTransform: 'none',
          fontWeight: '600',
          padding: '8px 20px',
          borderRadius: '10px',
          transition: 'all 0.2s ease',
        }}
        variant="outlined"
        startIcon={
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              transition: 'transform 0.3s ease',
              transform: currentPage === 1 ? 'translateX(0)' : 'translateX(-2px)',
            }}
          >
            <path
              d="M15 18L9 12L15 6"
              stroke={currentPage === 1 ? colors.disabled : colors.primary}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
      >
        {t('common.previous')}
      </Button>

      <div className="flex items-center gap-3">
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px 16px',
            backgroundColor: isDark ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.05)',
            borderRadius: '10px',
            border: `1px solid ${isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)'}`,
            boxShadow: isDark ? '0 2px 4px rgba(0, 0, 0, 0.1)' : '0 2px 4px rgba(0, 0, 0, 0.05)',
          }}
        >
          <Typography
            style={{
              color: colors.textSecondary,
              fontSize: '0.9rem',
              marginRight: '6px',
            }}
          >
            {t('common.page')}
          </Typography>
          <Typography
            style={{
              color: colors.primary,
              fontWeight: 600,
              fontSize: '1.1rem',
            }}
            className="mx-1"
          >
            {currentPage}
          </Typography>
          <Typography
            style={{
              color: colors.textSecondary,
              fontSize: '0.9rem',
            }}
          >
            {t('common.of')} {totalPages}
          </Typography>
        </Box>

        <Box
          sx={{
            color: colors.textSecondary,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {filteredCount} item{filteredCount !== 1 ? 's' : ''}
          {filteredCount !== totalCount && (
            <span className="ml-2">({t('common.filteredFrom', { total: totalCount })})</span>
          )}
        </Box>
      </div>

      <Button
        disabled={currentPage === totalPages}
        onClick={() => handlePageChange(currentPage + 1)}
        sx={{
          color: currentPage === totalPages ? colors.disabled : colors.primary,
          borderColor: currentPage === totalPages ? colors.disabled : colors.primary,
          backgroundColor:
            isDark && currentPage !== totalPages ? 'rgba(47, 134, 255, 0.1)' : 'transparent',
          '&:hover': {
            borderColor: colors.primaryLight,
            backgroundColor: isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)',
            transform: currentPage !== totalPages ? 'translateX(2px)' : 'none',
          },
          '&.Mui-disabled': {
            color: colors.disabled,
            borderColor: colors.disabled,
          },
          textTransform: 'none',
          fontWeight: '600',
          padding: '8px 20px',
          borderRadius: '10px',
          transition: 'all 0.2s ease',
        }}
        variant="outlined"
        endIcon={
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              transition: 'transform 0.3s ease',
              transform: currentPage === totalPages ? 'translateX(0)' : 'translateX(2px)',
            }}
          >
            <path
              d="M9 6L15 12L9 18"
              stroke={currentPage === totalPages ? colors.disabled : colors.primary}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
      >
        {t('common.next')}
      </Button>
    </div>
  );
};

export default BPPagination;
