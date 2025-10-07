import { FC, useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Paper,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import { lazy, Suspense } from 'react';

// Lazy load Monaco Editor
const MonacoEditor = lazy(() => import('@monaco-editor/react'));
import ContentCopy from '@mui/icons-material/ContentCopy';
import useTheme from '../../../stores/themeStore';
import { PolicyDetailDialogProps } from '../../../types/bindingPolicy';
import { useBPQueries } from '../../../hooks/queries/useBPQueries';
import CancelButton from '../../common/CancelButton';
import { useTranslation } from 'react-i18next';

interface PolicyCondition {
  type: string;
  status: string;
  reason?: string;
  message?: string;
}

const PolicyDetailDialog: FC<PolicyDetailDialogProps> = ({
  open,
  onClose,
  policy,
  clusters = [],
  onEdit,
  isLoading = false,
  error,
}) => {
  const theme = useTheme(state => state.theme);
  const isDarkTheme = theme === 'dark';
  const { t } = useTranslation();
  const [yamlContent, setYamlContent] = useState<string>('');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchLoading, setFetchLoading] = useState<boolean>(false);

  const { useBindingPolicyDetails } = useBPQueries();

  const {
    data: refreshedPolicy,
    isLoading: isRefreshing,
    error: refreshError,
  } = useBindingPolicyDetails(policy?.name, { refetchInterval: 2000 });

  const policyData = refreshedPolicy || policy;
  const isLoadingData = isLoading || isRefreshing;
  const errorData = error || (refreshError ? refreshError.message : undefined);

  // Debug log the incoming policy object
  useEffect(() => {
    console.log('PolicyDetailDialog - Received policy:', policy);
    console.log('PolicyDetailDialog - YAML property:', policy.yaml || '<empty string>');

    if (refreshedPolicy) {
      console.log(
        'PolicyDetailDialog - Using auto-refreshed policy data with status:',
        refreshedPolicy.status
      );
    }
  }, [policy, refreshedPolicy]);

  // Process YAML content when policy changes
  useEffect(() => {
    const processYaml = async () => {
      setFetchLoading(true);
      setFetchError(null);

      const currentPolicy = refreshedPolicy || policy;
      console.log('Processing YAML for policy:', currentPolicy?.name);

      // Don't process if we're still in the initial loading state
      if (currentPolicy.status === 'Loading...') {
        console.log('Policy is still loading, deferring YAML processing');
        setFetchLoading(false);
        return;
      }

      try {
        // Use the YAML content directly from the policy object
        if (currentPolicy?.yaml) {
          console.log(`Using YAML content from policy object (${currentPolicy.yaml.length} chars)`);
          setYamlContent(currentPolicy.yaml);
        } else {
          console.log('No YAML content found in policy object');

          // Log additional debug info
          console.log('Policy object keys:', Object.keys(currentPolicy));
          console.log('Policy yaml property type:', typeof currentPolicy.yaml);

          setFetchError(
            'No YAML content available. The policy may have been created before YAML tracking was implemented or the YAML content may not be available from the API.'
          );
          setYamlContent('');
        }
      } catch (err) {
        console.error('Error processing YAML:', err);
        setFetchError(
          `Failed to process YAML: ${err instanceof Error ? err.message : 'Unknown error'}`
        );
        setYamlContent('');
      } finally {
        setFetchLoading(false);
      }
    };

    processYaml();
  }, [policy, refreshedPolicy]);

  // Function to map cluster labels to actual cluster names
  const mapClusterLabelsToNames = (clusterLabels: string[]): string[] => {
    if (!clusters || clusters.length === 0) {
      return clusterLabels; // Return original labels if no cluster data available
    }

    return clusterLabels.map(clusterLabel => {
      // If it's already a cluster name (not a label), return as is
      if (clusters.some(cluster => cluster.name === clusterLabel)) {
        return clusterLabel;
      }

      if (clusterLabel.includes(':')) {
        const [key, value] = clusterLabel.split(':');
        const matchingClusters = clusters.filter(
          cluster => cluster.labels && cluster.labels[key] === value
        );

        if (matchingClusters.length > 0) {
          // Return the names of matching clusters
          return matchingClusters.map(cluster => cluster.name).join(', ');
        }
      }

      // If no matches found, return the original label
      return clusterLabel;
    });
  };

  const clusterNames = mapClusterLabelsToNames(policyData.clusterList || []);

  const workloads = policyData.workloadList || [];

  const formattedCreationDate = policyData.creationTimestamp
    ? new Date(policyData.creationTimestamp).toLocaleString()
    : 'Not available';

  if (isLoadingData) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        PaperProps={{
          sx: {
            backgroundColor: isDarkTheme ? '#1e293b' : '#fff',
            color: isDarkTheme ? '#fff' : '#000',
          },
        }}
      >
        <DialogTitle>{t('bindingPolicy.loading')}</DialogTitle>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (errorData) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        PaperProps={{
          sx: {
            backgroundColor: isDarkTheme ? '#1e293b' : '#fff',
            color: isDarkTheme ? '#fff' : 'inherit',
          },
        }}
      >
        <DialogTitle>{t('errors.error')}</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorData}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          m: 2,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: isDarkTheme ? '#1e293b' : '#fff',
          color: isDarkTheme ? '#fff' : 'inherit',
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h6" className={isDarkTheme ? 'text-white' : 'text-black'}>
              {policyData.name}
            </Typography>
            <Chip
              label={t(`common.status.${policyData.status.toLowerCase()}`)}
              size="small"
              color={
                policyData.status.toLowerCase() === 'active'
                  ? 'success'
                  : policyData.status.toLowerCase() === 'pending'
                    ? 'warning'
                    : 'error'
              }
            />
          </Box>
          {onEdit && (
            <Button
              onClick={() => onEdit(policyData)}
              sx={{
                color: isDarkTheme ? '#fff' : 'text.primary',
                '&:hover': {
                  color: isDarkTheme ? '#fff' : 'text.primary',
                  opacity: 0.8,
                },
              }}
            >
              {t('common.edit')}
            </Button>
          )}
        </Box>
      </DialogTitle>
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
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 2,
                height: '100%',
                backgroundColor: isDarkTheme ? '#0f172a' : '#fff',
                color: isDarkTheme ? '#fff' : 'text.primary',
              }}
            >
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                gutterBottom
                sx={{ color: isDarkTheme ? '#fff' : 'text.primary' }}
              >
                {t('bindingPolicy.table.name')}
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: isDarkTheme ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}
                  >
                    {t('bindingPolicy.table.creationDate')}
                  </Typography>
                  <Typography sx={{ color: isDarkTheme ? '#fff' : 'text.primary' }}>
                    {formattedCreationDate ||
                      policyData.creationDate ||
                      t('common.noResource', {
                        resource: t('bindingPolicy.table.creationDate').toLowerCase(),
                      })}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: isDarkTheme ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}
                  >
                    {t('bindingPolicy.table.clusters')} ({clusterNames.length})
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {clusterNames.length > 0 ? (
                      <>
                        {clusterNames.map((name, index) => (
                          <Chip
                            key={index}
                            label={name}
                            size="small"
                            sx={{
                              mr: 1,
                              mb: 1,
                              backgroundColor: isDarkTheme ? '#334155' : undefined,
                              color: isDarkTheme ? '#fff' : undefined,
                            }}
                          />
                        ))}
                      </>
                    ) : (
                      <Typography
                        sx={{
                          fontSize: '0.875rem',
                          color: isDarkTheme ? 'rgba(255, 255, 255, 0.99)' : 'text.secondary',
                        }}
                      >
                        {t('bindingPolicy.table.noClusters')}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: isDarkTheme ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}
                  >
                    {t('bindingPolicy.table.workload')} ({workloads.length})
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {workloads && workloads.length > 0 ? (
                      <>
                        {workloads.map((workload, index) => (
                          <Chip
                            key={index}
                            label={workload}
                            size="small"
                            sx={{
                              mr: 1,
                              mb: 1,
                              backgroundColor: isDarkTheme ? '#334155' : undefined,
                              color: isDarkTheme ? '#fff' : undefined,
                            }}
                          />
                        ))}
                      </>
                    ) : (
                      <Typography
                        sx={{
                          fontSize: '0.875rem',
                          color: isDarkTheme ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                        }}
                      >
                        {t('bindingPolicy.table.noWorkloads')}
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{ color: isDarkTheme ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}
                  >
                    {t('bindingPolicy.table.status')}
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label={t(`common.status.${policyData.status.toLowerCase()}`)}
                      size="small"
                      color={
                        policyData.status.toLowerCase() === 'active'
                          ? 'success'
                          : policyData.status.toLowerCase() === 'pending'
                            ? 'warning'
                            : 'error'
                      }
                    />
                  </Box>
                </Box>

                {policyData.conditions && policyData.conditions.length > 0 && (
                  <Box>
                    <Typography
                      variant="body2"
                      className={isDarkTheme ? 'text-gray-400' : 'text-gray-600'}
                    >
                      Conditions
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      {policyData.conditions.map((condition: PolicyCondition, index: number) => (
                        <Box key={index} sx={{ mb: 1 }}>
                          <Typography
                            variant="body2"
                            fontWeight="medium"
                            className={isDarkTheme ? 'text-gray-300' : 'text-gray-700'}
                          >
                            {condition.type}: {condition.status}
                          </Typography>
                          {condition.reason && (
                            <Typography
                              variant="body2"
                              className={isDarkTheme ? 'text-gray-400' : 'text-gray-600'}
                            >
                              Reason: {condition.reason}
                            </Typography>
                          )}
                          {condition.message && (
                            <Typography
                              variant="body2"
                              className={isDarkTheme ? 'text-gray-400' : 'text-gray-600'}
                            >
                              {condition.message}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={8}>
            <Paper
              sx={{
                p: 2,
                height: '100%',
                backgroundColor: isDarkTheme ? '#0f172a' : '#fff',
                color: isDarkTheme ? '#fff' : 'inherit',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  className={isDarkTheme ? 'text-white' : ''}
                >
                  {t('bindingPolicy.visualization.title')}
                </Typography>
                <Button
                  size="small"
                  startIcon={<ContentCopy />}
                  onClick={() => navigator.clipboard.writeText(yamlContent || '')}
                  sx={{
                    color: isDarkTheme ? '#fff' : 'text.primary',
                    '&:hover': {
                      color: isDarkTheme ? '#fff' : 'text.primary',
                      opacity: 0.8,
                    },
                  }}
                >
                  {t('common.copy')}
                </Button>
              </Box>
              <Box
                sx={{
                  mt: 2,
                  border: 1,
                  borderColor: isDarkTheme ? 'gray.700' : 'divider',
                }}
              >
                {policyData.status === t('common.loading') ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>{t('bindingPolicy.loading')}</Typography>
                  </Box>
                ) : fetchLoading ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                    <CircularProgress />
                  </Box>
                ) : fetchError ? (
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    height="400px"
                    p={3}
                  >
                    <Alert severity="warning" sx={{ width: '100%' }}>
                      {fetchError}
                      <Box mt={2}>
                        <Typography variant="body2">
                          {t('bindingPolicy.table.name')}: {policyData.name}
                        </Typography>
                        <Typography variant="body2">
                          {t('bindingPolicy.table.status')}: {policyData.status} (from status API)
                        </Typography>
                        <Typography variant="body2">
                          {t('bindingPolicy.table.creationDate')}: {policyData.creationDate}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          sx={{ mt: 2 }}
                          onClick={() => {
                            // Re-process the YAML if the user clicks retry
                            setFetchLoading(true);
                            setFetchError(null);

                            setTimeout(() => {
                              if (policyData?.yaml) {
                                setYamlContent(policyData.yaml);
                                setFetchLoading(false);
                              } else {
                                setFetchError(t('bindingPolicy.notifications.yamlGenerateError'));
                                setFetchLoading(false);
                              }
                            }, 1000);
                          }}
                        >
                          {t('common.refresh')}
                        </Button>
                      </Box>
                    </Alert>
                  </Box>
                ) : !yamlContent ? (
                  <Box display="flex" justifyContent="center" alignItems="center" height="400px">
                    <Alert severity="warning" sx={{ width: '100%' }}>
                      {t('bindingPolicy.notifications.yamlGenerateError')}
                    </Alert>
                  </Box>
                ) : (
                  <Suspense fallback={<CircularProgress />}>
                    <MonacoEditor
                      height="400px"
                      language="yaml"
                      value={yamlContent}
                      theme={isDarkTheme ? 'vs-dark' : 'light'}
                      options={{
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                      }}
                      onMount={() => {
                        console.log(
                          'Editor mounted. YAML content length:',
                          yamlContent?.length || 0
                        );
                      }}
                    />
                  </Suspense>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <CancelButton onClick={onClose}>{t('common.cancel')}</CancelButton>
      </DialogActions>
    </Dialog>
  );
};

export default PolicyDetailDialog;
