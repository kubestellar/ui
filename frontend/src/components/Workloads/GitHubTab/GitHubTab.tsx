import { useState } from 'react';
import { Box, Card, Typography, useTheme, Divider } from '@mui/material';
import GitHubOptionButtons from './GitHubOptionButtons';
import PopularRepositoriesForm from './PopularRepositoriesForm';
import WorkloadLabelInput from '../WorkloadLabelInput';
import { useTranslation } from 'react-i18next'; // Add this import

interface Props {
  onComplete: (repoData: { url: string; path: string }) => void;
  formData?: { workload_label: string };
  setFormData?: (data: { workload_label: string }) => void;
}

export const GitHubTab = ({ onComplete, formData, setFormData }: Props) => {
  const { t } = useTranslation(); // Add translation hook
  const theme = useTheme();
  const isDarkTheme = theme.palette.mode === 'dark';
  const [selectedOption, setSelectedOption] = useState<string>('yourGitHub');
  const [selectedRepo, setSelectedRepo] = useState<{ url: string; path: string } | null>(null);

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
    setSelectedRepo(null);
  };

  const handleRepoSelect = (repoData: { url: string; path: string }) => {
    setSelectedRepo(repoData);
    onComplete(repoData);
  };

  const renderForm = () => {
    switch (selectedOption) {
      case 'popular':
        return (
          <PopularRepositoriesForm
            onSelect={handleRepoSelect}
            theme={isDarkTheme ? 'dark' : 'light'}
          />
        );
      case 'yourGitHub':
        return (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1">
              {t('workloads.github.options.placeholder.yourGitHub')}
            </Typography>
          </Box>
        );
      case 'enterprise':
        return (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1">
              {t('workloads.github.options.placeholder.enterprise')}
            </Typography>
          </Box>
        );
      case 'public':
        return (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1">
              {t('workloads.github.options.placeholder.public')}
            </Typography>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        {t('workloads.github.tab.importFromGitHub')}
      </Typography>
      <Typography variant="body2" sx={{ color: isDarkTheme ? '#aaa' : '#666', mb: 2 }}>
        {t('workloads.github.tab.selectRepositorySource')}
      </Typography>

      {formData && setFormData && (
        <Box sx={{ mb: 3 }}>
          <WorkloadLabelInput
            value={formData.workload_label || ''}
            handleChange={e => setFormData({ ...formData, workload_label: e.target.value })}
            theme={isDarkTheme ? 'dark' : 'light'}
          />
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        <Card
          sx={{
            p: 3,
            width: { xs: '100%', md: '40%' },
            backgroundColor: isDarkTheme ? '#1e1e1e' : '#fff',
            borderRadius: '12px',
            boxShadow: isDarkTheme
              ? '0 4px 14px rgba(0, 0, 0, 0.3)'
              : '0 4px 14px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            {t('workloads.github.tab.repositorySource')}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <GitHubOptionButtons
            selectedOption={selectedOption}
            handleOptionSelect={handleOptionSelect}
            theme={isDarkTheme ? 'dark' : 'light'}
          />
        </Card>

        <Card
          sx={{
            p: 3,
            width: { xs: '100%', md: '60%' },
            backgroundColor: isDarkTheme ? '#1e1e1e' : '#fff',
            borderRadius: '12px',
            boxShadow: isDarkTheme
              ? '0 4px 14px rgba(0, 0, 0, 0.3)'
              : '0 4px 14px rgba(0, 0, 0, 0.1)',
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            {selectedOption === 'popular'
              ? t('workloads.github.tab.selectRepository')
              : t('workloads.github.tab.repositoryDetails')}
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {renderForm()}
        </Card>
      </Box>

      {selectedRepo && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {t('workloads.github.tab.selectedRepository')} {selectedRepo.url}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default GitHubTab;
