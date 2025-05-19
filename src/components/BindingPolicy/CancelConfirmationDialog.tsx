import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Alert,
  AlertTitle,
  useTheme,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';

interface CancelConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const CancelConfirmationDialog: React.FC<CancelConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
}) => {
  const theme = useTheme();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm">
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <WarningIcon color="warning" sx={{ mr: 1 }} />
        Cancel Policy Creation
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Alert
          severity="warning"
          variant="outlined"
          sx={{
            borderRadius: '8px',
            '& .MuiAlert-icon': { alignItems: 'center' },
          }}
        >
          <AlertTitle>Warning</AlertTitle>
          Are you sure you want to cancel? All changes will be lost.
        </Alert>
      </DialogContent>
      <DialogActions
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            textTransform: 'none',
            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
          }}
        >
          Continue Editing
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          sx={{
            textTransform: 'none',
            fontWeight: 500,
            '&:hover': { backgroundColor: '#d32f2f' },
          }}
        >
          Yes, Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CancelConfirmationDialog;
