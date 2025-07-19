import { Button, Typography, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ColorTheme } from '../types';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  itemCount: number;
  onPageChange: (page: number) => void;
  isDark: boolean;
  colors: ColorTheme;
}

const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  itemCount,
  onPageChange,
  isDark,
  colors,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mt-6 flex items-center justify-between gap-2 px-2">
      {/* Previous Button */}
      <Button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
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
          padding: { xs: '8px 12px', sm: '8px 16px' },
          borderRadius: '8px',
          transition: 'all 0.2s ease',
          minWidth: { xs: '80px', sm: '100px' },
          fontSize: { xs: '0.8rem', sm: '0.9rem' },
        }}
        variant="outlined"
        startIcon={
          <svg
            width="16"
            height="16"
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
        <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>{t('common.previous')}</Box>
        <Box sx={{ display: { xs: 'inline', sm: 'none' } }}>{t('common.previous')}</Box>
      </Button>

      {/* Center Information */}
      <div className="flex items-center gap-3">
        {/* Page Info */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: { xs: '6px 10px', sm: '6px 12px' },
            backgroundColor: isDark ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.05)',
            borderRadius: '8px',
            border: `1px solid ${isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)'}`,
            boxShadow: isDark
              ? '0 2px 4px rgba(0, 0, 0, 0.1)'
              : '0 2px 4px rgba(0, 0, 0, 0.05)',
            minWidth: { xs: '100px', sm: '120px' },
          }}
        >
          <Typography
            style={{
              color: colors.textSecondary,
              fontSize: '0.75rem',
              marginRight: '4px',
            }}
            sx={{
              display: { xs: 'none', sm: 'inline' },
            }}
          >
            Page
          </Typography>
          <Typography
            style={{
              color: colors.primary,
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
            className="mx-1"
          >
            {currentPage}
          </Typography>
          <Typography
            style={{
              color: colors.textSecondary,
              fontSize: '0.75rem',
            }}
          >
            of {totalPages}
          </Typography>
        </Box>

        {/* Item Count */}
        <Typography
          sx={{
            color: colors.textSecondary,
            fontSize: { xs: '0.75rem', sm: '0.8rem' },
            display: 'flex',
            alignItems: 'center',
            backgroundColor: {
              xs: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              sm: 'transparent',
            },
            padding: { xs: '4px 8px', sm: '0' },
            borderRadius: { xs: '6px', sm: '0' },
            border: { xs: `1px solid ${colors.border}`, sm: 'none' },
            minWidth: { xs: '70px', sm: 'auto' },
            justifyContent: 'center',
          }}
        >
          <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>{itemCount} items</Box>
          <Box sx={{ display: { xs: 'inline', sm: 'none' } }}>{itemCount} items</Box>
        </Typography>
      </div>

      {/* Next Button */}
      <Button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
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
          padding: { xs: '8px 12px', sm: '8px 16px' },
          borderRadius: '8px',
          transition: 'all 0.2s ease',
          minWidth: { xs: '80px', sm: '100px' },
          fontSize: { xs: '0.8rem', sm: '0.9rem' },
        }}
        variant="outlined"
        endIcon={
          <svg
            width="16"
            height="16"
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
        <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>{t('common.next')}</Box>
        <Box sx={{ display: { xs: 'inline', sm: 'none' } }}>Next</Box>
      </Button>
    </div>
  );
};

export default TablePagination; 