import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Tabs,
  Tab,
} from "@mui/material";
import PolicyVisualization from "./PolicyVisualization";
import {
  BindingPolicyInfo,
  ManagedCluster,
  Workload,
} from "../../types/bindingPolicy";

interface PreviewDialogProps {
  open: boolean;
  onClose: () => void;
  matchedClusters: ManagedCluster[];
  matchedWorkloads: Workload[];
  policy?: BindingPolicyInfo;
}

const PreviewDialog: React.FC<PreviewDialogProps> = ({
  open,
  onClose,
  matchedClusters,
  matchedWorkloads,
  policy,
}) => {
  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (!policy) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Policy Preview & Insights</DialogTitle>
      <DialogContent>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Visualization" />
          <Tab label="Details" />
        </Tabs>

        <Box sx={{ mt: 2 }}>
          {tabValue === 0 && (
            <PolicyVisualization
              policy={policy}
              matchedClusters={matchedClusters}
              matchedWorkloads={matchedWorkloads}
              previewMode={true}
            />
          )}

          {tabValue === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Matching Details
              </Typography>

              <Typography variant="subtitle1" gutterBottom>
                Matched Clusters ({matchedClusters.length})
              </Typography>
              {matchedClusters.map((cluster) => (
                <Box key={cluster.name} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    {cluster.name} - {cluster.status}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Labels: {JSON.stringify(cluster.labels)}
                  </Typography>
                </Box>
              ))}

              <Typography variant="subtitle1" sx={{ mt: 2 }} gutterBottom>
                Matched Workloads ({matchedWorkloads.length})
              </Typography>
              {matchedWorkloads.map((workload) => (
                <Box key={workload.name} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    {workload.name} ({workload.namespace})
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Labels: {JSON.stringify(workload.labels)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PreviewDialog;
