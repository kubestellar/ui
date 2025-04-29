import { Box, Typography, CircularProgress, Chip, Paper, Grid, Avatar } from "@mui/material";
import { Repository } from "./ArtifactHubTab";
import VerifiedIcon from '@mui/icons-material/Verified';
import StorageIcon from '@mui/icons-material/Storage';
import LanguageIcon from '@mui/icons-material/Language';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';

interface Props {
  repositories: Repository[];
  loading: boolean;
  theme: string;
}

export const RepositoriesListForm = ({
  repositories,
  loading,
  theme,
}: Props) => {
  // Helper function to get repository icon based on name
  const getRepositoryIcon = (repoName: string) => {
    const name = repoName.toLowerCase();
    if (name.includes('bitnami')) return '🚀';
    if (name.includes('helm')) return '⎈';
    if (name.includes('kubernetes') || name.includes('k8s')) return '☸️';
    if (name.includes('prometheus')) return '📊';
    if (name.includes('grafana')) return '📈';
    if (name.includes('istio')) return '🔄';
    return '📦';
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
        Available Repositories
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", mt: -1, mb: 1 }}>
        <span role="img" aria-label="tip" style={{ fontSize: "0.8rem", marginRight: "8px" }}>
          💡
        </span>
        <Typography variant="caption" sx={{ color: theme === "dark" ? "#858585" : "#666" }}>
          Repositories are sources for Helm charts, click on a card to see more details
        </Typography>
      </Box>

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
          <Box sx={{ 
            display: "flex", 
            flexDirection: "column",
            justifyContent: "center", 
            alignItems: "center", 
            height: "200px" 
          }}>
            <CircularProgress size={36} sx={{ color: theme === "dark" ? "#90caf9" : "#1976d2", mb: 2 }} />
            <Typography variant="body2" sx={{ color: theme === "dark" ? "#aaa" : "#666" }}>
              Loading repositories...
            </Typography>
          </Box>
        ) : repositories.length > 0 ? (
          <Grid container spacing={2}>
            {repositories.map((repo) => (
              <Grid item xs={12} key={repo.name}>
                <Paper
                  elevation={0}
                  sx={{
                    display: "flex",
                    padding: "16px",
                    borderRadius: "10px",
                    border: "1px solid",
                    borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                    backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.03)" : "#fff",
                    "&:hover": {
                      backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.07)" : "rgba(25, 118, 210, 0.04)",
                      borderColor: theme === "dark" ? "rgba(144, 202, 249, 0.3)" : "rgba(25, 118, 210, 0.3)",
                    },
                    transition: "all 0.2s ease",
                    opacity: repo.disabled ? 0.7 : 1,
                  }}
                >
                  <Box sx={{ mr: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Avatar
                      sx={{ 
                        width: 48, 
                        height: 48, 
                        bgcolor: theme === "dark" ? "rgba(25, 118, 210, 0.2)" : "rgba(25, 118, 210, 0.1)",
                        color: theme === "dark" ? "#90caf9" : "#1976d2",
                        fontWeight: "bold",
                        fontSize: "1.2rem"
                      }}
                    >
                      {getRepositoryIcon(repo.name)}
                    </Avatar>
                  </Box>
                  
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            fontSize: "1.1rem",
                            color: theme === "dark" ? "#d4d4d4" : "#333",
                            mr: 1,
                          }}
                        >
                          {repo.display_name || repo.name}
                        </Typography>
                        {repo.verified_publisher && (
                          <VerifiedIcon 
                            sx={{ 
                              color: theme === "dark" ? "#4caf50" : "#2e7d32",
                              fontSize: "1.2rem",
                              ml: 0.5,
                            }} 
                          />
                        )}
                      </Box>
                      
                      <Box sx={{ display: "flex", gap: 1 }}>
                        {repo.official && (
                          <Chip 
                            label="Official" 
                            size="small"
                            color="primary"
                            sx={{ 
                              height: "24px",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              backgroundColor: theme === "dark" ? "rgba(25, 118, 210, 0.7)" : "#1976d2",
                            }}
                          />
                        )}
                        <Chip 
                          label={repo.kind === 0 ? "Helm" : "Other"} 
                          size="small"
                          variant="outlined"
                          sx={{ 
                            height: "24px",
                            fontSize: "0.75rem",
                            borderColor: theme === "dark" ? "rgba(144, 202, 249, 0.3)" : "rgba(25, 118, 210, 0.3)",
                            color: theme === "dark" ? "#90caf9" : "#1976d2",
                          }}
                        />
                      </Box>
                    </Box>
                    
                    <Grid container spacing={1} sx={{ mt: 0.5 }}>
                      {(repo.organization_display_name || repo.organization_name) && (
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <BusinessIcon sx={{ 
                              fontSize: "0.9rem", 
                              color: theme === "dark" ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)",
                              mr: 0.5 
                            }} />
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: "0.85rem",
                                color: theme === "dark" ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.6)",
                              }}
                            >
                              <strong>Organization:</strong> {repo.organization_display_name || repo.organization_name}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                      
                      {repo.user_alias && (
                        <Grid item xs={12} sm={6}>
                          <Box sx={{ display: "flex", alignItems: "center" }}>
                            <PersonIcon sx={{ 
                              fontSize: "0.9rem", 
                              color: theme === "dark" ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)",
                              mr: 0.5 
                            }} />
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: "0.85rem",
                                color: theme === "dark" ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.6)",
                              }}
                            >
                              <strong>User:</strong> {repo.user_alias}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                      
                      <Grid item xs={12}>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <LanguageIcon sx={{ 
                            fontSize: "0.9rem", 
                            color: theme === "dark" ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)",
                            mr: 0.5 
                          }} />
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: "0.85rem",
                              color: theme === "dark" ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.6)",
                              wordBreak: "break-word",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            <strong>URL:</strong> {repo.url}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ 
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center", 
            justifyContent: "center", 
            height: "200px",
            mt: 4
          }}>
            <StorageIcon sx={{ fontSize: "2.5rem", color: theme === "dark" ? "#666" : "#ccc", mb: 2 }} />
            <Typography
              sx={{
                color: theme === "dark" ? "#aaa" : "#888",
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              No repositories available
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}; 