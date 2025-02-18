export interface BindingPolicyInfo {
    name: string;
    clusters: number;
    workload: string;
    creationDate: string;
    lastModifiedDate?: string;
    bindingMode?: string;
    status: "Active" | "Inactive";
    yaml: string;
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