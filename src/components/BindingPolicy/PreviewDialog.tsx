import React, { useContext } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  Chip,
} from "@mui/material";
import { ManagedCluster, Workload } from "../../types/bindingPolicy";
import { ThemeContext } from "../../context/ThemeContext";

interface PreviewDialogProps {
  open: boolean;
  onClose: () => void;
  matchedClusters: ManagedCluster[];
  matchedWorkloads: Workload[];
}

const PreviewDialog: React.FC<PreviewDialogProps> = ({
  open,
  onClose,
  matchedClusters,
  matchedWorkloads,
}) => {
  const { theme } = useContext(ThemeContext);
  const isDarkMode = theme === "dark";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{
        "& .MuiPaper-root": {
          backgroundColor: isDarkMode ? "#1e293b" : "#ffffff", // white background for light mode
          color: isDarkMode ? "white" : "black", // black text for light mode
        },
      }}
    >
      <DialogTitle sx={{ color: isDarkMode ? "white" : "black" }}>
        Preview Matches
      </DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 2,
            mt: 2,
          }}
        >
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: isDarkMode ? "white" : "black" }}>
              Matched Clusters
            </Typography>
            {matchedClusters.map((cluster) => (
              <Paper
                key={cluster.name}
                sx={{
                  p: 2,
                  mb: 1,
                  backgroundColor: isDarkMode ? "#334155" : "#ffffff", // white background for light mode
                  color: isDarkMode ? "white" : "black", // black text for light mode
                }}
              >
                <Typography variant="subtitle1" sx={{ color: isDarkMode ? "white" : "black" }}>
                  {cluster.name}
                </Typography>
                <Box
                  sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 1 }}
                >
                  {Object.entries(cluster.labels).map(([key, value]) => (
                    <Chip
                      key={key}
                      label={`${key}=${value}`}
                      size="small"
                      sx={{
                        backgroundColor: isDarkMode ? "#475569" : "#e3f2fd", // light blue in light mode
                        color: isDarkMode ? "white" : "black", // black text in light mode
                      }}
                    />
                  ))}
                </Box>
              </Paper>
            ))}
          </Box>
          <Box>
            <Typography variant="h6" gutterBottom sx={{ color: isDarkMode ? "white" : "black" }}>
              Matched Workloads
            </Typography>
            {matchedWorkloads.map((workload) => (
              <Paper
                key={workload.name}
                sx={{
                  p: 2,
                  mb: 1,
                  backgroundColor: isDarkMode ? "#334155" : "#ffffff", // white background for light mode
                  color: isDarkMode ? "white" : "black", // black text for light mode
                }}
              >
                <Typography variant="subtitle1" sx={{ color: isDarkMode ? "white" : "black" }}>
                  {workload.name}
                </Typography>
                <Box
                  sx={{ display: "lex", gap: 0.5, flexWrap: "wrap", mt: 1 }}
                >
                  {Object.entries(workload.labels).map(([key, value]) => (
                    <Chip
                      key={key}
                      label={`${key}=${value}`}
                      size="small"
                      sx={{
                        backgroundColor: isDarkMode ? "#475569" : "#e3f2fd", // light blue in light mode
                        color: isDarkMode ? "white" : "black", // black text in light mode
                      }}
                    />
                  ))}
                </Box>
              </Paper>
            ))}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          sx={{ color: isDarkMode ? "white" : "black" }} // black text in light mode
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PreviewDialog;
