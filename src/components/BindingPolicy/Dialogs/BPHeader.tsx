import React, { useState, useEffect, useRef } from 'react';
import {
  Button,
  TextField,
  InputAdornment,
  Box,
  Menu,
  MenuItem,
  Chip,
  Typography,
  IconButton,
} from '@mui/material';
import { Search, Filter, Plus, Trash2 } from 'lucide-react';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CreateBindingPolicyDialog, { PolicyData } from '../CreateBindingPolicyDialog';
import useTheme from '../../../stores/themeStore';
import { ManagedCluster, Workload } from '../../../types/bindingPolicy';
import Fade from '@mui/material/Fade';

interface BPHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  createDialogOpen: boolean;
  setCreateDialogOpen: (open: boolean) => void;
  onCreatePolicy: (policyData: PolicyData) => void;
  activeFilters: { status?: 'Active' | 'Inactive' | 'Pending' | '' };
  setActiveFilters: (filters: { status?: 'Active' | 'Inactive' | 'Pending' }) => void;
  selectedPolicies: string[];
  onBulkDelete: () => void;
  policyCount: number;
  clusters?: ManagedCluster[];
  workloads?: Workload[];
  filteredCount: number;
}

const BPHeader: React.FC<BPHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  createDialogOpen,
  setCreateDialogOpen,
  onCreatePolicy,
  activeFilters,
  setActiveFilters,
  selectedPolicies,
  onBulkDelete,
  policyCount,
  clusters = [],
  workloads = [],
  filteredCount,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';

  useEffect(() => {
    console.log(
      `BPHeader: Selected policies changed - count: ${selectedPolicies.length}`,
      selectedPolicies
    );
  }, [selectedPolicies]);

  const colors = {
    primary: '#2f86ff',
    primaryLight: '#9ad6f9',
    primaryDark: '#1a65cc',
    secondary: '#67c073',
    white: '#ffffff',
    background: isDark ? '#0f172a' : '#ffffff',
    paper: isDark ? '#1e293b' : '#f8fafc',
    text: isDark ? '#f1f5f9' : '#1e293b',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    success: '#67c073',
    warning: '#ffb347',
    error: '#ff6b6b',
    disabled: isDark ? '#475569' : '#94a3b8',
  };

  const statusFilterItems = [
    { value: '', label: 'All Status', color: '', icon: null },
    { value: 'Active', label: 'Active', color: colors.success },
    { value: 'Pending', label: 'Pending', color: colors.warning },
    { value: 'Inactive', label: 'Inactive', color: colors.error },
  ];

  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setAnchorEl(null);
  };

  const handleStatusFilter = (status: string | undefined) => {
    setActiveFilters({
      ...activeFilters,
      status: status as 'Active' | 'Inactive' | 'Pending' | undefined,
    });
    handleFilterClose();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setActiveFilters({});
  };

  const hasSelectedPolicies = selectedPolicies.length > 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (createDialogOpen) return;

      if ((e.ctrlKey && e.key === 'f') || e.key === '/') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }

      if (e.key === 'Escape') {
        if (document.activeElement === searchInputRef.current && searchInputRef.current) {
          setSearchQuery('');
          searchInputRef.current.blur();
        } else {
          if (activeFilters) setActiveFilters({});
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createDialogOpen, searchQuery, activeFilters, setActiveFilters, setSearchQuery]);

  return (
    <div style={{ color: colors.text }}>
      <div className="mb-8">
        <h1
          className="mb-2 flex items-center gap-2 text-3xl font-bold"
          style={{ color: colors.primary }}
        >
          <div>Manage Binding Policies</div>
          <span
            className="rounded-full px-3 py-1 text-sm"
            style={{
              backgroundColor: isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)',
              color: colors.primary,
            }}
          >
            {policyCount}
          </span>
        </h1>
        <p className="text-lg" style={{ color: colors.textSecondary }}>
          Create and manage binding policies for workload distribution
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-opacity-50 p-4"
          style={{
            backgroundColor: isDark ? 'rgba(47, 134, 255, 0.05)' : 'rgba(47, 134, 255, 0.02)',
            border: `1px solid ${isDark ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.05)'}`,
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            className={`relative flex-grow transition-all ${searchFocused ? 'max-w-lg' : 'max-w-sm'}`}
          >
            <TextField
              placeholder="Search policies by name, label or status"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              variant="outlined"
              inputRef={searchInputRef}
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search
                      style={{
                        color: searchFocused ? colors.primary : colors.textSecondary,
                        transition: 'color 0.2s ease',
                      }}
                    />
                  </InputAdornment>
                ),
                endAdornment: searchQuery ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearchQuery('')}
                      edge="end"
                      style={{ color: colors.textSecondary }}
                      className="transition-all duration-200 hover:bg-opacity-80"
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
                style: {
                  color: colors.text,
                  padding: '10px 12px',
                  borderRadius: '12px',
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  transition: 'all 0.3s ease',
                  '& fieldset': {
                    borderColor: searchFocused ? colors.primary : colors.border,
                    borderWidth: searchFocused ? '2px' : '1px',
                  },
                  '&:hover fieldset': {
                    borderColor: searchFocused ? colors.primary : colors.primaryLight,
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: colors.primary,
                    boxShadow: isDark
                      ? '0 0 0 4px rgba(47, 134, 255, 0.15)'
                      : '0 0 0 4px rgba(47, 134, 255, 0.1)',
                  },
                },
              }}
            />

            {searchFocused && (
              <Typography
                variant="caption"
                style={{
                  color: colors.textSecondary,
                  position: 'absolute',
                  bottom: '-20px',
                  left: '8px',
                }}
              >
                Press{' '}
                <kbd
                  style={{
                    fontFamily: 'monospace',
                    padding: '0px 4px',
                    borderRadius: '3px',
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    fontSize: '10px',
                  }}
                >
                  Esc
                </kbd>{' '}
                to clear search
              </Typography>
            )}
          </div>

          <div className="flex items-center gap-3">
            {hasSelectedPolicies && (
              <Button
                variant="outlined"
                startIcon={<Trash2 size={16} />}
                onClick={onBulkDelete}
                sx={{
                  color: colors.error,
                  borderColor: colors.error,
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                  textTransform: 'none',
                  fontWeight: '600',
                  borderRadius: '10px',
                  padding: '8px 16px',
                  height: '45px',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                    borderColor: colors.error,
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 8px -2px rgba(239, 68, 68, 0.2)',
                  },
                }}
              >
                Delete Selected
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '22px',
                    height: '22px',
                    borderRadius: '11px',
                    backgroundColor: colors.error,
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    ml: 1,
                  }}
                >
                  {selectedPolicies.length}
                </Box>
              </Button>
            )}

            <Button
              variant="outlined"
              onClick={handleFilterClick}
              startIcon={
                <Filter
                  size={16}
                  style={{ color: activeFilters.status ? colors.primary : colors.textSecondary }}
                />
              }
              endIcon={
                <KeyboardArrowDownIcon
                  style={{ color: activeFilters.status ? colors.primary : colors.textSecondary }}
                />
              }
              sx={{
                color: activeFilters.status ? colors.primary : colors.textSecondary,
                borderColor: activeFilters.status ? colors.primary : colors.border,
                backgroundColor: activeFilters.status
                  ? isDark
                    ? 'rgba(47, 134, 255, 0.1)'
                    : 'rgba(47, 134, 255, 0.05)'
                  : 'transparent',
                textTransform: 'none',
                fontWeight: activeFilters.status ? '600' : '500',
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
              {activeFilters.status
                ? statusFilterItems.find(item => item.value === activeFilters.status)?.label ||
                  'Status Filter'
                : 'Status Filter'}
              {activeFilters.status && (
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
                    animation: activeFilters.status ? 'fadeIn 0.3s ease-out' : 'none',
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

            <Menu
              id="status-filter-menu"
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleFilterClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
              }}
              PaperProps={{
                style: {
                  backgroundColor: colors.paper,
                  borderRadius: '12px',
                  minWidth: '220px',
                  border: `1px solid ${colors.border}`,
                  boxShadow: isDark
                    ? '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)'
                    : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                  marginTop: '8px',
                  padding: '8px',
                  overflow: 'hidden',
                },
              }}
              TransitionComponent={Fade}
              transitionDuration={200}
            >
              {statusFilterItems.map(item => (
                <MenuItem
                  key={item.value}
                  onClick={() => handleStatusFilter(item.value)}
                  selected={activeFilters.status === item.value}
                  sx={{
                    color: colors.text,
                    backgroundColor:
                      activeFilters.status === item.value
                        ? isDark
                          ? 'rgba(47, 134, 255, 0.15)'
                          : 'rgba(47, 134, 255, 0.1)'
                        : 'transparent',
                    borderRadius: '8px',
                    margin: '3px 0',
                    padding: '10px 16px',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.04)',
                      transform: 'translateX(4px)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1.5 }}>
                    {item.value && (
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: item.color,
                          flexShrink: 0,
                          transition: 'transform 0.2s ease',
                          transform:
                            activeFilters.status === item.value ? 'scale(1.2)' : 'scale(1)',
                        }}
                      />
                    )}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: activeFilters.status === item.value ? 600 : 400,
                        transition: 'all 0.15s ease',
                        color: activeFilters.status === item.value ? colors.primary : colors.text,
                      }}
                    >
                      {item.label}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Menu>

            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => setCreateDialogOpen(true)}
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
              Create Binding Policy
            </Button>
          </div>
        </div>

        {(searchQuery || activeFilters.status) && (
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
              Active Filters:
            </Typography>

            {searchQuery && (
              <Chip
                label={`Search: "${searchQuery}"`}
                size="medium"
                onDelete={() => setSearchQuery('')}
                sx={{
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
                    backgroundColor: isDark
                      ? 'rgba(47, 134, 255, 0.2)'
                      : 'rgba(47, 134, 255, 0.15)',
                    boxShadow: '0 2px 4px rgba(47, 134, 255, 0.2)',
                  },
                  position: 'relative',
                  zIndex: 1,
                }}
              />
            )}

            {activeFilters.status && (
              <Chip
                label={`Status: ${statusFilterItems.find(item => item.value === activeFilters.status)?.label}`}
                size="medium"
                onDelete={() => handleStatusFilter(undefined)}
                sx={{
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
                    backgroundColor: isDark
                      ? 'rgba(47, 134, 255, 0.2)'
                      : 'rgba(47, 134, 255, 0.15)',
                    boxShadow: '0 2px 4px rgba(47, 134, 255, 0.2)',
                  },
                  position: 'relative',
                  zIndex: 1,
                }}
              />
            )}

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
              onClick={handleClearFilters}
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
              Clear All
            </Button>
          </div>
        )}
      </div>

      <CreateBindingPolicyDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreatePolicy={onCreatePolicy}
        clusters={clusters}
        workloads={workloads}
      />
    </div>
  );
};

export default BPHeader;
