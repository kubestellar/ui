export interface BindingPolicyCondition {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

export interface BindingPolicyInfo {
  name: string;
  clusters: number;
  clusterList?: string[];
  workload: string;
  workloadList?: string[];
  creationDate: string;
  creationTimestamp?: string;
  lastModifiedDate?: string;
  status: 'Active' | 'Inactive' | 'Pending' | 'Loading...';
  bindingMode: string;
  namespace: string;
  conditions?: BindingPolicyCondition[];
  yaml?: string;
  description?: string;
}

export interface ManagedCluster {
  name: string;
  uid?: string;
  labels: Record<string, string>;
  status: string;
  context?: string;
  creationTime?: string;
  creationTimestamp?: string;
  location?: string;
  provider?: string;
  version?: string;
  capacity?: Record<string, string | number>;
  description?: string;
  metrics?: {
    cpu: string;
    memory: string;
    storage: string;
  };
  available?: boolean;
  joined?: boolean;
  conditions?: BindingPolicyCondition[];
}

export interface Workload {
  name: string;
  kind: string;
  namespace: string;
  creationTime?: string;
  image?: string;
  labels?: Record<string, string>;
  replicas?: number;
  status?: string;
}

export interface BindingPolicyFilter {
  status?: 'Active' | 'Inactive' | 'Pending';
}

export interface PolicyDetailDialogProps {
  open: boolean;
  onClose: () => void;
  policy: BindingPolicyInfo;
  onEdit?: (policy: BindingPolicyInfo) => void;
  isLoading?: boolean;
  error?: string;
}
