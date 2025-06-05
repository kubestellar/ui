import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import WorkIcon from '@mui/icons-material/Work';
import PublicIcon from '@mui/icons-material/Public';
import StarIcon from '@mui/icons-material/Star';
import { useTranslation } from 'react-i18next'; // Add this import

interface OptionButtonProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  theme: string;
  selected: boolean;
}

const OptionButton = ({
  icon,
  title,
  description,
  onClick,
  theme,
  selected,
}: OptionButtonProps) => (
  <Button
    variant="outlined"
    onClick={onClick}
    sx={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '16px',
      width: '100%',
      height: '80px',
      textAlign: 'left',
      textTransform: 'none',
      borderRadius: '8px',
      border: selected
        ? '2px solid #1976d2'
        : theme === 'dark'
          ? '1px solid #444'
          : '1px solid #e0e0e0',
      backgroundColor: selected
        ? theme === 'dark'
          ? 'rgba(25, 118, 210, 0.08)'
          : 'rgba(25, 118, 210, 0.04)'
        : 'transparent',
      '&:hover': {
        backgroundColor: theme === 'dark' ? '#333' : '#f5f5f5',
        borderColor: '#1976d2',
      },
    }}
  >
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        marginRight: '16px',
        color: selected ? '#1976d2' : theme === 'dark' ? '#aaa' : '#757575',
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 600,
          fontSize: '16px',
          color: selected ? '#1976d2' : theme === 'dark' ? '#d4d4d4' : '#333',
        }}
      >
        {title}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: theme === 'dark' ? '#aaa' : '#666',
        }}
      >
        {description}
      </Typography>
    </Box>
  </Button>
);

interface Props {
  selectedOption: string;
  handleOptionSelect: (option: string) => void;
  theme: string;
}

export const GitHubOptionButtons = ({ selectedOption, handleOptionSelect, theme }: Props) => {
  const { t } = useTranslation(); // Add translation hook
  
  return (
    <Stack spacing={2} width="100%">
      <OptionButton
        icon={<GitHubIcon fontSize="medium" />}
        title={t('workloads.github.options.yourGitHub.title')}
        description={t('workloads.github.options.yourGitHub.description')}
        onClick={() => handleOptionSelect('yourGitHub')}
        theme={theme}
        selected={selectedOption === 'yourGitHub'}
      />
      <OptionButton
        icon={<WorkIcon fontSize="medium" />}
        title={t('workloads.github.options.enterprise.title')}
        description={t('workloads.github.options.enterprise.description')}
        onClick={() => handleOptionSelect('enterprise')}
        theme={theme}
        selected={selectedOption === 'enterprise'}
      />
      <OptionButton
        icon={<PublicIcon fontSize="medium" />}
        title={t('workloads.github.options.public.title')}
        description={t('workloads.github.options.public.description')}
        onClick={() => handleOptionSelect('public')}
        theme={theme}
        selected={selectedOption === 'public'}
      />
      <OptionButton
        icon={<StarIcon fontSize="medium" />}
        title={t('workloads.github.options.popular.title')}
        description={t('workloads.github.options.popular.description')}
        onClick={() => handleOptionSelect('popular')}
        theme={theme}
        selected={selectedOption === 'popular'}
      />
    </Stack>
  );
};

export default GitHubOptionButtons;
