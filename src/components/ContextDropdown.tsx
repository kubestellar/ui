// components/ContextDropdown.tsx
import { useState, useEffect } from "react";
import { Box, MenuItem, Select } from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";
import { toast } from "react-hot-toast";
import useTheme from "../stores/themeStore";
import { api } from "../lib/api";

interface ContextDropdownProps {
  onContextChange: (context: string) => void;
}

const ContextDropdown = ({ onContextChange }: ContextDropdownProps) => {
  const [contexts, setContexts] = useState<string[]>([]);
  const [currentContext, setCurrentContext] = useState<string>("wds1"); // Default from ui-wds-context
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
    api.post("/wds/set/context", { context: newContext })
      .then(() => {
        setCurrentContext(newContext);
        toast.success(`Switched to ${newContext} context`, {
          position: "top-center",
        });
        if (onContextChange) onContextChange(newContext);
      })
      .catch((error) => {
        console.error("Error switching context:", error);
        toast.error(`Failed to switch to ${newContext} context`, {
          position: "top-center",
        });
      });
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
      <Select
        value={currentContext}
        onChange={handleContextChange}
        sx={{ 
          minWidth: 200, 
          mr: 2, 
          height: "50px", 
          padding: "0 8px",
          borderRadius: 2,
        
          color: theme === "dark" ? "#FFFFFF" : "#121212",
          borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.23)" : "rgba(0, 0, 0, 0.23)",
          backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "transparent",
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
        MenuProps={{
          PaperProps: {
            sx: {
              backgroundColor: theme === "dark" ? "#333333" : "#FFFFFF",
              "& .MuiMenuItem-root": {
                color: theme === "dark" ? "#FFFFFF" : "inherit"
              }
            }
          }
        }}
      >
        {contexts.map((context) => (
          <MenuItem key={context} value={context} sx={{ height: "30px", padding: "0 8px" }}>
            {context}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
};

export default ContextDropdown;