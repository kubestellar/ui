import React, { useState,useContext } from "react";
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
import { ThemeContext } from "../../../context/ThemeContext";

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
  const { theme } = useContext(ThemeContext); 

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
              borderColor: "white", // Ensures the border is white
              color: "white", // Ensures the text is white
              "&:hover": {
                borderColor: "white", // Ensures border color remains white on hover
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
