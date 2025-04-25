import { Box, Typography, Button } from "@mui/material";
import { useEffect, useState, useCallback } from "react";
import useTheme from "../stores/themeStore";
import LoadingFallback from "./LoadingFallback";
import { api } from "../lib/api";

// Define the API response interface
interface ApiResponse {
  data: {
    clusterScoped: {
      [key: string]: ResourceItem[];
    };
    namespaced: {
      [namespace: string]: {
        [kind: string]: ResourceItem[] | { __namespaceMetaData: ResourceItem[] };
      };
    };
  };
}

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

const ListViewComponent = () => {
  const theme = useTheme((state) => state.theme);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Add pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);
  const [totalItems, setTotalItems] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true); // Set loading state when starting the fetch
      try {
        const response = await api.get<ApiResponse>("/api/wds/list");
        const data = response.data.data;

        const resourceList: ResourceItem[] = [];

        // Process cluster-scoped resources with type assertion
        (Object.entries(data.clusterScoped) as [string, ResourceItem[]][]).forEach(([kind, items]) => {
          console.log(kind);
          items.forEach((item) => {
            resourceList.push({
              createdAt: item.createdAt,
              kind: item.kind,
              name: item.name,
              namespace: item.namespace || "Cluster",
              project: "default", // Default project based on backend
              source: `https://github.com/onkarr17/${item.name.toLowerCase()}-gitrepo.io/k8s`, // Example source URL
              destination: `in-cluster/${item.namespace || "default"}`,
            });
          });
        });

        // Process namespaced resources with type assertion
        Object.entries(data.namespaced).forEach(([namespace, resourcesByKind]) => {
          console.log(namespace);
          (Object.entries(resourcesByKind) as [string, ResourceItem[]][]).forEach(([kind, items]) => {
            if (kind !== "__namespaceMetaData") {
              items.forEach((item) => {
                resourceList.push({
                  createdAt: item.createdAt,
                  kind: item.kind,
                  name: item.name,
                  namespace: item.namespace,
                  project: "default", // Default project based on backend
                  source: `https://github.com/onkarr17/${item.name.toLowerCase()}-gitrepo.io/k8s`, // Example source URL
                  destination: `in-cluster/${item.namespace}`,
                });
              });
            }
          });
        });

        if (isMounted) {
          setResources(resourceList);
          setTotalItems(resourceList.length); 
        }
      } catch (error) {
        console.error("Error fetching list data:", error);
        if (isMounted) {
          setResources([]);
          setTotalItems(0);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false); // Clear loading state after fetch completes
        }
      }
    };

    fetchData();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, []);

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
        <LoadingFallback message="Loading the List-View" size="medium" />
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