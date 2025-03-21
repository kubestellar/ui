import { styled } from "@mui/material/styles";
import { Tab, Paper } from "@mui/material";

// Styled Components
export const StyledTab = styled(Tab)(({ theme }) => ({
  '&.Mui-selected': {
    color: theme.palette.primary.main,
    fontWeight: 600,
  },
  '&:hover': {
    backgroundColor: 'rgba(25, 118, 210, 0.04)',
    color: theme.palette.primary.main,
  },
  transition: 'all 0.2s ease',
  textTransform: 'none',
  fontSize: '14px',
}));

export const StyledPaper = styled(Paper)(({ theme }) => ({
  borderRadius: '8px',
  border: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(2),
  transition: 'all 0.2s ease',
  '&:hover': {
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
  },
}));

// Reusable Styles
export const getBaseStyles = (theme: string) => {
  const isDarkTheme = theme === "dark";
  
  return {
    bgColor: isDarkTheme ? "#1F2937" : "background.paper",
    textColor: isDarkTheme ? "white" : "black",
    helperTextColor: isDarkTheme
      ? "rgba(255, 255, 255, 0.7)"
      : "rgba(0, 0, 0, 0.6)",
  };
};

export const getTabContentStyles = (theme: string) => ({
  height: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 2,
  border: 1,
  borderColor: "divider",
  borderRadius: 1,
  p: 3,
  overflowY: "auto",
  flexGrow: 1,
  minHeight: 0,
  bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
});

export const getEnhancedTabContentStyles = (theme: string) => ({
  ...getTabContentStyles(theme),
  borderRadius: 2,
  boxShadow: theme === "dark" 
    ? "inset 0 1px 3px 0 rgba(0, 0, 0, 0.3)" 
    : "inset 0 1px 3px 0 rgba(0, 0, 0, 0.06)",
  transition: "all 0.2s ease-in-out",
  bgcolor: theme === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
});

export const getTabsStyles = (theme: string) => ({
  mt: 1.5,
  ml: 1.5,
  "& .MuiTabs-flexContainer": {
    gap: { xs: 1.5, sm: 2 },
  },
  "& .MuiTabs-indicator": {
    display: "none",
  },
  "& .MuiTabs-scroller": {
    pl: 0.5,
    overflow: "visible", 
  },
  "& .MuiTab-root": {
    minWidth: "auto",
    minHeight: { xs: 36, sm: 40 },
    px: { xs: 1.5, sm: 2 },
    py: { xs: 0.75, sm: 1 },
    mt: 0.5,
    mb: 0.5,
    color: "text.secondary",
    fontSize: { xs: "0.8rem", sm: "0.85rem" },
    fontWeight: 500,
    textTransform: "none",
    transition: "all 0.25s ease",
    borderRadius: "12px",
    position: "relative",
    overflow: "visible",
    border: "1px solid transparent",
    
    "&:hover": {
      backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
      color: theme === "dark" ? "common.white" : "primary.main",
      borderColor: theme === "dark" ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)", 
      "& .iconContainer": {
        backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
        transform: "scale(1.05)",
      },
    },
    
    "&.Mui-selected": {
      color: theme === "dark" ? "common.white" : "primary.main",
      backgroundColor: theme === "dark" ? "rgba(47, 134, 255, 0.08)" : "rgba(47, 134, 255, 0.05)",
      fontWeight: 600,
      border: theme === "dark" 
        ? "1px solid rgba(47, 134, 255, 0.7)" 
        : "1px solid rgba(25, 118, 210, 0.7)",
      boxShadow: theme === "dark" 
        ? "0 0 8px rgba(47, 134, 255, 0.4)" 
        : "0 0 6px rgba(47, 134, 255, 0.3)",
      zIndex: 1,
      position: "relative",
      "&:before": {
        display: "none",
      },
      "&:after": {
        display: "none",
      },
      "& .iconContainer": {
        backgroundColor: theme === "dark" ? "rgba(47, 134, 255, 0.2)" : "rgba(47, 134, 255, 0.1)",
        transform: "scale(1.1)",
        color: "primary.main",
      }
    },
  },
});

export const getDialogPaperProps = (theme: string) => ({
  height: { xs: "90vh", sm: "85vh", md: "80vh" },
  display: "flex",
  flexDirection: "column",
  m: { xs: 0.5, sm: 1, md: 2 },
  bgcolor: theme === "dark" ? "#1F2937" : "background.paper",
  color: theme === "dark" ? "white" : "black",
  borderRadius: { xs: 1, sm: 2, md: 3 },
  overflow: 'hidden',
  boxShadow: theme === "dark" 
    ? "0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 10px 10px -5px rgba(0, 0, 0, 0.5)" 
    : "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
  border: theme === "dark" ? `1px solid divider` : "none",
  maxWidth: { sm: "98%", md: "95%", lg: "1000px" }
}); 