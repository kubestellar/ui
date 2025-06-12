import {
  Box,
  Typography,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Button,
  SelectChangeEvent,
} from '@mui/material';
import { useTranslation } from 'react-i18next'; // Add this import

export interface FormData {
  repositoryUrl: string;
  path: string;
  credentials: string;
  branchSpecifier: string;
  webhook: string;
}

interface Props {
  formData: FormData;
  setFormData: (data: FormData) => void;
  error: string;
  credentialsList: string[];
  handleCredentialChange: (event: SelectChangeEvent<string>) => void;
  handleOpenCredentialDialog: () => void;
  handleOpenWebhookDialog: () => void;
  theme: string;
}

export const CreateFromGitHubForm = ({
  formData,
  setFormData,
  error,
  credentialsList,
  handleCredentialChange,
  handleOpenCredentialDialog,
  handleOpenWebhookDialog,
  theme,
}: Props) => {
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
        '-ms-overflow-style': 'none',
        height: '55vh',
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 600,
          fontSize: '20px',
          color: theme === 'dark' ? '#d4d4d4' : '#333',
          mt: 1,
        }}
      >
        {t('workloads.github.form.title')}
      </Typography>
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
          {t('workloads.github.form.repositoryUrl')}
        </Typography>
        <TextField
          fullWidth
          value={formData.repositoryUrl}
          onChange={e => setFormData({ ...formData, repositoryUrl: e.target.value })}
          error={!!error && !formData.repositoryUrl}
          placeholder={t('workloads.github.form.repositoryUrlPlaceholder')}
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
            {t('workloads.github.form.repositoryUrlTip')}
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
          {t('workloads.github.form.path')}
        </Typography>
        <TextField
          fullWidth
          value={formData.path}
          onChange={e => setFormData({ ...formData, path: e.target.value })}
          error={!!error && !formData.path}
          placeholder={t('workloads.github.form.pathPlaceholder')}
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
            {t('workloads.github.form.pathTip')}
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
          {t('workloads.github.form.branch')}
        </Typography>
        <TextField
          fullWidth
          value={formData.branchSpecifier}
          onChange={e => setFormData({ ...formData, branchSpecifier: e.target.value })}
          placeholder={t('workloads.github.form.branchPlaceholder')}
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
            {t('workloads.github.form.branchTip')}
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
          {t('workloads.github.form.credentials')}
        </Typography>
        <FormControl fullWidth>
          <Select
            value={formData.credentials}
            onChange={handleCredentialChange}
            displayEmpty
            renderValue={selected =>
              selected ? (
                selected
              ) : (
                <Typography
                  sx={{ fontSize: '0.875rem', color: theme === 'dark' ? '#858585' : '#666' }}
                >
                  {t('workloads.github.form.credentialsPlaceholder')}
                </Typography>
              )
            }
            sx={{
              borderRadius: '8px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: theme === 'dark' ? '#444' : '#e0e0e0',
                borderWidth: '1px',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#1976d2',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#1976d2',
                borderWidth: '1px',
              },
              '& .MuiSelect-select': {
                padding: '12px 14px',
                fontSize: '0.875rem',
                color: theme === 'dark' ? '#d4d4d4' : '#666',
              },
            }}
            MenuProps={{
              PaperProps: {
                sx: {
                  bgcolor: theme === 'dark' ? '#252526' : '#fff',
                  color: theme === 'dark' ? '#d4d4d4' : '#333',
                },
              },
            }}
          >
            {credentialsList.map(credential => (
              <MenuItem key={credential} value={credential}>
                {credential}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <span role="img" aria-label="tip" style={{ fontSize: '0.8rem', marginRight: '8px' }}>
            💡
          </span>
          <Typography variant="caption" sx={{ color: theme === 'dark' ? '#858585' : '#666' }}>
            {t('workloads.github.form.credentialsTip')}
          </Typography>
        </Box>
      </Box>
      <Button
        variant="contained"
        onClick={handleOpenCredentialDialog}
        sx={{
          alignSelf: 'flex-start',
          padding: '1px 8px',
          backgroundColor: '#1976d2',
          color: '#fff',
          '&:hover': {
            backgroundColor: '#1565c0',
          },
        }}
      >
        {t('workloads.github.form.addCredentials')}
      </Button>

      <Box>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            fontSize: '13px',
            color: theme === 'dark' ? '#d4d4d4' : '#333',
          }}
        >
          {t('workloads.github.form.webhooks')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <span role="img" aria-label="tip" style={{ fontSize: '0.8rem', marginRight: '8px' }}>
            💡
          </span>
          <Typography variant="caption" sx={{ color: theme === 'dark' ? '#858585' : '#666' }}>
            {t('workloads.github.form.webhooksTip')}
          </Typography>
        </Box>
      </Box>
      <Button
        variant="contained"
        onClick={handleOpenWebhookDialog}
        sx={{
          alignSelf: 'flex-start',
          padding: '1px 6px',
          backgroundColor: '#1976d2',
          color: '#fff',
          '&:hover': {
            backgroundColor: '#1565c0',
          },
        }}
      >
        {t('workloads.github.form.addWebhook')}
      </Button>
    </Box>
  );
};

export default CreateFromGitHubForm;
