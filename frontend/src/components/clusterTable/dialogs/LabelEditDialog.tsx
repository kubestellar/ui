import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  Divider,
  Fade,
  Zoom,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import LabelIcon from '@mui/icons-material/Label';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import LockIcon from '@mui/icons-material/Lock';
import { Tag, Tags } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import CancelButton from '../../common/CancelButton';
import { ManagedClusterInfo, ColorTheme } from '../types';

interface LabelEditDialogProps {
  open: boolean;
  onClose: () => void;
  cluster: ManagedClusterInfo | null;
  onSave: (
    clusterName: string,
    contextName: string,
    labels: { [key: string]: string },
    deletedLabels?: string[]
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

  // Editing states
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingKey, setEditingKey] = useState('');
  const [editingValue, setEditingValue] = useState('');

  // Refs
  const keyInputRef = useRef<HTMLInputElement>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);
  const editKeyInputRef = useRef<HTMLInputElement>(null);
  const editValueInputRef = useRef<HTMLInputElement>(null);

  // Function to check if a label is protected
  const isLabelProtected = useCallback(
    (labelKey: string): boolean => {
      const systemPrefixes = [
        'cluster.open-cluster-management.io/',
        'feature.open-cluster-management.io/',
        'kubernetes.io/',
        'k8s.io/',
        'node.openshift.io/',
        'beta.kubernetes.io/',
        'topology.kubernetes.io/',
        'node-role.kubernetes.io/',
        'name',
      ];

      for (const prefix of systemPrefixes) {
        if (labelKey.startsWith(prefix)) {
          return true;
        }
      }

      return protectedLabels.has(labelKey);
    },
    [protectedLabels]
  );

  // Fetch protected labels from binding policies
  useEffect(() => {
    if (open && cluster) {
      const fetchProtectedLabels = async () => {
        try {
          const response = await fetch('/api/bp');
          if (response.ok) {
            const data = await response.json();
            const usedLabels = new Set<string>();

            data.bindingPolicies?.forEach(
              (bp: {
                spec?: {
                  clusterSelectors?: Array<{
                    matchLabels?: { [key: string]: string };
                    matchExpressions?: Array<{ key?: string }>;
                  }>;
                };
                clusterSelectors?: Array<{ [key: string]: string }>;
                clusters?: string[];
                yaml?: string;
              }) => {
                bp.spec?.clusterSelectors?.forEach(selector => {
                  Object.keys(selector.matchLabels || {}).forEach((key: string) => {
                    usedLabels.add(key);
                  });

                  selector.matchExpressions?.forEach(expr => {
                    if (expr.key) {
                      usedLabels.add(expr.key);
                    }
                  });
                });

                bp.clusterSelectors?.forEach(selector => {
                  Object.keys(selector || {}).forEach((key: string) => {
                    usedLabels.add(key);
                  });
                });

                bp.clusters?.forEach(cluster => {
                  if (cluster.includes('=')) {
                    const key = cluster.split('=')[0].trim();
                    if (key) usedLabels.add(key);
                  } else if (cluster.includes(':')) {
                    const key = cluster.split(':')[0].trim();
                    if (key) usedLabels.add(key);
                  }
                });

                if (bp.yaml) {
                  const yamlLines = bp.yaml.split('\n');
                  let inMatchLabels = false;

                  yamlLines.forEach(line => {
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
              }
            );

            setProtectedLabels(usedLabels);
          }
        } catch (error) {
          console.error('Failed to fetch protected labels:', error);
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

  // Initialize labels when dialog opens
  useEffect(() => {
    if (cluster && open) {
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
        valueInputRef.current.focus();
      } else if (newKey && newValue) {
        handleAddLabel();
      }
    } else if (e.key === 'Escape') {
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
      setDeletedLabels(prev => [...prev, labelToRemove.key]);
    }
    setLabels(labels.filter((_, i) => i !== index));
    toast.success(t('clusters.labels.removed', { key: labelToRemove.key }));
  };

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
        editValueInputRef.current.focus();
        editValueInputRef.current.select();
      } else if (editingKey && editingValue) {
        handleSaveEdit();
      }
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleSave = () => {
    if (!cluster) return;

    if (editingIndex !== null) {
      handleCancelEdit();
    }

    setSaving(true);

    const labelObject: { [key: string]: string } = {};
    labels.forEach(({ key, value }) => {
      labelObject[key] = value;
    });

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
                <div
                  style={{
                    backgroundColor: isDark
                      ? 'rgba(47, 134, 255, 0.15)'
                      : 'rgba(47, 134, 255, 0.1)',
                    color: colors.primary,
                    fontSize: '0.75rem',
                    padding: '4px 8px',
                    borderRadius: '12px',
                  }}
                >
                  {t('clusters.labels.count', { count: labels.length })}
                </div>
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
                  InputProps={{ style: { color: colors.text } }}
                  InputLabelProps={{ style: { color: colors.textSecondary }, shrink: true }}
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
                  InputProps={{ style: { color: colors.text } }}
                  InputLabelProps={{ style: { color: colors.textSecondary }, shrink: true }}
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

          {/* Labels Display Section */}
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
                                style={{ color: colors.warning, fontSize: '16px' }}
                              />
                            </Tooltip>
                          ) : (
                            <Tag size={16} style={{ color: colors.primary }} />
                          )}

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
                                  style: { color: colors.text, fontSize: '0.875rem' },
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
                                  style: { color: colors.text, fontSize: '0.875rem' },
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

export default LabelEditDialog;
