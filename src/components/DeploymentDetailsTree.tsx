import { useEffect, useState } from "react";
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
  Button,
  Checkbox,
  Icon,
} from "@mui/material";
import { FiX } from "react-icons/fi";
import Editor from "@monaco-editor/react";
import jsyaml from "js-yaml";
import { api } from "../lib/api";

interface DeploymentInfo {
  name: string;
  namespace: string;
  createdAt?: string;
  age?: string;
  uid?: string;
  rollingUpdateStrategy?: {
    maxSurge?: string;
    maxUnavailable?: string;
  };
  replicas?: number;
  updatedReplicas?: number;
  availableReplicas?: number;
  conditions?: { type: string; status: string; lastProbeTime?: string; reason?: string; message?: string }[];
  containerImages?: string[];
  resourceInfo?: {
    strategy?: string;
    minReadySeconds?: number;
    revisionHistoryLimit?: number;
  };
  newReplicaSet?: ReplicaSetInfo;
  oldReplicaSet?: ReplicaSetInfo;
  events?: EventInfo[];
  manifest?: string;
  diffManifest?: string;
  desiredManifest?: string;
}

interface ReplicaSetInfo {
  name: string;
  namespace: string;
  age: string;
  pods: number;
  labels: string;
  images: string[];
}

interface EventInfo {
  type: string;
  reason: string;
  message: string;
  count: number;
  firstTimestamp: string;
  lastTimestamp: string;
}

interface Container {
  image?: string;
  name?: string;
  ports?: { containerPort: number }[];
}

export interface DeploymentDetailsProps {
  namespace: string;
  deploymentName: string;
  onClose: () => void;
  isOpen: boolean;
}

const DeploymentDetailsTree = ({ namespace, deploymentName, onClose, isOpen }: DeploymentDetailsProps) => {
  const [deployment, setDeployment] = useState<DeploymentInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [manifestTab, setManifestTab] = useState(0);

  console.log(error);

  useEffect(() => {
    if (!namespace || !deploymentName) {
      setDeployment(null);
      setLoading(false);
      return;
    }

    const fetchDeploymentData = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/api/wds/${deploymentName}?namespace=${namespace}`);
        const data = response.data;

        let desiredManifest = "No DESIRED manifest available";
        if (data.spec) {
          const desiredManifestObj = {
            apiVersion: data.apiVersion || "apps/v1",
            kind: data.kind || "Deployment",
            metadata: {
              labels: data.metadata?.labels || { app: deploymentName, "app.kubernetes.io/instance": deploymentName },
              name: data.metadata?.name || deploymentName,
              namespace: data.metadata?.namespace || "default",
            },
            spec: {
              replicas: data.spec?.replicas || 1,
              selector: {
                matchLabels: data.spec?.selector?.matchLabels || { app: deploymentName },
              },
              template: {
                metadata: {
                  labels: data.spec?.template?.metadata?.labels || { app: deploymentName },
                },
                spec: {
                  containers: data.spec?.template?.spec?.containers?.map((container: Container) => ({
                    image: container.image || "",
                    name: container.name || deploymentName,
                    ports: container.ports?.map((port) => ({ containerPort: port.containerPort })) || [{ containerPort: 80 }],
                  })) || [],
                },
              },
            },
          };
          desiredManifest = jsyaml.dump(desiredManifestObj, { indent: 2 });
        }

        setDeployment({
          name: data.metadata?.name || "Unknown",
          namespace: data.metadata?.namespace || "Unknown",
          createdAt: data.metadata?.creationTimestamp || "N/A",
          age: calculateAge(data.metadata?.creationTimestamp),
          uid: data.metadata?.uid || "N/A",
          rollingUpdateStrategy: data.spec?.strategy?.rollingUpdate || {},
          replicas: data.spec?.replicas || 0,
          updatedReplicas: data.status?.updatedReplicas || 0,
          availableReplicas: data.status?.availableReplicas || 0,
          conditions: data.status?.conditions?.map((cond: { 
            type: string; 
            status: string; 
            lastProbeTime?: string; 
            reason?: string; 
            message?: string 
          }) => ({
            type: cond.type,
            status: cond.status,
            lastProbeTime: cond.lastProbeTime || "N/A",
            reason: cond.reason || "N/A",
            message: cond.message || "N/A",
          })) || [],
          containerImages: data.spec?.template?.spec?.containers?.map((container: Container) => container.image) || [],
          resourceInfo: {
            strategy: data.spec?.strategy?.type || "N/A",
            minReadySeconds: data.spec?.minReadySeconds || 0,
            revisionHistoryLimit: data.spec?.revisionHistoryLimit || 0,
          },
          newReplicaSet: data.status?.newReplicaSet || {},
          oldReplicaSet: data.status?.oldReplicaSet || {},
          events: data.status?.events || [],
          manifest: JSON.stringify(data, null, 2),
          diffManifest: "No DIFF manifest available",
          desiredManifest: desiredManifest,
        });

        setError(null);
      } catch (err) {
        console.error("Error fetching deployment details:", err);
        setError("Failed to load deployment details.");
      } finally {
        setLoading(false);
      }
    };

    fetchDeploymentData();
  }, [deploymentName, namespace]);

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

  const handleManifestTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setManifestTab(newValue);
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

  const handleSync = () => {
    console.log("Sync clicked for", deploymentName);
  };

  const handleDelete = () => {
    console.log("Delete clicked for", deploymentName);
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
        transition: "right 0.5s ease-in-out",
        zIndex: 1000,
        overflowY: "auto",
        borderTopLeftRadius: "8px",
        borderBottomLeftRadius: "8px",
      }}
    >
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
          <Alert severity="error">{error}</Alert>
        </Box>
      ) : deployment ? (
        <Box sx={{ p: 6, height: "100%"}}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={5}>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="h4" fontWeight="bold" sx={{ color: "#000000", fontSize: "20px" }}>
                {deploymentName}
              </Typography>
              <Icon sx={{ color: "#00b4d8", fontSize: "20px" }} className="fas fa-heart" />
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Button
                variant="contained"
                size="small"
                onClick={handleSync}
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
                onClick={handleDelete}
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
              <IconButton onClick={onClose} sx={{ color: "#6d7f8b", fontSize: "20px" }}>
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
            <Tab label="LOGS" />
          </Tabs>

          <Paper elevation={1} sx={{ bgcolor: "#ffffff", p: 1, borderRadius: 1, mt: 2}}>
            <Box sx={{ mt: 1, p: 1, bgcolor: "#ffffff" }}>
              {tabValue === 0 && (
                <Table sx={{ borderRadius: 1 }}>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333" , width: "300px", fontSize: "14px"}}>
                        KIND
                      </TableCell>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        Deployment
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        NAME
                      </TableCell>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        {deployment.name} <span style={{ color: "#00b4d8", fontSize: "14px" }}>⧉</span>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        NAMESPACE
                      </TableCell>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        {deployment.namespace} <span style={{ color: "#00b4d8", fontSize: "14px" }}>⧉</span>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        CREATED AT
                      </TableCell>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        {deployment.createdAt} ({deployment.age})
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        STATUS
                      </TableCell>
                      <TableCell sx={{ borderBottom: "1px solid #e0e0e0", padding: "19px 12px", color: "#333333", fontSize: "14px" }}>
                        <span style={{ color: "#00b4d8", fontSize: "14px" }}>Synced</span>
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
                  </TableBody>
                </Table>
              )}

              {tabValue === 1 && (
                <Box sx={{ bgcolor: "#ffffff", p: 1, borderRadius: 2, color: "#666666", fontSize: "14px", display: "flex", justifyContent: "center", alignItems: "center", height: "700px" }}>
                  <Typography variant="body2" sx={{ color: "#666666" }}>
                    No events available
                  </Typography>
                </Box>
              )}

              {tabValue === 2 && (
                <Box sx={{ bgcolor: "#ffffff", p: 1, borderRadius: 2, color: "#333333", fontSize: "14px" , height:"700px" }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                    <Typography variant="body2" sx={{ mr: 0.5, color: "#666666", fontSize: "14px" }}>
                      containing
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, bgcolor: "", borderRadius: 100 }}>
                      <IconButton size="small" sx={{ color: "#00b4d8", p: 2 }}>
                        <span style={{ fontSize: "30px" }}>▼</span>
                      </IconButton>
                      <IconButton size="small" sx={{ color: "#666666", p: 2 }}>
                        <span style={{ fontSize: "30px" }}>+</span>
                      </IconButton>
                      <IconButton size="small" sx={{ color: "#666666", p: 2 }}>
                        <span style={{ fontSize: "30px" }}>☾</span>
                      </IconButton>
                      <IconButton size="small" sx={{ color: "#666666", p: 2 }}>
                        <span style={{ fontSize: "30px" }}>⚙</span>
                      </IconButton>
                      <IconButton size="small" sx={{ color: "#666666", p: 2 }}>
                        <span style={{ fontSize: "30px" }}>⏏</span>
                      </IconButton>
                      <IconButton size="small" sx={{ color: "#666666", p: 2 }}>
                        <span style={{ fontSize: "30px" }}>⟳</span>
                      </IconButton>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "300px" }}>
                    <Typography variant="body2" sx={{ color: "#666666", fontSize: "14px" }}>
                      No logs available
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
          </Paper>

          {tabValue === 0 && (
            <Paper elevation={1} sx={{ bgcolor: "#ffffff", p: 1, borderRadius: 1, mt: 4 }}>
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

              <Box sx={{ mt: 1, p: 1, bgcolor: "#ffffff"}}>
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
                    }}
                  >
                    <Editor
                      height="400px"
                      language="yaml"
                      value={deployment.manifest ? jsonToYaml(deployment.manifest) : "No manifest available"}
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
                    }}
                  >
                    <Editor
                      height="400px"
                      language="yaml"
                      value={deployment.diffManifest ? jsonToYaml(deployment.diffManifest) : "No DIFF manifest available"}
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
                    }}
                  >
                    <Editor
                      height="400px"
                      language="yaml"
                      value={deployment.desiredManifest || `apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: ${deploymentName}
    app.kubernetes.io/instance: ${deploymentName}
  name: ${deploymentName}
  namespace: ${deployment.namespace || "default"}
spec:
  replicas: ${deployment.replicas || 1}
  selector:
    matchLabels:
      app: ${deploymentName}
  template:
    metadata:
      labels:
        app: ${deploymentName}
    spec:
      containers:
        - image: ${deployment.containerImages?.[0] || ""}
          name: ${deploymentName}
          ports:
            - containerPort: 80`}
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

export default DeploymentDetailsTree;