import { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Tabs,
  Tab,
  Table,
  TableRow,
  TableCell,
  TableBody,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
  Button,
  Stack,
} from "@mui/material";
import { FiX, FiRefreshCw, FiGitPullRequest, FiTrash2 } from "react-icons/fi";
import Editor from "@monaco-editor/react";
import jsyaml from "js-yaml";
import { ResourceItem } from "./TreeViewComponent";

// Extend the type definitions to include health in status
interface ResourceStatus {
  conditions?: { type: string; status: string }[];
  phase?: string;
  health?: { status: string }; // Add health property
}

interface ResourceMetadata {
  name?: string;
  namespace?: string;
  creationTimestamp?: string;
}

interface ResourceItem {
  metadata?: ResourceMetadata;
  kind?: string;
  status?: ResourceStatus;
}

interface DynamicDetailsProps {
  namespace: string;
  name: string;
  type: string;
  resourceData?: ResourceItem;
  onClose: () => void;
  isOpen: boolean;
  onSync?: () => void;
  onDelete?: () => void;
}

interface ResourceInfo {
  name: string;
  namespace: string;
  kind: string;
  createdAt: string;
  age: string;
  status: string;
  manifest: string;
  health: string;
}

const DynamicDetailsPanel = ({
  namespace,
  name,
  type,
  resourceData,
  onClose,
  isOpen,
  onSync,
  onDelete,
}: DynamicDetailsProps) => {
  const [resource, setResource] = useState<ResourceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!namespace || !name) {
      setResource(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Provide default values to handle undefined cases
      const resourceInfo: ResourceInfo = {
        name: resourceData?.metadata?.name ?? name,
        namespace: resourceData?.metadata?.namespace ?? namespace,
        kind: resourceData?.kind ?? type,
        createdAt: resourceData?.metadata?.creationTimestamp ?? "N/A",
        age: calculateAge(resourceData?.metadata?.creationTimestamp),
        status:
          resourceData?.status?.conditions?.[0]?.status ??
          resourceData?.status?.phase ??
          "Unknown",
        health: resourceData?.status?.health?.status ?? "Unknown",
        manifest: resourceData
          ? JSON.stringify(resourceData, null, 2)
          : "No manifest available",
      };

      setResource(resourceInfo);
      setError(null);
    } catch (err) {
      console.error(`Error processing ${type} details:`, err);
      setError(`Failed to load ${type} details.`);
    } finally {
      setLoading(false);
    }
  }, [namespace, name, type, resourceData]);

  const calculateAge = (creationTimestamp: string | undefined): string => {
    if (!creationTimestamp) return "N/A";
    const createdDate = new Date(creationTimestamp);
    const currentDate = new Date();
    const diffMs = currentDate.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `${diffDays} days ago` : "Today";
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    setLoading(true);
    // Trigger a refresh of the resource data (implementation depends on your API)
    setTimeout(() => setLoading(false), 1000); // Simulate API call
  };

  const jsonToYaml = (jsonString: string) => {
    try {
      const jsonObj = JSON.parse(jsonString);
      return jsyaml.dump(jsonObj, { indent: 2 });
    } catch (error) {
      console.log(error);
      return jsonString;
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 400);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "synced":
        return "success";
      case "outofsync":
        return "warning";
      case "healthy":
        return "success";
      case "degraded":
        return "error";
      default:
        return "default";
    }
  };

  const renderSummary = () => {
    if (!resource) return null;
    return (
      <Table sx={{ borderRadius: 1 }}>
        <TableBody>
          {[
            { label: "KIND", value: resource.kind },
            { label: "NAME", value: resource.name },
            { label: "NAMESPACE", value: resource.namespace },
            { label: "CREATED AT", value: `${resource.createdAt} (${resource.age})` },
            {
              label: "STATUS",
              value: (
                <Chip
                  label={resource.status}
                  color={getStatusColor(resource.status)}
                  size="small"
                  variant="outlined"
                />
              ),
            },
            {
              label: "HEALTH",
              value: (
                <Chip
                  label={resource.health}
                  color={getStatusColor(resource.health)}
                  size="small"
                  variant="outlined"
                />
              ),
            },
          ].map((row, index) => (
            <TableRow key={index}>
              <TableCell
                sx={{
                  borderBottom: "1px solid #e0e0e0",
                  padding: "12px 16px",
                  color: "#333333",
                  width: "200px",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                {row.label}
              </TableCell>
              <TableCell
                sx={{
                  borderBottom: "1px solid #e0e0e0",
                  padding: "12px 16px",
                  color: "#333333",
                  fontSize: "14px",
                }}
              >
                {row.value}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Box
      sx={{
        position: "fixed",
        right: isOpen ? 0 : "-80vw",
        top: 0,
        bottom: 0,
        width: "80vw",
        bgcolor: "#e5f6fd",
        boxShadow: "-2px 0 10px rgba(0,0,0,0.2)",
        transition: "right 0.4s ease-in-out",
        zIndex: 1001,
        overflowY: "auto",
        borderTopLeftRadius: "8px",
        borderBottomLeftRadius: "8px",
      }}
    >
      {isClosing ? (
        <Box sx={{ height: "100%", width: "100%" }} />
      ) : loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
          <Alert severity="error">{error}</Alert>
        </Box>
      ) : resource && isOpen ? (
        <Box ref={panelRef} sx={{ p: 4, height: "100%" }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={3}
          >
            <Typography
              variant="h4"
              fontWeight="bold"
              sx={{ color: "#000000", fontSize: "24px" }}
            >
              {name} ({type})
            </Typography>
            <Stack direction="row" spacing={1}>
              <Tooltip title="Refresh">
                <IconButton onClick={handleRefresh} sx={{ color: "#6d7f8b" }}>
                  <FiRefreshCw />
                </IconButton>
              </Tooltip>
              {onSync && (
                <Tooltip title="Sync Resource">
                  <Button
                    variant="contained"
                    startIcon={<FiGitPullRequest />}
                    onClick={onSync}
                    sx={{
                      bgcolor: "#00b4d8",
                      "&:hover": { bgcolor: "#009bbd" },
                    }}
                  >
                    Sync
                  </Button>
                </Tooltip>
              )}
              {onDelete && (
                <Tooltip title="Delete Resource">
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<FiTrash2 />}
                    onClick={onDelete}
                    sx={{ ml: 1 }}
                  >
                    Delete
                  </Button>
                </Tooltip>
              )}
              <Tooltip title="Close">
                <IconButton onClick={handleClose} sx={{ color: "#6d7f8b" }}>
                  <FiX />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{
              bgcolor: "#e5f6fd",
              "& .MuiTabs-indicator": { backgroundColor: "#00b4d8", height: 3 },
              "& .MuiTab-root": {
                textTransform: "none",
                fontSize: "14px",
                color: "#666666",
                "&.Mui-selected": { color: "#00b4d8", fontWeight: 600 },
                padding: "8px 24px",
                minHeight: "40px",
              },
            }}
          >
            <Tab label="SUMMARY" />
            <Tab label="MANIFEST" />
          </Tabs>

          <Paper
            elevation={1}
            sx={{ bgcolor: "#ffffff", p: 2, borderRadius: 2, mt: 2, mb: 4 }}
          >
            <Box sx={{ mt: 1, convictions: "center", p: 1, bgcolor: "#ffffff" }}>
              {tabValue === 0 && renderSummary()}
              {tabValue === 1 && (
                <Editor
                  height="500px"
                  language="yaml"
                  value={resource.manifest ? jsonToYaml(resource.manifest) : "No manifest available"}
                  theme="light"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    scrollBeyondLastLine: false,
                    readOnly: true,
                    automaticLayout: true,
                    wordWrap: "on",
                  }}
                />
              )}
            </Box>
          </Paper>
        </Box>
      ) : null}
    </Box>
  );
};

export default DynamicDetailsPanel;