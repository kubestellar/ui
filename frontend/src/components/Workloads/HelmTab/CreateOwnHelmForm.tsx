import { Box, Typography, TextField } from '@mui/material';
import type { HelmFormData } from './HelmTab';
import { useTranslation } from 'react-i18next'; // Add this import

interface Props {
  formData: HelmFormData;
  setFormData: (data: HelmFormData) => void;
  error: string;
  theme: string;
}

export const CreateOwnHelmForm = ({ formData, setFormData, error, theme }: Props) => {
  const { t } = useTranslation(); // Add translation hook

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
        msOverflowStyle: 'none',
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
          }}
        >
          {t('workloads.helm.form.repositoryName')}
        </Typography>
        <TextField
          fullWidth
          value={formData.repoName}
          onChange={e => setFormData({ ...formData, repoName: e.target.value })}
          error={!!error && !formData.repoName}
          placeholder={t('workloads.helm.form.repositoryNamePlaceholder')}
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
            {t('workloads.helm.form.repositoryNameTip')}
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
          }}
        >
          {t('workloads.helm.form.repositoryUrl')}
        </Typography>
        <TextField
          fullWidth
          value={formData.repoUrl}
          onChange={e => setFormData({ ...formData, repoUrl: e.target.value })}
          error={!!error && !formData.repoUrl}
          placeholder={t('workloads.helm.form.repositoryUrlPlaceholder')}
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
            {t('workloads.helm.form.repositoryUrlTip')}
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
          }}
        >
          {t('workloads.helm.form.chartName')}
        </Typography>
        <TextField
          fullWidth
          value={formData.chartName}
          onChange={e => setFormData({ ...formData, chartName: e.target.value })}
          error={!!error && !formData.chartName}
          placeholder={t('workloads.helm.form.chartNamePlaceholder')}
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
            {t('workloads.helm.form.chartNameTip')}
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
          }}
        >
          {t('workloads.helm.form.releaseName')}
        </Typography>
        <TextField
          fullWidth
          value={formData.releaseName}
          onChange={e => setFormData({ ...formData, releaseName: e.target.value })}
          error={!!error && !formData.releaseName}
          placeholder={t('workloads.helm.form.releaseNamePlaceholder')}
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
            {t('workloads.helm.form.releaseNameTip')}
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
          }}
        >
          {t('workloads.helm.form.version')}
        </Typography>
        <TextField
          fullWidth
          value={formData.version}
          onChange={e => setFormData({ ...formData, version: e.target.value })}
          placeholder={t('workloads.helm.form.versionPlaceholder')}
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
            {t('workloads.helm.form.versionTip')}
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
          }}
        >
          {t('workloads.helm.form.namespace')}
        </Typography>
        <TextField
          fullWidth
          value={formData.namespace}
          onChange={e => setFormData({ ...formData, namespace: e.target.value })}
          error={!!error && !formData.namespace}
          placeholder={t('workloads.helm.form.namespacePlaceholder')}
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
            {t('workloads.helm.form.namespaceTip')}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
