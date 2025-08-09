import { useEffect, useState, useCallback } from 'react';
import {
  Paper,
  Box,
  Snackbar,
  Alert,
  Typography,
  Button,
  Tabs,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import BPHeader from '../components/bindingPolicy/Dialogs/BPHeader';
import BPTable from '../components/bindingPolicy/BPTable';
import BPPagination from '../components/bindingPolicy/BPPagination';
import PreviewDialog from '../components/bindingPolicy/PreviewDialog';
import DeleteDialog from '../components/bindingPolicy/Dialogs/DeleteDialog';
import EditBindingPolicyDialog from '../components/bindingPolicy/Dialogs/EditBindingPolicyDialog';
import { BindingPolicyInfo, ManagedCluster, Workload } from '../types/bindingPolicy';
import useTheme from '../stores/themeStore';
// Import React Query hooks
import { useClusterQueries } from '../hooks/queries/useClusterQueries';
import { useWDSQueries } from '../hooks/queries/useWDSQueries';
import { useBPQueries } from '../hooks/queries/useBPQueries';
import { PolicyData } from '../components/bindingPolicy/CreateBindingPolicyDialog';
import BPVisualizationWrapper from '../components/bindingPolicy/BPVisualization';
import PolicySelection from '../components/bindingPolicy/PolicySelection';
import KubernetesIcon from '../components/bindingPolicy/KubernetesIcon';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getTabsStyles,
  // StyledTab,
} from '../components/bindingPolicy/styles/CreateBindingPolicyStyles';
import { api } from '../lib/api';
import BPSkeleton from '../components/skeleton/BPSkeleton';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import React, { Suspense } from 'react';
const EditIcon = React.lazy(() => import('@mui/icons-material/Edit'));
const PublishIcon = React.lazy(() => import('@mui/icons-material/Publish'));

// Define EmptyState component outside of the BP component
const EmptyState: React.FC<{
  onCreateClick: () => void;
  type?: 'policies' | 'clusters' | 'workloads' | 'both';
}> = ({ onCreateClick, type = 'policies' }) => {
  const { t } = useTranslation();
  const theme = useTheme(state => state.theme);
  let title = '';
  let description = '';
  let buttonText = '';

  switch (type) {
    case 'clusters':
      title = t('bindingPolicy.emptyState.noClusters.title');
      description = t('bindingPolicy.emptyState.noClusters.description');
      buttonText = t('bindingPolicy.emptyState.noClusters.button');
      break;
    case 'workloads':
      title = t('bindingPolicy.emptyState.noWorkloads.title');
      description = t('bindingPolicy.emptyState.noWorkloads.description');
      buttonText = t('bindingPolicy.emptyState.noWorkloads.button');
      break;
    case 'both':
      title = t('bindingPolicy.emptyState.noResources.title');
      description = t('bindingPolicy.emptyState.noResources.description');
      buttonText = t('bindingPolicy.emptyState.noResources.button');
      break;
    case 'policies':
    default:
      title = t('bindingPolicy.emptyState.noPolicies.title');
      description = t('bindingPolicy.emptyState.noPolicies.description');
      buttonText = t('bindingPolicy.emptyState.noPolicies.button');
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        textAlign: 'center',
      }}
    >
      <Typography
        variant="h6"
        sx={{
          color: theme === 'dark' ? '#E5E7EB' : 'text.primary',
          mb: 1,
        }}
      >
        {title}
      </Typography>
      <Typography
        variant="body1"
        sx={{
          color: theme === 'dark' ? '#AEBEDF' : 'text.secondary',
          mb: 3,
        }}
      >
        {description}
      </Typography>
      <Button variant="contained" color="primary" onClick={onCreateClick}>
        {buttonText}
      </Button>
    </Box>
  );
};

const BP = () => {
  console.log('BP component rendering');
  const { t } = useTranslation();

  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme(state => state.theme);

  // Initialize the React Query hooks
  const { useClusters } = useClusterQueries();
  const { useWorkloads } = useWDSQueries();
  const { useBindingPolicies, useCreateBindingPolicy, useDeleteBindingPolicy, useDeletePolicies } =
    useBPQueries();

  // Set up the queries
  const {
    data: bindingPoliciesData,
    isLoading: bindingPoliciesLoading,
    error: bindingPoliciesError,
  } = useBindingPolicies();
  const { data: workloadsData, isLoading: workloadsLoading } = useWorkloads();
  const { data: clustersData, isLoading: clustersLoading } = useClusters();

  // Set up mutations
  const createBindingPolicyMutation = useCreateBindingPolicy();
  const deleteBindingPolicyMutation = useDeleteBindingPolicy();
  const deleteMultiplePoliciesMutation = useDeletePolicies();

  // Add all state variables first, before any conditional logic
  const [bindingPolicies, setBindingPolicies] = useState<BindingPolicyInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLabels] = useState<Record<string, string>>({});
  const [availableClusters, setAvailableClusters] = useState<ManagedCluster[]>([]);
  const [availableWorkloads, setAvailableWorkloads] = useState<Workload[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<BindingPolicyInfo | null>(null);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<{
    status?: 'Active' | 'Inactive' | 'Pending' | '';
  }>({ status: '' });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Check if we need to activate selection view based on location state
  const initialViewMode = location.state?.activateView === 'selection' ? 'selection' : 'table';
  const [viewMode, setViewMode] = useState<'table' | 'selection' | 'visualize'>(initialViewMode);
  const [showSelectionHelp, setShowSelectionHelp] = useState(
    location.state?.activateView === 'selection'
  );

  const [clusters, setClusters] = useState<ManagedCluster[]>([]);
  const [workloads, setWorkloads] = useState<Workload[]>([]);
  const [simulatedPolicies, setSimulatedPolicies] = useState<BindingPolicyInfo[]>([]);

  // More forceful effect to ensure viewMode is set properly from location state
  useEffect(() => {
    console.log('Location state:', location.state);

    if (location.state?.activateView === 'selection') {
      console.log('Setting viewMode to selection from location state');
      setViewMode('selection');
      setShowSelectionHelp(true);
    }
  }, [location.state]);

  // Clear location state after using it
  useEffect(() => {
    if (location.state?.activateView) {
      // Replace the current state to clear the activateView parameter
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Show drag & drop help when the view is activated
  useEffect(() => {
    if (viewMode === 'selection') {
      setShowSelectionHelp(true);
    }
  }, [viewMode]);

  // Calculate filtered policies at the top level, not in a nested function
  const getFilteredPolicies = useCallback(() => {
    // Ensure bindingPolicies is an array before calling filter
    if (!Array.isArray(bindingPolicies)) {
      console.warn('bindingPolicies is not an array:', bindingPolicies);
      return [];
    }

    // Empty array is valid, just return it with no warning
    if (bindingPolicies.length === 0) {
      return [];
    }

    // Filter the policies first
    const filtered = bindingPolicies.filter(policy => {
      try {
        if (!policy) return false;

        // Safely access properties with null checks
        const searchLower = searchQuery?.toLowerCase() || '';
        const policyName = policy?.name?.toLowerCase() || '';
        const policyWorkload = policy?.workload?.toLowerCase() || '';
        const policyStatus = policy?.status?.toLowerCase() || '';

        const matchesSearch =
          policyName.includes(searchLower) ||
          policyWorkload.includes(searchLower) ||
          policyStatus.includes(searchLower);

        const matchesStatus =
          !activeFilters.status || policyStatus === activeFilters.status?.toLowerCase();

        return matchesSearch && matchesStatus;
      } catch (error) {
        console.error('Error filtering policy:', error, policy);
        return false; // Skip this policy if there's an error
      }
    });

    // Apply stable sorting by name to prevent reordering on re-renders
    return [...filtered].sort((a, b) => {
      const nameA = a?.name?.toLowerCase() || '';
      const nameB = b?.name?.toLowerCase() || '';
      return nameA.localeCompare(nameB);
    });
  }, [bindingPolicies, searchQuery, activeFilters.status]);

  const filteredPolicies = getFilteredPolicies();
  const paginatedPolicies = filteredPolicies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Calculate matches at the top level
  const getMatches = useCallback(() => {
    const matchedClusters = availableClusters.filter(cluster => {
      return Object.entries(selectedLabels).every(
        ([key, value]) => cluster.labels && cluster.labels[key] === value
      );
    });

    const matchedWorkloads = availableWorkloads.filter(workload => {
      return Object.entries(selectedLabels).every(
        ([key, value]) => workload.labels && workload.labels[key] === value
      );
    });

    return { matchedClusters, matchedWorkloads };
  }, [availableClusters, availableWorkloads, selectedLabels]);

  const { matchedClusters, matchedWorkloads } = getMatches();

  // Define a type for the config parameter
  interface BindingPolicyConfig {
    name?: string;
    namespace?: string;
    propagationMode?: string;
    updateStrategy?: string;
  }

  // Add function to handle simulated binding policy creation
  const handleCreateSimulatedBindingPolicy = useCallback(
    (clusterIds: string[], workloadIds: string[], config?: BindingPolicyConfig) => {
      return new Promise<void>(resolve => {
        setTimeout(() => {
          // Find the workload and cluster
          const workload = workloads.find(w => w.name === workloadIds[0]);
          const cluster = clusters.find(c => c.name === clusterIds[0]);

          if (!workload || !cluster) {
            console.error('Could not find workload or cluster');
            toast.error('Error: Could not find workload or cluster');
            resolve();
            return;
          }

          // Create a simulated policy name if not provided in config
          const policyName = config?.name || `${workload.name}-to-${cluster.name}`;
          const policyNamespace = config?.namespace || workload.namespace || 'default';

          // Create a new simulated binding policy
          const newPolicy: BindingPolicyInfo = {
            name: policyName,
            namespace: policyNamespace,
            status: 'Active',
            clusters: 1,
            workload: `${workload.kind}/${workload.name}`,
            clusterList: clusterIds,
            workloadList: workloadIds,
            creationDate: new Date().toLocaleString(),
            bindingMode: config?.propagationMode || 'DownsyncOnly',
            conditions: undefined,
            yaml: JSON.stringify(
              {
                apiVersion: 'policy.kubestellar.io/v1alpha1',
                kind: 'BindingPolicy',
                metadata: {
                  name: policyName,
                  namespace: policyNamespace,
                },
                spec: {
                  clusterSelectors: [
                    {
                      matchLabels: {
                        'kubernetes.io/cluster-name': cluster.name,
                      },
                    },
                  ],
                  downsync: [
                    {
                      apiGroup: 'apps/v1',
                      resources: [`${workload.kind.toLowerCase()}s`],
                      namespace: workload.namespace || 'default',
                      resourceNames: [workload.name],
                    },
                  ],
                  propagationMode: config?.propagationMode || 'DownsyncOnly',
                  updateStrategy: config?.updateStrategy || 'ServerSideApply',
                },
              },
              null,
              2
            ),
          };

          // Add the policy to our simulated list
          setSimulatedPolicies(prev => [...prev, newPolicy]);

          // Show success message
          setSuccessMessage(`Successfully created binding policy: ${policyName}`);

          // Resolve the promise after a short delay to simulate API call
          resolve();
        }, 800); // Simulate a network delay
      });
    },
    [workloads, clusters, setSuccessMessage, setSimulatedPolicies]
  );

  // Memoize the tab change handler to prevent rerenders
  const handleViewModeChange = useCallback(
    (_: React.SyntheticEvent, newValue: 'table' | 'selection' | 'visualize') => {
      console.log('Tab change to:', newValue, 'from:', viewMode);
      if (newValue && newValue !== viewMode) {
        setViewMode(newValue);
        if (newValue === 'selection') {
          setShowSelectionHelp(true);
        }
      }
    },
    [viewMode]
  );

  // Update methods to use React Query hooks instead of direct API calls

  // Update useEffect to set state based on React Query results
  useEffect(() => {
    // Set overall loading state based on all queries
    setLoading(bindingPoliciesLoading || workloadsLoading || clustersLoading);

    // Debug logging to understand the current state
    console.log('BP Debug - Current state:', {
      loading: bindingPoliciesLoading || workloadsLoading || clustersLoading,
      bindingPoliciesLoading,
      workloadsLoading,
      clustersLoading,
      bindingPoliciesLength: bindingPoliciesData?.length || 0,
      clustersLength: clustersData?.clusters?.length || 0,
      workloadsLength: workloadsData?.length || 0,
    });

    // Update bindingPolicies state when bindingPoliciesData changes
    if (bindingPoliciesData) {
      // Debug log to see the data structure
      console.log('Binding Policies Data:', bindingPoliciesData);

      // Ensure bindingPoliciesData is an array
      if (Array.isArray(bindingPoliciesData)) {
        setBindingPolicies(bindingPoliciesData);
      } else {
        console.warn('bindingPoliciesData is not an array:', bindingPoliciesData);
        setBindingPolicies([]);
      }
    } else if (!bindingPoliciesLoading) {
      // If no data and not loading, set to empty array
      console.log('No binding policies data and not loading, clearing state');
      setBindingPolicies([]);
    }

    // Update clusters state when clustersData changes
    if (clustersData) {
      let clusterData: ManagedCluster[] = [];

      // Process the main clusters array from the API response
      if (clustersData.clusters && Array.isArray(clustersData.clusters)) {
        clusterData = clustersData.clusters.map(cluster => {
          const status = cluster.status as { capacity?: { [key: string]: string } };
          const capacity = status?.capacity || {};

          return {
            name: cluster.name,
            status: cluster.available ? 'Ready' : 'NotReady',
            labels: cluster.labels || { 'kubernetes.io/cluster-name': cluster.name },
            metrics: {
              cpu: typeof capacity === 'object' && capacity.cpu ? capacity.cpu : 'N/A',
              memory: typeof capacity === 'object' && capacity.memory ? capacity.memory : 'N/A',
              storage:
                typeof capacity === 'object' && capacity['ephemeral-storage']
                  ? capacity['ephemeral-storage']
                  : 'N/A',
            },
            available: cluster.available,
            joined: cluster.joined,
            context: cluster.context || 'its1',
          };
        });
      }

      // Include ITS data if it exists
      if (clustersData.itsData && Array.isArray(clustersData.itsData)) {
        const itsClusterData: ManagedCluster[] = clustersData.itsData.map(
          (cluster: { name: string; labels?: { [key: string]: string } }) => ({
            name: cluster.name,
            status: 'Ready', // Default status for ITS clusters
            labels: cluster.labels || { 'kubernetes.io/cluster-name': cluster.name },
            metrics: {
              cpu: 'N/A',
              memory: 'N/A',
              storage: 'N/A',
            },
            available: true,
            joined: true,
            context: 'its1',
          })
        );

        // Merge the cluster data arrays, avoiding duplicates by name
        const existingNames = new Set(clusterData.map(c => c.name));
        const uniqueItsData = itsClusterData.filter(c => !existingNames.has(c.name));
        clusterData = [...clusterData, ...uniqueItsData];
      }

      setClusters(clusterData);
      setAvailableClusters(clusterData);
    } else {
      // If no clusters data, set to empty array
      setClusters([]);
      setAvailableClusters([]);
    }

    // Update workloads state when workloadsData changes
    if (workloadsData) {
      // Properly convert to match the Workload interface
      const workloadData = workloadsData
        .filter(workload => workload.namespace !== 'default')
        .map(workload => ({
          name: workload.name,
          kind: workload.kind,
          namespace: workload.namespace,
          creationTime: workload.creationTime,
          labels: workload.labels || {},
          replicas: workload.replicas || 0,
          status: workload.status || 'Unknown',
        }));

      // Cast the data to satisfy TypeScript
      setWorkloads(workloadData as Workload[]);
      setAvailableWorkloads(workloadData as Workload[]);
    } else {
      // If no workloads data or error, set to empty array
      setWorkloads([]);
      setAvailableWorkloads([]);
    }

    // Handle errors from binding policies query
    if (bindingPoliciesError) {
      console.error('Error fetching binding policies:', bindingPoliciesError);
      setBindingPolicies([]);
    }
  }, [
    bindingPoliciesData,
    bindingPoliciesLoading,
    bindingPoliciesError,
    clustersData,
    clustersLoading,
    workloadsData,
    workloadsLoading,
  ]);

  // Memoize the delete handlers for consistent hook usage
  const handleDeletePolicy = useCallback(async (policy: BindingPolicyInfo) => {
    setSelectedPolicy(policy);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (selectedPolicy) {
      try {
        // Use the mutation instead of direct API call
        await deleteBindingPolicyMutation.mutateAsync(selectedPolicy.name);

        // Immediately update the local state to remove the deleted policy
        setBindingPolicies(current =>
          current.filter(policy => policy.name !== selectedPolicy.name)
        );

        if (selectedPolicies.includes(selectedPolicy.name)) {
          setSelectedPolicies(current => current.filter(name => name !== selectedPolicy.name));
        }

        // Notification handled by toast in the query hook
      } catch (error) {
        console.error('Error deleting binding policy:', error);
        // Error notification handled by toast in the query hook
      } finally {
        setDeleteDialogOpen(false);
        setSelectedPolicy(null);
      }
    }
  }, [
    selectedPolicy,
    selectedPolicies,
    deleteBindingPolicyMutation,
    setDeleteDialogOpen,
    setSelectedPolicy,
    setBindingPolicies,
    setSelectedPolicies,
  ]);

  const handleCreatePolicySubmit = useCallback(
    async (policyData: PolicyData) => {
      try {
        // Log the incoming policy data
        console.log('Creating policy with data:', policyData);

        // First, try to parse the YAML to extract workload info if possible
        let workloadType = policyData.workloads || 'apps/v1';
        let namespace = 'default';

        try {
          const yamlContent = policyData.yaml;
          // Use type assertion to handle the parsed YAML structure
          interface YamlPolicy {
            metadata?: {
              name?: string;
              namespace?: string;
            };
            spec?: {
              downsync?: Array<{
                apiGroup?: string;
                namespaces?: string[];
              }>;
            };
          }

          const yaml = (await import('js-yaml')).default;
          const parsedYaml = yaml.load(yamlContent) as YamlPolicy;

          // Try to extract more specific workload info if available
          if (parsedYaml?.spec?.downsync?.[0]) {
            const downsync = parsedYaml.spec.downsync[0];
            if (downsync.apiGroup) {
              // Convert apiGroup to string if it's an array
              workloadType = Array.isArray(downsync.apiGroup)
                ? downsync.apiGroup[0]
                : downsync.apiGroup;
            }
            if (downsync.namespaces && downsync.namespaces.length > 0) {
              namespace = downsync.namespaces[0];
            }
          }

          // Extract namespace from metadata if available
          if (parsedYaml?.metadata?.namespace) {
            namespace = parsedYaml.metadata.namespace;
          }

          console.log('Extracted from YAML - workloadType:', workloadType, 'namespace:', namespace);
        } catch (error) {
          console.warn('Could not parse YAML to extract additional information:', error);
        }

        // Format the data for the API
        const formattedPolicyData = {
          name: policyData.name,
          namespace: namespace,
          workload: Array.isArray(workloadType) ? workloadType[0] : workloadType, // Ensure workload is a string
          yaml: policyData.yaml,
          bindingMode: 'DownsyncOnly',
          clusterList: [],
          workloadList: [],
        };

        // Use the mutation for creating a binding policy
        await createBindingPolicyMutation.mutateAsync(formattedPolicyData);

        setCreateDialogOpen(false);
      } catch (error) {
        console.error('Error creating binding policy:', error);
        // Still close the dialog but show error message
        setCreateDialogOpen(false);
        toast.error(
          `Error creating Binding Policy "${policyData.name}": ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
    [createBindingPolicyMutation, setCreateDialogOpen]
  );

  const handleEditPolicy = useCallback((policy: BindingPolicyInfo) => {
    setSelectedPolicy(policy);
    setEditDialogOpen(true);
  }, []);

  const handleSaveEdit = useCallback(
    async (updatedPolicy: Partial<BindingPolicyInfo>) => {
      try {
        // This would need a proper update mutation in useBPQueries
        // For now, just update the local state
        setBindingPolicies(policies =>
          policies.map(p => (p.name === updatedPolicy.name ? { ...p, ...updatedPolicy } : p))
        );
        setEditDialogOpen(false);
        setSelectedPolicy(null);
        setSuccessMessage(t('bindingPolicy.messages.updateSuccess', { name: updatedPolicy.name }));
      } catch (error) {
        console.error('Error updating binding policy:', error);
        toast.error(t('bindingPolicy.messages.updateError', { name: updatedPolicy.name }));
      }
    },
    [setBindingPolicies, setEditDialogOpen, setSelectedPolicy, setSuccessMessage, t]
  );

  // Create a memoized function for the policy assignment simulation used in the JSX
  const handleSimulatedPolicyAssign = useCallback(
    (policyName: string, targetType: string, targetName: string) => {
      // Simulate policy assignment with a hardcoded response
      setTimeout(() => {
        setSuccessMessage(
          t('bindingPolicy.messages.simulatedAssignment', {
            policy: policyName,
            targetType: targetType,
            target: targetName,
          })
        );
      }, 500);
    },
    [setSuccessMessage, t]
  );

  // Create a memoized function for the dialog close handlers
  const handlePreviewDialogClose = useCallback(
    () => setPreviewDialogOpen(false),
    [setPreviewDialogOpen]
  );
  const handleEditDialogClose = useCallback(() => setEditDialogOpen(false), [setEditDialogOpen]);
  const handleDeleteDialogClose = useCallback(
    () => setDeleteDialogOpen(false),
    [setDeleteDialogOpen]
  );

  // Add a memoized function for handling the create dialog open
  const handleCreateDialogOpen = useCallback(
    () => setCreateDialogOpen(true),
    [setCreateDialogOpen]
  );

  const handleBulkDelete = useCallback(async () => {
    try {
      // Verify we have policies selected
      if (selectedPolicies.length === 0) {
        toast.error(t('bindingPolicy.messages.noSelectedPolicies'));
        return;
      }

      console.log(`Attempting to delete ${selectedPolicies.length} policies:`, selectedPolicies);

      const validPolicyNames = selectedPolicies.filter(
        name => typeof name === 'string' && name.trim() !== ''
      );

      if (validPolicyNames.length !== selectedPolicies.length) {
        console.error(
          'Some selected policy names are invalid:',
          selectedPolicies.filter(name => !validPolicyNames.includes(name))
        );
        toast.error(t('bindingPolicy.messages.invalidPolicyNames'));
        return;
      }

      console.log('Trying a different approach: deleting each policy individually');

      const results: {
        success: string[];
        failures: string[];
      } = {
        success: [],
        failures: [],
      };

      for (const policyName of validPolicyNames) {
        try {
          console.log(`Deleting policy: ${policyName}`);
          const response = await api.delete(`/api/bp/delete/${policyName}`);
          console.log(`Success deleting policy ${policyName}:`, response.data);
          results.success.push(policyName);
        } catch (error) {
          console.error(`Error deleting policy ${policyName}:`, error);
          results.failures.push(policyName);
        }
      }

      console.log('Individual deletion results:', results);

      if (results.failures.length === 0) {
        setBindingPolicies(current =>
          current.filter(policy => !results.success.includes(policy.name))
        );
      } else {
        toast.error(
          t('bindingPolicy.messages.partialDeleteSuccess', {
            success: results.success.length,
            failures: results.failures.length,
          })
        );
      }

      setSelectedPolicies([]);

      // Force refresh the data
      deleteMultiplePoliciesMutation.reset();
      await deleteMultiplePoliciesMutation.mutateAsync([]);
    } catch (error) {
      console.error('Error deleting binding policies:', error);
      toast.error(
        t('bindingPolicy.messages.deleteError', {
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
      );
    }
  }, [
    selectedPolicies,
    setSelectedPolicies,
    setBindingPolicies,
    deleteMultiplePoliciesMutation,
    t,
  ]);

  return (
    <>
      <Paper
        sx={{
          maxWidth: '100%',
          margin: 'auto',
          p: 3,
          backgroundColor: theme === 'dark' ? '#0F172A' : '#fff',
          boxShadow: theme === 'dark' ? '0px 4px 10px rgba(0, 0, 0, 0.6)' : undefined,
          color: theme === 'dark' ? '#E5E7EB' : 'inherit',
          '& .MuiTypography-root': {
            color: theme === 'dark' ? '#E5E7EB' : undefined,
          },
          '& .MuiTypography-body2, & .MuiTypography-caption, & .MuiTypography-subtitle2': {
            color: theme === 'dark' ? '#AEBEDF' : undefined,
          },
        }}
      >
        <BPHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          createDialogOpen={createDialogOpen}
          setCreateDialogOpen={setCreateDialogOpen}
          onCreatePolicy={handleCreatePolicySubmit}
          activeFilters={activeFilters}
          setActiveFilters={setActiveFilters}
          selectedPolicies={selectedPolicies}
          onBulkDelete={handleBulkDelete}
          policyCount={filteredPolicies.length}
          clusters={clusters}
          workloads={workloads}
          filteredCount={filteredPolicies.length}
        />

        {viewMode !== 'table' && (
          <Box
            sx={{
              borderBottom: 1,
              borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'divider',
              mb: 2,
            }}
          >
            <Tabs
              value={viewMode}
              onChange={handleViewModeChange}
              aria-label="binding policy view mode"
              sx={getTabsStyles(theme)}
            >
              {/* 
            This is commented out because the Visualize tab is not working yet. So we're only showing the Table View by default no need to show it as a tab for now.
            
            <StyledTab
              iconPosition="start"
              label="Table View"
              value="table"
              sx={{
                color: theme === 'dark' ? '#E5E7EB' : undefined,
              }}
            />
            <StyledTab
              iconPosition="start"
              label="Visualize"
              value="visualize"
              sx={{
                color: theme === "dark" ? "#E5E7EB" : undefined,
              }}
            /> */}
            </Tabs>
          </Box>
        )}

        {viewMode === 'table' ? (
          <>
            {loading ? (
              <BPSkeleton rows={5} />
            ) : clusters.length === 0 && workloads.length === 0 ? (
              <EmptyState onCreateClick={() => navigate('/its')} type="both" />
            ) : !clusters.some(cluster => cluster.available === true) ? (
              <EmptyState onCreateClick={() => navigate('/its')} type="clusters" />
            ) : bindingPolicies.length === 0 ? (
              <EmptyState onCreateClick={handleCreateDialogOpen} type="policies" />
            ) : (
              // If we have binding policies, show the table regardless of workloads
              <>
                <BPTable
                  policies={paginatedPolicies}
                  clusters={clusters}
                  onDeletePolicy={handleDeletePolicy}
                  onEditPolicy={handleEditPolicy}
                  activeFilters={activeFilters}
                  setActiveFilters={setActiveFilters}
                  selectedPolicies={selectedPolicies}
                  onSelectionChange={setSelectedPolicies}
                />

                <BPPagination
                  filteredCount={filteredPolicies.length}
                  totalCount={bindingPolicies.length}
                  itemsPerPage={itemsPerPage}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </>
        ) : viewMode === 'visualize' ? (
          <>
            <Box
              sx={{
                height: 'calc(100vh - 170px)',
                minHeight: '600px',
                position: 'relative',
                border: '1px solid',
                borderColor: theme === 'dark' ? '#3B4252' : '#E5E7EB',
                borderRadius: '4px',
                overflow: 'hidden',
                backgroundColor: theme === 'dark' ? '#212633' : 'transparent',
                '& .react-flow__container': {
                  backgroundColor: 'transparent',
                },
                mb: 2,
              }}
            >
              {clusters.length === 0 && workloads.length === 0 ? (
                <EmptyState onCreateClick={() => navigate('/its')} type="both" />
              ) : !clusters.some(cluster => cluster.status === 'Ready' || cluster.available) ? (
                <EmptyState onCreateClick={() => navigate('/its')} type="clusters" />
              ) : bindingPolicies.length === 0 ? (
                <EmptyState onCreateClick={handleCreateDialogOpen} type="policies" />
              ) : workloads.length === 0 ? (
                <EmptyState onCreateClick={() => navigate('/workloads/manage')} type="workloads" />
              ) : (
                <BPVisualizationWrapper
                  policies={bindingPolicies}
                  clusters={clusters}
                  workloads={workloads}
                />
              )}
            </Box>
          </>
        ) : (
          <Box sx={{ position: 'relative' }}>
            <PolicySelection
              policies={[...bindingPolicies, ...simulatedPolicies]}
              clusters={clusters}
              workloads={workloads}
              onPolicyAssign={(policyName, targetType, targetName) => {
                handleSimulatedPolicyAssign(policyName, targetType, targetName);
              }}
              onCreateBindingPolicy={handleCreateSimulatedBindingPolicy}
            />
            <Alert
              severity="info"
              sx={{
                mt: 4,
                mb: 2,
                backgroundColor: theme === 'dark' ? 'rgba(41, 98, 255, 0.15)' : undefined,
                color: theme === 'dark' ? '#E5E7EB' : undefined,
                '& .MuiAlert-icon': {
                  color: theme === 'dark' ? '#90CAF9' : undefined,
                },
                '& .MuiTypography-root': {
                  color: theme === 'dark' ? '#E5E7EB' : undefined,
                },
              }}
            >
              <Typography variant="body2">{t('bindingPolicy.selection.infoAlert')}</Typography>
            </Alert>
          </Box>
        )}

        <PreviewDialog
          open={previewDialogOpen}
          onClose={handlePreviewDialogClose}
          matchedClusters={matchedClusters}
          matchedWorkloads={matchedWorkloads}
          policy={selectedPolicy || undefined}
        />

        {selectedPolicy && (
          <EditBindingPolicyDialog
            open={editDialogOpen}
            onClose={handleEditDialogClose}
            onSave={handleSaveEdit}
            policy={selectedPolicy}
          />
        )}

        <DeleteDialog
          open={deleteDialogOpen}
          onClose={handleDeleteDialogClose}
          onConfirm={confirmDelete}
          policyName={selectedPolicy?.name}
        />
      </Paper>
      {/* Drag & Drop Help Dialog */}
      <Dialog
        open={showSelectionHelp}
        onClose={() => setShowSelectionHelp(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: theme === 'dark' ? '#1E2130' : undefined,
            color: theme === 'dark' ? '#E5E7EB' : undefined,
          },
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : undefined,
            backgroundColor: theme === 'dark' ? '#1A1E2A' : undefined,
          }}
        >
          <Box display="flex" alignItems="center">
            <KubernetesIcon
              type="policy"
              size={24}
              sx={{ mr: 1, color: theme === 'dark' ? '#90CAF9' : undefined }}
            />
            <Typography variant="h6" sx={{ color: theme === 'dark' ? '#E5E7EB' : undefined }}>
              {t('bindingPolicy.selection.helpDialog.title')}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent
          sx={{
            py: 3,
            backgroundColor: theme === 'dark' ? '#1E2130' : undefined,
          }}
        >
          <Typography paragraph sx={{ color: theme === 'dark' ? '#E5E7EB' : undefined }}>
            {t('bindingPolicy.selection.helpDialog.intro')}
          </Typography>
          <List
            sx={{
              '& .MuiListItemIcon-root': {
                color: theme === 'dark' ? '#90CAF9' : undefined,
              },
              '& .MuiListItemText-primary': {
                color: theme === 'dark' ? '#E5E7EB' : undefined,
              },
            }}
          >
            <ListItem>
              <ListItemIcon>
                <KubernetesIcon type="cluster" size={24} />
              </ListItemIcon>
              <ListItemText
                primary={t('bindingPolicy.selection.helpDialog.steps.selectClusters')}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <KubernetesIcon type="workload" size={24} />
              </ListItemIcon>
              <ListItemText
                primary={t('bindingPolicy.selection.helpDialog.steps.selectWorkloads')}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <KubernetesIcon type="workload" size={20} />
                  <Suspense fallback={<span />}>
                    <EditIcon />
                  </Suspense>
                  <KubernetesIcon type="cluster" size={20} />
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={t('bindingPolicy.selection.helpDialog.steps.createConnection')}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Suspense fallback={<span />}>
                  <EditIcon />
                </Suspense>
              </ListItemIcon>
              <ListItemText primary={t('bindingPolicy.selection.helpDialog.steps.fillDetails')} />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Suspense fallback={<span />}>
                  <PublishIcon color="primary" />
                </Suspense>
              </ListItemIcon>
              <ListItemText primary={t('bindingPolicy.selection.helpDialog.steps.deploy')} />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions
          sx={{
            backgroundColor: theme === 'dark' ? '#1A1E2A' : undefined,
            borderTop: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : undefined,
            py: 2,
          }}
        >
          <Button onClick={() => setShowSelectionHelp(false)} variant="contained" color="primary">
            {t('bindingPolicy.selection.helpDialog.gotIt')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar removed in favor of toast notifications */}
      <Snackbar
        open={!!successMessage && !successMessage.includes('deleted successfully')}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSuccessMessage('')}
          severity="success"
          sx={{
            width: '100%',
            backgroundColor: theme === 'dark' ? '#1E4620' : undefined,
            color: theme === 'dark' ? '#E5E7EB' : undefined,
            '& .MuiAlert-icon': {
              color: theme === 'dark' ? '#81C784' : undefined,
            },
          }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default BP;
