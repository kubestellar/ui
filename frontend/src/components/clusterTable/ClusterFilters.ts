import { ManagedClusterInfo } from './types';

interface FilterOptions {
  query: string;
  filter: string;
  filterByLabel: Array<{ key: string; value: string }>;
}

/**
 * Applies search query filter to clusters
 */
export const applySearchFilter = (
  clusters: ManagedClusterInfo[],
  query: string
): ManagedClusterInfo[] => {
  if (!query.trim()) return clusters;

  const searchLower = query.toLowerCase().trim();

  return clusters.filter(cluster => {
    const nameMatch = cluster.name.toLowerCase().includes(searchLower);
    const labelMatch = Object.entries(cluster.labels || {}).some(
      ([key, value]) =>
        key.toLowerCase().includes(searchLower) || value.toLowerCase().includes(searchLower)
    );
    const contextMatch = cluster.context.toLowerCase().includes(searchLower);
    const statusMatch = (cluster.status || '').toLowerCase().includes(searchLower);

    return nameMatch || labelMatch || contextMatch || statusMatch;
  });
};

/**
 * Applies status filter to clusters
 */
export const applyStatusFilter = (
  clusters: ManagedClusterInfo[],
  filter: string
): ManagedClusterInfo[] => {
  if (!filter || filter === '') return clusters;

  return clusters.filter(cluster => {
    if (filter === 'available') {
      return cluster.available === true || cluster.status?.toLowerCase() === 'available';
    } else if (filter === 'unavailable') {
      return cluster.available === false || cluster.status?.toLowerCase() === 'unavailable';
    } else if (filter === 'pending') {
      return cluster.status?.toLowerCase() === 'pending';
    }
    return true;
  });
};

/**
 * Applies label filters to clusters
 */
export const applyLabelFilter = (
  clusters: ManagedClusterInfo[],
  filterByLabel: Array<{ key: string; value: string }>
): ManagedClusterInfo[] => {
  if (!filterByLabel || filterByLabel.length === 0) return clusters;

  return clusters.filter(cluster => {
    // A cluster must match ALL label filters to be included
    return filterByLabel.every(labelFilter => {
      const { key, value } = labelFilter;
      return cluster.labels && cluster.labels[key] === value;
    });
  });
};

/**
 * Applies all filters to the clusters array
 */
export const applyClusterFilters = (
  clusters: ManagedClusterInfo[],
  options: FilterOptions
): ManagedClusterInfo[] => {
  let result = [...clusters];

  // Apply search query filter
  result = applySearchFilter(result, options.query);

  // Apply status filter
  result = applyStatusFilter(result, options.filter);

  // Apply label filters
  result = applyLabelFilter(result, options.filterByLabel);

  return result;
};

/**
 * Gets available status options for filtering
 */
export const getStatusFilterOptions = () => [
  { value: '', label: 'All Status', color: '' },
  { value: 'available', label: 'Active', color: '#67c073' },
  { value: 'unavailable', label: 'Inactive', color: '#ff6b6b' },
  { value: 'pending', label: 'Pending', color: '#ffb347' },
];

/**
 * Validates if a cluster matches search criteria
 */
export const isClusterMatchingSearch = (
  cluster: ManagedClusterInfo,
  searchTerm: string
): boolean => {
  const searchLower = searchTerm.toLowerCase().trim();

  if (!searchLower) return true;

  const nameMatch = cluster.name.toLowerCase().includes(searchLower);
  const labelMatch = Object.entries(cluster.labels || {}).some(
    ([key, value]) =>
      key.toLowerCase().includes(searchLower) || value.toLowerCase().includes(searchLower)
  );
  const contextMatch = cluster.context.toLowerCase().includes(searchLower);
  const statusMatch = (cluster.status || '').toLowerCase().includes(searchLower);

  return nameMatch || labelMatch || contextMatch || statusMatch;
};

/**
 * Gets cluster status information for display
 */
export const getClusterStatusInfo = (cluster: ManagedClusterInfo) => {
  const isInactive = cluster.status?.toLowerCase() === 'unavailable' || !cluster.available;
  const isPending = cluster.status?.toLowerCase() === 'pending';

  return {
    isActive: !isInactive && !isPending,
    isInactive,
    isPending,
    statusText: isInactive ? 'inactive' : isPending ? 'pending' : 'active',
  };
};

/**
 * Counts clusters by status
 */
export const getClusterStatusCounts = (clusters: ManagedClusterInfo[]) => {
  const counts = { active: 0, inactive: 0, pending: 0, total: clusters.length };

  clusters.forEach(cluster => {
    const status = getClusterStatusInfo(cluster);
    if (status.isActive) counts.active++;
    else if (status.isInactive) counts.inactive++;
    else if (status.isPending) counts.pending++;
  });

  return counts;
};

/**
 * Extracts unique label keys from clusters
 */
export const getUniqueLabels = (clusters: ManagedClusterInfo[]): string[] => {
  const labelKeys = new Set<string>();

  clusters.forEach(cluster => {
    if (cluster.labels) {
      Object.keys(cluster.labels).forEach(key => labelKeys.add(key));
    }
  });

  return Array.from(labelKeys).sort();
};

/**
 * Extracts unique label key-value pairs from clusters
 */
export const getUniqueLabelPairs = (
  clusters: ManagedClusterInfo[]
): Array<{ key: string; value: string }> => {
  const labelPairs = new Set<string>();

  clusters.forEach(cluster => {
    if (cluster.labels) {
      Object.entries(cluster.labels).forEach(([key, value]) => {
        labelPairs.add(`${key}=${value}`);
      });
    }
  });

  return Array.from(labelPairs)
    .map(pair => {
      const [key, value] = pair.split('=');
      return { key, value };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
};
