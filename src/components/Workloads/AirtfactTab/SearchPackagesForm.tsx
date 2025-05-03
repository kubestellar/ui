import { Box, Typography, TextField, CircularProgress, Paper, Chip, Avatar, Button } from "@mui/material";
import { useState } from "react";
import { AxiosError } from "axios";
import { api } from "../../../lib/api";
import { Package } from "./ArtifactHubTab";
import SearchIcon from "@mui/icons-material/Search";
import InfoIcon from "@mui/icons-material/Info";
import ImageIcon from '@mui/icons-material/Image';
import LinkIcon from '@mui/icons-material/Link';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import StarIcon from '@mui/icons-material/Star';

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
}

interface SearchResult {
  name: string;
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
  description: string;
  app_version?: string;
  logo_image_id?: string;
  logo_url?: string;
  stars?: number;
  created_at?: number;
  digest?: string;
  home_url?: string;
  content_url?: string;
}

interface AdvancedPackageDetails extends SearchResult {
  package_id: string;
  normalized_name: string;
  keywords?: string[];
  deprecated?: boolean;
  signed?: boolean;
  links?: Array<{name: string, url: string}>;
  maintainers?: Array<{name: string, email: string}>;
  containers_images?: Array<{name: string, image: string}>;
}

export const SearchPackagesForm = ({
  theme,
}: Props) => {
  const [repoName, setRepoName] = useState("bitnami"); // Default to bitnami as it's common
  const [packageName, setPackageName] = useState("");
  const [packageDetails, setPackageDetails] = useState<AdvancedPackageDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Function to get package details using the advanced-details endpoint
  const fetchPackageDetails = async () => {
    if (!packageName) {
      setError("Please enter a package name");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const response = await api.get(`/api/v1/artifact-hub/packages/helm/${repoName}/${packageName}/advanced-details`);
      
      if (response.status === 200) {
        const data = response.data;
        console.log("Package details:", data);
        
        // Store the full package details for display
        if (data.package) {
          setPackageDetails(data.package);
        } else {
          throw new Error("Package details not found in response");
        }
      } else {
        throw new Error("Failed to fetch package details");
      }
    } catch (error: unknown) {
      const err = error as AxiosError;
      console.error("Package details error:", err);
      setPackageDetails(null);
      setError(`No package found for '${packageName}' in the '${repoName}' repository`);
    } finally {
      setLoading(false);
    }
  };

  // Handle search form submission
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchPackageDetails();
  };

  // Format timestamp to readable date
  const formatDate = (timestamp: number | undefined): string => {
    if (!timestamp) return "N/A";
    return new Date(timestamp * 1000).toLocaleDateString();
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

      <Box component="form" onSubmit={handleSearch}>
        <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
          <TextField
            label="Repository"
            value={repoName}
            onChange={(e) => setRepoName(e.target.value)}
            placeholder="e.g., bitnami"
            size="small"
            sx={{
              width: "30%",
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
          <TextField
            label="Package Name"
            value={packageName}
            onChange={(e) => setPackageName(e.target.value)}
            placeholder="e.g., nginx"
            size="small"
            fullWidth
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
          <Button 
            variant="contained"
            onClick={() => handleSearch()}
            disabled={loading || !packageName}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              backgroundColor: theme === "dark" ? "#1976d2" : "#1976d2",
              color: "#fff",
              padding: "8px 16px",
              height: "40px",
              "&:hover": {
                backgroundColor: theme === "dark" ? "#1565c0" : "#1565c0",
              },
              "&.Mui-disabled": {
                backgroundColor: theme === "dark" ? "rgba(25, 118, 210, 0.3)" : "rgba(25, 118, 210, 0.3)",
                color: "rgba(255, 255, 255, 0.6)",
              },
            }}
          >
            Search
          </Button>
        </Box>
        
        <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
          <InfoIcon sx={{ color: theme === "dark" ? "#90caf9" : "#1976d2", fontSize: "1rem", mr: 1 }} />
          <Typography variant="caption" sx={{ color: theme === "dark" ? "#90caf9" : "#1976d2" }}>
            Enter a package name and repository to fetch detailed information
          </Typography>
        </Box>
      </Box>

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
            display: "none",
          },
          scrollbarWidth: "none",
          "-ms-overflow-style": "none",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100px" }}>
            <CircularProgress size={32} sx={{ color: theme === "dark" ? "#90caf9" : "#1976d2" }} />
          </Box>
        ) : packageDetails ? (
          <Paper
            elevation={0}
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              p: 2,
              borderRadius: "10px",
              border: "1px solid",
              borderColor: theme === "dark" ? "rgba(144, 202, 249, 0.3)" : "rgba(25, 118, 210, 0.3)",
              backgroundColor: theme === "dark" ? "rgba(25, 118, 210, 0.1)" : "rgba(25, 118, 210, 0.05)",
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              {packageDetails.logo_url || packageDetails.logo_image_id ? (
                <Avatar 
                  src={packageDetails.logo_url} 
                  alt={packageDetails.name}
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
                    {packageDetails.name}
                  </Typography>
                  <Chip 
                    label={`v${packageDetails.version}`} 
                    size="small" 
                    sx={{ 
                      height: "22px",
                      fontSize: "0.75rem",
                      backgroundColor: theme === "dark" ? "rgba(144, 202, 249, 0.2)" : "rgba(25, 118, 210, 0.1)",
                      color: theme === "dark" ? "#90caf9" : "#1976d2",
                      mr: 1
                    }} 
                  />
                  {packageDetails.app_version && (
                    <Chip 
                      label={`App v${packageDetails.app_version}`} 
                      size="small" 
                      sx={{ 
                        height: "22px",
                        fontSize: "0.75rem",
                        backgroundColor: theme === "dark" ? "rgba(129, 199, 132, 0.2)" : "rgba(76, 175, 80, 0.1)",
                        color: theme === "dark" ? "#81c784" : "#4caf50" 
                      }} 
                    />
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: theme === "dark" ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.6)",
                      }}
                    >
                      <strong>Repository:</strong> {packageDetails.repository?.display_name || packageDetails.repository.name}
                    </Typography>
                    {packageDetails.repository?.verified_publisher && (
                      <Chip 
                        label="Verified" 
                        size="small" 
                        sx={{ 
                          ml: 1,
                          height: "18px",
                          fontSize: "0.65rem",
                          backgroundColor: theme === "dark" ? "rgba(76, 175, 80, 0.2)" : "rgba(76, 175, 80, 0.1)",
                          color: theme === "dark" ? "#81c784" : "#4caf50" 
                        }} 
                      />
                    )}
                  </Box>
                  
                  {packageDetails.stars !== undefined && packageDetails.stars > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <StarIcon sx={{ fontSize: '0.9rem', mr: 0.5, color: '#ffc107' }} />
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: theme === "dark" ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.6)",
                        }}
                      >
                        {packageDetails.stars}
                      </Typography>
                    </Box>
                  )}
                </Box>
                
                {packageDetails.created_at && packageDetails.created_at > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CalendarTodayIcon sx={{ fontSize: '0.9rem', mr: 0.5, color: theme === "dark" ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)' }} />
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: theme === "dark" ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.5)",
                      }}
                    >
                      Created: {formatDate(packageDetails.created_at)}
                    </Typography>
                  </Box>
                )}
                
                {packageDetails.home_url && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LinkIcon sx={{ fontSize: '0.9rem', mr: 0.5, color: theme === "dark" ? '#90caf9' : '#1976d2' }} />
                    <Typography 
                      variant="body2" 
                      component="a"
                      href={packageDetails.home_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ 
                        color: theme === "dark" ? "#90caf9" : "#1976d2",
                        textDecoration: 'none',
                        '&:hover': {
                          textDecoration: 'underline'
                        }
                      }}
                    >
                      {packageDetails.home_url}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
            
            {packageDetails.description && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 500, color: theme === "dark" ? "#d4d4d4" : "#333", mb: 0.5 }}>
                  Description
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: theme === "dark" ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.5)",
                    lineHeight: 1.5,
                  }}
                >
                  {packageDetails.description}
                </Typography>
              </Box>
            )}
            
            {packageDetails.keywords && packageDetails.keywords.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: theme === "dark" ? "#d4d4d4" : "#333", mb: 0.5 }}>
                  Keywords
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {packageDetails.keywords.map(keyword => (
                    <Chip 
                      key={keyword}
                      label={keyword} 
                      size="small" 
                      sx={{ 
                        height: "22px",
                        fontSize: "0.75rem",
                        backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.07)" : "rgba(0, 0, 0, 0.05)",
                        color: theme === "dark" ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.7)",
                      }} 
                    />
                  ))}
                </Box>
              </Box>
            )}
            
            {packageDetails.links && packageDetails.links.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: theme === "dark" ? "#d4d4d4" : "#333", mb: 0.5 }}>
                  Links
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {packageDetails.links.map(link => (
                    <Box key={link.url} sx={{ display: 'flex', alignItems: 'center' }}>
                      <LinkIcon sx={{ fontSize: '0.9rem', mr: 0.5, color: theme === "dark" ? '#90caf9' : '#1976d2' }} />
                      <Typography 
                        variant="body2" 
                        component="a"
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ 
                          color: theme === "dark" ? "#90caf9" : "#1976d2",
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline'
                          }
                        }}
                      >
                        {link.name}: {link.url}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Paper>
        ) : !error && !loading ? (
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
              Enter a package name and repository to search
            </Typography>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}; 