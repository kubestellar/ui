import React, { useContext } from 'react';
import { Box, Typography, Button } from "@mui/material";
import { ThemeContext } from "../../context/ThemeContext";

interface PaginationProps {
  filteredCount: number;
  totalCount: number;
  itemsPerPage?: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

const BPPagination: React.FC<PaginationProps> = ({
  filteredCount,
  totalCount,
  itemsPerPage = 10,
  currentPage,
  onPageChange
}) => {
  const { theme } = useContext(ThemeContext);
  const totalPages = Math.ceil(filteredCount / itemsPerPage);
  
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 1) return [1];
    
    const range: (number | string)[] = [];
    let lastNumber: number | null = null;

    range.push(1);

    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
      if (i > 1 && i < totalPages) {
        if (lastNumber && i > lastNumber + 1) {
          range.push('...');
        }
        range.push(i);
        lastNumber = i;
      }
    }

    if (lastNumber && totalPages > lastNumber + 1) {
      range.push('...');
    }
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const startRange = ((currentPage - 1) * itemsPerPage) + 1;
  const endRange = Math.min(currentPage * itemsPerPage, filteredCount);

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mt: 2,
      }}
    >
      <Typography 
        variant="body2" 
        sx={{ 
          color: theme === "dark" ? "white" : "text.secondary"
        }}
      >
        Showing {startRange} to {endRange} of {filteredCount} entries
        {filteredCount !== totalCount && ` (filtered from ${totalCount} total entries)`}
      </Typography>
      
      <Box sx={{ display: "flex", gap: 0.5 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          sx={{
            minWidth: 'auto',
            px: 1,
            color: theme === "dark" ? "white" : "primary.main",
            borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.23)" : "rgba(25, 118, 210, 0.5)",
            '&:hover': {
              borderColor: theme === "dark" ? "white" : "primary.main",
              backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(25, 118, 210, 0.04)"
            },
            '&.Mui-disabled': {
              cursor: 'not-allowed',
              pointerEvents: "all !important",
              backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
              borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.26)",
              color: theme === "dark" ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.26)"
            }
          }}
        >
          Prev
        </Button>

        {getPageNumbers().map((pageNumber, index) => (
          <Button
            key={index}
            variant={pageNumber === currentPage ? "contained" : "outlined"}
            size="small"
            disabled={pageNumber === '...'}
            onClick={() => typeof pageNumber === 'number' ? handlePageChange(pageNumber) : undefined}
            sx={{
              minWidth: 35,
              px: 1,
              color: pageNumber === currentPage 
                ? "white" 
                : theme === "dark" ? "white" : "primary.main",
              borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.23)" : "rgba(25, 118, 210, 0.5)",
              backgroundColor: pageNumber === currentPage 
                ? "primary.main" 
                : "transparent",
              '&:hover': {
                borderColor: theme === "dark" ? "white" : "primary.main",
                backgroundColor: pageNumber === currentPage 
                  ? "primary.dark"
                  : theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(25, 118, 210, 0.04)"
              },
              '&.Mui-disabled': {
                cursor: 'not-allowed',
                pointerEvents: "all !important",
                backgroundColor: pageNumber === '...' 
                  ? 'transparent' 
                  : theme === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
                borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.26)",
                color: theme === "dark" ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.26)"
              }
            }}
          >
            {pageNumber}
          </Button>
        ))}

        <Button
          variant="outlined"
          size="small"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          sx={{
            minWidth: 'auto',
            px: 1,
            color: theme === "dark" ? "white" : "primary.main",
            borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.23)" : "rgba(25, 118, 210, 0.5)",
            '&:hover': {
              borderColor: theme === "dark" ? "white" : "primary.main",
              backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(25, 118, 210, 0.04)"
            },
            '&.Mui-disabled': {
              cursor: 'not-allowed',
              pointerEvents: "all !important",
              backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)",
              borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.26)",
              color: theme === "dark" ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.26)"
            }
          }}
        >
          Next
        </Button>
      </Box>
    </Box>
  );
};

export default BPPagination;