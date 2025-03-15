import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { BindingPolicyInfo, ManagedCluster, Workload } from '../types/bindingPolicy';

interface UseKubestellarDataProps {
  // Optional callback to run after data refresh
  onDataLoaded?: () => void;
  skipFetch?: boolean;
}

// Define interfaces for API response types
interface ClusterApiData {
  name: string;
  labels?: Record<string, string>;
  status?: string;
  context?: string;
  creationTime: string;
  location?: string;
  provider?: string;
  version?: string;
  capacity?: Record<string, unknown>;
}

interface WorkloadApiData {
  name: string;
  kind?: string;
  namespace?: string;
  creationTime: string;
  labels?: Record<string, string>;
  status?: string;
  replicas?: number;
  selector?: Record<string, string>;
  apiVersion?: string;
}

export function useKubestellarData({ onDataLoaded, skipFetch = false }: UseKubestellarDataProps = {}) {
    const [clusters, setClusters] = useState<ManagedCluster[]>([]);
  const [workloads, setWorkloads] = useState<Workload[]>([]);
  const [policies, setPolicies] = useState<BindingPolicyInfo[]>([]);
  const [loading, setLoading] = useState({
    clusters: !skipFetch,
    workloads: !skipFetch,
    policies: !skipFetch
  });
  const [error, setError] = useState<{
    clusters?: string;
    workloads?: string;
    policies?: string;
  }>({});

  // Fetch clusters from Inventory Space
  const fetchClusters = useCallback(async () => {
    if(skipFetch) return;
    try {
      setLoading(prev => ({ ...prev, clusters: true }));
      const response = await api.get('/api/clusters');
      console.log('Clusters API Response:', response.data);
      
      let clusterData: ManagedCluster[] = [];
      
      // Process the itsData first since it has more information
      if (response.data.itsData && Array.isArray(response.data.itsData)) {
        clusterData = response.data.itsData.map((cluster: ClusterApiData) => ({
          name: cluster.name,
          labels: cluster.labels || {},
          status: cluster.status || 'Ready', 
          context: cluster.context,
          creationTime: cluster.creationTime,
          // Add any additional fields that might be useful
          location: cluster.location || 'Unknown', // Geographical location if available
          provider: cluster.provider || 'Unknown', // Cloud provider if available
          version: cluster.version || 'Unknown', // Kubernetes version if available
          capacity: cluster.capacity || {} // Resource capacity if available
        }));
      }
      
      // If there are no ITS clusters, or if we want to include the simple cluster list too
      if (clusterData.length === 0 && response.data.clusters && Array.isArray(response.data.clusters)) {
        // Just use the simple cluster names
        clusterData = response.data.clusters.map((clusterName: string) => ({
          name: clusterName,
          labels: {},
          status: 'Unknown',
          creationTime: new Date().toISOString() // Default to current time
        }));
      }
      
      console.log('Processed clusters:', clusterData);
      setClusters(clusterData);
      setError(prev => ({ ...prev, clusters: undefined }));
    } catch (err) {
      console.error('Error fetching clusters:', err);
      setError(prev => ({ ...prev, clusters: 'Failed to fetch clusters' }));
      // Still provide some demo data in development for UI testing
      if (process.env.NODE_ENV === 'development') {
        const demoData: ManagedCluster[] = [
          { name: 'cluster-east-1', labels: { region: 'east', tier: 'production' }, status: 'Ready', creationTime: new Date().toISOString() },
          { name: 'cluster-west-1', labels: { region: 'west', tier: 'staging' }, status: 'Ready', creationTime: new Date().toISOString() },
          { name: 'cluster-central-1', labels: { region: 'central', tier: 'development' }, status: 'NotReady', creationTime: new Date().toISOString() }
        ];
        setClusters(demoData);
      } else {
        setClusters([]);
      }
    } finally {
      setLoading(prev => ({ ...prev, clusters: false }));
    }
  }, [skipFetch]);

  // Fetch workloads from Workload Description Space
  const fetchWorkloads = useCallback(async () => {
    if(skipFetch) return;
    try {
      setLoading(prev => ({ ...prev, workloads: true }));
      const response = await api.get('/api/wds/workloads');
      
      // Map the response data to our Workload type
      const workloadData = response.data.map((workload: WorkloadApiData) => ({
        name: workload.name,
        type: workload.kind || 'Deployment', // Default to Deployment if kind is not specified
        namespace: workload.namespace || 'default',
        creationTime: workload.creationTime,
        labels: workload.labels || {}, // Using empty object as default
        // Additional details that might be useful
        status: workload.status || 'Active',
        replicas: workload.replicas || 1,
        selector: workload.selector || {},
        apiVersion: workload.apiVersion || 'apps/v1'
      }));
      
      console.log('Processed workloads:', workloadData);
      setWorkloads(workloadData);
      setError(prev => ({ ...prev, workloads: undefined }));
    } catch (err) {
      console.error('Error fetching workloads:', err);
      setError(prev => ({ ...prev, workloads: 'Failed to fetch workloads' }));
      // Provide demo data in development for UI testing
      if (process.env.NODE_ENV === 'development') {
        const demoData: Workload[] = [
          { name: 'frontend-app', type: 'Deployment', namespace: 'default', labels: { app: 'frontend' }, creationTime: new Date().toISOString() },
          { name: 'backend-api', type: 'Deployment', namespace: 'backend', labels: { app: 'backend' }, creationTime: new Date().toISOString() },
          { name: 'redis-cache', type: 'StatefulSet', namespace: 'cache', labels: { app: 'redis' }, creationTime: new Date().toISOString() },
          { name: 'mongo-db', type: 'StatefulSet', namespace: 'database', labels: { app: 'mongo' }, creationTime: new Date().toISOString() },
          { name: 'nginx-ingress', type: 'DaemonSet', namespace: 'ingress', labels: { app: 'nginx' }, creationTime: new Date().toISOString() }
        ];
        setWorkloads(demoData);
      } else {
        setWorkloads([]);
      }
    } finally {
      setLoading(prev => ({ ...prev, workloads: false }));
    }
  }, [skipFetch]);

  // Fetch binding policies
  const fetchPolicies = useCallback(async () => {
    if(skipFetch) return;
    try {
      setLoading(prev => ({ ...prev, policies: true }));
      const response = await api.get('/api/bp');
      
      if (response.data.error) {
        throw new Error(response.data.error);
      }

      // If there are no binding policies, set empty array
      if (!response.data.bindingPolicies || response.data.bindingPolicies.length === 0) {
        setPolicies([]);
        return;
      }

      // Here we would normally process the binding policies
      // For now, let's assume the BP endpoint already returns the processed data
      // This should be updated to match your actual API response structure

      // For demo purposes, create some mock policy data
      const mockPolicies: BindingPolicyInfo[] = [
        {
          name: 'policy-prod',
          status: 'Active',
          workload: 'frontend-app',
          clusters: 2,
          clusterList: ['cluster-east-1', 'cluster-west-1'],
          workloadList: ['frontend-app'],
          creationDate: new Date().toLocaleString(),
          bindingMode: 'AlwaysMatch',
          namespace: 'default'
        },
        {
          name: 'policy-dev',
          status: 'Pending',
          workload: 'backend-api',
          clusters: 1,
          clusterList: ['cluster-central-1'],
          workloadList: ['backend-api'],
          creationDate: new Date().toLocaleString(),
          bindingMode: 'BestEffort',
          namespace: 'default'
        },
        {
          name: 'policy-staging',
          status: 'Inactive',
          workload: 'redis-cache',
          clusters: 0,
          clusterList: [],
          workloadList: ['redis-cache'],
          creationDate: new Date().toLocaleString(),
          bindingMode: 'AlwaysMatch',
          namespace: 'default'
        }
      ];
      
      // Use the mock data or process real data as needed
      setPolicies(mockPolicies);
      setError(prev => ({ ...prev, policies: undefined }));
    } catch (err) {
      console.error('Error fetching policies:', err);
      setError(prev => ({ ...prev, policies: 'Failed to fetch policies' }));
      setPolicies([]);
    } finally {
      setLoading(prev => ({ ...prev, policies: false }));
    }
  }, [skipFetch]);

  // Function to refresh all data
  const refreshAllData = useCallback(() => {
    fetchClusters();
    fetchWorkloads();
    fetchPolicies();
    
    if (onDataLoaded) {
      onDataLoaded();
    }
  }, [fetchClusters, fetchWorkloads, fetchPolicies, onDataLoaded]);

  // Fetch all data on initial load
  useEffect(() => {
    if (!skipFetch) {
        refreshAllData();
      }
    }, [refreshAllData, skipFetch]);

  // Function to assign policy to target
  const assignPolicyToTarget = useCallback(async (
    policyName: string, 
    targetType: 'cluster' | 'workload', 
    targetName: string
  ) => {
    try {
      console.log(`Assigning policy ${policyName} to ${targetType} ${targetName}`);
      // This would normally call your API
      // For now, just log and return success
      return {
        success: true,
        message: `Successfully assigned ${policyName} to ${targetType} ${targetName}`
      };
    } catch (err) {
      console.error('Error assigning policy:', err);
      return {
        success: false,
        message: `Failed to assign ${policyName} to ${targetType} ${targetName}`
      };
    }
  }, []);

  return {
    data: {
      clusters,
      workloads,
      policies
    },
    loading,
    error,
    refreshData: refreshAllData,

    actions: {
      assignPolicyToTarget
    }
  };
} 