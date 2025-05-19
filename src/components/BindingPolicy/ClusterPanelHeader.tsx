import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  InputBase,
  IconButton,
  alpha,
  useTheme as useMuiTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { BsTagFill } from 'react-icons/bs';
import useTheme from '../../stores/themeStore';

interface ClusterPanelHeaderProps {
  compact?: boolean;
  onSearch: (term: string) => void;
  onAddLabels: () => void;
  onImportClusters: () => void;
}

const ClusterPanelHeader: React.FC<ClusterPanelHeaderProps> = ({
  compact = false,
  onSearch,
  onAddLabels,
  onImportClusters,
}) => {
  const muiTheme = useMuiTheme();
  const theme = useTheme(state => state.theme);
  const isDarkTheme = theme === 'dark';
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  return (
    <Box
      sx={{
        p: compact ? 1 : 2,
        backgroundColor: isDarkTheme ? 'rgba(37, 99, 235, 0.9)' : muiTheme.palette.primary.main,
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: isDarkTheme ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
        {showSearch ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: alpha(muiTheme.palette.common.white, 0.15),
              borderRadius: 1,
              px: 1,
              flexGrow: 1,
              mr: 1,
            }}
          >
            <InputBase
              placeholder="Search labels..."
              value={searchTerm}
              onChange={e => handleSearchChange(e.target.value)}
              sx={{
                color: 'white',
                flexGrow: 1,
                '& .MuiInputBase-input': {
                  py: 0.5,
                },
              }}
              autoFocus
            />
            <IconButton
              size="small"
              onClick={() => {
                handleSearchChange('');
                setShowSearch(false);
              }}
              sx={{
                color: 'white',
                p: 0.25,
                '&:hover': {
                  backgroundColor: isDarkTheme
                    ? 'rgba(255, 255, 255, 0.15)'
                    : 'rgba(255, 255, 255, 0.25)',
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        ) : (
          <Typography variant={compact ? 'subtitle1' : 'h6'}>Clusters</Typography>
        )}
        {!showSearch && !compact && (
          <IconButton
            size="small"
            sx={{
              ml: 1,
              color: 'white',
              '&:hover': {
                backgroundColor: isDarkTheme
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(255, 255, 255, 0.25)',
              },
            }}
            onClick={() => setShowSearch(true)}
          >
            <SearchIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      {!compact && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            endIcon={<BsTagFill />}
            onClick={onAddLabels}
            size="small"
            sx={{
              bgcolor: 'white',
              color: isDarkTheme ? 'rgba(37, 99, 235, 0.9)' : muiTheme.palette.primary.main,
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: alpha(muiTheme.palette.common.white, 0.9),
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              },
            }}
          >
            labels
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onImportClusters}
            size="small"
            sx={{
              bgcolor: 'white',
              color: isDarkTheme ? 'rgba(37, 99, 235, 0.9)' : muiTheme.palette.primary.main,
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: alpha(muiTheme.palette.common.white, 0.9),
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              },
            }}
          >
            Import
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ClusterPanelHeader;
