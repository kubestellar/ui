import { Button, Typography } from '@mui/material';
import { CloudOff, Plus } from 'lucide-react';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { ColorTheme } from '../types';

interface EmptyStateProps {
  query: string;
  filter: string;
  onClearQuery: () => void;
  onClearFilter: () => void;
  onShowCreateOptions: () => void;
  isDark: boolean;
  colors: ColorTheme;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  query,
  filter,
  onClearQuery,
  onClearFilter,
  onShowCreateOptions,
  isDark,
  colors,
}) => {
  const { t } = useTranslation();

  return (
    <div className="animate-fadeIn flex flex-col items-center justify-center p-8 text-center">
      <div className="relative mb-6">
        <CloudOff
          size={64}
          style={{
            color: colors.textSecondary,
            opacity: 0.6,
          }}
          className="animate-float"
        />
        <style>{`
          @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
          }
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn {
            animation: fadeIn 0.5s ease-out forwards;
          }
        `}</style>
      </div>
      <Typography variant="h5" style={{ color: colors.text }} className="mb-3 font-semibold">
        {t('clusters.noClustersFound')}
      </Typography>
      <Typography
        variant="body1"
        style={{ color: colors.textSecondary }}
        className="mb-6 max-w-md"
      >
        {query && filter
          ? t('clusters.noClustersMatchBoth')
          : query
            ? t('clusters.noClustersMatchSearch')
            : filter
              ? t('clusters.noClustersMatchFilter')
              : t('clusters.noClustersAvailable')}
      </Typography>
      {query || filter ? (
        <div className="flex flex-wrap justify-center gap-3">
          {query && (
            <Button
              onClick={onClearQuery}
              size="medium"
              startIcon={<CloseIcon fontSize="small" />}
              sx={{
                color: colors.white,
                borderColor: colors.primary,
                backgroundColor: colors.primary,
                '&:hover': {
                  backgroundColor: colors.primaryDark,
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px -2px rgba(47, 134, 255, 0.3)',
                },
                textTransform: 'none',
                fontWeight: '600',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
              }}
              variant="contained"
            >
              {t('common.clearSearch')}
            </Button>
          )}
          {filter && (
            <Button
              onClick={onClearFilter}
              size="medium"
              startIcon={<CloseIcon fontSize="small" />}
              sx={{
                color: colors.white,
                borderColor: colors.primary,
                backgroundColor: colors.primary,
                '&:hover': {
                  backgroundColor: colors.primaryDark,
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px -2px rgba(47, 134, 255, 0.3)',
                },
                textTransform: 'none',
                fontWeight: '600',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
              }}
              variant="contained"
            >
              {t('common.clearFilter')}
            </Button>
          )}
        </div>
      ) : (
        <Button
          variant="contained"
          startIcon={<Plus size={18} />}
          onClick={onShowCreateOptions}
          sx={{
            bgcolor: colors.primary,
            color: colors.white,
            '&:hover': {
              bgcolor: colors.primaryDark,
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 8px -2px rgba(47, 134, 255, 0.3)',
            },
            textTransform: 'none',
            fontWeight: '600',
            padding: '10px 24px',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
            boxShadow: isDark
              ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)'
              : '0 4px 6px -1px rgba(47, 134, 255, 0.2), 0 2px 4px -2px rgba(47, 134, 255, 0.1)',
          }}
        >
          {t('clusters.importYourFirst')}
        </Button>
      )}
    </div>
  );
};

export default EmptyState; 