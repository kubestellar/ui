import { Box, Typography, Button, CircularProgress } from "@mui/material";
import { useEffect, useState, useCallback, useRef } from "react";
import useTheme from "../stores/themeStore";
import LoadingFallback from "./LoadingFallback";
import { api } from "../lib/api";

// For better debugging
const DEBUG = true;

// Define the response interfaces
interface ResourceItem {
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
}

const ListViewComponent = () => {
  const theme = useTheme((state) => state.theme);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingMessage, setLoadingMessage] = useState<string>("Loading resources...");
  const [error, setError] = useState<string | null>(null);
  const resourcesRef = useRef<ResourceItem[]>([]);

  // Add pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  // Debug utility
  const logDebug = useCallback((message: string, data?: unknown) => {
    if (DEBUG) {
      console.log(`[ListViewComponent] ${message}`, data || '');
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let eventSource: EventSource | null = null;

    const processCompleteData = (data: CompleteEventData): ResourceItem[] => {
      logDebug("Processing complete event data", data);
      const resourceList: ResourceItem[] = [];
      
      // Process cluster-scoped resources
      if (data.clusterScoped) {
        Object.entries(data.clusterScoped).forEach(([kind, items]) => {
          if (!Array.isArray(items)) return;
          
          (items as ResourceItem[]).forEach((item: ResourceItem) => {
            const sourceUrl = `https://github.com/onkarr17/${item.name.toLowerCase()}-gitrepo.io/k8s`;
            resourceList.push({
              createdAt: item.createdAt,
              kind: item.kind || kind,
              name: item.name,
              namespace: item.namespace || "Cluster",
              project: "default",
              source: sourceUrl,
              destination: `in-cluster/${item.namespace || "default"}`,
            });
          });
        });
      }
      
      // Process namespaced resources
      if (data.namespaced) {
        Object.entries(data.namespaced).forEach(([namespace, resourcesByKind]) => {
          if (typeof resourcesByKind !== 'object' || resourcesByKind === null) return;
          
          Object.entries(resourcesByKind).forEach(([kind, items]) => {
            // Include namespace metadata resources
            if (kind === "__namespaceMetaData" && Array.isArray(items)) {
              (items as ResourceItem[]).forEach((item: ResourceItem) => {
                resourceList.push({
                  createdAt: item.createdAt,
                  kind: "Namespace",
                  name: item.name || namespace,
                  namespace: namespace,
                  project: "default",
                  source: `https://github.com/onkarr17/${namespace.toLowerCase()}-gitrepo.io/k8s`,
                  destination: `in-cluster/${namespace}`,
                });
              });
              return;
            }
            
            if (!Array.isArray(items)) return;
            
            (items as ResourceItem[]).forEach((item: ResourceItem) => {
              const sourceUrl = `https://github.com/onkarr17/${item.name.toLowerCase()}-gitrepo.io/k8s`;
              resourceList.push({
                createdAt: item.createdAt,
                kind: item.kind || kind,
                name: item.name,
                namespace: item.namespace || namespace,
                project: "default",
                source: sourceUrl,
                destination: `in-cluster/${item.namespace || namespace}`,
              });
            });
          });
        });
      }
      
      logDebug(`Processed ${resourceList.length} total resources from complete event`);
      return resourceList;
    };

    const fetchDataWithSSE = () => {
      setIsLoading(true);
      setLoadingMessage("Connecting to server...");
      setError(null);
      resourcesRef.current = [];

      const sseEndpoint = "/api/wds/list-sse";
      logDebug(`Connecting to SSE endpoint: ${sseEndpoint}`);

      try {
        // Create EventSource for SSE connection
        eventSource = new EventSource(`${process.env.VITE_BASE_URL || "http://localhost:4000"}${sseEndpoint}`);
        
        // Handle connection open
        eventSource.onopen = () => {
          if (isMounted) {
            logDebug("SSE connection opened successfully");
            setLoadingMessage("Receiving data...");
          }
        };

        // Handle progress events
        eventSource.addEventListener('progress', (event) => {
          if (!isMounted) return;
          
          try {
            const eventData: SSEData = JSON.parse(event.data);
            logDebug(`Received progress event with ${eventData.data.new.length} resources`, eventData);
            
            // Process new resources
            if (eventData.data && eventData.data.new) {
              eventData.data.new.forEach(item => {
                const sourceUrl = `https://github.com/onkarr17/${item.name.toLowerCase()}-gitrepo.io/k8s`;
                const resourceItem = {
                  createdAt: item.createdAt,
                  kind: item.kind,
                  name: item.name,
                  namespace: item.namespace || "Cluster",
                  project: "default",
                  source: sourceUrl,
                  destination: `in-cluster/${item.namespace || "default"}`,
                };
                resourcesRef.current.push(resourceItem);
              });
              
              // Update state with current resources
              setResources([...resourcesRef.current]);
              setTotalItems(resourcesRef.current.length);
              
              // Update progress based on count
              const progressPercent = Math.min(eventData.count * 10, 90); // Keep it under 90% until complete
              setLoadingProgress(progressPercent);
              setLoadingMessage(`Received ${resourcesRef.current.length} resources...`);
            }
          } catch (parseError) {
            logDebug("Error parsing progress event data", parseError);
            console.error("Progress event parse error:", parseError);
          }
        });

        // Handle complete event
        eventSource.addEventListener('complete', (event) => {
          if (!isMounted) return;
          
          try {
            logDebug("Received complete event", event.data);
            
            // Parse the complete event data
            const completeData = JSON.parse(event.data) as CompleteEventData;
            
            // Process the complete data which has the full dataset
            const allResources = processCompleteData(completeData);
            
            // If we have resources from the progress events but none in the complete event
            // (which would be unusual), keep the progress resources
            if (allResources.length === 0 && resourcesRef.current.length > 0) {
              logDebug("Complete event had no resources, using progress resources instead", {
                progressResourcesCount: resourcesRef.current.length
              });
              setResources([...resourcesRef.current]);
              setTotalItems(resourcesRef.current.length);
            } else {
              // Otherwise use the complete data
              logDebug(`Setting UI with ${allResources.length} resources from complete event`);
              setResources(allResources);
              setTotalItems(allResources.length);
              resourcesRef.current = allResources;
            }
            
            setLoadingProgress(100);
            setIsLoading(false);
            
            // Close the connection
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }
          } catch (parseError) {
            logDebug("Error parsing complete event data", parseError);
            console.error("Complete event parse error:", parseError);
            
            // If we failed to parse the complete event but have resources from progress,
            // just use those and don't show an error
            if (resourcesRef.current.length > 0) {
              logDebug(`Falling back to ${resourcesRef.current.length} resources from progress events`);
              setResources([...resourcesRef.current]);
              setTotalItems(resourcesRef.current.length);
              setIsLoading(false);
            } else {
              // If we have no resources at all, show an error
              setError("Failed to process resource data. Please try again.");
              setIsLoading(false);
            }
            
            // Close the connection
            if (eventSource) {
              eventSource.close();
              eventSource = null;
            }
          }
        });

        // Handle general messages
        eventSource.onmessage = (event) => {
          logDebug("Received generic message event", event.data);
        };

        // Handle errors
        eventSource.onerror = (err) => {
          logDebug("SSE connection error", err);
          console.error("SSE connection error:", err);
          
          if (isMounted) {
            // If we already have resources from progress events, just show those
            if (resourcesRef.current.length > 0) {
              logDebug(`Connection error but showing ${resourcesRef.current.length} resources from progress events`);
              setResources([...resourcesRef.current]);
              setTotalItems(resourcesRef.current.length);
              setIsLoading(false);
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
        logDebug("Failed to establish SSE connection, falling back to regular API", error);
        console.error("SSE connection establishment error:", error);
        fetchFallbackData();
      }
    };

    const fetchFallbackData = async () => {
      // Regular API fallback in case SSE doesn't work
      setLoadingMessage("Fetching resources (fallback method)...");
      
      try {
        const response = await api.get("/api/wds/list", { timeout: 15000 });
        
        if (!isMounted) return;
        
        // Process the fallback response
        if (response.data && response.data.data) {
          const processedResources = processCompleteData(response.data.data as CompleteEventData);
          setResources(processedResources);
          setTotalItems(processedResources.length);
          resourcesRef.current = processedResources;
          setIsLoading(false);
          logDebug(`Fetched ${processedResources.length} resources using fallback method`);
        } else {
          setError("Invalid response format from server");
          setIsLoading(false);
        }
      } catch (error: unknown) {
        console.error("Error fetching list data:", error);
        
        const errorMessage = "An unknown error occurred while fetching resources.";
        console.log(errorMessage)
        
        if (isMounted) {
          setError(errorMessage);
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
  }, [logDebug]);

  // Calculate pagination values
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = resources.slice(indexOfFirstItem, indexOfLastItem);

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
      {isLoading ? (
        <Box sx={{ 
          display: "flex", 
          flexDirection: "column",
          alignItems: "center", 
          justifyContent: "center", 
          height: "70vh" 
        }}>
          <LoadingFallback message={loadingMessage} size="medium" />
          <CircularProgress 
            variant="determinate" 
            value={loadingProgress} 
            size={60} 
            sx={{ mt: 4, mb: 2 }} 
          />
          <Typography variant="body2" sx={{ color: theme === "dark" ? "#A5ADBA" : "#6B7280" }}>
            {loadingProgress}% complete
          </Typography>
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
          {DEBUG && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                console.log("Debugging info:", {
                  currentEnvironment: {
                    origin: window.location.origin,
                    apiEndpoint: "http://localhost:4000/api/wds/list-sse"
                  },
                  errorDetails: error
                });
              }}
              sx={{ mt: 1 }}
            >
              Log Debug Info
            </Button>
          )}
        </Box>
      ) : resources.length > 0 ? (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box
            sx={{
              width: "100%",
              flex: 1,
              overflow: "auto",
              padding: 2,
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
            
                <Box
                  sx={{
                    marginRight: 2,
                    display: { xs: "flex", md: "block" },
                    alignItems: "center",
                    mb: { xs: 1, md: 0 },
                  }}
                >
                  <Typography sx={{ color: "#4498FF", fontSize: 18 }}>★</Typography>

               
                  <Typography
                    sx={{
                      color: theme === "dark" ? "#fff" : "#6B7280",
                      ml: 1,
                      display: { xs: "block", md: "none" },
                      fontWeight: 500,
                    }}
                  >
                    {resource.name}
                  </Typography>
                </Box>

            
                <Box
                  sx={{
                    flexGrow: 1,
                    minWidth: 0,
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    gap: { xs: 1, md: 2 },
                    width: "100%",
                  }}
                >
            
                  <Box
                    sx={{
                      width: { xs: "100%", md: "25%" },
                      mb: { xs: 1, md: 0 },
                    }}
                  >
                    <Typography sx={{ color: theme === "dark" ? "#fff" : "#6B7280" }}>
                      Project: {resource.project}
                    </Typography>
                    <Typography
                      sx={{
                        color: theme === "dark" ? "#A5ADBA" : "#6B7280",
                        display: { xs: "none", md: "block" },
                      }}
                    >
                      Name: {resource.name}
                    </Typography>
                  </Box>

                
                  <Box
                    sx={{
                      width: { xs: "100%", md: "45%" },
                      mb: { xs: 1, md: 0 },
                    }}
                  >
                    <Typography
                      sx={{
                        color: theme === "dark" ? "#A5ADBA" : "#6B7280",
                        wordBreak: "break-all",
                        fontSize: { xs: "0.875rem", md: "inherit" },
                      }}
                    >
                      Source: {resource.source}
                    </Typography>
                    <Typography
                      sx={{
                        color: theme === "dark" ? "#A5ADBA" : "#6B7280",
                        fontSize: { xs: "0.875rem", md: "inherit" },
                      }}
                    >
                      Destination: {resource.destination}
                    </Typography>
                  </Box>

               
                  <Box sx={{ width: { xs: "100%", md: "30%" } }}>
                    <Typography sx={{ color: theme === "dark" ? "#A5ADBA" : "#6B7280" }}>
                      Kind: {resource.kind}
                    </Typography>
                    <Typography sx={{ color: theme === "dark" ? "#A5ADBA" : "#6B7280" }}>
                      Created At: {resource.createdAt}
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
              mt: 2, 
              mb: { xs: 6, sm: 4 }, 
              borderTop: theme === "dark" ? "1px solid #334155" : "1px solid #e5e7eb",
              backgroundColor: theme === "dark" ? "rgba(30, 41, 59, 0.8)" : "rgba(248, 250, 252, 0.9)", 
              borderRadius: "0 0 8px 8px",
              position: "relative",
              zIndex: 2,
              boxShadow: theme === "dark" ? "0 -2px 6px rgba(0,0,0,0.2)" : "0 -2px 6px rgba(0,0,0,0.1)",
            }}
          >
          
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
            </Typography>

         
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
              Get started by creating your first workload
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ListViewComponent;