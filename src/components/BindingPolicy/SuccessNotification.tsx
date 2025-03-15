import React, { useEffect } from 'react';
import { Box, Typography, Paper, Fade, Chip, IconButton } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import LabelIcon from '@mui/icons-material/Label';
import LinkIcon from '@mui/icons-material/Link';
import { usePolicyDragDropStore } from '../../stores/policyDragDropStore';

interface SuccessNotificationProps {
  open?: boolean;
  message?: string;
  onClose?: () => void;
}

const SuccessNotification: React.FC<SuccessNotificationProps> = ({ 
  open: propOpen, 
  message: propMessage, 
  onClose: propOnClose 
}) => {
  const { 
    successMessage: storeMessage, 
    clearSuccessMessageAfterDelay, 
    setSuccessMessage 
  } = usePolicyDragDropStore();

  // Use provided props or fallback to store values
  const successMessage = propMessage || storeMessage;
  const open = propOpen !== undefined ? propOpen : !!storeMessage;

  // Handle closing the notification
  const handleClose = () => {
    if (propOnClose) {
      propOnClose();
    } else if (setSuccessMessage) {
      setSuccessMessage(null);
    }
  };

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (successMessage && !propMessage) {
      clearSuccessMessageAfterDelay();
    }
  }, [successMessage, clearSuccessMessageAfterDelay, propMessage]);

  if (!open || !successMessage) return null;

  // Determine the type of notification to customize the appearance
  const isLabelNotification = successMessage.includes('Labels automatically assigned');
  const isPolicyAssignment = successMessage.includes('Successfully assigned');
  
  // Choose icon based on message type
  const NotificationIcon = isLabelNotification 
    ? LabelIcon 
    : isPolicyAssignment 
      ? LinkIcon 
      : CheckCircleIcon;

  return (
    <Fade in={open}>
      <Paper 
        elevation={4}
        sx={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          bgcolor: 'background.paper',
          borderLeft: '4px solid',
          borderColor: isLabelNotification ? 'info.main' : 'success.main',
          py: 1.5,
          px: 3,
          borderRadius: 1,
          zIndex: 9999,
          minWidth: 350,
          maxWidth: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <NotificationIcon 
            color={isLabelNotification ? "info" : "success"}
            sx={{ mr: 1.5, fontSize: 24 }}
          />
          <Box>
            <Typography variant="body1" fontWeight="medium" color="text.primary">
              {isLabelNotification 
                ? 'Labels Assigned' 
                : isPolicyAssignment 
                  ? 'Policy Binding Created' 
                  : 'Success'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {successMessage}
            </Typography>
            
            {/* Additional context for label assignments */}
            {isLabelNotification && (
              <Chip 
                size="small" 
                icon={<LabelIcon />} 
                label="Labels help target policies to specific resources"
                variant="outlined"
                color="info"
                sx={{ mt: 1, fontSize: '0.75rem' }}
              />
            )}
            
            {/* Additional context for policy assignments */}
            {isPolicyAssignment && (
              <Chip 
                size="small" 
                icon={<LinkIcon />} 
                label="Binding created for policy propagation"
                variant="outlined"
                color="success"
                sx={{ mt: 1, fontSize: '0.75rem' }}
              />
            )}
          </Box>
        </Box>
        
        <IconButton 
          size="small" 
          onClick={handleClose} 
          sx={{ ml: 1 }}
          aria-label="close notification"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Paper>
    </Fade>
  );
};

export default SuccessNotification; 