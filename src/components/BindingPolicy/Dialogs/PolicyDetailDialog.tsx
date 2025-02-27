import React, { useContext } from "react";
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
import {  BindingPolicyInfo } from "../../../types/bindingPolicy";
import Editor from "@monaco-editor/react";
import { ThemeContext } from "../../../context/ThemeContext";
import ContentCopy from "@mui/icons-material/ContentCopy";

interface PolicyDetailDialogProps {
  open: boolean;
  onClose: () => void;
  policy: BindingPolicyInfo;
  onEdit: (policy: BindingPolicyInfo) => void;
}

const PolicyDetailDialog: React.FC<PolicyDetailDialogProps> = ({
  open,
  onClose,
  policy,
  onEdit,
}) => {
  const { theme } = useContext(ThemeContext);
  const isDarkTheme = theme === "dark";

  // Use the binding mode directly from the policy object
  const bindingMode = policy.bindingMode || "N/A";

  // Use the cluster list directly from the policy object
  const clusterNames = policy.clusterList || [];

  // Use the workload list directly from the policy object
  const workloads = policy.workloadList || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: "90vh",
          m: 2,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          backgroundColor: isDarkTheme ? "#1e293b" : "#fff",
          color: isDarkTheme ? "#fff" : "inherit",
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Typography
              variant="h6"
              className={isDarkTheme ? "text-white" : ""}
            >
              {policy.name}
            </Typography>
            <Chip
              label={policy.status}
              size="small"
              color={
                policy.status.toLowerCase() === "active" ? "success" : "error"
              }
            />
          </Box>
          <Button
            onClick={() => onEdit(policy)}
            sx={{
              color: isDarkTheme ? "gray.300" : "gray.600",
              "&:hover": {
                color: isDarkTheme ? "white" : "gray.800",
              },
            }}
          >
            Edit
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{
          flex: 1,
          overflow: "auto",
          p: 2,
          "&:first-of-type": {
            pt: 2,
          },
        }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 2,
                height: "100%",
                backgroundColor: isDarkTheme ? "#0f172a" : "#fff",
                color: isDarkTheme ? "#fff" : "inherit",
              }}
            >
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                gutterBottom
                className={isDarkTheme ? "text-white" : ""}
              >
                Policy Information
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box>
                  <Typography
                    variant="body2"
                    className={isDarkTheme ? "text-gray-400" : "text-gray-600"}
                  >
                    Created
                  </Typography>
                  <Typography className={isDarkTheme ? "text-white" : ""}>
                    {policy.creationDate}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    className={isDarkTheme ? "text-gray-400" : "text-gray-600"}
                  >
                    Last Modified
                  </Typography>
                  <Typography className={isDarkTheme ? "text-white" : ""}>
                    {policy.lastModifiedDate || "Not available"}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    className={isDarkTheme ? "text-gray-400" : "text-gray-600"}
                  >
                    Binding Mode
                  </Typography>
                  <Typography className={isDarkTheme ? "text-white" : ""}>
                    {bindingMode}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    className={isDarkTheme ? "text-gray-400" : "text-gray-600"}
                  >
                    Namespace
                  </Typography>
                  <Typography className={isDarkTheme ? "text-white" : ""}>
                    {policy.namespace || "default"}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    className={isDarkTheme ? "text-gray-400" : "text-gray-600"}
                  >
                    Clusters ({clusterNames.length})
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {clusterNames.length > 0 ? (
                      clusterNames.map((name, index) => (
                        <Chip
                          key={index}
                          label={name}
                          size="small"
                          sx={{
                            mr: 1,
                            mb: 1,
                            backgroundColor: isDarkTheme
                              ? "#334155"
                              : undefined,
                            color: isDarkTheme ? "#fff" : undefined,
                          }}
                        />
                      ))
                    ) : (
                      <Typography color="text.secondary" fontSize="0.875rem">
                        No specific clusters defined
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    className={isDarkTheme ? "text-gray-400" : "text-gray-600"}
                  >
                    Workloads
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {workloads && workloads.length > 0 ? (
                      workloads.map((workload, index) => (
                        <Chip
                          key={index}
                          label={workload}
                          size="small"
                          sx={{
                            mr: 1,
                            mb: 1,
                            backgroundColor: isDarkTheme
                              ? "#334155"
                              : undefined,
                            color: isDarkTheme ? "#fff" : undefined,
                          }}
                        />
                      ))
                    ) : (
                      <Typography color="text.secondary" fontSize="0.875rem">
                        No workloads defined
                      </Typography>
                    )}
                  </Box>
                </Box>
                <Box>
                  <Typography
                    variant="body2"
                    className={isDarkTheme ? "text-gray-400" : "text-gray-600"}
                  >
                    Status
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip
                      label={policy.status}
                      size="small"
                      color={
                        policy.status.toLowerCase() === "active"
                          ? "success"
                          : "error"
                      }
                    />
                  </Box>
                </Box>

                {policy.conditions && policy.conditions.length > 0 && (
                  <Box>
                    <Typography
                      variant="body2"
                      className={
                        isDarkTheme ? "text-gray-400" : "text-gray-600"
                      }
                    >
                      Conditions
                    </Typography>
                    <Box sx={{ mt: 1 }}>
                      {policy.conditions.map((condition, index) => (
                        <Box key={index} sx={{ mb: 1 }}>
                          <Typography
                            variant="body2"
                            fontWeight="medium"
                            className={
                              isDarkTheme ? "text-gray-300" : "text-gray-700"
                            }
                          >
                            {condition.type}: {condition.status}
                          </Typography>
                          {condition.reason && (
                            <Typography
                              variant="body2"
                              className={
                                isDarkTheme ? "text-gray-400" : "text-gray-600"
                              }
                            >
                              Reason: {condition.reason}
                            </Typography>
                          )}
                          {condition.message && (
                            <Typography
                              variant="body2"
                              className={
                                isDarkTheme ? "text-gray-400" : "text-gray-600"
                              }
                            >
                              {condition.message}
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={8}>
            <Paper
              sx={{
                p: 2,
                height: "100%",
                backgroundColor: isDarkTheme ? "#0f172a" : "#fff",
                color: isDarkTheme ? "#fff" : "inherit",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography
                  variant="subtitle1"
                  fontWeight="bold"
                  className={isDarkTheme ? "text-white" : ""}
                >
                  YAML Configuration
                </Typography>
                <Button
                  size="small"
                  startIcon={<ContentCopy />}
                  onClick={() => navigator.clipboard.writeText(policy.yaml)}
                  sx={{
                    color: isDarkTheme ? "gray.300" : "gray.600",
                    "&:hover": {
                      color: isDarkTheme ? "white" : "gray.800",
                    },
                  }}
                >
                  Copy
                </Button>
              </Box>
              <Box
                sx={{
                  mt: 2,
                  border: 1,
                  borderColor: isDarkTheme ? "gray.700" : "divider",
                }}
              >
                <Editor
                  height="400px"
                  language="yaml"
                  value={policy.yaml}
                  theme={isDarkTheme ? "vs-dark" : "light"}
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
      <DialogActions
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Button onClick={onClose} className={isDarkTheme ? "text-white" : ""}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PolicyDetailDialog;