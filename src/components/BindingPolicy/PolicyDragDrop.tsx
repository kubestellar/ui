import React, { useState } from 'react';
import { BindingPolicyInfo, Workload, ManagedCluster } from '../../types/bindingPolicy';
import { PolicyConfiguration } from './ConfigurationSidebar';
import PolicyDragDropContainer from './PolicyDragDropContainer';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TuneIcon from '@mui/icons-material/Tune';
import SaveIcon from '@mui/icons-material/Save';
import PublishIcon from '@mui/icons-material/Publish';

interface PolicyDragDropProps {
  policies?: BindingPolicyInfo[];
  clusters?: ManagedCluster[];
  workloads?: Workload[];
  onPolicyAssign?: (policyName: string, targetType: 'cluster' | 'workload', targetName: string) => void;
  onCreateBindingPolicy?: (clusterIds: string[], workloadIds: string[], configuration?: PolicyConfiguration) => void;
  dialogMode?: boolean;
}

const HelpDialog: React.FC<{open: boolean, onClose: () => void}> = ({open, onClose}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md"
      PaperProps={{
        sx: {
          maxWidth: '600px',
          bgcolor: isDarkMode ? "rgba(17, 25, 40, 0.95)" : undefined,
          color: isDarkMode ? "#FFFFFF" : undefined,
          border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.15)' : undefined,
          backdropFilter: 'blur(10px)'
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <DragIndicatorIcon sx={{ 
            mr: 1,
            color: isDarkMode ? "rgba(255, 255, 255, 0.9)" : undefined 
          }} />
          <Typography variant="h6" sx={{ 
            color: isDarkMode ? "rgba(255, 255, 255, 0.9)" : undefined 
          }}>
            How to Use Drag & Drop
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography paragraph sx={{ 
          color: isDarkMode ? "rgba(255, 255, 255, 0.9)" : undefined 
        }}>
          Follow these steps to create binding policies using the drag & drop interface:
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <DragIndicatorIcon color={isDarkMode ? "info" : "primary"} />
            </ListItemIcon>
            <ListItemText 
              primary={
                <Typography sx={{ color: isDarkMode ? "rgba(255, 255, 255, 0.9)" : undefined }}>
                  1. Drag clusters and workloads
                </Typography>
              }
              secondary={
                <Typography variant="body2" sx={{ color: isDarkMode ? "rgba(255, 255, 255, 0.7)" : undefined }}>
                  Drag clusters from the left panel and workloads from the right panel onto the canvas area
                </Typography>
              }
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <ArrowForwardIcon color={isDarkMode ? "info" : "primary"} />
            </ListItemIcon>
            <ListItemText 
              primary={
                <Typography sx={{ color: isDarkMode ? "rgba(255, 255, 255, 0.9)" : undefined }}>
                  2. Create connections
                </Typography>
              }
              secondary={
                <Typography variant="body2" sx={{ color: isDarkMode ? "rgba(255, 255, 255, 0.7)" : undefined }}>
                  Click on a workload first, then click on a cluster to create a direct connection between them
                </Typography>
              }
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <TuneIcon color={isDarkMode ? "info" : "primary"} />
            </ListItemIcon>
            <ListItemText 
              primary={
                <Typography sx={{ color: isDarkMode ? "rgba(255, 255, 255, 0.9)" : undefined }}>
                  3. Configure your policy
                </Typography>
              }
              secondary={
                <Typography variant="body2" sx={{ color: isDarkMode ? "rgba(255, 255, 255, 0.7)" : undefined }}>
                  Fill in the details like name, namespace, propagation mode, and update strategy
                </Typography>
              }
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <SaveIcon color={isDarkMode ? "info" : "primary"} />
            </ListItemIcon>
            <ListItemText 
              primary={
                <Typography sx={{ color: isDarkMode ? "rgba(255, 255, 255, 0.9)" : undefined }}>
                  4. Create each policy
                </Typography>
              }
              secondary={
                <Typography variant="body2" sx={{ color: isDarkMode ? "rgba(255, 255, 255, 0.7)" : undefined }}>
                  Click 'Create Policy' to save individual connections
                </Typography>
              }
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <PublishIcon color={isDarkMode ? "info" : "primary"} />
            </ListItemIcon>
            <ListItemText 
              primary={
                <Typography sx={{ color: isDarkMode ? "rgba(255, 255, 255, 0.9)" : undefined }}>
                  5. Deploy your policies
                </Typography>
              }
              secondary={
                <Typography variant="body2" sx={{ color: isDarkMode ? "rgba(255, 255, 255, 0.7)" : undefined }}>
                  When done creating all connections, click 'Deploy Binding Policies' to deploy all connections at once
                </Typography>
              }
            />
          </ListItem>
        </List>
        <Typography 
          variant="body2" 
          sx={{ 
            mt: 2, 
            fontStyle: 'italic',
            color: isDarkMode ? "rgba(255, 255, 255, 0.7)" : "text.secondary"
          }}
        >
          Tip: You can preview the YAML for each connection by switching to the 'Preview YAML' tab in the policy creation dialog.
        </Typography>
      </DialogContent>
      <DialogActions sx={{
        bgcolor: isDarkMode ? "rgba(17, 25, 40, 0.95)" : undefined,
        borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.15)' : undefined
      }}>
        <Button 
          onClick={onClose} 
          variant="contained"
          sx={{
            bgcolor: isDarkMode ? "#2563eb" : undefined,
            color: isDarkMode ? "#FFFFFF" : undefined,
            '&:hover': {
              bgcolor: isDarkMode ? "#1d4ed8" : undefined,
            }
          }}
        >
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const PolicyDragDrop: React.FC<PolicyDragDropProps> = (props) => {
  const [helpDialogOpen, setHelpDialogOpen] = useState(props.dialogMode ? true : false);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  return (
    <Box sx={{ position: 'relative' }}>
      <Box sx={{ 
        position: 'fixed', 
        top: 40, 
        right: 110, 
        zIndex: 10 
      }}>
        <Tooltip title="View drag & drop instructions">
          <IconButton 
            onClick={() => setHelpDialogOpen(true)} 
            size="small"
            sx={{ 
              bgcolor: isDarkMode ? "rgba(17, 25, 40, 0.95)" : 'background.paper',
              color: isDarkMode ? "rgba(255, 255, 255, 0.9)" : undefined,
              boxShadow: isDarkMode ? '0 2px 8px rgba(0, 0, 0, 0.3)' : 1,
              border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
              '&:hover': {
                bgcolor: isDarkMode ? "rgba(30, 41, 59, 0.95)" : 'background.paper',
              }
            }}
          >
            <HelpOutlineIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      <PolicyDragDropContainer {...props} />
      
      <HelpDialog 
        open={helpDialogOpen} 
        onClose={() => setHelpDialogOpen(false)} 
      />
    </Box>
  );
};

export default React.memo(PolicyDragDrop);