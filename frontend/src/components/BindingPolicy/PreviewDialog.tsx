import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Tabs,
  Tab,
} from '@mui/material';
import PolicyVisualization from './PolicyVisualization';
import { BindingPolicyInfo, ManagedCluster, Workload } from '../../types/bindingPolicy';
import useTheme from '../../stores/themeStore';
import { useTranslation } from 'react-i18next';

interface PreviewDialogProps {
  open: boolean;
  onClose: () => void;
  matchedClusters: ManagedCluster[];
  matchedWorkloads: Workload[];
  policy?: BindingPolicyInfo;
}

const PreviewDialog: React.FC<PreviewDialogProps> = ({
  open,
  onClose,
  matchedClusters,
  matchedWorkloads,
  policy,
}) => {
  const [tabValue, setTabValue] = React.useState(0);
  const theme = useTheme(state => state.theme);
  const isDarkTheme = theme === 'dark';
  const { t } = useTranslation();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (!policy) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          height: '80vh',
          m: 2,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: isDarkTheme ? '#1e293b' : '#fff',
          color: isDarkTheme ? '#fff' : 'inherit',
        },
      }}
    >
      <DialogTitle>{t('bindingPolicy.previewDialog.title')}</DialogTitle>
      <DialogContent
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          '&:first-of-type': {
            pt: 2,
          },
        }}
      >
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          textColor={isDarkTheme ? 'inherit' : 'primary'}
          indicatorColor={isDarkTheme ? 'secondary' : 'primary'}
        >
          <Tab
            label={t('bindingPolicy.previewDialog.visualizationTab')}
            className={isDarkTheme ? 'text-white' : ''}
          />
          <Tab
            label={t('bindingPolicy.previewDialog.detailsTab')}
            className={isDarkTheme ? 'text-white' : ''}
          />
        </Tabs>

        <Box sx={{ mt: 2 }}>
          {tabValue === 0 && (
            <PolicyVisualization
              policy={policy}
              matchedClusters={matchedClusters}
              matchedWorkloads={matchedWorkloads}
              previewMode={true}
            />
          )}

          {tabValue === 1 && (
            <Box className={isDarkTheme ? 'text-white' : 'text-black'}>
              <Typography variant="h6" gutterBottom>
                {t('bindingPolicy.previewDialog.matchingDetails')}
              </Typography>

              <Typography variant="subtitle1" gutterBottom>
                {t('bindingPolicy.previewDialog.matchedClusters', {
                  count: matchedClusters.length,
                })}
              </Typography>
              {matchedClusters.map(cluster => (
                <Box key={cluster.name} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    {t('bindingPolicy.previewDialog.clusterStatus', {
                      name: cluster.name,
                      status: cluster.status,
                    })}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {t('bindingPolicy.previewDialog.labels', {
                      labels: JSON.stringify(cluster.labels),
                    })}
                  </Typography>
                </Box>
              ))}

              <Typography variant="subtitle1" sx={{ mt: 2 }} gutterBottom>
                {t('bindingPolicy.previewDialog.matchedWorkloads', {
                  count: matchedWorkloads.length,
                })}
              </Typography>
              {matchedWorkloads.map(workload => (
                <Box key={workload.name} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    {t('bindingPolicy.previewDialog.workloadNamespace', {
                      name: workload.name,
                      namespace: workload.namespace,
                    })}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {t('bindingPolicy.previewDialog.labels', {
                      labels: JSON.stringify(workload.labels),
                    })}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} className={isDarkTheme ? 'text-white' : ''}>
          {t('common.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PreviewDialog;
