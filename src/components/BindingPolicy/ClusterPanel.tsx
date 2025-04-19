import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  Paper, 
  Divider,
  useTheme,
  alpha,
  Chip,
  Tooltip,
  Button,
  InputBase,
  IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { ManagedCluster } from '../../types/bindingPolicy';
import KubernetesIcon from './KubernetesIcon';
import { useNavigate } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import { usePolicyDragDropStore } from '../../stores/policyDragDropStore';
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

const DEFAULT_FILTERED_LABEL_KEYS = [
  'open-cluster-management',
  'kubernetes.io',
  'k8s.io'
];

const ClusterPanel: React.FC<ClusterPanelProps> = ({
  clusters,
  loading,
  error,
  compact = false,
  filteredLabelKeys = DEFAULT_FILTERED_LABEL_KEYS,
  onItemClick
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleImportClusters = () => {
    navigate('/its');
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
    const firstCluster = labelGroup.clusters[0]; // Fix: Use clusters instead of workloads
    
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
    
    console.log(`Creating clickable label: ${itemId} for ${labelGroup.key}:${labelGroup.value}`);
    
    // Check if this item is in the canvas
    const { canvasEntities } = usePolicyDragDropStore.getState();
    const isInCanvas = canvasEntities.clusters.includes(itemId);
    
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
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: 0,
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
            cursor: 'pointer'
          },
          position: 'relative',
          cursor: 'pointer'
        }}
      >
        {/* Position cluster count chip in absolute position */}
        <Tooltip title={`${labelGroup.clusters.length} cluster(s)`}>
          <Chip 
            size="small" 
            label={`${labelGroup.clusters.length}`}
            sx={{ 
              fontSize: '0.5rem',
              height: 16,
              '& .MuiChip-label': { px: 0.5 },
              bgcolor: alpha(theme.palette.info.main, 0.1),
              color: theme.palette.info.main,
              position: 'absolute',
              top: 4,
              right: 4
            }}
          />
        </Tooltip>
        
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
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
            }}
          />
        </Box>
        
        {/* Cluster summary */}
        <Box sx={{ mt: 0.5 }}>
          <Tooltip 
            title={
              <React.Fragment>
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Clusters:</Typography>
                <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                  {labelGroup.clusters.map(c => (
                    <li key={c.name}>{c.name}</li>
                  ))}
                </ul>
              </React.Fragment>
            } 
            arrow 
            placement="top"
          >
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
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
              color: theme.palette.success.main,
              backgroundColor: alpha(theme.palette.background.paper, 0.7),
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
      }}
    >
      <Box sx={{ p: compact ? 1 : 2, backgroundColor: theme.palette.primary.main, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
          <KubernetesIcon type="cluster" size={compact ? 20 : 24} sx={{ mr: 1, color: 'white' }} />
          {showSearch ? (
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                bgcolor: alpha(theme.palette.common.white, 0.15),
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
              <IconButton size="small" onClick={() => {
                setSearchTerm("");
                setShowSearch(false);
              }} sx={{ color: 'white', p: 0.25 }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ) : (
            <Typography variant={compact ? "subtitle1" : "h6"}>Cluster Labels</Typography>
          )}
          {!showSearch && !compact && (
            <IconButton 
              size="small" 
              sx={{ ml: 1, color: 'white' }}
              onClick={() => setShowSearch(true)}
            >
              <SearchIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
        {!compact && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleImportClusters}
            size="small"
            sx={{ 
              bgcolor: 'white', 
              color: theme.palette.primary.main,
              '&:hover': {
                bgcolor: alpha(theme.palette.common.white, 0.9),
              }
            }}
          >
            Import
          </Button>
        )}
      </Box>
      <Divider />
      
      <Box sx={{ 
        p: compact ? 0.5 : 1, 
        overflow: 'auto', 
        flexGrow: 1,
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        scrollbarWidth: 'none',  
        '-ms-overflow-style': 'none',  
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={30} />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ p: 2 }}>
            {error}
          </Typography>
        ) : clusters.length === 0 ? (
          <Typography sx={{ p: 2, color: 'text.secondary', textAlign: 'center' }}>
            No cluster labels available. Please add clusters with labels to use in binding policies.
          </Typography>
        ) : (
          // Replace StrictModeDroppable with a regular Box
          <Box sx={{ minHeight: '100%' }}>
            {filteredLabels.length === 0 ? (
              <Typography sx={{ p: 2, color: 'text.secondary', textAlign: 'center' }}>
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
    </Paper>
  );
};

export default React.memo(ClusterPanel);