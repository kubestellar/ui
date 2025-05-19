import { memo, useState, useEffect, useCallback } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { ZoomIn, ZoomOut } from '@mui/icons-material';
import { useReactFlow } from 'reactflow';

interface ZoomControlsProps {
  theme: string;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export const ZoomControls = memo<ZoomControlsProps>(
  ({ theme, onToggleCollapse, isCollapsed, onExpandAll, onCollapseAll }) => {
    const { getZoom, setViewport } = useReactFlow();
    const [zoomLevel, setZoomLevel] = useState<number>(100);

    const snapToStep = useCallback((zoom: number) => {
      const step = 10;
      return Math.round(zoom / step) * step;
    }, []);

    useEffect(() => {
      const currentZoom = getZoom() * 100;
      const snappedZoom = snapToStep(currentZoom);
      setZoomLevel(Math.min(Math.max(snappedZoom, 10), 200));
    }, [getZoom, snapToStep]);

    const animateZoom = useCallback(
      (targetZoom: number, duration: number = 200) => {
        const startZoom = getZoom();
        const startTime = performance.now();

        const step = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const newZoom = startZoom + (targetZoom - startZoom) * progress;
          setViewport({ zoom: newZoom, x: 0, y: 10 });

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            setZoomLevel(snapToStep(newZoom * 100));
          }
        };

        requestAnimationFrame(step);
      },
      [getZoom, setViewport, snapToStep]
    );

    const handleZoomIn = useCallback(() => {
      const currentZoom = getZoom() * 100;
      const newZoomPercentage = snapToStep(currentZoom + 10);
      const newZoom = Math.min(newZoomPercentage / 100, 2);
      animateZoom(newZoom);
    }, [animateZoom, getZoom, snapToStep]);

    const handleZoomOut = useCallback(() => {
      const currentZoom = getZoom() * 100;
      const newZoomPercentage = snapToStep(currentZoom - 10);
      const newZoom = Math.max(newZoomPercentage / 100, 0.1);
      animateZoom(newZoom);
    }, [animateZoom, getZoom, snapToStep]);

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
        }}
      >
        <Button
          variant="text"
          onClick={onToggleCollapse}
          title="Group By Resource/Kind"
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
          title="Expand all the child nodes of all parent nodes"
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
          title="Collapse all the child nodes of all parent nodes"
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
          title="Zoom In"
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
          title="Zoom Out"
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
          }}
        >
          {zoomLevel}%
        </Typography>
      </Box>
    );
  }
);
