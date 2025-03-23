import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { getConfirmationDialogPaperProps } from "../StyledComponents";

interface Props {
  cancelConfirmationOpen: boolean;
  handleCloseCancelConfirmation: () => void;
  handleConfirmCancel: () => void;
}

export const CancelConfirmationDialog = ({
  cancelConfirmationOpen,
  handleCloseCancelConfirmation,
  handleConfirmCancel,
}: Props) => {
  return (
    // --- Cancel Confirmation Dialog Section ---
    <Dialog
      open={cancelConfirmationOpen}
      onClose={handleCloseCancelConfirmation}
      PaperProps={getConfirmationDialogPaperProps()}
    >
      <DialogTitle sx={{ padding: "16px 24px", borderBottom: "1px solid #e0e0e0" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningAmberIcon sx={{ color: "#f5c518", fontSize: "1.5rem" }} />
          <Typography variant="h6" sx={{ fontWeight: 500, color: "#333" }}>
            Cancel Workload Creation
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ padding: "24px", py: 0 }}>
        <DialogContent
          sx={{ border: "1px solid #ff9800", py: 1.5, mt: 2, borderRadius: "8px" }}
        >
          <Box sx={{ display: "flex", marginLeft: "-9px", gap: 2, alignItems: "center" }}>
            <WarningAmberIcon sx={{ color: "#f5c518", fontSize: "1.4rem" }} />
            <Box sx={{ alignItems: "center", marginLeft: "-6px", mb: 0.5 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 500, color: "rgb(102, 60, 0)" }}
              >
                Warning
              </Typography>
              <Typography
                variant="body1"
                sx={{ color: "rgb(102, 60, 0)", fontSize: "14px" }}
              >
                Are you sure you want to cancel? Any changes will lost.
              </Typography>
            </Box>
          </Box>
        </DialogContent>
      </DialogContent>
      <DialogActions sx={{ padding: "16px 16px", borderTop: "1px solid #e0e0e0" }}>
        <Button
          onClick={handleCloseCancelConfirmation}
          sx={{
            textTransform: "none",
            fontWeight: 500,
            color: "#1976d2",
            padding: "6px 8px",
            "&:hover": {
              backgroundColor: "#f5f5f5",
            },
          }}
        >
          Continue Editing
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirmCancel}
          sx={{
            textTransform: "none",
            fontWeight: 500,
            backgroundColor: "#d32f2f",
            color: "#fff",
            padding: "6px 16px",
            borderRadius: "4px",
            "&:hover": {
              backgroundColor: "#b71c1c",
            },
          }}
        >
          Yes, Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};