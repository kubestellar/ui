/**
 * Dialog utility functions for styling and configuring dialog components
 */

export const getDialogPaperProps = (theme: string) => ({
  style: {
    backgroundColor: theme === "dark" ? "#1F2937" : "#fff",
    borderRadius: "12px",
    WebkitBorderRadius: "12px", // Explicitly set for Safari
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
    WebkitBoxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)", // Explicitly set for Safari
    border: "none",
    maxWidth: "1665px",
    width: "100%",
    overflow: "hidden", // Prevent any border rendering issues
  },
});

export const getConfirmationDialogPaperProps = (theme: string) => ({
  style: {
    backgroundColor: theme === "dark" ? "rgb(15, 23, 42)" : "#fff", // Dark background in dark mode
    borderRadius: "4px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
    maxWidth: "480px",
    width: "100%",
    height: "250px",
  },
});

export const getWebhookAndCredentialDialogPaperProps = (theme: string) => {
  return {
    style: {
      backgroundColor: theme === "dark" ? "#1F2937" : "fff",
      borderRadius: "6px",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
      border: "none",
      maxWidth: "650px",
      width: "100%",
      height:"410px"
    },
  };
};

export const getWebhookDialogPaperProps = () => {
  return {
    style: {
      // backgroundColor: theme === "dark" ? "rgb(15, 23, 42)" : "fff",
      borderRadius: "6px",
      boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
      border: "none",
      maxWidth: "950px",
      width: "100%",
      height:"64vh"
    },
  };
}; 