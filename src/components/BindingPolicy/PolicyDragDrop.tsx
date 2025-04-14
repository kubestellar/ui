import React, { useEffect, useState } from 'react';
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
  useTheme,
  FormGroup,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
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
  const [isChecked, setIsChekcked] = useState(!!localStorage.getItem("donot_show_again"));
  
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
          Follow these steps to create binding policies using the label-based drag & drop interface:
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <DragIndicatorIcon color={isDarkMode ? "info" : "primary"} />
            </ListItemIcon>
            <ListItemText 
              primary={
                <Typography sx={{ color: isDarkMode ? "rgba(255, 255, 255, 0.9)" : undefined }}>
                  1. Drag labels to the canvas
                </Typography>
              }
              secondary={
                <Typography variant="body2" sx={{ color: isDarkMode ? "rgba(255, 255, 255, 0.7)" : undefined }}>
                  Drag cluster labels from the left panel and workload labels from the right panel onto the binding policy canvas
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
                  2. Deploy your policies
                </Typography>
              }
              secondary={
                <Typography variant="body2" sx={{ color: isDarkMode ? "rgba(255, 255, 255, 0.7)" : undefined }}>
                  Click 'Deploy Binding Policies' to create and deploy binding policies that connect workloads to clusters based on the labels
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
          Tip: The label-based approach allows you to create powerful binding policies that automatically apply to all resources matching the selected labels, both now and in the future.
        </Typography>
      </DialogContent>
      <DialogActions sx={{
        bgcolor: isDarkMode ? "rgba(17, 25, 40, 0.95)" : undefined,
        borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.15)' : undefined
      }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
          <Box display="flex" alignItems="center">
          <FormGroup>
          <FormControlLabel 
            control={
            <Checkbox 
            checked={isChecked}
              onChange={(event) => setIsChekcked(event.target.checked)}
            />
            } 
            label={
            <Typography sx={{ color: isDarkMode ? "rgba(255, 255, 255, 0.9)" : undefined }}>
              Don't Show Again
            </Typography>
            }
          />
          </FormGroup>
          </Box>
            <Button 
            onClick={()=>{
            if (isChecked) {
              localStorage.setItem("donot_show_again", "true");
            } else {
              localStorage.removeItem("donot_show_again");
            }
            onClose();
          }} 
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
        </Box>
      </DialogActions>
    </Dialog>
  );
};

const PolicyDragDrop: React.FC<PolicyDragDropProps> = (props) => {
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  useEffect(() => {
    const donot_show_again = !!localStorage.getItem("donot_show_again");
    if (donot_show_again) {
      setHelpDialogOpen(false);
    }  else {
      setHelpDialogOpen(true);
    }
  }, []);
  
  
  return (
    <Box sx={{ position: 'relative',height:"100%" }}>
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