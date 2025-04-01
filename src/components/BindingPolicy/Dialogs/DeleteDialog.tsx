import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";
import useTheme from "../../../stores/themeStore";

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  policyName?: string;
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({
  open,
  onClose,
  onConfirm,
  policyName,
}) => {
  const theme = useTheme((state) => state.theme)
  const isDarkTheme = theme === "dark";
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      PaperProps={{
        sx: {
          width: '500px', 
          minHeight: '200px', 
          m: 2, 
          backgroundColor: isDarkTheme ? "#1e293b" : "#fff",
          color: isDarkTheme ? "#fff" : "#000",
        }
      }}
    >
      <DialogTitle>Delete Binding Policy</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete the binding policy "{policyName}"?
          This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="error" onClick={onConfirm}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteDialog;
