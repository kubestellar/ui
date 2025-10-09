import { useState, useEffect, useCallback } from 'react';
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
  applyFilters: (
    resourceKinds: string[],
    namespaces: string[],
    filters: ObjectFilter
  ) => Promise<void>;
}

export const useObjectFilters = (): UseObjectFiltersResult => {
  const [resourceKinds, setResourceKinds] = useState<ResourceKind[]>([]);
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load resource kinds and namespaces on mount
  useEffect(() => {
    const loadResourceData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [kinds, ns] = await Promise.all([getResourceKinds(), getNamespaces()]);
        setResourceKinds(kinds);
        setNamespaces(ns);
      } catch (err) {
        console.error('Error loading resource data:', err);
        setError('Failed to load resource data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadResourceData();
  }, []);

  // Apply filters to fetch resources for multiple kinds and namespaces
  const applyFilters = useCallback(
    async (kinds: string[], nsList: string[], filters: ObjectFilter) => {
      setIsLoading(true);
      setError(null);

      try {
        const fetchPromises: Promise<FetchResourcesResponse>[] = [];
        for (const kind of kinds) {
          const kindInfo = resourceKinds.find(resourceKind => resourceKind.name === kind);
          console.log(resourceKinds);
          console.log(kindInfo);
          const isNamespaced = kindInfo?.namespaced ?? true;
          if (isNamespaced) {
            for (const ns of nsList) {
              fetchPromises.push(fetchResources(kind, ns, filters, { isNamespaced: true }));
            }
          } else {
            fetchPromises.push(fetchResources(kind, undefined, filters, { isNamespaced: false }));
          }
        }
        const results = await Promise.all(fetchPromises);
        // Flatten all items arrays into one
        const allResources: Resource[] = results.map(res => (res.items ? res.items : [])).flat();
        setFilteredResources(allResources);
      } catch (err) {
        console.error('Error applying resource filters:', err);
        setError('Failed to filter resources. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [resourceKinds]
  );

  return {
    resourceKinds,
    namespaces,
    filteredResources,
    isLoading,
    error,
    applyFilters,
  };
};
