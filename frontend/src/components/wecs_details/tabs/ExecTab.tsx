import React from 'react';
import { Box, FormControl, Select, MenuItem, IconButton, Tooltip, Typography, CircularProgress, SelectChangeEvent } from '@mui/material';
import { FiTrash2, FiMaximize2, FiMinimize2 } from 'react-icons/fi';

interface ContainerInfo {
  ContainerName: string;
  Image: string;
}

interface ExecTabProps {
  theme: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  name: string;
  containers: ContainerInfo[];
  selectedContainer: string;
  loadingContainers: boolean;
  isTerminalMaximized: boolean;
  execTerminalRef: React.RefObject<HTMLDivElement>;
  execTerminalKey: string;
  handleContainerChange: (event: SelectChangeEvent<string>) => void;
  setIsContainerSelectActive: (active: boolean) => void;
  setIsTerminalMaximized: (maximized: boolean) => void;
  clearTerminal: () => void;
}

const ExecTab: React.FC<ExecTabProps> = ({
  theme,
  t,
  name,
  containers,
  selectedContainer,
  loadingContainers,
  isTerminalMaximized,
  execTerminalRef,
  execTerminalKey,
  handleContainerChange,
  setIsContainerSelectActive,
  setIsTerminalMaximized,
  clearTerminal,
}) => {
  return (
    <Box
      sx={{
        height: isTerminalMaximized ? 'calc(100vh - 220px)' : '500px',
        bgcolor: theme === 'dark' ? '#1A1A1A' : '#FAFAFA',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        border: theme === 'dark' ? '1px solid #333' : '1px solid #E0E0E0',
        p: 0,
        pb: 0.5,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'height 0.3s ease-in-out',
      }}
      onClick={(e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation(); // Stop clicks inside this box from bubbling
      }}
    >
      {/* Terminal header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 0.75,
          backgroundColor: theme === 'dark' ? '#252525' : '#F0F0F0',
          borderBottom: theme === 'dark' ? '1px solid #333' : '1px solid #E0E0E0',
          fontSize: '13px',
          fontWeight: 500,
          color: theme === 'dark' ? '#CCC' : '#444',
          fontFamily: '"Segoe UI", "Helvetica", "Arial", sans-serif',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <span
            style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#98C379',
              marginRight: '8px',
            }}
          />
          {name}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Container selection dropdown */}
          <FormControl
            size="small"
            className="container-dropdown"
            onMouseDown={() => {
              setIsContainerSelectActive(true);
            }}
            sx={{
              minWidth: 150,
              '& .MuiInputBase-root': {
                color: theme === 'dark' ? '#CCC' : '#444',
                fontSize: '13px',
                backgroundColor: theme === 'dark' ? '#333' : '#FFF',
                border: theme === 'dark' ? '1px solid #444' : '1px solid #DDD',
                borderRadius: '4px',
                height: '30px',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
            }}
            onClick={(e: React.MouseEvent<HTMLDivElement>) => {
              e.stopPropagation();
            }}
          >
            <Select
              value={selectedContainer}
              onChange={handleContainerChange}
              displayEmpty
              onMouseDown={(e: React.MouseEvent<HTMLElement>) => {
                e.stopPropagation();
                setIsContainerSelectActive(true);
              }}
              onClose={() => {
                setTimeout(() => setIsContainerSelectActive(false), 300);
              }}
              MenuProps={{
                slotProps: {
                  paper: {
                    onClick: (e: React.MouseEvent<HTMLDivElement>) => {
                      e.stopPropagation();
                    },
                    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
                      e.stopPropagation();
                      setIsContainerSelectActive(true);
                    },
                    style: {
                      zIndex: 9999,
                    },
                  },
                  root: {
                    onClick: (e: React.MouseEvent<HTMLDivElement>) => {
                      e.stopPropagation();
                    },
                    onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => {
                      e.stopPropagation();
                      setIsContainerSelectActive(true);
                    },
                  },
                },
                anchorOrigin: {
                  vertical: 'bottom',
                  horizontal: 'left',
                },
                transformOrigin: {
                  vertical: 'top',
                  horizontal: 'left',
                },
              }}
              renderValue={value => (
                <Box
                  sx={{ display: 'flex', alignItems: 'center' }}
                  onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                    e.stopPropagation();
                  }}
                >
                  {loadingContainers ? (
                    <CircularProgress size={14} sx={{ mr: 1 }} />
                  ) : (
                    <span
                      className="fas fa-cube"
                      style={{ marginRight: '8px', fontSize: '12px' }}
                    />
                  )}
                  {value || t('wecsDetailsPanel.containers.selectContainer')}
                </Box>
              )}
            >
              {containers.map(container => (
                <MenuItem
                  key={container.ContainerName}
                  value={container.ContainerName}
                  sx={{
                    fontSize: '13px',
                    py: 0.75,
                  }}
                  onMouseDown={(e: React.MouseEvent<HTMLLIElement>) => {
                    e.stopPropagation();
                    setIsContainerSelectActive(true);
                  }}
                >
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2">{container.ContainerName}</Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: '11px' }}
                    >
                      {container.Image.length > 40
                        ? container.Image.substring(0, 37) + '...'
                        : container.Image}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
              {containers.length === 0 && !loadingContainers && (
                <MenuItem disabled>
                  <Typography variant="body2">
                    {t('wecsDetailsPanel.containers.noContainersFound')}
                  </Typography>
                </MenuItem>
              )}
            </Select>
          </FormControl>

          {/* Existing buttons */}
          <Tooltip title={t('wecsDetailsPanel.buttons.clearTerminal')}>
            <IconButton
              size="small"
              onClick={clearTerminal}
              sx={{
                color: theme === 'dark' ? '#CCC' : '#666',
                padding: '2px',
                '&:hover': {
                  backgroundColor:
                    theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                },
              }}
            >
              <FiTrash2 size={16} />
            </IconButton>
          </Tooltip>

          <Tooltip
            title={
              isTerminalMaximized
                ? t('wecsDetailsPanel.buttons.minimize')
                : t('wecsDetailsPanel.buttons.maximize')
            }
          >
            <IconButton
              size="small"
              onClick={() => setIsTerminalMaximized(!isTerminalMaximized)}
              sx={{
                color: theme === 'dark' ? '#CCC' : '#666',
                padding: '2px',
                '&:hover': {
                  backgroundColor:
                    theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                },
              }}
            >
              {isTerminalMaximized ? (
                <FiMinimize2 size={16} />
              ) : (
                <FiMaximize2 size={16} />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Terminal content */}
      <Box
        sx={{
          flex: 1,
          p: 1,
          overflow: 'hidden',
        }}
      >
        <div
          key={execTerminalKey}
          ref={execTerminalRef}
          style={{
            height: '100%',
            width: '100%',
            padding: '4px',
            overflow: 'hidden',
          }}
        />
      </Box>
    </Box>
  );
};

export default ExecTab; 