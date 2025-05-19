import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import yaml from 'js-yaml';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Tabs,
  Box,
  Alert,
  TextField,
  Snackbar,
  Typography,
  CircularProgress,
} from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import useTheme from '../../stores/themeStore';
import CancelConfirmationDialog from './CancelConfirmationDialog';
import {
  StyledTab,
  StyledPaper,
  getBaseStyles,
  getEnhancedTabContentStyles,
  getTabsStyles,
  getDialogPaperProps,
} from './styles/CreateBindingPolicyStyles';
import { DEFAULT_BINDING_POLICY_TEMPLATE } from './constants/index';
import PolicyDragDrop from './PolicyDragDrop';
import { ManagedCluster, Workload } from '../../types/bindingPolicy';
import { PolicyConfiguration } from './ConfigurationSidebar';
import { usePolicyDragDropStore } from '../../stores/policyDragDropStore';
import { useBPQueries } from '../../hooks/queries/useBPQueries';
import { toast } from 'react-hot-toast';

export interface PolicyData {
  name: string;
  workloads: string[];
  clusters: string[];
  namespace: string;
  yaml: string;
}

interface YamlPolicySpec {
  downsync?: Array<{
    apiGroup?: string;
    namespaces?: string[];
  }>;
}

interface YamlPolicy {
  metadata?: {
    name?: string;
    namespace?: string;
  };
  spec?: YamlPolicySpec;
}

interface CreateBindingPolicyDialogProps {
  open: boolean;
  onClose: () => void;
  onCreatePolicy: (policyData: PolicyData) => void;
  clusters?: ManagedCluster[];
  workloads?: Workload[];
}

const CreateBindingPolicyDialog: React.FC<CreateBindingPolicyDialogProps> = ({
  open,
  onClose,
  onCreatePolicy,
  clusters = [],
  workloads = [],
}) => {
  const theme = useTheme(state => state.theme);
  const { textColor, helperTextColor } = getBaseStyles(theme);
  const enhancedTabContentStyles = getEnhancedTabContentStyles(theme);

  const [activeTab, setActiveTab] = useState<string>('dragdrop');
  const [editorContent, setEditorContent] = useState<string>(DEFAULT_BINDING_POLICY_TEMPLATE);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [policyName, setPolicyName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDropYaml, setDragDropYaml] = useState<string>('');
  const [previewYaml, setPreviewYaml] = useState<string>('');
  const [, setSuccessMessage] = useState<string>('');
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [, setDeploymentError] = useState<string>('');
  const [, setShowDeployDialog] = useState(false);

  const policyCanvasEntities = usePolicyDragDropStore(state => state.canvasEntities);

  const { useGenerateBindingPolicyYaml, useQuickConnect } = useBPQueries();
  const generateYamlMutation = useGenerateBindingPolicyYaml();
  const quickConnectMutation = useQuickConnect();

  const handleTabChange = (_event: React.SyntheticEvent, value: string) => {
    setActiveTab(value);
    if (value === 'yaml' && !editorContent) {
      setEditorContent(DEFAULT_BINDING_POLICY_TEMPLATE);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleFileSelection = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        setFileContent(result);
        try {
          const parsedYaml = yaml.load(result) as YamlPolicy;
          if (parsedYaml?.metadata?.name) {
            setPolicyName(parsedYaml.metadata.name);
          }
        } catch (e) {
          console.error('Error parsing YAML:', e);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const fileType = file.name.split('.').pop()?.toLowerCase();

      if (fileType === 'yaml' || fileType === 'yml') {
        handleFileSelection(file);
      } else {
        setError('Only YAML files are allowed. Please drop a .yaml or .yml file.');
      }
    }
  };

  const generateResourcesFromWorkload = (workloadObj: Workload) => {
    console.log('Generating resources from workload:', workloadObj);

    const commonResources = [
      { type: 'namespaces', createOnly: true },
      { type: 'serviceaccounts', createOnly: false },
      { type: 'persistentvolumeclaims', createOnly: false },
      { type: 'configmaps', createOnly: false },
      { type: 'secrets', createOnly: false },
    ];

    // Special handling for database components - always include them
    const databaseResources = [
      { type: 'statefulsets', createOnly: false },
      { type: 'pods', createOnly: false },
      { type: 'serviceaccounts', createOnly: false },
      { type: 'roles', createOnly: false },
      { type: 'rolebindings', createOnly: false },
      { type: 'clusterroles', createOnly: false },
      { type: 'clusterrolebindings', createOnly: false },
    ];

    const resourceMapping: Record<string, Array<{ type: string; createOnly: boolean }>> = {
      deployment: [
        { type: 'deployments', createOnly: false },
        { type: 'replicasets', createOnly: false },
        { type: 'services', createOnly: false },
        { type: 'pods', createOnly: false },
      ],
      statefulset: [
        { type: 'statefulsets', createOnly: false },
        { type: 'services', createOnly: false },
        { type: 'pods', createOnly: false },
      ],
      daemonset: [
        { type: 'daemonsets', createOnly: false },
        { type: 'pods', createOnly: false },
      ],
      job: [
        { type: 'jobs', createOnly: false },
        { type: 'pods', createOnly: false },
      ],
      cronjob: [
        { type: 'cronjobs', createOnly: false },
        { type: 'jobs', createOnly: false },
        { type: 'pods', createOnly: false },
      ],
      service: [
        { type: 'services', createOnly: false },
        { type: 'endpoints', createOnly: false },
      ],
      ingress: [{ type: 'ingresses', createOnly: false }],
      configmap: [{ type: 'configmaps', createOnly: false }],
      secret: [{ type: 'secrets', createOnly: false }],
      persistentvolumeclaim: [{ type: 'persistentvolumeclaims', createOnly: false }],
      namespace: [{ type: 'namespaces', createOnly: true }],
      customresourcedefinition: [{ type: 'customresourcedefinitions', createOnly: false }],
      statefulsets: [
        { type: 'statefulsets', createOnly: false },
        { type: 'services', createOnly: false },
        { type: 'pods', createOnly: false },
      ],
    };

    let workloadSpecificResources: Array<{ type: string; createOnly: boolean }> = [];

    // Determine resources based on workload kind
    if (workloadObj?.kind) {
      const kindLower = workloadObj.kind.toLowerCase();

      if (resourceMapping[kindLower]) {
        workloadSpecificResources = resourceMapping[kindLower];
      } else {
        let resourceType = kindLower;

        if (!resourceType.endsWith('s')) {
          resourceType += 's';
        }

        workloadSpecificResources = [{ type: resourceType, createOnly: false }];
      }
    } else {
      console.warn('Workload kind missing, adding deployment resources as default');
      workloadSpecificResources = resourceMapping['deployment'];
    }

    // Combine resources in priority order: database, common, workload-specific
    const resources = [...databaseResources, ...commonResources, ...workloadSpecificResources];

    const uniqueResources = resources.filter(
      (resource, index, self) => index === self.findIndex(r => r.type === resource.type)
    );

    console.log('Final resources:', uniqueResources);
    return uniqueResources;
  };

  const extractLabelInfo = (labelId: string): { key: string; value: string } | null => {
    if (!labelId.startsWith('label-')) return null;

    console.log(`CreateBindingPolicy: Parsing label ID: ${labelId}`);

    // Remove the 'label-' prefix
    const labelPart = labelId.substring(6);

    if (labelId === 'label-location-group:edge') {
      console.log('CreateBindingPolicy: Found location-group:edge label');
      return { key: 'location-group', value: 'edge' };
    }

    if (labelPart.includes(':')) {
      const colonIndex = labelPart.indexOf(':');
      const key = labelPart.substring(0, colonIndex);
      const value = labelPart.substring(colonIndex + 1);
      console.log(`CreateBindingPolicy: Found colon format "${key}:${value}"`);
      return { key, value };
    }

    if (labelPart.includes('=')) {
      const equalsIndex = labelPart.indexOf('=');
      const key = labelPart.substring(0, equalsIndex);
      const value = labelPart.substring(equalsIndex + 1);
      console.log(`CreateBindingPolicy: Found equals format "${key}=${value}"`);
      return { key, value };
    }

    const lastDashIndex = labelPart.lastIndexOf('-');
    if (lastDashIndex !== -1 && lastDashIndex > 0) {
      const key = labelPart.substring(0, lastDashIndex);
      const value = labelPart.substring(lastDashIndex + 1);
      console.log(`CreateBindingPolicy: Parsed using last dash: key="${key}", value="${value}"`);
      return { key, value };
    }

    const parts = labelId.split('-');
    if (parts.length >= 3) {
      const key = parts[1];
      const value = parts.slice(2).join('-');
      console.log(`CreateBindingPolicy: Fallback parsing: key="${key}", value="${value}"`);
      return { key, value };
    }

    console.log(`CreateBindingPolicy: Unable to parse label format: ${labelId}`);
    return null;
  };

  const isClusterScopedLabel = (labelInfo: { key: string; value: string }): boolean => {
    if (!labelInfo) return false;

    // Patterns that identify cluster-scoped resources
    const clusterScopedPatterns = [
      // API group domain patterns
      { valuePattern: /\.io$/ },
      { valuePattern: /\.k8s\.io/ },
      { valuePattern: /\.internal/ },

      // Part-of labels for cluster-level components
      { key: 'app.kubernetes.io/part-of' },

      // Common cluster-scoped resource indicators
      { valuePattern: /^cluster/ },
      { valuePattern: /^custom/ },
      { valuePattern: /^crd/ },
      { valuePattern: /definition/ },
    ];

    // Check against all patterns
    return clusterScopedPatterns.some(pattern => {
      if (pattern.key && labelInfo.key !== pattern.key) {
        return false;
      }

      if (pattern.valuePattern && !pattern.valuePattern.test(labelInfo.value)) {
        return false;
      }

      return true;
    });
  };

  // Helper function to check if label corresponds to a namespace
  const isNamespaceLabel = (labelInfo: { key: string; value: string }): boolean => {
    if (!labelInfo) return false;

    // Standard Kubernetes namespace identifiers
    const namespacePatterns = [
      // Standard Kubernetes namespace metadata label
      { key: 'kubernetes.io/metadata.name', valuePattern: null },
      // Common namespace identifiers
      { key: 'name', valuePattern: /namespace/ },
      { key: 'k8s-namespace', valuePattern: null },
      { key: 'type', valuePattern: /^namespace$/i },
      // Any key containing 'namespace'
      { keyPattern: /namespace/i, valuePattern: null },
      // Simple name labels that might be namespaces
      { key: 'name', valuePattern: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/ },
    ];

    // Check against all patterns
    return namespacePatterns.some(pattern => {
      // Check for exact key match if specified
      if (pattern.key && labelInfo.key !== pattern.key) {
        return false;
      }

      // Check for key pattern match if specified
      if (pattern.keyPattern && !pattern.keyPattern.test(labelInfo.key)) {
        return false;
      }

      // Check for value pattern match if specified
      if (pattern.valuePattern && !pattern.valuePattern.test(labelInfo.value)) {
        return false;
      }

      return true;
    });
  };

  // Add this utility function to determine resource kind from labels
  const determineResourceKind = (labelInfo: { key: string; value: string }): string => {
    if (labelInfo.key === 'app.kubernetes.io/part-of') {
      return labelInfo.value.charAt(0).toUpperCase() + labelInfo.value.slice(1);
    }

    if (labelInfo.key === 'app.kubernetes.io/name') {
      return labelInfo.value.charAt(0).toUpperCase() + labelInfo.value.slice(1);
    }

    // For labels where the value contains a domain (API group)
    if (labelInfo.value.includes('.')) {
      return 'CustomResourceDefinition';
    }

    return labelInfo.value.charAt(0).toUpperCase() + labelInfo.value.slice(1);
  };

  const handleCreateBindingPolicy = async (
    clusterIds: string[],
    workloadIds: string[],
    config?: PolicyConfiguration
  ) => {
    console.log('Creating binding policy with:', { clusterIds, workloadIds, config });

    if (clusterIds.length === 0 || workloadIds.length === 0) {
      toast.error('Both cluster and workload are required');
      return;
    }

    const clusterId = clusterIds[0];
    const workloadId = workloadIds[0];

    let workloadObj;
    let isClusterScoped = false;
    let isNamespace = false;

    if (workloadId.startsWith('label-')) {
      const labelInfo = extractLabelInfo(workloadId);
      console.log('Extracted workload label info:', labelInfo);

      if (labelInfo) {
        if (isNamespaceLabel(labelInfo)) {
          console.log(`Using namespace label: ${labelInfo.key}=${labelInfo.value}`);
          isNamespace = true;

          workloadObj = {
            name: labelInfo.value,
            namespace: labelInfo.value,
            kind: 'Namespace',
            labels: { [labelInfo.key]: labelInfo.value },
          };
        } else if (isClusterScopedLabel(labelInfo)) {
          console.log(`Using cluster-scoped resource label: ${labelInfo.key}=${labelInfo.value}`);
          isClusterScoped = true;

          workloadObj = {
            name: labelInfo.value,
            namespace: 'cluster-scoped',
            kind: determineResourceKind(labelInfo),
            labels: { [labelInfo.key]: labelInfo.value },
          };
        } else {
          const matchingWorkloads = workloads.filter(
            workload => workload.labels && workload.labels[labelInfo.key] === labelInfo.value
          );

          console.log('Found matching workloads by label:', matchingWorkloads.length);

          if (matchingWorkloads.length > 0) {
            workloadObj = matchingWorkloads[0];
          } else {
            console.log(
              `No existing workloads match label ${labelInfo.key}=${labelInfo.value}, using synthetic workload`
            );

            workloadObj = {
              name: `${labelInfo.value}-resource`,
              namespace: 'default',
              kind: determineResourceKind(labelInfo),
              labels: { [labelInfo.key]: labelInfo.value },
            };

            if (labelInfo.key === 'app.kubernetes.io/part-of') {
              workloadObj.kind = labelInfo.value.charAt(0).toUpperCase() + labelInfo.value.slice(1);
              workloadObj.namespace = 'cluster-scoped';
            }

            console.log(`Created synthetic workload:`, workloadObj);
          }
        }
      } else {
        console.error('Invalid workload label format:', workloadId);
        toast.error(`Invalid workload label format: ${workloadId}`);
        return;
      }
    } else {
      workloadObj = workloads.find(w => w.name === workloadId);
    }

    if (!workloadObj) {
      console.error('Workload not found:', workloadId);
      toast.error(`Workload not found: ${workloadId}`);
      return;
    }

    const workloadNamespace = isClusterScoped ? 'default' : workloadObj.namespace || 'default';

    try {
      let clusterObj;
      let clusterLabelValue = '';

      if (clusterId.startsWith('label-')) {
        const labelInfo = extractLabelInfo(clusterId);
        console.log('Extracted cluster label info:', labelInfo);

        if (labelInfo) {
          clusterLabelValue = labelInfo.value;
          const matchingClusters = clusters.filter(
            cluster => cluster.labels && cluster.labels[labelInfo.key] === labelInfo.value
          );

          console.log('Found matching clusters by label:', matchingClusters.length);

          if (matchingClusters.length > 0) {
            clusterObj = matchingClusters[0];
          } else {
            console.error('No clusters match label:', labelInfo);
            toast.error(`No clusters found with label ${labelInfo.key}=${labelInfo.value}`);
            return;
          }
        } else {
          console.error('Invalid cluster label format:', clusterId);
          toast.error(`Invalid cluster label format: ${clusterId}`);
          return;
        }
      } else {
        clusterObj = clusters.find(c => c.name === clusterId);
        clusterLabelValue = clusterObj?.name || 'unknown';
      }

      if (!clusterObj) {
        console.error('Cluster not found:', clusterId);
        toast.error(`Cluster not found: ${clusterId}`);
        return;
      }

      const workloadLabels: Record<string, string> = {};
      const clusterLabels: Record<string, string> = {};

      if (workloadId.startsWith('label-')) {
        const labelInfo = extractLabelInfo(workloadId);
        if (labelInfo) {
          workloadLabels[labelInfo.key] = labelInfo.value;
        }
      } else {
        workloadLabels['kubestellar.io/workload'] = workloadObj.name;
      }

      if (clusterId.startsWith('label-')) {
        const labelInfo = extractLabelInfo(clusterId);
        if (labelInfo) {
          clusterLabels[labelInfo.key] = labelInfo.value;
        }
      } else {
        clusterLabels['name'] = clusterObj.name;
      }

      let resources;
      if (isNamespace) {
        resources = [{ type: 'namespaces', createOnly: true }];
      } else if (isClusterScoped) {
        resources = [
          { type: 'namespaces', createOnly: true },
          { type: 'customresourcedefinitions', createOnly: false },
        ];
      } else {
        // For regular workloads
        resources = generateResourcesFromWorkload(workloadObj);
      }

      // Generate the new policy name format
      const resourceType = workloadObj.kind?.toLowerCase() || 'resource';
      const uniqueId = Math.floor(Math.random() * 100)
        .toString()
        .padStart(2, '0');
      const randomDigits = Math.floor(Math.random() * 100)
        .toString()
        .padStart(2, '0');

      const newPolicyName = `${clusterLabelValue}-${resourceType}-${uniqueId}${randomDigits}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      const requestData = {
        workloadLabels,
        clusterLabels,
        resources,
        namespacesToSync: [workloadNamespace],
        namespace: workloadNamespace,
        policyName: config?.name || newPolicyName,
      };

      console.log('📤 SENDING REQUEST TO GENERATE-YAML API (CreateBindingPolicyDialog):');
      console.log(JSON.stringify(requestData, null, 2));
      console.log(
        '🔍 workloadObj:',
        JSON.stringify(
          {
            name: workloadObj.name,
            namespace: workloadObj.namespace,
            kind: workloadObj.kind,
            labels: workloadObj.labels,
          },
          null,
          2
        )
      );
      console.log(
        '🔍 clusterObj:',
        JSON.stringify(
          {
            name: clusterObj.name,
            labels: clusterObj.labels,
          },
          null,
          2
        )
      );

      const generateYamlResponse = await generateYamlMutation.mutateAsync(requestData);

      setPreviewYaml(generateYamlResponse.yaml);

      const policyData: PolicyData = {
        name: config?.name || newPolicyName,
        workloads: [workloadObj.name],
        clusters: [clusterObj.name],
        namespace: workloadNamespace,
        yaml: generateYamlResponse.yaml,
      };

      if (onCreatePolicy) {
        onCreatePolicy(policyData);
      }

      setSuccessMessage('Binding policy created successfully');
      handleClearPolicyCanvas();
      onClose();
    } catch (error) {
      console.error('Error creating binding policy:', error);
      toast.error('Failed to create binding policy');
    }
  };

  const prepareForDeployment = async () => {
    if (policyCanvasEntities.clusters.length === 0 || policyCanvasEntities.workloads.length === 0) {
      setError('Both clusters and workloads are required to create binding policies');
      return;
    }

    setIsLoading(true);
    setError('');

    if (policyCanvasEntities.clusters.length > 0 && policyCanvasEntities.workloads.length > 0) {
      const workloadId = policyCanvasEntities.workloads[0];
      const clusterId = policyCanvasEntities.clusters[0];

      console.log('Working with workloadId:', workloadId, 'clusterId:', clusterId);

      // Find the workload object
      let workloadObj;
      let isNamespace = false;
      let isClusterScoped = false;

      if (workloadId.startsWith('label-')) {
        const labelInfo = extractLabelInfo(workloadId);
        console.log('Extracted label info:', labelInfo);

        if (labelInfo) {
          // Check if this is a namespace label
          if (isNamespaceLabel(labelInfo)) {
            console.log(`Using namespace label: ${labelInfo.key}=${labelInfo.value}`);
            isNamespace = true;
            workloadObj = {
              name: labelInfo.value,
              namespace: labelInfo.value,
              kind: 'Namespace',
              labels: { [labelInfo.key]: labelInfo.value },
            };
          }
          // Check if this is a cluster-scoped resource
          else if (isClusterScopedLabel(labelInfo)) {
            console.log(`Using cluster-scoped resource label: ${labelInfo.key}=${labelInfo.value}`);
            isClusterScoped = true;

            workloadObj = {
              name: labelInfo.value,
              namespace: 'cluster-scoped',
              kind: determineResourceKind(labelInfo),
              labels: { [labelInfo.key]: labelInfo.value },
            };
          } else {
            // Try to find a matching workload
            const matchingWorkloads = workloads.filter(
              workload => workload.labels && workload.labels[labelInfo.key] === labelInfo.value
            );

            console.log('Found matching workloads by label:', matchingWorkloads.length);

            if (matchingWorkloads.length > 0) {
              workloadObj = matchingWorkloads[0];
            } else {
              console.log(
                `No existing workloads match label ${labelInfo.key}=${labelInfo.value}, using synthetic workload`
              );

              workloadObj = {
                name: `${labelInfo.value}-resource`,
                namespace: 'default',
                kind: determineResourceKind(labelInfo),
                labels: { [labelInfo.key]: labelInfo.value },
              };

              // For CRDs and API group patterns, mark as cluster-scoped
              if (labelInfo.value.includes('.')) {
                workloadObj.namespace = 'cluster-scoped';
                isClusterScoped = true;
              }

              if (labelInfo.key === 'app.kubernetes.io/part-of') {
                workloadObj.kind =
                  labelInfo.value.charAt(0).toUpperCase() + labelInfo.value.slice(1);
                workloadObj.namespace = 'cluster-scoped';
                isClusterScoped = true;
              }

              console.log('Created synthetic workload:', workloadObj);
            }
          }
        } else {
          setError(`Invalid workload label format: ${workloadId}`);
          setIsLoading(false);
          return;
        }
      } else {
        workloadObj = workloads.find(workload => workload.name === workloadId);
      }

      if (!workloadObj) {
        setError(`Workload not found: ${workloadId}`);
        setIsLoading(false);
        return;
      }

      let clusterObj;
      let clusterLabelValue = '';

      if (clusterId.startsWith('label-')) {
        const labelInfo = extractLabelInfo(clusterId);
        console.log('Extracted cluster label info:', labelInfo);

        if (labelInfo) {
          clusterLabelValue = labelInfo.value;
          const matchingClusters = clusters.filter(
            cluster => cluster.labels && cluster.labels[labelInfo.key] === labelInfo.value
          );

          console.log('Found matching clusters by label:', matchingClusters.length);

          if (matchingClusters.length > 0) {
            clusterObj = matchingClusters[0];
          } else {
            console.log(
              `No clusters match label: ${labelInfo.key}=${labelInfo.value}, creating synthetic cluster`
            );
            clusterObj = {
              name: `${labelInfo.value}-cluster`,
              status: 'Ready',
              location: 'Unknown',
              labels: { [labelInfo.key]: labelInfo.value },
            };
          }
        } else {
          setError(`Invalid cluster label format: ${clusterId}`);
          setIsLoading(false);
          return;
        }
      } else {
        clusterObj = clusters.find(c => c.name === clusterId);
        clusterLabelValue = clusterObj?.name || 'unknown';
      }

      if (!clusterObj) {
        console.error('Cluster not found:', clusterId);
        setError(`Cluster not found: ${clusterId}`);
        setIsLoading(false);
        return;
      }

      const workloadNamespace = isClusterScoped ? 'default' : workloadObj.namespace || 'default';

      const resourceType = workloadObj.kind?.toLowerCase() || 'resource';
      const uniqueId = Math.floor(Math.random() * 100)
        .toString()
        .padStart(2, '0');
      const randomDigits = Math.floor(Math.random() * 100)
        .toString()
        .padStart(2, '0');

      const policyName = `${clusterLabelValue}-${resourceType}-${uniqueId}${randomDigits}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Prepare labels for the API request
      const workloadLabels: Record<string, string> = {};
      const clusterLabels: Record<string, string> = {};

      if (workloadId.startsWith('label-')) {
        const labelInfo = extractLabelInfo(workloadId);
        if (labelInfo) {
          workloadLabels[labelInfo.key] = labelInfo.value;
        }
      } else {
        workloadLabels['kubestellar.io/workload'] = workloadObj.name;
      }

      if (clusterId.startsWith('label-')) {
        const labelInfo = extractLabelInfo(clusterId);
        if (labelInfo) {
          clusterLabels[labelInfo.key] = labelInfo.value;
        }
      } else {
        clusterLabels['name'] = clusterObj.name;
      }

      try {
        // Adjust resources for different types of workloads
        let resources;
        if (isNamespace) {
          resources = [{ type: 'namespaces', createOnly: true }];
        } else if (isClusterScoped) {
          resources = [{ type: 'namespaces', createOnly: true }];

          // For CRDs with domain in the value, add them specifically
          if (workloadObj.kind === 'CustomResourceDefinition' && workloadObj.name.includes('.')) {
            // Extract the resource type from the CRD name
            const parts = workloadObj.name.split('.');
            if (parts.length > 1) {
              const resourceType = parts[0].toLowerCase();
              resources.push({ type: resourceType, createOnly: false });
              console.log(`Added specific resource type for CRD: ${resourceType}`);
            }

            // Add CRDs as a resource type
            resources.push({ type: 'customresourcedefinitions', createOnly: false });
          } else {
            resources = generateResourcesFromWorkload(workloadObj);
          }
        } else {
          resources = generateResourcesFromWorkload(workloadObj);
        }

        const requestData = {
          workloadLabels,
          clusterLabels,
          resources,
          namespacesToSync: [workloadNamespace],
          policyName,
          namespace: workloadNamespace,
        };

        // Add detailed console logging
        console.log('📤 SENDING REQUEST TO QUICK-CONNECT API (prepareForDeployment):');
        console.log(JSON.stringify(requestData, null, 2));
        console.log(
          '🔍 workloadObj:',
          JSON.stringify(
            {
              name: workloadObj.name,
              namespace: workloadObj.namespace,
              kind: workloadObj.kind,
              labels: workloadObj.labels,
            },
            null,
            2
          )
        );
        console.log(
          '🔍 clusterObj:',
          JSON.stringify(
            {
              name: clusterObj.name,
              labels: clusterObj.labels,
            },
            null,
            2
          )
        );

        const result = await quickConnectMutation.mutateAsync(requestData);
        console.log(result);

        setSuccessMessage(`Successfully created binding policy "${policyName}"`);
        setShowDeployDialog(false);
        handleClearPolicyCanvas();
        setIsLoading(false);
        onClose();
      } catch (error) {
        console.error('Failed to create binding policy:', error);
        setDeploymentError(
          error instanceof Error
            ? error.message
            : 'Failed to create binding policy. Please try again.'
        );
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  };

  const handleCreateFromFile = async () => {
    if (activeTab === 'file') {
      if (!fileContent) {
        setError('Please select a YAML file first');
        return;
      }

      if (!policyName) {
        setError(
          'Could not extract policy name from YAML. Please ensure your YAML has metadata.name'
        );
        return;
      }
    } else if (activeTab === 'yaml') {
      if (!editorContent) {
        setError('YAML content is required');
        return;
      }

      if (!policyName) {
        setError(
          'Could not extract policy name from YAML. Please ensure your YAML has metadata.name'
        );
        return;
      }
    }

    setIsLoading(true);
    setError('');

    try {
      let content = '';
      if (activeTab === 'yaml') {
        content = editorContent;
      } else if (activeTab === 'file') {
        content = fileContent;
      }

      let workloadInfo = 'default-workload';
      let namespace = 'default';
      try {
        const parsedYaml = yaml.load(content) as YamlPolicy;
        if (parsedYaml?.spec?.downsync?.[0]?.apiGroup) {
          workloadInfo = parsedYaml.spec.downsync[0].apiGroup;
        }
        if (parsedYaml?.metadata?.namespace) {
          namespace = parsedYaml.metadata.namespace;
        }
        if (parsedYaml?.spec?.downsync?.[0]?.namespaces?.[0]) {
          namespace = parsedYaml.spec.downsync[0].namespaces[0];
        }
      } catch (e) {
        console.error('Error parsing YAML for workload info:', e);
      }

      // First create the binding policy
      const policyData: PolicyData = {
        name: policyName,
        workloads: [workloadInfo],
        clusters: policyCanvasEntities.clusters,
        namespace: namespace,
        yaml: content,
      };

      if (onCreatePolicy) {
        onCreatePolicy(policyData);
      }

      setSuccessMessage('Binding policy created successfully');

      setTimeout(() => {
        setEditorContent(DEFAULT_BINDING_POLICY_TEMPLATE);
        setPolicyName('');
        setSelectedFile(null);
        setFileContent('');
        setDragDropYaml('');
      }, 500);

      setIsLoading(false);
    } catch (error) {
      console.error('Error creating binding policy:', error);
      setError(
        error instanceof Error ? `Error: ${error.message}` : 'Failed to create binding policy'
      );
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setEditorContent(DEFAULT_BINDING_POLICY_TEMPLATE);
      setPolicyName('');
      setSelectedFile(null);
      setFileContent('');
      setError('');
      setIsLoading(false);
      setDragDropYaml('');
    }

    return () => {
      if (!open) {
        setIsLoading(false);
      }
    };
  }, [open]);

  useEffect(() => {
    if (activeTab === 'yaml' && editorContent) {
      try {
        const parsedYaml = yaml.load(editorContent) as YamlPolicy;
        if (parsedYaml?.metadata?.name) {
          setPolicyName(parsedYaml.metadata.name);
          console.log('Detected policy name:', parsedYaml.metadata.name);
        } else {
          console.debug('No metadata.name found in YAML');
        }
      } catch (e) {
        // Don't show error here, just don't update the policy name
        console.debug('Error parsing YAML while typing:', e);
      }
    }
  }, [activeTab, editorContent]);

  useEffect(() => {
    if (open && activeTab === 'yaml' && editorContent) {
      try {
        const parsedYaml = yaml.load(editorContent) as YamlPolicy;
        if (parsedYaml?.metadata?.name) {
          setPolicyName(parsedYaml.metadata.name);
        }
      } catch (e) {
        console.debug('Error parsing initial YAML:', e);
      }
    }
  }, [open, activeTab, editorContent]);

  const handleCancelClick = () => {
    if (
      activeTab === 'yaml'
        ? editorContent !== DEFAULT_BINDING_POLICY_TEMPLATE
        : activeTab === 'file'
          ? fileContent || policyName
          : dragDropYaml
    ) {
      setShowCancelConfirmation(true);
    } else {
      onClose();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelConfirmation(false);
    setIsLoading(false);
    onClose();
  };

  const isDarkTheme = theme === 'dark';

  const handleClearPolicyCanvas = () => {
    usePolicyDragDropStore.getState().clearCanvas();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleCancelClick}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: {
            ...getDialogPaperProps(theme),
            height: '95vh',
            maxHeight: '95vh',
            minWidth: '90vw',
          },
        }}
      >
        <DialogTitle
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            p: 2,
            flex: '0 0 auto',
            display: 'flex',
            flexDirection: 'column',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Typography variant="h6" component="span" fontWeight={600}>
            Create Binding Policy
          </Typography>

          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={getTabsStyles(theme)}
          >
            <StyledTab
              icon={<DragIndicatorIcon sx={{ color: isDarkTheme ? '#FFFFFF' : 'inherit' }} />}
              iconPosition="start"
              label="Click & Drop"
              value="dragdrop"
              sx={{
                color: isDarkTheme ? '#FFFFFF' : 'primary.main',
                '&:hover': {
                  bgcolor: 'rgba(25, 118, 210, 0.04)',
                },
              }}
            />

            <StyledTab
              icon={
                <span
                  role="img"
                  aria-label="yaml"
                  style={{
                    fontSize: '0.9rem',
                    color: isDarkTheme ? '#FFFFFF' : 'inherit',
                  }}
                >
                  📄
                </span>
              }
              iconPosition="start"
              label="YAML"
              value="yaml"
            />
            <StyledTab
              icon={
                <span
                  role="img"
                  aria-label="file"
                  style={{
                    fontSize: '0.9rem',
                    color: isDarkTheme ? '#FFFFFF' : 'inherit',
                  }}
                >
                  📁
                </span>
              }
              iconPosition="start"
              label="Upload File"
              value="file"
            />
          </Tabs>
        </DialogTitle>
        <DialogContent
          sx={{
            p: 2,
            flex: 1,
            overflow: 'hidden',
            mt: 0,
            height: 'calc(95vh - 140px)',
          }}
        >
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'}`,
              backgroundColor:
                theme === 'dark' ? 'rgba(17, 25, 40, 0.8)' : 'rgba(255, 255, 255, 0.8)',
              boxShadow:
                theme === 'dark'
                  ? '0 4px 12px rgba(0, 0, 0, 0.5)'
                  : '0 4px 12px rgba(0, 0, 0, 0.05)',
              mb: 1,
              borderRadius: { xs: 1.5, sm: 2 },
            }}
          >
            <Box sx={{ px: 2 }}>
              {activeTab !== 'dragdrop' && (
                <TextField
                  fullWidth
                  label="Binding Policy Name"
                  value={policyName}
                  onChange={e => setPolicyName(e.target.value)}
                  required
                  sx={{
                    my: 1,
                    '& .MuiInputBase-input': {
                      color: textColor,
                      backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.1)' : 'transparent',
                    },
                    '& .MuiInputLabel-root': {
                      color: theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : textColor,
                      ...(policyName && {
                        color: theme === 'dark' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                      }),
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: policyName
                        ? theme === 'dark'
                          ? 'rgba(255, 255, 255, 0.5)'
                          : 'rgba(0, 0, 0, 0.5)'
                        : theme === 'dark'
                          ? 'rgba(255, 255, 255, 0.23)'
                          : 'divider',
                      borderRadius: '8px',
                    },
                    '& .MuiFormHelperText-root': {
                      color: policyName
                        ? theme === 'dark'
                          ? 'rgba(255, 255, 255, 0.9)'
                          : 'rgba(0, 0, 0, 0.9)'
                        : theme === 'dark'
                          ? 'rgba(255, 255, 255, 0.7)'
                          : helperTextColor,
                      marginTop: 0.5,
                    },
                    '& .MuiOutlinedInput-root': {
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: policyName
                          ? theme === 'dark'
                            ? 'rgba(255, 255, 255, 0.5)'
                            : 'rgba(0, 0, 0, 0.5)'
                          : theme === 'dark'
                            ? 'rgba(255, 255, 255, 0.5)'
                            : 'primary.main',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: policyName
                          ? theme === 'dark'
                            ? ''
                            : ''
                          : theme === 'dark'
                            ? '#2563eb'
                            : 'primary.main',
                        borderWidth: 2,
                      },
                    },
                  }}
                  InputProps={{
                    readOnly: true,
                  }}
                />
              )}
            </Box>

            <Box
              sx={{
                flex: 1,
                overflow: 'hidden',
                p: 2,
              }}
            >
              {activeTab === 'yaml' && (
                <Box
                  sx={{
                    ...enhancedTabContentStyles,
                    border: 'none',
                    boxShadow: 'none',
                    bgcolor: 'transparent',
                    p: 0,
                    flex: 1,
                    height: '75vh',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <StyledPaper
                    elevation={0}
                    sx={{
                      height: '100%',
                      overflow: 'auto',
                      flexGrow: 1,
                      border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'}`,
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      bgcolor: theme === 'dark' ? '#1e1e1e' : '#fff',
                    }}
                  >
                    <Editor
                      height="100%"
                      language="yaml"
                      value={editorContent}
                      theme={isDarkTheme ? 'vs-dark' : 'light'}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: true,
                        automaticLayout: true,
                        fontFamily: "'JetBrains Mono', monospace",
                        padding: { top: 10, bottom: 10 },
                      }}
                      onChange={value => {
                        setEditorContent(value || '');
                        if (value) {
                          try {
                            const parsedYaml = yaml.load(value) as YamlPolicy;
                            if (parsedYaml?.metadata?.name) {
                              setPolicyName(parsedYaml.metadata.name);
                            }
                          } catch (e) {
                            console.log('Error parsing YAML on change:', e);
                          }
                        }
                      }}
                    />
                  </StyledPaper>
                </Box>
              )}

              {activeTab === 'file' && (
                <Box
                  sx={{
                    ...enhancedTabContentStyles,
                    height: 'calc(100% - 32px)', // Match CreateOptions height
                    border: 'none',
                    boxShadow: 'none',
                    bgcolor: 'transparent',
                    p: 0,
                    borderRadius: 2,
                    minHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  {!selectedFile ? (
                    <StyledPaper
                      elevation={0}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      sx={{
                        height: '100%',
                        border: '2px dashed',
                        borderColor: isDragging
                          ? 'primary.main'
                          : theme === 'dark'
                            ? 'rgba(255, 255, 255, 0.2)'
                            : 'divider',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        flexGrow: 1,
                        backgroundColor: isDragging
                          ? isDarkTheme
                            ? 'rgba(25, 118, 210, 0.12)'
                            : 'rgba(25, 118, 210, 0.04)'
                          : 'transparent',
                        '&:hover': {
                          borderColor: 'primary.main',
                          backgroundColor: isDarkTheme
                            ? 'rgba(25, 118, 210, 0.08)'
                            : 'rgba(25, 118, 210, 0.04)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          textAlign: 'center',
                          maxWidth: '80%',
                          py: 4,
                        }}
                      >
                        <span
                          role="img"
                          aria-label="upload"
                          style={{ fontSize: '2.5rem', display: 'block', marginBottom: '16px' }}
                        >
                          📤
                        </span>
                        <Typography
                          variant="h6"
                          gutterBottom
                          sx={{
                            color: theme === 'dark' ? '#d4d4d4' : '#333',
                            fontWeight: 500,
                            mb: 2,
                          }}
                        >
                          {isDragging ? 'Drop YAML File Here' : 'Choose or Drag & Drop a YAML File'}
                        </Typography>
                        <Box
                          sx={{
                            color: theme === 'dark' ? '#d4d4d4' : '#333',
                            mb: 3,
                            fontSize: '0.9rem',
                            opacity: 0.7,
                          }}
                        >
                          - or -
                        </Box>
                        <Button
                          variant="contained"
                          component="label"
                          startIcon={<FileUploadIcon />}
                          sx={{
                            mb: 2,
                            textTransform: 'none',
                            borderRadius: '8px',
                            fontWeight: 500,
                            px: 3,
                            py: 1.2,
                            bgcolor: isDarkTheme ? '#2563eb' : undefined,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                              bgcolor: isDarkTheme ? '#1d4ed8' : undefined,
                            },
                          }}
                        >
                          Select YAML File
                          <input
                            type="file"
                            hidden
                            accept=".yaml,.yml"
                            onChange={handleFileChange}
                          />
                        </Button>
                        <Typography
                          variant="body2"
                          sx={{
                            mt: 2,
                            color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : 'text.secondary',
                            fontSize: '0.8rem',
                          }}
                        >
                          Accepted formats: .yaml, .yml
                        </Typography>
                      </Box>
                    </StyledPaper>
                  ) : (
                    <Box
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          mb: 2,
                          p: 2,
                          borderRadius: '8px',
                          bgcolor: isDarkTheme
                            ? 'rgba(25, 118, 210, 0.08)'
                            : 'rgba(25, 118, 210, 0.04)',
                          border: '1px solid',
                          borderColor: isDarkTheme
                            ? 'rgba(25, 118, 210, 0.2)'
                            : 'rgba(25, 118, 210, 0.1)',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                          <Typography variant="body1">
                            <strong>{selectedFile.name}</strong> (
                            {(selectedFile.size / 1024).toFixed(1)} KB)
                          </Typography>
                        </Box>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            setSelectedFile(null);
                            setFileContent('');
                            setPolicyName('');
                          }}
                          sx={{
                            textTransform: 'none',
                            borderRadius: '8px',
                          }}
                        >
                          Choose Different File
                        </Button>
                      </Box>
                      <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 1 }}>
                        File Preview:
                      </Typography>
                      <StyledPaper
                        elevation={0}
                        sx={{
                          flexGrow: 1,
                          height: 'calc(100% - 90px)',
                          overflow: 'auto',
                          border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'}`,
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          mb: 2,
                        }}
                      >
                        <Editor
                          height="100%"
                          language="yaml"
                          value={fileContent}
                          theme={isDarkTheme ? 'vs-dark' : 'light'}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            lineNumbers: 'on',
                            scrollBeyondLastLine: true,
                            automaticLayout: true,
                            fontFamily: "'JetBrains Mono', monospace",
                            padding: { top: 10, bottom: 10 },
                            readOnly: true,
                          }}
                        />
                      </StyledPaper>
                    </Box>
                  )}
                </Box>
              )}

              {activeTab === 'dragdrop' && (
                <Box
                  sx={{
                    ...enhancedTabContentStyles,
                    height: '65vh',
                    border: 'none',
                    boxShadow: 'none',
                    bgcolor: 'transparent',
                    p: 0,
                    overflow: 'hidden',
                  }}
                >
                  <PolicyDragDrop
                    clusters={clusters}
                    workloads={workloads}
                    onCreateBindingPolicy={handleCreateBindingPolicy}
                    dialogMode={true}
                  />
                </Box>
              )}
            </Box>

            <DialogActions
              sx={{
                p: 1.5,
                bgcolor: isDarkTheme ? 'rgba(17, 25, 40, 0.9)' : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(10px)',
                borderTop: `1px solid ${isDarkTheme ? 'rgba(255, 255, 255, 0.12)' : 'transparent'}`,
              }}
            >
              <Button
                onClick={handleCancelClick}
                disabled={isLoading}
                sx={{
                  px: 3,
                  py: 1,
                  textTransform: 'none',
                  fontWeight: 500,
                  borderRadius: '8px',
                  color: isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : undefined,
                  '&:hover': {
                    backgroundColor: isDarkTheme
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={activeTab === 'dragdrop' ? prepareForDeployment : handleCreateFromFile}
                color="primary"
                disabled={
                  isLoading ||
                  (activeTab === 'dragdrop' &&
                    (!policyCanvasEntities?.clusters?.length ||
                      !policyCanvasEntities?.workloads?.length)) ||
                  (activeTab === 'file' && !fileContent) ||
                  (activeTab === 'yaml' && !editorContent)
                }
                sx={{
                  bgcolor: isDarkTheme ? '#2563eb !important' : '#1976d2 !important',
                  color: '#fff !important',
                  '&:hover': {
                    bgcolor: isDarkTheme ? '#1d4ed8 !important' : '#1565c0 !important',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                  },
                  '&:disabled': {
                    bgcolor: isDarkTheme
                      ? 'rgba(37, 99, 235, 0.5) !important'
                      : 'rgba(25, 118, 210, 0.5) !important',
                    color: 'rgba(255, 255, 255, 0.7) !important',
                  },
                  textTransform: 'none',
                  fontWeight: 500,
                  borderRadius: '8px',
                  px: 3,
                  py: 1,
                  transition: 'all 0.2s ease',
                }}
              >
                {isLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box
                      component="span"
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        border: '2px solid currentColor',
                        borderRightColor: 'transparent',
                        animation: 'spin 1s linear infinite',
                        display: 'inline-block',
                        mr: 1,
                        '@keyframes spin': {
                          '0%': { transform: 'rotate(0deg)' },
                          '100%': { transform: 'rotate(360deg)' },
                        },
                      }}
                    />
                    Creating...
                  </Box>
                ) : activeTab === 'dragdrop' ? (
                  'Deploy Binding Policies'
                ) : (
                  'Create Binding Policy'
                )}
              </Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>

      <CancelConfirmationDialog
        open={showCancelConfirmation}
        onClose={() => setShowCancelConfirmation(false)}
        onConfirm={handleConfirmCancel}
      />

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setError('')}
          sx={{
            width: '100%',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(211, 47, 47, 0.2)',
          }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Dialog
        open={showPreviewDialog}
        onClose={() => setShowPreviewDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            height: '80vh',
            maxHeight: '80vh',
            bgcolor: isDarkTheme ? '#1A2231' : undefined,
            color: isDarkTheme ? '#FFFFFF' : undefined,
            border: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.12)' : undefined,
          },
        }}
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ color: isDarkTheme ? '#FFFFFF' : undefined }}>
            Preview Generated YAML
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <StyledPaper
            elevation={0}
            sx={{
              height: 'calc(100% - 32px)',
              overflow: 'hidden',
              bgcolor: isDarkTheme ? 'rgba(30, 41, 59, 0.8)' : undefined,
              border: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.12)' : undefined,
            }}
          >
            <Editor
              height="100%"
              language="yaml"
              value={previewYaml}
              theme={isDarkTheme ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                fontFamily: "'JetBrains Mono', monospace",
                padding: { top: 10 },
                readOnly: true,
              }}
            />
          </StyledPaper>
        </DialogContent>
        <DialogActions
          sx={{
            p: 2,
            bgcolor: isDarkTheme ? 'rgba(17, 25, 40, 0.9)' : undefined,
            borderTop: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.12)' : undefined,
          }}
        >
          <Button
            onClick={() => setShowPreviewDialog(false)}
            sx={{
              color: isDarkTheme ? 'rgba(255, 255, 255, 0.9)' : undefined,
              '&:hover': {
                backgroundColor: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : undefined,
              },
            }}
          >
            Close
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={prepareForDeployment}
            disabled={isLoading}
            sx={{
              bgcolor: isDarkTheme ? '#2563eb' : undefined,
              '&:hover': {
                bgcolor: isDarkTheme ? '#1d4ed8' : undefined,
              },
              '&:disabled': {
                bgcolor: isDarkTheme ? 'rgba(37, 99, 235, 0.5)' : undefined,
              },
            }}
          >
            {isLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Deploying...
              </Box>
            ) : (
              'Deploy Binding Policy'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CreateBindingPolicyDialog;
