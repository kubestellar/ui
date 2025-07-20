import { useState, useEffect, useCallback } from 'react';
import { ManagedClusterInfo } from '../../types';
import { useBPQueries } from '../../../../../hooks/queries/useBPQueries';

export const useLabelProtection = (open: boolean, cluster: ManagedClusterInfo | null) => {
  const [protectedLabels, setProtectedLabels] = useState<Set<string>>(new Set());
  const { useBindingPolicies } = useBPQueries();

  // Use the React Query hook with automatic background updates
  const { data: bindingPolicies, error } = useBindingPolicies({
    enabled: open && !!cluster,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  const isLabelProtected = useCallback(
    (labelKey: string): boolean => {
      // System label prefixes
      const systemPrefixes = [
        'cluster.open-cluster-management.io/',
        'feature.open-cluster-management.io/',
        'kubernetes.io/',
        'k8s.io/',
        'node.openshift.io/',
        'beta.kubernetes.io/',
        'topology.kubernetes.io/',
        'node-role.kubernetes.io/',
        'name', // Common system label
      ];

      // Check system prefixes
      for (const prefix of systemPrefixes) {
        if (labelKey.startsWith(prefix)) {
          return true;
        }
      }

      // Check if it's in the protected labels set (from binding policies)
      return protectedLabels.has(labelKey);
    },
    [protectedLabels]
  );

  useEffect(() => {
    if (bindingPolicies) {
      const usedLabels = new Set<string>();

      bindingPolicies.forEach(bp => {
        // Extract labels from YAML content
        if (bp.yaml) {
          const yamlLines = bp.yaml.split('\n');
          let inMatchLabels = false;

          yamlLines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.includes('matchlabels:')) {
              inMatchLabels = true;
            } else if (trimmed.startsWith('downsync:') || trimmed.startsWith('spec:')) {
              inMatchLabels = false;
            } else if (inMatchLabels && trimmed.includes(':') && !trimmed.startsWith('-')) {
              const key = trimmed.split(':')[0].trim();
              if (key && !key.includes('matchlabels') && !key.includes('apigroup')) {
                usedLabels.add(key);
              }
            }
          });
        }

        // Extract labels from clusterList
        bp.clusterList?.forEach(cluster => {
          if (cluster.includes('=')) {
            const key = cluster.split('=')[0].trim();
            if (key) usedLabels.add(key);
          } else if (cluster.includes(':')) {
            const key = cluster.split(':')[0].trim();
            if (key) usedLabels.add(key);
          }
        });
      });

      setProtectedLabels(usedLabels);
    }
  }, [bindingPolicies]);

  // Log any errors that occur during fetching
  useEffect(() => {
    if (error) {
      console.error('Failed to fetch binding policies:', error);
      setProtectedLabels(new Set());
    }
  }, [error]);

  return { protectedLabels, isLabelProtected };
};
