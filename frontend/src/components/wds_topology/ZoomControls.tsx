import { memo, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Menu,
  MenuItem,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  keyframes,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  Refresh,
  Add,
  Remove,
  ViewQuilt,
  Fullscreen,
  FullscreenExit,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { useReactFlow } from 'reactflow';
import { useTranslation } from 'react-i18next';
import useZoomStore, { zoomPresets } from '../../stores/zoomStore';
import useEdgeTypeStore from '../../stores/edgeTypeStore';

// Optimized animations with GPU acceleration
const pulseGlow = keyframes`
  0%, 100% { transform: scale3d(1, 1, 1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
  50% { transform: scale3d(1, 1, 1); box-shadow: 0 0 0 4px rgba(59, 130, 246, 0); }
`;

const bounceIn = keyframes`
  0% { transform: scale3d(0.3, 0.3, 1); opacity: 0; }
  50% { transform: scale3d(1.05, 1.05, 1); }
  70% { transform: scale3d(0.9, 0.9, 1); }
  100% { transform: scale3d(1, 1, 1); opacity: 1; }
`;

const wiggle = keyframes`
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(1deg); }
  75% { transform: rotate(-1deg); }
`;

interface ZoomControlsProps {
  theme: string;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  translationPrefix?: string;
}

export const ZoomControls = memo<ZoomControlsProps>(
  ({
    theme,
    onToggleCollapse,
    isCollapsed,
    onExpandAll,
    onCollapseAll,
    onToggleFullscreen,
    isFullscreen = false,
    translationPrefix = 'wecsTopology',
  }) => {
    const { t } = useTranslation();
    const { getZoom, setViewport, getViewport } = useReactFlow();
    const [zoomLevel, setZoomLevel] = useState<number>(120);
    const [presetMenuAnchor, setPresetMenuAnchor] = useState<null | HTMLElement>(null);
    const [hoveredButton, setHoveredButton] = useState<string | null>(null);
    const [showControls, setShowControls] = useState<boolean>(true);
    const panelRef = useRef<HTMLDivElement>(null);
    const storageKey = useMemo(
      () => `zoomControlsVisibility-${translationPrefix}`,
      [translationPrefix]
    );
    // Use viewport height to calculate a proportional scale factor
    // Base scale: 1.0 at 800px viewport height
    // Scales proportionally: smaller screens = smaller scale, larger screens = larger scale
    const [viewportHeight, setViewportHeight] = useState<number>(800);

    useEffect(() => {
      const updateViewportHeight = () => {
        setViewportHeight(window.innerHeight);
      };

      updateViewportHeight();
      window.addEventListener('resize', updateViewportHeight);

      return () => window.removeEventListener('resize', updateViewportHeight);
    }, []);

    // Calculate proportional scale factor based on viewport height
    // Minimum scale: 0.75 (for very small screens ~400px)
    // Maximum scale: 1.4 (for very tall screens ~1600px+)
    // Base: 1.0 at 800px viewport height
    const scaleFactor = useMemo(() => {
      const baseHeight = 800;
      const minScale = 0.75;
      const maxScale = 1.4;
      const calculatedScale = Math.max(minScale, Math.min(maxScale, viewportHeight / baseHeight));
      return calculatedScale;
    }, [viewportHeight]);

    // Calculate sizes based on scale factor to maintain proportions
    const controlSizes = useMemo(
      () => ({
        // Button sizes scale proportionally (base: 32px at 800px viewport)
        buttonSize: Math.round(32 * scaleFactor),
        // Gaps scale proportionally (base: 0.7 at 800px viewport)
        panelGap: Math.max(0.3, Math.min(1.2, 0.7 * scaleFactor)),
        // Padding scales proportionally using calc
        panelPadding: `${Math.round(6 * scaleFactor)}px ${Math.round(6 * scaleFactor)}px ${Math.round(6 * scaleFactor)}px`,
        // Separator width scales proportionally (base: 26px)
        separatorWidth: `${Math.round(26 * scaleFactor)}px`,
        // Typography padding scales proportionally
        typographyPadding: `${Math.round(5 * scaleFactor)}px ${Math.round(8 * scaleFactor)}px`,
        // Font size uses clamp for smooth scaling
        typographyFontSize: `clamp(9px, ${10 * scaleFactor}px, 14px)`,
        // Toggle height scales proportionally (base: 30px)
        toggleHeight: Math.round(30 * scaleFactor),
        // Icon font size scales with button size
        iconFontSize: (scaleFactor < 0.85 ? 'small' : scaleFactor > 1.2 ? 'medium' : 'small') as
          | 'inherit'
          | 'large'
          | 'medium'
          | 'small',
      }),
      [scaleFactor]
    );

    useEffect(() => {
      try {
        const storedValue = localStorage.getItem(storageKey);
        if (storedValue !== null) {
          setShowControls(storedValue === 'expanded');
        }
      } catch (error) {
        console.warn('Unable to read zoom control state:', error);
      }
    }, [storageKey]);

    const toggleControls = () => {
      setShowControls(prev => {
        const nextState = !prev;
        try {
          localStorage.setItem(storageKey, nextState ? 'expanded' : 'collapsed');
        } catch (error) {
          console.warn('Unable to persist zoom control state:', error);
        }
        return nextState;
      });
    };
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

    const handleEdgeTypeChange = useCallback(
      (_: React.MouseEvent<HTMLElement>, newEdgeType: 'bezier' | 'step' | null) => {
        if (newEdgeType) {
          setEdgeType(newEdgeType);
        }
      },
      [setEdgeType]
    );

    // Enhanced button styles with adorable effects - memoized for performance
    const getButtonStyles = useMemo(
      () =>
        (buttonId: string, isActive = false) => ({
          minWidth: `${controlSizes.buttonSize}px`,
          height: `${controlSizes.buttonSize}px`,
          borderRadius: '12px',
          margin: '0 2px',
          background: isActive
            ? theme === 'dark'
              ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
              : 'linear-gradient(135deg, #60a5fa, #3b82f6)'
            : hoveredButton === buttonId
              ? theme === 'dark'
                ? 'linear-gradient(135deg, #475569, #64748b)'
                : 'linear-gradient(135deg, #f1f5f9, #e2e8f0)'
              : theme === 'dark'
                ? 'rgba(15, 23, 42, 0.8)'
                : 'rgba(255, 255, 255, 0.9)',
          color: isActive ? '#ffffff' : theme === 'dark' ? '#f1f5f9' : '#1e293b',
          border: isActive
            ? 'none'
            : `1px solid ${theme === 'dark' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.3)'}`,
          boxShadow: isActive
            ? '0 4px 20px rgba(59, 130, 246, 0.4)'
            : hoveredButton === buttonId
              ? theme === 'dark'
                ? '0 4px 20px rgba(0, 0, 0, 0.3)'
                : '0 4px 20px rgba(0, 0, 0, 0.1)'
              : 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform:
            hoveredButton === buttonId ? 'translateY(-2px) scale(1.05)' : 'translateY(0) scale(1)',
          animation: isActive ? `${pulseGlow} 2s infinite` : 'none',
          backdropFilter: 'blur(10px)',
          willChange: hoveredButton === buttonId || isActive ? 'transform' : 'auto', // Optimize for animations
          '&:focus': {
            outline: 'none',
          },
          '&:focus-visible': {
            outline: 'none',
          },
          '&:hover': {
            background: isActive
              ? 'linear-gradient(135deg, #2563eb, #4f46e5)'
              : theme === 'dark'
                ? 'linear-gradient(135deg, #475569, #64748b)'
                : 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
            transform: 'translateY(-2px) scale(1.05)',
            boxShadow: isActive
              ? '0 6px 25px rgba(59, 130, 246, 0.5)'
              : theme === 'dark'
                ? '0 6px 25px rgba(0, 0, 0, 0.4)'
                : '0 6px 25px rgba(0, 0, 0, 0.15)',
            animation: `${wiggle} 0.5s ease-in-out`,
          },
        }),
      [controlSizes.buttonSize, theme, hoveredButton]
    );

    // Optimize event handlers
    const handleMouseEnter = useCallback((buttonId: string) => {
      return () => setHoveredButton(buttonId);
    }, []);

    const handleMouseLeave = useCallback(() => {
      setHoveredButton(null);
    }, []);

    return (
      <Box
        ref={panelRef}
        sx={{
          position: 'absolute',
          top: 20,
          right: 20,
          left: 'auto',
          bottom: 'auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          gap: controlSizes.panelGap,
          background:
            theme === 'dark'
              ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.95))',
          padding: controlSizes.panelPadding,
          borderRadius: '16px',
          boxShadow:
            theme === 'dark'
              ? '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
              : '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px)',
          border:
            theme === 'dark'
              ? '1px solid rgba(148, 163, 184, 0.1)'
              : '1px solid rgba(148, 163, 184, 0.2)',
          animation: `${bounceIn} 0.6s ease-out`,
          width: 'fit-content',
          zIndex: 5,
          maxHeight: 'calc(100% - 16px)',
          overflow: 'visible',
          overscrollBehavior: 'contain',
          pointerEvents: 'none',
        }}
      >
        {/* Group/Collapse Controls */}
        {showControls && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: controlSizes.panelGap,
              mt: Math.max(0.5, Math.min(1.5, 1 * scaleFactor)),
              pointerEvents: 'auto',
            }}
          >
            <Tooltip
              title={t(`${translationPrefix}.zoomControls.groupByResource`)}
              placement="left"
              arrow
            >
              <Button
                variant="text"
                onClick={e => {
                  onToggleCollapse();
                  e.currentTarget.blur();
                }}
                sx={getButtonStyles('collapse', isCollapsed)}
                onMouseEnter={handleMouseEnter('collapse')}
                onMouseLeave={handleMouseLeave}
              >
                <ViewQuilt fontSize={controlSizes.iconFontSize} />
              </Button>
            </Tooltip>

            <Tooltip
              title={t(`${translationPrefix}.zoomControls.expandAll`)}
              placement="left"
              arrow
            >
              <Button
                variant="text"
                onClick={e => {
                  onExpandAll();
                  e.currentTarget.blur();
                }}
                sx={getButtonStyles('expand')}
                onMouseEnter={handleMouseEnter('expand')}
                onMouseLeave={handleMouseLeave}
              >
                <Add fontSize={controlSizes.iconFontSize} />
              </Button>
            </Tooltip>

            <Tooltip
              title={t(`${translationPrefix}.zoomControls.collapseAll`)}
              placement="left"
              arrow
            >
              <Button
                variant="text"
                onClick={e => {
                  onCollapseAll();
                  e.currentTarget.blur();
                }}
                sx={getButtonStyles('collapseAll')}
                onMouseEnter={handleMouseEnter('collapseAll')}
                onMouseLeave={handleMouseLeave}
              >
                <Remove fontSize={controlSizes.iconFontSize} />
              </Button>
            </Tooltip>

            {/* Separator */}
            <Box
              sx={{
                width: controlSizes.separatorWidth,
                height: '1px',
                background:
                  theme === 'dark'
                    ? 'linear-gradient(to right, transparent, rgba(148, 163, 184, 0.3), transparent)'
                    : 'linear-gradient(to right, transparent, rgba(148, 163, 184, 0.4), transparent)',
                margin: `${Math.round(8 * scaleFactor)}px 0`,
              }}
            />
            {/* Zoom Controls */}
            <Tooltip title={t(`${translationPrefix}.zoomControls.zoomIn`)} placement="left" arrow>
              <Button
                variant="text"
                onClick={e => {
                  handleZoomIn();
                  e.currentTarget.blur();
                }}
                sx={getButtonStyles('zoomIn')}
                onMouseEnter={handleMouseEnter('zoomIn')}
                onMouseLeave={handleMouseLeave}
              >
                <ZoomIn fontSize={controlSizes.iconFontSize} />
              </Button>
            </Tooltip>
            <Tooltip title={t(`${translationPrefix}.zoomControls.zoomOut`)} placement="left" arrow>
              <Button
                variant="text"
                onClick={e => {
                  handleZoomOut();
                  e.currentTarget.blur();
                }}
                sx={getButtonStyles('zoomOut')}
                onMouseEnter={handleMouseEnter('zoomOut')}
                onMouseLeave={handleMouseLeave}
              >
                <ZoomOut fontSize={controlSizes.iconFontSize} />
              </Button>
            </Tooltip>
            <Tooltip
              title={t(`${translationPrefix}.zoomControls.resetZoom`)}
              placement="left"
              arrow
            >
              <Button
                variant="text"
                onClick={e => {
                  handleResetZoom();
                  e.currentTarget.blur();
                }}
                sx={getButtonStyles('reset')}
                onMouseEnter={handleMouseEnter('reset')}
                onMouseLeave={handleMouseLeave}
              >
                <Refresh fontSize={controlSizes.iconFontSize} />
              </Button>
            </Tooltip>
            {/* Zoom Level Display */}
            <Typography
              variant="body1"
              sx={{
                background:
                  theme === 'dark'
                    ? 'linear-gradient(135deg, #1e293b, #334155)'
                    : 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
                color: theme === 'dark' ? '#f1f5f9' : '#1e293b',
                padding: controlSizes.typographyPadding,
                borderRadius: '10px',
                textAlign: 'center',
                minWidth: `${Math.round(56 * scaleFactor)}px`,
                maxWidth: `${Math.round(66 * scaleFactor)}px`,
                cursor: 'pointer',
                userSelect: 'none',
                fontWeight: '600',
                fontSize: controlSizes.typographyFontSize,
                border: `1px solid ${theme === 'dark' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.3)'}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                  background:
                    theme === 'dark'
                      ? 'linear-gradient(135deg, #334155, #475569)'
                      : 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
                  transform: 'scale(1.05)',
                  boxShadow:
                    theme === 'dark'
                      ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                      : '0 4px 12px rgba(0, 0, 0, 0.1)',
                },
              }}
              onClick={handlePresetMenuOpen}
            >
              {zoomLevel}%
            </Typography>
            {/* Zoom Presets Menu */}
            <Menu
              anchorEl={presetMenuAnchor}
              open={Boolean(presetMenuAnchor)}
              onClose={handlePresetMenuClose}
              PaperProps={{
                sx: {
                  background:
                    theme === 'dark'
                      ? 'linear-gradient(135deg, #1e293b, #334155)'
                      : 'linear-gradient(135deg, #ffffff, #f8fafc)',
                  color: theme === 'dark' ? '#f1f5f9' : '#1e293b',
                  boxShadow:
                    theme === 'dark'
                      ? '0 12px 40px rgba(0, 0, 0, 0.4)'
                      : '0 12px 40px rgba(0, 0, 0, 0.15)',
                  borderRadius: '12px',
                  border: `1px solid ${theme === 'dark' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.3)'}`,
                  backdropFilter: 'blur(20px)',
                  overflow: 'hidden',
                },
              }}
            >
              {zoomPresets.map(preset => (
                <MenuItem
                  key={preset.level}
                  onClick={() => handlePresetClick(preset)}
                  sx={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    margin: '4px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background:
                        theme === 'dark'
                          ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
                          : 'linear-gradient(135deg, #60a5fa, #3b82f6)',
                      color: '#ffffff',
                      transform: 'translateX(4px)',
                    },
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {preset.label} ({Math.round(preset.level * 100)}%)
                  </Typography>
                </MenuItem>
              ))}
            </Menu>
            {/* Separator */}
            <Box
              sx={{
                width: controlSizes.separatorWidth,
                height: '1px',
                background:
                  theme === 'dark'
                    ? 'linear-gradient(to right, transparent, rgba(148, 163, 184, 0.3), transparent)'
                    : 'linear-gradient(to right, transparent, rgba(148, 163, 184, 0.4), transparent)',
                margin: `${Math.round(8 * scaleFactor)}px 0`,
              }}
            />
            {/* Edge Type Controls */}
            <Tooltip
              title={t(`${translationPrefix}.zoomControls.edgeStyle`)}
              placement="left"
              arrow
            >
              <ToggleButtonGroup
                value={edgeType}
                exclusive
                onChange={handleEdgeTypeChange}
                size="small"
                aria-label="Edge Type"
                orientation="vertical"
                sx={{
                  borderRadius: '10px',
                  overflow: 'hidden',
                  '& .MuiToggleButtonGroup-grouped': {
                    background:
                      theme === 'dark' ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                    border: `1px solid ${theme === 'dark' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.3)'}`,
                    color: theme === 'dark' ? '#94a3b8' : '#64748b',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&.Mui-selected': {
                      background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                      color: '#ffffff',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                      transform: 'scale(1.05)',
                      border: 'none',
                    },
                    '&:hover': {
                      background:
                        theme === 'dark'
                          ? 'linear-gradient(135deg, #475569, #64748b)'
                          : 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
                      transform: 'scale(1.02)',
                    },
                    '&:first-of-type': {
                      borderRadius: '10px 10px 0 0',
                    },
                    '&:last-of-type': {
                      borderRadius: '0 0 10px 10px',
                    },
                  },
                }}
              >
                <ToggleButton
                  value="step"
                  aria-label={t(`${translationPrefix}.zoomControls.square`)}
                  sx={{
                    px: 1.6,
                    py: 0.4,
                    minWidth: `${Math.round(36 * scaleFactor)}px`,
                    height: controlSizes.toggleHeight,
                  }}
                >
                  <i
                    className="fa fa-project-diagram"
                    style={{
                      fontSize: `clamp(11px, ${13 * scaleFactor}px, 16px)`,
                    }}
                  />
                </ToggleButton>
                <ToggleButton
                  value="bezier"
                  aria-label={t(`${translationPrefix}.zoomControls.curvy`)}
                  sx={{
                    px: 1.6,
                    py: 0.4,
                    minWidth: `${Math.round(36 * scaleFactor)}px`,
                    height: controlSizes.toggleHeight,
                  }}
                >
                  <i
                    className="fa fa-bezier-curve"
                    style={{
                      fontSize: `clamp(11px, ${13 * scaleFactor}px, 16px)`,
                    }}
                  />
                </ToggleButton>
              </ToggleButtonGroup>
            </Tooltip>
            {/* Fullscreen Controls - Only show if handler is provided */}
            {onToggleFullscreen && (
              <>
                {/* Separator */}
                <Box
                  sx={{
                    width: controlSizes.separatorWidth,
                    height: '1px',
                    background:
                      theme === 'dark'
                        ? 'linear-gradient(to right, transparent, rgba(148, 163, 184, 0.3), transparent)'
                        : 'linear-gradient(to right, transparent, rgba(148, 163, 184, 0.4), transparent)',
                    margin: `${Math.round(8 * scaleFactor)}px 0`,
                  }}
                />
                <Tooltip
                  title={
                    isFullscreen
                      ? t(`${translationPrefix}.zoomControls.exitFullscreen`)
                      : t(`${translationPrefix}.zoomControls.fullscreen`)
                  }
                  placement="left"
                  arrow
                >
                  <Button
                    variant="text"
                    onClick={e => {
                      onToggleFullscreen?.();
                      e.currentTarget.blur();
                    }}
                    sx={getButtonStyles('fullscreen', isFullscreen)}
                    onMouseEnter={handleMouseEnter('fullscreen')}
                    onMouseLeave={handleMouseLeave}
                  >
                    {isFullscreen ? (
                      <FullscreenExit fontSize={controlSizes.iconFontSize} />
                    ) : (
                      <Fullscreen fontSize={controlSizes.iconFontSize} />
                    )}
                  </Button>
                </Tooltip>
              </>
            )}
          </Box>
        )}
        {/* Button to show or hide the control panel */}

        <Tooltip
          title={
            showControls
              ? t(`${translationPrefix}.hideControls.hide`)
              : t(`${translationPrefix}.hideControls.show`)
          }
          placement="left"
          arrow
        >
          <Button
            variant="text"
            onClick={e => {
              toggleControls();
              // Remove focus after click to prevent blue outline from persisting
              e.currentTarget.blur();
            }}
            sx={{
              ...getButtonStyles('toggleControls', !showControls),
              pointerEvents: 'auto',
              '&:focus': {
                outline: 'none',
              },
              '&:focus-visible': {
                outline: 'none',
              },
            }}
            onMouseEnter={handleMouseEnter('toggleControls')}
            onMouseLeave={handleMouseLeave}
          >
            {showControls ? (
              <ExpandLess fontSize={controlSizes.iconFontSize} />
            ) : (
              <ExpandMore fontSize={controlSizes.iconFontSize} />
            )}
          </Button>
        </Tooltip>
      </Box>
    );
  }
);
