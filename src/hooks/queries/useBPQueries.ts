import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { BindingPolicyInfo, Workload } from '../../types/bindingPolicy';
import { useState, useCallback } from 'react';
import yaml from 'js-yaml';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

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
          console.warn(t('errors.unexpectedFormat'), response.data);
          return [];
        }

        console.log('Raw binding policies:', rawPolicies);

        // Transform the raw binding policies to the expected format
        return rawPolicies.map(policy => {
          // Capitalize the first letter of status
          const capitalizeStatus = (status: string): string => {
            if (!status) return t('bindingPolicy.status.inactive');
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
                    console.log(t('bpQueries.errors.errorParsingJson'), e);
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
            console.error(t('bpQueries.logging.errorParsingYaml'), err);
          }

          // Extract clusters information - use already processed data if available
          const clusterList = policy.clusterList || policy.clusters || [];

          // Extract workloads information - use already processed data if available
          const workloadList = policy.workloadList ||
            policy.workloads || [t('common.noResource', { resource: 'workload' })];

          // Determine main workload for display in the table
          const mainWorkload =
            workloadList.length > 0
              ? workloadList[0]
              : t('common.noResource', { resource: 'workload' });

          console.log(`Policy ${policy.name} YAML exists: ${!!yamlContent}`);
          return {
            name: policy.name || t('bindingPolicy.unknown'),
            namespace: policy.namespace || t('namespaces.default'),
            status: capitalizeStatus(policy.status || 'inactive'),
            clusters: policy.clustersCount || clusterList.length,
            workload: mainWorkload,
            clusterList: clusterList,
            workloadList: workloadList,
            creationDate: policy.creationTimestamp
              ? new Date(policy.creationTimestamp).toLocaleString()
              : t('bindingPolicy.table.notAvailable'),
            bindingMode: policy.bindingMode || t('modes.downsyncOnly'),
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
      toast.error(t('bindingPolicy.notifications.fetchError'));
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
        if (!policyName) throw new Error(t('errors.policyNameRequired'));

        console.log(t('bpQueries.logging.fetchingPolicyDetails', { policyName }));

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

        console.log(t('bpQueries.logging.receivedResponses'));

        // Process main response to get the policy details with YAML
        let rawPolicies = [];
        if (mainResponse.data && mainResponse.data.bindingPolicies) {
          rawPolicies = mainResponse.data.bindingPolicies;
        } else if (Array.isArray(mainResponse.data)) {
          rawPolicies = mainResponse.data;
        } else {
          console.warn(t('errors.unexpectedFormat'), mainResponse.data);
          throw new Error(t('errors.parseError'));
        }

        // Find the specific policy by name
        const policyDetails = rawPolicies.find((p: RawBindingPolicy) => p.name === policyName);

        if (!policyDetails) {
          console.error(t('bpQueries.errors.policyNotFound', { policyName }));
          throw new Error(t('errors.policyNotFound', { name: policyName }));
        }

        console.log(t('bpQueries.logging.foundPolicyDetails'), policyDetails);

        // Get the status from the status endpoint
        const statusData = statusResponse.data;
        console.log(t('bpQueries.logging.receivedStatusData'), statusData);

        // Extract the YAML content with proper priority
        let yamlContent = '';

        // Check if the response has a non-empty yaml field as a string directly (this should be first priority)
        if (typeof policyDetails.yaml === 'string' && policyDetails.yaml.trim() !== '') {
          console.log(t('bpQueries.logging.yamlFromResponse'));
          yamlContent = policyDetails.yaml;
        }
        // Check if annotations contain yaml
        else if (policyDetails.metadata?.annotations?.yaml) {
          console.log(t('bpQueries.logging.yamlFromMetadata'));
          yamlContent = policyDetails.metadata.annotations.yaml;
        }

        // Log the extracted YAML content status
        if (yamlContent) {
          console.log(
            t('bpQueries.logging.yamlAvailable', {
              policyName,
              length: yamlContent.length,
            })
          );
        } else {
          console.log(t('bpQueries.logging.noYamlFound', { policyName }));
        }

        try {
          const parsedYaml: ParsedYaml = (yaml.load(yamlContent) as ParsedYaml) || {};
          console.log(t('bpQueries.logging.parsedYaml'), parsedYaml);

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
                  console.log(t('bpQueries.errors.errorParsingJson'), e);
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
          console.error(t('bpQueries.logging.errorParsingYaml'), err);
        }

        // Use the status from the status API, not from the main API
        const statusFromStatusApi = statusData.status || 'unknown';
        const capitalizedStatus =
          statusFromStatusApi.charAt(0).toUpperCase() + statusFromStatusApi.slice(1).toLowerCase();

        console.log(t('bpQueries.logging.usingStatus', { status: capitalizedStatus }));

        // Format the final policy object using YAML from main API and status from status API
        const formattedPolicy = {
          name: policyDetails.name,
          namespace: policyDetails.namespace || t('namespaces.default'),
          status: capitalizedStatus,
          clusters: policyDetails.clustersCount,
          workload:
            policyDetails.workloads && policyDetails.workloads.length > 0
              ? policyDetails.workloads[0]
              : t('common.noResource', { resource: 'workload' }),
          clusterList: policyDetails.clusterList || policyDetails.clusters || [],
          workloadList: policyDetails.workloadList || policyDetails.workloads || [],
          creationDate: policyDetails.creationTimestamp
            ? new Date(policyDetails.creationTimestamp).toLocaleString()
            : t('bindingPolicy.table.notAvailable'),
          bindingMode: policyDetails.bindingMode || t('modes.downsyncOnly'),
          conditions: statusData.conditions || policyDetails.conditions || [],
          creationTimestamp: policyDetails.creationTimestamp,
          yaml: yamlContent,
        } as BindingPolicyInfo;

        console.log(t('bpQueries.logging.finalPolicyObject'), {
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
          name: policyName || t('bindingPolicy.loading'),
          namespace: t('namespaces.default'),
          status: t('bindingPolicy.loading'),
          clusters: 0,
          workload: t('bindingPolicy.loading'),
          clusterList: [],
          workloadList: [],
          creationDate: '',
          bindingMode: t('bindingPolicy.unknown'),
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
            namespace: policyData.namespace || t('namespaces.default'),
            clusterSelectors:
              policyData.clusterList?.map(clusterName => ({
                'kubernetes.io/cluster-name': clusterName,
              })) || [],
            workloadSelectors: {
              apiGroups: [policyData.workload || 'apps/v1'],
              resources: ['deployments'],
              namespaces: [policyData.namespace || t('namespaces.default')],
              workloads: [],
            },
            propagationMode: policyData.bindingMode || t('modes.downsyncOnly'),
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
        toast.success(t('bindingPolicy.notifications.createSuccess'));

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
        toast.error(t('bindingPolicy.notifications.createError'));
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
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: ['binding-policies'] });
        toast.success(t('bindingPolicy.notifications.deleteSuccess', { name: variables }));
      },
      onError: (error: Error) => {
        toast.error(t('bindingPolicy.notifications.deleteError'));
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
      onSuccess: (data, variables) => {
        console.log('useDeletePolicies - Mutation succeeded with data:', data);
        queryClient.invalidateQueries({ queryKey: ['binding-policies'] });
        const count = variables.length;
        toast.success(t('bindingPolicy.notifications.deleteManySuccess', { count }));
      },
      onError: (error: Error) => {
        toast.error(t('bindingPolicy.notifications.deleteManyError'));
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
        toast.success(t('bindingPolicy.notifications.deploySuccess'));
      },
      onError: (error: Error) => {
        toast.error(t('bindingPolicy.notifications.deployError'));
        console.error('Error during deployment:', error);
      },
    });
  };

  // Quick connect API for selection-based binding policy creation
  const useQuickConnect = () => {
    return useMutation<QuickConnectResponse, Error, QuickConnectRequest>({
      mutationFn: async request => {
        console.log('Creating quick connect binding policy:', request);

        // Only copy the request, don't modify unless absolutely necessary
        const formattedRequest = { ...request };

        // Validate resources - only require that resources are provided
        if (!formattedRequest.resources || formattedRequest.resources.length === 0) {
          console.error('No resources provided - this is required');
          throw new Error(t('bindingPolicy.yamlGeneration.resourceRequired'));
        }

        // Log the resources that were actually selected by the user
        console.log(
          'User selected resources:',
          formattedRequest.resources.map(r => r.type)
        );

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
        console.log('Using only user-selected resources, no automatic additions');

        // Make sure the request has workloadLabels
        if (
          !formattedRequest.workloadLabels ||
          Object.keys(formattedRequest.workloadLabels).length === 0
        ) {
          console.warn('No workload labels provided');
          formattedRequest.workloadLabels = {
            'kubestellar.io/workload': t('bindingPolicy.quickConnect.unknownWorkload'),
          };
        }

        // Make sure the request has clusterLabels
        if (
          !formattedRequest.clusterLabels ||
          Object.keys(formattedRequest.clusterLabels).length === 0
        ) {
          console.warn('No cluster labels provided');
          formattedRequest.clusterLabels = {
            'location-group': t('bindingPolicy.quickConnect.unknownLocationGroup'),
          };
        }

        // Ensure namespacesToSync is set if not provided
        if (!formattedRequest.namespacesToSync || formattedRequest.namespacesToSync.length === 0) {
          // Use the provided namespace or default to 'default'
          formattedRequest.namespacesToSync = [
            formattedRequest.namespace || t('namespaces.default'),
          ];
        }

        console.log('Including all user-selected resources including both controllers and pods');

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
        toast.success(t('bindingPolicy.notifications.createSuccess'));

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
        toast.error(t('bindingPolicy.notifications.quickConnectError'));
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
            'kubestellar.io/workload': t('bindingPolicy.quickConnect.unknownWorkload'),
          };
        }

        // Make sure the request has clusterLabels
        if (
          !formattedRequest.clusterLabels ||
          Object.keys(formattedRequest.clusterLabels).length === 0
        ) {
          console.warn('No cluster labels provided for YAML generation');
          formattedRequest.clusterLabels = {
            'location-group': t('bindingPolicy.quickConnect.unknownLocationGroup'),
          };
        }

        // Validate resources - only require that resources are provided
        if (!formattedRequest.resources || formattedRequest.resources.length === 0) {
          console.error('No resources provided for YAML generation - this is required');
          throw new Error(t('bindingPolicy.yamlGeneration.resourceRequiredYaml'));
        }

        console.log(
          'User selected resources for YAML:',
          formattedRequest.resources.map(r => r.type)
        );

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
        console.log(
          'Using only user-selected resources for YAML generation, no automatic additions'
        );

        // Ensure namespacesToSync is set if not provided
        if (!formattedRequest.namespacesToSync || formattedRequest.namespacesToSync.length === 0) {
          // Use the provided namespace or default to 'default'
          formattedRequest.namespacesToSync = [
            formattedRequest.namespace || t('namespaces.default'),
          ];
        }

        console.log('Final YAML generation request:', JSON.stringify(formattedRequest, null, 2));
        const response = await api.post('/api/bp/generate-yaml', formattedRequest);
        console.log('Generated YAML response:', response.data);
        return response.data;
      },
      onError: (error: Error) => {
        console.error('Error generating binding policy YAML:', error);
        toast.error(t('bindingPolicy.notifications.yamlGenerateError'));
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
        }
      });

      // Handle completed event
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
        setState(prevState => ({
          ...prevState,
          status: 'error',
          error: new Error('Failed to connect to SSE endpoint'),
        }));
        eventSource.close();
      };

      return () => {
        console.log('Closing SSE connection');
        eventSource.close();
      };
    }, []);

    // Extract workloads with their labels from the SSE data
    const extractWorkloads = useCallback(() => {
      if (!state.data) return [];

      const workloads: Workload[] = [];

      // Remove excluded types that we actually want to include
      const excludedTypes = new Set(['EndpointSlice', 'ControllerRevision']);

      // Remove excluded namespaces that we want to include
      const excludedNamespaces = new Set(['kube-system', 'kube-public']);

      // Process namespaced resources
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
              console.warn(t('bpQueries.errors.resourcesNull', { namespace, resourceType }));
              return;
            }

            // Process workload resources
            resources.forEach(resource => {
              // Include resources even if they don't have labels
              const labels = resource.labels || {};
              workloads.push({
                name: resource.name,
                namespace: namespace,
                kind: resource.kind,
                labels: labels,
                creationTime: resource.createdAt,
              });
            });
          });
        });
      }

      // Process cluster-scoped resources
      if (state.data.clusterScoped) {
        Object.entries(state.data.clusterScoped).forEach(([resourceType, resources]) => {
          if (excludedTypes.has(resourceType)) {
            return;
          }

          // Check if resources is null or undefined before processing
          if (!resources) {
            console.warn(t('bpQueries.errors.resourcesNullClusterScoped', { resourceType }));
            return;
          }

          // Process cluster-scoped resources
          resources.forEach(resource => {
            // Include resources even if they don't have labels
            const labels = resource.labels || {};
            workloads.push({
              name: resource.name,
              namespace: resource.namespace || '',
              kind: resource.kind,
              labels: labels,
              creationTime: resource.createdAt,
            });
          });
        });
      }

      // Add namespace resources from namespaced data
      const processedNamespaces = new Set<string>(); // Keep track of processed namespaces
      Object.entries(state.data.namespaced).forEach(([, resourceTypes]) => {
        if (resourceTypes.__namespaceMetaData) {
          const namespaceMetadataArray = resourceTypes.__namespaceMetaData;
          if (Array.isArray(namespaceMetadataArray) && namespaceMetadataArray.length > 0) {
            const namespaceMetadata = namespaceMetadataArray[0];
            if (
              namespaceMetadata &&
              namespaceMetadata.name &&
              !processedNamespaces.has(namespaceMetadata.name)
            ) {
              workloads.push({
                name: namespaceMetadata.name,
                namespace: '', // Namespaces are cluster-scoped
                kind: 'Namespace',
                labels: namespaceMetadata.labels || {},
                creationTime: namespaceMetadata.createdAt,
              });
              processedNamespaces.add(namespaceMetadata.name);
            }
          }
        }
      });

      const uniqueWorkloads = Array.from(
        new Map(workloads.map(w => [`${w.kind}-${w.namespace}-${w.name}`, w])).values()
      );

      console.log(
        t('bpQueries.logging.extractedUniqueWorkloads', { count: uniqueWorkloads.length })
      );
      return uniqueWorkloads;
    }, [state.data]);

    return {
      state,
      startSSEConnection,
      extractWorkloads,
      isLoading: state.status === 'loading' || state.status === 'idle',
      isReady: state.status === 'success',
      hasError: state.status === 'error',
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
