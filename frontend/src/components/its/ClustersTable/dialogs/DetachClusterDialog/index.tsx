import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  IconButton,
  Box,
  Chip,
  CircularProgress,
  Zoom,
} from '@mui/material';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { DetachClusterDialogProps } from './types';
import CancelButton from '../../../../../components/common/CancelButton';

const DetachClusterDialog: React.FC<DetachClusterDialogProps> = ({
  open,
  onClose,
  cluster,
  onDetach,
  isLoading,
  isDark,
  colors,
}) => {
  const { t } = useTranslation();

  const handleDetach = () => {
    if (cluster) {
      onDetach(cluster.name);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Zoom}
      transitionDuration={300}
      PaperProps={{
        style: {
          backgroundColor: colors.paper,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: isDark
            ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)'
            : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        },
      }}
    >
      <DialogTitle
        style={{
          color: colors.error,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div className="flex items-center gap-2">
          <LinkOffIcon style={{ color: colors.error }} />
          <Typography variant="h6" component="span">
            {t('clusters.detach.title')}
          </Typography>
        </div>
        <IconButton onClick={onClose} size="small" style={{ color: colors.textSecondary }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent style={{ padding: '24px' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" style={{ fontWeight: 500, marginBottom: '8px' }}>
            {t('clusters.detach.confirmation')}
          </Typography>
          <Box
            sx={{
              p: 2,
              mt: 2,
              border: `1px solid ${colors.border}`,
              borderRadius: 1,
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
            }}
          >
            <Typography variant="h6" style={{ color: colors.text, fontWeight: 600 }}>
              {cluster?.name}
            </Typography>
            <Typography variant="body2" style={{ color: colors.textSecondary, marginTop: '8px' }}>
              {t('clusters.detach.context')}: {cluster?.name}
            </Typography>
            {cluster?.labels && Object.keys(cluster.labels).length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" style={{ color: colors.textSecondary }}>
                  {t('clusters.labels.labels')}
                </Typography>
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(cluster.labels).map(([key, value]) => (
                    <Chip
                      key={key}
                      size="small"
                      label={`${key}=${value}`}
                      sx={{
                        backgroundColor: isDark
                          ? 'rgba(47, 134, 255, 0.15)'
                          : 'rgba(47, 134, 255, 0.08)',
                        color: colors.primary,
                        fontSize: '0.75rem',
                      }}
                    />
                  ))}
                </div>
              </Box>
            )}
          </Box>
        </Box>
        <Box
          sx={{
            mt: 3,
            backgroundColor: isDark ? 'rgba(255, 107, 107, 0.1)' : 'rgba(255, 107, 107, 0.05)',
            p: 2,
            borderRadius: 1,
          }}
        >
          <Typography variant="body2" style={{ color: colors.error }}>
            {t('clusters.detach.warning')}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions
        style={{
          padding: '16px 24px',
          borderTop: `1px solid ${colors.border}`,
          justifyContent: 'space-between',
        }}
      >
        <CancelButton onClick={onClose} disabled={isLoading} startIcon={<CloseIcon />}>
          {t('common.cancel')}
        </CancelButton>
        <Button
          onClick={handleDetach}
          variant="contained"
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : <LinkOffIcon />}
          style={{
            backgroundColor: colors.error,
            color: colors.white,
            minWidth: '120px',
          }}
        >
          {isLoading ? t('clusters.detach.detaching') : t('clusters.detach.detach')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DetachClusterDialog;
