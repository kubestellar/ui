import React, { useState, useRef, useCallback } from 'react';
import { Box, Stack, Typography, IconButton, Button, Tooltip, Snackbar, Alert } from '@mui/material';
import { FiX, FiGitPullRequest, FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import useTheme from '../../stores/themeStore';
import WecsDetailsTabs from './WecsDetailsTabs';
import SummaryTab from './tabs/SummaryTab';
import EditTab from './tabs/EditTab';
import LogsTab from './tabs/LogsTab';
import ExecTab from './tabs/ExecTab';
import { getPanelStyles, getContentBoxStyles } from './WecsDetailsStyles';

interface ResourceData {
  metadata?: {
    name?: string;
    namespace?: string;
    creationTimestamp?: string;
    labels?: Record<string, string>;
  };
  status?: Record<string, unknown>;
}

interface WecsDetailsProps {
  namespace: string;
  name: string;
  type: string;
  resourceData?: ResourceData;
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
  const terminalRef = useRef<HTMLDivElement>(null);
  const execTerminalRef = useRef<HTMLDivElement>(null);
  const [execTerminalKey] = useState<string>(`${cluster}-${namespace}-${name}`);

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
              resource={null} // TODO: pass actual resource
              clusterDetails={null} // TODO: pass actual clusterDetails
              resourceData={resourceData ?? null}
              theme={theme}
              t={t}
              calculateAge={() => ''} // TODO: pass actual calculateAge
            />
          )}
          {tabValue === 1 && (
            <EditTab
              editFormat={'yaml'} // TODO: manage editFormat state
              setEditFormat={() => {}}
              editedManifest={''} // TODO: manage editedManifest state
              handleUpdate={() => {}}
              theme={theme}
              t={t}
              jsonToYaml={() => ''}
              handleEditorChange={() => {}}
            />
          )}
          {tabValue === 2 && type.toLowerCase() === 'pod' && isDeploymentOrJobPod && (
            <LogsTab
              type={type}
              theme={theme}
              t={t}
              terminalRef={terminalRef}
              logsContainers={[]}
              selectedLogsContainer={''}
              loadingLogsContainers={false}
              showPreviousLogs={false}
              logs={[]}
              cluster={cluster}
              namespace={namespace}
              name={name}
              handleLogsContainerChange={() => {}}
              handlePreviousLogsToggle={() => {}}
              setIsLogsContainerSelectActive={() => {}}
            />
          )}
          {tabValue === 3 && type.toLowerCase() === 'pod' && (
            <ExecTab
              theme={theme}
              t={t}
              name={name}
              containers={[]}
              selectedContainer={''}
              loadingContainers={false}
              isTerminalMaximized={false}
              execTerminalRef={execTerminalRef}
              execTerminalKey={execTerminalKey}
              handleContainerChange={() => {}}
              setIsContainerSelectActive={() => {}}
              setIsTerminalMaximized={() => {}}
              clearTerminal={() => {}}
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
            severity={'success'} // Assuming default severity for now
            sx={{ width: '100%', backgroundColor: theme === 'dark' ? '#333' : '#fff', color: theme === 'dark' ? '#d4d4d4' : '#333' }}
          >
            {/* snackbarMessage was removed, so this will be empty or cause an error if not handled */}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default WecsDetailsPanel;
