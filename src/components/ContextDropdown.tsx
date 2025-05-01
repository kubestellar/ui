// components/ContextDropdown.tsx
import { useState, useEffect } from "react";
import { Box, MenuItem, Select, Typography, Chip } from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";
import { toast } from "react-hot-toast";
import useTheme from "../stores/themeStore";
import { api } from "../lib/api";
import FilterListIcon from '@mui/icons-material/FilterList';

interface ContextDropdownProps {
  onContextFilter: (context: string) => void;
  resourceCounts?: Record<string, number>; // Map of context to resource count
  totalResourceCount?: number; // Total resources across all contexts
}

const ContextDropdown = ({ 
  onContextFilter, 
  resourceCounts = {}, 
  totalResourceCount = 0 
}: ContextDropdownProps) => {
  const [contexts, setContexts] = useState<string[]>([]);
  const [selectedContext, setSelectedContext] = useState<string>("all"); // Default to show all contexts
  const theme = useTheme((state) => state.theme);

  useEffect(() => {
    api.get("/wds/get/context")
      .then((response) => {
        const contextList = response.data["other-wds-context"] || [];
        const uniqueContexts = [...new Set([...contextList])];
        setContexts(uniqueContexts);
      })
      .catch((error) => console.error("Error fetching contexts:", error));
  }, []);

  const handleContextChange = (event: SelectChangeEvent<string>) => {
    const newContext = event.target.value as string;
    setSelectedContext(newContext);
    
    // Notify parent component about the filter change
    if (onContextFilter) onContextFilter(newContext);
    
    // Show success toast with appropriate message
    if (newContext === "all") {
      toast.success("Showing resources from all contexts", {
        position: "top-center",
      });
    } else {
      toast.success(`Filtering to show only ${newContext} context`, {
        position: "top-center",
      });
    }
  };

  // Get count for a specific context
  const getContextCount = (context: string) => {
    if (context === "all") return totalResourceCount;
    return resourceCounts[context] || 0;
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography variant="body2" sx={{ color: theme === "dark" ? "#FFFFFF" : "#121212" }}>
        Filter by context:
      </Typography>
      
      <Box sx={{ position: "relative", minWidth: 200 }}>
        <Select
          value={selectedContext}
          onChange={handleContextChange}
          sx={{ 
            width: "100%",
            height: "40px", 
            borderRadius: 1,
            color: theme === "dark" ? "#FFFFFF" : "#121212",
            backgroundColor: "transparent",
            border: theme === "dark" ? "1px solid rgba(255, 255, 255, 0.23)" : "1px solid rgba(0, 0, 0, 0.23)",
            "& .MuiSvgIcon-root": { 
              color: theme === "dark" ? "#FFFFFF" : "inherit"
            },
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.23)" : "rgba(0, 0, 0, 0.23)"
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: theme === "dark" ? "#FFFFFF" : "rgba(0, 0, 0, 0.87)"
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: theme === "dark" ? "#90CAF9" : "#1976D2"
            }
          }}
          variant="outlined"
          displayEmpty
          renderValue={(selected) => (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FilterListIcon fontSize="small" sx={{ 
                color: theme === "dark" ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.54)"
              }} />
              {selected === "all" ? (
                <Typography sx={{ fontWeight: 400, fontSize: "0.9rem" }}>All Contexts</Typography>
              ) : (
                <Chip 
                  label={selected} 
                  size="small" 
                  sx={{ 
                    backgroundColor: theme === "dark" ? "rgba(144, 202, 249, 0.08)" : "rgba(25, 118, 210, 0.08)",
                    color: theme === "dark" ? "#90CAF9" : "#1976d2",
                    fontWeight: 500,
                    height: "24px"
                  }}
                />
              )}
            </Box>
          )}
          MenuProps={{
            PaperProps: {
              sx: {
                maxHeight: 300,
                marginTop: 1,
                backgroundColor: theme === "dark" ? "#333333" : "#FFFFFF",
                "& .MuiMenuItem-root": {
                  color: theme === "dark" ? "#FFFFFF" : "inherit",
                  fontSize: "0.9rem",
                  padding: "8px 16px",
                  "&:hover": {
                    backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)"
                  },
                  "&.Mui-selected": {
                    backgroundColor: theme === "dark" ? "rgba(144, 202, 249, 0.16)" : "rgba(25, 118, 210, 0.08)"
                  }
                }
              }
            }
          }}
        >
          <MenuItem 
            value="all" 
            sx={{ 
              fontWeight: selectedContext === "all" ? 500 : 400,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span>All Contexts</span>
            <Chip 
              label={totalResourceCount.toString()} 
              size="small"
              sx={{
                height: '20px',
                fontSize: '0.75rem',
                backgroundColor: theme === "dark" ? "rgba(144, 202, 249, 0.16)" : "rgba(25, 118, 210, 0.08)",
                color: theme === "dark" ? "#90CAF9" : "#1976d2"
              }}
            />
          </MenuItem>
          {contexts.map((context) => (
            <MenuItem 
              key={context} 
              value={context} 
              sx={{ 
                fontWeight: selectedContext === context ? 500 : 400,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <span>{context}</span>
              <Chip 
                label={getContextCount(context).toString()}
                size="small"
                sx={{
                  height: '20px',
                  fontSize: '0.75rem',
                  backgroundColor: getContextCount(context) > 0 
                    ? (theme === "dark" ? "rgba(144, 202, 249, 0.16)" : "rgba(25, 118, 210, 0.08)")
                    : (theme === "dark" ? "rgba(244, 67, 54, 0.16)" : "rgba(244, 67, 54, 0.08)"),
                  color: getContextCount(context) > 0
                    ? (theme === "dark" ? "#90CAF9" : "#1976d2")
                    : (theme === "dark" ? "#f44336" : "#d32f2f")
                }}
              />
            </MenuItem>
          ))}
        </Select>
      </Box>
    </Box>
  );
};

export default ContextDropdown;