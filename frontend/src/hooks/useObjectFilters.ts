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

interface UseObjectFiltersResult {
  resourceKinds: ResourceKind[];
  namespaces: Namespace[];
  filteredResources: Resource[];
  isLoading: boolean;
  error: string | null;
  applyFilters: (resourceKind: string, namespace: string, filters: ObjectFilter) => Promise<void>;
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
        // Load resource kinds
        const kinds = await getResourceKinds();
        setResourceKinds(kinds);

        // Load namespaces
        const ns = await getNamespaces();
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

  // Apply filters to fetch resources
  const applyFilters = useCallback(
    async (resourceKind: string, namespace: string, filters: ObjectFilter) => {
      setIsLoading(true);
      setError(null);

      try {
        const resources = await fetchResources(resourceKind, namespace, filters);
        setFilteredResources(resources.items || []);
      } catch (err) {
        console.error('Error applying resource filters:', err);
        setError('Failed to filter resources. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    []
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
