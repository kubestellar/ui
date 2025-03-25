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
  Tooltip
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
  onCreateBindingPolicy?: (clusterId: string, workloadId: string, configuration?: PolicyConfiguration) => void;
  dialogMode?: boolean;
}

const HelpDialog: React.FC<{open: boolean, onClose: () => void}> = ({open, onClose}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md"
      PaperProps={{
        sx: {
          maxWidth: '600px'
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <DragIndicatorIcon sx={{ mr: 1 }} />
          <Typography variant="h6">How to Use Drag & Drop</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography paragraph>
          Follow these steps to create binding policies using the drag & drop interface:
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon><DragIndicatorIcon color="primary" /></ListItemIcon>
            <ListItemText 
              primary="1. Drag clusters and workloads" 
              secondary="Drag clusters from the left panel and workloads from the right panel onto the canvas area"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><ArrowForwardIcon color="primary" /></ListItemIcon>
            <ListItemText 
              primary="2. Create connections" 
              secondary="Click on a workload first, then click on a cluster to create a direct connection between them"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><TuneIcon color="primary" /></ListItemIcon>
            <ListItemText 
              primary="3. Configure your policy" 
              secondary="Fill in the details like name, namespace, propagation mode, and update strategy"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><SaveIcon color="primary" /></ListItemIcon>
            <ListItemText 
              primary="4. Create each policy" 
              secondary="Click 'Create Policy' to save individual connections"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon><PublishIcon color="primary" /></ListItemIcon>
            <ListItemText 
              primary="5. Deploy your policies" 
              secondary="When done creating all connections, click 'Deploy Binding Policies' to deploy all connections at once"
            />
          </ListItem>
        </List>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
          Tip: You can preview the YAML for each connection by switching to the 'Preview YAML' tab in the policy creation dialog.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">Got it</Button>
      </DialogActions>
    </Dialog>
  );
};

const PolicyDragDrop: React.FC<PolicyDragDropProps> = (props) => {
  const [helpDialogOpen, setHelpDialogOpen] = useState(props.dialogMode ? true : false);
  
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
              bgcolor: 'background.paper', 
              boxShadow: 1,
              '&:hover': {
                bgcolor: 'background.paper',
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