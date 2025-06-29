import { memo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useTranslation } from 'react-i18next';
import useTheme from '../../stores/themeStore';
import CancelButton from '../common/CancelButton';
import { DeleteNodeDetails } from './types';

interface TreeViewDeleteDialogProps {
  open: boolean;
  deleteNodeDetails: DeleteNodeDetails | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const TreeViewDeleteDialog = memo<TreeViewDeleteDialogProps>(
  ({ open, deleteNodeDetails, onConfirm, onCancel }) => {
    const { t } = useTranslation();
    const theme = useTheme(state => state.theme);

    return (
      <Dialog
        open={open}
        onClose={onCancel}
        aria-labelledby="delete-confirmation-dialog-title"
        sx={{
          '& .MuiDialog-paper': {
            padding: '16px',
            width: '500px',
            backgroundColor: theme === 'dark' ? 'rgb(15, 23, 42)' : '#fff',
            borderRadius: '4px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            maxWidth: '480px',
            height: '250px',
          },
        }}
      >
        <DialogTitle
          id="delete-confirmation-dialog-title"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontSize: '18px',
            fontWeight: 600,
            color: theme === 'dark' ? '#fff' : '333',
          }}
        >
          <WarningAmberIcon sx={{ color: '#FFA500', fontSize: '34px' }} />
          {t('treeView.deleteDialog.title')}
        </DialogTitle>

        <DialogContent>
          <Typography
            sx={{
              fontSize: '16px',
              color: theme === 'dark' ? '#fff' : '333',
              mt: 2,
            }}
          >
            {t('treeView.deleteDialog.message', {
              name: deleteNodeDetails?.nodeName,
            })}
          </Typography>
        </DialogContent>

        <DialogActions
          sx={{
            justifyContent: 'space-between',
            padding: '0 16px 16px 16px',
          }}
        >
          <CancelButton onClick={onCancel}>{t('common.cancel')}</CancelButton>
          <Button
            onClick={onConfirm}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              backgroundColor: '#d32f2f',
              color: '#fff',
              padding: '6px 16px',
              borderRadius: '4px',
              '&:hover': {
                backgroundColor: '#b71c1c',
              },
            }}
          >
            {t('treeView.deleteDialog.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
);

TreeViewDeleteDialog.displayName = 'TreeViewDeleteDialog';

export default TreeViewDeleteDialog;
