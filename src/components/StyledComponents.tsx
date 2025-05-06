import { Box, Paper, Tab, styled } from "@mui/material";
import useTheme from "../stores/themeStore"; // Import useTheme for dark mode support

export const StyledTab = styled(Tab)(({ theme }) => {
  const appTheme = useTheme((state) => state.theme); // Get the current theme
  return {
    textTransform: "none",
    fontWeight: 500,
    fontSize: "0.8rem",
    color: appTheme === "dark" ? "#fff" : theme.palette.grey[600], // Light text in dark mode
    padding: "10px 17px",
    minHeight: "40px",
    marginBottom:"3px",
    marginLeft: "16px",
    marginTop: "4px",
    borderRadius: "12px 12px 12px 12px",
    border: "1px solid transparent",
    transition: "background-color 0.2s ease, border-color 0.2s ease",
    overflow: "hidden", // Added to fix Safari rendering
    WebkitAppearance: "none", // Added to fix Safari rendering
    "&.Mui-selected": {
      // color: "#1976d2", // Keep the selected color consistent
      color: appTheme === "dark" ? "#fff" : "#1976d2", // Keep the selected color consistent
      fontWeight: 600,
      border: "1px solid rgba(25, 118, 210, 0.7)",
      // Replaced complex box-shadow with simpler alternative for Safari
      boxShadow: "none", 
      WebkitBoxShadow: appTheme === "dark" 
        ? "0 0 0 1px rgba(47, 134, 255, 0.7)" 
        : "0 0 0 1px rgba(25, 118, 210, 0.7)",
      zIndex: 1,
      position: "relative",
    },
    "&:hover": {
      backgroundColor: appTheme === "dark" ? "#333" : "#f4f4f4", // Darker hover in dark mode
      border: appTheme === "dark" ? "1px solid #444" : "1px solid rgba(0, 0, 0, 0.1)", // Darker border in dark mode
    },
  };
});

export const StyledPaper = styled(Paper)(({ theme }) => {
  const appTheme = useTheme((state) => state.theme); // Get the current theme
  return {
    border: `2px dashed ${appTheme === "dark" ? "#444" : "rgba(0, 0, 0, 0.12)"}`, // Darker border in dark mode
    borderRadius: "8px",
    padding: theme.spacing(4),
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    height: "450px",
    width: "100%",
    margin: "0 auto",
    gap: theme.spacing(1.5),
    outline: "none !important",
    boxShadow: "none !important",
    backgroundColor: appTheme === "dark" ? "#00000033" : theme.palette.background.paper, // Dark background in dark mode
    "&:hover": {
      borderColor: theme.palette.primary.main,
      backgroundColor: appTheme === "dark" ? "#00000033" : "#F5FAFF", // Darker hover in dark mode
    },
  };
});

export const StyledContainer = styled(Box)(({ theme }) => {
  const appTheme = useTheme((state) => state.theme); // Get the current theme
  return {
    backgroundColor: appTheme === "dark" ? "#00000033" : "rgba(255, 255, 255, 0.8)", // Dark background in dark mode
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
    border: appTheme === "dark" ? "1px solid #444" : "1px solid rgba(0, 0, 0, 0.1)", // Darker border in dark mode
    padding: theme.spacing(3),
    display: "flex",
    flexDirection: "column",
    height: "97.5%",
    position: "relative",
    minHeight: "400px",
    WebkitOverflowScrolling: "touch", // Improves scrolling performance in Safari
    "@media screen and (min-width: 0\0)": { 
      height: "auto",
      minHeight: "400px",
    },
    "@supports (-webkit-touch-callout: none)": { 
      height: "auto",
      minHeight: "400px",
      WebkitBorderRadius: "8px", // Explicitly set for Safari
    },
  };
});