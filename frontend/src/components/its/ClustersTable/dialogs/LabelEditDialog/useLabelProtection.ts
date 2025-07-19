import { useState, useEffect, useCallback } from 'react';
import { ManagedClusterInfo } from '../../types';

interface MatchExpression {
  key: string;
  operator?: string;
  values?: string[];
}

interface ClusterSelector {
  matchLabels?: Record<string, string>;
  matchExpressions?: MatchExpression[];
}

interface BindingPolicySpec {
  clusterSelectors?: ClusterSelector[];
}

interface BindingPolicy {
  spec?: BindingPolicySpec;
  clusterSelectors?: Record<string, string>[];
  clusters?: string[];
  yaml?: string;
}

interface BindingPoliciesResponse {
  bindingPolicies?: BindingPolicy[];
}

export const useLabelProtection = (open: boolean, cluster: ManagedClusterInfo | null) => {
  const [protectedLabels, setProtectedLabels] = useState<Set<string>>(new Set());

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
    if (open && cluster) {
      const fetchProtectedLabels = async () => {
        try {
          const response = await fetch('/api/bp');
          if (response.ok) {
            const data: BindingPoliciesResponse = await response.json();
            const usedLabels = new Set<string>();

            data.bindingPolicies?.forEach(bp => {
              // From spec.clusterSelectors.matchLabels
              bp.spec?.clusterSelectors?.forEach(selector => {
                Object.keys(selector.matchLabels || {}).forEach(key => {
                  usedLabels.add(key);
                });

                // From matchExpressions
                selector.matchExpressions?.forEach(expr => {
                  if (expr.key) {
                    usedLabels.add(expr.key);
                  }
                });
              });

              // From stored clusterSelectors
              bp.clusterSelectors?.forEach(selector => {
                Object.keys(selector || {}).forEach(key => {
                  usedLabels.add(key);
                });
              });

              // From clusters array
              bp.clusters?.forEach(cluster => {
                if (cluster.includes('=')) {
                  const key = cluster.split('=')[0].trim();
                  if (key) usedLabels.add(key);
                } else if (cluster.includes(':')) {
                  const key = cluster.split(':')[0].trim();
                  if (key) usedLabels.add(key);
                }
              });

              // From YAML parsing (simplified)
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
            });

            setProtectedLabels(usedLabels);
          }
        } catch (error) {
          console.error('Failed to fetch protected labels:', error);
          setProtectedLabels(new Set());
        }
      };

      fetchProtectedLabels();
    }
  }, [open, cluster]);

  return { protectedLabels, isLabelProtected };
};
