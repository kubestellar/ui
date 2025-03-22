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
  policyCount: number;
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
  policyCount,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme((state) => state.theme);
  const isDark = theme === "dark";

  const colors = {
    primary: "#2f86ff",
    primaryLight: "#9ad6f9",
    primaryDark: "#1a65cc",
    secondary: "#67c073",
    white: "#ffffff",
    background: isDark ? "#0f172a" : "#ffffff",
    paper: isDark ? "#1e293b" : "#f8fafc",
    text: isDark ? "#f1f5f9" : "#1e293b",
    textSecondary: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    success: "#67c073",
    warning: "#ffb347",
    error: "#ff6b6b",
    disabled: isDark ? "#475569" : "#94a3b8",
  };

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

  return (
    <div style={{ backgroundColor: colors.background, color: colors.text }}>
      <div className="mb-8 ">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2" style={{ color: colors.primary }}>
          <div>Manage Binding Policies</div>
          <span
            className="text-sm px-3 py-1 rounded-full"
            style={{
              backgroundColor: isDark ? "rgba(47, 134, 255, 0.2)" : "rgba(47, 134, 255, 0.1)",
              color: colors.primary,
            }}
          >
            {policyCount}
          </span>
        </h1>
        <p className="text-lg" style={{ color: colors.textSecondary }}>
          Create and manage binding policies for workload distribution
        </p>
      </div>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        {/* Left section - Search */}
        <Box sx={{ flex: 1 }}>
          <TextField
            size="small"
            placeholder="Search by name, label, or context"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search
                    size={20}
                    style={{ color: isDark ? "#ffffff" : "inherit" }}
                  />
                </InputAdornment>
              ),
            }}
            sx={{
              minWidth: "300px",
              width: "100%",
              maxWidth: "450px",
              ...(isDark && {
                input: { color: "white" },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "white" },
                  "&:hover fieldset": { borderColor: colors.primaryLight },
                  "&.Mui-focused fieldset": { borderColor: colors.primary },
                },
                "&::placeholder": { color: "rgba(255, 255, 255, 0.7)" },
              }),
              "& .MuiOutlinedInput-root": {
                height: "40px",
                borderRadius: "4px",
                "&:hover fieldset": { borderColor: colors.primaryLight },
                "&.Mui-focused fieldset": { borderColor: colors.primary },
              },
            }}
          />

          {/* Filter chips */}
          <Box sx={{ display: "flex", mt: 1, flexWrap: "wrap", gap: 1 }}>
            {activeFilters.status && (
              <Chip
                label={`Status: ${activeFilters.status}`}
                onDelete={() => handleStatusFilter(undefined)}
                deleteIcon={<X size={16} />}
                sx={{
                  backgroundColor: isDark ? "rgba(47, 134, 255, 0.15)" : "rgba(47, 134, 255, 0.08)",
                  color: colors.primary,
                  border: `1px solid ${isDark ? "rgba(47, 134, 255, 0.4)" : "rgba(47, 134, 255, 0.3)"}`,
                }}
              />
            )}

            {selectedPolicies.length > 0 && (
              <Button
                startIcon={<Trash2 size={20} />}
                variant="outlined"
                color="error"
                onClick={onBulkDelete}
                sx={{
                  ...(isDark && {
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
          </Box>
        </Box>
        
        {/* Center section - Status Filter */}
        <Box sx={{ display: "flex", justifyContent: "center", flex: 1 }}>
          <Button
            endIcon={<Filter size={18} />}
            variant="outlined"
            onClick={handleFilterClick}
            color={Object.keys(activeFilters).length > 0 ? "primary" : "inherit"}
            sx={{
              height: "40px",
              minWidth: "150px",
              borderRadius: "4px",
              textTransform: "none",
              paddingLeft: "16px",
              paddingRight: "16px",
              fontSize: "14px",
              justifyContent: "space-between",
              ...(isDark && {
                borderColor: colors.border, 
                color: "white", 
                "&:hover": {
                  borderColor: colors.primaryLight, 
                  backgroundColor: "rgba(47, 134, 255, 0.04)",
                },
              }),
              "& .MuiButton-endIcon": {
                marginLeft: "8px",
                marginRight: "0px",
              }
            }}
          >
            Status Filter
          </Button>
        </Box>

        {/* Right section - Create button */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", flex: 1 }}>
          <Button
            variant="contained"
            startIcon={<Plus size={20} />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              bgcolor: colors.primary,
              color: colors.white,
              "&:hover": { bgcolor: colors.primaryDark },
              textTransform: "none",
              fontWeight: "600",
              padding: "8px 20px",
              borderRadius: "8px",
              boxShadow: isDark
                ? "0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.2)"
                : "0 4px 6px -1px rgba(47, 134, 255, 0.2), 0 2px 4px -2px rgba(47, 134, 255, 0.1)",
            }}
          >
            Create Binding Policy
          </Button>
        </Box>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleFilterClose}
        PaperProps={{
          sx: {
            ...(isDark && {
              backgroundColor: "#1e293b",
              color: "white",
            }),
          },
        }}
      >
        <MenuItem
          sx={{
            ...(isDark && {
              backgroundColor: "#1e293b",
              color: "white",
              "&:hover": { backgroundColor: "#0f172a" },
            }),
          }}
          onClick={() => handleStatusFilter("Active")}
        >
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.success }}></span>
            Status: Active
          </span>
        </MenuItem>
        <MenuItem
          sx={{
            ...(isDark && {
              backgroundColor: "#1e293b",
              color: "white",
              "&:hover": { backgroundColor: "#0f172a" },
            }),
          }}
          onClick={() => handleStatusFilter("Pending")}
        >
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.warning }}></span>
            Status: Pending
          </span>
        </MenuItem>
        <MenuItem
          sx={{
            ...(isDark && {
              backgroundColor: "#1e293b",
              color: "white",
              "&:hover": { backgroundColor: "#0f172a" },
            }),
          }}
          onClick={() => handleStatusFilter("Inactive")}
        >
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.error }}></span>
            Status: Inactive
          </span>
        </MenuItem>
        {activeFilters.status !== undefined && (
          <MenuItem
            sx={{
              ...(isDark && {
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

      <CreateBindingPolicyDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreatePolicy={onCreatePolicy}
      />
    </div>
  );
};

export default BPHeader;