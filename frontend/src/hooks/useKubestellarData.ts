import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { BindingPolicyInfo, ManagedCluster, Workload } from '../types/bindingPolicy';
import { useTranslation } from 'react-i18next';
import { useWDSQueries } from './queries/useWDSQueries';
import { useClusterQueries } from './queries/useClusterQueries';

interface UseKubestellarDataProps {
  // Optional callback to run after data refresh
  onDataLoaded?: () => void;
  skipFetch?: boolean;
}

interface BindingPolicyApiData {
  name: string;
  status?: string;
  workload?: string;
  clusterList?: string[];
  workloadList?: string[];
  creationTime?: string;
  bindingMode?: string;
  namespace?: string;
}

export function useKubestellarData({
  onDataLoaded,
  skipFetch = false,
}: UseKubestellarDataProps = {}) {
  const { t } = useTranslation();
  const { useWorkloads } = useWDSQueries();
  const { useClusters } = useClusterQueries();
  const [clusters, setClusters] = useState<ManagedCluster[]>([]);
  const [workloads, setWorkloads] = useState<Workload[]>([]);
  const [policies, setPolicies] = useState<BindingPolicyInfo[]>([]);
  const [loading, setLoading] = useState({
    clusters: !skipFetch,
    workloads: !skipFetch,
    policies: !skipFetch,
  });
  const [error, setError] = useState<{
    clusters?: string;
    workloads?: string;
    policies?: string;
  }>({});

  const {
    data: clustersQueryData,
    isLoading: isLoadingClusters,
    isFetching: isFetchingClusters,
    error: clustersQueryError,
    refetch: refetchClusters,
  } = useClusters(1, {
    enabled: !skipFetch,
  });

  useEffect(() => {
    if (skipFetch) {
      setLoading(prev => ({ ...prev, clusters: false }));
      return;
    }

    setLoading(prev => ({
      ...prev,
      clusters: isLoadingClusters || isFetchingClusters,
    }));
  }, [skipFetch, isLoadingClusters, isFetchingClusters]);

  useEffect(() => {
    if (skipFetch) {
      setClusters([]);
      setError(prev => ({ ...prev, clusters: undefined }));
      return;
    }

    if (clustersQueryError) {
      console.error(t('kubestellarData.logging.errorFetchingClusters'), clustersQueryError);
      setError(prev => ({ ...prev, clusters: t('kubestellarData.errors.failedFetchClusters') }));
      setClusters([]);
      return;
    }

    if (clustersQueryData) {
      const clusterData: ManagedCluster[] = clustersQueryData.clusters.map(cluster => ({
        name: cluster.name,
        labels: cluster.labels || {},
        status: cluster.status || t('kubestellarData.defaults.ready'),
        context: cluster.context,
        creationTime: cluster.creationTime,
        location: t('kubestellarData.defaults.unknown'),
        provider: t('kubestellarData.defaults.unknown'),
        version: cluster.rawStatus?.version?.kubernetes || t('kubestellarData.defaults.unknown'),
        capacity: cluster.rawStatus?.capacity || {},
      }));

      console.log(t('kubestellarData.logging.processedClusters'), clusterData);
      setClusters(clusterData);
      setError(prev => ({ ...prev, clusters: undefined }));
    }
  }, [skipFetch, clustersQueryData, clustersQueryError, t]);

  const {
    data: workloadsQueryData,
    isLoading: isLoadingWorkloads,
    isFetching: isFetchingWorkloads,
    error: workloadsQueryError,
    refetch: refetchWorkloads,
  } = useWorkloads({
    enabled: !skipFetch,
  });

  useEffect(() => {
    if (skipFetch) {
      setLoading(prev => ({ ...prev, workloads: false }));
      return;
    }

    setLoading(prev => ({
      ...prev,
      workloads: isLoadingWorkloads || isFetchingWorkloads,
    }));
  }, [skipFetch, isLoadingWorkloads, isFetchingWorkloads]);

  useEffect(() => {
    if (skipFetch) {
      setWorkloads([]);
      setError(prev => ({ ...prev, workloads: undefined }));
      return;
    }

    if (workloadsQueryError) {
      console.error(t('kubestellarData.logging.errorFetchingWorkloads'), workloadsQueryError);
      setError(prev => ({ ...prev, workloads: t('kubestellarData.errors.failedFetchWorkloads') }));
      setWorkloads([]);
      return;
    }

    if (workloadsQueryData) {
      const workloadData: Workload[] = workloadsQueryData.map(workload => ({
        name: workload.name,
        kind: workload.kind || t('kubestellarData.defaults.deployment'),
        namespace: workload.namespace || t('kubestellarData.defaults.defaultNamespace'),
        creationTime: workload.creationTime,
        labels: workload.labels || {},
        status: workload.status || t('kubestellarData.defaults.active'),
        replicas: workload.replicas,
      }));

      console.log(t('kubestellarData.logging.processedWorkloads'), workloadData);
      setWorkloads(workloadData);
      setError(prev => ({ ...prev, workloads: undefined }));
    }
  }, [skipFetch, workloadsQueryData, workloadsQueryError, t]);

  // Fetch binding policies
  const fetchPolicies = useCallback(async () => {
    if (skipFetch) return;
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

      const policyData = response.data.bindingPolicies.map((policy: BindingPolicyApiData) => ({
        name: policy.name,
        status: policy.status || t('kubestellarData.defaults.active'),
        workload: policy.workload,
        clusters: policy.clusterList?.length || 0,
        clusterList: policy.clusterList || [],
        workloadList: policy.workloadList || [],
        creationDate: policy.creationTime || new Date().toLocaleString(),
        bindingMode: policy.bindingMode || t('kubestellarData.defaults.alwaysMatch'),
        namespace: policy.namespace || t('kubestellarData.defaults.defaultNamespace'),
      }));

      setPolicies(policyData);
      setError(prev => ({ ...prev, policies: undefined }));
    } catch (err) {
      console.error(t('kubestellarData.logging.errorFetchingPolicies'), err);
      setError(prev => ({ ...prev, policies: t('kubestellarData.errors.failedFetchPolicies') }));
      setPolicies([]);
    } finally {
      setLoading(prev => ({ ...prev, policies: false }));
    }
  }, [skipFetch, t]);

  // Function to refresh all data
  const refreshAllData = useCallback(() => {
    if (!skipFetch) {
      void refetchClusters();
      void refetchWorkloads();
    }
    fetchPolicies();

    if (onDataLoaded) {
      onDataLoaded();
    }
  }, [fetchPolicies, onDataLoaded, refetchClusters, refetchWorkloads, skipFetch]);

  // Fetch all data on initial load
  useEffect(() => {
    if (!skipFetch) {
      refreshAllData();
    }
  }, [refreshAllData, skipFetch]);

  // Function to assign policy to target
  const assignPolicyToTarget = useCallback(
    async (policyName: string, targetType: 'cluster' | 'workload', targetName: string) => {
      try {
        console.log(
          t('kubestellarData.logging.assigningPolicy', {
            policyName,
            targetType,
            targetName,
          })
        );
        // This would normally call your API
        // For now, just log and return success
        return {
          success: true,
          message: t('kubestellarData.success.successfullyAssigned', {
            policyName,
            targetType,
            targetName,
          }),
        };
      } catch (err) {
        console.error(t('kubestellarData.errors.errorAssigningPolicy'), err);
        return {
          success: false,
          message: t('kubestellarData.errors.failedToAssign', {
            policyName,
            targetType,
            targetName,
          }),
        };
      }
    },
    [t]
  );

  return {
    data: {
      clusters,
      workloads,
      policies,
    },
    loading,
    error,
    refreshData: refreshAllData,

    actions: {
      assignPolicyToTarget,
    },
  };
}
