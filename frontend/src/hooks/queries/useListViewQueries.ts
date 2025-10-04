import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { ResourceItem } from '../../components/ListViewComponent';

// Define CompleteEventData interface locally to avoid import issues
interface CompleteEventData {
  namespaced: {
    [namespace: string]: {
      [kind: string]: ResourceItem[] | { __namespaceMetaData: ResourceItem[] };
    };
  };
  clusterScoped: {
    [key: string]: ResourceItem[];
  };
  contexts?: Record<string, string>;
}

// Process complete data function (extracted from ListViewComponent)
const processCompleteData = (data: CompleteEventData): ResourceItem[] => {
  const processedResources: ResourceItem[] = [];

  // Process namespaced resources
  if (data.namespaced) {
    Object.entries(data.namespaced).forEach(([namespace, resources]) => {
      if (resources && typeof resources === 'object') {
        Object.entries(resources).forEach(([kind, resourceList]) => {
          if (Array.isArray(resourceList)) {
            resourceList.forEach((resource: ResourceItem) => {
              processedResources.push({
                ...resource,
                namespace,
                kind,
                context: data.contexts?.[resource.uid || resource.name] || 'default',
              });
            });
          }
        });
      }
    });
  }

  // Process cluster-scoped resources
  if (data.clusterScoped) {
    Object.entries(data.clusterScoped).forEach(([kind, resourceList]) => {
      if (Array.isArray(resourceList)) {
        resourceList.forEach((resource: ResourceItem) => {
          processedResources.push({
            ...resource,
            kind,
            namespace: '', // Cluster-scoped resources don't have namespaces
            context: data.contexts?.[resource.uid || resource.name] || 'default',
          });
        });
      }
    });
  }

  return processedResources;
};

interface QueryOptions {
  staleTime?: number;
  gcTime?: number;
  refetchInterval?: number;
  retry?: number | boolean;
  enabled?: boolean;
}

export const useListViewQueries = () => {
  const useListViewData = (options?: QueryOptions) => {
    return useQuery<ResourceItem[], Error>({
      queryKey: ['list-view-data'],
      queryFn: async (): Promise<ResourceItem[]> => {
        const response = await api.get('/wds/list', { timeout: 15000 });

        if (!response.data?.data) {
          throw new Error('Invalid response format');
        }

        return processCompleteData(response.data.data as CompleteEventData);
      },
      staleTime: options?.staleTime || 30000, // 30 seconds
      gcTime: options?.gcTime || 300000, // 5 minutes
      refetchInterval: options?.refetchInterval || 60000, // 1 minute
      retry: options?.retry !== undefined ? options?.retry : 2,
      retryDelay: 5000, // Wait 5 seconds between retries
      enabled: options?.enabled !== undefined ? options.enabled : true,
    });
  };

  return {
    useListViewData,
  };
};
