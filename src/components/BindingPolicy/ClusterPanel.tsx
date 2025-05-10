import React, { useState, useRef, useEffect, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Paper, 
  Divider,
  alpha,
  Chip,
  Tooltip,
  Button,
  InputBase,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Zoom,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  useTheme as useMuiTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import LabelIcon from '@mui/icons-material/Label';
import { Tag, Tags } from 'lucide-react';
import { ManagedCluster } from '../../types/bindingPolicy';
import { useNavigate } from 'react-router-dom';
import { usePolicyDragDropStore } from '../../stores/policyDragDropStore';
import { useClusterQueries } from '../../hooks/queries/useClusterQueries';
import { toast } from 'react-hot-toast';
import { BsTagFill } from "react-icons/bs";
import useTheme from "../../stores/themeStore";

interface ClusterPanelProps {
  clusters: ManagedCluster[];
  loading: boolean;
  error?: string;
  compact?: boolean;
  filteredLabelKeys?: string[];
  onItemClick?: (clusterId: string) => void;
}

// Group representing a unique label key+value with clusters that share it
interface LabelGroup {
  key: string;
  value: string;
  clusters: Array<{
    name: string;
  }>;
}

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
  onSave: (clusterName: string, contextName: string, labels: { [key: string]: string }) => void;
  isDark: boolean;
  colors: ColorTheme;
}

interface SelectClusterDialogProps {
  open: boolean;
  onClose: () => void;
  clusters: ManagedCluster[];
  onSelectCluster: (cluster: ManagedCluster) => void;
  isDark: boolean;
  colors: ColorTheme;
}

const DEFAULT_FILTERED_LABEL_KEYS = [
  'open-cluster-management',
  'kubernetes.io',
  'k8s.io'
];

// LabelEditDialog component adapted from ClustersTable.tsx
const LabelEditDialog: React.FC<LabelEditDialogProps> = ({ 
  open, 
  onClose, 
  cluster, 
  onSave,
  isDark,
  colors
}) => {
  const [labels, setLabels] = useState<Array<{ key: string; value: string }>>([]);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [labelSearch, setLabelSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedLabelIndex, setSelectedLabelIndex] = useState<number | null>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);

  // Filter labels based on search
  const filteredLabels = labelSearch.trim() === "" 
    ? labels 
    : labels.filter(label => 
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
      
      // Reset other states
      setNewKey("");
      setNewValue("");
      setLabelSearch("");
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
      // Check for duplicates
      const isDuplicate = labels.some(label => label.key === newKey.trim());
      
      if (isDuplicate) {
        // Update existing label with same key
        setLabels(labels.map(label => 
          label.key === newKey.trim() 
            ? { ...label, value: newValue.trim() } 
            : label
        ));
        toast.success(`Updated existing label: ${newKey}`);
      } else {
        // Add new label with animation effect
        setLabels(prev => [...prev, { key: newKey.trim(), value: newValue.trim() }]);
        toast.success(`Added new label: ${newKey}`);
      }
      
      // Clear inputs and refocus key input
      setNewKey("");
      setNewValue("");
      if (keyInputRef.current) {
        keyInputRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent) => {
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
      setNewKey("");
      setNewValue("");
      if (keyInputRef.current) {
        keyInputRef.current.focus();
      }
    }
  };

  const handleRemoveLabel = (index: number) => {
    const labelToRemove = labels[index];
    setLabels(labels.filter((_, i) => i !== index));
    toast.success(`Removed label: ${labelToRemove.key}`);
  };

  const handleSave = () => {
    if (!cluster) return;
    
    setSaving(true);
    
    // Convert array back to object format
    const labelObject: { [key: string]: string } = {};
    labels.forEach(({ key, value }) => {
      labelObject[key] = value;
    });
    
    // Add a slight delay to show loading state
    setTimeout(() => {
      onSave(cluster.name, cluster.context || 'default', labelObject);
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
      setLabelSearch("");
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
        }
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
            Edit Labels for <span style={{ fontWeight: 'bold' }}>{cluster?.name}</span>
          </Typography>
        </div>
        <IconButton onClick={onClose} size="small" style={{ color: colors.textSecondary }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      
      <DialogContent style={{ padding: '24px' }}>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Typography variant="body2" style={{ color: colors.textSecondary }}>
              Add or remove labels to organize and categorize your cluster.
            </Typography>
            
            <div className="flex gap-2">
              <Tooltip title={isSearching ? "Exit search" : "Search labels"}>
                <IconButton 
                  size="small" 
                  onClick={toggleSearchMode}
                  style={{ 
                    color: isSearching ? colors.primary : colors.textSecondary,
                    backgroundColor: isSearching ? (isDark ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)') : 'transparent',
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
                    backgroundColor: isDark ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.1)',
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
                onChange={(e) => setLabelSearch(e.target.value)}
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
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    "& fieldset": { borderColor: colors.border },
                    "&:hover fieldset": { borderColor: colors.primaryLight },
                    "&.Mui-focused fieldset": { borderColor: colors.primary },
                  },
                }}
              />
            </div>
          </Zoom>
          
          <Zoom in={!isSearching}>
            <div className="mb-5">
              <div className="flex flex-col sm:flex-row gap-2 mb-2">
                <TextField
                  label="Label Key"
                  placeholder="e.g. environment"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  inputRef={keyInputRef}
                  onKeyDown={handleKeyDown}
                  fullWidth
                  variant="outlined"
                  size="small"
                  autoComplete="off"
                  InputProps={{
                    style: { color: colors.text }
                  }}
                  InputLabelProps={{
                    style: { color: colors.textSecondary },
                    shrink: true,
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: colors.border },
                      "&:hover fieldset": { borderColor: colors.primaryLight },
                      "&.Mui-focused fieldset": { borderColor: colors.primary },
                    },
                  }}
                />
                <TextField
                  label="Label Value"
                  placeholder="e.g. production"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  inputRef={valueInputRef}
                  onKeyDown={handleKeyDown}
                  fullWidth
                  variant="outlined"
                  size="small"
                  autoComplete="off"
                  InputProps={{
                    style: { color: colors.text }
                  }}
                  InputLabelProps={{
                    style: { color: colors.textSecondary },
                    shrink: true,
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: colors.border },
                      "&:hover fieldset": { borderColor: colors.primaryLight },
                      "&.Mui-focused fieldset": { borderColor: colors.primary },
                    },
                  }}
                />
                <Button 
                  onClick={handleAddLabel}
                  variant="contained"
                  disabled={!newKey.trim() || !newValue.trim()}
                  startIcon={<AddIcon />}
                  style={{ 
                    backgroundColor: (!newKey.trim() || !newValue.trim()) ? colors.disabled : colors.primary,
                    color: colors.white,
                    minWidth: '100px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Add
                </Button>
              </div>
              <Typography variant="caption" style={{ color: colors.textSecondary }}>
                Tip: Press <span style={{ fontFamily: 'monospace', backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)', padding: '1px 4px', borderRadius: '2px' }}>Enter</span> to move between fields or add a label
              </Typography>
            </div>
          </Zoom>

          <Divider style={{ backgroundColor: colors.border, margin: '16px 0' }} />
          
          <div className="max-h-60 overflow-y-auto pr-1">
            {filteredLabels.length > 0 ? (
              <div className="space-y-2">
                {filteredLabels.map((label, index) => (
                  <Zoom in={true} style={{ transitionDelay: `${index * 25}ms` }} key={`${label.key}-${index}`}>
                    <div 
                      className={`flex items-center justify-between gap-2 p-2 rounded transition-all duration-200 ${selectedLabelIndex === index ? 'ring-1' : ''}`} 
                      style={{ 
                        backgroundColor: selectedLabelIndex === index 
                          ? (isDark ? 'rgba(47, 134, 255, 0.2)' : 'rgba(47, 134, 255, 0.1)') 
                          : (isDark ? 'rgba(47, 134, 255, 0.1)' : 'rgba(47, 134, 255, 0.05)'),
                        border: `1px solid ${selectedLabelIndex === index ? colors.primary : colors.border}`,
                        boxShadow: selectedLabelIndex === index 
                          ? (isDark ? '0 0 0 1px rgba(47, 134, 255, 0.4)' : '0 0 0 1px rgba(47, 134, 255, 0.2)')
                          : 'none',
                        cursor: 'default',
                      }} 
                      onClick={() => setSelectedLabelIndex(selectedLabelIndex === index ? null : index)}
                    >
                      <div className="flex items-center gap-2">
                        <Tag size={16} style={{ color: colors.primary }} />
                        <span style={{ color: colors.text }}>
                          <span style={{ fontWeight: 500 }}>{label.key}</span>
                          <span style={{ color: colors.textSecondary }}> = </span>
                          <span>{label.value}</span>
                        </span>
                      </div>
                      <Tooltip title="Remove Label">
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveLabel(labels.findIndex(l => l.key === label.key && l.value === label.value));
                          }}
                          style={{ 
                            color: selectedLabelIndex === index ? colors.primary : colors.textSecondary,
                            opacity: 0.8,
                            transition: 'all 0.2s ease',
                          }}
                          className="hover:opacity-100"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </Zoom>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6 mt-2">
                <Tags size={28} style={{ color: colors.textSecondary, marginBottom: '12px' }} />
                <Typography variant="body2" style={{ color: colors.text, fontWeight: 500, marginBottom: '4px' }}>
                  {labelSearch ? "No matching labels found" : "No labels added yet"}
                </Typography>
                <Typography variant="caption" style={{ color: colors.textSecondary, maxWidth: '300px', margin: '0 auto' }}>
                  {labelSearch 
                    ? "Try a different search term or clear the search"
                    : "Add your first label using the fields above to help organize this cluster."
                  }
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
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          style={{ 
            backgroundColor: colors.primary,
            color: colors.white,
            minWidth: '120px',
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Select Cluster Dialog Component
const SelectClusterDialog: React.FC<SelectClusterDialogProps> = ({
  open,
  onClose,
  clusters,
  onSelectCluster,
  isDark,
  colors
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredClusters = searchTerm 
    ? clusters.filter(cluster => 
        cluster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Object.entries(cluster.labels || {}).some(
          ([key, value]) => 
            key.toLowerCase().includes(searchTerm.toLowerCase()) || 
            value.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : clusters;

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
        }
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
            Select Cluster to Edit
          </Typography>
        </div>
        <IconButton onClick={onClose} size="small" style={{ color: colors.textSecondary }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      
      <DialogContent style={{ padding: '16px 24px' }}>
        <TextField
          placeholder="Search clusters..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
            "& .MuiOutlinedInput-root": {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
              "& fieldset": { borderColor: colors.border },
              "&:hover fieldset": { borderColor: colors.primaryLight },
              "&.Mui-focused fieldset": { borderColor: colors.primary },
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
            filteredClusters.map((cluster) => (
              <ListItemButton
                key={cluster.name}
                onClick={() => onSelectCluster(cluster)}
                sx={{
                  borderRadius: '8px',
                  mb: 1,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: isDark ? 'rgba(47, 134, 255, 0.08)' : 'rgba(47, 134, 255, 0.04)',
                  '&:hover': {
                    backgroundColor: isDark ? 'rgba(47, 134, 255, 0.15)' : 'rgba(47, 134, 255, 0.08)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                <ListItemText 
                  primary={cluster.name} 
                  secondary={
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                      {Object.entries(cluster.labels || {}).slice(0, 3).map(([key, value]) => (
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
                    }
                  }}
                  secondaryTypographyProps={{
                    style: { 
                      color: colors.textSecondary,
                    },
                    component: 'div'
                  }}
                />
                <EditIcon fontSize="small" sx={{ color: colors.primary, opacity: 0.7 }} />
              </ListItemButton>
            ))
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
          style={{ 
            color: colors.textSecondary,
          }}
          variant="text"
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const ClusterPanel: React.FC<ClusterPanelProps> = ({
  clusters,
  loading,
  error,
  compact = false,
  filteredLabelKeys = DEFAULT_FILTERED_LABEL_KEYS,
  onItemClick
}) => {
  const muiTheme = useMuiTheme(); // Keep MUI theme for certain MUI component props
  const theme = useTheme((state) => state.theme); // Get custom theme state (dark/light)
  const navigate = useNavigate();
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<ManagedCluster | null>(null);
  const [loadingClusterEdit, setLoadingClusterEdit] = useState<string | null>(null);
  const [selectClusterDialogOpen, setSelectClusterDialogOpen] = useState(false);
  
  const DEFAULT_CONTEXT = 'its1';
  
  const isDarkTheme = theme === "dark";
  const { useUpdateClusterLabels } = useClusterQueries();
  const updateLabelsMutation = useUpdateClusterLabels();

  const handleImportClusters = () => {
    navigate('/its');
  };

  const handleAddLabels = () => {
    if (clusters.length > 0) {
      // Open the select cluster dialog instead of auto-selecting the first cluster
      setSelectClusterDialogOpen(true);
    } else {
      toast.error('No clusters available to edit');
    }
  };

  const handleEditSpecificCluster = (cluster: ManagedCluster) => {
    console.log('ClusterPanel - handleEditSpecificCluster - cluster:', cluster);
    console.log('ClusterPanel - handleEditSpecificCluster - cluster.context:', cluster.context);
    
    // Log all cluster contexts for debugging
    logClusterContexts();
    
    // Clone the cluster object and ensure it has a valid context
    // Use the cluster's original context if available, or fall back to the default context
    const clusterWithContext = {
      ...cluster,
      context: cluster.context || DEFAULT_CONTEXT
    };
    
    setSelectedCluster(clusterWithContext);
    setEditDialogOpen(true);
    setSelectClusterDialogOpen(false);
  };

  // Debug function to log all cluster contexts
  const logClusterContexts = () => {
    console.log('ClusterPanel - Available clusters:');
    clusters.forEach(c => {
      console.log(`Cluster: ${c.name}, Context: ${c.context || 'undefined'}`);
    });
  };

  const handleSaveLabels = (clusterName: string, contextName: string, labels: { [key: string]: string }) => {
    setLoadingClusterEdit(clusterName);
    
    console.log('ClusterPanel - handleSaveLabels - clusterName:', clusterName);
    console.log('ClusterPanel - handleSaveLabels - contextName:', contextName);
    
    // Make sure the context is properly set in the mutation request
    // Use the provided context or fall back to the default context if not provided
    updateLabelsMutation.mutate(
      { 
        contextName: contextName || DEFAULT_CONTEXT,
        clusterName, 
        labels
      },
      {
        onSuccess: () => {
          toast.success("Labels updated successfully", {
            icon: '🏷️',
            style: {
              borderRadius: '10px',
              background: isDarkTheme ? '#1e293b' : '#ffffff',
              color: isDarkTheme ? '#f1f5f9' : '#1e293b',
              border: `1px solid ${isDarkTheme ? '#334155' : '#e2e8f0'}`,
            },
          });
          setLoadingClusterEdit(null);
        },
          onError: (error: Error) => {
          toast.error("Failed to update labels", {
            icon: '❌',
            style: {
              borderRadius: '10px',
              background: isDarkTheme ? '#1e293b' : '#ffffff',
              color: isDarkTheme ? '#f1f5f9' : '#1e293b',
              border: `1px solid ${isDarkTheme ? '#334155' : '#e2e8f0'}`,
            },
          });
          console.error("Error updating cluster labels:", error);
          setLoadingClusterEdit(null);
        }
      }
    );
  };

  // Colors for theming the LabelEditDialog
  const colors = {
    primary: muiTheme.palette.primary.main,
    primaryLight: muiTheme.palette.primary.light,
    primaryDark: muiTheme.palette.primary.dark,
    secondary: muiTheme.palette.secondary.main,
    white: "#ffffff",
    background: isDarkTheme ? "#0f172a" : "#ffffff",
    paper: isDarkTheme ? "#1e293b" : "#f8fafc",
    text: isDarkTheme ? "#f1f5f9" : "#1e293b",
    textSecondary: isDarkTheme ? "#94a3b8" : "#64748b",
    border: isDarkTheme ? "#334155" : "#e2e8f0",
    success: "#67c073",
    warning: "#ffb347",
    error: "#ff6b6b",
    disabled: isDarkTheme ? "#475569" : "#94a3b8",
  };

  // Extract unique labels from clusters
  const uniqueLabels = React.useMemo(() => {
    const labelMap: Record<string, LabelGroup> = {};
    
    clusters.forEach(cluster => {
      if (cluster.labels && Object.keys(cluster.labels).length > 0) {
        Object.entries(cluster.labels).forEach(([key, value]) => {
          if (filteredLabelKeys.some(pattern => key.includes(pattern))) return;
          
          const labelId = `${key}:${value}`;
          
          if (!labelMap[labelId]) {
            labelMap[labelId] = {
              key,
              value,
              clusters: []
            };
          }
          
          if (!labelMap[labelId].clusters.some(c => c.name === cluster.name)) {
            labelMap[labelId].clusters.push({
              name: cluster.name
            });
          }
        });
      }
    });
    
    return Object.values(labelMap);
  }, [clusters, filteredLabelKeys]);

  // Filter labels based on search term
  const filteredLabels = React.useMemo(() => {
    if (!searchTerm) return uniqueLabels;
    
    return uniqueLabels.filter(label => 
      label.key.toLowerCase().includes(searchTerm.toLowerCase()) || 
      label.value.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [uniqueLabels, searchTerm]);

  const renderLabelItem = (labelGroup: LabelGroup) => {
    const firstCluster = labelGroup.clusters[0];
    
    // Format: label-{key}-{value} or label-{key}:{value} if it's a simple label
    let itemId = '';
    
    // Special handling for common labels we know are important
    if (labelGroup.key === 'location-group' && labelGroup.value === 'edge') {
      itemId = 'label-location-group:edge';
    } else if (labelGroup.key.includes('/')) {
      itemId = `label-${labelGroup.key}-${labelGroup.value}`;
    } else {
      itemId = `label-${labelGroup.key}:${labelGroup.value}`;
    }
    
    // Check if this item is in the canvas
    const { canvasEntities } = usePolicyDragDropStore.getState();
    const isInCanvas = canvasEntities.clusters.includes(itemId);

    // Find the full cluster objects for each cluster in this label group
    const clusterObjects = labelGroup.clusters.map(c => 
      clusters.find(cluster => cluster.name === c.name)
    ).filter((c): c is ManagedCluster => c !== undefined);
    
    return (
      <Box
        key={`${labelGroup.key}:${labelGroup.value}`}
        onClick={() => {
          if (onItemClick) {
            if (isInCanvas) {
              console.log(`⚠️ Cluster ${itemId} is already in the canvas`);
              return;
            }
            
            onItemClick(itemId);
          }
        }}
        sx={{
          p: 1,
          m: compact ? 0.5 : 1,
          borderRadius: 1,
          backgroundColor: isDarkTheme ? 'rgba(30, 41, 59, 0.8)' : muiTheme.palette.background.paper,
          border: `1px solid ${isDarkTheme ? 'rgba(255, 255, 255, 0.12)' : muiTheme.palette.divider}`,
          boxShadow: 0,
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.2s ease',
          "&:hover": {
            backgroundColor: isDarkTheme 
              ? 'rgba(30, 41, 59, 0.95)' 
              : alpha(muiTheme.palette.primary.main, 0.1),
            boxShadow: 2,
            transform: 'translateY(-2px)',
          },
        }}
      >
       {/* Position cluster count chip and edit button in absolute position */}
       <Box sx={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 0.5 }}>
          <Tooltip title="Edit clusters with this label">
            <IconButton 
              size="small" 
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering the box click
                
                if (clusterObjects.length === 1) {
                  // If only one cluster, edit it directly
                  handleEditSpecificCluster(clusterObjects[0]);
                } else if (clusterObjects.length > 0) {
                  // If multiple clusters, open the select dialog with filtered clusters
                  setSelectClusterDialogOpen(true);
                }
              }}
              sx={{ 
                p: 0.5, 
                bgcolor: isDarkTheme
                  ? alpha(muiTheme.palette.primary.main, 0.2)
                  : alpha(muiTheme.palette.primary.main, 0.1),
                color: isDarkTheme
                  ? muiTheme.palette.primary.light
                  : muiTheme.palette.primary.main,
                '&:hover': {
                  bgcolor: isDarkTheme
                    ? alpha(muiTheme.palette.primary.main, 0.3)
                    : alpha(muiTheme.palette.primary.main, 0.2),
                } 
              }}
            >
              <EditIcon sx={{ fontSize: '0.9rem' }} />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={`${labelGroup.clusters.length} cluster(s)`}>
            <Chip 
              size="small" 
              label={`${labelGroup.clusters.length}`}
              sx={{ 
                fontSize: '0.8rem',
                height: 16,
                '& .MuiChip-label': { px: 0.5 },
                bgcolor: isDarkTheme
                  ? alpha(muiTheme.palette.info.main, 0.2)
                  : alpha(muiTheme.palette.info.main, 0.1),
                color: isDarkTheme
                  ? muiTheme.palette.info.light
                  : muiTheme.palette.info.main,
              }}
            />
          </Tooltip>
        </Box>
        
         {/* Label value */}
         <Box sx={{ mt: 0.5 }}>
          <Chip
            size="small"
            label={`${labelGroup.key} = ${labelGroup.value}`}
            sx={{ 
              fontSize: '1rem',
              height: 20,
              '& .MuiChip-label': { 
                px: 0.75,
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              },
              bgcolor: isDarkTheme
                ? alpha(muiTheme.palette.primary.main, 0.2)
                : alpha(muiTheme.palette.primary.main, 0.1),
              color: isDarkTheme
                ? muiTheme.palette.primary.light
                : muiTheme.palette.primary.main,
            }}
          />
        </Box>
     {/* Cluster summary with edit buttons */}
     <Box sx={{ mt: 0.5 }}>
          <Tooltip 
            title={
              <React.Fragment>
                <Typography variant="caption" sx={{ fontWeight: 'bold' }} component="div">Clusters:</Typography>
                <List 
                  dense 
                  sx={{ 
                    m: 0, 
                    p: 0, 
                    pl: 1, 
                    maxHeight: '150px', 
                    overflow: 'auto',
                    '&::-webkit-scrollbar': { width: '4px' },
                    '&::-webkit-scrollbar-thumb': { 
                      background: isDarkTheme 
                        ? alpha('#ffffff', 0.2)
                        : alpha('#000000', 0.2),
                      borderRadius: '4px' 
                    }
                  }}
                >
                  {clusterObjects.map(cluster => (
                    <ListItem 
                      key={cluster.name} 
                      disablePadding
                      secondaryAction={
                        <IconButton 
                          edge="end"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleEditSpecificCluster(cluster);
                          }}
                          sx={{ p: 0.5 }}
                        >
                          <EditIcon fontSize="inherit" />
                        </IconButton>
                      }
                    >
                      <ListItemText 
                        primary={cluster.name} 
                        sx={{ m: 0 }}
                        primaryTypographyProps={{ 
                          variant: 'caption',
                          component: 'div',
                          style: { 
                            display: 'block',
                            maxWidth: '180px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }
                        }} 
                      />
                    </ListItem>
                  ))}
                </List>
              </React.Fragment>
            } 
            arrow 
            placement="top"
          >
            <Typography 
              variant="caption" 
              sx={{ 
                color: isDarkTheme 
                  ? "rgba(255, 255, 255, 0.7)" 
                  : "text.secondary" 
              }}
            >
              {labelGroup.clusters.length === 1 
                ? firstCluster.name
                : labelGroup.clusters.length <= 2
                  ? labelGroup.clusters.map(c => c.name).join(', ')
                  : `${labelGroup.clusters.slice(0, 2).map(c => c.name).join(', ')} +${labelGroup.clusters.length - 2} more`}
            </Typography>
          </Tooltip>
        </Box>
        
        {isInCanvas && (
          <CheckCircleIcon 
            sx={{ 
              position: 'absolute',
              bottom: 4,
              right: 4,
              fontSize: '1.2rem',
              color: muiTheme.palette.success.main,
              backgroundColor: isDarkTheme 
                ? 'rgba(17, 25, 40, 0.8)'
                : alpha(muiTheme.palette.background.paper, 0.7),
              borderRadius: '50%'
            }}
          />
        )}
      </Box>
    );
  };

  return (
    <Paper 
      elevation={2}
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: 2,
        backgroundColor: isDarkTheme ? "rgba(17, 25, 40, 0.8)" : muiTheme.palette.background.paper,
        border: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Box 
        sx={{ 
          p: compact ? 1 : 2, 
          backgroundColor: isDarkTheme 
            ? "rgba(37, 99, 235, 0.9)" 
            : muiTheme.palette.primary.main, 
          color: 'white', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: isDarkTheme 
            ? '1px solid rgba(255, 255, 255, 0.15)' 
            : 'none',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          {showSearch ? (
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                bgcolor: alpha(muiTheme.palette.common.white, 0.15),
                borderRadius: 1,
                px: 1,
                flexGrow: 1,
                mr: 1
              }}
            >
              <InputBase
                placeholder="Search labels..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ 
                  color: 'white', 
                  flexGrow: 1,
                  '& .MuiInputBase-input': {
                    py: 0.5,
                  }
                }}
                autoFocus
              />
              <IconButton 
                size="small" 
                onClick={() => {
                  setSearchTerm("");
                  setShowSearch(false);
                }} 
                sx={{ 
                  color: 'white', 
                  p: 0.25,
                  '&:hover': {
                    backgroundColor: isDarkTheme 
                      ? 'rgba(255, 255, 255, 0.15)' 
                      : 'rgba(255, 255, 255, 0.25)'
                  }
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ) : (
            <Typography variant={compact ? "subtitle1" : "h6"}>
              Clusters 
            </Typography>
          )}
          {!showSearch && !compact && (
            <IconButton 
              size="small" 
              sx={{ 
                ml: 1, 
                color: 'white',
                '&:hover': {
                  backgroundColor: isDarkTheme 
                    ? 'rgba(255, 255, 255, 0.15)' 
                    : 'rgba(255, 255, 255, 0.25)'
                }
              }}
              onClick={() => setShowSearch(true)}
            >
              <SearchIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
        {!compact && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              endIcon={<BsTagFill />}
              onClick={handleAddLabels}
              size="small"
              sx={{ 
                bgcolor: 'white', 
                color: isDarkTheme 
                  ? "rgba(37, 99, 235, 0.9)"
                  : muiTheme.palette.primary.main,
                transition: 'all 0.2s ease',
                "&:hover": {
                  bgcolor: alpha(muiTheme.palette.common.white, 0.9),
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                },
              }}
            >
              Add
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleImportClusters}
              size="small"
              sx={{ 
                bgcolor: 'white', 
                color: isDarkTheme 
                  ? "rgba(37, 99, 235, 0.9)"
                  : muiTheme.palette.primary.main,
                transition: 'all 0.2s ease',
                "&:hover": {
                  bgcolor: alpha(muiTheme.palette.common.white, 0.9),
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                },
              }}
            >
              Import
            </Button>
          </Box>
        )}
      </Box>
  
      
      <Box sx={{ 
        p: compact ? 0.5 : 1, 
        overflow: 'auto', 
        flexGrow: 1,
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        scrollbarWidth: 'none',  
        '-ms-overflow-style': 'none',
        backgroundColor: isDarkTheme 
          ? 'rgba(17, 25, 40, 0.8)' 
          : 'transparent',
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={30} sx={{
              color: isDarkTheme ? '#60a5fa' : undefined
            }} />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ p: 2 }}>
            {error}
          </Typography>
        ) : clusters.length === 0 ? (
          <Typography
            sx={{ 
              p: 2, 
              color: isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "text.secondary", 
              textAlign: 'center' 
            }}
          >
            No cluster labels available. Please add clusters with labels to use in binding policies.
          </Typography>
        ) : (
          <Box sx={{ minHeight: '100%' }}>
            {filteredLabels.length === 0 ? (
              <Typography sx={{ 
                p: 2, 
                color: isDarkTheme ? "rgba(255, 255, 255, 0.7)" : "text.secondary", 
                textAlign: 'center' 
              }}>
                {searchTerm ? 'No labels match your search.' : 'No labels found in available clusters.'}
              </Typography>
            ) : (
              filteredLabels.map((labelGroup) => 
                renderLabelItem(labelGroup)
              )
            )}
          </Box>
        )}
      </Box>


      {/* Label Edit Dialog */}
      <LabelEditDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          if (loadingClusterEdit && selectedCluster) {
            setLoadingClusterEdit(null);
          }
        }}
        cluster={selectedCluster}
        onSave={handleSaveLabels}
        isDark={isDarkTheme}
        colors={colors}
      />

      {/* Select Cluster Dialog */}
      <SelectClusterDialog
        open={selectClusterDialogOpen}
        onClose={() => setSelectClusterDialogOpen(false)}
        clusters={clusters.map(cluster => ({
          ...cluster,
          context: cluster.context || DEFAULT_CONTEXT 
        }))}
        onSelectCluster={handleEditSpecificCluster}
        isDark={isDarkTheme}
        colors={colors}
      />
    </Paper>
  );
};

export default React.memo(ClusterPanel);