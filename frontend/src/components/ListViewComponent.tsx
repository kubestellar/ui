import { Box, Typography, Button, Tooltip } from '@mui/material';
import { useEffect, useState, useCallback, useRef } from 'react';
import useTheme from '../stores/themeStore';
import ListViewSkeleton from './skeleton/ListViewSkeleton';
import { api } from '../lib/api';
import DownloadLogsButton from './DownloadLogsButton';
import { useTranslation } from 'react-i18next';
import ObjectFilters, { ObjectFilter } from './ObjectFilters';
import { useListViewQueries } from '../hooks/queries/useListViewQueries';

// Define the response interfaces
export interface ResourceItem {
  createdAt: string;
  kind: string;
  name: string;
  namespace: string;
  labels?: Record<string, string>;
  uid?: string;
  version?: string;
  project?: string;
  source?: string;
  destination?: string;
  status?: 'Synced' | 'OutOfSync' | 'Missing' | 'Healthy';
  context?: string; // Add context field
}

interface SSEData {
  count: number;
  data: {
    new: ResourceItem[];
  };
}

// Define types for the data structure in the complete event
interface NamespacedResources {
  [namespace: string]: {
    [kind: string]: ResourceItem[] | { __namespaceMetaData: ResourceItem[] };
  };
}

interface ClusterScopedResources {
  [key: string]: ResourceItem[];
}

interface CompleteEventData {
  namespaced: NamespacedResources;
  clusterScoped: ClusterScopedResources;
  contexts?: Record<string, string>; // Map of resources to contexts
}

// Add props interface
interface ListViewComponentProps {
  filteredContext?: string;
  onResourceDataChange?: (data: {
    resources: ResourceItem[];
    filteredResources: ResourceItem[];
    contextCounts: Record<string, number>;
    totalCount: number;
  }) => void;
  initialResourceFilters?: ObjectFilter;
  onResourceFiltersChange?: (filters: ObjectFilter) => void;
}

const ListViewComponent = ({
  filteredContext = 'all',
  onResourceDataChange,
  initialResourceFilters = {},
  onResourceFiltersChange,
}: ListViewComponentProps) => {
  const { t } = useTranslation();
  const theme = useTheme(state => state.theme);

  // React Query hook for data fetching
  const { useListViewData } = useListViewQueries();
  const {
    data: queryData,
    error: queryError,
    refetch: refetchQuery,
  } = useListViewData({
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    refetchInterval: 60000, // 1 minute background refresh
  });

  // Keep existing state for SSE fallback and compatibility
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [filteredResources, setFilteredResources] = useState<ResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [initialLoading, setInitialLoading] = useState<boolean>(true); // Track initial connection
  const [loadingMessage, setLoadingMessage] = useState<string>(t('listView.connecting'));
  const [error, setError] = useState<string | null>(null);
  const resourcesRef = useRef<ResourceItem[]>([]);
  const [totalRawResources, setTotalRawResources] = useState<number>(0); // Track raw resources count
  const isUnmountedRef = useRef(false);

  // Add pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(25);

  // Add resource filters state - use a ref to track if this is the initial mount
  const [resourceFilters, setResourceFilters] = useState<ObjectFilter>(initialResourceFilters);
  const prevFiltersRef = useRef({ filteredContext, resourceFilters: initialResourceFilters });
  const isInitialMountRef = useRef(true);
  const lastInitialFiltersRef = useRef<ObjectFilter>(initialResourceFilters);

  // Sync React Query data with existing state (non-breaking change)
  useEffect(() => {
    if (queryData && queryData.length > 0) {
      console.log('[ListViewComponent] Using React Query data:', queryData.length, 'resources');
      setResources(queryData);
      resourcesRef.current = queryData;
      setTotalRawResources(queryData.length);
      setIsLoading(false);
      setInitialLoading(false);
      setError(null);
    }
  }, [queryData]);

  // Handle React Query errors
  useEffect(() => {
    if (queryError) {
      console.error('[ListViewComponent] React Query error:', queryError);
      setError(queryError.message);
      setIsLoading(false);
      setInitialLoading(false);
    }
  }, [queryError]);

  // Initialize filters from props only on mount or meaningful changes from parent
  useEffect(() => {
    // On initial mount, always use the provided filters
    if (isInitialMountRef.current) {
      setResourceFilters(initialResourceFilters);
      lastInitialFiltersRef.current = initialResourceFilters;
      isInitialMountRef.current = false;
      return;
    }

    // Only update if the initialResourceFilters actually changed from what we last received
    // This prevents loops where parent updates filters in response to our onResourceFiltersChange
    const initialFiltersChanged =
      JSON.stringify(lastInitialFiltersRef.current) !== JSON.stringify(initialResourceFilters);

    if (initialFiltersChanged && Object.keys(initialResourceFilters).length > 0) {
      setResourceFilters(initialResourceFilters);
      lastInitialFiltersRef.current = initialResourceFilters;
    }
  }, [initialResourceFilters]);

  // Add useEffect to notify parent of resource data changes
  useEffect(() => {
    // Calculate context counts
    const contextCounts: Record<string, number> = {};
    resources.forEach(resource => {
      const context = resource.context || 'default';
      contextCounts[context] = (contextCounts[context] || 0) + 1;
    });

    // Notify parent component if callback provided
    if (onResourceDataChange) {
      onResourceDataChange({
        resources,
        filteredResources,
        contextCounts,
        totalCount: resources.length,
      });
    }
  }, [resources, filteredResources, onResourceDataChange]);

  // Add effect to filter resources when filteredContext or resourceFilters changes
  useEffect(() => {
    let filtered = resources;

    // First apply context filter
    if (filteredContext !== 'all') {
      filtered = filtered.filter(resource => resource.context === filteredContext);
    }

    // Then apply resource filters
    if (resourceFilters.kind) {
      filtered = filtered.filter(resource => resource.kind === resourceFilters.kind);
    }

    if (resourceFilters.namespace) {
      filtered = filtered.filter(resource => resource.namespace === resourceFilters.namespace);
    }

    if (resourceFilters.label) {
      filtered = filtered.filter(
        resource =>
          resource.labels &&
          resource.labels[resourceFilters.label!.key] === resourceFilters.label!.value
      );
    }

    if (resourceFilters.searchQuery) {
      const searchLower = resourceFilters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        resource =>
          resource.name.toLowerCase().includes(searchLower) ||
          resource.kind.toLowerCase().includes(searchLower) ||
          resource.namespace.toLowerCase().includes(searchLower) ||
          (resource.status && resource.status.toLowerCase().includes(searchLower))
      );
    }

    setFilteredResources(filtered);

    // Log resources stats for debugging
    console.log(`[ListViewComponent] Resource counts: 
      - Total raw resources: ${totalRawResources}
      - Resources after processing: ${resources.length}
      - Filtered resources (${filteredContext}): ${filtered.length}
    `);

    const filtersChanged =
      prevFiltersRef.current.filteredContext !== filteredContext ||
      JSON.stringify(prevFiltersRef.current.resourceFilters) !== JSON.stringify(resourceFilters);

    if (filtersChanged) {
      setCurrentPage(1);
      prevFiltersRef.current = { filteredContext, resourceFilters };
    }
  }, [filteredContext, resources, totalRawResources, resourceFilters]);

  // Function to format date strings properly
  const formatCreatedAt = (dateString: string): string => {
    // The backend returns dates in format like "2025-02-13 15:10:11 +0530 IST"
    // Direct usage of new Date() doesn't parse this format correctly
    try {
      // Remove the timezone name (IST) and use only the offset
      const cleanDateString = dateString.replace(' IST', '');

      // Try to parse using various approaches
      const date = new Date(cleanDateString);

      // Check if date is valid
      if (!isNaN(date.getTime())) {
        return date.toLocaleString();
      }

      // If direct parsing fails, try manual parsing
      const parts = dateString.split(' ');
      if (parts.length >= 2) {
        // Just return the original date string without the timezone name
        return `${parts[0]} ${parts[1]}`;
      }

      // If all parsing fails, return the original string
      return dateString;
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return dateString; // Return original if parsing fails
    }
  };

  // SSE fallback effect - only runs when React Query fails or is disabled
  useEffect(() => {
    // Only run SSE fallback if React Query data is not available
    if (queryData && queryData.length > 0) {
      console.log('[ListViewComponent] React Query data available, skipping SSE fallback');
      return;
    }

    let isMounted = true;
    let eventSource: EventSource | null = null;
    isUnmountedRef.current = false;

    const processCompleteData = (data: CompleteEventData): ResourceItem[] => {
      const resourceList: ResourceItem[] = [];
      const resourceContexts = data.contexts || {};

      // Count raw resources for debugging
      let rawClusterCount = 0;
      let rawNamespacedCount = 0;

      // Process cluster-scoped resources
      if (data.clusterScoped) {
        Object.entries(data.clusterScoped).forEach(([kind, items]) => {
          if (!Array.isArray(items)) return;

          rawClusterCount += items.length;
          (items as ResourceItem[]).forEach((item: ResourceItem) => {
            const sourceUrl = `https://github.com/onkarr17/${item.name.toLowerCase()}-gitrepo.io/k8s`;
            // Get context for this resource from the contexts map
            const resourceUid = item.uid || `${item.kind || kind}/${item.name}`;
            const context = resourceContexts[resourceUid] || 'default';

            resourceList.push({
              createdAt: item.createdAt,
              kind: item.kind || kind,
              name: item.name,
              namespace: item.namespace || '',
              labels: item.labels || {},
              project: 'default',
              source: sourceUrl,
              destination: `in-cluster/${item.namespace || 'default'}`,
              context: context,
            });
          });
        });
      }

      // Process namespaced resources
      if (data.namespaced) {
        Object.entries(data.namespaced).forEach(([namespace, resourcesByKind]) => {
          if (typeof resourcesByKind !== 'object' || resourcesByKind === null) return;

          // Process each kind of resource in this namespace
          Object.entries(resourcesByKind).forEach(([kind, items]) => {
            if (kind === '__namespaceMetaData' || !Array.isArray(items)) return;
            rawNamespacedCount += items.length;
            (items as ResourceItem[]).forEach((item: ResourceItem) => {
              const sourceUrl = `https://github.com/onkarr17/${item.name.toLowerCase()}-gitrepo.io/k8s`;
              // Get context for this resource from the contexts map
              const resourceUid = item.uid || `${item.kind || kind}/${item.name}`;
              const context = resourceContexts[resourceUid] || 'default';

              resourceList.push({
                createdAt: item.createdAt,
                kind: item.kind || kind,
                name: item.name,
                namespace: item.namespace || namespace,
                labels: item.labels || {}, // Include labels from SSE data
                project: 'default',
                source: sourceUrl,
                destination: `in-cluster/${item.namespace || namespace}`,
                context: context, // Add context information
              });
            });
          });
        });
      }

      if (isMounted) {
        setTotalRawResources(rawClusterCount + rawNamespacedCount);
        console.log(`[ListViewComponent] API returned: 
          - Raw cluster resources: ${rawClusterCount}
          - Raw namespaced resources: ${rawNamespacedCount}
          - Total raw: ${rawClusterCount + rawNamespacedCount}
          - Processed: ${resourceList.length}
        `);
      }

      return resourceList;
    };

    const fetchDataWithSSE = () => {
      if (isUnmountedRef.current) return;
      setIsLoading(true);
      setInitialLoading(true);
      setLoadingMessage(t('listView.connecting'));
      setError(null);
      resourcesRef.current = [];

      const sseEndpoint = '/api/wds/list-sse';

      try {
        // Create EventSource for SSE connection
        eventSource = new EventSource(
          `${process.env.VITE_BASE_URL || 'http://localhost:4000'}${sseEndpoint}`
        );

        // Handle connection open
        eventSource.onopen = () => {
          if (isUnmountedRef.current) return;
          if (isMounted) {
            setLoadingMessage(t('listView.receivingWorkloads'));
            // Keep isLoading true, but set initialLoading to false so we can show the items as they arrive
            setInitialLoading(false);
          }
        };

        // Handle progress events
        eventSource.addEventListener('progress', (event: MessageEvent) => {
          if (isUnmountedRef.current) return;
          if (!isMounted) return;

          try {
            const eventData: SSEData = JSON.parse(event.data);

            // Process new resources
            if (eventData.data && eventData.data.new && Array.isArray(eventData.data.new)) {
              // Make a copy to avoid race conditions
              const currentResources = [...resourcesRef.current];

              // Track added resources
              let addedCount = 0;

              eventData.data.new.forEach(item => {
                if (!item || typeof item !== 'object') return;

                const sourceUrl = `https://github.com/onkarr17/${(item.name || 'unknown').toLowerCase()}-gitrepo.io/k8s`;
                const resourceItem = {
                  createdAt: item.createdAt || new Date().toISOString(),
                  kind: item.kind || 'Unknown',
                  name: item.name || 'unknown',
                  namespace: item.namespace || 'Cluster',
                  labels: item.labels || {}, // Include labels from SSE progress data
                  project: 'default',
                  source: sourceUrl,
                  destination: `in-cluster/${item.namespace || 'default'}`,
                  context: item.context || 'default', // Include context
                };
                currentResources.push(resourceItem);
                addedCount++;
              });

              if (addedCount > 0) {
                resourcesRef.current = currentResources;

                // Update state with current resources
                setResources([...currentResources]);
                // Total items will be set by useEffect for filtering

                // Update loading message to show progress
                setLoadingMessage(
                  t('listView.receivedWorkloadsSoFar', { count: currentResources.length })
                );
              }
            }
          } catch (parseError) {
            console.error('Progress event parse error:', parseError);
          }
        });

        // Handle complete event
        eventSource.addEventListener('complete', (event: MessageEvent) => {
          if (isUnmountedRef.current) return;
          if (!isMounted) return;

          try {
            // Parse the complete event data
            const completeData = JSON.parse(event.data) as CompleteEventData;

            // Process the complete data which has the full dataset
            const allResources = processCompleteData(completeData);

            // If we have resources from the progress events but none in the complete event
            // (which would be unusual), keep the progress resources
            if (allResources.length === 0 && resourcesRef.current.length > 0) {
              setResources([...resourcesRef.current]);
              // Total items will be set by useEffect for filtering
            } else {
              // Otherwise use the complete data
              setResources(allResources);
              // Total items will be set by useEffect for filtering
              resourcesRef.current = allResources;
            }

            // Show a completion message briefly before hiding the loading indicator
            setLoadingMessage(
              t('listView.allWorkloadsReceived', { count: resourcesRef.current.length })
            );

            // After a brief delay, hide the loading indicator
            setTimeout(() => {
              if (isMounted) {
                setIsLoading(false);
              }
            }, 2000);

            // Close the connection
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }
          } catch (parseError) {
            console.error('Complete event processing error:', parseError);

            // If we failed to parse the complete event but have resources from progress,
            // just use those and don't show an error
            if (resourcesRef.current.length > 0) {
              setResources([...resourcesRef.current]);
              // Total items will be set by useEffect for filtering
              setInitialLoading(false);
              setIsLoading(false);

              // Show warning about incomplete data
              setLoadingMessage(
                `Showing ${resourcesRef.current.length} workloads (data may be incomplete)`
              );
              setTimeout(() => {
                if (isMounted) {
                  setIsLoading(false);
                }
              }, 3000);
            } else {
              // If we have no resources at all, show an error
              setError('Failed to process resource data. Please try again.');
              setInitialLoading(false);
              setIsLoading(false);
            }

            // Close the connection
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }
          }
        });

        // Handle errors
        eventSource.onerror = err => {
          if (isUnmountedRef.current) return;
          console.error('SSE connection error', err);

          if (isMounted) {
            // If we already have resources from progress events, just show those
            if (resourcesRef.current.length > 0) {
              setInitialLoading(false);
              setResources([...resourcesRef.current]);
              // Total items will be set by useEffect for filtering
              setLoadingMessage(
                t('listView.connectionLost', { count: resourcesRef.current.length })
              );

              // After a brief delay, hide the loading indicator
              setTimeout(() => {
                if (isMounted) {
                  setIsLoading(false);
                }
              }, 2000);
            } else {
              // Otherwise show an error and try the fallback
              setError(t('listView.connectionError'));
              fetchFallbackData();
            }

            // Close the connection
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }
          }
        };
      } catch (error: unknown) {
        if (isUnmountedRef.current) return;
        // Fall back to regular API if SSE fails
        console.error('SSE connection establishment error', error);
        fetchFallbackData();
      }
    };

    const fetchFallbackData = async () => {
      if (isUnmountedRef.current) return;
      // Regular API fallback in case SSE doesn't work
      setInitialLoading(true);
      setLoadingMessage(t('listView.fetchingFallback'));

      try {
        const response = await api.get('/wds/list', { timeout: 15000 });

        if (!isMounted) return;

        // Process the fallback response
        if (response.data && response.data.data) {
          // Log raw API response for debugging
          console.log(
            '[ListViewComponent] API response structure:',
            Object.keys(response.data.data).map(
              key => `${key}: ${JSON.stringify(response.data.data[key]).substring(0, 100)}...`
            )
          );

          const processedResources = processCompleteData(response.data.data as CompleteEventData);
          setResources(processedResources);
          // Total items will be set by useEffect for filtering
          resourcesRef.current = processedResources;
          setInitialLoading(false);
          setIsLoading(false);
        } else {
          setError(t('listView.invalidResponseFormat'));
          setInitialLoading(false);
          setIsLoading(false);
        }
      } catch (error: unknown) {
        console.error('Error fetching list data', error);

        const errorMessage = t('listView.unknownError');

        if (isMounted) {
          setError(errorMessage);
          setInitialLoading(false);
          setIsLoading(false);
        }
      }
    };

    // Start with SSE
    fetchDataWithSSE();

    return () => {
      isUnmountedRef.current = true;
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [t, queryData]); // Include queryData to trigger fallback when needed

  // Calculate pagination values using filteredResources instead of resources
  const actualTotalItems = filteredResources.length;
  const totalPages = Math.ceil(actualTotalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredResources.slice(indexOfFirstItem, indexOfLastItem);

  // Handle page changes
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const getPageNumbers = useCallback((): (number | string)[] => {
    if (totalPages <= 1) return [1];
    if (totalPages <= 7) {
      // If we have 7 or fewer pages, show them all
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const range: (number | string)[] = [];

    range.push(1);

    if (currentPage <= 4) {
      for (let i = 2; i <= Math.min(5, totalPages - 1); i++) {
        range.push(i);
      }
      if (totalPages > 6) {
        range.push('...');
      }
    } else if (currentPage >= totalPages - 3) {
      if (totalPages > 6) {
        range.push('...');
      }
      for (let i = Math.max(totalPages - 4, 2); i <= totalPages - 1; i++) {
        range.push(i);
      }
    } else {
      range.push('...');
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        range.push(i);
      }
      range.push('...');
    }

    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  }, [currentPage, totalPages]);

  // Retry handler for when errors occur
  const handleRetry = () => {
    // Use React Query refetch if available, otherwise fallback to page reload
    if (refetchQuery) {
      console.log('[ListViewComponent] Retrying with React Query refetch');
      refetchQuery();
    } else {
      console.log('[ListViewComponent] React Query not available, reloading page');
      window.location.reload();
    }
  };

  // Handle resource filter changes
  const handleResourceFiltersChange = (filters: ObjectFilter) => {
    // Only update if filters actually changed to prevent unnecessary re-renders and loops
    const filtersChanged = JSON.stringify(resourceFilters) !== JSON.stringify(filters);

    if (filtersChanged) {
      setResourceFilters(filters);
      // Notify parent component about filter changes
      if (onResourceFiltersChange) {
        onResourceFiltersChange(filters);
      }
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: theme === 'dark' ? 'rgb(15, 23, 42)' : '#fff',
        position: 'relative',
      }}
    >
      <Box
        sx={{
          width: '100%',
          height: '12px',
          backgroundColor: '#4498FF',
          borderRadius: '6px',
          borderBottom: theme === 'dark' ? '1px solid #334155' : '1px solid #ccc',
        }}
      />
      {initialLoading ? (
        <ListViewSkeleton itemCount={6} />
      ) : error ? (
        <Box
          sx={{
            width: '100%',
            height: '70vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 2,
            padding: 3,
          }}
        >
          <Typography variant="h6" sx={{ color: theme === 'dark' ? '#fff' : '#333' }}>
            {t('listView.errorLoading')}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: theme === 'dark' ? '#A5ADBA' : '#6B7280',
              textAlign: 'center',
              maxWidth: '600px',
            }}
          >
            {error}
          </Typography>
          <Box
            sx={{
              backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              padding: 2,
              borderRadius: 1,
              maxWidth: '600px',
              marginTop: 2,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: theme === 'dark' ? '#A5ADBA' : '#6B7280',
                mt: 1,
                fontFamily: 'monospace',
                fontSize: '0.8rem',
              }}
            >
              {t('listView.troubleshooting.title')}
              <br />
              {t('listView.troubleshooting.step1')}
              <br />
              {t('listView.troubleshooting.step2')}
              <br />
              {t('listView.troubleshooting.step3')}
              <br />
              {t('listView.troubleshooting.step4')}
            </Typography>
          </Box>
          <Button variant="contained" color="primary" onClick={handleRetry} sx={{ mt: 3 }}>
            {t('common.retry')}
          </Button>
        </Box>
      ) : filteredResources.length > 0 ? (
        <Box
          sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}
        >
          {isLoading && (
            <Box
              sx={{
                width: '100%',
                px: 2,
                py: 1,
                backgroundColor:
                  theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(240, 247, 255, 0.8)',
                borderBottom: theme === 'dark' ? '1px solid #334155' : '1px solid #e5e7eb',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: theme === 'dark' ? '#A5ADBA' : '#6B7280',
                  fontStyle: 'italic',
                }}
              >
                {loadingMessage}
              </Typography>
            </Box>
          )}

          {/* Resource count info banner */}
          {filteredContext !== 'all' && (
            <Box
              sx={{
                width: '100%',
                px: 2,
                py: 1,
                backgroundColor:
                  theme === 'dark' ? 'rgba(25, 118, 210, 0.1)' : 'rgba(25, 118, 210, 0.05)',
                borderBottom:
                  theme === 'dark'
                    ? '1px solid rgba(144, 202, 249, 0.2)'
                    : '1px solid rgba(25, 118, 210, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: theme === 'dark' ? '#90CAF9' : '#1976d2',
                  fontWeight: 500,
                }}
              >
                {t('listView.filteredByContext', { context: filteredContext })}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: theme === 'dark' ? '#A5ADBA' : '#6B7280',
                }}
              >
                {t('listView.showingResourceCount', {
                  showing: filteredResources.length,
                  total: resources.length,
                })}
              </Typography>
            </Box>
          )}

          {/* Add ObjectFilters component */}
          {!isLoading && resources.length > 0 && (
            <ObjectFilters
              availableResources={resources}
              activeFilters={resourceFilters}
              onFiltersChange={handleResourceFiltersChange}
            />
          )}

          <Box
            sx={{
              width: '100%',
              flex: 1,
              overflow: 'auto',
              padding: 2,
              paddingBottom: '80px', // Add padding at the bottom to prevent content from being hidden behind pagination
            }}
          >
            {currentItems.map((resource, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  alignItems: { xs: 'flex-start', md: 'center' },
                  padding: 1.5,
                  marginBottom: 1.5,
                  backgroundColor: theme === 'dark' ? 'rgb(30, 41, 59)' : '#f8fafc',
                  borderLeft: '4px solid #4498FF',
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: theme === 'dark' ? 'rgb(51, 65, 85)' : '#f0f7ff',
                    transition: 'background-color 0.2s',
                  },
                  transition: 'background-color 0.2s',
                }}
              >
                {/* Star icon */}
                <Box
                  sx={{
                    width: '36px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    mr: 2,
                  }}
                >
                  <Typography sx={{ color: '#4498FF', fontSize: 18 }}>★</Typography>
                </Box>

                {/* Content section */}
                <Box
                  sx={{
                    flexGrow: 1,
                    minWidth: 0,
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' },
                    gap: { xs: 1, md: 3 },
                    width: '100%',
                    alignItems: 'center',
                  }}
                >
                  {/* Name and namespace section */}
                  <Box sx={{ overflow: 'hidden' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography
                        sx={{
                          color: theme === 'dark' ? '#fff' : '#6B7280',
                          fontWeight: 500,
                          fontSize: '1rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {resource.name}
                      </Typography>

                      {/* Add download logs button for pod resources */}
                      {resource.kind.toLowerCase() === 'pod' && (
                        <Tooltip title={t('listView.downloadLogs')}>
                          <span className="ml-2">
                            <DownloadLogsButton
                              cluster={resource.context || 'default'}
                              namespace={resource.namespace}
                              podName={resource.name}
                            />
                          </span>
                        </Tooltip>
                      )}
                    </Box>

                    {resource.namespace !== '' && (
                      <Typography
                        sx={{
                          color: theme === 'dark' ? '#A5ADBA' : '#6B7280',
                          fontSize: '0.875rem',
                        }}
                      >
                        {t('listView.namespace')}: {resource.namespace}
                      </Typography>
                    )}
                  </Box>

                  {/* Kind tag centered */}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: { xs: 'flex-start', md: 'center' },
                      alignItems: 'center',
                    }}
                  >
                    <Typography
                      sx={{
                        color: theme === 'dark' ? '#A5ADBA' : '#6B7280',
                        fontWeight: 500,
                        fontSize: '0.875rem',
                        backgroundColor:
                          theme === 'dark' ? 'rgba(71, 85, 105, 0.5)' : 'rgba(241, 245, 249, 0.8)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border:
                          theme === 'dark'
                            ? '1px solid rgba(100, 116, 139, 0.5)'
                            : '1px solid rgba(226, 232, 240, 0.8)',
                        display: 'inline-block',
                        minWidth: '80px',
                        textAlign: 'center',
                      }}
                    >
                      {resource.kind}
                    </Typography>
                  </Box>

                  {/* Created at date aligned right */}
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: { xs: 'flex-start', md: 'flex-end' },
                      alignItems: 'center',
                    }}
                  >
                    <Typography
                      sx={{
                        color: theme === 'dark' ? '#A5ADBA' : '#6B7280',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t('listView.created')}: {formatCreatedAt(resource.createdAt)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: { xs: 2, sm: 0 },
              p: { xs: 2, sm: 3 },
              pt: { xs: 2, sm: 2 },
              borderTop: theme === 'dark' ? '1px solid #334155' : '1px solid #e5e7eb',
              backgroundColor: theme === 'dark' ? 'rgb(30, 41, 59)' : 'rgb(248, 250, 252)',
              borderRadius: '0 0 8px 8px',
              position: 'sticky',
              bottom: 14,
              left: 0,
              right: 0,
              zIndex: 20,
              boxShadow:
                theme === 'dark' ? '0 -4px 6px rgba(0,0,0,0.3)' : '0 -4px 6px rgba(0,0,0,0.1)',
              margin: 0,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography
                variant="body2"
                sx={{
                  color: theme === 'dark' ? 'white' : 'text.secondary',
                  textAlign: { xs: 'center', sm: 'left' },
                  fontWeight: 500,
                  mb: { xs: 1, sm: 0 },
                }}
              >
                {t('listView.pagination.showing', {
                  from: indexOfFirstItem + 1,
                  to: Math.min(indexOfLastItem, actualTotalItems),
                  total: actualTotalItems,
                })}
                {filteredContext !== 'all' &&
                  t('listView.pagination.filtered', { context: filteredContext })}
              </Typography>

              {totalRawResources > 0 && totalRawResources !== resources.length && (
                <Typography
                  variant="caption"
                  sx={{
                    color: theme === 'dark' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
                    textAlign: { xs: 'center', sm: 'left' },
                    mt: 0.5,
                    fontSize: '0.7rem',
                  }}
                >
                  {t('listView.resourceStats', {
                    raw: totalRawResources,
                    processed: resources.length,
                  })}
                </Typography>
              )}
            </Box>

            <Box
              sx={{
                display: 'flex',
                gap: { xs: 0.5, sm: 1 },
                justifyContent: { xs: 'center', sm: 'flex-end' },
                flexWrap: 'wrap',
                width: '100%',
                maxWidth: { xs: '100%', sm: 'auto' },
              }}
            >
              <Button
                variant="outlined"
                size="small"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || totalPages === 0}
                sx={{
                  minWidth: { xs: 60, sm: 70 },
                  px: { xs: 1, sm: 1.5 },
                  py: 0.5,
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  fontWeight: 500,
                  color: theme === 'dark' ? 'white' : 'primary.main',
                  borderColor:
                    theme === 'dark' ? 'rgba(255, 255, 255, 0.23)' : 'rgba(25, 118, 210, 0.5)',
                  '&:hover': {
                    borderColor: theme === 'dark' ? 'white' : 'primary.main',
                    backgroundColor:
                      theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(25, 118, 210, 0.04)',
                  },
                  '&.Mui-disabled': {
                    cursor: 'not-allowed',
                    pointerEvents: 'all !important',
                    backgroundColor:
                      theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
                    borderColor:
                      theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.26)',
                    color: theme === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.26)',
                  },
                }}
              >
                {t('listView.pagination.prev')}
              </Button>

              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: 0.5,
                }}
              >
                {getPageNumbers().map((pageNumber, index) => (
                  <Button
                    key={index}
                    variant={pageNumber === currentPage ? 'contained' : 'outlined'}
                    size="small"
                    disabled={pageNumber === '...'}
                    onClick={() =>
                      typeof pageNumber === 'number' ? handlePageChange(pageNumber) : undefined
                    }
                    sx={{
                      display: {
                        xs:
                          // On mobile, show: first page, current page ±1, last page, and ellipsis
                          pageNumber === '...' ||
                          pageNumber === 1 ||
                          pageNumber === totalPages ||
                          (typeof pageNumber === 'number' &&
                            Math.abs(pageNumber - currentPage) <= 1)
                            ? 'inline-flex'
                            : 'none',
                        sm: 'inline-flex', // On larger screens, show all pages from our improved algorithm
                      },
                      minWidth: { xs: 30, sm: 36 },
                      height: { xs: 30, sm: 32 },
                      px: 0.5,
                      color:
                        pageNumber === currentPage
                          ? 'white'
                          : theme === 'dark'
                            ? 'white'
                            : 'primary.main',
                      borderColor:
                        theme === 'dark' ? 'rgba(255, 255, 255, 0.23)' : 'rgba(25, 118, 210, 0.5)',
                      backgroundColor: pageNumber === currentPage ? 'primary.main' : 'transparent',
                      m: 0,
                      '&:hover': {
                        borderColor: theme === 'dark' ? 'white' : 'primary.main',
                        backgroundColor:
                          pageNumber === currentPage
                            ? 'primary.dark'
                            : theme === 'dark'
                              ? 'rgba(255, 255, 255, 0.08)'
                              : 'rgba(25, 118, 210, 0.04)',
                      },
                    }}
                  >
                    {pageNumber}
                  </Button>
                ))}
              </Box>

              <Button
                variant="outlined"
                size="small"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                sx={{
                  minWidth: { xs: 60, sm: 70 },
                  px: { xs: 1, sm: 1.5 },
                  py: 0.5,
                  fontSize: { xs: '0.8rem', sm: '0.875rem' },
                  fontWeight: 500,
                  color: theme === 'dark' ? 'white' : 'primary.main',
                  borderColor:
                    theme === 'dark' ? 'rgba(255, 255, 255, 0.23)' : 'rgba(25, 118, 210, 0.5)',
                  '&:hover': {
                    borderColor: theme === 'dark' ? 'white' : 'primary.main',
                    backgroundColor:
                      theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(25, 118, 210, 0.04)',
                  },
                  '&.Mui-disabled': {
                    cursor: 'not-allowed',
                    pointerEvents: 'all !important',
                    backgroundColor:
                      theme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
                    borderColor:
                      theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.26)',
                    color: theme === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.26)',
                  },
                }}
              >
                {t('listView.pagination.next')}
              </Button>
            </Box>
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            width: '100%',
            backgroundColor: theme === 'dark' ? 'rgb(30, 41, 59)' : '#fff',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: '100px',
            padding: 3,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Typography
              sx={{ color: theme === 'dark' ? '#fff' : '#333', fontWeight: 500, fontSize: '22px' }}
            >
              {t('listView.noWorkloads.title')}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme === 'dark' ? '#94a3b8' : '#00000099',
                fontSize: '17px',
                mb: 2,
                textAlign: 'center',
              }}
            >
              {Object.keys(resourceFilters).length > 0
                ? t('listView.noWorkloads.noMatchingFilters')
                : filteredContext !== 'all'
                  ? t('listView.noWorkloads.noResourcesForContext', { context: filteredContext })
                  : resources.length > 0
                    ? t('listView.noWorkloads.resourcesFilteredOut')
                    : t('listView.noWorkloads.getStarted')}
            </Typography>
            {resources.length > 0 && filteredResources.length === 0 && (
              <Button
                variant="outlined"
                color="primary"
                onClick={() => setResourceFilters({})}
                sx={{ mt: 2 }}
              >
                {t('resources.clearFilters')}
              </Button>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ListViewComponent;
