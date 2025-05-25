import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';

interface CustomNameBindingPolicyDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
}

const CustomNameBindingPolicyDialog: React.FC<CustomNameBindingPolicyDialogProps> = ({
  open,
  onClose,
  onConfirm,
}) => {
  const [policyName, setPolicyName] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleConfirm = () => {
    if (!policyName.trim()) {
      setError('Policy name is required');
      return;
    }
    setError('');
    onConfirm(policyName);
    setPolicyName('');
  };

  const handleCancel = () => {
    setPolicyName('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Enter Binding Policy Name</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Binding Policy Name"
          value={policyName}
          onChange={e => setPolicyName(e.target.value)}
          error={!!error}
          helperText={error}
          required
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button variant="contained" color="primary" onClick={handleConfirm}>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomNameBindingPolicyDialog;
