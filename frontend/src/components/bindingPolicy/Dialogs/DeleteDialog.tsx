import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import useTheme from '../../../stores/themeStore';
import CancelButton from '../../common/CancelButton';

interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  policyName?: string;
}

const DeleteDialog: React.FC<DeleteDialogProps> = ({ open, onClose, onConfirm, policyName }) => {
  const theme = useTheme(state => state.theme);
  const isDarkTheme = theme === 'dark';
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: '500px',
          minHeight: '200px',
          m: 2,
          backgroundColor: isDarkTheme ? '#1e293b' : '#fff',
          color: isDarkTheme ? '#fff' : '#000',
        },
      }}
    >
      <DialogTitle>{t('bindingPolicy.deleteDialog.title')}</DialogTitle>
      <DialogContent>
        <Typography>{t('bindingPolicy.deleteDialog.confirm', { name: policyName })}</Typography>
      </DialogContent>
      <DialogActions>
        <CancelButton onClick={onClose}>{t('common.cancel')}</CancelButton>
        <Button variant="contained" color="error" onClick={onConfirm}>
          {t('common.delete')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteDialog;
