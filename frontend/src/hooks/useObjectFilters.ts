import { useState, useCallback } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { ObjectFilter } from '../components/ObjectFilters';
import { fetchResources, getResourceKinds, getNamespaces } from '../services/resourceService';

interface ResourceKind {
  kind: string;
  name: string;
  group: string;
  version: string;
  namespaced: boolean;
}

interface Namespace {
  name: string;
  createdAt: string;
  status: string;
  labels?: Record<string, string>;
}

interface Resource {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    [key: string]: unknown;
  };
  spec?: Record<string, unknown>;
  status?: Record<string, unknown>;
}

interface FetchResourcesResponse {
  items?: Resource[];
  [key: string]: unknown;
}

interface UseObjectFiltersResult {
  resourceKinds: ResourceKind[];
  namespaces: Namespace[];
  filteredResources: Resource[];
  isLoading: boolean;
  error: string | null;
  applyFilters: (resourceKinds: string[], namespaces: string[], filters: ObjectFilter) => void;
  isFiltering: boolean;
  refetchResourceData: () => void;
}

export const useObjectFilters = (): UseObjectFiltersResult => {
  const [filterParams, setFilterParams] = useState<{
    kinds: string[];
    namespaces: string[];
    filters: ObjectFilter;
  } | null>(null);

  const {
    data: resourceKinds = [],
    isLoading: isLoadingKinds,
    error: kindsError,
    refetch: refetchKinds,
  } = useQuery<ResourceKind[]>({
    queryKey: ['resourceKinds'],
    queryFn: getResourceKinds,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Fetch namespaces with React Query
  const {
    data: namespaces = [],
    isLoading: isLoadingNamespaces,
    error: namespacesError,
    refetch: refetchNamespaces,
  } = useQuery<Namespace[]>({
    queryKey: ['namespaces'],
    queryFn: getNamespaces,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Build queries for filtered resources
  const buildResourceQueries = useCallback(() => {
    if (!filterParams) return [];

    const { kinds, namespaces: nsList, filters } = filterParams;
    const queries: Array<{
      queryKey: (string | ObjectFilter | boolean | undefined)[];
      queryFn: () => Promise<FetchResourcesResponse>;
    }> = [];

    for (const kind of kinds) {
      const kindInfo = resourceKinds.find(rk => rk.name === kind);
      const isNamespaced = kindInfo?.namespaced ?? true;

      if (isNamespaced) {
        const namespacesToUse = nsList.length > 0 ? nsList : namespaces.map(ns => ns.name);
        for (const ns of namespacesToUse) {
          queries.push({
            queryKey: ['resources', kind, ns, filters, true],
            queryFn: () => fetchResources(kind, ns, filters, { isNamespaced: true }),
          });
        }
      } else {
        queries.push({
          queryKey: ['resources', kind, undefined, filters, false],
          queryFn: () => fetchResources(kind, undefined, filters, { isNamespaced: false }),
        });
      }
    }

    return queries;
  }, [filterParams, resourceKinds, namespaces]);

  // Fetch filtered resources using useQueries
  const resourceQueries = useQueries({
    queries: buildResourceQueries(),
  });

  // Combine results from all queries
  const filteredResources: Resource[] = resourceQueries
    .filter(query => query.isSuccess && query.data)
    .flatMap(query => (query.data as FetchResourcesResponse).items || []);

  const isFiltering = resourceQueries.some(query => query.isLoading);
  const hasFilterError = resourceQueries.some(query => query.isError);

  // Apply filters callback
  const applyFilters = useCallback((kinds: string[], nsList: string[], filters: ObjectFilter) => {
    setFilterParams({ kinds, namespaces: nsList, filters });
  }, []);

  // Refetch all resource data
  const refetchResourceData = useCallback(() => {
    refetchKinds();
    refetchNamespaces();
  }, [refetchKinds, refetchNamespaces]);

  // Determine overall loading state
  const isLoading = isLoadingKinds || isLoadingNamespaces;

  // Determine error state
  const error = kindsError
    ? 'Failed to load resource kinds'
    : namespacesError
      ? 'Failed to load namespaces'
      : hasFilterError
        ? 'Failed to filter resources. Please try again.'
        : null;

  return {
    resourceKinds,
    namespaces,
    filteredResources,
    isLoading,
    error,
    applyFilters,
    isFiltering,
    refetchResourceData,
  };
};
