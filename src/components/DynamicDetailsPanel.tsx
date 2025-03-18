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
} from "@mui/material";
import { FiX } from "react-icons/fi";
import Editor from "@monaco-editor/react";
import jsyaml from "js-yaml";
import { ResourceItem } from "./TreeViewComponent"; // Import ResourceItem type

interface DynamicDetailsProps {
  namespace: string;
  name: string;
  type: string;
  resourceData?: ResourceItem;
  onClose: () => void;
  isOpen: boolean;
}

interface ResourceInfo {
  name: string;
  namespace: string;
  kind: string;
  createdAt?: string;
  age?: string;
  status?: string;
  manifest?: string;
}

const DynamicDetailsPanel = ({ namespace, name, type, resourceData, onClose, isOpen }: DynamicDetailsProps) => {
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
      const resourceInfo: ResourceInfo = {
        name: resourceData?.metadata?.name || name,
        namespace: resourceData?.metadata?.namespace || namespace,
        kind: resourceData?.kind || type,
        createdAt: resourceData?.metadata?.creationTimestamp || "N/A",
        age: calculateAge(resourceData?.metadata?.creationTimestamp),
        status: resourceData?.status?.conditions?.[0]?.status || resourceData?.status?.phase || "N/A",
        manifest: resourceData ? JSON.stringify(resourceData, null, 2) : "No manifest available",
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

  const renderSummary = () => {
    if (!resource) return null;
    return (
      <Table sx={{ borderRadius: 1 }}>
        <TableBody>
          <TableRow>
            <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", width: "300px", fontSize: "14px" }}>
              KIND
            </TableCell>
            <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
              {resource.kind}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
              NAME
            </TableCell>
            <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
              {resource.name}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
              NAMESPACE
            </TableCell>
            <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
              {resource.namespace}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
              CREATED AT
            </TableCell>
            <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
              {resource.createdAt} ({resource.age})
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
              STATUS
            </TableCell>
            <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
              {resource.status}
            </TableCell>
          </TableRow>
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
        <Box ref={panelRef} sx={{ p: 6, height: "100%" }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={5}>
            <Typography variant="h4" fontWeight="bold" sx={{ color: "#000000", fontSize: "20px" }}>
              {name} ({type})
            </Typography>
            <IconButton onClick={handleClose} sx={{ color: "#6d7f8b", fontSize: "20px" }}>
              <FiX />
            </IconButton>
          </Box>

          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            sx={{
              bgcolor: "#e5f6fd",
              "& .MuiTabs-indicator": { backgroundColor: "#00b4d8", height: 3 },
              "& .MuiTab-root": {
                textTransform: "none",
                fontSize: "12px",
                color: "#666666",
                "&.Mui-selected": { color: "#00b4d8", fontWeight: 600 },
                padding: "6px 50px",
                minHeight: "36px",
              },
            }}
          >
            <Tab label="SUMMARY" />
            <Tab label="MANIFEST" />
          </Tabs>

          <Paper elevation={1} sx={{ bgcolor: "#ffffff", p: 1, borderRadius: 1, mt: 2, mb: 4 }}>
            <Box sx={{ mt: 1, p: 1, bgcolor: "#ffffff" }}>
              {tabValue === 0 && renderSummary()}
              {tabValue === 1 && (
                <Editor
                  height="400px"
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