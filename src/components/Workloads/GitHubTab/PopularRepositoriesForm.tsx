import React from 'react';
import { Box, Typography, Checkbox } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface Props {
  onSelect: (repoData: { url: string; path: string }) => void;
  theme: string;
}

const PopularRepositoriesForm = ({ onSelect, theme }: Props) => {
  const [selectedRepo, setSelectedRepo] = React.useState<string | null>(null);
  
  // Example repositories
  const popularRepositories = [
    { 
      repo_url: "https://github.com/kubernetes/examples",
      folder_path: "guestbook",
    },
    { 
      repo_url: "https://github.com/GoogleCloudPlatform/microservices-demo",
      folder_path: "kubernetes-manifests",
    },
    { 
      repo_url: "https://github.com/prometheus-operator/kube-prometheus",
      folder_path: "manifests",
    },
    { 
      repo_url: "https://github.com/argoproj/argocd-example-apps",
      folder_path: "guestbook",
    }
  ];

  const extractRepoName = (repoUrl: string) => {
    // Extract the repo name from GitHub URL
    const parts = repoUrl.split('/');
    return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
  };

  const handleRepoSelection = (repoUrl: string) => {
    if (selectedRepo === repoUrl) {
      setSelectedRepo(null);
    } else {
      setSelectedRepo(repoUrl);
      const selectedRepoData = popularRepositories.find(repo => repo.repo_url === repoUrl);
      if (selectedRepoData) {
        onSelect({ 
          url: selectedRepoData.repo_url, 
          path: selectedRepoData.folder_path 
        });
      }
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
      }}
    >
      {selectedRepo && (
        <Box
          sx={{
            width: "100%",
            margin: "0 0 16px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 1.5,
            borderRadius: "4px",
            border: "1px solid",
            borderColor: theme === "dark" ? "#444" : "#e0e0e0",
            backgroundColor: theme === "dark" ? "#1e1e1e" : "#f8f8f8",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <CheckCircleIcon color="success" sx={{ mr: 1 }} />
            <Typography variant="body1" sx={{ color: theme === "dark" ? "#fff" : "#333" }}>
              <strong>{extractRepoName(selectedRepo)}</strong>
            </Typography>
          </Box>
        </Box>
      )}

      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          overflowY: "auto",
        }}
      >
        {popularRepositories.map((repo) => (
          <Box
            key={repo.repo_url}
            sx={{
              display: "flex",
              alignItems: "center",
              padding: "10px",
              borderRadius: "6px",
              backgroundColor: theme === "dark" ? "#2a2a2a" : "#f5f5f5",
              "&:hover": {
                backgroundColor: theme === "dark" ? "#333" : "#eaeaea",
                cursor: "pointer",
              },
              border: "1px solid",
              borderColor: theme === "dark" ? "#444" : "#e0e0e0",
            }}
            onClick={() => handleRepoSelection(repo.repo_url)}
          >
            <Checkbox
              checked={selectedRepo === repo.repo_url}
              onChange={() => {}}
              sx={{
                color: theme === "dark" ? "#aaa" : "#666",
                "&.Mui-checked": {
                  color: theme === "dark" ? "#90caf9" : "#1976d2",
                },
              }}
            />
            <Box sx={{ ml: 1 }}>
              <Typography
                sx={{
                  fontSize: "0.95rem",
                  fontWeight: 500,
                  color: theme === "dark" ? "#d4d4d4" : "#333",
                }}
              >
                {extractRepoName(repo.repo_url)}
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.8rem",
                  color: theme === "dark" ? "#aaa" : "#666",
                }}
              >
                Path: {repo.folder_path}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default PopularRepositoriesForm; 