/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  Paper,
  Tooltip,
  CircularProgress,
  Chip,
  Fade,
  Zoom,
  Typography,
  Divider,
  Menu,
  ListItemIcon,
  ListItemText,
  Box,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import LabelIcon from '@mui/icons-material/Label';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import { Plus, CloudOff, Filter, Tag, Tags } from 'lucide-react';
import CreateOptions from './ImportClusters'; // Dialog for cluster import (if needed)
import useTheme from '../stores/themeStore';
import { useClusterQueries } from '../hooks/queries/useClusterQueries';
import { toast } from 'react-hot-toast';
import InboxIcon from '@mui/icons-material/Inbox';
import PostAddIcon from '@mui/icons-material/PostAdd';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import TableSkeleton from './ui/TableSkeleton';
import ClusterDetailDialog from './ClusterDetailDialog'; // Import the new component
import DetachmentLogsDialog from './DetachmentLogsDialog'; // Import the new component
import CancelButton from './common/CancelButton';
import LockIcon from '@mui/icons-material/Lock';
import { useTranslation } from 'react-i18next';

interface ManagedClusterInfo {
  name: string;
  uid?: string;
  labels: { [key: string]: string };
  creationTime?: string;
  creationTimestamp?: string;
  status?: string;
  context: string;
  available?: boolean;
  joined?: boolean;
}

interface ClustersTableProps {
  clusters: ManagedClusterInfo[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  initialShowCreateOptions?: boolean;
  initialActiveOption?: string;
}

// Add a new ColorTheme interface before the LabelEditDialogProps interface
interface ColorTheme {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  white: string;
  background: string;
  paper: string;
  text: string;
  textSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
  disabled: string;
}

interface LabelEditDialogProps {
  open: boolean;
  onClose: () => void;
  cluster: ManagedClusterInfo | null;
  onSave: (
    clusterName: string,
    contextName: string,
    labels: { [key: string]: string },
    deletedLabels?: string[] // Add this parameter
  ) => void;
  isDark: boolean;
  colors: ColorTheme;
}

const LabelEditDialog: React.FC<LabelEditDialogProps> = ({
  open,
  onClose,
  cluster,
  onSave,
  isDark,
  colors,
}) => {
  const { t } = useTranslation();
  const [labels, setLabels] = useState<Array<{ key: string; value: string }>>([]);
  const [deletedLabels, setDeletedLabels] = useState<string[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [labelSearch, setLabelSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedLabelIndex, setSelectedLabelIndex] = useState<number | null>(null);
  const [protectedLabels, setProtectedLabels] = useState<Set<string>>(new Set());

  // ADD THESE NEW STATES FOR EDITING
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingKey, setEditingKey] = useState('');
  const [editingValue, setEditingValue] = useState('');

  const keyInputRef = useRef<HTMLInputElement>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);

  // ADD THESE NEW REFS FOR EDITING
  const editKeyInputRef = useRef<HTMLInputElement>(null);
  const editValueInputRef = useRef<HTMLInputElement>(null);

  // Function to check if a label is protected (system or binding policy)
  const isLabelProtected = useCallback(
    (labelKey: string): boolean => {
      // System label prefixes
      const systemPrefixes = [
        'cluster.open-cluster-management.io/',
        'feature.open-cluster-management.io/',
        'kubernetes.io/',
        'k8s.io/',
        'node.openshift.io/',
        'beta.kubernetes.io/',
        'topology.kubernetes.io/',
        'node-role.kubernetes.io/',
        'name', // Common system label
      ];

      // Check system prefixes
      for (const prefix of systemPrefixes) {
        if (labelKey.startsWith(prefix)) {
          return true;
        }
      }

      // Check if it's in the protected labels set (from binding policies)
      return protectedLabels.has(labelKey);
    },
    [protectedLabels]
  );

  // Fetch protected labels from binding policies when dialog opens
  useEffect(() => {
    if (open && cluster) {
      const fetchProtectedLabels = async () => {
        try {
          // Make a request to get binding policies and extract used labels
          const response = await fetch('/api/bp');
          if (response.ok) {
            const data = await response.json();
            const usedLabels = new Set<string>();

            // Extract labels from binding policies (same logic as backend)
            data.bindingPolicies?.forEach((bp: any) => {
              // From spec.clusterSelectors.matchLabels
              bp.spec?.clusterSelectors?.forEach((selector: any) => {
                Object.keys(selector.matchLabels || {}).forEach((key: string) => {
                  usedLabels.add(key);
                });

                // From matchExpressions
                selector.matchExpressions?.forEach((expr: any) => {
                  if (expr.key) {
                    usedLabels.add(expr.key);
                  }
                });
              });

              // From stored clusterSelectors
              bp.clusterSelectors?.forEach((selector: any) => {
                Object.keys(selector || {}).forEach((key: string) => {
                  usedLabels.add(key);
                });
              });

              // From clusters array
              bp.clusters?.forEach((cluster: string) => {
                if (cluster.includes('=')) {
                  const key = cluster.split('=')[0].trim();
                  if (key) usedLabels.add(key);
                } else if (cluster.includes(':')) {
                  const key = cluster.split(':')[0].trim();
                  if (key) usedLabels.add(key);
                }
              });

              // From YAML parsing (simplified)
              if (bp.yaml) {
                const yamlLines = bp.yaml.split('\n');
                let inMatchLabels = false;

                yamlLines.forEach((line: string) => {
                  const trimmed = line.trim();
                  if (trimmed.includes('matchlabels:')) {
                    inMatchLabels = true;
                  } else if (trimmed.startsWith('downsync:') || trimmed.startsWith('spec:')) {
                    inMatchLabels = false;
                  } else if (inMatchLabels && trimmed.includes(':') && !trimmed.startsWith('-')) {
                    const key = trimmed.split(':')[0].trim();
                    if (key && !key.includes('matchlabels') && !key.includes('apigroup')) {
                      usedLabels.add(key);
                    }
                  }
                });
              }
            });

            setProtectedLabels(usedLabels);
            console.log('[DEBUG] Protected labels from binding policies:', Array.from(usedLabels));
          }
        } catch (error) {
          console.error('[DEBUG] Failed to fetch protected labels:', error);
          setProtectedLabels(new Set());
        }
      };

      fetchProtectedLabels();
    }
  }, [open, cluster]);

  // Filter labels based on search
  const filteredLabels =
    labelSearch.trim() === ''
      ? labels
      : labels.filter(
          label =>
            label.key.toLowerCase().includes(labelSearch.toLowerCase()) ||
            label.value.toLowerCase().includes(labelSearch.toLowerCase())
        );

  useEffect(() => {
    if (cluster && open) {
      // Convert labels object to array format for editing
      const labelArray = Object.entries(cluster.labels || {}).map(([key, value]) => ({
        key,
        value,
      }));
      setLabels(labelArray);
      setDeletedLabels([]);
      setNewKey('');
      setNewValue('');
      setLabelSearch('');
      setIsSearching(false);
      setSelectedLabelIndex(null);

      // Focus key input after a short delay
      setTimeout(() => {
        if (keyInputRef.current) {
          keyInputRef.current.focus();
        }
      }, 100);
    }
  }, [cluster, open]);

  const handleAddLabel = () => {
    if (newKey.trim() && newValue.trim()) {
      if (isLabelProtected(newKey.trim())) {
        toast.error(t('clusters.labels.protected', { key: newKey }), {
          icon: '🔒',
          duration: 3000,
        });
        return;
      }
      const isDuplicate = labels.some(label => label.key === newKey.trim());
      if (isDuplicate) {
        setLabels(
          labels.map(label =>
            label.key === newKey.trim() ? { ...label, value: newValue.trim() } : label
          )
        );
        toast.success(t('clusters.labels.updated', { key: newKey }));
      } else {
        setLabels(prev => [...prev, { key: newKey.trim(), value: newValue.trim() }]);
        toast.success(t('clusters.labels.added', { key: newKey }));
      }
      setNewKey('');
      setNewValue('');
      if (keyInputRef.current) {
        keyInputRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      if (newKey && !newValue && valueInputRef.current) {
        // If key is entered but value is empty, move focus to value input
        valueInputRef.current.focus();
      } else if (newKey && newValue) {
        // If both fields are filled, add the label
        handleAddLabel();
      }
    } else if (e.key === 'Escape') {
      // Clear both inputs on Escape
      setNewKey('');
      setNewValue('');
      if (keyInputRef.current) {
        keyInputRef.current.focus();
      }
    }
  };

  const handleRemoveLabel = (index: number) => {
    const labelToRemove = labels[index];
    if (isLabelProtected(labelToRemove.key)) {
      toast.error(t('clusters.labels.protected', { key: labelToRemove.key }), {
        icon: '🔒',
        duration: 3000,
        style: {
          borderLeft: `4px solid ${colors.warning}`,
        },
      });
      return;
    }
    if (cluster?.labels && cluster.labels[labelToRemove.key]) {
      console.log('[DEBUG] Adding to deleted labels:', labelToRemove.key);
      setDeletedLabels(prev => {
        const newDeleted = [...prev, labelToRemove.key];
        console.log('[DEBUG] Updated deleted labels:', newDeleted);
        return newDeleted;
      });
    }
    setLabels(labels.filter((_, i) => i !== index));
    toast.success(t('clusters.labels.removed', { key: labelToRemove.key }));
  };

  // ADD THESE NEW FUNCTIONS FOR EDITING
  const handleStartEdit = (index: number) => {
    const label = labels[index];
    if (isLabelProtected(label.key)) {
      toast.error(t('clusters.labels.protected', { key: label.key }), {
        icon: '🔒',
        duration: 3000,
        style: {
          borderLeft: `4px solid ${colors.warning}`,
        },
      });
      return;
    }
    setEditingIndex(index);
    setEditingKey(label.key);
    setEditingValue(label.value);
    setSelectedLabelIndex(null);

    // Focus the key input after a short delay
    setTimeout(() => {
      if (editKeyInputRef.current) {
        editKeyInputRef.current.focus();
        editKeyInputRef.current.select();
      }
    }, 100);
  };

  const handleSaveEdit = () => {
    if (!editingKey.trim() || !editingValue.trim()) {
      toast.error(t('clusters.labels.editvalue'), { duration: 2000 });
      return;
    }
    if (editingIndex === null) return;
    const originalKey = labels[editingIndex].key;
    if (editingKey.trim() !== originalKey && isLabelProtected(editingKey.trim())) {
      toast.error(t('clusters.labels.protected', { key: editingKey }), {
        icon: '🔒',
        duration: 3000,
      });
      return;
    }
    if (editingKey.trim() !== originalKey) {
      const isDuplicate = labels.some(
        (label, index) => index !== editingIndex && label.key === editingKey.trim()
      );
      if (isDuplicate) {
        toast.error(t('clusters.labels.duplicate', { key: editingKey }), { duration: 3000 });
        return;
      }
    }
    if (editingKey.trim() !== originalKey) {
      if (cluster?.labels && cluster.labels[originalKey]) {
        setDeletedLabels(prev => [...prev, originalKey]);
      }
    }
    setLabels(prev =>
      prev.map((label, index) =>
        index === editingIndex ? { key: editingKey.trim(), value: editingValue.trim() } : label
      )
    );
    setEditingIndex(null);
    setEditingKey('');
    setEditingValue('');
    toast.success(t('clusters.labels.updateSuccess'), { duration: 2000 });
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingKey('');
    setEditingValue('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editingKey && !editingValue && editValueInputRef.current) {
        // Move to value input
        editValueInputRef.current.focus();
        editValueInputRef.current.select();
      } else if (editingKey && editingValue) {
        // Save the edit
        handleSaveEdit();
      }
    } else if (e.key === 'Escape') {
      // Cancel edit
      handleCancelEdit();
    }
  };

  // UPDATE YOUR EXISTING handleSave FUNCTION
  const handleSave = () => {
    if (!cluster) return;

    // If currently editing, cancel the edit first
    if (editingIndex !== null) {
      handleCancelEdit();
    }

    setSaving(true);

    // Convert array back to object format (only current labels, not deleted ones)
    const labelObject: { [key: string]: string } = {};
    labels.forEach(({ key, value }) => {
      labelObject[key] = value;
    });

    console.log('[DEBUG] Saving with labels:', labelObject);
    console.log('[DEBUG] Saving with deleted labels:', deletedLabels);

    // Add a slight delay to show loading state
    setTimeout(() => {
      onSave(cluster.name, cluster.context, labelObject, deletedLabels);
      setSaving(false);
      onClose();
    }, 300);
  };

  const toggleSearchMode = () => {
    setIsSearching(!isSearching);
    if (!isSearching) {
      setTimeout(() => {
        const searchInput = document.getElementById('label-search-input');
        if (searchInput) {
          searchInput.focus();
        }
      }, 100);
    } else {
      setLabelSearch('');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      TransitionComponent={Zoom}
      transitionDuration={300}
      PaperProps={{
        style: {
          backgroundColor: colors.paper,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: isDark
            ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)'
            : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        },
      }}
    >
      <DialogTitle
        style={{
          color: colors.primary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div className="flex items-center gap-2">
          <LabelIcon style={{ color: colors.primary }} />
          <Typography variant="h6" component="span">
            {t('clusters.labels.edit')} {t('clusters.labels.for')}{' '}
            <span style={{ fontWeight: 'bold' }}>{cluster?.name}</span>
          </Typography>
        </div>
        <IconButton onClick={onClose} size="small" style={{ color: colors.textSecondary }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent style={{ padding: '24px' }}>
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <Typography variant="body2" style={{ color: colors.textSecondary }}>
              {t('clusters.labels.description')}
              <span style={{ color: colors.warning, marginLeft: '4px' }}>
                🔒 {t('clusters.labels.defaultProtected')}
              </span>
            </Typography>

            <div className="flex gap-2">
              <Tooltip title={isSearching ? t('common.close') : t('common.search')}>
                <IconButton
                  size="small"
                  onClick={toggleSearchMode}
                  style={{
                    color: isSearching ? colors.primary : colors.textSecondary,
                    backgroundColor: isSearching
                      ? isDark
                        ? 'rgba(47, 134, 255, 0.15)'
                        : 'rgba(47, 134, 255, 0.1)'
                      : 'transparent',
                  }}
                >
                  <SearchIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {labels.length > 0 && (
                <Chip
                  size="small"
                  label={t('clusters.labels.count', { count: labels.length })}
                  style={{
                    backgroundColor: isDark
                      ? 'rgba(47, 134, 255, 0.15)'
                      : 'rgba(47, 134, 255, 0.1)',
                    color: colors.primary,
                    fontSize: '0.75rem',
                  }}
                />
              )}
            </div>
          </div>

          <Fade in={isSearching} mountOnEnter unmountOnExit>
            <div className="mb-4">
              <TextField
                id="label-search-input"
                placeholder={t('common.search') + '...'}
                value={labelSearch}
                onChange={e => setLabelSearch(e.target.value)}
                fullWidth
                variant="outlined"
                size="small"
                autoFocus
                InputProps={{
                  style: { color: colors.text },
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon style={{ color: colors.primary, fontSize: '1.2rem' }} />
                    </InputAdornment>
                  ),
                  endAdornment: labelSearch && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setLabelSearch('')}
                        style={{ color: colors.textSecondary }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    '& fieldset': { borderColor: colors.border },
                    '&:hover fieldset': { borderColor: colors.primaryLight },
                    '&.Mui-focused fieldset': { borderColor: colors.primary },
                  },
                }}
              />
            </div>
          </Fade>

          <Fade in={!isSearching}>
            <div className="mb-5">
              <div className="mb-2 flex flex-col gap-2 sm:flex-row">
                <TextField
                  label={t('clusters.labels.key')}
                  placeholder="e.g. environment"
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  inputRef={keyInputRef}
                  onKeyDown={handleKeyDown}
                  fullWidth
                  variant="outlined"
                  size="small"
                  autoComplete="off"
                  InputProps={{
                    style: { color: colors.text },
                  }}
                  InputLabelProps={{
                    style: { color: colors.textSecondary },
                    shrink: true,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: colors.border },
                      '&:hover fieldset': { borderColor: colors.primaryLight },
                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                    },
                  }}
                />
                <TextField
                  label={t('clusters.labels.value')}
                  placeholder="e.g. production"
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  inputRef={valueInputRef}
                  onKeyDown={handleKeyDown}
                  fullWidth
                  variant="outlined"
                  size="small"
                  autoComplete="off"
                  InputProps={{
                    style: { color: colors.text },
                  }}
                  InputLabelProps={{
                    style: { color: colors.textSecondary },
                    shrink: true,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: colors.border },
                      '&:hover fieldset': { borderColor: colors.primaryLight },
                      '&.Mui-focused fieldset': { borderColor: colors.primary },
                    },
                  }}
                />
                <Button
                  onClick={handleAddLabel}
                  variant="contained"
                  disabled={!newKey.trim() || !newValue.trim()}
                  startIcon={<AddIcon />}
                  style={{
                    backgroundColor:
                      !newKey.trim() || !newValue.trim() ? colors.disabled : colors.primary,
                    color: colors.white,
                    minWidth: '100px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {t('common.add')}
                </Button>
              </div>
              <Typography variant="caption" style={{ color: colors.textSecondary }}>
                {t('clusters.labels.tip')}
              </Typography>
            </div>
          </Fade>

          <Divider style={{ backgroundColor: colors.border, margin: '16px 0' }} />

          {/* UPDATE THE LABELS DISPLAY SECTION */}
          <div className="max-h-60 overflow-y-auto pr-1">
            {filteredLabels.length > 0 ? (
              <div className="space-y-2">
                {filteredLabels.map((label, index) => {
                  const isProtected = isLabelProtected(label.key);
                  const isEditing = editingIndex === index;

                  return (
                    <Zoom
                      in={true}
                      style={{ transitionDelay: `${index * 25}ms` }}
                      key={`${label.key}-${index}`}
                    >
                      <div
                        className={`flex items-center justify-between gap-2 rounded p-2 transition-all duration-200 ${selectedLabelIndex === index ? 'ring-1' : ''}`}
                        style={{
                          backgroundColor:
                            selectedLabelIndex === index
                              ? isDark
                                ? 'rgba(47, 134, 255, 0.2)'
                                : 'rgba(47, 134, 255, 0.1)'
                              : isEditing
                                ? isDark
                                  ? 'rgba(103, 192, 115, 0.15)'
                                  : 'rgba(103, 192, 115, 0.1)'
                                : isDark
                                  ? 'rgba(47, 134, 255, 0.1)'
                                  : 'rgba(47, 134, 255, 0.05)',
                          border: `1px solid ${
                            selectedLabelIndex === index
                              ? colors.primary
                              : isEditing
                                ? colors.success
                                : colors.border
                          }`,
                          boxShadow:
                            selectedLabelIndex === index
                              ? isDark
                                ? '0 0 0 1px rgba(47, 134, 255, 0.4)'
                                : '0 0 0 1px rgba(47, 134, 255, 0.2)'
                              : isEditing
                                ? '0 0 0 1px rgba(103, 192, 115, 0.3)'
                                : 'none',
                          cursor: isProtected ? 'default' : 'pointer',
                        }}
                        onClick={() => {
                          if (!isProtected && !isEditing) {
                            setSelectedLabelIndex(selectedLabelIndex === index ? null : index);
                          }
                        }}
                        onDoubleClick={() => {
                          if (!isProtected && !isEditing) {
                            handleStartEdit(index);
                          }
                        }}
                      >
                        <div className="flex flex-1 items-center gap-2">
                          {/* Show lock icon for protected labels */}
                          {isProtected ? (
                            <Tooltip
                              title={
                                label.key.startsWith('cluster.open-cluster-management.io/') ||
                                label.key.startsWith('feature.open-cluster-management.io/') ||
                                label.key.startsWith('kubernetes.io/') ||
                                label.key.startsWith('k8s.io/') ||
                                label.key === 'name'
                                  ? t('clusters.labels.defaultProtected')
                                  : t('clusters.labels.bindingProtected')
                              }
                              placement="top"
                            >
                              <LockIcon
                                fontSize="small"
                                style={{
                                  color: colors.warning,
                                  fontSize: '16px',
                                }}
                              />
                            </Tooltip>
                          ) : (
                            <Tag size={16} style={{ color: colors.primary }} />
                          )}

                          {/* Label content - editable if in edit mode */}
                          {isEditing ? (
                            <div className="flex flex-1 items-center gap-2">
                              <TextField
                                value={editingKey}
                                onChange={e => setEditingKey(e.target.value)}
                                onKeyDown={handleEditKeyDown}
                                inputRef={editKeyInputRef}
                                size="small"
                                variant="outlined"
                                placeholder={t('clusters.labels.key')}
                                style={{ minWidth: '120px' }}
                                InputProps={{
                                  style: {
                                    color: colors.text,
                                    fontSize: '0.875rem',
                                  },
                                }}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: colors.success },
                                    '&:hover fieldset': { borderColor: colors.success },
                                    '&.Mui-focused fieldset': { borderColor: colors.success },
                                  },
                                }}
                              />
                              <span style={{ color: colors.textSecondary }}>=</span>
                              <TextField
                                value={editingValue}
                                onChange={e => setEditingValue(e.target.value)}
                                onKeyDown={handleEditKeyDown}
                                inputRef={editValueInputRef}
                                size="small"
                                variant="outlined"
                                placeholder={t('clusters.labels.value')}
                                style={{ minWidth: '120px' }}
                                InputProps={{
                                  style: {
                                    color: colors.text,
                                    fontSize: '0.875rem',
                                  },
                                }}
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: colors.success },
                                    '&:hover fieldset': { borderColor: colors.success },
                                    '&.Mui-focused fieldset': { borderColor: colors.success },
                                  },
                                }}
                              />
                            </div>
                          ) : (
                            <span style={{ color: colors.text }}>
                              <span style={{ fontWeight: 500 }}>{label.key}</span>
                              <span style={{ color: colors.textSecondary }}> = </span>
                              <span>{label.value}</span>
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <Tooltip title={t('common.save')}>
                                <IconButton
                                  size="small"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleSaveEdit();
                                  }}
                                  style={{ color: colors.success }}
                                >
                                  <SaveIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t('clusters.labels.cancelEdit')}>
                                <IconButton
                                  size="small"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleCancelEdit();
                                  }}
                                  style={{ color: colors.textSecondary }}
                                >
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          ) : (
                            <>
                              {!isProtected && (
                                <Tooltip title={t('clusters.labels.editValue')}>
                                  <IconButton
                                    size="small"
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleStartEdit(index);
                                    }}
                                    style={{
                                      color: colors.textSecondary,
                                      opacity: 0.7,
                                      transition: 'all 0.2s ease',
                                    }}
                                    className="opacity-0 group-hover:opacity-100"
                                  >
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                      <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                  </IconButton>
                                </Tooltip>
                              )}
                              {!isProtected && (
                                <Tooltip title={t('clusters.labels.removeLabel')}>
                                  <IconButton
                                    size="small"
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleRemoveLabel(index);
                                    }}
                                    style={{
                                      color: colors.error,
                                      opacity: 0.7,
                                      transition: 'all 0.2s ease',
                                    }}
                                    className="opacity-0 group-hover:opacity-100"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </Zoom>
                  );
                })}
              </div>
            ) : (
              <div className="mt-2 flex flex-col items-center justify-center p-6 text-center">
                <Tags size={28} style={{ color: colors.textSecondary, marginBottom: '12px' }} />
                <Typography
                  variant="body2"
                  style={{ color: colors.text, fontWeight: 500, marginBottom: '4px' }}
                >
                  {labelSearch
                    ? t('clusters.labels.noMatchingLabels')
                    : t('clusters.labels.noLabels')}
                </Typography>
                <Typography
                  variant="caption"
                  style={{ color: colors.textSecondary, maxWidth: '300px', margin: '0 auto' }}
                >
                  {labelSearch
                    ? t('clusters.labels.tryDifferentSearch')
                    : t('clusters.labels.addYourFirst')}
                </Typography>

                {labelSearch && (
                  <Button
                    size="small"
                    variant="text"
                    style={{ color: colors.primary, marginTop: '12px' }}
                    onClick={() => setLabelSearch('')}
                  >
                    {t('common.close')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
      <DialogActions
        style={{
          padding: '16px 24px',
          borderTop: `1px solid ${colors.border}`,
          justifyContent: 'space-between',
        }}
      >
        <CancelButton onClick={onClose} disabled={saving} startIcon={<CloseIcon />}>
          {t('common.cancel')}
        </CancelButton>

        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || editingIndex !== null}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          style={{
            backgroundColor: editingIndex !== null ? colors.disabled : colors.primary,
            color: colors.white,
            minWidth: '120px',
          }}
        >
          {saving
            ? t('common.save') + '...'
            : editingIndex !== null
              ? t('clusters.labels.finishEditing')
              : t('common.save') + ' ' + t('common.changes')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface DetachClusterDialogProps {
  open: boolean;
  onClose: () => void;
  cluster: ManagedClusterInfo | null;
  onDetach: (clusterName: string) => void;
  isLoading: boolean;
  isDark: boolean;
  colors: ColorTheme;
}

const DetachClusterDialog: React.FC<DetachClusterDialogProps> = ({
  open,
  onClose,
  cluster,
  onDetach,
  isLoading,
  isDark,
  colors,
}) => {
  const { t } = useTranslation();
  const handleDetach = () => {
    if (cluster) {
      onDetach(cluster.name);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Zoom}
      transitionDuration={300}
      PaperProps={{
        style: {
          backgroundColor: colors.paper,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: isDark
            ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)'
            : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        },
      }}
    >
      <DialogTitle
        style={{
          color: colors.error,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div className="flex items-center gap-2">
          <LinkOffIcon style={{ color: colors.error }} />
          <Typography variant="h6" component="span">
            {t('clusters.detach.title')}
          </Typography>
        </div>
        <IconButton onClick={onClose} size="small" style={{ color: colors.textSecondary }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent style={{ padding: '24px' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" style={{ fontWeight: 500, marginBottom: '8px' }}>
            {t('clusters.detach.confirmation')}
          </Typography>
          <Box
            sx={{
              p: 2,
              mt: 2,
              border: `1px solid ${colors.border}`,
              borderRadius: 1,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
            }}
          >
            <Typography variant="h6" style={{ color: colors.text, fontWeight: 600 }}>
              {cluster?.name}
            </Typography>
            <Typography variant="body2" style={{ color: colors.textSecondary, marginTop: '8px' }}>
              {t('clusters.detach.context')}: {cluster?.name}
            </Typography>
            {cluster?.labels && Object.keys(cluster.labels).length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" style={{ color: colors.textSecondary }}>
                  {t('clusters.labels.labels')}
                </Typography>
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(cluster.labels).map(([key, value]) => (
                    <Chip
                      key={key}
                      size="small"
                      label={`${key}=${value}`}
                      sx={{
                        backgroundColor: isDark
                          ? 'rgba(47, 134, 255, 0.15)'
                          : 'rgba(47, 134, 255, 0.08)',
                        color: colors.primary,
                        fontSize: '0.75rem',
                      }}
                    />
                  ))}
                </div>
              </Box>
            )}
          </Box>
        </Box>
        <Box
          sx={{
            mt: 3,
            backgroundColor: isDark ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255, 107, 107, 0.05)',
            p: 2,
            borderRadius: 1,
          }}
        >
          <Typography variant="body2" style={{ color: colors.error }}>
            {t('clusters.detach.warning')}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions
        style={{
          padding: '16px 24px',
          borderTop: `1px solid ${colors.border}`,
          justifyContent: 'space-between',
        }}
      >
        <Button
          onClick={onClose}
          style={{
            color: colors.textSecondary,
          }}
          variant="text"
          startIcon={<CloseIcon />}
          disabled={isLoading}
        >
          {t('common.cancel')}
        </Button>
        <Button
          onClick={handleDetach}
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <LinkOffIcon />}
          style={{
            backgroundColor: colors.error,
            color: colors.white,
            minWidth: '120px',
          }}
        >
          {isLoading ? t('clusters.detach.detaching') : t('clusters.detach.detach')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Add this new interface for status filter items
interface StatusFilterItem {
  value: string;
  label: string;
  color: string;
  icon?: React.ReactNode;
}

const ClustersTable: React.FC<ClustersTableProps> = ({
  clusters,
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
  initialShowCreateOptions = false,
  initialActiveOption = 'quickconnect',
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [filteredClusters, setFilteredClusters] = useState<ManagedClusterInfo[]>(clusters);
  const [filter, setFilter] = useState<string>('');
  const [selectAll, setSelectAll] = useState(false);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [showCreateOptions, setShowCreateOptions] = useState(initialShowCreateOptions);
  const [activeOption, setActiveOption] = useState<string | null>(initialActiveOption);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<ManagedClusterInfo | null>(null);
  const [loadingClusterEdit, setLoadingClusterEdit] = useState<string | null>(null);
  const [filterByLabel, setFilterByLabel] = useState<{ key: string; value: string } | null>(null);
  const [bulkLabelsAnchorEl, setBulkLabelsAnchorEl] = useState<null | HTMLElement>(null);
  const bulkLabelsMenuOpen = Boolean(bulkLabelsAnchorEl);
  const hasSelectedClusters = selectedClusters.length > 0;
  const theme = useTheme(state => state.theme);
  const isDark = theme === 'dark';
  const [anchorElActions, setAnchorElActions] = useState<{ [key: string]: HTMLElement | null }>({});
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [detachClusterOpen, setDetachClusterOpen] = useState(false);
  const [detachLogsOpen, setDetachLogsOpen] = useState(false);
  const [loadingClusterDetach, setLoadingClusterDetach] = useState<string | null>(null);
  const [refetchClusters] = useState<(() => void) | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [statusFilterAnchorEl, setStatusFilterAnchorEl] = useState<null | HTMLElement>(null);
  const statusFilterOpen = Boolean(statusFilterAnchorEl);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { useUpdateClusterLabels, useDetachCluster } = useClusterQueries();
  const updateLabelsMutation = useUpdateClusterLabels();
  const detachClusterMutation = useDetachCluster();

  // Define colors first before using it
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

  // Status filter options - after colors definition
  const statusFilterItems: StatusFilterItem[] = [
    { value: '', label: 'All Status', color: '', icon: null },
    {
      value: 'available',
      label: 'Active',
      color: colors.success,
    },
    {
      value: 'unavailable',
      label: 'Inactive',
      color: colors.error,
    },
    {
      value: 'pending',
      label: 'Pending',
      color: colors.warning,
    },
  ];

  // Initialize with initial props if provided
  useEffect(() => {
    if (initialShowCreateOptions) {
      setShowCreateOptions(true);
      // Set the active option to "kubeconfig" for import dialog
      setActiveOption(initialActiveOption);
    }
  }, [initialShowCreateOptions, initialActiveOption]);

  // Add useEffect for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when no dialogs are open
      if (editDialogOpen || showCreateOptions) return;

      // Ctrl+F or / to focus search
      if ((e.ctrlKey && e.key === 'f') || e.key === '/') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }

      // Escape to clear search and filters
      if (e.key === 'Escape') {
        if (document.activeElement === searchInputRef.current && searchInputRef.current) {
          setQuery('');
          searchInputRef.current.blur();
        } else {
          if (filter) setFilter('');
          if (filterByLabel) setFilterByLabel(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editDialogOpen, showCreateOptions, query, filter, filterByLabel]);

  // Add function to handle filtering by clicking on a label
  const handleFilterByLabel = (key: string, value: string) => {
    // If clicking the same label filter, remove it
    if (filterByLabel?.key === key && filterByLabel?.value === value) {
      setFilterByLabel(null);
      // Show a message to the user
      toast.success('Label filter removed', { duration: 2000 });
    } else {
      setFilterByLabel({ key, value });
      // Show a message to the user
      toast.success(`Filtering by label: ${key}=${value}`, { duration: 2000 });
    }
  };

  // Add bulk operation functions
  const handleBulkLabelsClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setBulkLabelsAnchorEl(event.currentTarget);
  };

  const handleBulkLabelsClose = () => {
    setBulkLabelsAnchorEl(null);
  };

  const handleBulkAddLabels = () => {
    if (!hasSelectedClusters) return;

    const bulkOperationCluster = {
      name: `${selectedClusters.length} selected clusters`,
      context: 'bulk-operation',
      labels: {},
      // Set other required fields to avoid errors
      uid: 'bulk-operation',
      creationTimestamp: new Date().toISOString(),
      status: 'Active',
    };

    setSelectedCluster(bulkOperationCluster);
    setEditDialogOpen(true);

    handleBulkLabelsClose();
  };

  useEffect(() => {
    setFilteredClusters(clusters);
  }, [clusters]);

  const filterClusters = useCallback(() => {
    let result = [...clusters];

    // Apply search query filter
    if (query.trim()) {
      const searchLower = query.toLowerCase().trim();
      result = result.filter(cluster => {
        const nameMatch = cluster.name.toLowerCase().includes(searchLower);
        const labelMatch = Object.entries(cluster.labels || {}).some(
          ([key, value]) =>
            key.toLowerCase().includes(searchLower) || value.toLowerCase().includes(searchLower)
        );
        const contextMatch = cluster.context.toLowerCase().includes(searchLower);
        const statusMatch = (cluster.status || '').toLowerCase().includes(searchLower);
        return nameMatch || labelMatch || contextMatch || statusMatch;
      });
    }

    // Apply status filter - Fix status filter logic
    if (filter && filter !== '') {
      result = result.filter(cluster => {
        // Check both status property and available property for more accurate filtering
        if (filter === 'available') {
          return cluster.available === true || cluster.status?.toLowerCase() === 'available';
        } else if (filter === 'unavailable') {
          return cluster.available === false || cluster.status?.toLowerCase() === 'unavailable';
        } else if (filter === 'pending') {
          return cluster.status?.toLowerCase() === 'pending';
        }
        return true;
      });
    }

    // Apply label filter
    if (filterByLabel) {
      result = result.filter(cluster => {
        const { key, value } = filterByLabel;
        return cluster.labels && cluster.labels[key] === value;
      });
    }

    setFilteredClusters(result);
  }, [clusters, query, filter, filterByLabel]);

  useEffect(() => {
    filterClusters();
  }, [filterClusters, query, filter, clusters]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setStatusFilterAnchorEl(null);
  };

  const handleStatusFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setStatusFilterAnchorEl(event.currentTarget);
  };

  const handleStatusFilterClose = () => {
    setStatusFilterAnchorEl(null);
  };

  const handleClearFilters = () => {
    setQuery('');
    setFilter('');
    setFilterByLabel(null);
    toast.success('All filters cleared', { duration: 2000 });
  };

  const handleCheckboxChange = (clusterName: string) => {
    setSelectedClusters(prev =>
      prev.includes(clusterName)
        ? prev.filter(name => name !== clusterName)
        : [...prev, clusterName]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedClusters([]);
    } else {
      setSelectedClusters(filteredClusters.map(cluster => cluster.name));
    }
    setSelectAll(!selectAll);
  };

  const handleCancel = () => {
    setShowCreateOptions(false);
  };

  const handleEditLabels = (cluster: ManagedClusterInfo) => {
    setSelectedCluster(cluster);
    setEditDialogOpen(true);
  };

  // Function to get the actual context to use for a cluster
  const getClusterContext = (cluster: ManagedClusterInfo): string => {
    return cluster.context || 'its1';
  };

  const handleSaveLabels = (
    clusterName: string,
    contextName: string,
    labels: { [key: string]: string },
    deletedLabels?: string[]
  ) => {
    console.log('[DEBUG] ========== SAVE LABELS START ==========');
    console.log('[DEBUG] Cluster Name:', clusterName);
    console.log('[DEBUG] Context Name:', contextName);
    console.log('[DEBUG] Labels:', labels);
    console.log('[DEBUG] Deleted Labels:', deletedLabels);

    // Check if this is a bulk operation
    const isBulkOperation =
      selectedClusters.length > 1 && clusterName.includes('selected clusters');

    console.log('[DEBUG] Is Bulk Operation:', isBulkOperation);

    if (isBulkOperation) {
      // Set loading for bulk operation
      setLoadingClusterEdit('bulk');

      let successCount = 0;
      let failureCount = 0;

      // Process each cluster individually
      const processNextCluster = async (index = 0) => {
        if (index >= selectedClusters.length) {
          // All clusters processed
          setLoadingClusterEdit(null);
          setEditDialogOpen(false);

          if (failureCount === 0) {
            toast.success(`Labels updated for all ${successCount} clusters`, {
              icon: '🏷️',
            });
          } else {
            toast.error(
              `Updated ${successCount} clusters, failed to update ${failureCount} clusters`,
              {
                icon: '⚠️',
                duration: 5000,
              }
            );
          }
          return;
        }

        const name = selectedClusters[index];
        const cluster = clusters.find(c => c.name === name);
        if (!cluster) {
          // Skip invalid cluster
          processNextCluster(index + 1);
          return;
        }

        try {
          const finalLabels = { ...labels };
          if (deletedLabels) {
            deletedLabels.forEach(key => {
              finalLabels[key] = ''; // Empty value indicates deletion
            });
          }
          await updateLabelsMutation.mutateAsync({
            contextName: getClusterContext(cluster),
            clusterName: cluster.name,
            labels: finalLabels, // Use finalLabels which includes deletions
            deletedLabels, // Pass deleted labels for the mutation
          });

          successCount++;
          // Add a small delay between requests
          await new Promise(resolve => setTimeout(resolve, 300));
          processNextCluster(index + 1);
        } catch (error) {
          failureCount++;
          console.error(`Error updating labels for ${cluster.name}:`, error);
          processNextCluster(index + 1);
        }
      };

      // Start processing clusters
      processNextCluster();
      return;
    }

    // Regular single-cluster operation
    setLoadingClusterEdit(clusterName);

    // Find the actual cluster to get the correct context
    const actualCluster = clusters.find(c => c.name === clusterName);
    const actualContext = actualCluster ? getClusterContext(actualCluster) : contextName;

    console.log('[DEBUG] Actual Context:', actualContext);
    console.log('[DEBUG] Calling mutation...');

    updateLabelsMutation.mutate(
      {
        contextName: actualContext,
        clusterName: clusterName,
        labels, // Pass original labels
        deletedLabels, // Pass deleted labels separately
      },
      {
        onSuccess: () => {
          console.log('[DEBUG] Mutation successful');
          toast.success('Labels updated successfully', {
            icon: '🏷️',
            style: {
              borderRadius: '10px',
              background: isDark ? '#1e293b' : '#ffffff',
              color: isDark ? '#f1f5f9' : '#1e293b',
              border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            },
          });
          setLoadingClusterEdit(null);
          setEditDialogOpen(false);
        },
        onError: error => {
          console.error('[DEBUG] Mutation error:', error);
          toast.error(
            'Labels are used in Binding Policy ' +
              'and cannot be deleted. Please remove the policy first.',
            {
              icon: '❌',
              style: {
                borderRadius: '10px',
                background: isDark ? '#1e293b' : '#ffffff',
                color: isDark ? '#f1f5f9' : '#1e293b',
                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
              },
              duration: 5000,
            }
          );
          console.error('Error updating cluster labels:', error);
          setLoadingClusterEdit(null);
        },
      }
    );
  };

  const handleActionsClick = (event: React.MouseEvent<HTMLButtonElement>, clusterName: string) => {
    setAnchorElActions(prev => ({ ...prev, [clusterName]: event.currentTarget }));
  };

  const handleActionsClose = (clusterName: string) => {
    setAnchorElActions(prev => ({ ...prev, [clusterName]: null }));
  };

  const handleViewDetails = (cluster: ManagedClusterInfo) => {
    setSelectedCluster(cluster);
    handleActionsClose(cluster.name);
    setViewDetailsOpen(true);
  };

  const handleCopyName = (clusterName: string) => {
    navigator.clipboard.writeText(clusterName);
    handleActionsClose(clusterName);
    toast.success(`Cluster name copied to clipboard: ${clusterName}`, {
      duration: 2000,
    });
  };

  const handleDetachCluster = (cluster: ManagedClusterInfo) => {
    setSelectedCluster(cluster);
    handleActionsClose(cluster.name);
    setDetachClusterOpen(true);
  };

  const handleConfirmDetach = (clusterName: string) => {
    setLoadingClusterDetach(clusterName);

    // Close the confirmation dialog and open logs dialog immediately
    setDetachClusterOpen(false);
    setDetachLogsOpen(true);

    detachClusterMutation.mutate(clusterName, {
      onSuccess: () => {
        setLoadingClusterDetach(null);

        // Explicitly refetch clusters data
        if (refetchClusters) {
          refetchClusters();
        } else {
          // Fallback if refetch function is not available
          window.location.reload();
        }

        // Remove the detached cluster from selected clusters if it was selected
        setSelectedClusters(prev => prev.filter(name => name !== clusterName));
      },
      onError: () => {
        setLoadingClusterDetach(null);
      },
    });
  };

  // Handle the closing of detachment logs dialog
  const handleCloseDetachLogs = () => {
    setDetachLogsOpen(false);
    // Refetch clusters to ensure UI is updated
    if (refetchClusters) {
      refetchClusters();
    }
  };

  // Expose the refetch function from the parent component
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('refetch-clusters', () => {
        // Force an immediate refetch by reloading the page
        window.location.reload();
      });
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('refetch-clusters', () => {});
      }
    };
  }, []);

  // Helper to get count of filtered items
  const getFilteredCount = () => {
    return filteredClusters.length;
  };
  return (
    <div className="p-4" style={{ backgroundColor: colors.background, color: colors.text }}>
      <div className="mb-8">
        <h1
          className="mb-2 flex items-center gap-2 text-3xl font-bold"
          style={{ color: colors.primary }}
        >
          <div>{t('clusters.title')}</div>
          <span
            className="rounded-full px-3 py-1 text-sm"
            style={{
              backgroundColor: isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)',
              color: colors.primary,
            }}
          >
            {clusters.length}
          </span>
        </h1>
        <p className="text-lg" style={{ color: colors.textSecondary }}>
          {t('clusters.subtitle')}
        </p>
      </div>

      {/* Redesigned Search and Filter Section */}
      <div className="mb-6 flex flex-col gap-4">
        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-opacity-50 p-4"
          style={{
            backgroundColor: isDark ? 'rgba(47, 134, 255, 0.05)' : 'rgba(47, 134, 255, 0.02)',
            border: `1px solid ${isDark ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.05)'}`,
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Enhanced Search Field - Reduce max width */}
          <div
            className={`relative flex-grow transition-all ${searchFocused ? 'max-w-lg' : 'max-w-sm'}`}
          >
            <TextField
              placeholder={t('clusters.searchPlaceholder')}
              value={query}
              onChange={handleSearchChange}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              variant="outlined"
              fullWidth
              inputRef={searchInputRef}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon
                      style={{
                        color: searchFocused ? colors.primary : colors.textSecondary,
                        transition: 'color 0.2s ease',
                      }}
                    />
                  </InputAdornment>
                ),
                endAdornment: query ? (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setQuery('')}
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
                {t('clusters.clearSearch')}
              </Typography>
            )}
          </div>

          {/* Status Filter Button */}
          <div className="flex items-center gap-3">
            <Button
              variant="outlined"
              onClick={handleStatusFilterClick}
              startIcon={
                <Filter
                  size={16}
                  style={{ color: filter ? colors.primary : colors.textSecondary }}
                />
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
                ? statusFilterItems.find(item => item.value === filter)?.label || 'Status Filter'
                : 'Status Filter'}
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

            <Menu
              id="status-filter-menu"
              anchorEl={statusFilterAnchorEl}
              open={statusFilterOpen}
              onClose={handleStatusFilterClose}
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
              <MenuItem onClick={handleBulkAddLabels} sx={{ color: colors.text }}>
                <ListItemIcon>
                  <PostAddIcon fontSize="small" style={{ color: colors.primary }} />
                </ListItemIcon>
                <ListItemText>{t('clusters.labels.bulkLabels')}</ListItemText>
              </MenuItem>

              {statusFilterItems.map(item => (
                <MenuItem
                  key={item.value}
                  onClick={() => handleFilterChange(item.value)}
                  selected={filter === item.value}
                  sx={{
                    color: colors.text,
                    backgroundColor:
                      filter === item.value
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
                          transform: filter === item.value ? 'scale(1.2)' : 'scale(1)',
                        }}
                      />
                    )}
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: filter === item.value ? 600 : 400,
                        transition: 'all 0.15s ease',
                        color: filter === item.value ? colors.primary : colors.text,
                      }}
                    >
                      {item.label}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Menu>

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
                    {selectedClusters.length}
                  </Box>
                </Button>
                <Menu
                  anchorEl={bulkLabelsAnchorEl}
                  open={bulkLabelsMenuOpen}
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
                  <MenuItem onClick={handleBulkAddLabels} sx={{ color: colors.text }}>
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
                onClick={() => {
                  setShowCreateOptions(true);
                  setActiveOption('quickconnect');
                }}
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
              {showCreateOptions && (
                <CreateOptions
                  activeOption={activeOption}
                  setActiveOption={setActiveOption}
                  onCancel={handleCancel}
                />
              )}
            </div>
          </div>
        </div>

        {/* Active Filter Display */}
        {(query || filter || filterByLabel) && (
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
                onDelete={() => setQuery('')}
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

            {filter && (
              <Chip
                label={`${t('clusters.status.title')}: ${statusFilterItems.find(item => item.value === filter)?.label}`}
                size="medium"
                onDelete={() => setFilter('')}
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

            {filterByLabel && (
              <Chip
                label={`${t('clusters.labels.label')}: ${filterByLabel.key}=${filterByLabel.value}`}
                size="medium"
                onDelete={() => setFilterByLabel(null)}
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
              {getFilteredCount()} result{getFilteredCount() !== 1 ? 's' : ''}
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
              {t('common.clearAll')}
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : (
        <TableContainer
          component={Paper}
          className="overflow-auto"
          sx={{
            backgroundColor: colors.paper,
            boxShadow: isDark
              ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)'
              : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
          }}
        >
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  background: colors.primary,
                  '& .MuiTableCell-head': {
                    color: colors.white,
                    fontWeight: 600,
                    padding: '16px',
                    fontSize: '0.95rem',
                  },
                }}
              >
                <TableCell>
                  <Checkbox
                    checked={selectAll}
                    onChange={handleSelectAll}
                    sx={{
                      color: colors.white,
                      '&.Mui-checked': { color: colors.white },
                    }}
                  />
                </TableCell>
                <TableCell>{t('clusters.table.name')}</TableCell>
                <TableCell>{t('clusters.table.labels')}</TableCell>
                <TableCell>{t('clusters.table.creationTime')}</TableCell>
                <TableCell>{t('clusters.table.context')}</TableCell>
                <TableCell>{t('clusters.table.status')}</TableCell>
                <TableCell>{t('clusters.table.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredClusters.length > 0 ? (
                filteredClusters.map((cluster, index) => (
                  <Fade in={true} timeout={100 + index * 50} key={cluster.name}>
                    <TableRow
                      sx={{
                        backgroundColor: colors.paper,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: isDark
                            ? 'rgba(47, 134, 255, 0.08)'
                            : 'rgba(47, 134, 255, 0.04)',
                          transform: 'translateY(-2px)',
                          boxShadow: isDark
                            ? '0 4px 8px -2px rgba(0, 0, 0, 0.2)'
                            : '0 4px 8px -2px rgba(0, 0, 0, 0.1)',
                        },
                        '& .MuiTableCell-body': {
                          color: colors.text,
                          borderColor: colors.border,
                          padding: '16px',
                          fontSize: '0.95rem',
                        },
                        position: 'relative',
                        '&::after': selectedClusters.includes(cluster.name)
                          ? {
                              content: '""',
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              height: '100%',
                              width: '3px',
                              backgroundColor: colors.primary,
                              borderTopLeftRadius: '4px',
                              borderBottomLeftRadius: '4px',
                            }
                          : {},
                      }}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedClusters.includes(cluster.name)}
                          onChange={() => handleCheckboxChange(cluster.name)}
                          sx={{
                            color: colors.textSecondary,
                            '&.Mui-checked': {
                              color: colors.primary,
                              '& + .MuiSvgIcon-root': {
                                animation: 'pulse 0.3s ease-in-out',
                              },
                            },
                            '@keyframes pulse': {
                              '0%': { transform: 'scale(0.8)' },
                              '50%': { transform: 'scale(1.2)' },
                              '100%': { transform: 'scale(1)' },
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="text-base font-medium">{cluster.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            {cluster.labels && Object.keys(cluster.labels).length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(cluster.labels).map(([key, value]) => (
                                  <Tooltip
                                    key={`${key}-${value}`}
                                    title={t('clusters.filteredByLabel')}
                                    arrow
                                    placement="top"
                                    TransitionComponent={Zoom}
                                  >
                                    <span
                                      onClick={() => handleFilterByLabel(key, value)}
                                      style={{
                                        backgroundColor:
                                          filterByLabel?.key === key &&
                                          filterByLabel?.value === value
                                            ? isDark
                                              ? 'rgba(47, 134, 255, 0.3)'
                                              : 'rgba(47, 134, 255, 0.15)'
                                            : isDark
                                              ? 'rgba(47, 134, 255, 0.15)'
                                              : 'rgba(47, 134, 255, 0.08)',
                                        color: colors.primary,
                                        border: `1px solid ${
                                          filterByLabel?.key === key &&
                                          filterByLabel?.value === value
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
                                      {key}={value}
                                    </span>
                                  </Tooltip>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: colors.textSecondary, fontStyle: 'italic' }}>
                                {t('clusters.labels.noLabels')}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {cluster.creationTime || cluster.creationTimestamp
                          ? new Date(
                              cluster.creationTime || cluster.creationTimestamp || ''
                            ).toLocaleString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <span
                          style={{
                            backgroundColor: isDark
                              ? 'rgba(103, 192, 115, 0.2)'
                              : 'rgba(103, 192, 115, 0.1)',
                            color: isDark ? 'rgb(154, 214, 249)' : 'rgb(47, 134, 255)',
                            border: `1px solid ${isDark ? 'rgba(103, 192, 115, 0.4)' : 'rgba(103, 192, 115, 0.3)'}`,
                            display: 'inline-block',
                            maxWidth: '200px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            verticalAlign: 'middle',
                          }}
                          className="rounded-lg px-2 py-1 text-xs font-medium"
                          title={cluster.name} // Add tooltip with full context name
                        >
                          {cluster.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium"
                          style={{
                            backgroundColor:
                              cluster.status?.toLowerCase() === 'unavailable' || !cluster.available
                                ? isDark
                                  ? 'rgba(255, 107, 107, 0.2)'
                                  : 'rgba(255, 107, 107, 0.1)'
                                : cluster.status?.toLowerCase() === 'pending'
                                  ? isDark
                                    ? 'rgba(255, 179, 71, 0.2)'
                                    : 'rgba(255, 179, 71, 0.1)'
                                  : isDark
                                    ? 'rgba(103, 192, 115, 0.2)'
                                    : 'rgba(103, 192, 115, 0.1)',
                            color:
                              cluster.status?.toLowerCase() === 'unavailable' || !cluster.available
                                ? colors.error
                                : cluster.status?.toLowerCase() === 'pending'
                                  ? colors.warning
                                  : colors.success,
                            border:
                              cluster.status?.toLowerCase() === 'unavailable' || !cluster.available
                                ? `1px solid ${isDark ? 'rgba(255, 107, 107, 0.4)' : 'rgba(255, 107, 107, 0.3)'}`
                                : cluster.status?.toLowerCase() === 'pending'
                                  ? `1px solid ${isDark ? 'rgba(255, 179, 71, 0.4)' : 'rgba(255, 179, 71, 0.3)'}`
                                  : `1px solid ${isDark ? 'rgba(103, 192, 115, 0.4)' : 'rgba(103, 192, 115, 0.3)'}`,
                          }}
                        >
                          <span
                            className="h-3 w-3 animate-pulse rounded-full"
                            style={{
                              backgroundColor:
                                cluster.status?.toLowerCase() === 'unavailable' ||
                                !cluster.available
                                  ? colors.error
                                  : cluster.status?.toLowerCase() === 'pending'
                                    ? colors.warning
                                    : colors.success,
                            }}
                          ></span>
                          {cluster.status?.toLowerCase() === 'unavailable' || !cluster.available
                            ? t('clusters.status.inactive')
                            : cluster.status?.toLowerCase() === 'pending'
                              ? t('clusters.status.pending')
                              : t('clusters.status.active')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <IconButton
                            aria-label="more"
                            id={`actions-button-${cluster.name}`}
                            aria-controls={
                              anchorElActions[cluster.name]
                                ? `actions-menu-${cluster.name}`
                                : undefined
                            }
                            aria-expanded={anchorElActions[cluster.name] ? 'true' : undefined}
                            onClick={event => handleActionsClick(event, cluster.name)}
                            size="small"
                            style={{
                              color: colors.textSecondary,
                              backgroundColor: isDark
                                ? 'rgba(47, 134, 255, 0.08)'
                                : 'rgba(47, 134,255, 0.05)',
                            }}
                            className="transition-all duration-200 hover:scale-110 hover:bg-opacity-80"
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                          <Menu
                            id={`actions-menu-${cluster.name}`}
                            anchorEl={anchorElActions[cluster.name]}
                            open={Boolean(anchorElActions[cluster.name])}
                            onClose={() => handleActionsClose(cluster.name)}
                            MenuListProps={{
                              'aria-labelledby': `actions-button-${cluster.name}`,
                            }}
                            anchorOrigin={{
                              vertical: 'bottom',
                              horizontal: 'right',
                            }}
                            transformOrigin={{
                              vertical: 'top',
                              horizontal: 'right',
                            }}
                            PaperProps={{
                              style: {
                                backgroundColor: colors.paper,
                                border: `1px solid ${colors.border}`,
                                boxShadow: isDark
                                  ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)'
                                  : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                                borderRadius: '8px',
                              },
                            }}
                          >
                            <MenuItem
                              onClick={() => handleViewDetails(cluster)}
                              sx={{ color: colors.text }}
                            >
                              <ListItemIcon>
                                <VisibilityIcon
                                  fontSize="small"
                                  style={{ color: colors.primary }}
                                />
                              </ListItemIcon>
                              <ListItemText>{t('clusters.actions.viewDetails')}</ListItemText>
                            </MenuItem>

                            <MenuItem
                              onClick={() => handleEditLabels(cluster)}
                              sx={{ color: colors.text }}
                            >
                              <ListItemIcon>
                                <LabelIcon fontSize="small" style={{ color: colors.primary }} />
                              </ListItemIcon>
                              <ListItemText>{t('clusters.actions.editLabels')}</ListItemText>
                            </MenuItem>

                            <MenuItem
                              onClick={() => handleCopyName(cluster.name)}
                              sx={{ color: colors.text }}
                            >
                              <ListItemIcon>
                                <ContentCopyIcon
                                  fontSize="small"
                                  style={{ color: colors.primary }}
                                />
                              </ListItemIcon>
                              <ListItemText>{t('clusters.actions.copyName')}</ListItemText>
                            </MenuItem>

                            <Divider />

                            <MenuItem
                              onClick={() => handleDetachCluster(cluster)}
                              sx={{ color: colors.error }}
                            >
                              <ListItemIcon>
                                <LinkOffIcon fontSize="small" style={{ color: colors.error }} />
                              </ListItemIcon>
                              <ListItemText>{t('clusters.actions.detachCluster')}</ListItemText>
                            </MenuItem>
                          </Menu>
                        </div>
                      </TableCell>
                    </TableRow>
                  </Fade>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-16">
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
                      <h3 style={{ color: colors.text }} className="mb-3 text-xl font-semibold">
                        {t('clusters.noClustersFound')}
                      </h3>
                      <p
                        style={{ color: colors.textSecondary }}
                        className="mb-6 max-w-md text-base"
                      >
                        {query && filter
                          ? t('clusters.noClustersMatchBoth')
                          : query
                            ? t('clusters.noClustersMatchSearch')
                            : filter
                              ? t('clusters.noClustersMatchFilter')
                              : t('clusters.noClustersAvailable')}
                      </p>
                      {query || filter ? (
                        <div className="flex flex-wrap justify-center gap-3">
                          {query && (
                            <Button
                              onClick={() => setQuery('')}
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
                              onClick={() => setFilter('')}
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
                          onClick={() => {
                            setShowCreateOptions(true);
                            setActiveOption('quickconnect');
                          }}
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
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {filterByLabel && (
        <div
          className="mt-4 flex items-center rounded-lg bg-opacity-10 p-2"
          style={{
            backgroundColor: isDark ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.05)',
            border: `1px solid ${colors.border}`,
          }}
        >
          <InboxIcon style={{ color: colors.primary, marginRight: '8px' }} fontSize="small" />
          <span style={{ color: colors.textSecondary }}>
            {t('clusters.filteredByLabel')}
            <span style={{ fontWeight: 500, color: colors.primary, margin: '0 4px' }}>
              {filterByLabel.key}={filterByLabel.value}
            </span>
          </span>
          <Button
            size="small"
            onClick={() => setFilterByLabel(null)}
            sx={{
              minWidth: 'auto',
              ml: 2,
              color: colors.textSecondary,
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              },
            }}
          >
            {t('common.clear')}
          </Button>
        </div>
      )}
      {!isLoading && (
        <div className="mt-6 flex items-center justify-between px-2">
          <Button
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            sx={{
              color: currentPage === 1 ? colors.disabled : colors.primary,
              borderColor: currentPage === 1 ? colors.disabled : colors.primary,
              backgroundColor:
                isDark && currentPage !== 1 ? 'rgba(47, 134, 255, 0.1)' : 'transparent',
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
                boxShadow: isDark
                  ? '0 2px 4px rgba(0, 0, 0, 0.1)'
                  : '0 2px 4px rgba(0, 0, 0, 0.05)',
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
              {filteredClusters.length} item{filteredClusters.length !== 1 ? 's' : ''}
            </Box>
          </div>
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
      )}

      <DetachClusterDialog
        open={detachClusterOpen}
        onClose={() => {
          setDetachClusterOpen(false);
          if (loadingClusterDetach) {
            setLoadingClusterDetach(null);
          }
        }}
        cluster={selectedCluster}
        onDetach={handleConfirmDetach}
        isLoading={!!loadingClusterDetach}
        isDark={isDark}
        colors={colors}
      />

      <LabelEditDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          // Clear the loading state if dialog is closed while operation is in progress
          if (loadingClusterEdit && selectedCluster) {
            setLoadingClusterEdit(null);
          }
        }}
        cluster={selectedCluster}
        onSave={handleSaveLabels}
        isDark={isDark}
        colors={colors}
      />

      <ClusterDetailDialog
        open={viewDetailsOpen}
        onClose={() => setViewDetailsOpen(false)}
        clusterName={selectedCluster?.name || null}
        isDark={isDark}
        colors={colors}
      />

      <DetachmentLogsDialog
        open={detachLogsOpen}
        onClose={handleCloseDetachLogs}
        clusterName={selectedCluster?.name || ''}
        isDark={isDark}
        colors={colors}
      />
    </div>
  );
};

export default ClustersTable;
