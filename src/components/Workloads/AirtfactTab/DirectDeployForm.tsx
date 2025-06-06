import { Box, Typography, TextField, Tooltip } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { ArtifactHubFormData } from './ArtifactHubTab';
import { useState } from 'react';
import { useTranslation } from 'react-i18next'; // Add this import

interface Props {
  theme: string;
  formData: ArtifactHubFormData;
  setFormData: (data: ArtifactHubFormData) => void;
  error: string;
}

export const DirectDeployForm = ({ theme, formData, setFormData, error }: Props) => {
  const { t } = useTranslation(); // Add translation hook
  const [valueString, setValueString] = useState<string>('');

  const handleValuesChange = (newValueString: string) => {
    setValueString(newValueString);

    try {
      // Convert string of key-value pairs to object (e.g. "service.type=LoadBalancer,service.port=80")
      const valuesObject: Record<string, string> = {};
      if (newValueString.trim()) {
        const pairs = newValueString.split(',');
        pairs.forEach(pair => {
          const [key, value] = pair.split('=').map(part => part.trim());
          if (key && value !== undefined) {
            // Store everything as strings, don't convert to numbers or booleans
            valuesObject[key] = value;
          }
        });
      }

      setFormData({ ...formData, values: valuesObject });
    } catch (error) {
      console.error('Error parsing values:', error);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        flex: 1,
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          display: 'none',
        },
        scrollbarWidth: 'none',
        '-ms-overflow-style': 'none',
        height: '55vh',
      }}
    >
      <Box>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            fontSize: '13px',
            color: theme === 'dark' ? '#d4d4d4' : '#333',
            mb: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {t('workloads.artifactHub.form.packageId')}
          <Tooltip title={t('workloads.artifactHub.form.packageIdTooltip')} placement="top">
            <InfoIcon
              sx={{
                fontSize: '16px',
                ml: 0.5,
                color: theme === 'dark' ? '#858585' : '#666',
              }}
            />
          </Tooltip>
        </Typography>
        <TextField
          fullWidth
          required
          value={formData.packageId}
          onChange={e => setFormData({ ...formData, packageId: e.target.value })}
          error={!!error && !formData.packageId}
          placeholder={t('workloads.artifactHub.form.packageIdPlaceholder')}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              '& fieldset': {
                borderColor: theme === 'dark' ? '#444' : '#e0e0e0',
                borderWidth: '1px',
              },
              '&:hover fieldset': {
                borderColor: '#1976d2',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#1976d2',
                borderWidth: '1px',
              },
              '&.Mui-error fieldset': {
                borderColor: 'red',
              },
            },
            '& .MuiInputBase-input': {
              padding: '12px 14px',
              fontSize: '0.875rem',
              color: theme === 'dark' ? '#d4d4d4' : '#666',
            },
            '& .MuiInputBase-input::placeholder': {
              color: theme === 'dark' ? '#858585' : '#666',
              opacity: 1,
            },
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <span role="img" aria-label="tip" style={{ fontSize: '0.8rem', marginRight: '8px' }}>
            💡
          </span>
          <Typography variant="caption" sx={{ color: theme === 'dark' ? '#858585' : '#666' }}>
            {t('workloads.artifactHub.form.packageIdTip')}
          </Typography>
        </Box>
      </Box>

      <Box>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            fontSize: '13px',
            color: theme === 'dark' ? '#d4d4d4' : '#333',
            mb: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {t('workloads.artifactHub.form.version')}
          <Tooltip title={t('workloads.artifactHub.form.versionTooltip')} placement="top">
            <InfoIcon
              sx={{
                fontSize: '16px',
                ml: 0.5,
                color: theme === 'dark' ? '#858585' : '#666',
              }}
            />
          </Tooltip>
        </Typography>
        <TextField
          fullWidth
          value={formData.version}
          onChange={e => setFormData({ ...formData, version: e.target.value })}
          placeholder={t('workloads.artifactHub.form.versionPlaceholder')}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              '& fieldset': {
                borderColor: theme === 'dark' ? '#444' : '#e0e0e0',
                borderWidth: '1px',
              },
              '&:hover fieldset': {
                borderColor: '#1976d2',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#1976d2',
                borderWidth: '1px',
              },
            },
            '& .MuiInputBase-input': {
              padding: '12px 14px',
              fontSize: '0.875rem',
              color: theme === 'dark' ? '#d4d4d4' : '#666',
            },
            '& .MuiInputBase-input::placeholder': {
              color: theme === 'dark' ? '#858585' : '#666',
              opacity: 1,
            },
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <span role="img" aria-label="tip" style={{ fontSize: '0.8rem', marginRight: '8px' }}>
            💡
          </span>
          <Typography variant="caption" sx={{ color: theme === 'dark' ? '#858585' : '#666' }}>
            {t('workloads.artifactHub.form.versionTip')}
          </Typography>
        </Box>
      </Box>

      <Box>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            fontSize: '13px',
            color: theme === 'dark' ? '#d4d4d4' : '#333',
            mb: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {t('workloads.artifactHub.form.releaseName')}
          <Tooltip title={t('workloads.artifactHub.form.releaseNameTooltip')} placement="top">
            <InfoIcon
              sx={{
                fontSize: '16px',
                ml: 0.5,
                color: theme === 'dark' ? '#858585' : '#666',
              }}
            />
          </Tooltip>
        </Typography>
        <TextField
          fullWidth
          required
          value={formData.releaseName}
          onChange={e => setFormData({ ...formData, releaseName: e.target.value })}
          error={!!error && !formData.releaseName}
          placeholder={t('workloads.artifactHub.form.releaseNamePlaceholder')}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              '& fieldset': {
                borderColor: theme === 'dark' ? '#444' : '#e0e0e0',
                borderWidth: '1px',
              },
              '&:hover fieldset': {
                borderColor: '#1976d2',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#1976d2',
                borderWidth: '1px',
              },
              '&.Mui-error fieldset': {
                borderColor: 'red',
              },
            },
            '& .MuiInputBase-input': {
              padding: '12px 14px',
              fontSize: '0.875rem',
              color: theme === 'dark' ? '#d4d4d4' : '#666',
            },
            '& .MuiInputBase-input::placeholder': {
              color: theme === 'dark' ? '#858585' : '#666',
              opacity: 1,
            },
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <span role="img" aria-label="tip" style={{ fontSize: '0.8rem', marginRight: '8px' }}>
            💡
          </span>
          <Typography variant="caption" sx={{ color: theme === 'dark' ? '#858585' : '#666' }}>
            {t('workloads.artifactHub.form.releaseNameTip')}
          </Typography>
        </Box>
      </Box>

      <Box>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            fontSize: '13px',
            color: theme === 'dark' ? '#d4d4d4' : '#333',
            mb: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {t('workloads.artifactHub.form.namespace')}
          <Tooltip title={t('workloads.artifactHub.form.namespaceTooltip')} placement="top">
            <InfoIcon
              sx={{
                fontSize: '16px',
                ml: 0.5,
                color: theme === 'dark' ? '#858585' : '#666',
              }}
            />
          </Tooltip>
        </Typography>
        <TextField
          fullWidth
          value={formData.namespace}
          onChange={e => setFormData({ ...formData, namespace: e.target.value })}
          placeholder={t('workloads.artifactHub.form.namespacePlaceholder')}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              '& fieldset': {
                borderColor: theme === 'dark' ? '#444' : '#e0e0e0',
                borderWidth: '1px',
              },
              '&:hover fieldset': {
                borderColor: '#1976d2',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#1976d2',
                borderWidth: '1px',
              },
            },
            '& .MuiInputBase-input': {
              padding: '12px 14px',
              fontSize: '0.875rem',
              color: theme === 'dark' ? '#d4d4d4' : '#666',
            },
            '& .MuiInputBase-input::placeholder': {
              color: theme === 'dark' ? '#858585' : '#666',
              opacity: 1,
            },
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <span role="img" aria-label="tip" style={{ fontSize: '0.8rem', marginRight: '8px' }}>
            💡
          </span>
          <Typography variant="caption" sx={{ color: theme === 'dark' ? '#858585' : '#666' }}>
            {t('workloads.artifactHub.form.namespaceTip')}
          </Typography>
        </Box>
      </Box>

      <Box>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            fontSize: '13px',
            color: theme === 'dark' ? '#d4d4d4' : '#333',
            mb: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {t('workloads.artifactHub.form.customValues')}
          <Tooltip title={t('workloads.artifactHub.form.customValuesTooltip')} placement="top">
            <InfoIcon
              sx={{
                fontSize: '16px',
                ml: 0.5,
                color: theme === 'dark' ? '#858585' : '#666',
              }}
            />
          </Tooltip>
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          value={valueString}
          onChange={e => handleValuesChange(e.target.value)}
          placeholder={t('workloads.artifactHub.form.customValuesPlaceholder')}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              '& fieldset': {
                borderColor: theme === 'dark' ? '#444' : '#e0e0e0',
                borderWidth: '1px',
              },
              '&:hover fieldset': {
                borderColor: '#1976d2',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#1976d2',
                borderWidth: '1px',
              },
            },
            '& .MuiInputBase-input': {
              padding: '12px 14px',
              fontSize: '0.875rem',
              color: theme === 'dark' ? '#d4d4d4' : '#666',
            },
            '& .MuiInputBase-input::placeholder': {
              color: theme === 'dark' ? '#858585' : '#666',
              opacity: 1,
            },
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <span role="img" aria-label="tip" style={{ fontSize: '0.8rem', marginRight: '8px' }}>
            💡
          </span>
          <Typography variant="caption" sx={{ color: theme === 'dark' ? '#858585' : '#666' }}>
            {t('workloads.artifactHub.form.customValuesTip')}
          </Typography>
        </Box>
      </Box>

      {error && (
        <Box sx={{ color: 'error.main', mt: 1 }}>
          <Typography variant="body2">{error}</Typography>
        </Box>
      )}
    </Box>
  );
};
