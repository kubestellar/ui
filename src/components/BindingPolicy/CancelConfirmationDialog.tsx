import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Alert,
  AlertTitle,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import useTheme from '../../stores/themeStore';

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
  const theme = useTheme(state => state.theme);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      PaperProps={{
        sx: {
          backgroundColor: theme === 'dark' ? '#0F172A' : '#FFFFFF',
          color: theme === 'dark' ? '#FFFFFF' : '#000000',
          border: 'none',
          outline: 'none',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          color: theme === 'dark' ? '#FFFFFF' : '#000000',
          backgroundColor: theme === 'dark' ? '#0F172A' : '#FFFFFF',
          border: 'none',
          outline: 'none',
        }}
      >
        <WarningIcon color="warning" sx={{ mr: 1 }} />
        Cancel Policy Creation
      </DialogTitle>
      <DialogContent
        sx={{
          mt: 2,
          backgroundColor: theme === 'dark' ? '#0F172A' : '#FFFFFF',
          border: 'none',
          outline: 'none',
        }}
      >
        <Alert
          severity="warning"
          variant="outlined"
          sx={{
            borderRadius: '8px',
            '& .MuiAlert-icon': { alignItems: 'center' },
            backgroundColor: theme === 'dark' ? '#0F172A' : '#FFFFFF',
            border: '1px solid #f57c00',
            outline: 'none',
          }}
        >
          <AlertTitle>Warning</AlertTitle>
          Are you sure you want to cancel? All changes will be lost.
        </Alert>
      </DialogContent>
      <DialogActions
        sx={{
          p: 2,
          backgroundColor: theme === 'dark' ? '#0F172A' : '#FFFFFF',
          border: 'none',
          outline: 'none',
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
