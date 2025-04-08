import React, { useEffect, useState } from "react";
import { Box, Typography, Table, TableBody, TableCell, TableHead, TableRow, IconButton } from "@mui/material";
import { FiX } from "react-icons/fi";
import { ResourceItem } from "./TreeViewComponent"; // Adjust the import path
import useTheme from "../stores/themeStore";
import DynamicDetailsPanel from "./DynamicDetailsPanel"; // Adjust the import path
import SettingsIcon from '@mui/icons-material/Settings'; // Placeholder for ArgoCD icon; replace with actual ArgoCD icon if available

interface GroupPanelProps {
  namespace: string;
  groupType: string;
  groupItems: ResourceItem[];
  onClose: () => void;
  onItemSelect: (item: ResourceItem) => void;
}

const GroupPanel: React.FC<GroupPanelProps> = ({ namespace, groupType, groupItems, onClose }) => {
  const theme = useTheme((state) => state.theme);
  const [selectedItem, setSelectedItem] = useState<ResourceItem | null>(null);

  useEffect(() => {
    setSelectedItem(null); // Reset selected item when panel opens
  }, [groupType, groupItems]);

  const handleItemClick = (item: ResourceItem) => {
    setSelectedItem(item);
  };

  // Placeholder for Sync Order (you can replace with actual logic if available)
  // const getSyncOrder = (item: ResourceItem) => "-"; // Default value; adjust based on your data
  
  return (
    <Box
      sx={{
        position: "fixed",
        right: 0,
        top: 0,
        bottom: 0,
        width: "80vw",
        bgcolor: theme === "dark" ? "#1F2937" : "#F8F9FA",
        boxShadow: "-2px 0 10px rgba(0,0,0,0.2)",
        transition: "right 0.4s ease-in-out",
        zIndex: 1002,
        overflowY: "auto",
        borderTopLeftRadius: "8px",
        borderBottomLeftRadius: "8px",
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        p={2}
        sx={{ borderBottom: `1px solid ${theme === "dark" ? "#374151" : "#E9ECEF"}` }}
      >
        <Typography
          variant="h4"
          fontWeight="bold"
          sx={{ color: theme === "dark" ? "#FFFFFF" : "#343A40", fontSize: "24px" }}
        >
          {groupType.toUpperCase()}'S
        </Typography>
        <IconButton onClick={onClose} sx={{ color: theme === "dark" ? "#D1D5DB" : "#6C757D" }}>
          <FiX />
        </IconButton>
      </Box>
      <Box sx={{ p: 2 }}>
        <Table sx={{ minWidth: 650, borderCollapse: "separate", borderSpacing: 0 }} aria-label="group items table">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: theme === "dark" ? "#D1D5DB" : "#6C757D", fontWeight: "bold", padding: "8px" }}></TableCell>
              <TableCell sx={{ color: theme === "dark" ? "#D1D5DB" : "#6C757D", fontWeight: "bold", padding: "8px" }}>Name</TableCell>
              <TableCell sx={{ color: theme === "dark" ? "#D1D5DB" : "#6C757D", fontWeight: "bold", padding: "8px" }}>Group/Kind</TableCell>
              <TableCell sx={{ color: theme === "dark" ? "#D1D5DB" : "#6C757D", fontWeight: "bold", padding: "8px" }}>Sync Order</TableCell>
              <TableCell sx={{ color: theme === "dark" ? "#D1D5DB" : "#6C757D", fontWeight: "bold", padding: "8px" }}>Namespace</TableCell>
              <TableCell sx={{ color: theme === "dark" ? "#D1D5DB" : "#6C757D", fontWeight: "bold", padding: "8px" }}>Created At</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groupItems.map((item, index) => (
              <TableRow
                key={index}
                onClick={() => handleItemClick(item)}
                sx={{
                  "&:hover": {
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)", // Subtle hover shadow
                  },
                  cursor: "pointer",
                  // backgroundColor: "#FFFFFF", // White background for each card
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)", // Very subtle shadow
                  marginBottom: "10px", // Vertical gap between cards to match ArgoCD
                  "& td": {
                    borderBottom: "none", // Remove default table borders
                    padding: "20px 10px", // Match ArgoCD padding
                  },
                  "&:last-child": {
                    marginBottom: 0, // No margin for the last item
                  },
                  ...(selectedItem === item && {
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)", // Enhanced shadow when selected
                    backgroundColor: theme === "dark" ? "#2D3748" : "#E9ECEF", // Selection highlight
                  }),
                }}
              >
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center", padding: "0" , marginBottom:"10px" }}>
                    <SettingsIcon sx={{ color: theme === "dark" ? "#D1D5DB" : "#6C757D", marginRight: "8px" }} />
                  </Box>
                </TableCell>
                <TableCell sx={{ color: theme === "dark" ? "#D1D5DB" : "#343A40", verticalAlign: "top" }}>
                  {item.metadata.name}
                </TableCell>
                <TableCell sx={{ color: theme === "dark" ? "#9CA3AF" : "#6C757D", verticalAlign: "top" }}>
                  {item.kind}
                </TableCell>
                <TableCell sx={{ color: theme === "dark" ? "#9CA3AF" : "#6C757D", verticalAlign: "top" }}>
                  {"-"}
                </TableCell>
                <TableCell sx={{ color: theme === "dark" ? "#9CA3AF" : "#6C757D", verticalAlign: "top" }}>
                  {item.metadata.namespace || namespace}
                </TableCell>
                <TableCell sx={{ color: theme === "dark" ? "#9CA3AF" : "#6C757D", verticalAlign: "top" }}>
                  {item.metadata.creationTimestamp || "N/A"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      {selectedItem && (
        <DynamicDetailsPanel
          namespace={namespace}
          name={selectedItem.metadata.name}
          type={groupType.toLowerCase()}
          resourceData={selectedItem}
          onClose={() => setSelectedItem(null)}
          isOpen={true}
          initialTab={0}
        />
      )}
    </Box>
  );
};

// Placeholder function for Sync Order
// const getSyncOrder = (item: ResourceItem) => "-"; // Default value; adjust based on your data

export default GroupPanel;