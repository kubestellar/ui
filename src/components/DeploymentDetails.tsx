import { useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWDSQueries } from "../hooks/queries/useWDSQueries";
import { ThemeContext } from "../context/ThemeContext";
import LoadingFallback from "./LoadingFallback";
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableRow,
  TableCell,
  Alert,
} from "@mui/material";
import { FiX } from "react-icons/fi";

const DeploymentDetails = () => {
  const { namespace = "", deploymentName = "" } = useParams();
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const wdsQueries = useWDSQueries();
  
  const { 
    data: deployment, 
    isLoading, 
    isError, 
    error 
  } = wdsQueries.useWorkloadDetails(deploymentName, namespace);

  const { data: statusData } = wdsQueries.useWorkloadStatus();

  if (isLoading) {
    return <LoadingFallback message="Loading deployment details..." />;
  }

  if (isError) {
    return (
      <Alert severity="error" className="m-4">
        {error instanceof Error ? error.message : 'Failed to load deployment details'}
      </Alert>
    );
  }

  const status = statusData?.find(s => s.name === deploymentName)?.status || 'Unknown';

  return (
    <Paper className="m-4 p-4">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" color={theme === "dark" ? "white" : "inherit"}>
          Deployment Details: {deploymentName}
        </Typography>
        <IconButton onClick={() => navigate(-1)}>
          <FiX />
        </IconButton>
      </Box>

      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>{deployment.metadata.name}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Namespace</TableCell>
            <TableCell>{deployment.metadata.namespace}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Status</TableCell>
            <TableCell>{status}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Replicas</TableCell>
            <TableCell>{deployment.spec.replicas}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Created</TableCell>
            <TableCell>
              {new Date(deployment.metadata.creationTimestamp).toLocaleString()}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Paper>
  );
};

export default DeploymentDetails;