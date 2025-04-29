import { Box, Typography, TextField, CircularProgress, Checkbox, InputAdornment, Paper, Chip } from "@mui/material";
import { useState, useEffect } from "react";
import { AxiosError } from "axios";
import { toast } from "react-hot-toast";
import { api } from "../../../lib/api";
import { Package } from "./ArtifactHubTab";
import SearchIcon from "@mui/icons-material/Search";
import InfoIcon from "@mui/icons-material/Info";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";

interface Props {
  handlePackageSelection: (pkg: Package) => void;
  theme: string;
  selectedPackage: Package | null;
}

interface SearchResult {
  name: string;
  repository: {
    url: string;
    name: string;
    display_name?: string;
    kind: number;
  };
  version: string;
  description: string;
  app_version?: string;
}

export const SearchPackagesForm = ({
  handlePackageSelection,
  theme,
  selectedPackage,
}: Props) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search packages when debounced query changes
  useEffect(() => {
    const searchPackages = async () => {
      if (!debouncedQuery) {
        setPackages([]);
        return;
      }

      setLoading(true);
      try {
        const response = await api.post("/api/v1/artifact-hub/packages/search", {
          query: debouncedQuery,
          kind: "0", // 0 for Helm charts as string (matches API spec)
          offset: 0,
          limit: 10
        });

        if (response.status === 200) {
          // Transform the API response to match our Package interface
          const transformedPackages = (response.data.results || []).map((pkg: SearchResult) => ({
            name: pkg.name,
            repository: {
              url: pkg.repository.url,
              name: pkg.repository.name,
              display_name: pkg.repository.display_name,
              kind: pkg.repository.kind
            },
            version: pkg.version,
            description: pkg.description,
            app_version: pkg.app_version
          }));
          
          setPackages(transformedPackages);
          console.log("Search results:", response.data);
        } else {
          throw new Error("Failed to search packages");
        }
      } catch (error: unknown) {
        const err = error as AxiosError;
        console.error("Package Search error:", err);
        toast.error("Failed to search packages!");
      } finally {
        setLoading(false);
      }
    };

    searchPackages();
  }, [debouncedQuery]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, height: "100%" }}>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 600,
          fontSize: "20px",
          color: theme === "dark" ? "#d4d4d4" : "#333",
          mt: 1,
        }}
      >
        Search Artifact Hub Packages
      </Typography>

      <Box>
        <TextField
          fullWidth
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for Helm charts (e.g., nginx, mysql, prometheus)..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: theme === "dark" ? "#90caf9" : "#1976d2" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "12px",
              backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(25, 118, 210, 0.05)",
              "& fieldset": {
                borderColor: theme === "dark" ? "#444" : "#e0e0e0",
                borderWidth: "1px",
              },
              "&:hover fieldset": {
                borderColor: theme === "dark" ? "#90caf9" : "#1976d2",
              },
              "&.Mui-focused fieldset": {
                borderColor: theme === "dark" ? "#90caf9" : "#1976d2",
                borderWidth: "1px",
              },
            },
            "& .MuiInputBase-input": {
              padding: "14px 14px 14px 5px",
              fontSize: "0.95rem",
              color: theme === "dark" ? "#d4d4d4" : "#666",
            },
            "& .MuiInputBase-input::placeholder": {
              color: theme === "dark" ? "#858585" : "#666",
              opacity: 0.8,
            },
          }}
        />
        <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
          <span role="img" aria-label="tip" style={{ fontSize: "0.8rem", marginRight: "8px" }}>
            💡
          </span>
          <Typography variant="caption" sx={{ color: theme === "dark" ? "#858585" : "#666" }}>
            For best results, use specific chart names
          </Typography>
        </Box>
      </Box>

      {selectedPackage && selectedPackage.name && (
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            mb: 2,
            p: 2,
            borderRadius: "10px",
            border: "1px solid",
            borderColor: theme === "dark" ? "rgba(144, 202, 249, 0.3)" : "rgba(25, 118, 210, 0.3)",
            backgroundColor: theme === "dark" ? "rgba(25, 118, 210, 0.1)" : "rgba(25, 118, 210, 0.05)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <CheckCircleIcon sx={{ color: "#4caf50", mr: 1, fontSize: "1.2rem" }} />
              <Typography variant="body1" sx={{ color: theme === "dark" ? "#fff" : "#333", fontWeight: 500 }}>
                Selected Package
              </Typography>
            </Box>
            <Chip
              label="Change"
              size="small"
              deleteIcon={<CloseIcon />}
              onDelete={() => {
                handlePackageSelection({
                  name: "",
                  repository: { 
                    url: "", 
                    name: "" 
                  },
                  version: "",
                  description: ""
                });
              }}
              sx={{ 
                bgcolor: theme === "dark" ? "rgba(144, 202, 249, 0.2)" : "rgba(25, 118, 210, 0.1)",
                color: theme === "dark" ? "#90caf9" : "#1976d2",
                '& .MuiChip-deleteIcon': {
                  color: theme === "dark" ? "#90caf9" : "#1976d2",
                }
              }}
            />
          </Box>
          <Box>
            <Typography 
              variant="body2" 
              sx={{ 
                color: theme === "dark" ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.6)",
                mb: 0.5
              }}
            >
              <strong>Name:</strong> {selectedPackage.name}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: theme === "dark" ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.6)",
                mb: 0.5
              }}
            >
              <strong>Repository:</strong> {selectedPackage.repository.name}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: theme === "dark" ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.6)",
              }}
            >
              <strong>Version:</strong> {selectedPackage.version}
            </Typography>
          </Box>
        </Paper>
      )}

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          "&::-webkit-scrollbar": {
            display: "none",
          },
          scrollbarWidth: "none",
          "-ms-overflow-style": "none",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: 1, px: 1 }}>
          <InfoIcon sx={{ color: theme === "dark" ? "#90caf9" : "#1976d2", fontSize: "1rem", mr: 1 }} />
          <Typography variant="caption" sx={{ color: theme === "dark" ? "#90caf9" : "#1976d2" }}>
            Not all chart versions may be available. Try using an older or more stable version if deployment fails.
          </Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100px" }}>
            <CircularProgress size={32} sx={{ color: theme === "dark" ? "#90caf9" : "#1976d2" }} />
          </Box>
        ) : packages.length > 0 ? (
          packages.map((pkg) => (
            <Paper
              key={`${pkg.repository.name}/${pkg.name}`}
              elevation={0}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                padding: "16px",
                borderRadius: "10px",
                border: "1px solid",
                borderColor: selectedPackage?.name === pkg.name && selectedPackage?.repository.name === pkg.repository.name
                  ? theme === "dark" ? "rgba(144, 202, 249, 0.5)" : "rgba(25, 118, 210, 0.5)"
                  : theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                backgroundColor: selectedPackage?.name === pkg.name && selectedPackage?.repository.name === pkg.repository.name
                  ? theme === "dark" ? "rgba(25, 118, 210, 0.15)" : "rgba(25, 118, 210, 0.08)"
                  : theme === "dark" ? "rgba(255, 255, 255, 0.03)" : "#fff",
                "&:hover": {
                  backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.07)" : "rgba(25, 118, 210, 0.04)",
                  borderColor: theme === "dark" ? "rgba(144, 202, 249, 0.3)" : "rgba(25, 118, 210, 0.3)",
                },
                transition: "all 0.2s ease",
                cursor: "pointer",
              }}
              onClick={() => handlePackageSelection(pkg)}
            >
              <Checkbox
                checked={selectedPackage?.name === pkg.name && selectedPackage?.repository.name === pkg.repository.name}
                sx={{
                  color: theme === "dark" ? "#90caf9" : "#1976d2",
                  "&.Mui-checked": {
                    color: theme === "dark" ? "#90caf9" : "#1976d2",
                  },
                  p: 0,
                  mr: 2,
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                  <Typography
                    sx={{
                      fontSize: "1.1rem",
                      fontWeight: 600,
                      color: theme === "dark" ? "#d4d4d4" : "#333",
                      mr: 1,
                    }}
                  >
                    {pkg.name}
                  </Typography>
                  <Chip 
                    label={`v${pkg.version}`} 
                    size="small" 
                    sx={{ 
                      height: "20px", 
                      fontSize: "0.7rem",
                      backgroundColor: theme === "dark" ? "rgba(144, 202, 249, 0.2)" : "rgba(25, 118, 210, 0.1)",
                      color: theme === "dark" ? "#90caf9" : "#1976d2",
                    }} 
                  />
                </Box>
                
                <Typography
                  sx={{
                    fontSize: "0.85rem",
                    color: theme === "dark" ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.6)",
                    mb: 0.5,
                  }}
                >
                  Repository: <span style={{ fontWeight: 500 }}>{pkg.repository.name}</span>
                </Typography>
                
                <Typography
                  sx={{
                    fontSize: "0.85rem",
                    color: theme === "dark" ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.5)",
                    mt: 1,
                    display: "-webkit-box",
                    WebkitLineClamp: "2",
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    lineHeight: 1.4,
                  }}
                >
                  {pkg.description}
                </Typography>
              </Box>
            </Paper>
          ))
        ) : searchQuery ? (
          <Box sx={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center", 
            height: "150px",
            mt: 4
          }}>
            <Typography
              sx={{
                color: theme === "dark" ? "#858585" : "#666",
                fontWeight: 500,
                mb: 1,
              }}
            >
              No packages found
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme === "dark" ? "#aaa" : "#888",
                textAlign: "center",
              }}
            >
              Try a different search term or check your spelling
            </Typography>
          </Box>
        ) : (
          <Box sx={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center", 
            height: "150px",
            mt: 4
          }}>
            <SearchIcon sx={{ fontSize: "2rem", color: theme === "dark" ? "#666" : "#ccc", mb: 1 }} />
            <Typography
              sx={{
                color: theme === "dark" ? "#aaa" : "#888",
                textAlign: "center",
              }}
            >
              Enter a search query to find packages
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}; 