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
    status: "Active" | "Inactive" | "Pending";
    yaml: string;
    bindingMode?: string;
    namespace?: string;
    conditions?: BindingPolicyCondition[] | null;
}

export interface ManagedCluster {
    name: string;
    labels: Record<string, string>;
    status: string;
}

export interface Workload {
    name: string;
    namespace: string;
    labels: Record<string, string>;
}