import { useState, useEffect, useRef } from "react";
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
  Icon,
  Button,
} from "@mui/material";
import { FiX } from "react-icons/fi";
import Editor from "@monaco-editor/react";
import jsyaml from "js-yaml";

interface Namespace {
  name: string;
  status?: string;
  labels?: Record<string, string>;
  deployments?: Deployment[];
  services?: Service[];
  configmaps?: ConfigMap[];
  parameters?: {
    directoryRecurse?: boolean | string;
    topLevelArguments?: string[] | string;
    externalVariables?: string[] | string;
  };
  metadata?: {
    creationTimestamp?: string;
  };
  manifest?: string; // Added to support dynamic manifest from API
  project?: string;
  repoURL?: string;
  path?: string;
  targetRevision?: string;
  server?: string;
}

interface Deployment {
  metadata: { name: string; creationTimestamp?: string };
  spec: { replicas: number };
  status?: string;
}

interface Service {
  metadata: { name: string; creationTimestamp?: string };
  spec?: { clusterIP?: string };
  status?: { loadBalancer?: { ingress?: { hostname?: string; ip?: string }[] } } & { status?: string };
}

interface ConfigMap {
  metadata: { name: string; creationTimestamp?: string };
}

interface NamespaceDetailsProps {
  namespaceName: string;
  onClose: () => void;
  isOpen: boolean;
  namespaceData: Namespace | null;
}

const NamespaceDetailsPanel = ({ namespaceName, onClose, isOpen, namespaceData }: NamespaceDetailsProps) => {
  const [tabValue, setTabValue] = useState(0);
  const [isClosing, setIsClosing] = useState(false); // Track closing animation
  const panelRef = useRef<HTMLDivElement>(null);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

//   const calculateAge = (creationTimestamp: string | undefined): string => {
//     if (!creationTimestamp) return "N/A";
//     const createdDate = new Date(creationTimestamp);
//     const currentDate = new Date("2025-03-04"); // Current date
//     const diffMs = currentDate.getTime() - createdDate.getTime();
//     const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
//     return diffDays > 0 ? `${diffDays} days ago` : "Today";
//   };

  // Generate or use manifest dynamically
  const generateManifest = (namespace: Namespace): string => {
    if (namespace.manifest) {
      return namespace.manifest;
    }
    return jsyaml.dump({
      project: namespace.project || "default",
      repoURL: namespace.repoURL || "https://github.com/onkart17/mymusicstats.github.io",
      path: namespace.path || "k8s",
      targetRevision: namespace.targetRevision || "HEAD",
      server: namespace.server || "https://kubernetes.default.svc",
      namespace: namespace.name,
    }, { indent: 2 });
  };

  // Handle clicks outside the panel to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle closing animation
  const handleClose = () => {
    setIsClosing(true);
    const timer = setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 0); // Match the transition duration (0.5s)

    return () => clearTimeout(timer);
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
        zIndex: 1001, // Ensure panel is above the blurred background
        overflowY: "auto",
        borderTopLeftRadius: "8px",
        borderBottomLeftRadius: "8px",
      }}
    >
      {isClosing ? (
        <Box sx={{ height: "100%", width: "100%" }} /> // Blank state during closing
      ) : namespaceData && isOpen ? ( // Only show content if panel is fully open and not closing
        <Box ref={panelRef} sx={{ p: 6, height: "100%" }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={5}>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="h4" fontWeight="bold" sx={{ color: "#000000", fontSize: "20px" }}>
                {namespaceName}
              </Typography>
              <Icon sx={{ color: namespaceData.status === "Active" ? "#00b4d8" : "#ff0000", fontSize: "20px" }} className="fas fa-heart" />
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Button
                variant="contained"
                size="small"
                onClick={() => console.log("Sync clicked for", namespaceName)}
                sx={{
                  bgcolor: "#6d7f8b",
                  color: "#ffffff",
                  fontSize: "12px",
                  borderRadius: "40px",
                  "&:hover": { bgcolor: "#666666" },
                  padding: "8px 30px",
                }}
              >
                SYNC
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => console.log("Delete clicked for", namespaceName)}
                sx={{
                  bgcolor: "#6d7f8b",
                  color: "#ffffff",
                  fontSize: "12px",
                  borderRadius: "40px",
                  "&:hover": { bgcolor: "#cc0000" },
                  padding: "8px 30px",
                }}
              >
                DELETE
              </Button>
              <IconButton onClick={handleClose} sx={{ color: "#6d7f8b", fontSize: "20px" }}>
                <FiX />
              </IconButton>
            </Box>
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
                "&.Mui-selected": {
                  color: "#00b4d8",
                  fontWeight: 600,
                },
                padding: "6px 50px",
                minHeight: "36px",
              },
            }}
          >
            <Tab label="SUMMARY" />
            <Tab label="PARAMETERS" />
            <Tab label="MANIFEST" />
            <Tab label="EVENTS" />
          </Tabs>

          <Paper elevation={1} sx={{ bgcolor: "#ffffff", p: 1, borderRadius: 1, mt: 2 }}> {/* Increased mb to 8 (32px) to match spacing */}
            <Box sx={{ mt: 1, p: 1, bgcolor: "#ffffff" }}>
              {tabValue === 0 && ( // SUMMARY tab
                <>
                  <Box display="flex" justifyContent="flex-end" >
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => console.log("Edit clicked for", namespaceName)}
                      sx={{
                        color: "#666666",
                        borderColor: "#e0e0e0",
                        fontSize: "12px",
                        borderRadius: "4px",
                        "&:hover": { borderColor: "#b0b0b0", color: "#333333" },
                        padding: "0px 12px",
                      }}
                    >
                      EDIT
                    </Button>
                  </Box>
                  <Table sx={{ borderRadius: 1 }}>
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", width: "300px", fontSize: "14px" }}>
                          PROJECT
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          default
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          ANNOTATIONS
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          CLUSTER
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          in-cluster (https://kubernetes.default.svc)
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          NAMESPACE
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          {namespaceName} <span style={{ color: "#00b4d8", fontSize: "14px" }}>⧉</span>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          CREATED AT
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          {namespaceData.metadata?.creationTimestamp ? "02/17/2025 21:12:13 (15 days ago)" : "N/A"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          REPO URL
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          https://github.com/onkart17/mymusicstats.github.io
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          TARGET REVISION
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          HEAD
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          PATH
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          k8s
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          SYNC OPTIONS
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          RETRY OPTIONS
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          Retry disabled
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          STATUS
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          <span style={{ color: "#00b4d8", fontSize: "14px" }}>Synced to HEAD (a252619)</span>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          HEALTH
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          <span style={{ color: "#00b4d8", fontSize: "14px" }}>Healthy</span>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          LINKS
                        </TableCell>
                        <TableCell sx={{ padding: "19px 12px", color: "#333333", fontSize: "14px" }}></TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          IMAGES
                        </TableCell>
                        <TableCell sx={{ padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          shashanksriva/mymusicstats:1.0
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </>
              )}

              {tabValue === 1 && ( // PARAMETERS tab
                <>
                  <Box display="flex" justifyContent="flex-end" mb={2}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => console.log("Edit clicked for", namespaceName)}
                      sx={{
                        color: "#666666",
                        borderColor: "#e0e0e0",
                        fontSize: "12px",
                        borderRadius: "4px",
                        "&:hover": { borderColor: "#b0b0b0", color: "#333333" },
                        padding: "4px 12px",
                      }}
                    >
                      EDIT
                    </Button>
                  </Box>
                  <Table sx={{ borderRadius: 1, mt: 2 }}>
                    <TableBody>
                      <TableRow>
                        <TableCell
                          sx={{ borderBottom: "1px solid #e0e0e0", padding: "0px 12px", color: "#333333", width: "300px", fontSize: "14px", fontWeight: "bold" }}
                          colSpan={2}
                        >
                          DIRECTORY
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", width: "300px", fontSize: "14px" }}>
                          DIRECTORY RECURSE
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          {namespaceData.parameters?.directoryRecurse !== undefined
                            ? typeof namespaceData.parameters.directoryRecurse === "boolean"
                              ? namespaceData.parameters.directoryRecurse.toString()
                              : namespaceData.parameters.directoryRecurse
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", width: "300px", fontSize: "14px" }}>
                          TOP-LEVEL ARGUMENTS
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          {namespaceData.parameters?.topLevelArguments
                            ? Array.isArray(namespaceData.parameters.topLevelArguments)
                              ? namespaceData.parameters.topLevelArguments.join(", ")
                              : namespaceData.parameters.topLevelArguments
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", width: "300px", fontSize: "14px" }}>
                          EXTERNAL VARIABLES
                        </TableCell>
                        <TableCell sx={{ padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                          {namespaceData.parameters?.externalVariables
                            ? Array.isArray(namespaceData.parameters.externalVariables)
                              ? namespaceData.parameters.externalVariables.join(", ")
                              : namespaceData.parameters.externalVariables
                            : "N/A"}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </>
              )}

              {tabValue === 2 && ( // MANIFEST tab
                  <Editor
                    height="700px"
                    language="yaml"
                    value={namespaceData ? generateManifest(namespaceData) : "No manifest available"}
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

              {tabValue === 3 && ( // EVENTS tab
                <Box sx={{ bgcolor: "#ffffff", p: 1, borderRadius: 2, color: "#666666", fontSize: "14px", display: "flex", justifyContent: "center", alignItems: "center", height: "700px" }}>
                  <Typography variant="body2" sx={{ color: "#666666" }}>
                    No events available
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Box>
      ) : null}
    </Box>
  );
};

export default NamespaceDetailsPanel;