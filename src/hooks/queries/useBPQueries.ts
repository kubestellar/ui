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

interface GenerateYamlRequest {
  workloadId: string;
  clusterId: string;
  namespace: string;
  policyName?: string;
}

interface QuickConnectRequest {
  workloadId: string;
  clusterId: string;
  policyName: string;
}

interface GenerateYamlResponse {
  bindingPolicy: {
    apiGroup: string;
    bindingMode: string;
    clusterId: string;
    clusters: string[];
    clustersCount: number;
    name: string;
    namespace: string;
    resourceKind: string;
    status: string;
    workloadId: string;
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
          
          // Handle both the new flattened format and the old nested format
          const policyName = policy.name || (policy.metadata?.name || 'Unknown');
          const creationTimestamp = policy.creationTimestamp || (policy.metadata?.creationTimestamp || new Date().toISOString());
          const yaml = policy.yaml || (policy.metadata?.annotations?.yaml || JSON.stringify(policy, null, 2));
          
          // Extract clusters information - use already processed data if available
          let clusterList: string[] = [];
          if (Array.isArray(policy.clusterList)) {
            clusterList = [...policy.clusterList];
          } else if (Array.isArray(policy.clusters)) {
            clusterList = [...policy.clusters];
          } else if (policy.spec?.clusterSelectors) {
            // Fall back to old format if needed
            policy.spec.clusterSelectors.forEach((selector: ClusterSelector) => {
              if (selector.matchLabels && selector.matchLabels['kubernetes.io/cluster-name']) {
                clusterList.push(selector.matchLabels['kubernetes.io/cluster-name']);
              }
            });
          }
          
          // Determine clusters count - use clustersCount field if available, otherwise use list length
          const clustersCount = policy.clustersCount !== undefined 
            ? policy.clustersCount 
            : clusterList.length;
          
          // Extract workloads information
          let workloadList: string[] = [];
          if (Array.isArray(policy.workloadList) && policy.workloadList.length > 0) {
            workloadList = [...policy.workloadList];
          } else if (Array.isArray(policy.workloads) && policy.workloads.length > 0) {
            workloadList = [...policy.workloads];
          } else if (policy.spec?.downsync && policy.spec.downsync.length > 0) {
            // Fall back to old format if needed
            policy.spec.downsync.forEach((ds: DownsyncItem) => {
              const apiGroup = ds.apiGroup || 'core';
              if (ds.namespaces && ds.namespaces.length > 0) {
                ds.namespaces.forEach((ns: string) => {
                  workloadList.push(`${apiGroup} (ns:${ns})`);
                });
              } else {
                workloadList.push(`${apiGroup}`);
              }
            });
          }
          
          // If still no workloads, add a default placeholder
          if (workloadList.length === 0) {
            workloadList = ['No workload specified'];
          }
          
          // Determine workloads count - use workloadsCount field if available, otherwise use list length
          const workloadsCount = policy.workloadsCount !== undefined
            ? policy.workloadsCount
            : workloadList.length;
          
          // Determine main workload for display in the table
          const mainWorkload = workloadList.length > 0 ? workloadList[0] : 'No workload specified';
          
          // Get namespace or use default
          const namespace = policy.namespace || 'default';
          
          // Get binding mode
          const bindingMode = policy.bindingMode || 'DownsyncOnly';
          
          console.log(`Policy ${policyName} - Clusters: ${clustersCount}, Workloads: ${workloadsCount}`);
          
          return {
            name: policyName,
            namespace: namespace,
            status: capitalizeStatus(policy.status || 'inactive'),
            clusters: clustersCount,
            workload: mainWorkload,
            clusterList: clusterList,
            workloadList: workloadList,
            creationDate: new Date(creationTimestamp).toLocaleString(),
            bindingMode: bindingMode,
            conditions: policy.conditions || undefined,
            yaml: yaml
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

  // GET /api/bp/status?name=policyName - Fetch details for a specific binding policy
  const useBindingPolicyDetails = (policyName: string | undefined) => {
    return useQuery<BindingPolicyInfo, Error>({
      queryKey: ['binding-policy-details', policyName],
      queryFn: async () => {
        if (!policyName) throw new Error('Policy name is required');
        
        console.log(`Fetching details for binding policy: ${policyName}`);
        const response = await api.get(`/api/bp/status?name=${encodeURIComponent(policyName)}`);
        const policyDetails = response.data;
        
        console.log('Received policy details:', policyDetails);
        
        // The response format is now more aligned with GetAllBp endpoint
        // The API now directly returns the formatted data we need
        return {
          name: policyDetails.name,
          namespace: policyDetails.namespace || 'default',
          status: policyDetails.status.charAt(0).toUpperCase() + policyDetails.status.slice(1).toLowerCase(),
          clusters: policyDetails.clustersCount,
          workload: policyDetails.workloads && policyDetails.workloads.length > 0 ? policyDetails.workloads[0] : 'No workload specified',
          clusterList: policyDetails.clusters || [],
          workloadList: policyDetails.workloads || [],
          creationDate: policyDetails.creationTimestamp ? new Date(policyDetails.creationTimestamp).toLocaleString() : 'N/A',
          bindingMode: policyDetails.bindingMode || 'DownsyncOnly',
          conditions: policyDetails.conditions,
          yaml: policyDetails.yaml || ''
        } as BindingPolicyInfo;
      },
      enabled: !!policyName,
      staleTime: 30000, // Consider data fresh for 30 seconds
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

  // Generate YAML for binding policy
  const useGenerateBindingPolicyYaml = () => {
    return useMutation<GenerateYamlResponse, Error, GenerateYamlRequest>({
      mutationFn: async (request) => {
        console.log("Generating YAML for binding policy:", request);
        const response = await api.post('/api/bp/generate-yaml', request);
        console.log("Generated YAML response:", response.data);
        return response.data;
      },
      onError: (error: Error) => {
        console.error("Error generating binding policy YAML:", error);
        toast.error('Failed to generate binding policy YAML');
      }
    });
  };

  // Quick connect API for drag and drop
  const useQuickConnect = () => {
    return useMutation<QuickConnectResponse, Error, QuickConnectRequest>({
      mutationFn: async (request) => {
        console.log("Creating quick connect binding policy:", request);
        const response = await api.post('/api/bp/quick-connect', request);
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

  return {
    useBindingPolicies,
    useBindingPolicyDetails,
    useCreateBindingPolicy,
    useDeleteBindingPolicy,
    useDeletePolicies,
    useDeploy,
    useGenerateBindingPolicyYaml,
    useQuickConnect,
  };
};