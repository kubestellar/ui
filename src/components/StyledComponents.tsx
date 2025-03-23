import { Box, Paper, Tab, styled } from "@mui/material";

export const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: "none",
  fontWeight: 500,
  fontSize: "0.8rem",
  color: theme.palette.grey[600],
  padding: "10px 17px",
  minHeight: "40px",
  marginLeft: "16px",
  marginTop: "4px",
  backgroundColor: "#fff",
  borderRadius: "12px 12px 12px 12px",
  border: "1px solid transparent",
  transition: "background-color 0.2s ease, border-color 0.2s ease",
  "&.Mui-selected": {
    color: "#1976d2",
    fontWeight: 600,
    backgroundColor: "rgba(47, 134, 255, 0.05)",
    border: "1px solid rgba(25, 118, 210, 0.7)",
    boxShadow: `
      -2px 0 6px rgba(47, 134, 255, 0.2),
      2px 0 6px rgba(47, 134, 255, 0.2),
      0 -2px 6px rgba(47, 134, 255, 0.2),
      0 2px 6px rgba(47, 134, 255, 0.2)
    `,
    zIndex: 1,
    position: "relative",
  },
  "&:hover": {
    backgroundColor: "#f4f4f4",
    border: "1px solid rgba(0, 0, 0, 0.1)",
  },
}));

export const StyledPaper = styled(Paper)(({ theme }) => ({
  border: `2px dashed rgba(0, 0, 0, 0.12)`,
  borderRadius: "8px",
  padding: theme.spacing(4),
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease",
  height: "359px",
  width: "98.5%",
  margin: "0 auto",
  gap: theme.spacing(1.5),
  outline: "none !important",
  boxShadow: "none !important",
  "&:hover": {
    borderColor: theme.palette.primary.main,
    backgroundColor: "#F5FAFF",
  },
}));

export const StyledContainer = styled(Box)(({ theme }) => ({
  backgroundColor: "rgba(255, 255, 255, 0.8)",
  borderRadius: "8px",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
  border: "1px solid rgba(0, 0, 0, 0.1)",
  padding: theme.spacing(3),
  display: "flex",
  flexDirection: "column",
  height: "97.5%",
}));

export const getDialogPaperProps = () => ({
  style: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
    border: "none",
    maxWidth: "1000px",
    width: "100%",
  },
});

export const getConfirmationDialogPaperProps = () => ({
  style: {
    backgroundColor: "#fff",
    borderRadius: "4px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
    maxWidth: "480px",
    width: "100%",
    height: "250px",
  },
});

export const getWebhookAndCredentialDialogPaperProps = () => ({
  style: {
    backgroundColor: "#fff",
    borderRadius: "6px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
    border: "none",
    maxWidth: "650px",
    width: "100%",
  },
});