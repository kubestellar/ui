import { Typography, Chip, Button, Box } from '@mui/material';
import { Filter } from 'lucide-react';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { ColorTheme, LabelFilter, StatusFilterItem } from '../types';

interface FilterChipsProps {
  query: string;
  filter: string;
  filterByLabel: LabelFilter[];
  statusFilterItems: StatusFilterItem[];
  onClearQuery: () => void;
  onClearFilter: () => void;
  onClearLabelFilter: (index: number) => void;
  onClearAll: () => void;
  filteredCount: number;
  isDark: boolean;
  colors: ColorTheme;
}

const FilterChips: React.FC<FilterChipsProps> = ({
  query,
  filter,
  filterByLabel,
  statusFilterItems,
  onClearQuery,
  onClearFilter,
  onClearLabelFilter,
  onClearAll,
  filteredCount,
  isDark,
  colors,
}) => {
  const { t } = useTranslation();

  if (!(query || filter || filterByLabel.length > 0)) return null;

  const chipStyles = {
    backgroundColor: isDark ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
    color: colors.primary,
    fontWeight: 500,
    '& .MuiChip-deleteIcon': {
      color: colors.primary,
      '&:hover': { color: colors.primaryDark },
    },
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.15)',
      boxShadow: '0 2px 4px rgba(47, 134, 255, 0.2)',
    },
    position: 'relative',
    zIndex: 1,
  };

  return (
    <div
      className="relative mb-2 flex flex-wrap items-center gap-2 overflow-hidden rounded-xl p-4"
      style={{
        backgroundColor: isDark ? 'rgba(47, 134, 255, 0.08)' : 'rgba(47, 134, 255, 0.04)',
        border: `1px solid ${isDark ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)'}`,
        boxShadow: isDark
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)'
          : '0 4px 6px -1px rgba(47, 134, 255, 0.05), 0 2px 4px -2px rgba(47, 134, 255, 0.025)',
      }}
    >
      {/* Background decoration */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'radial-gradient(circle at 10% 20%, rgba(47, 134, 255, 0.2) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />

      <Typography
        variant="subtitle2"
        style={{
          color: colors.primary,
          marginRight: '8px',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <Filter size={16} style={{ color: colors.primary }} />
        {t('clusters.activeFilters')}
      </Typography>

      {query && (
        <Chip
          label={`${t('clusters.search')}: "${query}"`}
          size="medium"
          onDelete={onClearQuery}
          sx={chipStyles}
        />
      )}

      {filter && (
        <Chip
          label={`${t('clusters.status.title')}: ${
            statusFilterItems.find(item => item.value === filter)?.label
          }`}
          size="medium"
          onDelete={onClearFilter}
          sx={chipStyles}
        />
      )}

      {filterByLabel.map((labelFilter, index) => (
        <Chip
          key={`${labelFilter.key}-${labelFilter.value}-${index}`}
          label={`${t('clusters.labels.label')}: ${labelFilter.key}=${labelFilter.value}`}
          size="medium"
          onDelete={() => onClearLabelFilter(index)}
          sx={chipStyles}
        />
      ))}

      <Box sx={{ flexGrow: 1 }} />

      <Typography
        variant="body2"
        sx={{
          color: colors.text,
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          padding: '4px 10px',
          borderRadius: '6px',
          marginRight: '8px',
          fontWeight: 500,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {filteredCount} result{filteredCount !== 1 ? 's' : ''}
      </Typography>

      <Button
        variant="text"
        size="small"
        onClick={onClearAll}
        startIcon={<CloseIcon fontSize="small" />}
        sx={{
          color: colors.primary,
          textTransform: 'none',
          fontWeight: 500,
          '&:hover': {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)',
          },
          position: 'relative',
          zIndex: 1,
          borderRadius: '8px',
          transition: 'all 0.2s ease',
        }}
      >
        {t('common.clearAll')}
      </Button>
    </div>
  );
};

export default FilterChips;
