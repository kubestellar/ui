import { Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import axios from "axios";
import useTheme from "../stores/themeStore";
import LoadingFallback from "./LoadingFallback";

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

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true); // Set loading state when starting the fetch
      try {
        const response = await axios.get<ApiResponse>("http://localhost:4000/api/wds/list");
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
        }
      } catch (error) {
        console.error("Error fetching list data:", error);
        if (isMounted) {
          setResources([]); // Set empty array on error to show "No resources found"
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
        <Box
          sx={{
            width: "100%",
            height: "100%",
            overflow: "auto",
            padding: 2,
          }}
        >
          {resources.map((resource, index) => (
            <Box
              key={index}
              sx={{
                display: "flex",
                alignItems: "center",
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
              <Box sx={{ marginRight: 2 }}>
                <Typography sx={{ color: "#4498FF", fontSize: 18 }}>★</Typography>
              </Box>
              <Box sx={{ flexGrow: 1, minWidth: 0, display: "flex", gap: 2 }}>
                <Box sx={{ width: 400 }}>
                  <Typography sx={{ color: theme === "dark" ? "#fff" : "#6B7280" }}>
                    Project: {resource.project}
                  </Typography>
                  <Typography sx={{ color: theme === "dark" ? "#A5ADBA" : "#6B7280" }}>
                    Name: {resource.name}
                  </Typography>
                </Box>
                <Box sx={{ width: 600 }}>
                  <Typography sx={{ color: theme === "dark" ? "#A5ADBA" : "#6B7280", wordBreak: "break-all" }}>
                    Source: {resource.source}
                  </Typography>
                  <Typography sx={{ color: theme === "dark" ? "#A5ADBA" : "#6B7280" }}>
                    Destination: {resource.destination}
                  </Typography>
                </Box>
                <Box sx={{ width: 400 }}>
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