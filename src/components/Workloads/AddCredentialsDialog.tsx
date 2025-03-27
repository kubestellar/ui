import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import { getWebhookAndCredentialDialogPaperProps } from "../StyledComponents";
import useTheme from "../../stores/themeStore"; // Import useTheme for dark mode support

interface Props {
  credentialDialogOpen: boolean;
  newCredential: { githubUsername: string; personalAccessToken: string };
  setNewCredential: (credential: { githubUsername: string; personalAccessToken: string }) => void;
  handleAddCredential: () => void;
  handleCloseCredentialDialog: () => void;
}

export const AddCredentialsDialog = ({
  credentialDialogOpen,
  newCredential,
  setNewCredential,
  handleAddCredential,
  handleCloseCredentialDialog,
}: Props) => {
  const theme = useTheme((state) => state.theme); // Get the current theme
  return (
    // --- Add Credentials Dialog Section ---
    <Dialog
      open={credentialDialogOpen}
      onClose={handleCloseCredentialDialog}
      maxWidth="sm"
      fullWidth
      PaperProps={getWebhookAndCredentialDialogPaperProps(theme)}
    >
      <DialogTitle sx={{ padding: "16px 24px", borderBottom: "1px solid #e0e0e0" }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: theme === "dark" ? "#d4d4d4" : "#333",
 }}>
          Add Credentials
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ padding: "24px" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 2 }}>
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                fontSize: "13px",
                color: theme === "dark" ? "#d4d4d4" : "#333",
                mb: 1,
              }}
            >
              Github Username *
            </Typography>
            <TextField
              fullWidth
              value={newCredential.githubUsername}
              onChange={(e) =>
                setNewCredential({ ...newCredential, githubUsername: e.target.value })
              }
              placeholder="e.g., onkar717"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  backgroundColor: theme === "dark" ? "rgb(15, 23, 42)" : "#fff", // Dark background in dark mode
                  "& fieldset": {
                    borderColor: "#e0e0e0",
                    borderWidth: "1px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#1976d2",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#1976d2",
                    borderWidth: "1px",
                  },
                },
                "& .MuiInputBase-input": {
                  padding: "12px 14px",
                  fontSize: "0.875rem",
                  color: "#666",
                },
                "& .MuiInputBase-input::placeholder": {
                  color: "#666",
                  opacity: 1,
                },
              }}
            />
            <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
              <span role="img" aria-label="tip" style={{ fontSize: "0.8rem", marginRight: "8px" }}>
                💡
              </span>
              <Typography variant="caption" sx={{ color: theme === "dark" ? "#fff" :"#666" }}>
                Enter your GitHub username
              </Typography>
            </Box>
          </Box>

          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                fontSize: "13px",
                color: theme === "dark" ? "#d4d4d4" : "#333",
                mb: 1,
              }}
            >
              Personal Access Token (PAT) *
            </Typography>
            <TextField
              fullWidth
              type="password"
              value={newCredential.personalAccessToken}
              onChange={(e) =>
                setNewCredential({ ...newCredential, personalAccessToken: e.target.value })
              }
              placeholder="e.g., ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  backgroundColor: theme === "dark" ? "rgb(15, 23, 42)" : "#fff", // Dark background in dark mode
                  "& fieldset": {
                    borderColor: "#e0e0e0",
                    borderWidth: "1px",
                  },
                  "&:hover fieldset": {
                    borderColor: "#1976d2",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#1976d2",
                    borderWidth: "1px",
                  },
                },
                "& .MuiInputBase-input": {
                  padding: "12px 14px",
                  fontSize: "0.875rem",
                  color: "#666",
                },
                "& .MuiInputBase-input::placeholder": {
                  color: "#666",
                  opacity: 1,
                },
              }}
            />
            <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
              <span role="img" aria-label="tip" style={{ fontSize: "0.8rem", marginRight: "8px" }}>
                💡
              </span>
              <Typography variant="caption" sx={{ color: theme === "dark" ? "#fff" :"#666" }}>
                Enter your GitHub Personal Access Token
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ padding: "16px 24px", borderTop: "1px solid #e0e0e0" }}>
        <Button
          onClick={handleCloseCredentialDialog}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            color: "#666",
            padding: "8px 16px",
            "&:hover": {
              backgroundColor: "#f5f5f5",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleAddCredential}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            backgroundColor: "#1976d2",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: "8px",
            "&:hover": {
              backgroundColor: "#1565c0",
            },
          }}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
};