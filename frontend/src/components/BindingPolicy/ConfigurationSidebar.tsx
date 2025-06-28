import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';
import CodeIcon from '@mui/icons-material/Code';
import DeleteIcon from '@mui/icons-material/Delete';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import InfoIcon from '@mui/icons-material/Info';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import SaveIcon from '@mui/icons-material/Save';
import ScheduleIcon from '@mui/icons-material/Schedule';
import TuneIcon from '@mui/icons-material/Tune';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CancelButton from '../common/CancelButton';

// Scheduling rule types
type OperatorType =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'In'
  | 'NotIn'
  | 'Exists'
  | 'DoesNotExist';
type ResourceType = 'cpu' | 'memory' | 'storage' | 'pods';

interface SchedulingRule {
  resource: ResourceType;
  operator: OperatorType;
  value: string;
}

export interface PolicyConfiguration {
  name: string;
  namespace: string;
  propagationMode: 'DownsyncOnly' | 'UpsyncOnly' | 'BidirectionalSync';
  updateStrategy: 'ServerSideApply' | 'ForceApply' | 'RollingUpdate' | 'BlueGreenDeployment';
  deploymentType: 'AllClusters' | 'SelectedClusters';
  schedulingRules: SchedulingRule[];
  customLabels: Record<string, string>;
  tolerations: string[];
}

interface ConfigurationSidebarProps {
  open: boolean;
  onClose: () => void;
  selectedConnection:
    | {
        source: { type: string; id: string; name: string };
        target: { type: string; id: string; name: string };
      }
    | undefined;
  onSaveConfiguration: (config: PolicyConfiguration) => void;
  dialogMode?: boolean;
}

const ConfigurationSidebar: React.FC<ConfigurationSidebarProps> = ({
  open,
  onClose,
  selectedConnection,
  onSaveConfiguration,
}) => {
  // Form state
  const [name, setName] = useState('');
  const [namespace, setNamespace] = useState('default');
  const [propagationMode, setPropagationMode] = useState<
    'DownsyncOnly' | 'UpsyncOnly' | 'BidirectionalSync'
  >('DownsyncOnly');
  const [updateStrategy, setUpdateStrategy] = useState<
    'ServerSideApply' | 'ForceApply' | 'RollingUpdate' | 'BlueGreenDeployment'
  >('ServerSideApply');
  const [deploymentType, setDeploymentType] = useState<'AllClusters' | 'SelectedClusters'>(
    'SelectedClusters'
  );
  const [addLabels, setAddLabels] = useState(true);
  const [labelKey, setLabelKey] = useState('');
  const [labelValue, setLabelValue] = useState('');
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});
  const [schedulingRules, setSchedulingRules] = useState<SchedulingRule[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tolerations, setTolerations] = useState<string[]>([]);
  const [tolerationInput, setTolerationInput] = useState('');
  const [currentTab, setCurrentTab] = useState(0);

  // New scheduling rule form state
  const [newRule, setNewRule] = useState<SchedulingRule>({
    resource: 'cpu',
    operator: '>=',
    value: '',
  });

  const { t } = useTranslation();

  // Initialize form when selected connection changes
  useEffect(() => {
    if (selectedConnection) {
      // Get source and target details
      const source = selectedConnection.source;
      const target = selectedConnection.target;

      // Determine workload and cluster
      let workloadName, clusterName;
      if (source.type === 'workload') {
        workloadName = source.name;
        clusterName = target.name;
      } else {
        workloadName = target.name;
        clusterName = source.name;
      }

      // Set default name based on workload and cluster
      setName(`${workloadName}-to-${clusterName}`);

      // Reset other fields
      setNamespace('default');
      setPropagationMode('DownsyncOnly');
      setUpdateStrategy('ServerSideApply');
      setDeploymentType('SelectedClusters');
      setCustomLabels({});
      setSchedulingRules([]);
      setTolerations([]);
      setErrors({});
    }
  }, [selectedConnection]);

  // Handle adding a custom label
  const handleAddLabel = () => {
    if (!labelKey || !labelValue) {
      setErrors({
        ...errors,
        label: 'Both key and value are required',
      });
      return;
    }

    // Check if key already exists
    if (customLabels[labelKey]) {
      setErrors({
        ...errors,
        label: 'Label key already exists',
      });
      return;
    }

    // Add label
    setCustomLabels({
      ...customLabels,
      [labelKey]: labelValue,
    });

    // Clear fields and errors
    setLabelKey('');
    setLabelValue('');
    setErrors({
      ...errors,
      label: '',
    });
  };

  // Handle removing a custom label
  const handleRemoveLabel = (key: string) => {
    const newLabels = { ...customLabels };
    delete newLabels[key];
    setCustomLabels(newLabels);
  };

  // Handle adding a scheduling rule
  const handleAddRule = () => {
    if (!newRule.value && newRule.operator !== 'Exists' && newRule.operator !== 'DoesNotExist') {
      setErrors({
        ...errors,
        rule: 'Value is required for this operator',
      });
      return;
    }

    setSchedulingRules([...schedulingRules, { ...newRule }]);

    // Reset new rule form
    setNewRule({
      resource: 'cpu',
      operator: '>=',
      value: '',
    });

    setErrors({
      ...errors,
      rule: '',
    });
  };

  // Handle removing a scheduling rule
  const handleRemoveRule = (index: number) => {
    setSchedulingRules(schedulingRules.filter((_, i) => i !== index));
  };

  // Handle adding a toleration
  const handleAddToleration = () => {
    if (!tolerationInput) {
      setErrors({
        ...errors,
        toleration: 'Toleration is required',
      });
      return;
    }

    setTolerations([...tolerations, tolerationInput]);
    setTolerationInput('');

    setErrors({
      ...errors,
      toleration: '',
    });
  };

  // Handle removing a toleration
  const handleRemoveToleration = (index: number) => {
    setTolerations(tolerations.filter((_, i) => i !== index));
  };

  // Generate YAML preview
  const yamlPreview = useMemo(() => {
    try {
      const config = {
        apiVersion: 'policy.kubestellar.io/v1alpha1',
        kind: 'BindingPolicy',
        metadata: {
          name,
          namespace,
          labels: customLabels,
        },
        spec: {
          deploymentType,
          propagationMode,
          updateStrategy,
          clusterSelector: {
            matchLabels: {
              ...customLabels,
            },
          },
          scheduling:
            schedulingRules.length > 0
              ? {
                  rules: schedulingRules.map(rule => ({
                    resource: rule.resource,
                    operator: rule.operator,
                    value: rule.value,
                  })),
                }
              : undefined,
          tolerations: tolerations.length > 0 ? tolerations : undefined,
        },
      };

      return JSON.stringify(config, null, 2)
        .replace(/"([^"]+)":/g, '$1:') // Remove quotes around property names
        .replace(/"/g, "'") // Replace double quotes with single quotes
        .replace(/'/g, '"') // Put back quotes for string values
        .replace(/"/g, "'") // Convert back to single quotes
        .replace(/true/g, 'true') // Leave booleans unquoted
        .replace(/false/g, 'false')
        .replace(/null/g, 'null');
    } catch (error: unknown) {
      console.error('Error generating YAML preview:', error);
      return '# Error generating YAML preview';
    }
  }, [
    name,
    namespace,
    propagationMode,
    updateStrategy,
    deploymentType,
    customLabels,
    schedulingRules,
    tolerations,
  ]);

  // Copy YAML to clipboard
  const handleCopyYaml = () => {
    navigator.clipboard.writeText(yamlPreview);
    // You could add a toast notification here
  };

  // Handle form submission
  const handleSave = () => {
    // Validate form
    const newErrors: Record<string, string> = {};

    if (!name) {
      newErrors.name = 'Name is required';
    }

    if (!namespace) {
      newErrors.namespace = 'Namespace is required';
    }

    // If there are errors, don't submit
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Create configuration object
    const config: PolicyConfiguration = {
      name,
      namespace,
      propagationMode,
      updateStrategy,
      deploymentType,
      schedulingRules,
      customLabels: addLabels ? customLabels : {},
      tolerations,
    };

    // Call the save function
    onSaveConfiguration(config);

    // Reset form
    setName('');
    setNamespace('default');
    setPropagationMode('DownsyncOnly');
    setUpdateStrategy('ServerSideApply');
    setDeploymentType('SelectedClusters');
    setCustomLabels({});
    setSchedulingRules([]);
    setTolerations([]);
    setErrors({});
  };

  // Get source and target details for display
  const getConnectionDetails = () => {
    if (!selectedConnection) return null;

    const source = selectedConnection.source;
    const target = selectedConnection.target;

    return (
      <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
        <Typography variant="subtitle2" gutterBottom>
          {t('bindingPolicy.configureDialog.creatingFor')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Chip
            size="small"
            label={source.name}
            color={source.type === 'workload' ? 'success' : 'info'}
          />
          <ArrowForwardIcon fontSize="small" color="action" />
          <Chip
            size="small"
            label={target.name}
            color={target.type === 'workload' ? 'success' : 'info'}
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          {t('bindingPolicy.configureDialog.creatingForDesc', {
            sourceType: source.type,
            targetType: target.type,
          })}
        </Typography>
      </Paper>
    );
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: '500px',
          boxSizing: 'border-box',
          p: 3,
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">{t('bindingPolicy.configureDialog.title')}</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Connection Details */}
      {getConnectionDetails()}

      {/* Tabs for organization */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          aria-label="policy configuration tabs"
        >
          <Tab icon={<InfoIcon />} label={t('bindingPolicy.configureDialog.tabs.basic')} />
          <Tab icon={<TuneIcon />} label={t('bindingPolicy.configureDialog.tabs.advanced')} />
          <Tab icon={<ScheduleIcon />} label={t('bindingPolicy.configureDialog.tabs.scheduling')} />
          <Tab icon={<CodeIcon />} label={t('bindingPolicy.configureDialog.tabs.yaml')} />
        </Tabs>
      </Box>

      {/* Basic Settings Tab */}
      {currentTab === 0 && (
        <Box component="form" noValidate autoComplete="off">
          <TextField
            fullWidth
            label={t('bindingPolicy.policyName')}
            value={name}
            onChange={e => setName(e.target.value)}
            error={!!errors.name}
            helperText={errors.name || t('bindingPolicy.configureDialog.nameHelper')}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label={t('bindingPolicy.namespace')}
            value={namespace}
            onChange={e => setNamespace(e.target.value)}
            error={!!errors.namespace}
            helperText={errors.namespace || t('bindingPolicy.configureDialog.namespaceHelper')}
            margin="normal"
            required
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>{t('bindingPolicy.propagationMode')}</InputLabel>
            <Select
              value={propagationMode}
              onChange={(e: SelectChangeEvent) =>
                setPropagationMode(
                  e.target.value as 'DownsyncOnly' | 'UpsyncOnly' | 'BidirectionalSync'
                )
              }
              label={t('bindingPolicy.propagationMode')}
            >
              <MenuItem value="DownsyncOnly">{t('bindingPolicy.modes.downsyncOnly')}</MenuItem>
              <MenuItem value="UpsyncOnly">{t('bindingPolicy.modes.upsyncOnly')}</MenuItem>
              <MenuItem value="BidirectionalSync">
                {t('bindingPolicy.modes.bidirectionalSync')}
              </MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>{t('bindingPolicy.deploymentType')}</InputLabel>
            <Select
              value={deploymentType}
              onChange={(e: SelectChangeEvent) =>
                setDeploymentType(e.target.value as 'AllClusters' | 'SelectedClusters')
              }
              label={t('bindingPolicy.deploymentType')}
            >
              <MenuItem value="SelectedClusters">
                {t('bindingPolicy.deploymentType.selectedClusters')}
              </MenuItem>
              <MenuItem value="AllClusters">
                {t('bindingPolicy.deploymentType.allClusters')}
              </MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Advanced Settings Tab */}
      {currentTab === 1 && (
        <Box component="form" noValidate autoComplete="off">
          <FormControl fullWidth margin="normal">
            <InputLabel>{t('bindingPolicy.updateStrategy')}</InputLabel>
            <Select
              value={updateStrategy}
              onChange={(e: SelectChangeEvent) =>
                setUpdateStrategy(
                  e.target.value as
                    | 'ServerSideApply'
                    | 'ForceApply'
                    | 'RollingUpdate'
                    | 'BlueGreenDeployment'
                )
              }
              label={t('bindingPolicy.updateStrategy')}
            >
              <MenuItem value="ServerSideApply">
                {t('bindingPolicy.strategies.serverSideApply')}
              </MenuItem>
              <MenuItem value="ForceApply">{t('bindingPolicy.strategies.forceApply')}</MenuItem>
              <MenuItem value="RollingUpdate">
                {t('bindingPolicy.strategies.rollingUpdate')}
              </MenuItem>
              <MenuItem value="BlueGreenDeployment">
                {t('bindingPolicy.strategies.blueGreenDeployment')}
              </MenuItem>
            </Select>
            <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary' }}>
              {t('bindingPolicy.configureDialog.updateStrategyHelper')}
            </Typography>
          </FormControl>

          <Box sx={{ mt: 3, mb: 2 }}>
            <FormControlLabel
              control={
                <Switch checked={addLabels} onChange={e => setAddLabels(e.target.checked)} />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ mr: 1 }}>
                    {t('bindingPolicy.configureDialog.addCustomLabels')}
                  </Typography>
                  <Tooltip title={t('bindingPolicy.configureDialog.labelsTooltip')}>
                    <InfoIcon fontSize="small" color="action" />
                  </Tooltip>
                </Box>
              }
            />
          </Box>

          {addLabels && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', mb: 1 }}>
                <TextField
                  size="small"
                  label={t('bindingPolicy.labels.key')}
                  value={labelKey}
                  onChange={e => setLabelKey(e.target.value)}
                  sx={{ mr: 1, flexGrow: 1 }}
                  error={!!errors.label}
                />
                <TextField
                  size="small"
                  label={t('bindingPolicy.labels.value')}
                  value={labelValue}
                  onChange={e => setLabelValue(e.target.value)}
                  sx={{ mr: 1, flexGrow: 1 }}
                  error={!!errors.label}
                />
                <Button variant="outlined" onClick={handleAddLabel} startIcon={<AddIcon />}>
                  {t('bindingPolicy.labels.add')}
                </Button>
              </Box>

              {errors.label && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
                  {errors.label}
                </Typography>
              )}

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(customLabels).map(([key, value]) => (
                  <Chip
                    key={key}
                    label={`${key}: ${value}`}
                    onDelete={() => handleRemoveLabel(key)}
                    size="small"
                    icon={<LocalOfferIcon fontSize="small" />}
                  />
                ))}
              </Box>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>
            {t('bindingPolicy.configureDialog.tolerationsTitle')}
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', mb: 1 }}>
              <TextField
                size="small"
                label={t('bindingPolicy.configureDialog.tolerationExpression')}
                placeholder="key=value:effect"
                value={tolerationInput}
                onChange={e => setTolerationInput(e.target.value)}
                sx={{ mr: 1, flexGrow: 1 }}
                error={!!errors.toleration}
                helperText={
                  errors.toleration && t('bindingPolicy.configureDialog.tolerationRequired')
                }
              />
              <Button variant="outlined" onClick={handleAddToleration} startIcon={<AddIcon />}>
                {t('bindingPolicy.labels.add')}
              </Button>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {tolerations.map((toleration, index) => (
                <Chip
                  key={index}
                  label={toleration}
                  onDelete={() => handleRemoveToleration(index)}
                  size="small"
                />
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* Scheduling Rules Tab */}
      {currentTab === 2 && (
        <Box component="form" noValidate autoComplete="off">
          <Typography variant="subtitle2" gutterBottom>
            {t('bindingPolicy.configureDialog.schedulingRules')}
            <Tooltip title={t('bindingPolicy.configureDialog.schedulingTooltip')}>
              <InfoIcon fontSize="small" sx={{ ml: 1, verticalAlign: 'middle' }} color="action" />
            </Tooltip>
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', mb: 1, gap: 1 }}>
              <FormControl size="small" sx={{ flexGrow: 1 }}>
                <InputLabel>{t('bindingPolicy.configureDialog.resource')}</InputLabel>
                <Select
                  value={newRule.resource}
                  label={t('bindingPolicy.configureDialog.resource')}
                  onChange={(e: SelectChangeEvent) =>
                    setNewRule({ ...newRule, resource: e.target.value as ResourceType })
                  }
                >
                  <MenuItem value="cpu">{t('bindingPolicy.configureDialog.resource.cpu')}</MenuItem>
                  <MenuItem value="memory">
                    {t('bindingPolicy.configureDialog.resource.memory')}
                  </MenuItem>
                  <MenuItem value="storage">
                    {t('bindingPolicy.configureDialog.resource.storage')}
                  </MenuItem>
                  <MenuItem value="pods">
                    {t('bindingPolicy.configureDialog.resource.pods')}
                  </MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flexGrow: 1 }}>
                <InputLabel>{t('bindingPolicy.configureDialog.operator')}</InputLabel>
                <Select
                  value={newRule.operator}
                  label={t('bindingPolicy.configureDialog.operator')}
                  onChange={(e: SelectChangeEvent) =>
                    setNewRule({ ...newRule, operator: e.target.value as OperatorType })
                  }
                >
                  <MenuItem value="=">=</MenuItem>
                  <MenuItem value="!=">!=</MenuItem>
                  <MenuItem value=">">{'>'}</MenuItem>
                  <MenuItem value=">=">{'≥'}</MenuItem>
                  <MenuItem value="<">{'<'}</MenuItem>
                  <MenuItem value="<=">{'≤'}</MenuItem>
                  <MenuItem value="In">In</MenuItem>
                  <MenuItem value="NotIn">Not In</MenuItem>
                  <MenuItem value="Exists">Exists</MenuItem>
                  <MenuItem value="DoesNotExist">Does Not Exist</MenuItem>
                </Select>
              </FormControl>

              {newRule.operator !== 'Exists' && newRule.operator !== 'DoesNotExist' && (
                <TextField
                  size="small"
                  label="Value"
                  value={newRule.value}
                  onChange={e => setNewRule({ ...newRule, value: e.target.value })}
                  sx={{ flexGrow: 1 }}
                  error={!!errors.rule}
                  placeholder={
                    newRule.resource === 'cpu'
                      ? '2'
                      : newRule.resource === 'memory'
                        ? '4Gi'
                        : newRule.resource === 'storage'
                          ? '10Gi'
                          : '20'
                  }
                />
              )}

              <Button variant="outlined" onClick={handleAddRule} startIcon={<AddIcon />}>
                Add
              </Button>
            </Box>

            {errors.rule && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
                {errors.rule}
              </Typography>
            )}

            {schedulingRules.length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>
                {t('bindingPolicy.configureDialog.noSchedulingRules')}
              </Alert>
            ) : (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('bindingPolicy.configureDialog.activeRules')}
                </Typography>
                <Stack spacing={1}>
                  {schedulingRules.map((rule, index) => (
                    <Paper
                      key={index}
                      sx={{
                        p: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Typography variant="body2">
                        {rule.resource === 'cpu'
                          ? 'CPU Cores'
                          : rule.resource === 'memory'
                            ? 'Memory'
                            : rule.resource === 'storage'
                              ? 'Storage'
                              : 'Available Pods'}{' '}
                        {rule.operator === '='
                          ? '='
                          : rule.operator === '!='
                            ? '≠'
                            : rule.operator === '>'
                              ? '>'
                              : rule.operator === '>='
                                ? '≥'
                                : rule.operator === '<'
                                  ? '<'
                                  : rule.operator === '<='
                                    ? '≤'
                                    : rule.operator === 'In'
                                      ? 'in'
                                      : rule.operator === 'NotIn'
                                        ? 'not in'
                                        : rule.operator === 'Exists'
                                          ? 'exists'
                                          : 'does not exist'}{' '}
                        {rule.operator !== 'Exists' && rule.operator !== 'DoesNotExist'
                          ? rule.value
                          : ''}
                      </Typography>
                      <IconButton size="small" onClick={() => handleRemoveRule(index)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* YAML Preview Tab */}
      {currentTab === 3 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle2">
              {t('bindingPolicy.configureDialog.yamlPreview')}
            </Typography>
            <Button startIcon={<FileCopyIcon />} onClick={handleCopyYaml} size="small">
              {t('common.copy')}
            </Button>
          </Box>

          <Paper
            sx={{
              p: 2,
              bgcolor: 'background.default',
              maxHeight: '400px',
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              mb: 2,
            }}
          >
            {yamlPreview}
          </Paper>

          <Alert severity="info" sx={{ mb: 2 }}>
            {t('bindingPolicy.configureDialog.yamlPreviewInfo')}
          </Alert>
        </Box>
      )}

      {/* Action Buttons (always shown) */}
      <Box
        sx={{
          mt: 'auto',
          pt: 2,
          display: 'flex',
          justifyContent: 'flex-end',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CancelButton onClick={onClose}>{t('common.cancel')}</CancelButton>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          startIcon={<SaveIcon />}
          disabled={!name || !namespace}
        >
          {t('bindingPolicy.createBindingPolicy')}
        </Button>
      </Box>
    </Drawer>
  );
};

export default ConfigurationSidebar;
