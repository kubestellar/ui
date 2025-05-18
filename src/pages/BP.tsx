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
import BPHeader from '../components/BindingPolicy/Dialogs/BPHeader';
import BPTable from '../components/BindingPolicy/BPTable';
import BPPagination from '../components/BindingPolicy/BPPagination';
import PreviewDialog from '../components/BindingPolicy/PreviewDialog';
import DeleteDialog from '../components/BindingPolicy/Dialogs/DeleteDialog';
import EditBindingPolicyDialog from '../components/BindingPolicy/Dialogs/EditBindingPolicyDialog';
import yaml from 'js-yaml'; // Import yaml parser
import { BindingPolicyInfo, ManagedCluster, Workload } from '../types/bindingPolicy';
import useTheme from '../stores/themeStore';
// Import React Query hooks
import { useClusterQueries } from '../hooks/queries/useClusterQueries';
import { useWDSQueries } from '../hooks/queries/useWDSQueries';
import { useBPQueries } from '../hooks/queries/useBPQueries';
import { PolicyData } from '../components/BindingPolicy/CreateBindingPolicyDialog';
import BPVisualization from '../components/BindingPolicy/BPVisualization';
import PolicyDragDrop from '../components/BindingPolicy/PolicyDragDrop';
import EditIcon from '@mui/icons-material/Edit';
import PublishIcon from '@mui/icons-material/Publish';
import KubernetesIcon from '../components/BindingPolicy/KubernetesIcon';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getTabsStyles,
  StyledTab,
} from '../components/BindingPolicy/styles/CreateBindingPolicyStyles';
import { api } from '../lib/api';
import BPSkeleton from '../components/ui/BPSkeleton';

// Define EmptyState component outside of the BP component
const EmptyState: React.FC<{
  onCreateClick: () => void;
  type?: 'policies' | 'clusters' | 'workloads' | 'both';
}> = ({ onCreateClick, type = 'policies' }) => {
  const theme = useTheme(state => state.theme);
  let title = '';
  let description = '';
  let buttonText = '';

  switch (type) {
    case 'clusters':
      title = 'No Clusters Found';
      description = 'No clusters are available. Please ensure you have access to clusters.';
      buttonText = 'Go to Clusters';
      break;
    case 'workloads':
      title = 'No Workloads Found';
      description = 'No workloads are available. Please ensure you have access to workloads.';
      buttonText = 'Go to Workloads';
      break;
    case 'both':
      title = 'No Clusters or Workloads Found';
      description = 'You need both clusters and workloads to create binding policies.';
      buttonText = 'View Resources';
      break;
    case 'policies':
    default:
      title = 'No Binding Policies Found';
      description = 'Get started by creating your first binding policy';
      buttonText = 'Create Binding Policy';
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
    status?: 'Active' | 'Inactive' | 'Pending';
  }>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Check if we need to activate dragdrop view based on location state
  const initialViewMode = location.state?.activateView === 'dragdrop' ? 'dragdrop' : 'table';
  const [viewMode, setViewMode] = useState<'table' | 'dragdrop' | 'visualize'>(initialViewMode);
  const [showDragDropHelp, setShowDragDropHelp] = useState(
    location.state?.activateView === 'dragdrop'
  );

  const [clusters, setClusters] = useState<ManagedCluster[]>([]);
  const [workloads, setWorkloads] = useState<Workload[]>([]);
  const [simulatedPolicies, setSimulatedPolicies] = useState<BindingPolicyInfo[]>([]);

  // More forceful effect to ensure viewMode is set properly from location state
  useEffect(() => {
    console.log('Location state:', location.state);

    if (location.state?.activateView === 'dragdrop') {
      console.log('Setting viewMode to dragdrop from location state');
      setViewMode('dragdrop');
      setShowDragDropHelp(true);
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
    if (viewMode === 'dragdrop') {
      setShowDragDropHelp(true);
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

    return bindingPolicies.filter(policy => {
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
            setSuccessMessage('Error: Could not find workload or cluster');
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
    (_: React.SyntheticEvent, newValue: 'table' | 'dragdrop' | 'visualize') => {
      console.log('Tab change to:', newValue, 'from:', viewMode);
      if (newValue && newValue !== viewMode) {
        setViewMode(newValue);
        if (newValue === 'dragdrop') {
          setShowDragDropHelp(true);
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
    if (clustersData?.itsData) {
      const clusterData = clustersData.itsData.map(cluster => ({
        name: cluster.name,
        status: 'Ready', // Default status for ITS clusters
        labels: cluster.labels || { 'kubernetes.io/cluster-name': cluster.name },
        metrics: {
          cpu: 'N/A',
          memory: 'N/A',
          storage: 'N/A',
        },
      }));

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

        // Update UI state after successful deletion
        setSuccessMessage(`Binding Policy "${selectedPolicy.name}" deleted successfully`);
      } catch (error) {
        console.error('Error deleting binding policy:', error);
        setSuccessMessage(`Error deleting binding policy "${selectedPolicy.name}"`);
      } finally {
        setDeleteDialogOpen(false);
        setSelectedPolicy(null);
      }
    }
  }, [
    selectedPolicy,
    deleteBindingPolicyMutation,
    setSuccessMessage,
    setDeleteDialogOpen,
    setSelectedPolicy,
    setBindingPolicies,
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

        // Close the dialog and show success message
        setCreateDialogOpen(false);
        setSuccessMessage(`Binding Policy "${policyData.name}" created successfully`);
      } catch (error) {
        console.error('Error creating binding policy:', error);
        // Still close the dialog but show error message
        setCreateDialogOpen(false);
        setSuccessMessage(
          `Error creating Binding Policy "${policyData.name}": ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
    [createBindingPolicyMutation, setSuccessMessage, setCreateDialogOpen]
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
        setSuccessMessage(`Binding Policy "${updatedPolicy.name}" updated successfully`);
      } catch (error) {
        console.error('Error updating binding policy:', error);
        setSuccessMessage(`Error updating binding policy "${updatedPolicy.name}"`);
      }
    },
    [setBindingPolicies, setEditDialogOpen, setSelectedPolicy, setSuccessMessage]
  );

  // Create a memoized function for the policy assignment simulation used in the JSX
  const handleSimulatedPolicyAssign = useCallback(
    (policyName: string, targetType: string, targetName: string) => {
      // Simulate policy assignment with a hardcoded response
      setTimeout(() => {
        setSuccessMessage(`Successfully assigned ${policyName} to ${targetType} ${targetName}`);
      }, 500);
    },
    [setSuccessMessage]
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
        setSuccessMessage('No policies selected for deletion');
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
        setSuccessMessage('Error: Some selected policy names are invalid');
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

        setSuccessMessage(`Successfully deleted ${results.success.length} binding policies`);
      } else {
        setSuccessMessage(
          `Deleted ${results.success.length} policies, but failed to delete ${results.failures.length} policies`
        );
      }

      setSelectedPolicies([]);

      // Force refresh the data
      deleteMultiplePoliciesMutation.reset();
      await deleteMultiplePoliciesMutation.mutateAsync([]);
    } catch (error) {
      console.error('Error deleting binding policies:', error);
      setSuccessMessage(
        `Error deleting binding policies: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }, [
    selectedPolicies,
    setSuccessMessage,
    setSelectedPolicies,
    setBindingPolicies,
    deleteMultiplePoliciesMutation,
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
        />

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
            <StyledTab
              iconPosition="start"
              label="Table View"
              value="table"
              sx={{
                color: theme === 'dark' ? '#E5E7EB' : undefined,
              }}
            />
            {/* <StyledTab
              iconPosition="start"
              label="Visualize"
              value="visualize"
              sx={{
                color: theme === "dark" ? "#E5E7EB" : undefined,
              }}
            /> */}
          </Tabs>
        </Box>

        {viewMode === 'table' ? (
          <>
            {loading ? (
              <BPSkeleton rows={5} />
            ) : clusters.length === 0 && workloads.length === 0 ? (
              <EmptyState onCreateClick={() => navigate('/its')} type="both" />
            ) : clusters.length === 0 ? (
              <EmptyState onCreateClick={() => navigate('/its')} type="clusters" />
            ) : workloads.length === 0 ? (
              <EmptyState onCreateClick={() => navigate('/workloads/manage')} type="workloads" />
            ) : bindingPolicies.length === 0 ? (
              <EmptyState onCreateClick={handleCreateDialogOpen} type="policies" />
            ) : (
              <>
                <BPTable
                  policies={paginatedPolicies}
                  onDeletePolicy={handleDeletePolicy}
                  onEditPolicy={handleEditPolicy}
                  activeFilters={activeFilters}
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
            {clusters.length === 0 || workloads.length === 0 ? (
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
                ) : clusters.length === 0 ? (
                  <EmptyState onCreateClick={() => navigate('/its')} type="clusters" />
                ) : (
                  <EmptyState
                    onCreateClick={() => navigate('/workloads/manage')}
                    type="workloads"
                  />
                )}
              </Box>
            ) : (
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
                {bindingPolicies.length === 0 ? (
                  <EmptyState onCreateClick={handleCreateDialogOpen} type="policies" />
                ) : (
                  <BPVisualization
                    policies={bindingPolicies}
                    clusters={clusters}
                    workloads={workloads}
                  />
                )}
              </Box>
            )}
          </>
        ) : (
          <Box sx={{ position: 'relative' }}>
            <PolicyDragDrop
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
              <Typography variant="body2">
                This drag-and-drop interface is using simulated responses to create binding
                policies. Drag clusters and workloads to the canvas, then click on a workload and
                then a cluster to directly create a binding policy connection.
              </Typography>
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
        open={showDragDropHelp}
        onClose={() => setShowDragDropHelp(false)}
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
              Create Binding Policies with Direct Connections
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
            Follow these steps to create binding policies using drag and drop:
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
              <ListItemText primary="1. Drag clusters from the left panel to the canvas" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <KubernetesIcon type="workload" size={24} />
              </ListItemIcon>
              <ListItemText primary="2. Drag workloads from the right panel to the canvas" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <KubernetesIcon type="workload" size={20} />
                  <ArrowRightAltIcon fontSize="small" sx={{ mx: 0.5 }} />
                  <KubernetesIcon type="cluster" size={20} />
                </Box>
              </ListItemIcon>
              <ListItemText primary="3. Click on a workload first, then a cluster to create a direct connection" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <EditIcon />
              </ListItemIcon>
              <ListItemText primary="4. Fill in the policy details in the dialog that appears" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <PublishIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="5. Use the 'Deploy Binding Policies' button to simulate deployment" />
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
          <Button onClick={() => setShowDragDropHelp(false)} variant="contained" color="primary">
            Got it
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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
