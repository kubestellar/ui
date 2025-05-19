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
}: Props) => (
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
      Create from your GitHub Repository and deploy!
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
        Repository URL *
      </Typography>
      <TextField
        fullWidth
        value={formData.repositoryUrl}
        onChange={e => setFormData({ ...formData, repositoryUrl: e.target.value })}
        error={!!error && !formData.repositoryUrl}
        placeholder="e.g., https://github.com/username/repo"
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
          Use a valid GitHub repository URL
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
        Path *
      </Typography>
      <TextField
        fullWidth
        value={formData.path}
        onChange={e => setFormData({ ...formData, path: e.target.value })}
        error={!!error && !formData.path}
        placeholder="e.g., /path/to/yaml"
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
          Specify the path to your YAML files in the repository
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
        Branch (default: main) *
      </Typography>
      <TextField
        fullWidth
        value={formData.branchSpecifier}
        onChange={e => setFormData({ ...formData, branchSpecifier: e.target.value })}
        placeholder="e.g., master, dev-branch"
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
          Specify the branch to deploy from
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
        Credentials
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
                e.g., username-pat
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
              borderWidth: '1x',
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
          Select or add credentials for private repositories
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
      Add Cred
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
        Webhooks
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
        <span role="img" aria-label="tip" style={{ fontSize: '0.8rem', marginRight: '8px' }}>
          💡
        </span>
        <Typography variant="caption" sx={{ color: theme === 'dark' ? '#858585' : '#666' }}>
          Select or add a webhook for automated deployments
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
      Add Webhook
    </Button>
  </Box>
);

export default CreateFromGitHubForm;
