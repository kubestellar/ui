import { Box, Typography, Button } from "@mui/material";
import { useEffect, useState, useCallback, useRef } from "react";
import useTheme from "../stores/themeStore";
import LoadingFallback from "./LoadingFallback";
import { api } from "../lib/api";

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
  status?: "Synced" | "OutOfSync" | "Missing" | "Healthy";
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
}

const ListViewComponent = ({ 
  filteredContext = "all",
  onResourceDataChange
}: ListViewComponentProps) => {
  const theme = useTheme((state) => state.theme);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [filteredResources, setFilteredResources] = useState<ResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [initialLoading, setInitialLoading] = useState<boolean>(true); // Track initial connection
  const [loadingMessage, setLoadingMessage] = useState<string>("Connecting to server...");
  const [error, setError] = useState<string | null>(null);
  const resourcesRef = useRef<ResourceItem[]>([]);
  const [totalRawResources, setTotalRawResources] = useState<number>(0); // Track raw resources count

  // Add pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(15);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Add useEffect to notify parent of resource data changes
  useEffect(() => {
    // Calculate context counts
    const contextCounts: Record<string, number> = {};
    resources.forEach(resource => {
      const context = resource.context || "default";
      contextCounts[context] = (contextCounts[context] || 0) + 1;
    });
    
    // Notify parent component if callback provided
    if (onResourceDataChange) {
      onResourceDataChange({
        resources,
        filteredResources,
        contextCounts,
        totalCount: resources.length
      });
    }
  }, [resources, filteredResources, onResourceDataChange]);

  // Add effect to filter resources when filteredContext changes
  useEffect(() => {
    if (filteredContext === "all") {
      setFilteredResources(resources);
      setTotalItems(resources.length);
    } else {
      const filtered = resources.filter(resource => 
        resource.context === filteredContext
      );
      setFilteredResources(filtered);
      setTotalItems(filtered.length);
    }
    // Log resources stats for debugging
    console.log(`[ListViewComponent] Resource counts: 
      - Total raw resources: ${totalRawResources}
      - Resources after processing: ${resources.length}
      - Filtered resources (${filteredContext}): ${filteredContext === "all" ? resources.length : resources.filter(r => r.context === filteredContext).length}
    `);
    
    // Reset to first page when filter changes
    setCurrentPage(1);
  }, [filteredContext, resources, totalRawResources]);

  // Function to format date strings properly
  const formatCreatedAt = (dateString: string): string => {
    // The backend returns dates in format like "2025-02-13 15:10:11 +0530 IST"
    // Direct usage of new Date() doesn't parse this format correctly
    try {
      // Remove the timezone name (IST) and use only the offset
      const cleanDateString = dateString.replace(" IST", "");
      
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
      console.error("Error formatting date:",error, dateString);
      return dateString; // Return original if parsing fails
    }
  };

  useEffect(() => {
    let isMounted = true;
    let eventSource: EventSource | null = null;

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
            const context = resourceContexts[resourceUid] || "default";
            
            resourceList.push({
              createdAt: item.createdAt,
              kind: item.kind || kind,
              name: item.name,
              namespace: item.namespace || "",
              project: "default",
              source: sourceUrl,
              destination: `in-cluster/${item.namespace || "default"}`,
              context: context // Add context information
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
            // Special handling for namespace metadata
            if (kind === "__namespaceMetaData") {
              if (Array.isArray(items)) {
                rawNamespacedCount += items.length;
                (items as ResourceItem[]).forEach((item: ResourceItem) => {
                  // Get context for this namespace from the contexts map
                  const resourceUid = item.uid || `Namespace/${item.name || namespace}`;
                  const context = resourceContexts[resourceUid] || "default";
                  
                resourceList.push({
                  createdAt: item.createdAt,
                    kind: "Namespace",
                    name: item.name || namespace,
                    namespace: namespace,
                    project: "default",
                    source: `https://github.com/onkarr17/${namespace.toLowerCase()}-gitrepo.io/k8s`,
                    destination: `in-cluster/${namespace}`,
                    context: context // Add context information
                  });
                });
              }
              return;
            }
            
            // Skip if items is not an array
            if (!Array.isArray(items)) return;
            
            rawNamespacedCount += items.length;
            (items as ResourceItem[]).forEach((item: ResourceItem) => {
              const sourceUrl = `https://github.com/onkarr17/${item.name.toLowerCase()}-gitrepo.io/k8s`;
              // Get context for this resource from the contexts map
              const resourceUid = item.uid || `${item.kind || kind}/${item.name}`;
              const context = resourceContexts[resourceUid] || "default";
              
              resourceList.push({
                createdAt: item.createdAt,
                kind: item.kind || kind,
                name: item.name,
                namespace: item.namespace || namespace,
                project: "default",
                source: sourceUrl,
                destination: `in-cluster/${item.namespace || namespace}`,
                context: context // Add context information
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
      setIsLoading(true);
      setInitialLoading(true);
      setLoadingMessage("Connecting to server...");
      setError(null);
      resourcesRef.current = [];

      const sseEndpoint = "/api/wds/list-sse";

      try {
        // Create EventSource for SSE connection
        eventSource = new EventSource(`${process.env.VITE_BASE_URL || "http://localhost:4000"}${sseEndpoint}`);
        
        // Handle connection open
        eventSource.onopen = () => {
          if (isMounted) {
            setLoadingMessage("Receiving workloads...");
            // Keep isLoading true, but set initialLoading to false so we can show the items as they arrive
            setInitialLoading(false);
          }
        };

        // Handle progress events
        eventSource.addEventListener('progress', (event: MessageEvent) => {
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
                  namespace: item.namespace || "Cluster",
                  project: "default",
                  source: sourceUrl,
                  destination: `in-cluster/${item.namespace || "default"}`,
                  context: item.context || "default" // Include context
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
                setLoadingMessage(`Received ${currentResources.length} workloads so far...`);
              }
            }
          } catch (parseError) {
            console.error("Progress event parse error:", parseError);
          }
        });

        // Handle complete event
        eventSource.addEventListener('complete', (event: MessageEvent) => {
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
            setLoadingMessage(`All ${resourcesRef.current.length} workloads received`);
            
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
            console.error("Complete event processing error:", parseError);
            
            // If we failed to parse the complete event but have resources from progress,
            // just use those and don't show an error
            if (resourcesRef.current.length > 0) {
              setResources([...resourcesRef.current]);
              // Total items will be set by useEffect for filtering
              setInitialLoading(false);
              setIsLoading(false);
              
              // Show warning about incomplete data
              setLoadingMessage(`Showing ${resourcesRef.current.length} workloads (data may be incomplete)`);
              setTimeout(() => {
                if (isMounted) {
                  setIsLoading(false);
                }
              }, 3000);
            } else {
              // If we have no resources at all, show an error
              setError("Failed to process resource data. Please try again.");
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
        eventSource.onerror = (err) => {
          console.error("SSE connection error", err);

          if (isMounted) {
            // If we already have resources from progress events, just show those
            if (resourcesRef.current.length > 0) {
              setInitialLoading(false);
              setResources([...resourcesRef.current]);
              // Total items will be set by useEffect for filtering
              setLoadingMessage(`Connection lost. Showing ${resourcesRef.current.length} received workloads.`);
              
              // After a brief delay, hide the loading indicator
              setTimeout(() => {
        if (isMounted) {
                  setIsLoading(false);
                }
              }, 2000);
            } else {
              // Otherwise show an error and try the fallback
              setError("Connection to server lost or failed. Trying fallback method...");
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
        // Fall back to regular API if SSE fails
        console.error("SSE connection establishment error",error);
        fetchFallbackData();
      }
    };

    const fetchFallbackData = async () => {
      // Regular API fallback in case SSE doesn't work
      setInitialLoading(true);
      setLoadingMessage("Fetching resources (fallback method)...");
      
      try {
        const response = await api.get("/wds/list", { timeout: 15000 });
        
        if (!isMounted) return;
        
        // Process the fallback response
        if (response.data && response.data.data) {
          // Log raw API response for debugging
          console.log("[ListViewComponent] API response structure:", 
            Object.keys(response.data.data).map(key => `${key}: ${JSON.stringify(response.data.data[key]).substring(0, 100)}...`)
          );
          
          const processedResources = processCompleteData(response.data.data as CompleteEventData);
          setResources(processedResources);
          // Total items will be set by useEffect for filtering
          resourcesRef.current = processedResources;
          setInitialLoading(false);
          setIsLoading(false);
        } else {
          setError("Invalid response format from server");
          setInitialLoading(false);
          setIsLoading(false);
        }
      } catch (error: unknown) {
        console.error("Error fetching list data",error);
        
        const errorMessage = "An unknown error occurred while fetching resources.";
        
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
      isMounted = false;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []); // Keep original dependencies

  // Calculate pagination values using filteredResources instead of resources
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredResources.slice(indexOfFirstItem, indexOfLastItem);

  // Handle page changes
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Generate page numbers
  const getPageNumbers = useCallback((): (number | string)[] => {
    if (totalPages <= 1) return [1];

    const range: (number | string)[] = [];
    let lastNumber: number | null = null;

    range.push(1);

    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
      if (i > 1 && i < totalPages) {
        if (lastNumber && i > lastNumber + 1) {
          range.push("...");
        }
        range.push(i);
        lastNumber = i;
      }
    }

    if (lastNumber && totalPages > lastNumber + 1) {
      range.push("...");
    }
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  }, [currentPage, totalPages]);

  // Retry handler for when errors occur
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        backgroundColor: theme === "dark" ? "rgb(15, 23, 42)" : "#fff",
        position: "relative",
      }}
    >
      <Box
        sx={{
          width: "100%",
          height: "12px",
          backgroundColor: "#4498FF",
          borderRadius: "6px",
          borderBottom: theme === "dark" ? "1px solid #334155" : "1px solid #ccc",
        }}
      />
      {initialLoading ? (
        <Box sx={{ 
          display: "flex", 
          flexDirection: "column",
          alignItems: "center", 
          justifyContent: "center", 
          height: "70vh" 
        }}>
          <LoadingFallback message={loadingMessage} size="medium" />
        </Box>
      ) : error ? (
        <Box
          sx={{
            width: "100%",
            height: "70vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
            padding: 3,
          }}
        >
          <Typography variant="h6" sx={{ color: theme === "dark" ? "#fff" : "#333" }}>
            Error Loading Resources
          </Typography>
          <Typography variant="body1" sx={{ color: theme === "dark" ? "#A5ADBA" : "#6B7280", textAlign: "center", maxWidth: "600px" }}>
            {error}
          </Typography>
          <Box sx={{ 
            backgroundColor: theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)", 
            padding: 2, 
            borderRadius: 1,
            maxWidth: "600px",
            marginTop: 2
          }}>
            <Typography variant="body2" sx={{ color: theme === "dark" ? "#A5ADBA" : "#6B7280", mt: 1, fontFamily: "monospace", fontSize: "0.8rem" }}>
              Try these troubleshooting steps:
              <br />
              1. Check that the backend server is running at http://localhost:4000
              <br />
              2. Verify the server's CORS configuration allows requests from http://localhost:5173
              <br />
              3. If the server uses wildcard (*) CORS, it can't accept requests with credentials
              <br />
              4. Check the browser console for detailed error messages
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleRetry}
            sx={{ mt: 3 }}
          >
            Retry
          </Button>
        </Box>
      ) : filteredResources.length > 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
          {isLoading && (
            <Box sx={{ 
              width: "100%", 
              px: 2, 
              py: 1, 
              backgroundColor: theme === "dark" ? "rgba(30, 41, 59, 0.8)" : "rgba(240, 247, 255, 0.8)",
              borderBottom: theme === "dark" ? "1px solid #334155" : "1px solid #e5e7eb",
              position: "sticky",
              top: 0,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Typography variant="body2" sx={{ 
                color: theme === "dark" ? "#A5ADBA" : "#6B7280",
                fontStyle: "italic"
              }}>
                {loadingMessage}
              </Typography>
            </Box>
          )}
          
          {/* Resource count info banner */}
          {filteredContext !== "all" && (
            <Box sx={{ 
              width: "100%", 
              px: 2, 
              py: 1, 
              backgroundColor: theme === "dark" ? "rgba(25, 118, 210, 0.1)" : "rgba(25, 118, 210, 0.05)",
              borderBottom: theme === "dark" ? "1px solid rgba(144, 202, 249, 0.2)" : "1px solid rgba(25, 118, 210, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <Typography variant="body2" sx={{ 
                color: theme === "dark" ? "#90CAF9" : "#1976d2",
                fontWeight: 500
              }}>
                Filtered by context: {filteredContext}
              </Typography>
              <Typography variant="body2" sx={{ 
                color: theme === "dark" ? "#A5ADBA" : "#6B7280",
              }}>
                Showing {filteredResources.length} of {resources.length} total resources
              </Typography>
            </Box>
          )}
          
          <Box
            sx={{
              width: "100%",
              flex: 1,
              overflow: "auto",
              padding: 2,
              paddingBottom: "80px", // Add padding at the bottom to prevent content from being hidden behind pagination
            }}
          >
            {currentItems.map((resource, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  alignItems: { xs: "flex-start", md: "center" },
                  padding: 1.5,
                  marginBottom: 1.5,
                  backgroundColor: theme === "dark" ? "rgb(30, 41, 59)" : "#f8fafc",
                  borderLeft: "4px solid #4498FF",
                  borderRadius: 1,
                  "&:hover": {
                    backgroundColor: theme === "dark" ? "rgb(51, 65, 85)" : "#f0f7ff",
                    transition: "background-color 0.2s",
                  },
                  transition: "background-color 0.2s",
                }}
              >
                {/* Star icon */}
                <Box
                  sx={{
                    width: "36px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    mr: 2,
                  }}
                >
                  <Typography sx={{ color: "#4498FF", fontSize: 18 }}>★</Typography>
                </Box>

                {/* Content section */}
                <Box
                  sx={{
                    flexGrow: 1,
                    minWidth: 0,
                    display: "grid", 
                    gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 1fr" },
                    gap: { xs: 1, md: 3 },
                    width: "100%",
                    alignItems: "center"
                  }}
                >
                  {/* Name and namespace section */}
                  <Box sx={{ overflow: "hidden" }}>
                    <Typography
                      sx={{
                        color: theme === "dark" ? "#fff" : "#6B7280",
                        fontWeight: 500,
                        fontSize: "1rem",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                    >
                      {resource.name}
                    </Typography>
                    {resource.namespace != "" && <Typography
                        sx={{
                          color: theme === "dark" ? "#A5ADBA" : "#6B7280",
                          fontSize: "0.875rem",
                        }}
                    >
                      Namespace: {resource.namespace}
                    </Typography>}
                  </Box>

                  {/* Kind tag centered */}
                  <Box sx={{ 
                    display: "flex",
                    justifyContent: { xs: "flex-start", md: "center" },
                    alignItems: "center"
                  }}>
                    <Typography sx={{ 
                      color: theme === "dark" ? "#A5ADBA" : "#6B7280",
                      fontWeight: 500,
                      fontSize: "0.875rem",
                      backgroundColor: theme === "dark" ? "rgba(71, 85, 105, 0.5)" : "rgba(241, 245, 249, 0.8)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: theme === "dark" ? "1px solid rgba(100, 116, 139, 0.5)" : "1px solid rgba(226, 232, 240, 0.8)",
                      display: "inline-block",
                      minWidth: "80px",
                      textAlign: "center"
                    }}>
                      {resource.kind}
                    </Typography>
                  </Box>

                  {/* Created at date aligned right */}
                  <Box sx={{ 
                    display: "flex",
                    justifyContent: { xs: "flex-start", md: "flex-end" },
                    alignItems: "center"
                  }}>
                    <Typography sx={{ 
                      color: theme === "dark" ? "#A5ADBA" : "#6B7280",
                      fontSize: "0.875rem",
                      whiteSpace: "nowrap"
                    }}>
                      Created: {formatCreatedAt(resource.createdAt)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
      
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              justifyContent: "space-between",
              alignItems: { xs: "stretch", sm: "center" },
              gap: { xs: 2, sm: 0 },
              p: { xs: 2, sm: 3 },
              pt: { xs: 2, sm: 2 },
              borderTop: theme === "dark" ? "1px solid #334155" : "1px solid #e5e7eb",
              backgroundColor: theme === "dark" ? "rgba(30, 41, 59, 0.9)" : "rgba(248, 250, 252, 0.95)", 
              borderRadius: "0 0 8px 8px",
              position: "sticky",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 20,
              boxShadow: theme === "dark" ? "0 -4px 6px rgba(0,0,0,0.3)" : "0 -4px 6px rgba(0,0,0,0.1)",
              backdropFilter: "blur(4px)",
              margin: 0,
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography
              variant="body2"
              sx={{
                color: theme === "dark" ? "white" : "text.secondary",
                textAlign: { xs: "center", sm: "left" },
                fontWeight: 500,
                mb: { xs: 1, sm: 0 },
              }}
            >
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalItems)} of {totalItems} entries
                {filteredContext !== "all" && ` (filtered by ${filteredContext} context)`}
            </Typography>

              {totalRawResources > 0 && totalRawResources !== resources.length && (
                <Typography
                  variant="caption"
                  sx={{
                    color: theme === "dark" ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.6)",
                    textAlign: { xs: "center", sm: "left" },
                    mt: 0.5,
                    fontSize: "0.7rem",
                  }}
                >
                  {totalRawResources} raw resources detected, {resources.length} processed
                </Typography>
              )}
            </Box>
         
            <Box
              sx={{
                display: "flex",
                gap: { xs: 0.5, sm: 1 }, 
                justifyContent: { xs: "center", sm: "flex-end" },
                flexWrap: "wrap",
                width: "100%",
                maxWidth: { xs: "100%", sm: "auto" },
              }}
            >
              <Button
                variant="outlined"
                size="small"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                sx={{
                  minWidth: { xs: 60, sm: 70 },
                  px: { xs: 1, sm: 1.5 },
                  py: 0.5,
                  fontSize: { xs: "0.8rem", sm: "0.875rem" },
                  fontWeight: 500,
                  color: theme === "dark" ? "white" : "primary.main",
                  borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.23)" : "rgba(25, 118, 210, 0.5)",
                  "&:hover": {
                    borderColor: theme === "dark" ? "white" : "primary.main",
                    backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(25, 118, 210, 0.04)",
                  },
                  "&.Mui-disabled": {
                    cursor: "not-allowed",
                    pointerEvents: "all !important",
                    backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
                    borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.26)",
                    color: theme === "dark" ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.26)",
                  },
                }}
              >
                Prev
              </Button>
          
              <Box 
                sx={{ 
                  display: "flex", 
                  flexWrap: "wrap", 
                  justifyContent: "center",
                  gap: 0.5
                }}
              >
                {getPageNumbers().map((pageNumber, index) => (
                  <Button
                    key={index}
                    variant={pageNumber === currentPage ? "contained" : "outlined"}
                    size="small"
                    disabled={pageNumber === "..."}
                    onClick={() => (typeof pageNumber === "number" ? handlePageChange(pageNumber) : undefined)}
                    sx={{
                      display: {
                        xs: typeof pageNumber === "number" && 
                            Math.abs((pageNumber as number) - currentPage) > 1 && 
                            pageNumber !== 1 && 
                            pageNumber !== totalPages ? 
                              "none" : "inline-flex",
                        sm: "inline-flex" 
                      },
                      minWidth: { xs: 30, sm: 36 },
                      height: { xs: 30, sm: 32 },
                      px: 0.5,
                      color: pageNumber === currentPage ? "white" : theme === "dark" ? "white" : "primary.main",
                      borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.23)" : "rgba(25, 118, 210, 0.5)",
                      backgroundColor: pageNumber === currentPage ? "primary.main" : "transparent",
                      m: 0,
                      "&:hover": {
                        borderColor: theme === "dark" ? "white" : "primary.main",
                        backgroundColor: pageNumber === currentPage ? 
                          "primary.dark" : 
                          theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(25, 118, 210, 0.04)",
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
                disabled={currentPage === totalPages}
                sx={{
                  minWidth: { xs: 60, sm: 70 },
                  px: { xs: 1, sm: 1.5 },
                  py: 0.5,
                  fontSize: { xs: "0.8rem", sm: "0.875rem" },
                  fontWeight: 500,
                  color: theme === "dark" ? "white" : "primary.main",
                  borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.23)" : "rgba(25, 118, 210, 0.5)",
                  "&:hover": {
                    borderColor: theme === "dark" ? "white" : "primary.main",
                    backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(25, 118, 210, 0.04)",
                  },
                  "&.Mui-disabled": {
                    cursor: "not-allowed",
                    pointerEvents: "all !important",
                    backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
                    borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.26)",
                    color: theme === "dark" ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.26)",
                  },
                }}
              >
                Next
              </Button>
            </Box>
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            width: "100%",
            backgroundColor: theme === "dark" ? "rgb(30, 41, 59)" : "#fff",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginTop: "250px",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
            <Typography sx={{ color: theme === "dark" ? "#fff" : "#333", fontWeight: 500, fontSize: "22px" }}>
              No Workloads Found
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme === "dark" ? "#94a3b8" : "#00000099",
                fontSize: "17px",
                mb: 2,
              }}
            >
              {filteredContext !== "all" 
                ? `No resources found for the ${filteredContext} context`
                : resources.length > 0 
                  ? "Resources are available but filtered out" 
                  : "Get started by creating your first workload"}
            </Typography>
            {resources.length > 0 && filteredResources.length === 0 && (
              <Typography
                variant="caption"
                sx={{
                  color: theme === "dark" ? "#90CAF9" : "#1976d2",
                  fontSize: "0.85rem",
                }}
              >
                {resources.length} total resources available, but none match the current filter
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ListViewComponent;