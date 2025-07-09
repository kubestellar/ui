import { memo, useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import { ZoomIn, ZoomOut } from '@mui/icons-material';
import { useReactFlow } from 'reactflow';
import { useTranslation } from 'react-i18next';
import useZoomStore, { zoomPresets } from '../../stores/zoomStore';
import useEdgeTypeStore from '../../stores/edgeTypeStore';

interface ZoomControlsProps {
  theme: string;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export const ZoomControls = memo<ZoomControlsProps>(
  ({ theme, onToggleCollapse, isCollapsed, onExpandAll, onCollapseAll }) => {
    const { t } = useTranslation();
    const { getZoom, setViewport, getViewport } = useReactFlow();
    const [zoomLevel, setZoomLevel] = useState<number>(120);
    const [presetMenuAnchor, setPresetMenuAnchor] = useState<null | HTMLElement>(null);

    const { setZoom } = useZoomStore();
    const { edgeType, setEdgeType } = useEdgeTypeStore();

    const snapToStep = useCallback((zoom: number) => {
      const step = 10;
      return Math.round(zoom / step) * step;
    }, []);

    useEffect(() => {
      const updateZoomLevel = () => {
        const currentZoom = getZoom() * 100;
        const snappedZoom = snapToStep(currentZoom);
        setZoomLevel(Math.min(Math.max(snappedZoom, 10), 200));
        setZoom(getZoom());
      };

      updateZoomLevel();

      const interval = setInterval(updateZoomLevel, 100);

      return () => clearInterval(interval);
    }, [getZoom, snapToStep, setViewport, setZoom]);

    const animateZoom = useCallback(
      (targetZoom: number, duration: number = 200) => {
        const startZoom = getZoom();
        const currentViewport = getViewport();
        const startTime = performance.now();

        const step = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const newZoom = startZoom + (targetZoom - startZoom) * progress;

          setViewport({
            zoom: newZoom,
            x: currentViewport.x,
            y: currentViewport.y,
          });

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            setZoomLevel(snapToStep(newZoom * 100));
            setZoom(newZoom);
          }
        };

        requestAnimationFrame(step);
      },
      [getZoom, getViewport, setViewport, snapToStep, setZoom]
    );

    const handleZoomIn = useCallback(() => {
      const currentZoom = getZoom();
      const currentZoomPercentage = currentZoom * 100;
      const newZoomPercentage = Math.min(snapToStep(currentZoomPercentage + 10), 200);
      const newZoom = newZoomPercentage / 100;

      if (Math.abs(newZoom - currentZoom) > 0.01) {
        animateZoom(newZoom);
      }
    }, [animateZoom, getZoom, snapToStep]);

    const handleZoomOut = useCallback(() => {
      const currentZoom = getZoom();
      const currentZoomPercentage = currentZoom * 100;
      const newZoomPercentage = Math.max(snapToStep(currentZoomPercentage - 10), 10);
      const newZoom = newZoomPercentage / 100;

      if (Math.abs(newZoom - currentZoom) > 0.01) {
        animateZoom(newZoom);
      }
    }, [animateZoom, getZoom, snapToStep]);

    const handlePresetClick = useCallback(
      (preset: (typeof zoomPresets)[0]) => {
        animateZoom(preset.level, 300);
        setPresetMenuAnchor(null);
      },
      [animateZoom]
    );

    const handlePresetMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
      setPresetMenuAnchor(event.currentTarget);
    }, []);

    const handlePresetMenuClose = useCallback(() => {
      setPresetMenuAnchor(null);
    }, []);

    const handleResetZoom = useCallback(() => {
      setViewport({ ...getViewport(), zoom: 1 }, { duration: 200 });
      setZoomLevel(100);
      setZoom(1);
    }, [setViewport, getViewport, setZoom]);

    return (
      <Box
        sx={{
          position: 'absolute',
          top: 20,
          left: 20,
          display: 'flex',
          gap: 1,
          background: theme === 'dark' ? '#333' : '#fff',
          padding: '4px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          alignItems: 'center',
        }}
      >
        <Button
          variant="text"
          onClick={onToggleCollapse}
          title={t('wecsTopology.zoomControls.groupByResource')}
          sx={{
            color: theme === 'dark' ? '#fff' : '#6d7f8b',
            backgroundColor: isCollapsed ? (theme === 'dark' ? '#555' : '#e3f2fd') : 'transparent',
            '&:hover': {
              backgroundColor: theme === 'dark' ? '#555' : '#e3f2fd',
            },
            minWidth: '36px',
            padding: '4px',
          }}
        >
          <i className="fa fa-object-group fa-fw" style={{ fontSize: '17px' }} />
        </Button>
        <Button
          variant="text"
          onClick={onExpandAll}
          title={t('wecsTopology.zoomControls.expandAll')}
          sx={{
            color: theme === 'dark' ? '#fff' : '#6d7f8b',
            '&:hover': {
              backgroundColor: theme === 'dark' ? '#555' : '#e3f2fd',
            },
            minWidth: '36px',
            padding: '4px',
          }}
        >
          <i className="fa fa-plus fa-fw" style={{ fontSize: '17px' }} />
        </Button>
        <Button
          variant="text"
          onClick={onCollapseAll}
          title={t('wecsTopology.zoomControls.collapseAll')}
          sx={{
            color: theme === 'dark' ? '#fff' : '#6d7f8b',
            '&:hover': {
              backgroundColor: theme === 'dark' ? '#555' : '#e3f2fd',
            },
            minWidth: '36px',
            padding: '4px',
          }}
        >
          <i className="fa fa-minus fa-fw" style={{ fontSize: '17px' }} />
        </Button>
        <Button
          variant="text"
          onClick={handleZoomIn}
          title={t('wecsTopology.zoomControls.zoomIn')}
          sx={{
            color: theme === 'dark' ? '#fff' : '#6d7f8b',
            '&:hover': {
              backgroundColor: theme === 'dark' ? '#555' : '#e3f2fd',
            },
            minWidth: '36px',
            padding: '4px',
          }}
        >
          <ZoomIn />
        </Button>
        <Button
          variant="text"
          onClick={handleZoomOut}
          title={t('wecsTopology.zoomControls.zoomOut')}
          sx={{
            color: theme === 'dark' ? '#fff' : '#6d7f8b',
            '&:hover': {
              backgroundColor: theme === 'dark' ? '#555' : '#e3f2fd',
            },
            minWidth: '36px',
            padding: '4px',
          }}
        >
          <ZoomOut />
        </Button>
        <Tooltip title="Reset Zoom">
          <Button
            variant="text"
            onClick={handleResetZoom}
            sx={{
              color: theme === 'dark' ? '#fff' : '#6d7f8b',
              '&:hover': {
                backgroundColor: theme === 'dark' ? '#555' : '#e3f2fd',
              },
              minWidth: '36px',
              padding: '4px',
            }}
          >
            <i className="fa fa-refresh fa-fw" style={{ fontSize: '17px' }} />
          </Button>
        </Tooltip>
        <Typography
          variant="body1"
          sx={{
            border: `2px solid ${theme === 'dark' ? '#ccc' : '#1976d2'}`,
            backgroundColor: theme === 'dark' ? '#444' : '#e3f2fd',
            color: theme === 'dark' ? '#fff' : '#000',
            padding: '4px 8px',
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '50px',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onClick={handlePresetMenuOpen}
        >
          {zoomLevel}%
        </Typography>

        <Menu
          anchorEl={presetMenuAnchor}
          open={Boolean(presetMenuAnchor)}
          onClose={handlePresetMenuClose}
          PaperProps={{
            sx: {
              backgroundColor: theme === 'dark' ? '#333' : '#fff',
              color: theme === 'dark' ? '#fff' : '#000',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            },
          }}
        >
          {zoomPresets.map(preset => (
            <MenuItem
              key={preset.level}
              onClick={() => handlePresetClick(preset)}
              sx={{
                '&:hover': {
                  backgroundColor: theme === 'dark' ? '#555' : '#e3f2fd',
                },
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 1,
                minWidth: 0,
                padding: '4px 12px',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 70 }}>
                {preset.label} ({Math.round(preset.level * 100)}%)
              </Typography>
            </MenuItem>
          ))}
        </Menu>
        <Tooltip title="Edge Style">
          <Button
            variant="text"
            onClick={() => setEdgeType(edgeType === 'bezier' ? 'step' : 'bezier')}
            sx={{ ml: 2, minWidth: '36px', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label={edgeType === 'bezier' ? 'Curvy lines' : 'Square lines'}
          >
            {edgeType === 'bezier' ? (
              // Circle icon for curvy lines
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="7" stroke={theme === 'dark' ? '#fff' : '#1976d2'} strokeWidth="2.5" fill="none" />
              </svg>
            ) : (
              // Box icon for square lines
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4" y="4" width="14" height="14" rx="2" stroke={theme === 'dark' ? '#fff' : '#1976d2'} strokeWidth="2.5" fill="none" />
              </svg>
            )}
          </Button>
        </Tooltip>
      </Box>
    );
  }
);
