import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Typography,
  Chip,
  Tooltip,
  Divider,
  Fade,
  Zoom,
  InputAdornment,
} from '@mui/material';
import { Tag } from 'lucide-react';
import LabelIcon from '@mui/icons-material/Label';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import CancelButton from '../../../../../components/common/CancelButton';
import { LabelItem, LabelEditDialogProps } from './types';
import { useLabelProtection } from './useLabelProtection';
import { LabelsList } from './LabelsList';

const LabelEditDialog: React.FC<LabelEditDialogProps> = ({
  open,
  onClose,
  cluster,
  onSave,
  isDark,
  colors,
}) => {
  const { t } = useTranslation();
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [deletedLabels, setDeletedLabels] = useState<string[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [labelSearch, setLabelSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedLabelIndex, setSelectedLabelIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingKey, setEditingKey] = useState('');
  const [editingValue, setEditingValue] = useState('');

  const keyInputRef = useRef<HTMLInputElement>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);
  const editKeyInputRef = useRef<HTMLInputElement>(null);
  const editValueInputRef = useRef<HTMLInputElement>(null);

  const { isLabelProtected } = useLabelProtection(open, cluster);

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
                  startIcon={<Tag size={16} />}
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

          <LabelsList
            labels={filteredLabels}
            selectedLabelIndex={selectedLabelIndex}
            editingIndex={editingIndex}
            editingKey={editingKey}
            editingValue={editingValue}
            isDark={isDark}
            colors={colors}
            isLabelProtected={isLabelProtected}
            onLabelClick={index =>
              setSelectedLabelIndex(selectedLabelIndex === index ? null : index)
            }
            onStartEdit={handleStartEdit}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onRemoveLabel={handleRemoveLabel}
            onEditKeyChange={setEditingKey}
            onEditValueChange={setEditingValue}
            onEditKeyDown={handleEditKeyDown}
            editKeyInputRef={editKeyInputRef}
            editValueInputRef={editValueInputRef}
            t={t}
          />
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
          startIcon={saving ? undefined : <SaveIcon />}
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
