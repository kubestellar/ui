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
import useTheme from "../../stores/themeStore";

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
  const theme = useTheme((state) => state.theme)
  const isDarkTheme = theme === "dark";

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (!policy) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          height: '80vh',
          m: 2,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: isDarkTheme ? '#1e293b' : '#fff',
          color: isDarkTheme ? '#fff' : 'inherit',
        }
      }}
    >
      <DialogTitle>
        Policy Preview & Insights
      </DialogTitle>
      <DialogContent sx={{ 
        flex: 1,
        overflow: 'auto',
        p: 2,
        '&:first-of-type': {
          pt: 2
        }
      }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          textColor={isDarkTheme ? 'inherit' : 'primary'}
          indicatorColor={isDarkTheme ? 'secondary' : 'primary'}
        >
          <Tab 
            label="Visualization" 
            className={isDarkTheme ? 'text-white' : ''}
          />
          <Tab 
            label="Details" 
            className={isDarkTheme ? 'text-white' : ''}
          />
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
            <Box className={isDarkTheme ? 'text-white' : 'text-black'}>
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
        <Button 
          onClick={onClose}
          className={isDarkTheme ? 'text-white' : ''}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PreviewDialog;