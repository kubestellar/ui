import React from 'react';
import { Position, MarkerType } from 'reactflow';

// Base interfaces
export interface NodeData {
  label: JSX.Element;
}

export interface BaseNode {
  id: string;
  data: NodeData;
  position: { x: number; y: number };
  style?: React.CSSProperties;
}

export interface CustomNode extends BaseNode {
  sourcePosition?: Position;
  targetPosition?: Position;
  collapsed?: boolean;
  showMenu?: boolean;
  isGroup?: boolean;
}

export interface BaseEdge {
  id: string;
  source: string;
  target: string;
}

export interface CustomEdge extends BaseEdge {
  type?: string;
  animated?: boolean;
  style?: React.CSSProperties;
  markerEnd?: {
    type: MarkerType;
    width?: number;
    height?: number;
    color?: string;
  };
  data?: {
    status?: 'default' | 'active' | 'success' | 'warning' | 'error';
    animated?: boolean;
    [key: string]: string | number | boolean | undefined;
  };
}

export interface ResourceItem {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    creationTimestamp: string;
    labels?: Record<string, string>;
    uid?: string;
    [key: string]: string | undefined | Record<string, string>;
  };
  spec?: {
    ports?: Array<{ name: string; port: number }>;
    holderIdentity?: string;
    replicas?: number;
    scaleTargetRef?: {
      apiVersion?: string;
      kind?: string;
      name?: string;
    };
    configMap?: {
      name: string;
      items?: Array<{ key: string; path: string }>;
    };
    secret?: {
      secretName: string;
      items?: Array<{ key: string; path: string }>;
    };
    [key: string]: unknown;
  };
  status?: {
    conditions?: Array<{ type: string; status: string }>;
    phase?: string;
    containerStatuses?: Array<{
      name: string;
      state?: Record<string, unknown>;
      ready?: boolean;
      restartCount?: number;
      image?: string;
      imageID?: string;
      containerID?: string;
      started?: boolean;
    }>;
  };
  data?: Record<string, string>;
  subsets?: Array<{
    addresses?: Array<{ ip: string }>;
    ports?: Array<{ name?: string; port?: number }>;
  }>;
  endpoints?: Array<{
    addresses?: string[];
    ports?: Array<{ name?: string; port?: number }>;
  }>;
  ports?: Array<{ name: string; port: number }>;
  subjects?: Array<{
    name: string;
    kind?: string;
    namespace?: string;
  }>;
  roleRef?: { name: string };
  rules?: Array<{
    verbs?: string[];
    resources?: string[];
  }>;
  parentConfigMap?: {
    name: string;
    namespace: string;
    kind: string;
  };
  parentSecret?: {
    name: string;
    namespace: string;
    kind: string;
  };
  [key: string]: unknown;
}

export interface NamespaceResource {
  name: string;
  status: string;
  labels: Record<string, string>;
  resources: Record<string, ResourceItem[]>;
  context: string;
}

export interface SelectedNode {
  namespace: string;
  name: string;
  type: string;
  onClose: () => void;
  isOpen: boolean;
  resourceData?: ResourceItem;
  initialTab?: number;
}

export interface GroupPanelState {
  isOpen: boolean;
  namespace: string;
  groupType: string;
  groupItems: ResourceItem[];
}

export interface ResourcesMap {
  endpoints: ResourceItem[];
  endpointSlices: ResourceItem[];
  [key: string]: ResourceItem[];
}

export interface ContextMenuState {
  nodeId: string | null;
  x: number;
  y: number;
  nodeType: string | null;
}

export interface ResourceDataChangeEvent {
  resources: ResourceItem[];
  filteredResources: ResourceItem[];
  contextCounts: Record<string, number>;
  totalCount: number;
}

export interface DeleteNodeDetails {
  namespace: string;
  nodeType: string;
  nodeName: string;
  nodeId: string;
}

// Kind to plural mapping
export const kindToPluralMap: Record<string, string> = {
  Binding: 'bindings',
  ComponentStatus: 'componentstatuses',
  ConfigMap: 'configmaps',
  Endpoints: 'endpoints',
  Event: 'events',
  LimitRange: 'limitranges',
  Namespace: 'namespaces',
  Node: 'nodes',
  PersistentVolumeClaim: 'persistentvolumeclaims',
  PersistentVolume: 'persistentvolumes',
  Pod: 'pods',
  PodTemplate: 'podtemplates',
  ReplicationController: 'replicationcontrollers',
  ResourceQuota: 'resourcequotas',
  Secret: 'secrets',
  ServiceAccount: 'serviceaccounts',
  Service: 'services',
  MutatingWebhookConfiguration: 'mutatingwebhookconfigurations',
  ValidatingWebhookConfiguration: 'validatingwebhookconfigurations',
  CustomResourceDefinition: 'customresourcedefinitions',
  APIService: 'apiservices',
  ControllerRevision: 'controllerrevisions',
  DaemonSet: 'daemonsets',
  Deployment: 'deployments',
  ReplicaSet: 'replicasets',
  StatefulSet: 'statefulsets',
  Application: 'applications',
  ApplicationSet: 'applicationsets',
  AppProject: 'appprojects',
  SelfSubjectReview: 'selfsubjectreviews',
  TokenReview: 'tokenreviews',
  LocalSubjectAccessReview: 'localsubjectaccessreviews',
  SelfSubjectAccessReview: 'selfsubjectaccessreviews',
  SelfSubjectRulesReview: 'selfsubjectrulesreviews',
  SubjectAccessReview: 'subjectaccessreviews',
  HorizontalPodAutoscaler: 'horizontalpodautoscalers',
  CronJob: 'cronjobs',
  Job: 'jobs',
  CertificateSigningRequest: 'certificatesigningrequests',
  BindingPolicy: 'bindingpolicies',
  CombinedStatus: 'combinedstatuses',
  CustomTransform: 'customtransforms',
  StatusCollector: 'statuscollectors',
  Lease: 'leases',
  EndpointSlice: 'endpointslices',
  FlowSchema: 'flowschemas',
  PriorityLevelConfiguration: 'prioritylevelconfigurations',
  IngressClass: 'ingressclasses',
  Ingress: 'ingresses',
  NetworkPolicy: 'networkpolicies',
  RuntimeClass: 'runtimeclasses',
  PodDisruptionBudget: 'poddisruptionbudgets',
  ClusterRoleBinding: 'clusterrolebindings',
  ClusterRole: 'clusterroles',
  RoleBinding: 'rolebindings',
  Role: 'roles',
  PriorityClass: 'priorityclasses',
  CSIDriver: 'csidrivers',
  CSINode: 'csinodes',
  CSIStorageCapacity: 'csistoragecapacities',
  StorageClass: 'storageclasses',
  VolumeAttachment: 'volumeattachments',
};
