import React, { useState } from "react";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Chip,
  IconButton,
  Box,
  Tooltip,
} from "@mui/material";
import { Info, Trash2, Edit2 } from "lucide-react";
import { BindingPolicyInfo } from "../../types/bindingPolicy";
import PolicyDetailDialog from "./Dialogs/PolicyDetailDialog";
import useTheme from "../../stores/themeStore";

interface BPTableProps {
  policies: BindingPolicyInfo[];
  onPreviewMatches: (policy: BindingPolicyInfo) => void;
  onDeletePolicy: (policy: BindingPolicyInfo) => void;
  onEditPolicy: (policy: BindingPolicyInfo) => void;
  activeFilters: { status?: "Active" | "Inactive" | "Pending" };
}

const BPTable: React.FC<BPTableProps> = ({
  policies,
  onPreviewMatches,
  onDeletePolicy,
  onEditPolicy,
  activeFilters,
}) => {
  const [selectedPolicy, setSelectedPolicy] =
    useState<BindingPolicyInfo | null>(null);

  const handlePolicyClick = (policy: BindingPolicyInfo) => {
    setSelectedPolicy(policy);
  };

  const handleEdit = (policy: BindingPolicyInfo) => {
    setSelectedPolicy(null);
    onEditPolicy(policy);
  };

  const filteredPolicies = policies.filter((policy) => {
    if (!policy) return false;
    if (activeFilters.status && policy.status !== activeFilters.status) {
      return false;
    }
    return true;
  });
  const theme = useTheme((state) => state.theme)

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "success";
      case "pending":
        return "warning";
      case "inactive":
        return "error";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return <span>✓</span>;
      case "pending":
        return <span>⋯</span>;
      case "inactive":
        return <span>✗</span>;
      default:
        return undefined;
    }
  };

  const renderClusterChip = (policy: BindingPolicyInfo) => {
    if (!policy.clusterList || policy.clusterList.length === 0) {
      return <Chip label="0" size="small" color="default" />;
    }

    return (
      <Tooltip title={policy.clusterList.join(", ")} arrow>
        <Chip label={policy.clusters} size="small" color="success" />
      </Tooltip>
    );
  };

  const renderWorkloadChip = (policy: BindingPolicyInfo) => {
    if (!policy.workloadList || policy.workloadList.length === 0) {
      return <Chip label="None" size="small" color="default" />;
    }

    const displayText =
      policy.workloadList.length > 1
        ? `${policy.workloadList[0]} +${policy.workloadList.length - 1}`
        : policy.workloadList[0];

    return (
      <Tooltip title={policy.workloadList.join(", ")} arrow>
        <Chip label={displayText} size="small" color="success" />
      </Tooltip>
    );
  };

  return (
    <>
      <Table>
        <TableHead>
          <TableRow className={theme === "dark" ? "!text-white" : ""}>
            <TableCell className="!text-lg !text-inherit">
              Binding Policy Name
            </TableCell>
            <TableCell className="!text-lg !text-inherit">Clusters</TableCell>
            <TableCell className="!text-lg !text-inherit">Workload</TableCell>
            <TableCell className="!text-lg !text-inherit">
              Creation Date
            </TableCell>
            <TableCell className="!text-lg !text-inherit">Status</TableCell>
            <TableCell className="!text-lg !text-inherit" align="right">
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredPolicies.map((policy) => (
            <TableRow key={policy.name}>
              <TableCell>
                <Button
                  color="primary"
                  sx={{ textTransform: "none" }}
                  onClick={() => handlePolicyClick(policy)}
                >
                  {policy.name}
                </Button>
              </TableCell>
              <TableCell>{renderClusterChip(policy)}</TableCell>
              <TableCell>{renderWorkloadChip(policy)}</TableCell>
              <TableCell sx={{ color: theme === "dark" ? "white" : "inherit" }}>
                {policy.creationDate}
              </TableCell>
              <TableCell>
                <Chip
                  label={policy.status}
                  size="small"
                  color={getStatusColor(policy.status)}
                  sx={{
                    "& .MuiChip-label": {
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    },
                  }}
                  icon={getStatusIcon(policy.status)}
                />
              </TableCell>
              <TableCell align="right">
                <Box
                  sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}
                >
                  <IconButton
                    sx={{ color: theme === "dark" ? "white" : "inherit" }}
                    size="small"
                    onClick={() => onEditPolicy(policy)}
                  >
                    <Edit2 />
                  </IconButton>
                  <IconButton
                    sx={{ color: theme === "dark" ? "white" : "inherit" }}
                    size="small"
                    onClick={() => onPreviewMatches(policy)}
                  >
                    <Info />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onDeletePolicy(policy)}
                  >
                    <Trash2 />
                  </IconButton>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedPolicy && (
        <PolicyDetailDialog
          open={Boolean(selectedPolicy)}
          onClose={() => setSelectedPolicy(null)}
          policy={selectedPolicy}
          onEdit={handleEdit}
        />
      )}
    </>
  );
};

export default BPTable;