import { useEffect, useState, useCallback } from "react";
import { Paper, Box, Snackbar, Alert, Typography, Button, Tab, Tabs, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import BPHeader from "../components/BindingPolicy/Dialogs/BPHeader";
import BPTable from "../components/BindingPolicy/BPTable";
import BPPagination from "../components/BindingPolicy/BPPagination";
import PreviewDialog from "../components/BindingPolicy/PreviewDialog";
import DeleteDialog from "../components/BindingPolicy/Dialogs/DeleteDialog";
import EditBindingPolicyDialog from "../components/BindingPolicy/Dialogs/EditBindingPolicyDialog";
import {
  BindingPolicyInfo,
  ManagedCluster,
  Workload,
} from "../types/bindingPolicy";
import useTheme from "../stores/themeStore";
import { api } from "../lib/api";
import axios from "axios";
import { PolicyData } from "../components/BindingPolicy/CreateBindingPolicyDialog";
import BPVisualization from "../components/BindingPolicy/BPVisualization";
import PolicyDragDrop from "../components/BindingPolicy/PolicyDragDrop";
import EditIcon from '@mui/icons-material/Edit';
import PublishIcon from '@mui/icons-material/Publish';
import KubernetesIcon from '../components/BindingPolicy/KubernetesIcon';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
// Define type for the raw binding policy from API
interface RawBindingPolicy {
  metadata: {
    name: string;
    creationTimestamp?: string;
    managedFields?: Array<{
      time?: string;
    }>;
    annotations?: {
      yaml?: string;
    };
  };
  spec: {
    clusterSelectors?: Array<unknown>;
    downsync?: Array<{
      apiGroup?: string;
    }>;
  };
}

// Define EmptyState component outside of the BP component
const EmptyState: React.FC<{ onCreateClick: () => void }> = ({ onCreateClick }) => (
  <Box 
    sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      py: 8,
      textAlign: 'center'
    }}
  >
    <Typography variant="h6" color="text.primary" gutterBottom>
      No Binding Policies Found
    </Typography>
    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
      Get started by creating your first binding policy
    </Typography>
    <Button 
      variant="contained" 
      color="primary"
      onClick={onCreateClick}
    >
      Create Binding Policy
    </Button>
  </Box>
);

// Create a separate LoadingIndicator component outside of the BP component
const LoadingIndicator: React.FC = () => (
  <Box sx={{ textAlign: "center", color: "text.secondary", py: 3 }}>
    Loading KubeStellar Binding Policies...
  </Box>
);

const BP = () => {
  console.log('BP component rendering');
  
  // Add all state variables first, before any conditional logic
  const theme = useTheme((state) => state.theme);
  const [bindingPolicies, setBindingPolicies] = useState<BindingPolicyInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLabels] = useState<Record<string, string>>({});
  const [availableClusters, setAvailableClusters] = useState<ManagedCluster[]>([]);
  const [availableWorkloads, setAvailableWorkloads] = useState<Workload[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<BindingPolicyInfo | null>(null);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<{ status?: "Active" | "Inactive" | "Pending"; }>({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [viewMode, setViewMode] = useState<'table' | 'dragdrop' | 'visualize'>('table');
  const [clusters, setClusters] = useState<ManagedCluster[]>([]);
  const [workloads, setWorkloads] = useState<Workload[]>([]);
  const [simulatedPolicies, setSimulatedPolicies] = useState<BindingPolicyInfo[]>([]);
  
  // State for deployment dialog and process
  // const [, setDeploymentDialogOpen] = useState(false);
  // const [, setDeploymentLoading] = useState(false);
  // const [, setDeploymentError] = useState<string | null>(null);
  // const [policiesToDeploy, setPoliciesToDeploy] = useState<DeploymentPolicy[]>([]);
  
  // Add canvas store for connections - ensure this is at the top level
 // const connectionLines = useCanvasStore(state => state.connectionLines);
  
  // Calculate filtered policies at the top level, not in a nested function
  const getFilteredPolicies = useCallback(() => {
    return bindingPolicies.filter((policy) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        policy.name.toLowerCase().includes(searchLower) ||
        policy.workload.toLowerCase().includes(searchLower) ||
        policy.status.toLowerCase().includes(searchLower);

      const matchesStatus =
        !activeFilters.status || policy.status === activeFilters.status;

      return matchesSearch && matchesStatus;
    });
  }, [bindingPolicies, searchQuery, activeFilters.status]);
  
  const filteredPolicies = getFilteredPolicies();
  const paginatedPolicies = filteredPolicies.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Calculate matches at the top level
  const getMatches = useCallback(() => {
    const matchedClusters = availableClusters.filter((cluster) => {
      return Object.entries(selectedLabels).every(
        ([key, value]) => cluster.labels[key] === value
      );
    });

    const matchedWorkloads = availableWorkloads.filter((workload) => {
      return Object.entries(selectedLabels).every(
        ([key, value]) => workload.labels[key] === value
      );
    });

    return { matchedClusters, matchedWorkloads };
  }, [availableClusters, availableWorkloads, selectedLabels]);
  
  const { matchedClusters, matchedWorkloads } = getMatches();
  
  // Hardcoded sample data for clusters and workloads 
  const sampleClusters = useState<ManagedCluster[]>(() => [
    {
      name: "cluster-east",
      status: "Ready",
      labels: {
        region: "east",
        environment: "production",
        "kubernetes.io/cluster-name": "cluster-east"
      },
      metrics: {
        cpu: "65%",
        memory: "48%",
        storage: "32%"
      }
    },
    {
      name: "cluster-west",
      status: "Ready",
      labels: {
        region: "west",
        environment: "staging",
        "kubernetes.io/cluster-name": "cluster-west"
      },
      metrics: {
        cpu: "42%",
        memory: "37%",
        storage: "28%"
      }
    },
    {
      name: "cluster-central",
      status: "Ready",
      labels: {
        region: "central",
        environment: "production",
        "kubernetes.io/cluster-name": "cluster-central"
      },
      metrics: {
        cpu: "78%",
        memory: "56%",
        storage: "45%"
      }
    }
  ])[0];
  
  const sampleWorkloads = useState<Workload[]>(() => [
    {
      name: "nginx-frontend",
      type: "Deployment",
      namespace: "web",
      creationTime: new Date().toISOString(),
      labels: {
        app: "frontend",
        tier: "web",
        component: "nginx"
      }
    },
    {
      name: "redis-cache",
      type: "StatefulSet",
      namespace: "data",
      creationTime: new Date().toISOString(),
      labels: {
        app: "cache",
        tier: "data",
        component: "redis"
      }
    },
    {
      name: "postgres-db",
      type: "StatefulSet",
      namespace: "data",
      creationTime: new Date().toISOString(),
      labels: {
        app: "database",
        tier: "data",
        component: "postgres"
      }
    },
    {
      name: "backend-api",
      type: "Deployment",
      namespace: "api",
      creationTime: new Date().toISOString(),
      labels: {
        app: "backend",
        tier: "application",
        component: "api"
      }
    }
  ])[0];

  // Define a type for the config parameter
  interface BindingPolicyConfig {
    name?: string;
    namespace?: string;
    propagationMode?: string;
    updateStrategy?: string;
  }
  
  // Add function to handle simulated binding policy creation
  const handleCreateSimulatedBindingPolicy = useCallback((clusterId: string, workloadId: string, config?: BindingPolicyConfig) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Find the workload and cluster
        const workload = workloads.find(w => w.name === workloadId);
        const cluster = clusters.find(c => c.name === clusterId);
        
        if (!workload || !cluster) {
          console.error("Could not find workload or cluster");
          setSuccessMessage("Error: Could not find workload or cluster");
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
          status: "Active",
          clusters: 1,
          workload: `${workload.type}/${workload.name}`,
          clusterList: [cluster.name],
          workloadList: [workload.name],
          creationDate: new Date().toLocaleString(),
          bindingMode: config?.propagationMode || "DownsyncOnly",
          conditions: undefined,
          yaml: JSON.stringify({
            apiVersion: "policy.kubestellar.io/v1alpha1",
            kind: "BindingPolicy",
            metadata: {
              name: policyName,
              namespace: policyNamespace
            },
            spec: {
              clusterSelectors: [
                {
                  matchLabels: {
                    'kubernetes.io/cluster-name': cluster.name
                  }
                }
              ],
              downsync: [
                {
                  apiGroup: "apps/v1",
                  resources: [`${workload.type.toLowerCase()}s`],
                  namespace: workload.namespace || "default",
                  resourceNames: [workload.name]
                }
              ],
              propagationMode: config?.propagationMode || "DownsyncOnly",
              updateStrategy: config?.updateStrategy || "ServerSideApply"
            }
          }, null, 2)
        };
        
        // Add the policy to our simulated list
        setSimulatedPolicies(prev => [...prev, newPolicy]);
        
        // Show success message
        setSuccessMessage(`Successfully created binding policy: ${policyName}`);
        
        // Resolve the promise after a short delay to simulate API call
        resolve();
      }, 800); // Simulate a network delay
    });
  }, [workloads, clusters, setSuccessMessage, setSimulatedPolicies]);

  // Memoize the tab change handler to prevent rerenders
  const handleViewModeChange = useCallback((_: React.SyntheticEvent, newValue: 'table' | 'dragdrop' | 'visualize') => {
    if (newValue && newValue !== viewMode) {
      setViewMode(newValue);
      if (newValue === 'dragdrop') {
        setShowDragDropHelp(true);
      }
    }
  }, [viewMode]);

  // Extract the fetch binding policies 
 // Updated fetchBindingPolicies function to handle 500 errors gracefully
const fetchBindingPolicies = useCallback(async () => {
  try {
    setLoading(true);
    const response = await api.get("/api/bp");
    const data = response.data;

    if (data.error) {
      throw new Error(data.error);
    }

    // If there are no binding policies, return an empty array
    if (!data.bindingPolicies || data.bindingPolicies.length === 0) {
      setBindingPolicies([]);
      return;
    }

    // Fetch status for each binding policy
    const policiesWithStatus = await Promise.all(
      data.bindingPolicies.map(async (policy: RawBindingPolicy) => {
        try {
          const statusResponse = await api.get(
            `/api/bp/status?name=${policy.metadata.name}`
          );

          // Use the data directly from the status response
          const statusData = statusResponse.data;

          return {
            name: policy.metadata.name,
            // Use clusters from the status API
            clusters: statusData.clusters?.length || 0,
            // Use the actual clusters from the API
            clusterList: statusData.clusters || [],
            // Use actual workloads from the API
            workloadList: statusData.workloads || [],
            // Create a workload display string
            workload:
              statusData.workloads?.length > 0
                ? statusData.workloads[0]
                : "No workload specified",
            creationDate: policy.metadata.creationTimestamp
              ? new Date(policy.metadata.creationTimestamp).toLocaleString()
              : "Unknown",
            lastModifiedDate: policy.metadata.managedFields?.[0]?.time
              ? new Date(
                  policy.metadata.managedFields[0].time
                ).toLocaleString()
              : undefined,
            // Map status from API to component status with proper capitalization
            status:
              statusData.status === "active"
                ? "Active"
                : statusData.status === "pending"
                ? "Pending"
                : "Inactive",
            // Store the binding mode from the API
            bindingMode: statusData.bindingMode || "N/A",
            // Store the namespace from the API
            namespace: statusData.namespace || "default",
            // Store any conditions returned by the API
            conditions: statusData.conditions || undefined,
            yaml:
              policy.metadata.annotations?.yaml ||
              JSON.stringify(policy, null, 2),
          };
        } catch (error) {
          console.error(
            `Error fetching status for ${policy.metadata.name}:`,
            error
          );
          return {
            name: policy.metadata.name,
            clusters: policy.spec.clusterSelectors?.length || 0,
            clusterList: [],
            workloadList: [],
            workload:
              policy.spec.downsync?.[0]?.apiGroup || "No workload specified",
            creationDate: policy.metadata.creationTimestamp
              ? new Date(policy.metadata.creationTimestamp).toLocaleString()
              : "Unknown",
            lastModifiedDate: policy.metadata.managedFields?.[0]?.time
              ? new Date(
                  policy.metadata.managedFields[0].time
                ).toLocaleString()
              : undefined,
            status: "Inactive", 
            bindingMode: "N/A",
            namespace: "default",
            conditions: null,
            yaml:
              policy.metadata.annotations?.yaml ||
              JSON.stringify(policy, null, 2),
          };
        }
      })
    );

    setBindingPolicies(policiesWithStatus);
  } catch (error: unknown) {
    console.error("Error fetching binding policies:", error);
    // Handle 500 errors gracefully
    if (axios.isAxiosError(error) && error.response?.status === 500) {
      console.warn("Server returned 500 error, likely no binding policies exist");
      setBindingPolicies([]);
    }
  } finally {
    setLoading(false);
  }
}, []);

  // Modified fetchClusters to only use ITS data
  const fetchClusters = useCallback(async () => {
    try {
      const response = await api.get('/api/clusters');
      console.log('API Response:', response.data);
      
      let clusterData: ManagedCluster[] = [];
      
      // Define interface for ITS cluster data with additional fields
      interface ITSCluster {
        name: string;
        labels?: Record<string, string>;
        creationTime?: string;
        context?: string;
      }
      
      // Only process ITS clusters if available
      if (response.data && response.data.itsData && Array.isArray(response.data.itsData)) {
        clusterData = response.data.itsData.map((cluster: ITSCluster) => ({
          name: cluster.name,
          status: 'Ready', // Default status for ITS clusters
          labels: cluster.labels || { 'kubernetes.io/cluster-name': cluster.name },
          metrics: {
            cpu: 'N/A',
            memory: 'N/A',
            storage: 'N/A'
          },
          // Include additional fields that might be useful elsewhere
          creationTime: cluster.creationTime,
          context: cluster.context
        }));
      }
      
      // If no ITS clusters found, use sample data
      if (clusterData.length === 0) {
        console.warn("No ITS clusters found in API response, using sample data");
        clusterData = sampleClusters;
      }
      
      setClusters(clusterData);
      setAvailableClusters(clusterData);
      console.log("Fetched ITS clusters:", clusterData);
    } catch (error) {
      console.error('Error fetching clusters:', error);
      // Use sample data if API fails
      console.log("Using sample cluster data instead");
      setClusters(sampleClusters);
      setAvailableClusters(sampleClusters);
    }
  }, [sampleClusters]);
  
  // Modified fetchWorkloads to use sample data if API fails
  const fetchWorkloads = useCallback(async () => {
    try {
      const response = await api.get('/api/wds/workloads');
      
      // Define interface for API workload data
      interface ApiWorkload {
        name: string;
        kind: string;
        namespace: string;
        creationTime: string;
        labels?: Record<string, string>;
      }
      
      // Map the response data directly since it's already in the correct format
      const workloadData = response.data.map((workload: ApiWorkload) => ({
        name: workload.name,
        type: workload.kind,
        namespace: workload.namespace,
        creationTime: workload.creationTime,
        labels: workload.labels || {} // Use empty object if labels are not provided
      }));
      
      setWorkloads(workloadData);
      setAvailableWorkloads(workloadData);
      console.log("Fetched workloads:", workloadData);
    } catch (error) {
      console.error('Error fetching workloads:', error);
      // Use sample data if API fails
      console.log("Using sample workload data instead");
      setWorkloads(sampleWorkloads);
      setAvailableWorkloads(sampleWorkloads);
    }
  }, [sampleWorkloads]);

  useEffect(() => {
    setAvailableClusters([]);
    setAvailableWorkloads([]);

    // Initial data fetch
    fetchBindingPolicies();
    fetchClusters();
    fetchWorkloads();
  }, [fetchBindingPolicies, fetchClusters, fetchWorkloads]);

  // Memoize the delete handlers for consistent hook usage
  const handleDeletePolicy = useCallback(async (policy: BindingPolicyInfo) => {
    setSelectedPolicy(policy);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (selectedPolicy) {
      try {
        // Call the API to delete the policy
        await api.delete(
          `/api/bp/delete/${selectedPolicy.name}`
        );

        // Update UI state after successful deletion
        await fetchBindingPolicies(); // Refresh the list after deletion
        setSuccessMessage(
          `Binding Policy "${selectedPolicy.name}" deleted successfully`
        );
      } catch (error) {
        console.error("Error deleting binding policy:", error);
        setSuccessMessage(
          `Error deleting binding policy "${selectedPolicy.name}"`
        );
      } finally {
        setDeleteDialogOpen(false);
        setSelectedPolicy(null);
      }
    }
  }, [selectedPolicy, fetchBindingPolicies, setSuccessMessage, setDeleteDialogOpen, setSelectedPolicy]);

  const handleCreatePolicySubmit = useCallback(async (policyData: PolicyData) => {
    try {
      setCreateDialogOpen(false);

      // Set a success message
      setSuccessMessage(
        `Binding Policy "${policyData.name}" created successfully`
      );

      // Refresh the binding policies list
      await fetchBindingPolicies();
    } catch (error) {
      console.error("Error refreshing after policy creation:", error);
      setSuccessMessage(
        `Binding Policy "${policyData.name}" created, but there was an error refreshing the list`
      );
    }
  }, [fetchBindingPolicies, setSuccessMessage, setCreateDialogOpen]);

  const handleEditPolicy = useCallback((policy: BindingPolicyInfo) => {
    setSelectedPolicy(policy);
    setEditDialogOpen(true);
  }, []);

  const handleSaveEdit = useCallback(async (updatedPolicy: Partial<BindingPolicyInfo>) => {
    try {
      setBindingPolicies((policies) =>
        policies.map((p) =>
          p.name === updatedPolicy.name ? { ...p, ...updatedPolicy } : p
        )
      );
      setEditDialogOpen(false);
      setSelectedPolicy(null);
      setSuccessMessage(
        `Binding Policy "${updatedPolicy.name}" updated successfully`
      );
    } catch (error) {
      console.error("Error updating binding policy:", error);
      setSuccessMessage(
        `Error updating binding policy "${updatedPolicy.name}"`
      );
    }
  }, [setBindingPolicies, setEditDialogOpen, setSelectedPolicy, setSuccessMessage]);

  const handlePreviewPolicy = useCallback((policy: BindingPolicyInfo) => {
    setSelectedPolicy(policy);
    setPreviewDialogOpen(true);
  }, []);

  // Create a memoized function for the policy assignment simulation used in the JSX
  const handleSimulatedPolicyAssign = useCallback((policyName: string, targetType: string, targetName: string) => {
    // Simulate policy assignment with a hardcoded response
    setTimeout(() => {
      setSuccessMessage(`Successfully assigned ${policyName} to ${targetType} ${targetName}`);
    }, 500);
  }, [setSuccessMessage]);

  // Create a memoized function for the dialog close handlers
  const handlePreviewDialogClose = useCallback(() => setPreviewDialogOpen(false), [setPreviewDialogOpen]);
  const handleEditDialogClose = useCallback(() => setEditDialogOpen(false), [setEditDialogOpen]);
  const handleDeleteDialogClose = useCallback(() => setDeleteDialogOpen(false), [setDeleteDialogOpen]);

  // Add a memoized function for handling the create dialog open
  const handleCreateDialogOpen = useCallback(() => setCreateDialogOpen(true), [setCreateDialogOpen]);

  // Memoize handlePolicyAssign to ensure consistent hook usage
  // const handlePolicyAssign = useCallback(async (policyName: string, targetType: 'cluster' | 'workload', targetName: string) => {
  //   try {
  //     // Find the policy
  //     const policy = bindingPolicies.find(p => p.name === policyName);
  //     if (!policy) {
  //       console.error(`Policy ${policyName} not found`);
  //       setSuccessMessage(`Error: Policy ${policyName} not found`);
  //       return;
  //     }
  
  //     // Prepare the update data based on target type
  //     let updateData: any = { spec: {} };
      
  //     if (targetType === 'cluster') {
  //       // For cluster assignment
  //       // First get existing cluster selectors if any
  //       const existingSelectors = policy.clusterList ? 
  //         policy.clusterList.map(clusterName => ({
  //           matchLabels: { 'kubernetes.io/cluster-name': clusterName }
  //         })) : [];
        
  //       // Add the new cluster selector if it doesn't exist already
  //       if (!policy.clusterList?.includes(targetName)) {
  //         updateData.spec.clusterSelectors = [
  //           ...existingSelectors,
  //           {
  //             matchLabels: {
  //               'kubernetes.io/cluster-name': targetName
  //             }
  //           }
  //         ];
  //       } else {
  //         // No change needed, cluster already assigned
  //         setSuccessMessage(`Cluster ${targetName} is already assigned to policy ${policyName}`);
  //         return;
  //       }
  //     } else if (targetType === 'workload') {
  //       // For workload assignment
  //       // Parse workload information (format could be "type/name" or just "name")
  //       let workloadType = 'Deployment'; // Default type
  //       let workloadName = targetName;
        
  //       if (targetName.includes('/')) {
  //         [workloadType, workloadName] = targetName.split('/');
  //       }
        
  //       // Find the workload to get its namespace
  //       const workloadObj = workloads.find(w => w.name === workloadName);
  //       const namespace = workloadObj?.namespace || 'default';
        
  //       // Prepare downsync configuration based on your API
  //       updateData.spec.downsync = [{
  //         apiGroup: 'apps/v1',
  //         resources: [workloadType.toLowerCase() + 's'],  // pluralize resource type
  //         namespace: namespace,
  //         resourceNames: [workloadName]
  //       }];
  //     } else {
  //       throw new Error(`Unknown target type: ${targetType}`);
  //     }
  
  //     // Use the correct API endpoint from your API list
  //     // The API endpoint is /api/bp/update/:name 
  //     await api.patch(`/api/bp/update/${policyName}`, updateData);
  
  //     // Show success message
  //     setSuccessMessage(`Successfully assigned ${policyName} to ${targetType} ${targetName}`);
  
  //     // Refresh the binding policies to see the updated assignments
  //     await fetchBindingPolicies();
  //   } catch (error) {
  //     console.error('Error assigning policy:', error);
  //     setSuccessMessage(`Error assigning policy: ${error instanceof Error ? error.message : String(error)}`);
  //   }
  // }, [bindingPolicies, workloads, setSuccessMessage, fetchBindingPolicies]);

  const handleBulkDelete = useCallback(async () => {
    try {
      // Delete each selected policy
      await Promise.all(
        selectedPolicies.map(policyName =>
          api.delete(`/api/bp/delete/${policyName}`)
        )
      );

      // Update UI state after successful deletion
      await fetchBindingPolicies();
      setSuccessMessage(
        `Successfully deleted ${selectedPolicies.length} binding policies`
      );
      setSelectedPolicies([]);
    } catch (error) {
      console.error("Error deleting binding policies:", error);
      setSuccessMessage(
        `Error deleting binding policies`
      );
    }
  }, [selectedPolicies, fetchBindingPolicies, setSuccessMessage, setSelectedPolicies]);

  // Properly memoize prepareForDeployment with correct dependencies
  // const prepareForDeployment = useCallback(() => {
  //   // Generate policies from connection lines
  //   const policies = connectionLines.map(line => {
  //     // Extract workload and cluster IDs from the connection line
  //     const workloadId = line.source.startsWith('workload-') 
  //       ? line.source.replace('workload-', '') 
  //       : line.target.replace('workload-', '');
      
  //     const clusterId = line.source.startsWith('cluster-') 
  //       ? line.source.replace('cluster-', '') 
  //       : line.target.replace('cluster-', '');
      
  //     // Find the workload and cluster
  //     const workload = workloads.find(w => w.name === workloadId);
  //     const cluster = clusters.find(c => c.name === clusterId);
      
  //     if (!workload || !cluster) {
  //       console.error('Could not find workload or cluster for connection:', line);
  //       return null;
  //     }
      
  //     // Create a unique policy name if it doesn't exist
  //     const policyName = `${workload.name}-to-${cluster.name}`;
      
  //     // Create a default configuration
  //     const config: PolicyConfiguration = {
  //       name: policyName,
  //       namespace: workload.namespace || 'default',
  //       propagationMode: 'DownsyncOnly',
  //       updateStrategy: line.color === '#2196f3' ? 'RollingUpdate' :
  //                      line.color === '#009688' ? 'BlueGreenDeployment' :
  //                      line.color === '#ff9800' ? 'ForceApply' : 'ServerSideApply',
  //       deploymentType: 'SelectedClusters',
  //       schedulingRules: [],
  //       customLabels: {},
  //       tolerations: []
  //     };
      
  //     // Generate YAML for the policy
  //     const yaml = generateBindingPolicyYAML(config);
      
  //     return {
  //       id: uuidv4(), // Generate a unique ID
  //       name: policyName,
  //       workloadId,
  //       clusterId,
  //       workloadName: workload.name,
  //       clusterName: cluster.name,
  //       config,
  //       yaml
  //     };
  //   }).filter(Boolean) as DeploymentPolicy[];
    
  //   setPoliciesToDeploy(policies);
  //   setDeploymentDialogOpen(true);
  // }, [connectionLines, workloads, clusters, setPoliciesToDeploy, setDeploymentDialogOpen]);

  // Properly memoize handleDeploymentConfirm with correct dependencies
  // const handleDeploymentConfirm = useCallback(async () => {
  //   if (policiesToDeploy.length === 0) {
  //     setDeploymentError('No policies to deploy');
  //     return;
  //   }
    
  //   setDeploymentLoading(true);
  //   setDeploymentError(null);
    
  //   try {
  //     // Simulate API call delay
  //     await new Promise(resolve => setTimeout(resolve, 2000));
      
  //     // Process all policies - in our simulation we'll assume all succeed
  //     policiesToDeploy.forEach(policy => {
  //       // Create a simulated binding policy
  //       const newPolicy: BindingPolicyInfo = {
  //         name: policy.name,
  //         namespace: policy.config.namespace,
  //         status: "Active",
  //         clusters: 1,
  //         workload: `${policy.workloadName}`,
  //         clusterList: [policy.clusterName],
  //         workloadList: [policy.workloadName],
  //         creationDate: new Date().toLocaleString(),
  //         bindingMode: policy.config.propagationMode,
  //         conditions: null,
  //         yaml: policy.yaml
  //       };
        
  //       // Add to our simulated policies
  //       setSimulatedPolicies(prev => {
  //         // Check if policy already exists
  //         const exists = prev.some(p => p.name === newPolicy.name);
  //         if (exists) {
  //           return prev.map(p => p.name === newPolicy.name ? newPolicy : p);
  //         } else {
  //           return [...prev, newPolicy];
  //         }
  //       });
  //     });
      
  //     // Show success message
  //     setSuccessMessage(`Successfully deployed ${policiesToDeploy.length} binding policies`);
  //     setDeploymentDialogOpen(false);
  //   } catch (error) {
  //     console.error('Error in simulated deployment:', error);
  //     setDeploymentError(
  //       error instanceof Error 
  //         ? error.message 
  //         : 'Failed to deploy binding policies. Please try again.'
  //     );
  //   } finally {
  //     setDeploymentLoading(false);
  //   }
  // }, [policiesToDeploy, setSimulatedPolicies, setSuccessMessage, setDeploymentDialogOpen, setDeploymentError, setDeploymentLoading]);
 //  state variable for the drag & drop help dialog
 const [showDragDropHelp, setShowDragDropHelp] = useState(false);
  // Modify the conditional return for loading to use the component:
  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <>
      <Paper
        sx={{
          maxWidth: "100%",
          margin: "auto",
          p: 3,
          backgroundColor: theme === "dark" ? "#1F2937" : "#fff",
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs 
            value={viewMode} 
            onChange={handleViewModeChange}
            aria-label="binding policy view mode"
          >
            <Tab label="Table View" value="table" />
            <Tab label="Visualize" value="visualize" />
            <Tab label="Drag & Drop" value="dragdrop" />
            
          </Tabs>
        </Box>

        {viewMode === 'table' ? (
          <>
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
            />

            {bindingPolicies.length === 0 ? (
              <EmptyState onCreateClick={handleCreateDialogOpen} />
            ) : (
              <>
                <BPTable
                  policies={paginatedPolicies}
                  onPreviewMatches={(policy) => handlePreviewPolicy(policy)}
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
          <Box 
            sx={{ 
              height: 'calc(100vh - 170px)', 
              minHeight: '600px',
              position: 'relative',
              border: '1px solid',
              borderColor: theme === 'dark' ? '#374151' : '#E5E7EB',
              borderRadius: '4px',
              overflow: 'hidden',
              '& .react-flow__container': {
                backgroundColor: 'transparent',
              },
              mb: 2
            }}
          >
            <BPVisualization 
              policies={bindingPolicies} 
              clusters={clusters} 
              workloads={workloads} 
            />
          </Box>
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
            <Alert severity="info" sx={{ mt: 4, mb: 2 }}>
              <Typography variant="body2">
                This drag-and-drop interface is using simulated responses to create binding policies.
                Drag clusters and workloads to the canvas, then click on a workload and then a cluster to directly create a binding policy connection.
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
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <KubernetesIcon type="policy" size={24} sx={{ mr: 1 }} />
            <Typography variant="h6">Create Binding Policies with Direct Connections</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography paragraph>
            Follow these steps to create binding policies using drag and drop:
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon><KubernetesIcon type="cluster" size={24} /></ListItemIcon>
              <ListItemText primary="1. Drag clusters from the left panel to the canvas" />
            </ListItem>
            <ListItem>
              <ListItemIcon><KubernetesIcon type="workload" size={24} /></ListItemIcon>
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
              <ListItemIcon><EditIcon /></ListItemIcon>
              <ListItemText primary="4. Fill in the policy details in the dialog that appears" />
            </ListItem>
            <ListItem>
              <ListItemIcon><PublishIcon color="primary" /></ListItemIcon>
              <ListItemText primary="5. Use the 'Deploy Binding Policies' button to simulate deployment" />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowDragDropHelp(false)}
            variant="contained" 
            color="primary"
          >
            Got it
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSuccessMessage("")}
          severity="success"
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default BP;