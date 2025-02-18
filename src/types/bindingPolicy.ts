export interface BindingPolicyInfo {
    name: string;
    clusters: number;
    workload: string;
    creationDate: string;
    status: "Active" | "Inactive";
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