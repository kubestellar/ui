import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import { getWebhookAndCredentialDialogPaperProps } from "../StyledComponents";

interface Props {
  webhookDialogOpen: boolean;
  newWebhook: { webhookUrl: string; personalAccessToken: string };
  setNewWebhook: (webhook: { webhookUrl: string; personalAccessToken: string }) => void;
  handleAddWebhook: () => void;
  handleCloseWebhookDialog: () => void;
}

export const AddWebhookDialog = ({
  webhookDialogOpen,
  newWebhook,
  setNewWebhook,
  handleAddWebhook,
  handleCloseWebhookDialog,
}: Props) => {
  return (
    // --- Add Webhook Dialog Section ---
    <Dialog
      open={webhookDialogOpen}
      onClose={handleCloseWebhookDialog}
      maxWidth="sm"
      fullWidth
      PaperProps={getWebhookAndCredentialDialogPaperProps()}
    >
      <DialogTitle sx={{ padding: "16px 24px", borderBottom: "1px solid #e0e0e0" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#333" }}>
          Add Webhook
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
                color: "#333",
                mb: 1,
              }}
            >
              Webhook URL
            </Typography>
            <TextField
              fullWidth
              value={newWebhook.webhookUrl}
              onChange={(e) =>
                setNewWebhook({ ...newWebhook, webhookUrl: e.target.value })
              }
              placeholder="e.g., https://your-webhook-url.com"
              InputProps={{
                startAdornment: (
                  <span role="img" aria-label="cluster" style={{ fontSize: "0.9rem", marginRight: "8px" }}>
                    🔶
                  </span>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  backgroundColor: "#fff",
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
              <Typography variant="caption" sx={{ color: "#666" }}>
                Enter a valid webhook URL for automated deployments
              </Typography>
            </Box>
          </Box>

          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                fontSize: "13px",
                color: "#333",
                mb: 1,
              }}
            >
              Personal Access Token (PAT)
            </Typography>
            <TextField
              fullWidth
              type="password"
              value={newWebhook.personalAccessToken}
              onChange={(e) =>
                setNewWebhook({ ...newWebhook, personalAccessToken: e.target.value })
              }
              placeholder="e.g., ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              InputProps={{
                startAdornment: (
                  <span role="img" aria-label="cluster" style={{ fontSize: "0.9rem", marginRight: "8px" }}>
                    🔶
                  </span>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  backgroundColor: "#fff",
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
              <Typography variant="caption" sx={{ color: "#666" }}>
                Enter the Personal Access Token for the webhook
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ padding: "16px 24px", borderTop: "1px solid #e0e0e0" }}>
        <Button
          onClick={handleCloseWebhookDialog}
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
          onClick={handleAddWebhook}
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