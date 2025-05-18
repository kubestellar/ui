import { Box, Typography, TextField, Tooltip } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { ArtifactHubFormData } from './ArtifactHubTab';
import { useState } from 'react';

interface Props {
  theme: string;
  formData: ArtifactHubFormData;
  setFormData: (data: ArtifactHubFormData) => void;
  error: string;
}

export const DirectDeployForm = ({ theme, formData, setFormData, error }: Props) => {
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
          Package ID *
          <Tooltip
            title="Format: helm/repository-name/chart-name (e.g., helm/bitnami/nginx)"
            placement="top"
          >
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
          placeholder="helm/bitnami/nginx"
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
            Specify the Helm chart package ID (e.g., helm/bitnami/nginx)
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
          Version (default: latest)
          <Tooltip
            title="Chart version to deploy (e.g., 13.2.10). If not specified, latest will be used."
            placement="top"
          >
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
          placeholder="13.2.10 (leave empty for latest)"
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
            Specify the version to deploy (leave empty for latest)
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
          Release Name *
          <Tooltip title="Name to identify your Helm release" placement="top">
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
          placeholder="my-nginx"
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
            Specify the name of the Helm release
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
          Namespace
          <Tooltip title="Kubernetes namespace to deploy to" placement="top">
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
          placeholder="default"
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
            Specify the namespace to deploy to (defaults to 'default')
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
          Custom Values
          <Tooltip
            title="Format: key=value,key2=value2 (e.g., service.type=LoadBalancer,service.port=80)"
            placement="top"
          >
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
          placeholder="service.type=LoadBalancer,service.port=80"
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
            Custom configuration values for your Helm chart (key=value format)
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
