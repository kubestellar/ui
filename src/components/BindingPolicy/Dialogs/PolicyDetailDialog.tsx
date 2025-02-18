import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Paper,
  Grid,
} from "@mui/material";
import { BindingPolicyInfo } from "../../../types/bindingPolicy";
import Editor from "@monaco-editor/react";

interface PolicyDetailDialogProps {
  open: boolean;
  onClose: () => void;
  policy: BindingPolicyInfo;
}

const PolicyDetailDialog: React.FC<PolicyDetailDialogProps> = ({
  open,
  onClose,
  policy,
}) => {
  // Extract binding mode from YAML if not directly provided
  const bindingMode =
    policy.bindingMode ||
    policy.yaml?.match(/bindingMode:\s*(\w+)/)?.[1] ||
    "N/A";

  // Extract cluster names from YAML
  const clusterNames =
    policy.yaml
      ?.match(/clusterNames:\n(\s+- .+\n?)+/)?.[0]
      ?.split("\n")
      ?.filter((line) => line.includes("- "))
      ?.map((line) => line.replace(/\s+- /, "")) || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h6">{policy.name}</Typography>
          <Chip
            label={policy.status}
            size="small"
            color={policy.status === "Active" ? "success" : "error"}
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: "100%" }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Policy Information
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Created
                  </Typography>
                  <Typography>{policy.creationDate}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Last Modified
                  </Typography>
                  <Typography>
                    {policy.lastModifiedDate || "Not available"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Binding Mode
                  </Typography>
                  <Typography>{bindingMode}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Clusters ({policy.clusters})
                  </Typography>
                  {clusterNames.length > 0 ? (
                    clusterNames.map((name, index) => (
                      <Chip
                        key={index}
                        label={name}
                        size="small"
                        sx={{ mr: 1, mt: 1 }}
                      />
                    ))
                  ) : (
                    <Typography color="text.secondary" fontSize="0.875rem">
                      No specific clusters defined
                    </Typography>
                  )}
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Workload
                  </Typography>
                  <Typography>{policy.workload}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={policy.status}
                    size="small"
                    color={policy.status === "Active" ? "success" : "error"}
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2, height: "100%" }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                YAML Configuration
              </Typography>
              <Box sx={{ mt: 2, border: 1, borderColor: "divider" }}>
                <Editor
                  height="400px"
                  language="yaml"
                  value={policy.yaml}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PolicyDetailDialog;
