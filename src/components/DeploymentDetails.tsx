
import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Collapse,
  Alert,
  CircularProgress,
} from "@mui/material";
import { FiChevronDown, FiChevronUp, FiX } from "react-icons/fi";
import { api } from "../lib/api";
import { useParams, useNavigate } from "react-router-dom";
import useTheme from "../stores/themeStore";

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

const DeploymentDetails = () => {
  const { namespace, deploymentName } = useParams();
  const [deployment, setDeployment] = useState<DeploymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme((state) => state.theme)
  
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDeploymentData = async () => {
      try {
        const response = await api.get(`/api/wds/${deploymentName}?namespace=${namespace}`);
        const data = response.data;

        setDeployment({
          name: data.metadata?.name || "Unknown",
          namespace: data.metadata?.namespace || "Unknown",
          createdAt: data.metadata?.creationTimestamp || "N/A",
          age: "TODO: Calculate Age",
          uid: data.metadata?.uid || "N/A",
          rollingUpdateStrategy: data.spec?.strategy?.rollingUpdate || {},
          replicas: data.status?.replicas || 0,
          updatedReplicas: data.status?.updatedReplicas || 0,
          availableReplicas: data.status?.availableReplicas || 0,
          conditions: data.status?.conditions?.map((cond: { type: string; status: string; lastProbeTime?: string; reason?: string; message?: string }) => ({
            type: cond.type,
            status: cond.status,
            lastProbeTime: cond.lastProbeTime || "N/A",
            reason: cond.reason || "N/A",
            message: cond.message || "N/A"
          })) || [],
          containerImages: data.spec?.template?.spec?.containers?.map((container: { image: string }) => container.image) || [],
          resourceInfo: {
            strategy: data.spec?.strategy?.type || "N/A",
            minReadySeconds: data.spec?.minReadySeconds || 0,
            revisionHistoryLimit: data.spec?.revisionHistoryLimit || 0,
          },
          newReplicaSet: data.status?.newReplicaSet || {},
          oldReplicaSet: data.status?.oldReplicaSet || {},
          events: data.status?.events || [],
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Paper elevation={3} 
    sx={{ p: 3,
      bgcolor: theme === "dark" ? "#1F2937" : "background.paper",
      color: theme === "dark" ? "#ffffff" : "#000000",
      borderRadius: 2 
      }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Deployment Details: {deployment?.name}
        </Typography>
        <IconButton onClick={() => navigate(-1)} sx={{ color: "error.main" }}>
          <FiX />
        </IconButton>
      </Box>

      <Box display="flex" flexDirection="column"  gap={3}>
        <DetailsTable title="Metadata" headers={["Name", "Namespace", "Created At", "Age", "UID"]} rows={[
          [deployment?.name, deployment?.namespace, deployment?.createdAt, deployment?.age, deployment?.uid]
        ]} />

        <DetailsTable title="Resource Information" headers={["Strategy", "Min Ready Seconds", "Revision History Limit"]} rows={[
          [deployment?.resourceInfo?.strategy, deployment?.resourceInfo?.minReadySeconds, deployment?.resourceInfo?.revisionHistoryLimit]
        ]} />

        <DetailsTable title="Rolling Update Strategy" headers={["Max Surge", "Max Unavailable"]} rows={[
          [deployment?.rollingUpdateStrategy?.maxSurge || "N/A", deployment?.rollingUpdateStrategy?.maxUnavailable || "N/A"]
        ]} />

        <DetailsTable title="Pod Status" headers={["Updated", "Available", "Total"]} rows={[
          [deployment?.updatedReplicas, deployment?.availableReplicas, deployment?.replicas]
        ]} />

        <DetailsTable title="Conditions" headers={["Type", "Status", "Reason", "Message"]} rows={
          deployment?.conditions?.map(cond => [cond.type, cond.status, cond.reason, cond.message]) || []
        } />

        <DetailsTable title="Container Images" headers={["Image"]} rows={
          deployment?.containerImages?.map(img => [img]) || []
        } />

        <DetailsTable title="New Replica Set" headers={["Name", "Namespace", "Age", "Pods", "Labels", "Images"]} rows={[
          [deployment?.newReplicaSet?.name, deployment?.newReplicaSet?.namespace, deployment?.newReplicaSet?.age, deployment?.newReplicaSet?.pods, deployment?.newReplicaSet?.labels, deployment?.newReplicaSet?.images?.join(", ")]
        ]} />

        <DetailsTable title="Old Replica Set" headers={["Name", "Namespace", "Age", "Pods", "Labels", "Images"]} rows={[
          [deployment?.oldReplicaSet?.name, deployment?.oldReplicaSet?.namespace, deployment?.oldReplicaSet?.age, deployment?.oldReplicaSet?.pods, deployment?.oldReplicaSet?.labels, deployment?.oldReplicaSet?.images?.join(", ")]
        ]} />

        <DetailsTable title="Events" headers={["Type", "Reason", "Message", "Count", "First Timestamp", "Last Timestamp"]} rows={
          deployment?.events?.map(event => [event.type, event.reason, event.message, event.count, event.firstTimestamp, event.lastTimestamp]) || []
        } />
      </Box>
    </Paper>
  );
};

interface DetailsTableProps {
  title: string;
  headers: string[];
  rows: (string | number | React.ReactNode)[][];
}

  const DetailsTable = ({ title, headers, rows }: DetailsTableProps) => {
    const [showDetails, setShowDetails] = useState(true);
    const theme = useTheme((state) => state.theme)


    return (
      <Paper elevation={1} sx={{ p: 2,
        bgcolor: theme === "dark" ? "#374151" : "background.paper",
        color: theme === "dark" ? "#ffffff" : "#000000",
        borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="bold">
            {title}
          </Typography>
          <IconButton sx={{color: theme === "dark" ? "#ffffff" : "#000000",}} onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? <FiChevronUp /> : <FiChevronDown />}
          </IconButton>
        </Box>
        <Collapse in={showDetails}>
        <Table>
  <TableHead>
    <TableRow>
      {headers.map((header, idx) => (
        <TableCell
          key={idx}
          sx={{
            variant: "h6",
            fontWeight: "bold",
            color: theme === "dark" ? "#ffffff" : "text.secondary", // Set white text in dark mode
            borderBottom: "none",
          }}
        >
          {header}
        </TableCell>
      ))}
    </TableRow>
  </TableHead>
  <TableBody>
    {rows.length > 0 ? (
      rows.map((row, rowIndex) => (
        <TableRow key={rowIndex}>
          {row.map((cell, cellIndex) => (
            <TableCell
              key={cellIndex}
              sx={{
                borderBottom: "none",
                color: theme === "dark" ? "#ffffff" : "inherit", // Ensure text remains white in dark mode
              }}
            >
              {cell || "-"}
            </TableCell>
          ))}
        </TableRow>
      ))
    ) : (
      <TableRow>
        <TableCell
          colSpan={headers.length}
          align="center"
          sx={{
            borderBottom: "none",
            color: theme === "dark" ? "#ffffff" : "inherit",
          }}
        >
          No data available
        </TableCell>
      </TableRow>
    )}
  </TableBody>
</Table>

        </Collapse>
      </Paper>
    );
};

export default DeploymentDetails;
