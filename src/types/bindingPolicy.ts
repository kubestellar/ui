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
    labels: Record<string, string>;
    status: string;
    context?: string;
    creationTime?: string;
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
}

export interface Workload {
    name: string;
    type: string;
    namespace: string;
    creationTime?: string;
    labels: Record<string, string>;
    status?: string;
    replicas?: number;
    selector?: Record<string, string>;
    apiVersion?: string;
    description?: string;
}

export interface BindingPolicyFilter {
    status?: "Active" | "Inactive" | "Pending";
}