import { Box, Typography, TextField, CircularProgress, Paper, Chip, Avatar, List, ListItem, ListItemAvatar, ListItemText, IconButton, FormControl, Select, MenuItem, SelectChangeEvent } from "@mui/material";
import { useState, useEffect, useCallback } from "react";
import { AxiosError } from "axios";
import { api } from "../../../lib/api";
import { Package, ArtifactHubFormData } from "./ArtifactHubTab";
import SearchIcon from "@mui/icons-material/Search";
import InfoIcon from "@mui/icons-material/Info";
import ImageIcon from '@mui/icons-material/Image';
import StarIcon from '@mui/icons-material/Star';
import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import WorkloadLabelInput from "../WorkloadLabelInput";
// import { toast } from "react-hot-toast";

// Commented out as it's currently unused 
// interface ExtendedPackage extends Package {
//   logo_image_id?: string;
//   logo_url?: string;
//   stars?: number;
//   created_at?: number;
//   digest?: string;
//   home_url?: string;
//   content_url?: string;
//   repository: {
//     url: string;
//     name: string;
//     display_name?: string;
//     kind?: number;
//     organization_name?: string;
//     organization_display_name?: string;
//     verified_publisher?: boolean;
//     official?: boolean;
//   };
// }

interface Props {
  handlePackageSelection?: (pkg: Package) => void;
  theme: string;
  selectedPackage?: Package | null;
  formData?: ArtifactHubFormData;
  setFormData?: (data: ArtifactHubFormData) => void;
  onCancel?: () => void;
  onDeploy?: (data: ArtifactHubFormData) => void;
}

interface SearchResult {
  package_id: string;
  name: string;
  normalized_name: string;
  logo_image_id?: string;
  logo_url?: string;
  stars?: number;
  official?: boolean;
  verified_publisher?: boolean;
  repository: {
    url: string;
    name: string;
    display_name?: string;
    kind: number;
    organization_name?: string;
    organization_display_name?: string;
    verified_publisher?: boolean;
    official?: boolean;
  };
  version: string;
  app_version?: string;
  description: string;
  keywords?: string[];
  license?: string;
  deprecated?: boolean;
  signed?: boolean;
  security_report?: {
    summary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      unknown: number;
    }
  };
  containers_images?: ContainerImage[];
  ts?: number;
  created_at?: number;
  links?: Link[];
  maintainers?: Maintainer[];
  home_url?: string;
  content_url?: string;
  install_url?: string;
}

// Define types for previously untyped elements
interface ContainerImage {
  name: string;
  image: string;
  whitelisted?: boolean;
}

interface Link {
  name: string;
  url: string;
}

interface Maintainer {
  name: string;
  email: string;
}

interface SearchResponse {
  count: number;
  facets: {
    kinds: Array<{
      id: number;
      name: string;
    }>;
    licenses: string[];
    repositories: Array<{
      display_name: string;
      name: string;
      official: boolean;
      verified_publisher: boolean;
    }>;
  };
  message: string;
  results: SearchResult[];
}

export const SearchPackagesForm = ({
  theme,
  handlePackageSelection,
  formData,
  setFormData,
  // onCancel,
  // onDeploy
}: Props) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedPackageDetails, setSelectedPackageDetails] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  // const [deployLoading, setDeployLoading] = useState(false);
  const [error, setError] = useState("");

  // Function to search packages using the advanced-search endpoint
  const searchPackages = useCallback(async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a search term");
      return;
    }

    setLoading(true);
    setError("");
    setSearchResults([]);
    setSelectedPackageDetails(null);
    
    try {
      const response = await api.post('/api/v1/artifact-hub/packages/advanced-search', {
        query: searchQuery,
        kind: "0", // For Helm charts
        offset: 0,
        limit: 10
      });
      
      if (response.status === 200) {
        const data = response.data as SearchResponse;
        console.log("Search results:", data);
        
        if (data.results && data.results.length > 0) {
          setSearchResults(data.results);
        } else {
          setError(`No packages found for '${searchQuery}'`);
        }
      } else {
        throw new Error("Failed to search packages");
      }
    } catch (error: unknown) {
      const err = error as AxiosError;
      console.error("Package search error:", err);
      setError(`Search failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // Add debounce effect for searching as user types
  useEffect(() => {
    // Don't search if search query is empty
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setError("");
      return;
    }
    
    const debounceTimer = setTimeout(() => {
      searchPackages();
    }, 500); // 500ms debounce delay
    
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, searchPackages]);

  // Get package details for a selected package
  const fetchPackageDetails = async (packageId: string) => {
    // For now, just select from the search results
    const selectedPackage = searchResults.find(pkg => pkg.package_id === packageId);
    if (selectedPackage) {
      setSelectedPackageDetails(selectedPackage);
      
      // If parent provided handlePackageSelection, call it with the package data
      if (handlePackageSelection) {
        const packageData: Package = {
          name: selectedPackage.name,
          repository: selectedPackage.repository,
          version: selectedPackage.version,
          description: selectedPackage.description,
          app_version: selectedPackage.app_version,
          logo_image_id: selectedPackage.logo_image_id,
          logo_url: selectedPackage.logo_url,
          stars: selectedPackage.stars,
          created_at: selectedPackage.created_at,
          home_url: selectedPackage.home_url,
          content_url: selectedPackage.content_url,
        };
        handlePackageSelection(packageData);
      }
      
      // Update formData with selected package details
      if (setFormData && formData) {
        const chartPackageId = `helm/${selectedPackage.repository.name}/${selectedPackage.name}`;
        setFormData({
          ...formData,
          packageId: chartPackageId,
          version: selectedPackage.version, // Store this just for UI display
          releaseName: `my-${selectedPackage.name}-${Math.floor(Math.random() * 100)}`,
          namespace: "default",
          values: {
            "service.port": "80",
            "service.type": "LoadBalancer"
          }
        });
      }
    }
  };
  
  // Handle deployment of the selected package
  // const handleDeploy = async () => {
  //   if (!selectedPackageDetails || !formData || !setFormData) {
  //     toast.error("Please select a package first");
  //     return;
  //   }
    
  //   if (!formData.workloadLabel) {
  //     toast.error("Please enter a workload label");
  //     return;
  //   }
    
  //   setDeployLoading(true);
    
  //   try {
  //     if (onDeploy) {
  //       // Prepare the payload excluding version
  //       const deployPayload = {
  //         namespace: formData.namespace,
  //         packageId: formData.packageId,
  //         releaseName: formData.releaseName,
  //         values: formData.values,
  //         workloadLabel: formData.workloadLabel
  //       };
        
  //       onDeploy(deployPayload);
  //     } else {
  //       // Direct API call if onDeploy not provided
  //       const response = await api.post('/api/v1/artifact-hub/helm-deploy', {
  //         namespace: formData.namespace,
  //         packageId: formData.packageId,
  //         releaseName: formData.releaseName,
  //         values: formData.values,
  //         workloadLabel: formData.workloadLabel
  //       });
        
  //       if (response.status === 200) {
  //         toast.success("Chart deployed successfully!");
  //         setSelectedPackageDetails(null);
  //         setSearchResults([]);
  //         setSearchQuery("");
  //       } else {
  //         throw new Error("Failed to deploy chart");
  //       }
  //     }
  //   } catch (error: unknown) {
  //     const err = error as AxiosError;
  //     console.error("Chart deployment error:", err);
  //     toast.error(`Deployment failed: ${err.message}`);
  //   } finally {
  //     setDeployLoading(false);
  //   }
  // };

  // Handle service type change
  const handleServiceTypeChange = (event: SelectChangeEvent) => {
    if (formData && setFormData) {
      setFormData({
        ...formData,
        values: {
          ...formData.values,
          "service.type": event.target.value
        }
      });
    }
  };

  // Handle service port change
  const handleServicePortChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (formData && setFormData) {
      setFormData({
        ...formData,
        values: {
          ...formData.values,
          "service.port": event.target.value
        }
      });
    }
  };

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

      {/* Added WorkloadLabelInput component */}
      {setFormData && formData && (
        <Box sx={{ mb: 2 }}>
          <WorkloadLabelInput
            value={formData.workloadLabel || ""}
            handleChange={(e) => setFormData({ ...formData, workloadLabel: e.target.value })}
            theme={theme}
          />
        </Box>
      )}

      {!selectedPackageDetails && (
      <Box>
        <TextField
          label="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="e.g., nginx"
          size="small"
          fullWidth
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: theme === "dark" ? "#90caf9" : "#1976d2", mr: 1 }} />,
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "8px",
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
              padding: "10px 14px",
              fontSize: "0.875rem",
              color: theme === "dark" ? "#d4d4d4" : "#666",
            },
            "& .MuiInputLabel-root": {
              color: theme === "dark" ? "#90caf9" : "#1976d2",
              fontSize: "0.875rem",
            },
            "& .MuiInputLabel-root.Mui-focused": {
              color: theme === "dark" ? "#90caf9" : "#1976d2",
            },
          }}
        />
        
        <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
          <InfoIcon sx={{ color: theme === "dark" ? "#90caf9" : "#1976d2", fontSize: "1rem", mr: 1 }} />
          <Typography variant="caption" sx={{ color: theme === "dark" ? "#90caf9" : "#1976d2" }}>
            Start typing to search for Helm packages on Artifact Hub
          </Typography>
        </Box>
      </Box>
      )}

      {error && (
        <Box 
          sx={{ 
            backgroundColor: theme === "dark" ? "rgba(255, 87, 34, 0.1)" : "rgba(255, 87, 34, 0.05)", 
            padding: 2, 
            borderRadius: 1,
            border: `1px solid ${theme === "dark" ? "rgba(255, 87, 34, 0.3)" : "rgba(255, 87, 34, 0.2)"}`,
            color: theme === "dark" ? "#ff9800" : "#d84315"
          }}
        >
          <Typography variant="body2">{error}</Typography>
        </Box>
      )}

      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          "&::-webkit-scrollbar": {
            width: "0px", // Hide scrollbar while keeping functionality
            display: "none",
          },
          scrollbarWidth: "none", // Firefox
          msOverflowStyle: "none", // IE/Edge
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100px" }}>
            <CircularProgress size={32} sx={{ color: theme === "dark" ? "#90caf9" : "#1976d2" }} />
          </Box>
        ) : selectedPackageDetails ? (
          // Show detailed view of the selected package
          <Paper
            elevation={0}
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              p: 2,
              position: "relative",
              borderRadius: "10px",
              border: "1px solid",
              borderColor: theme === "dark" ? "rgba(144, 202, 249, 0.3)" : "rgba(25, 118, 210, 0.3)",
              backgroundColor: theme === "dark" ? "rgba(243, 246, 249, 0.05)" : "rgba(243, 246, 249, 0.5)",
            }}
          >
            {/* Close button */}
            <IconButton
              size="small"
              onClick={() => setSelectedPackageDetails(null)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: theme === "dark" ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.54)",
                "&:hover": {
                  backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.04)",
                }
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>

            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              {selectedPackageDetails.logo_url ? (
                <Avatar 
                  src={selectedPackageDetails.logo_url} 
                  alt={selectedPackageDetails.name}
                  sx={{ 
                    width: 64, 
                    height: 64, 
                    mr: 2,
                    bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)" 
                  }}
                />
              ) : (
                <Avatar 
                  sx={{ 
                    width: 64, 
                    height: 64, 
                    mr: 2,
                    bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)" 
                  }}
                >
                  <ImageIcon fontSize="large" />
                </Avatar>
              )}
              
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: theme === "dark" ? "#fff" : "#333",
                      fontWeight: 600,
                      mr: 1
                    }}
                  >
                    {selectedPackageDetails.name}
                  </Typography>
                  <Chip 
                    label={`v${selectedPackageDetails.version}`} 
                    size="small" 
                    sx={{ 
                      height: "22px",
                      fontSize: "0.75rem",
                      backgroundColor: theme === "dark" ? "rgba(144, 202, 249, 0.2)" : "rgba(25, 118, 210, 0.1)",
                      color: theme === "dark" ? "#90caf9" : "#1976d2",
                      mr: 1
                    }} 
                  />
                  {selectedPackageDetails.app_version && (
                    <Chip 
                      label={`App: ${selectedPackageDetails.app_version}`} 
                      size="small" 
                      sx={{ 
                        height: "22px",
                        fontSize: "0.75rem",
                        backgroundColor: theme === "dark" ? "rgba(76, 175, 80, 0.2)" : "rgba(76, 175, 80, 0.1)",
                        color: theme === "dark" ? "#81c784" : "#388e3c" 
                      }} 
                    />
                  )}
                </Box>

                {selectedPackageDetails.stars !== undefined && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <StarIcon sx={{ color: '#FFC107', fontSize: '0.875rem', mr: 0.5 }} />
                    <Typography variant="body2" sx={{ color: theme === "dark" ? '#ddd' : '#666' }}>
                      {selectedPackageDetails.stars} Stars
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: theme === "dark" ? '#ddd' : '#666',
                      fontWeight: 500,
                      mr: 1
                    }}
                  >
                    Repository:
                  </Typography>
                  <Chip 
                    label={selectedPackageDetails.repository.display_name || selectedPackageDetails.repository.name} 
                    size="small" 
                    sx={{ 
                      height: "20px",
                      fontSize: "0.75rem",
                      backgroundColor: theme === "dark" ? "rgba(156, 39, 176, 0.2)" : "rgba(156, 39, 176, 0.1)",
                      color: theme === "dark" ? "#ce93d8" : "#7b1fa2" 
                    }} 
                  />
                  {selectedPackageDetails.repository.verified_publisher && (
                    <Chip 
                      label="Verified" 
                      size="small" 
                      sx={{ 
                        height: "20px",
                        fontSize: "0.75rem",
                        ml: 1,
                        backgroundColor: theme === "dark" ? "rgba(0, 200, 83, 0.2)" : "rgba(0, 200, 83, 0.1)",
                        color: theme === "dark" ? "#69f0ae" : "#00c853" 
                      }} 
                    />
                  )}
                </Box>
              </Box>
            </Box>

            <Typography 
              variant="body2" 
              sx={{ 
                color: theme === "dark" ? '#ddd' : '#555',
                mt: 1,
                lineHeight: 1.5
              }}
            >
              {selectedPackageDetails.description}
            </Typography>

            {/* Service configuration section */}
            {formData && setFormData && (
              <Box 
                sx={{ 
                  mt: 3,
                  p: 3,
                  pt: 2,
                  pb: 3,
                  borderRadius: '8px',
                  backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(243, 246, 249, 0.8)",
                  border: '1px solid',
                  borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box 
                    sx={{ 
                      width: 24, 
                      height: 24, 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      backgroundColor: theme === "dark" ? "#1976d2" : "#1976d2",
                      color: 'white',
                      mr: 1.5
                    }}
                  >
                    <SettingsIcon sx={{ fontSize: "1rem" }} />
                  </Box>
                  <Typography variant="subtitle2" sx={{ color: theme === "dark" ? '#fff' : '#333', fontWeight: 600, fontSize: '0.95rem' }}>
                    Service Configuration
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 1 }}>
                  <Box sx={{ minWidth: 200 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: theme === "dark" ? '#bbb' : '#666',
                        mb: 0.5,
                        fontWeight: 500,
                        fontSize: '0.8rem'
                      }}
                    >
                      Service Type
                    </Typography>
                    <FormControl 
                      fullWidth
              size="small"
                      sx={{ 
                        "& .MuiOutlinedInput-root": {
                          backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "#fff",
                        }
                      }}
                    >
                      <Select
                        id="service-type"
                        value={formData.values["service.type"] || "LoadBalancer"}
                        onChange={handleServiceTypeChange}
                        displayEmpty
                        sx={{ 
                          borderRadius: '4px',
                          fontSize: '0.875rem'
                        }}
                      >
                        <MenuItem value="ClusterIP">ClusterIP</MenuItem>
                        <MenuItem value="NodePort">NodePort</MenuItem>
                        <MenuItem value="LoadBalancer">LoadBalancer</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  
                  <Box sx={{ minWidth: 150 }}>
                    <Typography 
                      variant="body2" 
              sx={{
                        color: theme === "dark" ? '#bbb' : '#666',
                        mb: 0.5,
                        fontWeight: 500,
                        fontSize: '0.8rem'
                      }}
                    >
                      Service Port
                    </Typography>
                    <TextField
                      value={formData.values["service.port"] || "80"}
                      onChange={handleServicePortChange}
                      size="small"
                      type="number"
                      fullWidth
                      InputProps={{
                        inputProps: { min: 1, max: 65535 }
                      }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "#fff",
                        }
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            )}
          </Paper>
        ) : searchResults.length > 0 ? (
          // Show search results list
          <List sx={{ 
            width: '100%',
            padding: 0,
          }}>
            {searchResults.map((result) => (
              <ListItem 
                key={result.package_id}
                onClick={() => fetchPackageDetails(result.package_id)}
                alignItems="flex-start"
                sx={{
                  borderRadius: '8px',
                  mb: 1.5,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '1px solid',
                  borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
                  '&:hover': {
                    backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
                    borderColor: theme === "dark" ? "rgba(144, 202, 249, 0.5)" : "rgba(25, 118, 210, 0.5)",
                  }
                }}
              >
                <ListItemAvatar>
                  {result.logo_url ? (
                    <Avatar 
                      src={result.logo_url} 
                      alt={result.name}
                      sx={{ 
                        width: 48, 
                        height: 48,
                        bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)" 
                      }}
                    />
                  ) : (
                    <Avatar 
                      sx={{ 
                        width: 48, 
                        height: 48,
                        bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)" 
                      }}
                    >
                      <ImageIcon />
                    </Avatar>
                  )}
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography 
                        sx={{ 
                          fontWeight: 600, 
                          color: theme === "dark" ? "#fff" : "#333",
                          mr: 1
                        }}
                      >
                        {result.name}
                      </Typography>
                      <Chip 
                        label={`v${result.version}`} 
                        size="small" 
                        sx={{ 
                          height: "20px",
                          fontSize: "0.75rem",
                          backgroundColor: theme === "dark" ? "rgba(144, 202, 249, 0.2)" : "rgba(25, 118, 210, 0.1)",
                          color: theme === "dark" ? "#90caf9" : "#1976d2",
                          mr: 1
                        }} 
                      />
                      {result.repository.verified_publisher && (
                        <Chip 
                          label="Verified" 
                          size="small" 
                          sx={{ 
                            height: "20px",
                            fontSize: "0.75rem",
                            backgroundColor: theme === "dark" ? "rgba(0, 200, 83, 0.2)" : "rgba(0, 200, 83, 0.1)",
                            color: theme === "dark" ? "#69f0ae" : "#00c853" 
                          }} 
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 0.5 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: theme === "dark" ? '#bbb' : '#666',
                          display: 'flex',
                          alignItems: 'center',
                          mb: 0.5
                        }}
                      >
                        <span style={{ 
                          display: 'inline-block', 
                          width: '60px',
                          color: theme === "dark" ? '#999' : '#777',
                          fontWeight: 500
                        }}>
                          Repo:
                        </span> 
                        {result.repository.display_name || result.repository.name}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: theme === "dark" ? '#bbb' : '#666',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {result.description}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        ) : null}
      </Box>
    </Box>
  );
}; 