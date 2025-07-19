import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Stack, Typography, IconButton, Button, Tooltip, Snackbar, Alert } from '@mui/material';
import { FiX, FiGitPullRequest, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import useTheme from '../stores/themeStore';
import WecsDetailsTabs from './wecs_details/WecsDetailsTabs';
import SummaryTab from './wecs_details/tabs/SummaryTab';
import EditTab from './wecs_details/tabs/EditTab';
import LogsTab from './wecs_details/tabs/LogsTab';
import ExecTab from './wecs_details/tabs/ExecTab';
import { getPanelStyles, getContentBoxStyles } from './wecs_details/WecsDetailsStyles';
import { ResourceItem } from './treeView/types';
import { useClusterQueries } from '../hooks/queries/useClusterQueries';
import jsyaml from 'js-yaml';
import { api } from '../lib/api';

interface WecsDetailsProps {
  namespace: string;
  name: string;
  type: string;
  resourceData?: ResourceItem;
  onClose: () => void;
  isOpen: boolean;
  onSync?: () => void;
  onDelete?: () => void;
  initialTab?: number;
  cluster: string;
  isDeploymentOrJobPod?: boolean;
}

const WecsDetailsPanel = ({
  namespace,
  name,
  type,
  resourceData,
  onClose,
  isOpen,
  onSync,
  onDelete,
  initialTab,
  cluster,
  isDeploymentOrJobPod,
}: WecsDetailsProps) => {
  const { t } = useTranslation();
  const theme = useTheme(state => state.theme);
  const [tabValue, setTabValue] = useState(initialTab ?? 0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const terminalRef = useRef<HTMLDivElement>(null);
  const execTerminalRef = useRef<HTMLDivElement>(null);
  const [execTerminalKey] = useState<string>(`${cluster}-${namespace}-${name}`);

  // Manifest editing state
  const [editFormat, setEditFormat] = useState<'yaml' | 'json'>('yaml');
  const [editedManifest, setEditedManifest] = useState<string>('');

  // Cluster details (for cluster resources)
  const { useClusterDetails } = useClusterQueries();
  const clusterDetailsQuery = useClusterDetails(type.toLowerCase() === 'cluster' ? name : '');
  const clusterDetails = type.toLowerCase() === 'cluster' ? clusterDetailsQuery.data ?? null : null;

  // Resource summary state
  const resource = resourceData ?? null;

  // Container state for logs/exec
  const [containers, setContainers] = useState<{ ContainerName: string; Image: string }[]>([]);
  const [selectedContainer, setSelectedContainer] = useState('');
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [logsContainers, setLogsContainers] = useState<{ ContainerName: string; Image: string }[]>([]);
  const [selectedLogsContainer, setSelectedLogsContainer] = useState('');
  const [loadingLogsContainers, setLoadingLogsContainers] = useState(false);
  const [showPreviousLogs, setShowPreviousLogs] = useState(false);
  const logs: string[] = [];
  const [isTerminalMaximized, setIsTerminalMaximized] = useState(false);

  // Fetch containers for pod (logs/exec)
  useEffect(() => {
    if (type.toLowerCase() !== 'pod' || !isOpen) return;
    const fetchContainers = async () => {
      setLoadingContainers(true);
      try {
        const response = await api.get(`/list/container/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}?context=${encodeURIComponent(cluster)}`);
        setContainers(response.data.data || []);
        if (response.data.data && response.data.data.length > 0) {
          setSelectedContainer(response.data.data[0].ContainerName);
        }
      } catch (error) {
        setSnackbarMessage(t('wecsDetailsPanel.errors.failedFetchContainers'));
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      } finally {
        setLoadingContainers(false);
      }
    };
    fetchContainers();
  }, [type, namespace, name, cluster, isOpen, t]);

  useEffect(() => {
    if (type.toLowerCase() !== 'pod' || !isOpen) return;
    const fetchLogsContainers = async () => {
      setLoadingLogsContainers(true);
      try {
        const response = await api.get(`/list/container/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}?context=${encodeURIComponent(cluster)}`);
        setLogsContainers(response.data.data || []);
        if (response.data.data && response.data.data.length > 0) {
          setSelectedLogsContainer(response.data.data[0].ContainerName);
        }
      } catch (error) {
        setSnackbarMessage(t('wecsDetailsPanel.errors.failedFetchLogsContainers'));
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      } finally {
        setLoadingLogsContainers(false);
      }
    };
    fetchLogsContainers();
  }, [type, namespace, name, cluster, isOpen, t]);

  // Manifest editing logic
  useEffect(() => {
    if (!resourceData) return;
    setEditedManifest(JSON.stringify(resourceData, null, 2));
  }, [resourceData]);

  const jsonToYaml = (jsonString: string) => {
    try {
      const jsonObj = JSON.parse(jsonString);
      return jsyaml.dump(jsonObj, { indent: 2 });
    } catch (error) {
      return jsonString;
    }
  };
  const yamlToJson = (yamlString: string) => {
    try {
      const yamlObj = jsyaml.load(yamlString);
      return JSON.stringify(yamlObj, null, 2);
    } catch (error) {
      return yamlString;
    }
  };
  const handleFormatChange = (format: 'yaml' | 'json') => {
    if (editFormat === 'yaml' && format === 'json') {
      setEditedManifest(yamlToJson(editedManifest));
    } else if (editFormat === 'json' && format === 'yaml') {
      setEditedManifest(jsonToYaml(editedManifest));
    }
    setEditFormat(format);
  };
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) setEditedManifest(value);
  };
  const handleUpdate = async () => {
    if (!resource) return;
    // Example: update resource via API (customize as needed)
    try {
      let manifestObj;
      if (editFormat === 'yaml') {
        manifestObj = jsyaml.load(editedManifest);
      } else {
        manifestObj = JSON.parse(editedManifest);
      }
      // Example: PUT to /api/resource (customize endpoint as needed)
      await api.put(`/api/resource/${resource.metadata.namespace}/${resource.metadata.name}`, manifestObj);
      setSnackbarMessage(t('wecsDetailsPanel.common.update') + ' successful');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      setSnackbarMessage(t('wecsDetailsPanel.errors.apiNotImplemented', { resourceName: resource.metadata.name }));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Calculate age utility
  const calculateAge = (creationTimestamp: string | undefined): string => {
    if (!creationTimestamp) return t('wecsDetailsPanel.common.na');
    const createdDate = new Date(creationTimestamp);
    const currentDate = new Date();
    const diffMs = currentDate.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0
      ? t('wecsDetailsPanel.common.daysAgo', { count: diffDays })
      : t('wecsDetailsPanel.common.today');
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => setTabValue(newValue);
  const handleSnackbarClose = () => setSnackbarOpen(false);
  const handleClose = useCallback(() => onClose(), [onClose]);

  return (
    <Box sx={getPanelStyles(theme, isOpen)} onClick={e => e.stopPropagation()}>
      <Box sx={{ p: 4, height: '100%' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography
            variant="h4"
            fontWeight="bold"
            sx={{ color: theme === 'dark' ? '#FFFFFF' : '#000000', fontSize: '30px', marginLeft: '4px' }}
          >
            {type.toUpperCase()} : <span style={{ color: '#2F86FF' }}>{name}</span>
          </Typography>
          <Stack direction="row" spacing={1}>
            {onSync && (
              <Tooltip title={t('wecsDetailsPanel.common.sync')}>
                <Button variant="contained" startIcon={<FiGitPullRequest />} onClick={onSync}>
                  {t('wecsDetailsPanel.common.sync')}
                </Button>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title={t('wecsDetailsPanel.common.delete')}>
                <Button variant="outlined" color="error" startIcon={<FiTrash2 />} onClick={onDelete}>
                  {t('wecsDetailsPanel.common.delete')}
                </Button>
              </Tooltip>
            )}
            <Tooltip title={t('wecsDetailsPanel.common.close')}>
              <IconButton onClick={handleClose} sx={{ color: theme === 'dark' ? '#B0B0B0' : '#6d7f8b' }}>
                <FiX />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
        <WecsDetailsTabs
          tabValue={tabValue}
          type={type}
          isDeploymentOrJobPod={isDeploymentOrJobPod}
          theme={theme}
          t={t}
          onTabChange={handleTabChange}
        />
        <Box sx={getContentBoxStyles(theme)}>
          {tabValue === 0 && (
            <SummaryTab
              type={type}
              resource={resource ? (resource as any) : null} // TODO: adapt ResourceItem to ResourceInfo if needed
              clusterDetails={clusterDetails ? (clusterDetails as any) : null} // TODO: adapt ClusterDetails if needed
              resourceData={resource ? (resource as any) : null}
              theme={theme}
              t={t}
              calculateAge={calculateAge}
            />
          )}
          {tabValue === 1 && (
            <EditTab
              editFormat={editFormat}
              setEditFormat={handleFormatChange}
              editedManifest={editedManifest}
              handleUpdate={handleUpdate}
              theme={theme}
              t={t}
              jsonToYaml={jsonToYaml}
              handleEditorChange={handleEditorChange}
            />
          )}
          {tabValue === 2 && type.toLowerCase() === 'pod' && isDeploymentOrJobPod && (
            <LogsTab
              type={type}
              theme={theme}
              t={t}
              terminalRef={terminalRef}
              logsContainers={logsContainers}
              selectedLogsContainer={selectedLogsContainer}
              loadingLogsContainers={loadingLogsContainers}
              showPreviousLogs={showPreviousLogs}
              logs={logs}
              cluster={cluster}
              namespace={namespace}
              name={name}
              handleLogsContainerChange={e => setSelectedLogsContainer(e.target.value)}
              handlePreviousLogsToggle={() => setShowPreviousLogs(prev => !prev)}
            />
          )}
          {tabValue === 3 && type.toLowerCase() === 'pod' && (
            <ExecTab
              theme={theme}
              t={t}
              name={name}
              containers={containers}
              selectedContainer={selectedContainer}
              loadingContainers={loadingContainers}
              isTerminalMaximized={isTerminalMaximized}
              execTerminalRef={execTerminalRef}
              execTerminalKey={execTerminalKey}
              handleContainerChange={e => setSelectedContainer(e.target.value)}
              setIsTerminalMaximized={setIsTerminalMaximized}
              clearTerminal={() => {
                // Optionally clear terminal logic
              }}
            />
          )}
        </Box>
        <Snackbar
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          open={snackbarOpen}
          autoHideDuration={4000}
          onClose={handleSnackbarClose}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity={snackbarSeverity}
            sx={{ width: '100%', backgroundColor: theme === 'dark' ? '#333' : '#fff', color: theme === 'dark' ? '#d4d4d4' : '#333' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default WecsDetailsPanel; 