// components/ContextDropdown.tsx
import { useState, useEffect } from "react";
import { Box, MenuItem, Select } from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";
import { toast } from "react-hot-toast";
// import "react-toastify/dist/ReactToastify.css";

interface ContextDropdownProps {
  onContextChange: (context: string) => void;
}

const ContextDropdown = ({ onContextChange }: ContextDropdownProps) => {
  const [contexts, setContexts] = useState<string[]>([]);
  const [currentContext, setCurrentContext] = useState<string>("wds1"); // Default from ui-wds-context

  useEffect(() => {
    fetch("http://localhost:4000/wds/get/context")
      .then((response) => response.json())
      .then((data) => {
        const contextList = data["other-wds-context"] || [];
        const uniqueContexts = [...new Set(["wds1", "wds2", ...contextList])];
        setContexts(uniqueContexts);
      })
      .catch((error) => console.error("Error fetching contexts:", error));
  }, []);

  const handleContextChange = (event: SelectChangeEvent<string>) => {
    const newContext = event.target.value as string;
    fetch("http://localhost:4000/wds/set/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context: newContext }),
    })
      .then((response) => response.json())
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
        sx={{ minWidth: 200, mr: 2, height: "50px", padding: "0 8px" , borderRadius:2}}
        variant="outlined"
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