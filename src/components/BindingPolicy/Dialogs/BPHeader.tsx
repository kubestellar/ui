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
import { Search, Filter, Plus, X, Trash2 } from "lucide-react";
import CreateBindingPolicyDialog, {PolicyData} from "../CreateBindingPolicyDialog";
import useTheme from "../../../stores/themeStore";

interface BPHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  createDialogOpen: boolean;
  setCreateDialogOpen: (open: boolean) => void;
  onCreatePolicy: (policyData: PolicyData) => void;
  activeFilters: { status?: "Active" | "Inactive" | "Pending" };
  setActiveFilters: (filters: {
    status?: "Active" | "Inactive" | "Pending";
  }) => void;
  selectedPolicies: string[];
  onBulkDelete: () => void;
}

const BPHeader: React.FC<BPHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  createDialogOpen,
  setCreateDialogOpen,
  onCreatePolicy,
  activeFilters,
  setActiveFilters,
  selectedPolicies,
  onBulkDelete,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setAnchorEl(null);
  };

  const handleStatusFilter = (status: string | undefined) => {
    setActiveFilters({
      ...activeFilters,
      status: status as "Active" | "Inactive" | "Pending" | undefined,
    });
    handleFilterClose();
  };
  const theme = useTheme((state) => state.theme) 

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
                <Search
                  size={20}
                  style={{ color: theme === "dark" ? "#ffffff" : "inherit" }}
                />
              </InputAdornment>
            ),
          }}
          sx={{
            ...(theme === "dark" && {
              input: { color: "white" },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "white" },
              },
              "&::placeholder": { color: "rgba(255, 255, 255, 0.7)" },
            }),
          }}
        />

        <Button
          startIcon={<Filter size={20} />}
          variant="outlined"
          onClick={handleFilterClick}
          color={Object.keys(activeFilters).length > 0 ? "primary" : "inherit"}
          sx={{
            ...(theme === "dark" && {
              borderColor: "white", 
              color: "white", 
              "&:hover": {
                borderColor: "white", 
              },
            }),
          }}
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

        {selectedPolicies.length > 0 && (
          <Button
            startIcon={<Trash2 size={20} />}
            variant="outlined"
            color="error"
            onClick={onBulkDelete}
            sx={{
              ...(theme === "dark" && {
                borderColor: "error.main",
                color: "error.main",
                "&:hover": {
                  borderColor: "error.main",
                },
              }),
            }}
          >
            Delete Selected ({selectedPolicies.length})
          </Button>
        )}

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleFilterClose}
          PaperProps={{
            sx: {
              ...(theme === "dark" && {
                backgroundColor: "#1e293b",
                color: "white",
              }),
            },
          }}
        >
          <MenuItem
            sx={{
              ...(theme === "dark" && {
                backgroundColor: "#1e293b",
                color: "white",
                "&:hover": { backgroundColor: "#0f172a" },
              }),
            }}
            onClick={() => handleStatusFilter("Active")}
          >
            Status: Active
          </MenuItem>
          <MenuItem
            sx={{
              ...(theme === "dark" && {
                backgroundColor: "#1e293b",
                color: "white",
                "&:hover": { backgroundColor: "#0f172a" },
              }),
            }}
            onClick={() => handleStatusFilter("Pending")}
          >
            Status: Pending
          </MenuItem>
          <MenuItem
            sx={{
              ...(theme === "dark" && {
                backgroundColor: "#1e293b",
                color: "white",
                "&:hover": { backgroundColor: "#0f172a" },
              }),
            }}
            onClick={() => handleStatusFilter("Inactive")}
          >
            Status: Inactive
          </MenuItem>
          {activeFilters.status && (
            <MenuItem
              sx={{
                ...(theme === "dark" && {
                  backgroundColor: "#1e293b",
                  color: "white",
                  "&:hover": { backgroundColor: "#0f172a" },
                }),
              }}
              onClick={() => handleStatusFilter(undefined)}
            >
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