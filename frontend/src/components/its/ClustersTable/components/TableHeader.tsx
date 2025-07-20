import { useState } from 'react';
import { Button, Box, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { Filter, Plus, Tag } from 'lucide-react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PostAddIcon from '@mui/icons-material/PostAdd';
import { useTranslation } from 'react-i18next';
import SearchBox from '../../../../components/common/SearchBox';
import StatusFilterMenu from './StatusFilterMenu';
import { ColorTheme, StatusFilterItem } from '../types';

interface TableHeaderProps {
  query: string;
  onQueryChange: (query: string) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
  hasSelectedClusters: boolean;
  selectedCount: number;
  onBulkLabels: () => void;
  onShowCreateOptions: () => void;
  statusFilterItems: StatusFilterItem[];
  isDark: boolean;
  colors: ColorTheme;
}

const TableHeader: React.FC<TableHeaderProps> = ({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  hasSelectedClusters,
  selectedCount,
  onBulkLabels,
  onShowCreateOptions,
  statusFilterItems,
  isDark,
  colors,
}) => {
  const { t } = useTranslation();
  const [searchFocused, setSearchFocused] = useState(false);
  const [statusFilterAnchorEl, setStatusFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [bulkLabelsAnchorEl, setBulkLabelsAnchorEl] = useState<null | HTMLElement>(null);

  const handleStatusFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setStatusFilterAnchorEl(event.currentTarget);
  };

  const handleStatusFilterClose = () => {
    setStatusFilterAnchorEl(null);
  };

  const handleBulkLabelsClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setBulkLabelsAnchorEl(event.currentTarget);
  };

  const handleBulkLabelsClose = () => {
    setBulkLabelsAnchorEl(null);
  };

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div
        className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-opacity-50 p-4"
        style={{
          backgroundColor: isDark ? 'rgba(47, 134, 255, 0.05)' : 'rgba(47, 134, 255, 0.02)',
          border: `1px solid ${isDark ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.05)'}`,
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Search Box */}
        <SearchBox
          value={query}
          onChange={onQueryChange}
          placeholder={t('clusters.searchPlaceholder')}
          colors={colors}
          isDark={isDark}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          showHint={searchFocused}
          hintText={t('clusters.list.clearSearch')}
        />

        {/* Status Filter and Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="outlined"
            onClick={handleStatusFilterClick}
            startIcon={
              <Filter size={16} style={{ color: filter ? colors.primary : colors.textSecondary }} />
            }
            endIcon={
              <KeyboardArrowDownIcon
                style={{ color: filter ? colors.primary : colors.textSecondary }}
              />
            }
            sx={{
              color: filter ? colors.primary : colors.textSecondary,
              borderColor: filter ? colors.primary : colors.border,
              backgroundColor: filter
                ? isDark
                  ? 'rgba(47, 134, 255, 0.1)'
                  : 'rgba(47, 134, 255, 0.05)'
                : 'transparent',
              textTransform: 'none',
              fontWeight: filter ? '600' : '500',
              borderRadius: '10px',
              padding: '8px 16px',
              height: '45px',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
                borderColor: colors.primary,
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px -2px rgba(47, 134, 255, 0.2)',
              },
            }}
          >
            {filter
              ? statusFilterItems.find(item => item.value === filter)?.label ||
                t('clusters.list.filter')
              : t('clusters.list.filter')}
            {filter && (
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '22px',
                  height: '22px',
                  borderRadius: '11px',
                  backgroundColor: colors.primary,
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  ml: 1,
                  animation: filter ? 'fadeIn 0.3s ease-out' : 'none',
                  '@keyframes fadeIn': {
                    '0%': { opacity: 0, transform: 'scale(0.8)' },
                    '100%': { opacity: 1, transform: 'scale(1)' },
                  },
                }}
              >
                1
              </Box>
            )}
          </Button>

          <StatusFilterMenu
            anchorEl={statusFilterAnchorEl}
            open={Boolean(statusFilterAnchorEl)}
            onClose={handleStatusFilterClose}
            onFilterChange={onFilterChange}
            currentFilter={filter}
            statusFilterItems={statusFilterItems}
            isDark={isDark}
            colors={colors}
          />

          {hasSelectedClusters && (
            <div className="ml-auto flex">
              <Button
                variant="outlined"
                startIcon={<Tag size={16} />}
                endIcon={<KeyboardArrowDownIcon />}
                onClick={handleBulkLabelsClick}
                sx={{
                  color: colors.primary,
                  borderColor: colors.border,
                  backgroundColor: isDark ? 'rgba(47, 134, 255, 0.05)' : 'transparent',
                  '&:hover': {
                    borderColor: colors.primary,
                    backgroundColor: isDark
                      ? 'rgba(47, 134, 255, 0.1)'
                      : 'rgba(47, 134, 255, 0.05)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 8px -2px rgba(47, 134, 255, 0.2)',
                  },
                  textTransform: 'none',
                  fontWeight: '500',
                  borderRadius: '10px',
                  padding: '8px 16px',
                  height: '45px',
                  transition: 'all 0.2s ease',
                }}
              >
                {t('clusters.labels.manage')}
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '22px',
                    height: '22px',
                    borderRadius: '11px',
                    backgroundColor: colors.primary,
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    ml: 1,
                    padding: '0 6px',
                  }}
                >
                  {selectedCount}
                </Box>
              </Button>
              <Menu
                anchorEl={bulkLabelsAnchorEl}
                open={Boolean(bulkLabelsAnchorEl)}
                onClose={handleBulkLabelsClose}
                MenuListProps={{
                  'aria-labelledby': 'bulk-labels-button',
                }}
                PaperProps={{
                  sx: {
                    mt: 1,
                    boxShadow: isDark
                      ? '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                      : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    backgroundColor: colors.paper,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                  },
                }}
              >
                <MenuItem
                  onClick={() => {
                    onBulkLabels();
                    handleBulkLabelsClose();
                  }}
                  sx={{ color: colors.text }}
                >
                  <ListItemIcon>
                    <PostAddIcon fontSize="small" style={{ color: colors.primary }} />
                  </ListItemIcon>
                  <ListItemText>{t('clusters.labels.bulkLabels')}</ListItemText>
                </MenuItem>
              </Menu>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={onShowCreateOptions}
              sx={{
                bgcolor: colors.primary,
                color: colors.white,
                '&:hover': { bgcolor: colors.primaryDark },
                textTransform: 'none',
                fontWeight: '600',
                padding: '8px 20px',
                borderRadius: '8px',
                boxShadow: isDark
                  ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)'
                  : '0 4px 6px -1px rgba(47, 134, 255, 0.2), 0 2px 4px -2px rgba(47, 134, 255, 0.1)',
              }}
            >
              {t('clusters.importCluster')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableHeader;
