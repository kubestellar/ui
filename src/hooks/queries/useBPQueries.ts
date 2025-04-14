import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { BindingPolicyInfo } from '../../types/bindingPolicy';

interface RawBindingPolicy {
  kind: string;
  apiVersion: string;
  metadata: {
    name: string;
    uid: string;
    resourceVersion: string;
    generation: number;
    creationTimestamp: string;
    annotations?: {
      yaml?: string;
    };
    finalizers?: string[];
    managedFields?: Array<{
      manager: string;
      operation: string;
      apiVersion: string;
      time?: string;
      fieldsType?: string;
      fieldsV1?: Record<string, unknown>;
    }>;
  };
  spec: {
    clusterSelectors?: Array<ClusterSelector>;
    downsync?: Array<DownsyncItem>;
  };
  status?: string;
  bindingMode?: string;
  clusters?: string[];
  workloads?: string[];
  clustersCount?: number;
  workloadsCount?: number;
  name?: string;
  namespace?: string;
  creationTimestamp?: string;
  yaml?: string;
  clusterList?: string[];
  workloadList?: string[];
  conditions?: unknown;
}

interface ClusterSelector {
  matchLabels?: Record<string, string>;
}

interface DownsyncItem {
  apiGroup?: string;
  namespaces?: string[];
}

// Resource configuration with createOnly option
interface ResourceConfig {
  type: string;
  createOnly: boolean;
}

interface GenerateYamlRequest {
  workloadLabels: Record<string, string>;
  clusterLabels: Record<string, string>;
  resources: ResourceConfig[];
  namespacesToSync?: string[];
  namespace?: string;
  policyName?: string;
}

interface QuickConnectRequest {
  workloadLabels: Record<string, string>;
  clusterLabels: Record<string, string>;
  resources: ResourceConfig[];
  namespacesToSync?: string[];
  policyName?: string;
  namespace?: string;
}

interface GenerateYamlResponse {
  bindingPolicy: {
    bindingMode: string;
    clusters: string[];
    clustersCount: number;
    name: string;
    namespace: string;
    status: string;
    workloads: string[];
    workloadsCount: number;
  };
  yaml: string;
}

interface QuickConnectResponse {
  bindingPolicy: {
    bindingMode: string;
    clusters: string[];
    clustersCount: number;
    name: string;
    namespace: string;
    status: string;
    workloads: string[];
    workloadsCount: number;
    yaml: string;
  };
  message: string;
}

export const useBPQueries = () => {
  const queryClient = useQueryClient();

  // GET /api/bp - Fetch all binding policies
  const useBindingPolicies = () => {
    const queryResult = useQuery<BindingPolicyInfo[], Error>({
      queryKey: ['binding-policies'],
      queryFn: async () => {
        const response = await api.get('/api/bp');
        console.log("Response:", response.data);
        
        // Check if data exists and has bindingPolicies property
        let rawPolicies: RawBindingPolicy[] = [];
        
        if (response.data && response.data.bindingPolicies) {
          // API returns { bindingPolicies: [...] } structure
          rawPolicies = response.data.bindingPolicies;
        } else if (Array.isArray(response.data)) {
          // API directly returns an array
          rawPolicies = response.data;
        } else {
          // API returns unexpected format, log and return empty array
          console.warn("Unexpected API response format:", response.data);
          return [];
        }
        
        console.log("Raw binding policies:", rawPolicies);
        
        // Transform the raw binding policies to the expected format
        return rawPolicies.map(policy => {
          // Capitalize the first letter of status
          const capitalizeStatus = (status: string): string => {
            if (!status) return 'Inactive';
            return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
          };
          
          // Use the raw YAML content directly from the response
          const yamlContent = policy.yaml || '';
          
          // Extract clusters information - use already processed data if available
          const clusterList = policy.clusterList || policy.clusters || [];
          
          // Extract workloads information - use already processed data if available
          const workloadList = policy.workloadList || policy.workloads || ['No workload specified'];
          
          // Determine main workload for display in the table
          const mainWorkload = workloadList.length > 0 ? workloadList[0] : 'No workload specified';
          
          console.log(`Policy ${policy.name} YAML exists: ${!!yamlContent}`);
          
          return {
            name: policy.name || 'Unknown',
            namespace: policy.namespace || 'default',
            status: capitalizeStatus(policy.status || 'inactive'),
            clusters: policy.clustersCount || clusterList.length,
            workload: mainWorkload,
            clusterList: clusterList,
            workloadList: workloadList,
            creationDate: policy.creationTimestamp ? new Date(policy.creationTimestamp).toLocaleString() : 'Not available',
            bindingMode: policy.bindingMode || 'DownsyncOnly',
            conditions: policy.conditions || undefined,
            yaml: yamlContent,  // Use the raw YAML content directly
            creationTimestamp: policy.creationTimestamp
          } as BindingPolicyInfo;
        });
      },
      // Default to empty array if there's an error
      placeholderData: [],
    });

    if (queryResult.error) {
      toast.error('Failed to fetch binding policies');
      console.error('Error fetching binding policies:', queryResult.error);
    }

    return queryResult;
  };

  // GET policy details with YAML from /api/bp and status from /api/bp/status
  const useBindingPolicyDetails = (policyName: string | undefined) => {
    return useQuery<BindingPolicyInfo, Error>({
      queryKey: ['binding-policy-details', policyName],
      queryFn: async () => {
        if (!policyName) throw new Error('Policy name is required');
        
        console.log(`Fetching complete details for binding policy: ${policyName}`);
        
        // Fetch data from both endpoints in parallel for efficiency
        const [mainResponse, statusResponse] = await Promise.all([
          // Get full policy data including YAML from main BP endpoint
          api.get('/api/bp', {
            params: { _t: new Date().getTime() } // Cache-busting
          }),
          
          // Get latest status from the status endpoint
          api.get(`/api/bp/status?name=${encodeURIComponent(policyName)}`, {
            params: { _t: new Date().getTime() } // Cache-busting
          })
        ]);
        
        console.log('Received responses from both API endpoints');
        
        // Process main response to get the policy details with YAML
        let rawPolicies = [];
        if (mainResponse.data && mainResponse.data.bindingPolicies) {
          rawPolicies = mainResponse.data.bindingPolicies;
        } else if (Array.isArray(mainResponse.data)) {
          rawPolicies = mainResponse.data;
        } else {
          console.warn("Unexpected main API response format:", mainResponse.data);
          throw new Error('Unable to parse binding policies response');
        }
        
        // Find the specific policy by name
        const policyDetails = rawPolicies.find((p: RawBindingPolicy) => p.name === policyName);
        
        if (!policyDetails) {
          console.error(`Policy ${policyName} not found in the main response`);
          throw new Error(`Policy ${policyName} not found`);
        }
        
        console.log('Found policy details in main BP response:', policyDetails);
        
        // Get the status from the status endpoint
        const statusData = statusResponse.data;
        console.log('Received status data:', statusData);
        
        // Extract the YAML content with proper priority
        let yamlContent = '';
        
        // Check if the response has a non-empty yaml field as a string directly (this should be first priority)
        if (typeof policyDetails.yaml === 'string' && policyDetails.yaml.trim() !== '') {
          console.log('Using YAML directly from response root');
          yamlContent = policyDetails.yaml;
        } 
        // Check if annotations contain yaml
        else if (policyDetails.metadata?.annotations?.yaml) {
          console.log('Using YAML from metadata.annotations.yaml');
          yamlContent = policyDetails.metadata.annotations.yaml;
        }
        
        // Log the extracted YAML content status
        if (yamlContent) {
          console.log(`Extracted YAML content for policy ${policyName} is available (${yamlContent.length} chars)`);
        } else {
          console.log(`No YAML content found for policy ${policyName}`);
        }
        
        // Use the status from the status API, not from the main API
        const statusFromStatusApi = statusData.status || 'unknown';
        const capitalizedStatus = statusFromStatusApi.charAt(0).toUpperCase() + statusFromStatusApi.slice(1).toLowerCase();
        
        console.log(`Using status "${capitalizedStatus}" from status API endpoint`);
        
        // Format the final policy object using YAML from main API and status from status API
        const formattedPolicy = {
          name: policyDetails.name,
          namespace: policyDetails.namespace || 'default',
          status: capitalizedStatus,
          clusters: policyDetails.clustersCount,
          workload: policyDetails.workloads && policyDetails.workloads.length > 0 ? policyDetails.workloads[0] : 'No workload specified',
          clusterList: policyDetails.clusterList || policyDetails.clusters || [],
          workloadList: policyDetails.workloadList || policyDetails.workloads || [],
          creationDate: policyDetails.creationTimestamp ? new Date(policyDetails.creationTimestamp).toLocaleString() : 'Not available',
          bindingMode: policyDetails.bindingMode || 'DownsyncOnly',
          conditions: statusData.conditions || policyDetails.conditions || [],
          creationTimestamp: policyDetails.creationTimestamp,
          yaml: yamlContent
        } as BindingPolicyInfo;
        
        console.log('Final policy object:', { 
          name: formattedPolicy.name,
          status: formattedPolicy.status,
          yamlExists: !!formattedPolicy.yaml, 
          yamlLength: formattedPolicy.yaml?.length
        });
        
        return formattedPolicy;
      },
      enabled: !!policyName,
      // Provide initial data for when the query is loading
      placeholderData: (currentData) => {
        // If we already have data, return it
        if (currentData) return currentData;
        
        // Otherwise, return a loading placeholder that includes the policy name
        return {
          name: policyName || 'Loading...',
          namespace: 'default',
          status: 'Loading...' as const,
          clusters: 0,
          workload: 'Loading...',
          clusterList: [],
          workloadList: [],
          creationDate: '',
          bindingMode: 'Unknown',
          yaml: '' // Initialize with empty string instead of undefined
        } as BindingPolicyInfo;
      },
    });
  };

  // GET /api/bp/status?name=policyName - Fetch only status for a specific binding policy
  const useBindingPolicyStatus = (policyName: string | undefined) => {
    return useQuery<{status: string}, Error>({
      queryKey: ['binding-policy-status', policyName],
      queryFn: async () => {
        if (!policyName) throw new Error('Policy name is required');
        
        console.log(`Fetching status for binding policy: ${policyName}`);
        const response = await api.get(`/api/bp/status?name=${encodeURIComponent(policyName)}`);
        
        // Extract just the status from the response
        const status = response.data.status || 'Inactive';
        return { 
          status: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() 
        };
      },
      enabled: !!policyName,
    });
  };

  // POST /api/bp/create - Create binding policy
  const useCreateBindingPolicy = () => {
    return useMutation({
      mutationFn: async (policyData: Omit<BindingPolicyInfo, 'creationDate' | 'clusters' | 'status'>) => {
        console.log("Creating binding policy with data:", policyData);
        
        // Check if the policy data contains YAML content
        if (policyData.yaml) {
          // If we have YAML content, send it as a FormData
          console.log("Using YAML-based creation method");
          const formData = new FormData();
          const yamlBlob = new Blob([policyData.yaml], { type: "application/x-yaml" });
          formData.append("bpYaml", yamlBlob, `${policyData.name}.yaml`);
          
          try {
            const response = await api.post('/api/bp/create', formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });
            return response.data;
          } catch (error) {
            console.error("API Error with YAML upload:", error);
            throw error;
          }
        } else {
          // If we don't have YAML, format according to the BindingPolicyRequest structure
          console.log("Using JSON-based creation method");
          const formattedData = {
            name: policyData.name,
            namespace: policyData.namespace || "default",
            clusterSelectors: policyData.clusterList?.map(clusterName => ({
              'kubernetes.io/cluster-name': clusterName
            })) || [],
            workloadSelectors: {
              apiGroups: [policyData.workload || "apps/v1"],
              resources: ["deployments"],
              namespaces: [policyData.namespace || "default"],
              workloads: []
            },
            propagationMode: policyData.bindingMode || "DownsyncOnly",
            updateStrategy: "ServerSideApply"
          };

          console.log("Sending formatted JSON data:", formattedData);
          
          try {
            const response = await api.post('/api/bp/create/json', formattedData);
            return response.data;
          } catch (error) {
            console.error("API Error with JSON creation:", error);
            throw error;
          }
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['binding-policies'] });
        toast.success('Binding policy created successfully');
      },
      onError: (error: Error) => {
        toast.error('Failed to create binding policy');
        console.error('Mutation error:', error);
      },
    });
  };

  // DELETE /api/bp/delete/:name - Delete specific binding policy
  const useDeleteBindingPolicy = () => {
    return useMutation({
      mutationFn: async (name: string) => {
        const response = await api.delete(`/api/bp/delete/${name}`);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['binding-policies'] });
        toast.success('Binding policy deleted successfully');
      },
      onError: (error: Error) => {
        toast.error('Failed to delete binding policy');
        console.error('Error deleting binding policy:', error);
      },
    });
  };

  // DELETE /api/bp/delete - Delete multiple binding policies
  const useDeletePolicies = () => {
    return useMutation({
      mutationFn: async (policies: string[]) => {
        const response = await api.delete('/api/bp/delete', {
          data: { policies },
        });
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['binding-policies'] });
        toast.success('Selected binding policies deleted successfully');
      },
      onError: (error: Error) => {
        toast.error('Failed to delete binding policies');
        console.error('Error deleting binding policies:', error);
      },
    });
  };

  // POST /api/deploy - Deploy binding policies
  const useDeploy = () => {
    return useMutation({
      mutationFn: async (deployData: unknown) => {
        const response = await api.post('/api/deploy', deployData);
        return response.data;
      },
      onSuccess: () => {
        toast.success('Deployment completed successfully');
      },
      onError: (error: Error) => {
        toast.error('Deployment failed');
        console.error('Error during deployment:', error);
      },
    });
  };

  // Quick connect API for drag and drop
  const useQuickConnect = () => {
    return useMutation<QuickConnectResponse, Error, QuickConnectRequest>({
      mutationFn: async (request) => {
        console.log("Creating quick connect binding policy:", request);
        
        // Only copy the request, don't modify unless absolutely necessary
        const formattedRequest = { ...request };
        
        // Validate and enhance resources if needed
        if (!formattedRequest.resources || formattedRequest.resources.length === 0) {
          console.warn("No resources provided, adding default resources");
          formattedRequest.resources = [
            { type: 'namespaces', createOnly: true },
            { type: 'deployments', createOnly: false },
            { type: 'services', createOnly: false }, 
            { type: 'replicasets', createOnly: false }
          ];
        } else if (formattedRequest.resources.length === 1 && 
                  formattedRequest.resources[0].type === 'namespaces') {
          console.warn("Only namespaces resource provided, adding default workload resources");
          formattedRequest.resources.push(
            { type: 'deployments', createOnly: false },
            { type: 'services', createOnly: false },
            { type: 'replicasets', createOnly: false }
          );
        }
        
        // Make sure the request has workloadLabels
        if (!formattedRequest.workloadLabels || Object.keys(formattedRequest.workloadLabels).length === 0) {
          console.warn("No workload labels provided");
          formattedRequest.workloadLabels = {
            'kubernetes.io/kubestellar.workload.name': 'unknown' // Fallback default
          };
        }
        
        // Make sure the request has clusterLabels
        if (!formattedRequest.clusterLabels || Object.keys(formattedRequest.clusterLabels).length === 0) {
          console.warn("No cluster labels provided");
          formattedRequest.clusterLabels = {
            'location-group': 'unknown' // Fallback default
          };
        }
        
        // Ensure namespacesToSync is set if not provided
        if (!formattedRequest.namespacesToSync || formattedRequest.namespacesToSync.length === 0) {
          // Use the provided namespace or default to 'default'
          formattedRequest.namespacesToSync = [formattedRequest.namespace || 'default'];
        }
        
        // Add detailed console logging with pretty printing
        console.log("📤 SENDING REQUEST TO QUICK-CONNECT API:");
        console.log(JSON.stringify(formattedRequest, null, 2));
        console.log("🔍 workloadLabels:", JSON.stringify(formattedRequest.workloadLabels, null, 2));
        console.log("🔍 clusterLabels:", JSON.stringify(formattedRequest.clusterLabels, null, 2));
        console.log("🔍 resources:", JSON.stringify(formattedRequest.resources, null, 2));
        console.log("🔍 namespacesToSync:", JSON.stringify(formattedRequest.namespacesToSync, null, 2));
        
        const response = await api.post('/api/bp/quick-connect', formattedRequest);
        console.log("Quick connect response:", response.data);
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['binding-policies'] });
        toast.success('Binding policy created successfully');
      },
      onError: (error: Error) => {
        console.error("Error creating quick connect binding policy:", error);
        toast.error('Failed to create binding policy');
      }
    });
  };

  // Generate YAML for binding policy - Updated for new format
  const useGenerateBindingPolicyYaml = () => {
    return useMutation<GenerateYamlResponse, Error, GenerateYamlRequest>({
      mutationFn: async (request) => {
        console.log("Generating YAML for binding policy:", request);
        
        // Only copy the request, don't modify existing labels
        const formattedRequest = { ...request };
        
        // Make sure the request has workloadLabels
        if (!formattedRequest.workloadLabels || Object.keys(formattedRequest.workloadLabels).length === 0) {
          console.warn("No workload labels provided for YAML generation");
          formattedRequest.workloadLabels = {
            'kubernetes.io/kubestellar.workload.name': 'unknown' // Fallback default
          };
        }
        
        // Make sure the request has clusterLabels
        if (!formattedRequest.clusterLabels || Object.keys(formattedRequest.clusterLabels).length === 0) {
          console.warn("No cluster labels provided for YAML generation");
          formattedRequest.clusterLabels = {
            'location-group': 'unknown' // Fallback default
          };
        }
        
        // Validate and enhance resources if needed
        if (!formattedRequest.resources || formattedRequest.resources.length === 0) {
          console.warn("No resources provided for YAML generation, adding default resources");
          formattedRequest.resources = [
            { type: 'namespaces', createOnly: true },
            { type: 'deployments', createOnly: false },
            { type: 'services', createOnly: false }, 
            { type: 'replicasets', createOnly: false }
          ];
        } else if (formattedRequest.resources.length === 1 && 
                  formattedRequest.resources[0].type === 'namespaces') {
          console.warn("Only namespaces resource provided for YAML generation, adding default workload resources");
          formattedRequest.resources.push(
            { type: 'deployments', createOnly: false },
            { type: 'services', createOnly: false },
            { type: 'replicasets', createOnly: false }
          );
        }
        
        // Ensure namespacesToSync is set if not provided
        if (!formattedRequest.namespacesToSync || formattedRequest.namespacesToSync.length === 0) {
          // Use the provided namespace or default to 'default'
          formattedRequest.namespacesToSync = [formattedRequest.namespace || 'default'];
        }
        
        console.log("Final YAML generation request:", JSON.stringify(formattedRequest, null, 2));
        const response = await api.post('/api/bp/generate-yaml', formattedRequest);
        console.log("Generated YAML response:", response.data);
        return response.data;
      },
      onError: (error: Error) => {
        console.error("Error generating binding policy YAML:", error);
        toast.error('Failed to generate binding policy YAML');
      }
    });
  };

  return {
    useBindingPolicies,
    useBindingPolicyDetails,
    useBindingPolicyStatus,
    useCreateBindingPolicy,
    useDeleteBindingPolicy,
    useDeletePolicies,
    useDeploy,
    useGenerateBindingPolicyYaml,
    useQuickConnect,
  };
};