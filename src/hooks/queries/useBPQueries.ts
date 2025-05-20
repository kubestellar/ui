import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { BindingPolicyInfo, Workload } from '../../types/bindingPolicy';
import { useState, useCallback } from 'react';
import yaml from 'js-yaml';

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
  apiGroup?: string;
  includeCRD?: boolean;
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
interface FieldV1 {
  raw?: number[] | string | object;
  [key: string]: unknown;
}

interface ManagedField {
  fieldsv1?: FieldV1;
  [key: string]: unknown;
}

interface Metadata {
  managedfields?: ManagedField[];
  [key: string]: unknown;
}

interface ParsedYaml {
  objectmeta?: Metadata;
  objectMeta?: Metadata;
  ObjectMeta?: Metadata;
  [key: string]: unknown;
}
interface WorkloadSSEData {
  namespaced: Record<
    string,
    Record<
      string,
      Array<{
        createdAt: string;
        kind: string;
        labels: Record<string, string> | null;
        name: string;
        namespace: string;
        uid: string;
        version: string;
      }>
    >
  >;
  clusterScoped: Record<
    string,
    Array<{
      createdAt: string;
      kind: string;
      labels: Record<string, string> | null;
      name: string;
      namespace: string;
      uid: string;
      version: string;
    }>
  >;
}

interface WorkloadSSEState {
  status: 'idle' | 'loading' | 'success' | 'error';
  progress: number;
  data: WorkloadSSEData | null;
  error: Error | null;
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
          console.warn('Unexpected API response format:', response.data);
          return [];
        }

        console.log('Raw binding policies:', rawPolicies);

        // Transform the raw binding policies to the expected format
        return rawPolicies.map(policy => {
          // Capitalize the first letter of status
          const capitalizeStatus = (status: string): string => {
            if (!status) return 'Inactive';
            return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
          };

          let yamlContent = policy.yaml || '';

          try {
            const parsedYaml: ParsedYaml = (yaml.load(yamlContent) as ParsedYaml) || {};
            console.log('Parsed YAML:', parsedYaml);

            const metadata: Metadata | undefined =
              parsedYaml.objectmeta || parsedYaml.objectMeta || parsedYaml.ObjectMeta;

            if (metadata?.managedfields) {
              metadata.managedfields = metadata.managedfields.map((field: ManagedField) => {
                if (field?.fieldsv1?.raw && Array.isArray(field.fieldsv1.raw)) {
                  // Convert ASCII codes to actual string
                  const originalString = String.fromCharCode(...(field.fieldsv1.raw as number[]));

                  try {
                    const parsedFields = JSON.parse(originalString);
                    field.fieldsv1 = {
                      ...field.fieldsv1,
                      raw: parsedFields,
                    };
                  } catch (e) {
                    console.log('Error parsing JSON from raw fieldsv1:', e);
                    field.fieldsv1 = {
                      ...field.fieldsv1,
                      raw: originalString,
                    };
                  }
                }
                return field;
              });
            }

            const cleanedYaml = yaml.dump(parsedYaml);
            yamlContent = cleanedYaml; // Update the yamlContent with cleaned YAML
          } catch (err) {
            console.error('Error parsing YAML:', err);
          }

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
            creationDate: policy.creationTimestamp
              ? new Date(policy.creationTimestamp).toLocaleString()
              : 'Not available',
            bindingMode: policy.bindingMode || 'DownsyncOnly',
            conditions: policy.conditions || undefined,
            yaml: yamlContent, // Use the raw YAML content directly
            creationTimestamp: policy.creationTimestamp,
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
  const useBindingPolicyDetails = (
    policyName: string | undefined,
    options?: { refetchInterval?: number }
  ) => {
    return useQuery<BindingPolicyInfo, Error>({
      queryKey: ['binding-policy-details', policyName],
      queryFn: async () => {
        if (!policyName) throw new Error('Policy name is required');

        console.log(`Fetching complete details for binding policy: ${policyName}`);

        // Fetch data from both endpoints in parallel for efficiency
        const [mainResponse, statusResponse] = await Promise.all([
          // Get full policy data including YAML from main BP endpoint
          api.get('/api/bp', {
            params: { _t: new Date().getTime() }, // Cache-busting
          }),

          // Get latest status from the status endpoint
          api.get(`/api/bp/status?name=${encodeURIComponent(policyName)}`, {
            params: { _t: new Date().getTime() }, // Cache-busting
          }),
        ]);

        console.log('Received responses from both API endpoints');

        // Process main response to get the policy details with YAML
        let rawPolicies = [];
        if (mainResponse.data && mainResponse.data.bindingPolicies) {
          rawPolicies = mainResponse.data.bindingPolicies;
        } else if (Array.isArray(mainResponse.data)) {
          rawPolicies = mainResponse.data;
        } else {
          console.warn('Unexpected main API response format:', mainResponse.data);
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
          console.log(
            `Extracted YAML content for policy ${policyName} is available (${yamlContent.length} chars)`
          );
        } else {
          console.log(`No YAML content found for policy ${policyName}`);
        }

        try {
          const parsedYaml: ParsedYaml = (yaml.load(yamlContent) as ParsedYaml) || {};
          console.log('Parsed YAML:', parsedYaml);

          const metadata: Metadata | undefined =
            parsedYaml.objectmeta || parsedYaml.objectMeta || parsedYaml.ObjectMeta;

          if (metadata?.managedfields) {
            metadata.managedfields = metadata.managedfields.map((field: ManagedField) => {
              if (field?.fieldsv1?.raw && Array.isArray(field.fieldsv1.raw)) {
                // Convert ASCII codes to actual string
                const originalString = String.fromCharCode(...(field.fieldsv1.raw as number[]));

                try {
                  const parsedFields = JSON.parse(originalString);
                  field.fieldsv1 = {
                    ...field.fieldsv1,
                    raw: parsedFields,
                  };
                } catch (e) {
                  console.log('Error parsing JSON from raw fieldsv1:', e);
                  field.fieldsv1 = {
                    ...field.fieldsv1,
                    raw: originalString,
                  };
                }
              }
              return field;
            });
          }

          const cleanedYaml = yaml.dump(parsedYaml);
          yamlContent = cleanedYaml; // Update the yamlContent with cleaned YAML
        } catch (err) {
          console.error('Error parsing YAML:', err);
        }

        // Use the status from the status API, not from the main API
        const statusFromStatusApi = statusData.status || 'unknown';
        const capitalizedStatus =
          statusFromStatusApi.charAt(0).toUpperCase() + statusFromStatusApi.slice(1).toLowerCase();

        console.log(`Using status "${capitalizedStatus}" from status API endpoint`);

        // Format the final policy object using YAML from main API and status from status API
        const formattedPolicy = {
          name: policyDetails.name,
          namespace: policyDetails.namespace || 'default',
          status: capitalizedStatus,
          clusters: policyDetails.clustersCount,
          workload:
            policyDetails.workloads && policyDetails.workloads.length > 0
              ? policyDetails.workloads[0]
              : 'No workload specified',
          clusterList: policyDetails.clusterList || policyDetails.clusters || [],
          workloadList: policyDetails.workloadList || policyDetails.workloads || [],
          creationDate: policyDetails.creationTimestamp
            ? new Date(policyDetails.creationTimestamp).toLocaleString()
            : 'Not available',
          bindingMode: policyDetails.bindingMode || 'DownsyncOnly',
          conditions: statusData.conditions || policyDetails.conditions || [],
          creationTimestamp: policyDetails.creationTimestamp,
          yaml: yamlContent,
        } as BindingPolicyInfo;

        console.log('Final policy object:', {
          name: formattedPolicy.name,
          status: formattedPolicy.status,
          yamlExists: !!formattedPolicy.yaml,
          yamlLength: formattedPolicy.yaml?.length,
        });

        return formattedPolicy;
      },
      enabled: !!policyName,
      refetchInterval: options?.refetchInterval,
      // Provide initial data for when the query is loading
      placeholderData: currentData => {
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
          yaml: '', // Initialize with empty string instead of undefined
        } as BindingPolicyInfo;
      },
    });
  };

  // GET /api/bp/status?name=policyName - Fetch only status for a specific binding policy
  const useBindingPolicyStatus = (policyName: string | undefined) => {
    return useQuery<{ status: string }, Error>({
      queryKey: ['binding-policy-status', policyName],
      queryFn: async () => {
        if (!policyName) throw new Error('Policy name is required');

        console.log(`Fetching status for binding policy: ${policyName}`);
        const response = await api.get(`/api/bp/status?name=${encodeURIComponent(policyName)}`);

        // Extract just the status from the response
        const status = response.data.status || 'Inactive';
        return {
          status: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
        };
      },
      enabled: !!policyName,
    });
  };

  // POST /api/bp/create - Create binding policy
  const useCreateBindingPolicy = () => {
    return useMutation({
      mutationFn: async (
        policyData: Omit<BindingPolicyInfo, 'creationDate' | 'clusters' | 'status'>
      ) => {
        console.log('Creating binding policy with data:', policyData);
        console.log('Policy data:', policyData);
        // Check if the policy data contains YAML content
        if (policyData.yaml) {
          // If we have YAML content, send it as a FormData
          console.log('Using YAML-based creation method');
          const formData = new FormData();
          const yamlBlob = new Blob([policyData.yaml], { type: 'application/x-yaml' });
          formData.append('bpYaml', yamlBlob, `${policyData.name}.yaml`);

          try {
            const response = await api.post('/api/bp/create', formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });
            return response.data;
          } catch (error) {
            console.error('API Error with YAML upload:', error);
            throw error;
          }
        } else {
          // If we don't have YAML, format according to the BindingPolicyRequest structure
          console.log('Using JSON-based creation method');
          const formattedData = {
            name: policyData.name,
            namespace: policyData.namespace || 'default',
            clusterSelectors:
              policyData.clusterList?.map(clusterName => ({
                'kubernetes.io/cluster-name': clusterName,
              })) || [],
            workloadSelectors: {
              apiGroups: [policyData.workload || 'apps/v1'],
              resources: ['deployments'],
              namespaces: [policyData.namespace || 'default'],
              workloads: [],
            },
            propagationMode: policyData.bindingMode || 'DownsyncOnly',
            updateStrategy: 'ServerSideApply',
          };

          console.log('Sending formatted JSON data:', formattedData);

          try {
            const response = await api.post('/api/bp/create/json', formattedData);
            return response.data;
          } catch (error) {
            console.error('API Error with JSON creation:', error);
            throw error;
          }
        }
      },
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: ['binding-policies'] });
        toast.success('Binding policy created successfully');

        setTimeout(() => {
          console.log(
            `Refetching binding policies after delay to update status for ${variables.name}`
          );
          queryClient.invalidateQueries({ queryKey: ['binding-policies'] });

          if (variables.name) {
            queryClient.invalidateQueries({
              queryKey: ['binding-policy-details', variables.name],
            });
          }
        }, 1500); // 1.5 second delay to ensure status change is captured
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
        console.log('useDeletePolicies - Received policies to delete:', policies);

        if (!Array.isArray(policies)) {
          console.error('useDeletePolicies - Expected an array of policy names, got:', policies);
          throw new Error('Invalid input: policies must be an array of strings');
        }

        if (policies.length === 0) {
          console.warn('useDeletePolicies - No policies to delete');
          return { success: true, message: 'No policies to delete' };
        }
        console.log('useDeletePolicies - Sending request with payload:', { policies });

        try {
          const response = await api.delete('/api/bp/delete', {
            data: { policies },
          });

          console.log('useDeletePolicies - API response:', response.data);
          return response.data;
        } catch (error) {
          console.error('useDeletePolicies - API error:', error);
          throw error;
        }
      },
      onSuccess: data => {
        console.log('useDeletePolicies - Mutation succeeded with data:', data);
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
      mutationFn: async request => {
        console.log('Creating quick connect binding policy:', request);

        // Only copy the request, don't modify unless absolutely necessary
        const formattedRequest = { ...request };

        // Validate and enhance resources if needed
        if (!formattedRequest.resources || formattedRequest.resources.length === 0) {
          console.warn('No resources provided, adding default resources');
          formattedRequest.resources = [
            { type: 'customresourcedefinitions', createOnly: false },
            { type: 'namespaces', createOnly: true },
            { type: 'statefulsets', createOnly: false },
            { type: 'serviceaccounts', createOnly: false },
            { type: 'roles', createOnly: false },
            { type: 'rolebindings', createOnly: false },
            { type: 'clusterroles', createOnly: false },
            { type: 'clusterrolebindings', createOnly: false },
            { type: 'persistentvolumeclaims', createOnly: false },
            { type: 'deployments', createOnly: false },
            { type: 'services', createOnly: false },
            { type: 'replicasets', createOnly: false },
            { type: 'configmaps', createOnly: false },
            { type: 'secrets', createOnly: false },
          ];
        } else if (
          formattedRequest.resources.length === 1 &&
          formattedRequest.resources[0].type === 'namespaces'
        ) {
          console.warn('Only namespaces resource provided, adding default workload resources');
          formattedRequest.resources.push(
            { type: 'customresourcedefinitions', createOnly: false },
            { type: 'statefulsets', createOnly: false },
            { type: 'serviceaccounts', createOnly: false },
            { type: 'roles', createOnly: false },
            { type: 'rolebindings', createOnly: false },
            { type: 'clusterroles', createOnly: false },
            { type: 'clusterrolebindings', createOnly: false },
            { type: 'persistentvolumeclaims', createOnly: false },
            { type: 'deployments', createOnly: false },
            { type: 'services', createOnly: false },
            { type: 'replicasets', createOnly: false },
            { type: 'configmaps', createOnly: false },
            { type: 'secrets', createOnly: false }
          );
        }

        // Check for custom resources and ensure they have apiGroup if possible
        formattedRequest.resources = formattedRequest.resources.map(resource => {
          const standardResources = [
            'pods',
            'services',
            'deployments',
            'statefulsets',
            'daemonsets',
            'configmaps',
            'secrets',
            'namespaces',
            'persistentvolumes',
            'persistentvolumeclaims',
            'serviceaccounts',
            'roles',
            'rolebindings',
            'clusterroles',
            'clusterrolebindings',
            'ingresses',
            'jobs',
            'cronjobs',
            'events',
            'horizontalpodautoscalers',
            'endpoints',
            'replicasets',
            'networkpolicies',
            'limitranges',
            'resourcequotas',
            'customresourcedefinitions',
          ];

          if (!standardResources.includes(resource.type)) {
            const newResource = { ...resource };

            // Explicitly set includeCRD to true for all custom resources
            newResource.includeCRD = true;

            // If API group is already set, keep it
            if (!newResource.apiGroup) {
              const singular = resource.type.endsWith('s')
                ? resource.type.slice(0, -1)
                : resource.type;

              if (/^argo/.test(resource.type)) {
                newResource.apiGroup = 'argoproj.io';
                console.log(
                  `Assigning argoproj.io API group to ${resource.type} based on name pattern`
                );
              } else if (
                /^istio/.test(resource.type) ||
                /gateway|service|route/.test(resource.type)
              ) {
                newResource.apiGroup = 'networking.istio.io';
                console.log(
                  `Assigning networking.istio.io API group to ${resource.type} based on name pattern`
                );
              } else {
                let domain = 'k8s.io';

                const parts = singular.split('.');
                if (parts.length > 1) {
                  domain = parts.slice(1).join('.');
                  newResource.apiGroup = domain;
                } else {
                  newResource.apiGroup = `${parts[0]}.${domain}`;
                }
              }
            }

            console.log(
              `Determined API group for custom resource ${resource.type}: ${newResource.apiGroup}`
            );
            return newResource;
          }

          return resource;
        });
        // Check if customresourcedefinitions is explicitly included by the user
        const userExplicitlyIncludedCRDs = formattedRequest.resources.some(
          res => res.type === 'customresourcedefinitions'
        );

        if (userExplicitlyIncludedCRDs) {
          console.log('User explicitly included customresourcedefinitions in resources');
        }
        // Check if statefulsets are explicitly included
        const hasStatefulSets = formattedRequest.resources.some(res => res.type === 'statefulsets');

        // If statefulsets are not included, add them with high priority
        if (!hasStatefulSets) {
          console.log(
            'StatefulSets not explicitly included - adding them to support database workloads'
          );
          // Add to beginning of array to ensure they get processed first
          formattedRequest.resources.unshift({ type: 'statefulsets', createOnly: false });
        }

        // Make sure the request has workloadLabels
        if (
          !formattedRequest.workloadLabels ||
          Object.keys(formattedRequest.workloadLabels).length === 0
        ) {
          console.warn('No workload labels provided');
          formattedRequest.workloadLabels = {
            'kubestellar.io/workload': 'unknown', // Fallback default
          };
        }

        // Make sure the request has clusterLabels
        if (
          !formattedRequest.clusterLabels ||
          Object.keys(formattedRequest.clusterLabels).length === 0
        ) {
          console.warn('No cluster labels provided');
          formattedRequest.clusterLabels = {
            'location-group': 'unknown', // Fallback default
          };
        }

        // Ensure namespacesToSync is set if not provided
        if (!formattedRequest.namespacesToSync || formattedRequest.namespacesToSync.length === 0) {
          // Use the provided namespace or default to 'default'
          formattedRequest.namespacesToSync = [formattedRequest.namespace || 'default'];
        }

        const hasHigherLevelControllers = formattedRequest.resources.some(res =>
          ['deployments', 'replicasets', 'statefulsets', 'daemonsets', 'jobs', 'cronjobs'].includes(
            res.type
          )
        );

        if (hasHigherLevelControllers) {
          console.log('Removing pods from resources as higher-level controllers will manage them');
          formattedRequest.resources = formattedRequest.resources.filter(
            res => res.type !== 'pods'
          );
        }

        // Add detailed console logging with pretty printing
        console.log('📤 SENDING REQUEST TO QUICK-CONNECT API:');
        console.log(JSON.stringify(formattedRequest, null, 2));
        console.log('🔍 workloadLabels:', JSON.stringify(formattedRequest.workloadLabels, null, 2));
        console.log('🔍 clusterLabels:', JSON.stringify(formattedRequest.clusterLabels, null, 2));
        console.log('🔍 resources:', JSON.stringify(formattedRequest.resources, null, 2));
        console.log(
          '🔍 namespacesToSync:',
          JSON.stringify(formattedRequest.namespacesToSync, null, 2)
        );

        const response = await api.post('/api/bp/quick-connect', formattedRequest);
        console.log('Quick connect response:', response.data);
        return response.data;
      },
      onSuccess: data => {
        queryClient.invalidateQueries({ queryKey: ['binding-policies'] });
        toast.success('Binding policy created successfully');

        const createdPolicyName = data?.bindingPolicy?.name;

        setTimeout(() => {
          console.log(
            `Refetching binding policies after delay to update status for quick-connect policy`
          );
          queryClient.invalidateQueries({ queryKey: ['binding-policies'] });

          if (createdPolicyName) {
            queryClient.invalidateQueries({
              queryKey: ['binding-policy-details', createdPolicyName],
            });
          }
        }, 1500);
      },
      onError: (error: Error) => {
        console.error('Error creating quick connect binding policy:', error);
        toast.error('Failed to create binding policy');
      },
    });
  };

  // Generate YAML for binding policy - Updated for new format
  const useGenerateBindingPolicyYaml = () => {
    return useMutation<GenerateYamlResponse, Error, GenerateYamlRequest>({
      mutationFn: async request => {
        console.log('Generating YAML for binding policy:', request);

        // Only copy the request, don't modify existing labels
        const formattedRequest = { ...request };

        // Make sure the request has workloadLabels
        if (
          !formattedRequest.workloadLabels ||
          Object.keys(formattedRequest.workloadLabels).length === 0
        ) {
          console.warn('No workload labels provided for YAML generation');
          formattedRequest.workloadLabels = {
            'kubestellar.io/workload': 'unknown', // Fallback default
          };
        }

        // Make sure the request has clusterLabels
        if (
          !formattedRequest.clusterLabels ||
          Object.keys(formattedRequest.clusterLabels).length === 0
        ) {
          console.warn('No cluster labels provided for YAML generation');
          formattedRequest.clusterLabels = {
            'location-group': 'unknown', // Fallback default
          };
        }

        // Validate and enhance resources if needed
        if (!formattedRequest.resources || formattedRequest.resources.length === 0) {
          console.warn('No resources provided, adding default resources');
          formattedRequest.resources = [
            { type: 'customresourcedefinitions', createOnly: false },
            { type: 'namespaces', createOnly: true },
            { type: 'statefulsets', createOnly: false },
            { type: 'serviceaccounts', createOnly: false },
            { type: 'roles', createOnly: false },
            { type: 'rolebindings', createOnly: false },
            { type: 'clusterroles', createOnly: false },
            { type: 'clusterrolebindings', createOnly: false },
            { type: 'persistentvolumeclaims', createOnly: false },
            { type: 'deployments', createOnly: false },
            { type: 'services', createOnly: false },
            { type: 'replicasets', createOnly: false },
            { type: 'configmaps', createOnly: false },
            { type: 'secrets', createOnly: false },
          ];
        } else if (
          formattedRequest.resources.length === 1 &&
          formattedRequest.resources[0].type === 'namespaces'
        ) {
          console.warn('Only namespaces resource provided, adding default workload resources');
          formattedRequest.resources.push(
            { type: 'customresourcedefinitions', createOnly: false },
            { type: 'statefulsets', createOnly: false },
            { type: 'serviceaccounts', createOnly: false },
            { type: 'roles', createOnly: false },
            { type: 'rolebindings', createOnly: false },
            { type: 'clusterroles', createOnly: false },
            { type: 'clusterrolebindings', createOnly: false },
            { type: 'persistentvolumeclaims', createOnly: false },
            { type: 'deployments', createOnly: false },
            { type: 'services', createOnly: false },
            { type: 'replicasets', createOnly: false },
            { type: 'configmaps', createOnly: false },
            { type: 'secrets', createOnly: false }
          );
        }

        // Check for custom resources and ensure they have apiGroup if possible
        formattedRequest.resources = formattedRequest.resources.map(resource => {
          // Check if this looks like a CRD (not one of the standard k8s resources)
          const standardResources = [
            'pods',
            'services',
            'deployments',
            'statefulsets',
            'daemonsets',
            'configmaps',
            'secrets',
            'namespaces',
            'persistentvolumes',
            'persistentvolumeclaims',
            'serviceaccounts',
            'roles',
            'rolebindings',
            'clusterroles',
            'clusterrolebindings',
            'ingresses',
            'jobs',
            'cronjobs',
            'events',
            'horizontalpodautoscalers',
            'endpoints',
            'replicasets',
            'networkpolicies',
            'limitranges',
            'resourcequotas',
            'customresourcedefinitions',
          ];

          if (!standardResources.includes(resource.type)) {
            const newResource = { ...resource };

            newResource.includeCRD = true;

            // If API group is already set, keep it
            if (!newResource.apiGroup) {
              // Get singular form
              const singular = resource.type.endsWith('s')
                ? resource.type.slice(0, -1)
                : resource.type;

              if (/^argo/.test(resource.type)) {
                newResource.apiGroup = 'argoproj.io';
                console.log(
                  `Assigning argoproj.io API group to ${resource.type} based on name pattern`
                );
              } else if (
                /^istio/.test(resource.type) ||
                /gateway|service|route/.test(resource.type)
              ) {
                newResource.apiGroup = 'networking.istio.io';
                console.log(
                  `Assigning networking.istio.io API group to ${resource.type} based on name pattern`
                );
              } else {
                let domain = 'k8s.io';

                // Extract resource name that might be part of a domain
                const parts = singular.split('.');
                if (parts.length > 1) {
                  // If resource has dots, use everything after first dot as domain
                  domain = parts.slice(1).join('.');
                  newResource.apiGroup = domain;
                } else {
                  newResource.apiGroup = `${parts[0]}.${domain}`;
                }
              }
            }

            console.log(
              `Determined API group for custom resource ${resource.type}: ${newResource.apiGroup}`
            );
            return newResource;
          }

          return resource;
        });

        // Check if customresourcedefinitions is explicitly included by the user
        const userExplicitlyIncludedCRDs = formattedRequest.resources.some(
          res => res.type === 'customresourcedefinitions'
        );

        if (userExplicitlyIncludedCRDs) {
          console.log('User explicitly included customresourcedefinitions in resources');
        }
        // Check if statefulsets are explicitly included
        const hasStatefulSets = formattedRequest.resources.some(res => res.type === 'statefulsets');

        // If statefulsets are not included, add them with high priority
        if (!hasStatefulSets) {
          console.log(
            'StatefulSets not explicitly included - adding them to support database workloads'
          );
          formattedRequest.resources.unshift({ type: 'statefulsets', createOnly: false });
        }

        // Ensure namespacesToSync is set if not provided
        if (!formattedRequest.namespacesToSync || formattedRequest.namespacesToSync.length === 0) {
          // Use the provided namespace or default to 'default'
          formattedRequest.namespacesToSync = [formattedRequest.namespace || 'default'];
        }

        console.log('Final YAML generation request:', JSON.stringify(formattedRequest, null, 2));
        const response = await api.post('/api/bp/generate-yaml', formattedRequest);
        console.log('Generated YAML response:', response.data);
        return response.data;
      },
      onError: (error: Error) => {
        console.error('Error generating binding policy YAML:', error);
        toast.error('Failed to generate binding policy YAML');
      },
    });
  };

  // Get workloads and their labels using SSE
  const useWorkloadSSE = () => {
    const [state, setState] = useState<WorkloadSSEState>({
      status: 'idle',
      progress: 0,
      data: null,
      error: null,
    });

    const startSSEConnection = useCallback(() => {
      setState({
        status: 'loading',
        progress: 0,
        data: null,
        error: null,
      });

      // Initialize empty data structure for incremental updates
      const incrementalData: WorkloadSSEData = {
        namespaced: {},
        clusterScoped: {},
      };

      // Get the base URL from the api client
      const baseUrl = api.defaults.baseURL || '';
      const url = `${baseUrl}/api/wds/list-sse`;

      console.log('Starting SSE connection to:', url);

      // Create EventSource connection with credentials enabled
      const eventSource = new EventSource(url, { withCredentials: true });

      // Handle connection open
      eventSource.onopen = () => {
        console.log('SSE connection established');
      };

      // Handle progress events with incremental processing
      eventSource.addEventListener('progress', event => {
        try {
          const progressData = JSON.parse(event.data);
          console.log('SSE progress event:', progressData);

          setState(prevState => ({
            ...prevState,
            progress: Math.min(prevState.progress + 5, 95), // Cap at 95% until complete
          }));

          // Process incremental data from progress event
          if (progressData && progressData.data && progressData.data.new) {
            const newResources = progressData.data.new;
            const resourceKind = progressData.kind;
            const namespace = progressData.namespace;
            const scope = progressData.scope;

            if (scope === 'namespaced' && namespace) {
              if (!incrementalData.namespaced[namespace]) {
                incrementalData.namespaced[namespace] = {};
              }

              if (!incrementalData.namespaced[namespace][resourceKind]) {
                incrementalData.namespaced[namespace][resourceKind] = [];
              }

              incrementalData.namespaced[namespace][resourceKind] = [
                ...incrementalData.namespaced[namespace][resourceKind],
                ...newResources,
              ];
            } else if (scope === 'cluster') {
              if (!incrementalData.clusterScoped[resourceKind]) {
                incrementalData.clusterScoped[resourceKind] = [];
              }

              incrementalData.clusterScoped[resourceKind] = [
                ...incrementalData.clusterScoped[resourceKind],
                ...newResources,
              ];
            }

            setState(prevState => ({
              ...prevState,
              status: 'loading',
              data: { ...incrementalData },
            }));
          }
        } catch (error) {
          console.error('Error parsing progress event data:', error);
          // Don't fail the whole connection for a single progress event parsing error
        }
      });

      // Handle completed event (backend calls it 'complete', not 'completed')
      eventSource.addEventListener('complete', event => {
        try {
          console.log('SSE complete event received, parsing data');
          const parsedData = JSON.parse(event.data);

          setState({
            status: 'success',
            progress: 100,
            data: parsedData,
            error: null,
          });

          console.log('SSE data successfully processed');
          // Close the connection since we have the complete data
          eventSource.close();
        } catch (error) {
          console.error('Error parsing complete event data:', error);

          setState(prevState => ({
            ...prevState,
            status: 'error',
            error: new Error('Failed to parse complete event data'),
          }));

          eventSource.close();
        }
      });

      eventSource.onmessage = event => {
        console.log('SSE general message:', event.data);
      };

      eventSource.onerror = error => {
        console.error('SSE connection error:', error);

        if (error instanceof Event && !error.target) {
          console.error('Possible CORS error with EventSource');
        }

        setState(prevState => ({
          ...prevState,
          status: 'error',
          error: new Error(
            'Failed to connect to SSE endpoint. Please ensure you have proper permissions and the server is running.'
          ),
        }));

        // Close the connection on error
        eventSource.close();
      };

      // Return cleanup function
      return () => {
        console.log('Closing SSE connection');
        eventSource.close();
      };
    }, []);

    // Extract workloads with their labels from the SSE data
    const extractWorkloads = useCallback(() => {
      if (!state.data) return [];

      const workloads: Workload[] = [];

      const excludedTypes = new Set(['Endpoints', 'EndpointSlice', 'ControllerRevision']);

      const excludedNamespaces = new Set(['default', 'kube-system', 'kube-public']);

      if (state.data.namespaced) {
        Object.entries(state.data.namespaced).forEach(([namespace, resourceTypes]) => {
          if (excludedNamespaces.has(namespace)) {
            return;
          }

          Object.entries(resourceTypes).forEach(([resourceType, resources]) => {
            // Skip namespace metadata and excluded resource types
            if (resourceType === '__namespaceMetaData' || excludedTypes.has(resourceType)) {
              return;
            }

            // Check if resources is null or undefined before processing
            if (!resources) {
              console.warn(
                `Resources is null for namespace ${namespace}, resourceType ${resourceType}`
              );
              return;
            }

            // Process workload resources
            resources.forEach(resource => {
              if (resource.labels) {
                workloads.push({
                  name: resource.name,
                  namespace: namespace,
                  kind: resource.kind,
                  labels: resource.labels,
                  creationTime: resource.createdAt,
                });
              }
            });
          });
        });
      }

      // Process cluster-scoped resources
      if (state.data.clusterScoped) {
        // Define which cluster-scoped resource types to include
        const includeClusterResourceTypes = new Set(['CustomResourceDefinition', 'Namespace']);

        Object.entries(state.data.clusterScoped).forEach(([resourceType, resources]) => {
          if (excludedTypes.has(resourceType) || !includeClusterResourceTypes.has(resourceType)) {
            return;
          }

          // Check if resources is null or undefined before processing
          if (!resources) {
            console.warn(`Resources is null for cluster-scoped resourceType ${resourceType}`);
            return;
          }

          // Process cluster-scoped resources
          resources.forEach(resource => {
            if (resource.labels) {
              if (
                resourceType === 'Namespace' &&
                (resource.name === 'default' ||
                  resource.name === 'kube-system' ||
                  resource.name === 'kube-public' ||
                  resource.name === 'kubestellar-report' ||
                  resource.name === 'kube-node-lease')
              ) {
                return;
              }

              workloads.push({
                name: resource.name,
                namespace: resource.namespace || 'cluster-scoped',
                kind: resource.kind,
                labels: resource.labels,
                creationTime: resource.createdAt,
              });
            }
          });
        });
      }

      console.log(
        `Extracted ${workloads.length} workloads after filtering (default namespace excluded)`
      );
      return workloads;
    }, [state.data]);

    // Provide a way to get unique label keys and values for filtering
    const extractUniqueLabels = useCallback(() => {
      const workloads = extractWorkloads();
      const labelMap: Record<string, Set<string>> = {};

      workloads.forEach(workload => {
        if (workload.labels) {
          Object.entries(workload.labels).forEach(([key, value]) => {
            if (!labelMap[key]) {
              labelMap[key] = new Set();
            }
            labelMap[key].add(value);
          });
        }
      });

      return Object.fromEntries(
        Object.entries(labelMap).map(([key, values]) => [key, Array.from(values)])
      );
    }, [extractWorkloads]);

    return {
      state,
      startSSEConnection,
      extractWorkloads,
      extractUniqueLabels,
    };
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
    useWorkloadSSE,
  };
};
