import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import WorkIcon from '@mui/icons-material/Work';
import PublicIcon from '@mui/icons-material/Public';
import StarIcon from '@mui/icons-material/Star';

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
  return (
    <Stack spacing={2} width="100%">
      <OptionButton
        icon={<GitHubIcon fontSize="medium" />}
        title="Your GitHub Repository"
        description="Import from your own GitHub repository"
        onClick={() => handleOptionSelect('yourGitHub')}
        theme={theme}
        selected={selectedOption === 'yourGitHub'}
      />
      <OptionButton
        icon={<WorkIcon fontSize="medium" />}
        title="Enterprise Repository"
        description="Import from a GitHub Enterprise repository"
        onClick={() => handleOptionSelect('enterprise')}
        theme={theme}
        selected={selectedOption === 'enterprise'}
      />
      <OptionButton
        icon={<PublicIcon fontSize="medium" />}
        title="Public Repository"
        description="Import from any public GitHub repository"
        onClick={() => handleOptionSelect('public')}
        theme={theme}
        selected={selectedOption === 'public'}
      />
      <OptionButton
        icon={<StarIcon fontSize="medium" />}
        title="Popular Repositories"
        description="Choose from our curated list of examples"
        onClick={() => handleOptionSelect('popular')}
        theme={theme}
        selected={selectedOption === 'popular'}
      />
    </Stack>
  );
};

export default GitHubOptionButtons;
