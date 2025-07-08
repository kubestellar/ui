import { memo } from 'react';
import { FiMoreVertical } from 'react-icons/fi';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { ResourceItem } from '../TreeViewComponent';
import useTheme from '../../stores/themeStore'; // Import useTheme for dark mode support
import useLabelHighlightStore from '../../stores/labelHighlightStore'; // Import the label highlight store
import { Tooltip, Chip, Box } from '@mui/material';
import { useTranslation } from 'react-i18next'; // Add this import

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
    const { t } = useTranslation(); // Add translation hook
    const theme = useTheme(state => state.theme); // Get the current theme

    // Get highlighted labels state from the store
    const { highlightedLabels, setHighlightedLabels, clearHighlightedLabels } =
      useLabelHighlightStore();

    // Extract labels from resourceData if available
    const labels = resourceData?.metadata?.labels || {};
    const hasLabels = Object.keys(labels).length > 0;

    // Check if this node's labels match the highlighted label
    const hasHighlightedLabel =
      highlightedLabels && labels[highlightedLabels.key] === highlightedLabels.value;

    // Create label tooltip content
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
                // Set highlighting on hover
                setHighlightedLabels({ key, value: value as string });
              }}
              onMouseLeave={() => {
                // Clear highlighting when mouse leaves
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
            margin: '-8px -12px', // Increased negative margin for better coverage
            padding: '2px 12px', // Matching padding to maintain content position
            borderRadius: '4px', // Increased border radius to match node shape
            border: hasLabels ? `1px solid ${theme === 'dark' ? '#3f51b5' : '#3f51b5'}` : 'none', // Increased border width and using a more prominent blue
            boxShadow: hasHighlightedLabel
              ? `0 0 0 2px ${theme === 'dark' ? '#00e676' : '#00c853'}`
              : 'none',
            backgroundColor: hasHighlightedLabel
              ? theme === 'dark'
                ? 'rgba(0, 230, 118, 0.1)'
                : 'rgba(0, 200, 83, 0.1)'
              : 'transparent',
            transition: 'all 0.1s ease',
            width: 'calc(100% + 24px)', // Ensure width coverage with the negative margins
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
            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '-5px' }}>
              {/* Left: Fixed width icon + dynamicText */}
              <div
                style={{
                  width: '80px', // enough space for longest icon + label
                  minWidth: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <img src={icon} alt={label} width="18" height="18" />
                <span
                  style={{
                    color: 'gray',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {dynamicText}
                </span>
              </div>

              {/* Right: Object name - always vertically centered */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <div>{label}</div>
                {/* Extra row for optional icons or actions */}
                <div style={{ display: 'flex', gap: '1px' }}>
                  {/* (Optional) check/heart icons etc. */}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <FiMoreVertical
                style={{
                  fontSize: '11px',
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
                  fontSize: '5px',
                  color: theme === 'dark' ? '#fff' : '#495763',
                  backgroundColor: theme === 'dark' ? '#333333' : '#ccd6dd',
                  padding: '0 2px',
                  border: '1px solid #8fa4b1',
                  borderRadius: '3px',
                  zIndex: 10, // Ensure the time indicator shows above other elements
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
