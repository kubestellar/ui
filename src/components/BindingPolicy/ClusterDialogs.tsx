import React, {
  useState,
  useRef,
  useEffect,
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
} from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Divider,
  alpha,
  Chip,
  Tooltip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Zoom,
  InputAdornment,
  List,
  ListItemText,
  ListItemButton,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import LabelIcon from '@mui/icons-material/Label';
import AddIcon from '@mui/icons-material/Add';
import LockIcon from '@mui/icons-material/Lock';
import { Tag, Tags } from 'lucide-react';
import { ManagedCluster } from '../../types/bindingPolicy';
import { toast } from 'react-hot-toast';

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
  cluster: ManagedCluster | null;
  clusters: ManagedCluster[];
  isBulkEdit: boolean;
  onSave: (
    clusterName: string,
    contextName: string,
    labels: { [key: string]: string },
    deletedLabels?: string[]
  ) => void;
  onBulkSave: (clusters: ManagedCluster[], labels: { [key: string]: string }) => void;
  isDark: boolean;
  colors: ColorTheme;
}

interface SelectClusterDialogProps {
  open: boolean;
  onClose: () => void;
  clusters: ManagedCluster[];
  onSelectCluster: (cluster: ManagedCluster) => void;
  onSelectClusters: (clusters: ManagedCluster[]) => void;
  isDark: boolean;
  colors: ColorTheme;
}

// Add interfaces for binding policy data structure
interface MatchExpression {
  key: string;
  operator?: string;
  values?: string[];
}

interface ClusterSelector {
  matchLabels?: { [key: string]: string };
  matchExpressions?: MatchExpression[];
}

interface BindingPolicySpec {
  clusterSelectors?: ClusterSelector[];
}

interface BindingPolicy {
  spec?: BindingPolicySpec;
  clusterSelectors?: { [key: string]: string }[];
  clusters?: string[];
  yaml?: string;
}

interface BindingPolicyResponse {
  bindingPolicies?: BindingPolicy[];
}

export const LabelEditDialog: React.FC<LabelEditDialogProps> = ({
  open,
  onClose,
  cluster,
  clusters,
  isBulkEdit,
  onSave,
  onBulkSave,
  isDark,
  colors,
}) => {
  const [labels, setLabels] = useState<Array<{ key: string; value: string }>>([]);
  const [deletedLabels, setDeletedLabels] = useState<string[]>([]);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [labelSearch, setLabelSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedLabelIndex, setSelectedLabelIndex] = useState<number | null>(null);
  const [appendLabels, setAppendLabels] = useState(true);
  const [protectedLabels, setProtectedLabels] = useState<Set<string>>(new Set());

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingKey, setEditingKey] = useState('');
  const [editingValue, setEditingValue] = useState('');

  const keyInputRef = useRef<HTMLInputElement>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);

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
            const data: BindingPolicyResponse = await response.json();
            const usedLabels = new Set<string>();

            data.bindingPolicies?.forEach((bp: BindingPolicy) => {
              // From spec.clusterSelectors.matchLabels
              bp.spec?.clusterSelectors?.forEach((selector: ClusterSelector) => {
                Object.keys(selector.matchLabels || {}).forEach((key: string) => {
                  usedLabels.add(key);
                });

                selector.matchExpressions?.forEach((expr: MatchExpression) => {
                  if (expr.key) {
                    usedLabels.add(expr.key);
                  }
                });
              });

              // From stored clusterSelectors
              bp.clusterSelectors?.forEach((selector: { [key: string]: string }) => {
                Object.keys(selector || {}).forEach((key: string) => {
                  usedLabels.add(key);
                });
              });

              bp.clusters?.forEach((cluster: string) => {
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
    if (open) {
      if (isBulkEdit) {
        console.log('LabelEditDialog opened for bulk edit with clusters:', clusters.length);

        // For bulk edit, start with empty labels
        setLabels([]);
      } else if (cluster) {
        const labelArray = Object.entries(cluster.labels || {}).map(([key, value]) => ({
          key,
          value,
        }));
        setLabels(labelArray);
      }

      // Reset
      setDeletedLabels([]);
      setNewKey('');
      setNewValue('');
      setLabelSearch('');
      setIsSearching(false);
      setSelectedLabelIndex(null);
      setAppendLabels(true);
      setEditingIndex(null);
      setEditingKey('');
      setEditingValue('');

      setTimeout(() => {
        if (keyInputRef.current) {
          keyInputRef.current.focus();
        }
      }, 100);
    }
  }, [cluster, clusters, isBulkEdit, open]);

  const handleAddLabel = () => {
    if (newKey.trim() && newValue.trim()) {
      // Check if it's a protected label being added
      if (isLabelProtected(newKey.trim())) {
        toast.error(`Cannot modify protected label: ${newKey}`, {
          icon: '🔒',
          duration: 3000,
        });
        return;
      }

      // Check for duplicates
      const isDuplicate = labels.some(label => label.key === newKey.trim());

      if (isDuplicate) {
        // Update existing label with same key
        setLabels(
          labels.map(label =>
            label.key === newKey.trim() ? { ...label, value: newValue.trim() } : label
          )
        );
        toast.success(`Updated existing label: ${newKey}`);
      } else {
        // Add new label with animation effect
        setLabels(prev => [...prev, { key: newKey.trim(), value: newValue.trim() }]);
        toast.success(`Added new label: ${newKey}`);
      }

      setNewKey('');
      setNewValue('');
      if (keyInputRef.current) {
        keyInputRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent) => {
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

    // Check if this is a protected label
    if (isLabelProtected(labelToRemove.key)) {
      toast.error(`Cannot delete protected label: ${labelToRemove.key}`, {
        icon: '🔒',
        duration: 3000,
        style: {
          borderLeft: `4px solid ${colors.warning}`,
        },
      });
      return;
    }

    // If this was an original label, mark it for deletion
    if (cluster?.labels && cluster.labels[labelToRemove.key]) {
      console.log('[DEBUG] Adding to deleted labels:', labelToRemove.key);
      setDeletedLabels(prev => {
        const newDeleted = [...prev, labelToRemove.key];
        console.log('[DEBUG] Updated deleted labels:', newDeleted);
        return newDeleted;
      });
    }

    setLabels(labels.filter((_, i) => i !== index));
    toast.success(`Removed label: ${labelToRemove.key}`);
  };

  const handleStartEdit = (index: number) => {
    const label = labels[index];

    // Check if this is a protected label
    if (isLabelProtected(label.key)) {
      toast.error(`Cannot edit protected label: ${label.key}`, {
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
      toast.error('Both key and value are required', { duration: 2000 });
      return;
    }

    if (editingIndex === null) return;

    const originalKey = labels[editingIndex].key;

    if (editingKey.trim() !== originalKey && isLabelProtected(editingKey.trim())) {
      toast.error(`Cannot create protected label: ${editingKey}`, {
        icon: '🔒',
        duration: 3000,
      });
      return;
    }

    // Check for duplicates only if the key has changed
    if (editingKey.trim() !== originalKey) {
      const isDuplicate = labels.some(
        (label, index) => index !== editingIndex && label.key === editingKey.trim()
      );

      if (isDuplicate) {
        toast.error(`Label with key "${editingKey}" already exists`, { duration: 3000 });
        return;
      }
    }

    if (editingKey.trim() !== originalKey) {
      if (cluster?.labels && cluster.labels[originalKey]) {
        setDeletedLabels(prev => [...prev, originalKey]);
      }
    }

    // Update the label
    setLabels(prev =>
      prev.map((label, index) =>
        index === editingIndex ? { key: editingKey.trim(), value: editingValue.trim() } : label
      )
    );

    setEditingIndex(null);
    setEditingKey('');
    setEditingValue('');

    toast.success(`Label updated successfully`, { duration: 2000 });
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
    if (isBulkEdit) {
      if (clusters.length === 0) return;

      setSaving(true);

      const labelObject: { [key: string]: string } = {};
      labels.forEach(({ key, value }) => {
        labelObject[key] = value;
      });

      //   console.log("===== BULK LABEL SAVE DEBUG =====");
      //   console.log("Clusters being saved:", clusters.length);
      //   console.log("Labels being saved:", JSON.stringify(labelObject, null, 2));
      //   console.log("Append mode:", appendLabels);

      // Add a slight delay to show loading state
      setTimeout(() => {
        onBulkSave(clusters, labelObject);
        setSaving(false);
        onClose();
      }, 300);
    } else if (cluster) {
      if (editingIndex !== null) {
        handleCancelEdit();
      }

      setSaving(true);

      const labelObject: { [key: string]: string } = {};
      labels.forEach(({ key, value }) => {
        labelObject[key] = value;
      });

      console.log('[DEBUG] Saving with labels:', labelObject);
      console.log('[DEBUG] Saving with deleted labels:', deletedLabels);

      // Add a slight delay to show loading state
      setTimeout(() => {
        onSave(cluster.name, cluster.context || 'default', labelObject, deletedLabels);
        setSaving(false);
        onClose();
      }, 300);
    }
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
            {isBulkEdit
              ? `Edit Labels for ${clusters.length} Clusters`
              : `Edit Labels for ${cluster?.name}`}
          </Typography>
        </div>
        <IconButton onClick={onClose} size="small" style={{ color: colors.textSecondary }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent style={{ padding: '20px 24px' }}>
        {isBulkEdit && (
          <Box mb={2} pb={2} borderBottom={`1px solid ${colors.border}`}>
            <Typography
              variant="subtitle2"
              style={{ marginBottom: '8px', color: colors.textSecondary }}
            >
              Bulk Edit Mode
            </Typography>
            <Typography
              variant="body2"
              style={{ marginBottom: '12px', color: colors.textSecondary }}
            >
              You are editing labels for {clusters.length} clusters. The changes will be applied to
              all selected clusters.
            </Typography>

            <FormControlLabel
              control={
                <Checkbox
                  checked={appendLabels}
                  onChange={e => setAppendLabels(e.target.checked)}
                  sx={{
                    color: colors.primary,
                    '&.Mui-checked': {
                      color: colors.primary,
                    },
                  }}
                />
              }
              label={
                <Typography variant="body2">
                  Append to existing labels (unchecking will replace all existing labels)
                </Typography>
              }
            />
          </Box>
        )}

        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <Typography variant="body2" style={{ color: colors.textSecondary }}>
              Add, edit, or remove labels to organize and categorize your cluster.
              <span style={{ color: colors.warning, marginLeft: '4px' }}>
                🔒 Protected labels cannot be modified.
              </span>
            </Typography>

            <div className="flex gap-2">
              <Tooltip title={isSearching ? 'Exit search' : 'Search labels'}>
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
                  label={`${labels.length} label${labels.length !== 1 ? 's' : ''}`}
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

          <Zoom in={isSearching} mountOnEnter unmountOnExit>
            <div className="mb-4">
              <TextField
                id="label-search-input"
                placeholder="Search labels..."
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
          </Zoom>

          <Zoom in={!isSearching}>
            <div className="mb-5">
              <div className="mb-2 flex flex-col gap-2 sm:flex-row">
                <TextField
                  label="Label Key"
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
                  label="Label Value"
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
                  Add
                </Button>
              </div>
              <Typography variant="caption" style={{ color: colors.textSecondary }}>
                Tip: Press{' '}
                <span
                  style={{
                    fontFamily: 'monospace',
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    padding: '1px 4px',
                    borderRadius: '2px',
                  }}
                >
                  Enter
                </span>{' '}
                to move between fields, or double-click labels to edit them
              </Typography>
            </div>
          </Zoom>

          <Divider style={{ backgroundColor: colors.border, margin: '16px 0' }} />

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
                                  ? 'Default label - Cannot be modified'
                                  : 'Used in binding policy - Cannot be modified'
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
                                placeholder="Label key"
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
                                placeholder="Label value"
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

                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <Tooltip title="Save changes">
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
                              <Tooltip title="Cancel editing">
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
                                <Tooltip title="Edit label">
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
                                <Tooltip title="Delete label">
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
                  {labelSearch ? 'No matching labels found' : 'No labels added yet'}
                </Typography>
                <Typography
                  variant="caption"
                  style={{ color: colors.textSecondary, maxWidth: '300px', margin: '0 auto' }}
                >
                  {labelSearch
                    ? 'Try a different search term or clear the search'
                    : 'Add your first label using the fields above to help organize this cluster.'}
                </Typography>

                {labelSearch && (
                  <Button
                    size="small"
                    variant="text"
                    style={{ color: colors.primary, marginTop: '12px' }}
                    onClick={() => setLabelSearch('')}
                  >
                    Clear Search
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
        <Button
          onClick={onClose}
          style={{
            color: colors.textSecondary,
          }}
          variant="text"
          startIcon={<CloseIcon />}
          disabled={saving}
        >
          Cancel
        </Button>

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
          {saving ? 'Saving...' : editingIndex !== null ? 'Finish Editing' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Select Cluster Dialog Component
export const SelectClusterDialog: React.FC<SelectClusterDialogProps> = ({
  open,
  onClose,
  clusters,
  onSelectCluster,
  onSelectClusters,
  isDark,
  colors,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [bulkSelectMode, setBulkSelectMode] = useState(false);

  // Reset selections when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedItems({});
      setBulkSelectMode(false);
      setSearchTerm('');
    }
  }, [open]);

  const filteredClusters = searchTerm
    ? clusters.filter(
        cluster =>
          cluster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          Object.entries(cluster.labels || {}).some(
            ([key, value]) =>
              key.toLowerCase().includes(searchTerm.toLowerCase()) ||
              value.toLowerCase().includes(searchTerm.toLowerCase())
          )
      )
    : clusters;

  const toggleItemSelection = (cluster: ManagedCluster) => {
    setSelectedItems(prev => ({
      ...prev,
      [cluster.name]: !prev[cluster.name],
    }));
  };

  const toggleBulkSelectMode = () => {
    setBulkSelectMode(!bulkSelectMode);
    if (!bulkSelectMode) {
      // When entering bulk mode, clear any existing selections
      setSelectedItems({});
    }
  };

  const getSelectedClusters = () => {
    return clusters.filter(cluster => selectedItems[cluster.name]);
  };

  const selectedCount = Object.values(selectedItems).filter(Boolean).length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
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
          <Typography variant="h6" component="span">
            {bulkSelectMode ? 'Select Multiple Clusters' : 'Select Cluster to Edit'}
          </Typography>
        </div>
        <IconButton onClick={onClose} size="small" style={{ color: colors.textSecondary }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent style={{ padding: '16px 24px' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <FormControlLabel
            control={
              <Checkbox
                checked={bulkSelectMode}
                onChange={toggleBulkSelectMode}
                sx={{
                  color: colors.primary,
                  '&.Mui-checked': {
                    color: colors.primary,
                  },
                }}
              />
            }
            label="Bulk Edit Mode"
          />

          {bulkSelectMode && selectedCount > 0 && (
            <Chip label={`${selectedCount} selected`} color="primary" size="small" />
          )}
        </Box>

        <TextField
          placeholder="Search clusters..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          fullWidth
          variant="outlined"
          size="small"
          autoFocus
          margin="normal"
          InputProps={{
            style: { color: colors.text },
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon style={{ color: colors.primary, fontSize: '1.2rem' }} />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setSearchTerm('')}
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
            mb: 2,
          }}
        />

        <List
          sx={{
            maxHeight: '400px',
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              borderRadius: '4px',
              '&:hover': {
                background: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
              },
            },
          }}
        >
          {filteredClusters.length > 0 ? (
            filteredClusters.map(cluster => {
              const isSelected = !!selectedItems[cluster.name];

              return (
                <ListItemButton
                  key={cluster.name}
                  onClick={() => {
                    if (bulkSelectMode) {
                      toggleItemSelection(cluster);
                    } else {
                      onSelectCluster(cluster);
                    }
                  }}
                  sx={{
                    borderRadius: '8px',
                    mb: 1,
                    border: `1px solid ${colors.border}`,
                    backgroundColor: isSelected
                      ? isDark
                        ? 'rgba(47, 134, 255, 0.2)'
                        : 'rgba(47, 134, 255, 0.1)'
                      : isDark
                        ? 'rgba(47, 134, 255, 0.08)'
                        : 'rgba(47, 134, 255, 0.04)',
                    '&:hover': {
                      backgroundColor: isSelected
                        ? isDark
                          ? 'rgba(47, 134, 255, 0.25)'
                          : 'rgba(47, 134, 255, 0.15)'
                        : isDark
                          ? 'rgba(47, 134, 255, 0.15)'
                          : 'rgba(47, 134, 255, 0.08)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  {bulkSelectMode && (
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleItemSelection(cluster)}
                      onClick={e => e.stopPropagation()}
                      sx={{
                        color: colors.primary,
                        '&.Mui-checked': {
                          color: colors.primary,
                        },
                        marginRight: 1,
                        padding: 0,
                      }}
                    />
                  )}

                  <ListItemText
                    primary={cluster.name}
                    secondary={
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {Object.entries(cluster.labels || {})
                          .slice(0, 3)
                          .map(([key, value]) => (
                            <Chip
                              key={`${key}-${value}`}
                              size="small"
                              label={`${key}=${value}`}
                              sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                bgcolor: alpha(colors.primary, 0.1),
                                color: colors.primary,
                              }}
                            />
                          ))}
                        {Object.keys(cluster.labels || {}).length > 3 && (
                          <Chip
                            size="small"
                            label={`+${Object.keys(cluster.labels || {}).length - 3} more`}
                            sx={{
                              height: 20,
                              fontSize: '0.7rem',
                              bgcolor: alpha(colors.secondary, 0.1),
                              color: colors.secondary,
                            }}
                          />
                        )}
                      </Box>
                    }
                    primaryTypographyProps={{
                      style: {
                        color: colors.text,
                        fontWeight: 500,
                      },
                    }}
                    secondaryTypographyProps={{
                      style: {
                        color: colors.textSecondary,
                      },
                      component: 'div',
                    }}
                  />
                  {!bulkSelectMode && (
                    <EditIcon fontSize="small" sx={{ color: colors.primary, opacity: 0.7 }} />
                  )}
                </ListItemButton>
              );
            })
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <Typography variant="body1" sx={{ color: colors.text, fontWeight: 500, mb: 1 }}>
                No clusters found
              </Typography>
              <Typography variant="body2" sx={{ color: colors.textSecondary }}>
                {searchTerm ? 'Try a different search term' : 'No clusters available to edit'}
              </Typography>
            </Box>
          )}
        </List>
      </DialogContent>

      <DialogActions
        style={{
          padding: '16px 24px',
          borderTop: `1px solid ${colors.border}`,
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          style={{
            borderColor: colors.border,
            color: colors.textSecondary,
          }}
        >
          Cancel
        </Button>

        {bulkSelectMode && (
          <Button
            onClick={() => onSelectClusters(getSelectedClusters())}
            variant="contained"
            disabled={selectedCount === 0}
            style={{
              backgroundColor: colors.primary,
              color: colors.white,
            }}
          >
            Edit {selectedCount} Clusters
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
