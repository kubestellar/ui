import { api } from '../lib/api';
import { ObjectFilter } from '../components/ObjectFilters';

export interface ResourceQueryParams {
  kind?: string;
  namespace?: string;
  label?: string;
  searchQuery?: string;
}

/**
 * Fetch resources with optional filtering
 * @param resourceKind The kind of resource to fetch
 * @param namespace The namespace to fetch resources from
 * @param filters Optional filters to apply
 * @returns Promise with the filtered resources
 */
export const fetchResources = async (
  resourceKind: string,
  namespace: string,
  filters?: ObjectFilter
) => {
  // Convert ObjectFilter to query parameters
  const queryParams: ResourceQueryParams = {};

  if (filters) {
    if (filters.kind) queryParams.kind = filters.kind;
    if (filters.namespace) queryParams.namespace = filters.namespace;
    if (filters.label) queryParams.label = `${filters.label.key}=${filters.label.value}`;
    if (filters.searchQuery) queryParams.searchQuery = filters.searchQuery;
  }

  // Build query string
  const queryString = Object.entries(queryParams)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  const url = `/api/${resourceKind}/${namespace}${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching resources:', error);
    throw error;
  }
};

/**
 * Get all available resource kinds in the cluster
 * @returns Promise with the list of resource kinds
 */
export const getResourceKinds = async () => {
  try {
    const response = await api.get('/api/resources/kinds');
    return response.data;
  } catch (error) {
    console.error('Error fetching resource kinds:', error);
    throw error;
  }
};

/**
 * Get all available namespaces in the cluster
 * @returns Promise with the list of namespaces
 */
export const getNamespaces = async () => {
  try {
    const response = await api.get('/api/resources/namespaces');
    return response.data;
  } catch (error) {
    console.error('Error fetching namespaces:', error);
    throw error;
  }
};
