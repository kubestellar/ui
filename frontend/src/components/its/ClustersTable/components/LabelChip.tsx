import { Tooltip, Zoom } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ColorTheme, LabelFilter } from '../types';

interface LabelChipProps {
  labelKey: string;
  value: string;
  isDark: boolean;
  colors: ColorTheme;
  filterByLabel: LabelFilter[];
  onFilterClick: (key: string, value: string) => void;
}

const LabelChip: React.FC<LabelChipProps> = ({
  labelKey,
  value,
  isDark,
  colors,
  filterByLabel,
  onFilterClick,
}) => {
  const { t } = useTranslation();
  const isFiltered = filterByLabel.some(item => item.key === labelKey && item.value === value);

  return (
    <Tooltip title={labelKey !== labelKey.split('/').pop() ? `${labelKey}=${value}` : t('clusters.filteredByLabel')} arrow placement="top" TransitionComponent={Zoom}>
      <span
        onClick={() => onFilterClick(labelKey, value)}
        style={{
          backgroundColor: isFiltered
            ? isDark
              ? 'rgba(47, 134, 255, 0.3)'
              : 'rgba(47, 134, 255, 0.15)'
            : isDark
              ? 'rgba(47, 134, 255, 0.15)'
              : 'rgba(47, 134, 255, 0.08)',
          color: colors.primary,
          border: `1px solid ${
            isFiltered
              ? colors.primary
              : isDark
                ? 'rgba(47, 134, 255, 0.4)'
                : 'rgba(47, 134, 255, 0.3)'
          }`,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        className="rounded-md px-2 py-1 text-xs font-medium hover:scale-105 hover:shadow-md"
      >
        {labelKey.split('/').pop()}={value}
      </span>
    </Tooltip>
  );
};

export default LabelChip;
