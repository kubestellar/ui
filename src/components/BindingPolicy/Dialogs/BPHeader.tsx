import React, { useState } from "react";
import {
  Button,
  TextField,
  InputAdornment,
  Box,
  Menu,
  MenuItem,
  Chip,
} from "@mui/material";
import { Search, Filter, Plus,  X } from "lucide-react";
import CreateBindingPolicyDialog from "../../CreateBindingPolicyDialog";
import { BindingPolicyInfo } from "../../../types/bindingPolicy";

interface BPHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  createDialogOpen: boolean;
  setCreateDialogOpen: (open: boolean) => void;
  onCreatePolicy: (
    policyData: Omit<BindingPolicyInfo, "creationDate" | "clusters" | "status">
  ) => void;
  activeFilters: { status?: "Active" | "Inactive" };
  setActiveFilters: (filters: { status?: "Active" | "Inactive" }) => void;
}

const BPHeader: React.FC<BPHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  createDialogOpen,
  setCreateDialogOpen,
  onCreatePolicy,
  activeFilters,
  setActiveFilters,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setAnchorEl(null);
  };

  const handleStatusFilter = (status: "Active" | "Inactive" | undefined) => {
    setActiveFilters({ ...activeFilters, status });
    handleFilterClose();
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mb: 3,
      }}
    >
      <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
        <TextField
          size="small"
          placeholder="Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={20} />
              </InputAdornment>
            ),
          }}
        />
        <Button
          startIcon={<Filter size={20} />}
          variant="outlined"
          onClick={handleFilterClick}
          color={Object.keys(activeFilters).length > 0 ? "primary" : "inherit"}
        >
          Filter
        </Button>
        {activeFilters.status && (
          <Chip
            label={`Status: ${activeFilters.status}`}
            onDelete={() => handleStatusFilter(undefined)}
            deleteIcon={<X size={16} />}
          />
        )}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleFilterClose}
        >
          <MenuItem onClick={() => handleStatusFilter("Active")}>
            Status: Active
          </MenuItem>
          <MenuItem onClick={() => handleStatusFilter("Inactive")}>
            Status: Inactive
          </MenuItem>
          {activeFilters.status && (
            <MenuItem onClick={() => handleStatusFilter(undefined)}>
              Clear Status Filter
            </MenuItem>
          )}
        </Menu>
      </Box>

      <CreateBindingPolicyDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreatePolicy={onCreatePolicy}
      />

      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<Plus size={20} />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create Binding Policy
        </Button>
      </Box>
    </Box>
  );
};

export default BPHeader;
