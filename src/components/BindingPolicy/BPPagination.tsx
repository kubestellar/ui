import React,{useContext} from "react";
import { Box, Typography, Button } from "@mui/material";
import { ThemeContext } from "../../context/ThemeContext";

interface BPPaginationProps {
  filteredCount: number;
  totalCount: number;
}

const BPPagination: React.FC<BPPaginationProps> = ({
  filteredCount,
  totalCount,
}) => {
  const { theme } = useContext(ThemeContext); 
  return (
    <Box  
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mt: 2,
      }}
    >
      <Typography variant="body2" color="text.secondary"
      className={theme === "dark" ? "!text-white" : "" }>
        Showing {filteredCount} of {totalCount} entries
      </Typography>
      <Box sx={{ display: "flex", gap: 1 }}>
        {[1, 2, 3, "...", 40].map((page, index) => (
          <Button
            key={index}
            variant="outlined"
            size="small"
            sx={{ minWidth: 40 }}
          >
            {page}
          </Button>
        ))}
      </Box>
    </Box>
  );
};

export default BPPagination;
