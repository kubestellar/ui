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
const bounceIn = keyframes`
  0% { transform: scale3d(0.3, 0.3, 1); opacity: 0; }
  50% { transform: scale3d(1.05, 1.05, 1); }
  70% { transform: scale3d(0.9, 0.9, 1); }
  100% { transform: scale3d(1, 1, 1); opacity: 1; }
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
    const rf = useReactFlow();
    const { getZoom, setViewport, getViewport } = rf;
    const [zoomLevel, setZoomLevel] = useState<number>(120);
    const [presetMenuAnchor, setPresetMenuAnchor] = useState<null | HTMLElement>(null);
    const [hoveredButton, setHoveredButton] = useState<string | null>(null);
    const [showControls, setShowControls] = useState<boolean>(true);
    const panelRef = useRef<HTMLDivElement>(null);
    const storageKey = useMemo(
      () => `zoomControlsVisibility-${translationPrefix}`,
      [translationPrefix]
    );
    const [containerHeight, setContainerHeight] = useState<number>(800);

    useEffect(() => {
      const element = panelRef.current?.parentElement ?? panelRef.current;
      if (!element) return;

      const height = element.clientHeight || 800;
      setContainerHeight(height);
    }, []);

    const scaleFactor = useMemo(() => {
      const baseHeight = 700;
      const minScale = 0.85;
      const maxScale = 1.5;
      const calculatedScale = Math.max(minScale, Math.min(maxScale, containerHeight / baseHeight));
      return calculatedScale;
    }, [containerHeight]);

    const controlSizes = useMemo(
      () => ({
        buttonSize: Math.round(36 * scaleFactor),
        panelGap: Math.max(0.3, Math.min(1.2, 0.7 * scaleFactor)),
        panelPadding: `${Math.round(6 * scaleFactor)}px ${Math.round(6 * scaleFactor)}px ${Math.round(6 * scaleFactor)}px`,
        separatorWidth: `${Math.round(26 * scaleFactor)}px`,
        typographyPadding: `${Math.round(5 * scaleFactor)}px ${Math.round(8 * scaleFactor)}px`,
        typographyFontSize: `clamp(9px, ${10 * scaleFactor}px, 14px)`,
        toggleHeight: Math.round(34 * scaleFactor),
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
      const rfInstance = rf as typeof rf & {
        on?: (
          event: string,
          handler: (data: { viewport: { zoom: number; x: number; y: number } }) => void
        ) => void;
        off?: (
          event: string,
          handler: (data: { viewport: { zoom: number; x: number; y: number } }) => void
        ) => void;
      };

      if (
        rfInstance &&
        typeof rfInstance.on === 'function' &&
        typeof rfInstance.off === 'function'
      ) {
        const handleMove = ({ viewport }: { viewport: { zoom: number; x: number; y: number } }) => {
          const snapped = snapToStep(viewport.zoom * 100);
          setZoomLevel(Math.min(Math.max(snapped, 10), 200));
          setZoom(viewport.zoom);
        };

        rfInstance.on('move', handleMove);

        return () => {
          if (rfInstance && typeof rfInstance.off === 'function') {
            rfInstance.off('move', handleMove);
          }
        };
      } else {
        let rafId: number | null = null;
        let lastZoom = rf.getZoom();
        let isCancelled = false;

        const updateZoomLevel = () => {
          if (isCancelled) return;

          const currentViewport = rf.getViewport();
          const currentZoom = currentViewport.zoom;

          if (Math.abs(currentZoom - lastZoom) > 0.001) {
            const snapped = snapToStep(currentZoom * 100);
            setZoomLevel(Math.min(Math.max(snapped, 10), 200));
            setZoom(currentZoom);
            lastZoom = currentZoom;
          }

          rafId = requestAnimationFrame(updateZoomLevel);
        };

        const initialViewport = rf.getViewport();
        const snapped = snapToStep(initialViewport.zoom * 100);
        setZoomLevel(Math.min(Math.max(snapped, 10), 200));
        setZoom(initialViewport.zoom);
        lastZoom = initialViewport.zoom;

        rafId = requestAnimationFrame(updateZoomLevel);

        return () => {
          isCancelled = true;
          if (rafId !== null) {
            cancelAnimationFrame(rafId);
          }
        };
      }
    }, [rf, snapToStep, setZoom]);

    const animateZoom = useCallback(
      (targetZoom: number, duration: number = 200) => {
        const currentViewport = getViewport();
        setViewport({ ...currentViewport, zoom: targetZoom }, { duration });
      },
      [setViewport, getViewport]
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
          transition: 'transform 0.18s ease',
          transform:
            hoveredButton === buttonId ? 'translateY(-2px) scale(1.05)' : 'translateY(0) scale(1)',
          backdropFilter: 'blur(10px)',
          willChange: hoveredButton === buttonId || isActive ? 'transform' : 'auto', // Optimize for animations
          '&:focus': {
            outline: 'none',
          },
          '&:focus-visible': {
            outline: '2px solid #2563eb',
            outlineOffset: '2px',
          },
          '&:hover': {
            background: isActive
              ? 'linear-gradient(135deg, #2563eb, #4f46e5)'
              : theme === 'dark'
                ? 'linear-gradient(135deg, #475569, #64748b)'
                : 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
            transform: 'translateY(-2px) scale(1.05)',
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
          top: 'clamp(10px, 20px, 2vh)',
          right: 'clamp(10px, 20px, 2vw)',
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
          minWidth: 'fit-content',
          maxWidth: 'calc(100vw - clamp(20px, 40px, 4vw))',
          zIndex: 5,
          maxHeight: 'calc(100vh - clamp(20px, 40px, 4vh))',
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',
          pointerEvents: 'auto',
          transform: 'translateZ(0)',
          willChange: 'auto',
          boxSizing: 'border-box',
          '@media (max-width: 600px)': {
            right: 'clamp(5px, 10px, 1vw)',
            maxWidth: 'calc(100vw - clamp(10px, 20px, 2vw))',
          },
          contain: 'layout style paint',
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
                onClick={onToggleCollapse}
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
                onClick={onExpandAll}
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
                onClick={onCollapseAll}
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
                onClick={handleZoomIn}
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
                onClick={handleZoomOut}
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
                onClick={handleResetZoom}
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
                    onClick={onToggleFullscreen}
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
            onClick={toggleControls}
            sx={{
              ...getButtonStyles('toggleControls', !showControls),
              pointerEvents: 'auto',
              '&:focus': {
                outline: 'none',
              },
              '&:focus-visible': {
                outline: '2px solid #2563eb',
                outlineOffset: '2px',
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
