import { memo } from 'react';
import { FiMoreVertical } from 'react-icons/fi';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { ResourceItem } from '../TreeViewComponent';
import useTheme from '../../stores/themeStore';
import useLabelHighlightStore from '../../stores/labelHighlightStore';
import useZoomStore from '../../stores/zoomStore';
import { Tooltip, Chip, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface NodeLabelProps {
  label: string;
  icon: string;
  dynamicText: string;
  status: string;
  timeAgo?: string;
  onClick: (e: React.MouseEvent) => void;
  onMenuClick: (e: React.MouseEvent) => void;
  resourceData?: ResourceItem;
}

export const NodeLabel = memo<NodeLabelProps>(
  ({ label, icon, dynamicText, timeAgo, onClick, onMenuClick, resourceData }) => {
    const { t } = useTranslation();
    const theme = useTheme(state => state.theme);
    const { currentZoom, getScaledIconSize, getScaledFontSize } = useZoomStore();

    const { highlightedLabels, setHighlightedLabels, clearHighlightedLabels } =
      useLabelHighlightStore();

    const labels = resourceData?.metadata?.labels || {};
    const hasLabels = Object.keys(labels).length > 0;

    const hasHighlightedLabel =
      highlightedLabels && labels[highlightedLabels.key] === highlightedLabels.value;

    const iconSize = getScaledIconSize(currentZoom);
    const fontSize = getScaledFontSize(currentZoom);

    const labelTooltipContent = hasLabels ? (
      <Box
        sx={{
          padding: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          width: 'auto',
        }}
      >
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '12px',
            marginBottom: '4px',
            color: theme === 'dark' ? '#ffffff' : '#000000',
          }}
        >
          {t('wecsTopology.nodeLabel.labels')}
        </div>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
          {Object.entries(labels).map(([key, value]) => (
            <Chip
              key={key}
              label={`${key}: ${value}`}
              size="small"
              sx={{
                fontSize: '10px',
                height: '20px',
                backgroundColor:
                  highlightedLabels &&
                  highlightedLabels.key === key &&
                  highlightedLabels.value === value
                    ? theme === 'dark'
                      ? 'rgba(25, 118, 210, 0.4)'
                      : 'rgba(25, 118, 210, 0.2)'
                    : theme === 'dark'
                      ? 'rgba(144, 202, 249, 0.08)'
                      : 'rgba(25, 118, 210, 0.08)',
                color: theme === 'dark' ? '#90CAF9' : '#1976d2',
                border:
                  theme === 'dark'
                    ? '1px solid rgba(144, 202, 249, 0.5)'
                    : '1px solid rgba(25, 118, 210, 0.5)',
                width: '100%',
                margin: '0',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor:
                    theme === 'dark' ? 'rgba(25, 118, 210, 0.4)' : 'rgba(25, 118, 210, 0.2)',
                },
              }}
              onClick={e => {
                e.stopPropagation();
                const isAlreadyHighlighted =
                  highlightedLabels &&
                  highlightedLabels.key === key &&
                  highlightedLabels.value === value;

                if (isAlreadyHighlighted) {
                  clearHighlightedLabels();
                } else {
                  setHighlightedLabels({ key, value: value as string });
                }
              }}
              onMouseEnter={() => {
                setHighlightedLabels({ key, value: value as string });
              }}
              onMouseLeave={() => {
                clearHighlightedLabels();
              }}
            />
          ))}
        </Box>
      </Box>
    ) : (
      <span>{t('wecsTopology.nodeLabel.noLabels')}</span>
    );

    return (
      <Tooltip
        title={labelTooltipContent}
        placement="top"
        arrow
        disableHoverListener={!hasLabels}
        componentsProps={{
          tooltip: {
            sx: {
              bgcolor: theme === 'dark' ? 'rgb(15, 23, 42)' : '#fff',
              color: theme === 'dark' ? '#d4d4d4' : '#333',
              boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
              borderRadius: '4px',
              p: 1,
              maxWidth: 'none',
              width: 'auto',
            },
          },
          arrow: {
            sx: {
              color: theme === 'dark' ? 'rgb(15, 23, 42)' : '#fff',
            },
          },
        }}
      >
        <div
          style={{
            position: 'relative',
            margin: '-8px -12px',
            padding: '2px 12px',
            borderRadius: '4px',
            border: hasLabels ? `1px solid ${theme === 'dark' ? '#3f51b5' : '#3f51b5'}` : 'none',
            boxShadow: hasHighlightedLabel
              ? `0 0 0 2px ${theme === 'dark' ? '#00e676' : '#00c853'}`
              : 'none',
            backgroundColor: hasHighlightedLabel
              ? theme === 'dark'
                ? 'rgba(0, 230, 118, 0.1)'
                : 'rgba(0, 200, 83, 0.1)'
              : 'transparent',
            transition: 'all 0.1s ease',
            width: 'calc(100% + 24px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
            }}
            onClick={onClick}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '-5px' }}>
              <div
                style={{
                  width: '80px',
                  minWidth: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <img src={icon} alt={label} width={iconSize} height={iconSize} />
                <span
                  style={{
                    color: 'gray',
                    fontWeight: 500,
                    fontSize: `${fontSize}px`,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {dynamicText}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: `${fontSize}px` }}>{label}</div>
                <div style={{ display: 'flex', gap: '1px' }}>
                  {/* Placeholder for future icons/actions */}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FiMoreVertical
                style={{
                  fontSize: `${Math.max(11, fontSize * 1.8)}px`,
                  color: '#34aadc',
                  marginRight: '-10px',
                  cursor: 'pointer',
                }}
                onClick={onMenuClick}
              />
            </div>
            {timeAgo && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '-6px',
                  right: '-10px',
                  fontSize: `${Math.max(5, fontSize * 0.8)}px`,
                  color: theme === 'dark' ? '#fff' : '#495763',
                  backgroundColor: theme === 'dark' ? '#333333' : '#ccd6dd',
                  padding: '0 2px',
                  border: '1px solid #8fa4b1',
                  borderRadius: '3px',
                  zIndex: 10,
                }}
              >
                {timeAgo}
              </div>
            )}
          </div>
        </div>
      </Tooltip>
    );
  }
);
