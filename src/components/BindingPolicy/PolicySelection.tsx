import React, { useEffect, useState } from 'react';
import { BindingPolicyInfo, Workload, ManagedCluster } from '../../types/bindingPolicy';
import { PolicyConfiguration } from './ConfigurationSidebar';
import PolicySelectionContainer from './PolicySelectionContainer';
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
  useTheme as useMuiTheme,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import PublishIcon from '@mui/icons-material/Publish';
import useTheme from '../../stores/themeStore';
import { useTranslation } from 'react-i18next';

interface PolicySelectionProps {
  policies?: BindingPolicyInfo[];
  clusters?: ManagedCluster[];
  workloads?: Workload[];
  onPolicyAssign?: (
    policyName: string,
    targetType: 'cluster' | 'workload',
    targetName: string
  ) => void;
  onCreateBindingPolicy?: (
    clusterIds: string[],
    workloadIds: string[],
    configuration?: PolicyConfiguration
  ) => void;
  dialogMode?: boolean;
}

const HelpDialog: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const muiTheme = useMuiTheme();
  const theme = useTheme(state => state.theme);
  const isDarkTheme = theme === 'dark'; // Use your custom theme implementation
  const [isChecked, setIsChekcked] = useState(!!localStorage.getItem('donot_show_again'));
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      PaperProps={{
        sx: {
          maxWidth: '600px',
          bgcolor: isDarkTheme ? 'rgba(17, 25, 40, 0.95)' : undefined,
          color: isDarkTheme ? '#FFFFFF' : undefined,
          border: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.15)' : undefined,
          backdropFilter: 'blur(10px)',
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <CheckBoxIcon
            sx={{
              mr: 1,
              color: isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : undefined,
            }}
          />
          <Typography
            variant="h6"
            sx={{
              color: isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : undefined,
            }}
          >
            {t('bindingPolicy.dragDrop.helpDialog.helpDialog.title')}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Typography
          paragraph
          sx={{
            color: isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : undefined,
          }}
        >
          {t('bindingPolicy.dragDrop.helpDialog.helpDialog.intro')}
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <CheckBoxIcon color={isDarkTheme ? 'info' : 'primary'} />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography sx={{ color: isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : undefined }}>
                  {t('bindingPolicy.dragDrop.helpDialog.helpDialog.steps.selectLabels')}
                </Typography>
              }
              secondary={
                <Typography
                  variant="body2"
                  sx={{ color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : undefined }}
                >
                  {t('bindingPolicy.dragDrop.helpDialog.helpDialog.steps.selectLabelsDesc')}
                </Typography>
              }
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <PublishIcon color={isDarkTheme ? 'info' : 'primary'} />
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography sx={{ color: isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : undefined }}>
                  {t('bindingPolicy.dragDrop.helpDialog.helpDialog.steps.deploy')}
                </Typography>
              }
              secondary={
                <Typography
                  variant="body2"
                  sx={{ color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : undefined }}
                >
                  {t('bindingPolicy.dragDrop.helpDialog.helpDialog.steps.deployDesc')}
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
            color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : 'text.secondary',
          }}
        >
          {t('bindingPolicy.dragDrop.helpDialog.helpDialog.tip')}
        </Typography>
      </DialogContent>
      <DialogActions
        sx={{
          bgcolor: isDarkTheme ? 'rgba(17, 25, 40, 0.95)' : undefined,
          borderTop: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.15)' : undefined,
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
          <Box display="flex" alignItems="center">
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isChecked}
                    onChange={event => setIsChekcked(event.target.checked)}
                    sx={{
                      color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : undefined,
                      '&.Mui-checked': {
                        color: isDarkTheme ? muiTheme.palette.primary.light : undefined,
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ color: isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : undefined }}>
                    {t('bindingPolicy.dragDrop.helpDialog.helpDialog.dontShowAgain')}
                  </Typography>
                }
              />
            </FormGroup>
          </Box>
          <Button
            onClick={() => {
              if (isChecked) {
                localStorage.setItem('donot_show_again', 'true');
              } else {
                localStorage.removeItem('donot_show_again');
              }
              onClose();
            }}
            variant="contained"
            sx={{
              bgcolor: isDarkTheme ? '#2563eb' : undefined,
              color: isDarkTheme ? '#FFFFFF' : undefined,
              '&:hover': {
                bgcolor: isDarkTheme ? '#1d4ed8' : undefined,
              },
            }}
          >
            {t('bindingPolicy.dragDrop.helpDialog.gotIt')}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

const PolicySelection: React.FC<PolicySelectionProps> = props => {
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);

  const theme = useTheme(state => state.theme);
  const isDarkTheme = theme === 'dark'; // Use your custom theme implementation

  useEffect(() => {
    const donot_show_again = !!localStorage.getItem('donot_show_again');
    if (donot_show_again) {
      setHelpDialogOpen(false);
    } else {
      setHelpDialogOpen(true);
    }
  }, []);
  const { t } = useTranslation();
  return (
    <Box sx={{ position: 'relative', height: '100%' }}>
      <Box
        sx={{
          position: 'fixed',
          top: 40,
          right: 110,
          zIndex: 10,
        }}
      >
        <Tooltip title={t('bindingPolicy.dragDrop.helpDialog.helpDialog.tooltip')}>
          <IconButton
            onClick={() => setHelpDialogOpen(true)}
            size="small"
            sx={{
              bgcolor: isDarkTheme ? 'rgba(17, 25, 40, 0.95)' : 'background.paper',
              color: isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : undefined,
              boxShadow: isDarkTheme ? '0 2px 8px rgba(0, 0, 0, 0.3)' : 1,
              border: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
              '&:hover': {
                bgcolor: isDarkTheme ? 'rgba(30, 41, 59, 0.95)' : 'background.paper',
              },
            }}
          >
            <HelpOutlineIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <PolicySelectionContainer {...props} />

      <HelpDialog open={helpDialogOpen} onClose={() => setHelpDialogOpen(false)} />
    </Box>
  );
};

export default React.memo(PolicySelection);
