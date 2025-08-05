import { memo, useState, useMemo, useCallback } from 'react';
import { FiMoreVertical, FiHeart, FiZap, FiCpu } from 'react-icons/fi';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { TreeResourceItem } from '../TreeViewComponent';
import useTheme from '../../stores/themeStore';
import useLabelHighlightStore from '../../stores/labelHighlightStore';
import useZoomStore from '../../stores/zoomStore';
import { Tooltip, Chip, Box, keyframes } from '@mui/material';
import { useTranslation } from 'react-i18next';

// Optimized animations for better performance - using GPU acceleration
const pulseAnimation = keyframes`
  0% { transform: scale3d(1, 1, 1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
  70% { transform: scale3d(1, 1, 1); box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
  100% { transform: scale3d(1, 1, 1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
`;

const heartbeatAnimation = keyframes`
  0%, 70%, 100% { transform: scale3d(1, 1, 1); }
  14%, 42% { transform: scale3d(1.1, 1.1, 1); }
`;

const sparkleAnimation = keyframes`
  0%, 100% { opacity: 0; transform: scale3d(0, 0, 1) rotate(0deg); }
  50% { opacity: 1; transform: scale3d(1, 1, 1) rotate(180deg); }
`;

const gradientShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const floatAnimation = keyframes`
  0%, 100% { transform: translate3d(0, 0, 0); }
  50% { transform: translate3d(0, -3px, 0); }
`;

interface NodeLabelProps {
  label: string;
  icon: string;
  dynamicText: string;
  status: string;
  timeAgo?: string;
  onClick: (e: React.MouseEvent) => void;
  onMenuClick: (e: React.MouseEvent) => void;
  resourceData?: TreeResourceItem;
}

export const NodeLabel = memo<NodeLabelProps>(
  ({ label, icon, dynamicText, status, timeAgo, onClick, onMenuClick, resourceData }) => {
    const { t } = useTranslation();
    const theme = useTheme(state => state.theme);
    const { currentZoom, getScaledIconSize, getScaledFontSize } = useZoomStore();
    const [isHovered, setIsHovered] = useState(false);
    const [isMenuHovered, setIsMenuHovered] = useState(false);
    const [isMenuFocused, setIsMenuFocused] = useState(false);

    // Check for reduced motion preference
    const prefersReducedMotion = useMemo(
      () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      []
    );

    const { highlightedLabels, setHighlightedLabels, clearHighlightedLabels } =
      useLabelHighlightStore();

    // Memoize expensive calculations
    const labels = useMemo(
      () => resourceData?.metadata?.labels || {},
      [resourceData?.metadata?.labels]
    );
    const hasLabels = useMemo(() => Object.keys(labels).length > 0, [labels]);

    const hasHighlightedLabel = useMemo(
      () => highlightedLabels && labels[highlightedLabels.key] === highlightedLabels.value,
      [highlightedLabels, labels]
    );

    const iconSize = useMemo(
      () => Math.max(16, getScaledIconSize(currentZoom)),
      [getScaledIconSize, currentZoom]
    );
    const fontSize = useMemo(
      () => Math.max(11, getScaledFontSize(currentZoom)),
      [getScaledFontSize, currentZoom]
    );

    // Memoize status style calculation
    const statusStyle = useMemo(() => {
      const getStatusStyle = (status: string) => {
        const statusMap: Record<
          string,
          {
            gradient: string;
            glow: string;
            pulse: boolean;
            icon: typeof FiZap;
            color: string;
          }
        > = {
          Running: {
            gradient: 'linear-gradient(135deg, #10b981, #34d399)',
            glow: '0 4px 20px rgba(16, 185, 129, 0.3)',
            pulse: true,
            icon: FiZap,
            color: '#10b981',
          },
          Pending: {
            gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
            glow: '0 4px 20px rgba(245, 158, 11, 0.3)',
            pulse: false,
            icon: FiCpu,
            color: '#f59e0b',
          },
          Failed: {
            gradient: 'linear-gradient(135deg, #ef4444, #f87171)',
            glow: '0 4px 20px rgba(239, 68, 68, 0.3)',
            pulse: false,
            icon: FiHeart,
            color: '#ef4444',
          },
          Succeeded: {
            gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
            glow: '0 4px 20px rgba(139, 92, 246, 0.3)',
            pulse: false,
            icon: FiHeart,
            color: '#8b5cf6',
          },
        };
        return statusMap[status] || statusMap['Pending'];
      };
      return getStatusStyle(status);
    }, [status]);

    const StatusIcon = statusStyle.icon;

    // Optimize event handlers
    const handleMouseEnter = useCallback(() => setIsHovered(true), []);
    const handleMouseLeave = useCallback(() => setIsHovered(false), []);

    const handleMenuMouseEnter = useCallback(() => setIsMenuHovered(true), []);
    const handleMenuMouseLeave = useCallback(() => setIsMenuHovered(false), []);
    const handleMenuFocus = useCallback(() => setIsMenuFocused(true), []);
    const handleMenuBlur = useCallback(() => setIsMenuFocused(false), []);

    const handleLabelClick = useCallback(
      (key: string, value: string) => {
        return (e: React.MouseEvent) => {
          e.stopPropagation();
          const isAlreadyHighlighted =
            highlightedLabels && highlightedLabels.key === key && highlightedLabels.value === value;

          if (isAlreadyHighlighted) {
            clearHighlightedLabels();
          } else {
            setHighlightedLabels({ key, value });
          }
        };
      },
      [highlightedLabels, clearHighlightedLabels, setHighlightedLabels]
    );

    const handleLabelMouseEnter = useCallback(
      (key: string, value: string) => {
        return () => setHighlightedLabels({ key, value });
      },
      [setHighlightedLabels]
    );

    const handleLabelMouseLeave = useCallback(() => {
      clearHighlightedLabels();
    }, [clearHighlightedLabels]);

    // Memoize complex card style calculation - improved for text handling
    const cardStyle = useMemo(
      () => ({
        position: 'relative' as const,
        margin: '-12px -16px',
        padding: '12px 16px',
        borderRadius: '16px',
        minWidth: `${Math.max(200, iconSize + 150)}px`, // Minimum width based on zoom
        maxWidth: `${Math.max(320, iconSize + 250)}px`, // Maximum width to prevent excessive stretching
        width: 'calc(100% + 32px)',
        minHeight: `${Math.max(48, iconSize + 24)}px`, // Minimum height for consistency
        background:
          theme === 'dark'
            ? hasHighlightedLabel
              ? 'linear-gradient(135deg, #1e293b, #334155, #475569)'
              : 'linear-gradient(135deg, #0f172a, #1e293b)'
            : hasHighlightedLabel
              ? 'linear-gradient(135deg, #f1f5f9, #e2e8f0, #cbd5e1)'
              : 'linear-gradient(135deg, #ffffff, #f8fafc)',
        border: hasLabels
          ? `2px solid ${hasHighlightedLabel ? statusStyle.color : 'rgba(99, 102, 241, 0.4)'}`
          : `1px solid ${theme === 'dark' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.3)'}`,
        boxShadow: isHovered
          ? `${statusStyle.glow}, 0 8px 32px rgba(0, 0, 0, 0.2)`
          : hasHighlightedLabel
            ? `0 4px 20px ${statusStyle.color}40`
            : theme === 'dark'
              ? '0 4px 20px rgba(0, 0, 0, 0.3)'
              : '0 4px 20px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHovered ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
        backdropFilter: 'blur(10px)',
        animation:
          !prefersReducedMotion && statusStyle.pulse && status === 'Running'
            ? `${pulseAnimation} 2s infinite, ${floatAnimation} 3s ease-in-out infinite`
            : !prefersReducedMotion && isHovered
              ? `${floatAnimation} 2s ease-in-out infinite`
              : 'none',
        willChange:
          !prefersReducedMotion && (isHovered || (statusStyle.pulse && status === 'Running'))
            ? 'transform'
            : 'auto',
        overflow: 'hidden', // Prevent any content from escaping
        overflowWrap: 'break-word' as const, // Handle any edge cases
      }),
      [
        theme,
        hasHighlightedLabel,
        hasLabels,
        statusStyle,
        isHovered,
        status,
        prefersReducedMotion,
        iconSize,
      ]
    );

    const labelTooltipContent = hasLabels ? (
      <Box
        sx={{
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: 'auto',
          background:
            theme === 'dark'
              ? 'linear-gradient(135deg, #1e293b, #334155)'
              : 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
          borderRadius: '12px',
          border:
            theme === 'dark'
              ? '1px solid rgba(148, 163, 184, 0.2)'
              : '1px solid rgba(148, 163, 184, 0.3)',
        }}
      >
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '14px',
            marginBottom: '4px',
            color: theme === 'dark' ? '#f1f5f9' : '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <FiHeart size={14} style={{ color: '#ef4444' }} />
          {t('wecsTopology.nodeLabel.labels')}
        </div>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
          {Object.entries(labels).map(([key, value]) => (
            <Chip
              key={key}
              label={`${key}: ${value}`}
              size="small"
              sx={{
                fontSize: '11px',
                height: '24px',
                background:
                  highlightedLabels &&
                  highlightedLabels.key === key &&
                  highlightedLabels.value === value
                    ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
                    : theme === 'dark'
                      ? 'linear-gradient(135deg, #475569, #64748b)'
                      : 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
                color: theme === 'dark' ? '#f1f5f9' : '#1e293b',
                border: 'none',
                width: '100%',
                margin: '0',
                cursor: 'pointer',
                borderRadius: '8px',
                fontWeight: '500',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                },
              }}
              onClick={handleLabelClick(key, value)}
              onMouseEnter={handleLabelMouseEnter(key, value)}
              onMouseLeave={handleLabelMouseLeave}
            />
          ))}
        </Box>
      </Box>
    ) : (
      <Box
        sx={{
          padding: '8px 12px',
          background:
            theme === 'dark'
              ? 'linear-gradient(135deg, #1e293b, #334155)'
              : 'linear-gradient(135deg, #f8fafc, #e2e8f0)',
          borderRadius: '8px',
          color: theme === 'dark' ? '#94a3b8' : '#64748b',
          fontSize: '12px',
        }}
      >
        {t('wecsTopology.nodeLabel.noLabels')}
      </Box>
    );

    return (
      <Tooltip
        title={
          hasLabels ? (
            <Box
              sx={{ p: 1, bgcolor: theme === 'dark' ? '#1e293b' : '#f8fafc', borderRadius: '8px' }}
            >
              {labelTooltipContent}
            </Box>
          ) : (
            ''
          )
        }
        placement="top"
        arrow
        disableHoverListener={!hasLabels}
        componentsProps={{
          tooltip: {
            sx: {
              bgcolor: 'transparent',
              boxShadow: 'none',
              borderRadius: '12px',
              p: 0,
              maxWidth: 'none',
              width: 'auto',
            },
          },
          arrow: {
            sx: {
              color: theme === 'dark' ? '#1e293b' : '#f8fafc',
            },
          },
        }}
      >
        <div
          style={cardStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          role="button"
          tabIndex={0}
          aria-label={`${label} - Status: ${status}${hasLabels ? `, ${Object.keys(labels).length} labels` : ''}`}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick(e as unknown as React.MouseEvent);
            }
          }}
        >
          {/* Sparkle effects for running status - respects reduced motion */}
          {!prefersReducedMotion && status === 'Running' && (
            <>
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '4px',
                  height: '4px',
                  background: '#fbbf24',
                  borderRadius: '50%',
                  animation: `${sparkleAnimation} 2s infinite`,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '24px',
                  width: '3px',
                  height: '3px',
                  background: '#34d399',
                  borderRadius: '50%',
                  animation: `${sparkleAnimation} 2s infinite 0.5s`,
                }}
              />
            </>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              minWidth: 0, // Allow content to shrink
            }}
            onClick={onClick}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flex: 1,
                minWidth: 0, // Allow content to shrink
                overflow: 'hidden', // Prevent overflow
              }}
            >
              {/* Icon section with status indicator - improved responsiveness */}
              <div
                style={{
                  width: `${Math.max(70, Math.min(90, iconSize + 50))}px`,
                  minWidth: `${Math.max(70, Math.min(90, iconSize + 50))}px`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  position: 'relative',
                  flexShrink: 0, // Prevent shrinking
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img
                    src={icon}
                    alt={label}
                    width={iconSize}
                    height={iconSize}
                    style={{
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                      filter: isHovered ? 'brightness(1.2)' : 'brightness(1)',
                    }}
                  />
                  {/* Status indicator */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      right: '-2px',
                      width: '12px',
                      height: '12px',
                      background: statusStyle.gradient,
                      borderRadius: '50%',
                      border: `2px solid ${theme === 'dark' ? '#0f172a' : '#ffffff'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      animation:
                        !prefersReducedMotion && status === 'Running'
                          ? `${heartbeatAnimation} 1.5s infinite`
                          : 'none',
                    }}
                  >
                    <StatusIcon size={6} color="white" />
                  </div>
                </div>

                <span
                  style={{
                    background: `linear-gradient(135deg, ${statusStyle.color}, ${statusStyle.color}80)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontWeight: 600,
                    fontSize: `${Math.max(9, fontSize - 1)}px`,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    animation:
                      !prefersReducedMotion && status === 'Running'
                        ? `${gradientShift} 3s ease infinite`
                        : 'none',
                    backgroundSize: '200% 200%',
                    flex: 1,
                    minWidth: 0, // Allow shrinking
                    maxWidth: `${Math.max(30, 60 - iconSize / 2)}px`, // Dynamic max width
                  }}
                >
                  {dynamicText}
                </span>
              </div>

              {/* Label section - improved with text overflow handling */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: '2px',
                  flex: 1,
                  minWidth: 0, // Allows flex child to shrink below content size
                  maxWidth: `${Math.max(120, 200 - iconSize)}px`, // Responsive max width
                }}
              >
                <Tooltip
                  title={label.length > 20 ? label : ''}
                  placement="top"
                  arrow
                  disableHoverListener={label.length <= 20}
                  componentsProps={{
                    tooltip: {
                      sx: {
                        bgcolor: theme === 'dark' ? '#1e293b' : '#f8fafc',
                        color: theme === 'dark' ? '#f1f5f9' : '#1e293b',
                        fontSize: '12px',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        boxShadow:
                          theme === 'dark'
                            ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                            : '0 4px 12px rgba(0, 0, 0, 0.15)',
                        border: `1px solid ${theme === 'dark' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.3)'}`,
                      },
                    },
                    arrow: {
                      sx: {
                        color: theme === 'dark' ? '#1e293b' : '#f8fafc',
                      },
                    },
                  }}
                >
                  <div
                    style={{
                      fontWeight: '500',
                      fontSize: `${fontSize}px`,
                      color: theme === 'dark' ? '#f1f5f9' : '#1e293b',
                      letterSpacing: '0.5px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: '1.2',
                      cursor: label.length > 20 ? 'help' : 'default',
                      width: '100%', // Ensure it takes full available width
                    }}
                  >
                    {label}
                  </div>
                </Tooltip>

                {hasLabels && (
                  <div
                    style={{
                      fontSize: `${fontSize - 2}px`,
                      color: statusStyle.color,
                      fontWeight: '500',
                      opacity: 0.8,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      lineHeight: '1.1',
                    }}
                  >
                    {Object.keys(labels).length} label{Object.keys(labels).length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>

            {/* Time indicator - positioned to avoid menu button overlap */}
            {timeAgo && (
              <div
                style={{
                  position: 'absolute',
                  top: '4px',
                  left: '4px',
                  fontSize: '9px',
                  color: theme === 'dark' ? '#cbd5e1' : '#475569',
                  background:
                    theme === 'dark' ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  border: `1px solid ${theme === 'dark' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.25)'}`,
                  backdropFilter: 'blur(8px)',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  zIndex: 5,
                  boxShadow:
                    theme === 'dark'
                      ? '0 1px 3px rgba(0, 0, 0, 0.3)'
                      : '0 1px 3px rgba(0, 0, 0, 0.1)',
                  opacity: 0.8,
                  transition: 'opacity 0.2s ease',
                }}
                onMouseEnter={e => {
                  (e.target as HTMLElement).style.opacity = '1';
                }}
                onMouseLeave={e => {
                  (e.target as HTMLElement).style.opacity = '0.8';
                }}
              >
                {timeAgo}
              </div>
            )}

            {/* Menu button - redesigned for better aesthetics */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                position: 'relative',
                zIndex: 15, // Higher z-index to ensure it's above other elements
              }}
            >
              <button
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '4px',
                  background:
                    isMenuHovered || isMenuFocused
                      ? theme === 'dark'
                        ? 'rgba(148, 163, 184, 0.08)'
                        : 'rgba(148, 163, 184, 0.12)'
                      : 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isMenuHovered || isMenuFocused ? 'scale(1.1)' : 'scale(1)',
                  opacity: isMenuHovered || isMenuFocused ? 1 : 0.6,
                  outline: isMenuFocused ? `1.5px solid ${statusStyle.color}` : 'none',
                  outlineOffset: '1px',
                  padding: '0',
                  margin: '0',
                  position: 'relative',
                  zIndex: 10, // Ensure button is clickable
                  pointerEvents: 'auto', // Ensure clicks are captured
                }}
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Menu button clicked:', e); // Debug log
                  onMenuClick(e);
                }}
                onMouseEnter={handleMenuMouseEnter}
                onMouseLeave={handleMenuMouseLeave}
                onFocus={handleMenuFocus}
                onBlur={handleMenuBlur}
                aria-label="More options"
                type="button"
              >
                <FiMoreVertical
                  size={10}
                  color={
                    isMenuHovered || isMenuFocused
                      ? statusStyle.color
                      : theme === 'dark'
                        ? '#94a3b8'
                        : '#64748b'
                  }
                  style={{
                    transition: 'all 0.15s ease',
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      </Tooltip>
    );
  }
);
