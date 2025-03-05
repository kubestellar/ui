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
  Checkbox,
  Button,
  Icon,
} from "@mui/material";
import { FiX } from "react-icons/fi";
import Editor from "@monaco-editor/react";
import jsyaml from "js-yaml";

// interface Namespace {
//   name: string;
//   status?: string;
//   labels?: Record<string, string>;
//   deployments?: Deployment[];
//   services?: Service[];
//   configmaps?: ConfigMap[];
// }

// interface Deployment {
//   metadata: { name: string; creationTimestamp?: string };
//   spec: { replicas: number };
//   status?: string;
// }

interface Service {
  metadata: { name: string; creationTimestamp?: string };
  spec?: { clusterIP?: string; ports?: { port: number; targetPort: number; protocol: string }[]; type?: string };
  status?: { loadBalancer?: { ingress?: { hostname?: string; ip?: string }[] } } & { status?: string };
}

// interface ConfigMap {
//   metadata: { name: string; creationTimestamp?: string };
// }

interface ServiceDetailsProps {
  serviceName: string;
  namespace: string;
  onClose: () => void;
  isOpen: boolean;
  serviceData: Service | null;
}

const ServiceDetailsPanel = ({ serviceName, namespace, onClose, isOpen, serviceData }: ServiceDetailsProps) => {
  const [tabValue, setTabValue] = useState(0);
  const [manifestTab, setManifestTab] = useState(0);
  const [isClosing, setIsClosing] = useState(false); // Track closing animation
  const panelRef = useRef<HTMLDivElement>(null);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleManifestTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setManifestTab(newValue);
  };

  const calculateAge = (creationTimestamp: string | undefined): string => {
    if (!creationTimestamp) return "N/A";
    const createdDate = new Date(creationTimestamp);
    const currentDate = new Date("2025-03-04"); // Current date
    const diffMs = currentDate.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `${diffDays} days ago` : "Today";
  };

  // Generate a sample manifest for the service
  const generateServiceManifest = (service: Service | null): string => {
    if (!service) {
      return `apiVersion: v1
kind: Service
metadata:
  name: ${serviceName}
  namespace: ${namespace}
  labels:
    app: ${serviceName}
    app.kubernetes.io/instance: ${serviceName}
spec:
  ports:
    - port: 80
      targetPort: 80
      protocol: TCP
  selector:
    app: ${serviceName}
  type: NodePort
  clusterIP: 10.96.0.1`;
    }

    return jsyaml.dump({
      apiVersion: "v1",
      kind: "Service",
      metadata: {
        name: service.metadata?.name || serviceName,
        namespace: namespace,
        labels: {
          app: serviceName,
          "app.kubernetes.io/instance": serviceName,
        },
      },
      spec: {
        ports: service.spec?.ports?.map((port) => ({
          port: port.port,
          targetPort: port.targetPort,
          protocol: port.protocol,
        })) || [{ port: 80, targetPort: 80, protocol: "TCP" }],
        selector: {
          app: serviceName,
        },
        type: service.spec?.type || "NodePort",
        clusterIP: service.spec?.clusterIP || "10.96.0.1",
      },
      status: {
        loadBalancer: service.status?.loadBalancer || {},
      },
    }, { indent: 2 });
  };

  // Determine service status and health based on JSON data and TreeView logic
  const getServiceStatus = (service: Service | null): string => {
    if (!service || !service.spec?.clusterIP) {
      return "Out of Sync";
    }
    return "Synced";
  };

  const getServiceHealth = (service: Service | null): string => {
    if (!service || !service.spec?.clusterIP) {
      return "Degraded";
    }
    return "Healthy";
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
      ) : serviceData && isOpen ? ( // Only show content if panel is fully open and not closing
        <Box ref={panelRef} sx={{ p: 6, height: "100%" }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={5}>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="h4" fontWeight="bold" sx={{ color: "#000000", fontSize: "20px" }}>
                {serviceName} <span style={{ color: "#666666", fontSize: "14px" }}>svc</span>
              </Typography>
              <Icon sx={{ color: getServiceHealth(serviceData) === "Healthy" ? "#00b4d8" : "#ff0000", fontSize: "20px" }} className="fas fa-heart" />
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Button
                variant="contained"
                size="small"
                onClick={() => console.log("Sync clicked for", serviceName)}
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
                onClick={() => console.log("Delete clicked for", serviceName)}
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
              <IconButton onClick={handleClose} sx={{ color: "#6d7f8b", fontSize: "20px" }}> {/* Use handleClose instead of onClose */}
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
            <Tab label="EVENTS" />
          </Tabs>

          <Paper elevation={1} sx={{ bgcolor: "#ffffff", p: 1, borderRadius: 1, mt: 2, mb: 4 }}>
            <Box sx={{ mt: 1, p: 1, bgcolor: "#ffffff" }}>
              {tabValue === 0 && ( // SUMMARY tab
                <Table sx={{ borderRadius: 1 }}>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", width: "300px", fontSize: "14px" }}>
                        KIND
                      </TableCell>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        Service
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        NAME
                      </TableCell>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        {serviceName} <span style={{ color: "#666666", fontSize: "14px" }}>svc</span>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        NAMESPACE
                      </TableCell>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        {namespace} <span style={{ color: "#666666", fontSize: "14px" }}>ns</span>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        CREATED AT
                      </TableCell>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        {serviceData.metadata?.creationTimestamp ? calculateAge(serviceData.metadata.creationTimestamp) : "02/17/2025 21:12:30 (15 days ago)"}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        TYPE
                      </TableCell>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        {serviceData?.spec?.type || "NodePort"}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        HOSTNAMES
                      </TableCell>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        {serviceData?.status?.loadBalancer?.ingress?.map((ingress) => ingress.hostname || ingress.ip).join(", ") || ""}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        STATUS
                      </TableCell>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        <span style={{ color: getServiceStatus(serviceData) === "Synced" ? "#00b4d8" : "#ff0000", fontSize: "14px" }}>
                          {getServiceStatus(serviceData)}
                        </span>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        HEALTH
                      </TableCell>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        <span style={{ color: getServiceHealth(serviceData) === "Healthy" ? "#00b4d8" : "#ff0000", fontSize: "14px" }}>
                          {getServiceHealth(serviceData)}
                        </span>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        LINKS
                      </TableCell>
                      <TableCell sx={{ padding: "19px 12px", color: "#333333", fontSize: "14px" }}></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}

              {tabValue === 1 && ( // EVENTS tab
                <Box sx={{ bgcolor: "#ffffff", p: 1, borderRadius: 2, color: "#666666", fontSize: "14px", display: "flex", justifyContent: "center", alignItems: "center", height: "700px" }}>
                  <Typography variant="body2" sx={{ color: "#666666" }}>
                    No events available
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>

          {tabValue === 0 && ( // Manifest section (only in Summary tab, as per Argo CD images)
            <Paper elevation={1} sx={{ bgcolor: "#ffffff", p: 1, borderRadius: 1, mt: 4, mb: 4 }}>
              <Tabs
                value={manifestTab}
                onChange={handleManifestTabChange}
                sx={{
                  "& .MuiTabs-indicator": { backgroundColor: "#00b4d8", height: 3 },
                  "& .MuiTab-root": {
                    textTransform: "none",
                    fontSize: "14px",
                    color: "#666666",
                    "&.Mui-selected": {
                      color: "#00b4d8",
                      fontWeight: 600,
                    },
                    padding: "6px 35px",
                    minHeight: "36px",
                  },
                }}
              >
                <Tab label="LIVE MANIFEST" />
                <Tab label="DIFF" />
                <Tab label="DESIRED MANIFEST" />
              </Tabs>

              <Box sx={{ mt: 1, p: 1, bgcolor: "#ffffff", pb: 4 }}>
                {manifestTab === 0 && (
                  <Paper
                    elevation={0}
                    sx={{
                      bgcolor: "#ffffff",
                      p: 1,
                      border: "1px solid #e0e0e0",
                      borderRadius: 2,
                      overflow: "auto",
                      maxHeight: "40vh",
                      mb: 4,
                    }}
                  >
                    <Editor
                      height="400px"
                      language="yaml"
                      value={serviceData ? generateServiceManifest(serviceData) : "No manifest available"}
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
                    <Box sx={{ mt: 1, display: "flex", justifyContent: "flex-end", gap: 0.5, alignItems: "center" }}>
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{
                          color: "#666666",
                          borderColor: "#e0e0e0",
                          fontSize: "12px",
                          "&:hover": { borderColor: "#b0b0b0", color: "#333333" },
                          padding: "4px 8px",
                        }}
                      >
                        Hide Managed Fields
                      </Button>
                      <Checkbox
                        defaultChecked
                        size="small"
                        sx={{
                          color: "#666666",
                          "&.Mui-checked": { color: "#00b4d8" },
                          padding: 0,
                        }}
                      />
                      <Typography variant="body2" sx={{ color: "#666666", fontSize: "12px", mr: 0.5 }}>
                        Enable Word Wrap
                      </Typography>
                      <Button
                        variant="contained"
                        size="small"
                        sx={{
                          bgcolor: "#00b4d8",
                          color: "#ffffff",
                          fontSize: "12px",
                          "&:hover": { bgcolor: "#0089b3" },
                          padding: "4px 8px",
                        }}
                      >
                        EDIT
                      </Button>
                    </Box>
                  </Paper>
                )}

                {manifestTab === 1 && (
                  <Paper
                    elevation={0}
                    sx={{
                      bgcolor: "#ffffff",
                      p: 1,
                      border: "1px solid #e0e0e0",
                      borderRadius: 2,
                      overflow: "auto",
                      maxHeight: "40vh",
                      mb: 4,
                    }}
                  >
                    <Editor
                      height="400px"
                      language="yaml"
                      value="No DIFF manifest available"
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
                  </Paper>
                )}

                {manifestTab === 2 && (
                  <Paper
                    elevation={0}
                    sx={{
                      bgcolor: "#ffffff",
                      p: 1,
                      border: "1px solid #e0e0e0",
                      borderRadius: 2,
                      overflow: "auto",
                      maxHeight: "40vh",
                      mb: 4,
                    }}
                  >
                    <Editor
                      height="400px"
                      language="yaml"
                      value={serviceData ? generateServiceManifest(serviceData) : `apiVersion: v1
kind: Service
metadata:
  name: ${serviceName}
  namespace: ${namespace}
  labels:
    app: ${serviceName}
    app.kubernetes.io/instance: ${serviceName}
spec:
  ports:
    - port: 80
      targetPort: 80
      protocol: TCP
  selector:
    app: ${serviceName}
  type: "NodePort"
  clusterIP: "10.96.0.1"}`}
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
                  </Paper>
                )}
              </Box>
            </Paper>
          )}
        </Box>
      ) : null}
    </Box>
  );
};

export default ServiceDetailsPanel;