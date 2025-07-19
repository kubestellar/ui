import React from 'react';
import { Tabs } from '@mui/material';
import { StyledTab } from './WecsDetailsStyles';

interface WecsDetailsTabsProps {
  tabValue: number;
  type: string;
  isDeploymentOrJobPod?: boolean; // Kept for backward compatibility
  theme: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
}

const WecsDetailsTabs: React.FC<WecsDetailsTabsProps> = ({
  tabValue,
  type,
  theme,
  t,
  onTabChange,
}) => {
  return (
    <Tabs
      value={tabValue}
      onChange={onTabChange}
      sx={{
        mt: 2,
        '.MuiTabs-indicator': {
          display: 'none',
        },
        '& .MuiTab-root': {
          color: theme === 'dark' ? '#fff' : '#333',
        },
      }}
    >
      <StyledTab
        label={
          <span>
            <i className="fa fa-file-alt" style={{ marginRight: '8px' }}></i>
            {t('wecsDetailsPanel.tabs.summary')}
          </span>
        }
      />
      <StyledTab
        label={
          <span>
            <i className="fa fa-edit" style={{ marginRight: '8px' }}></i>
            {t('wecsDetailsPanel.tabs.edit')}
          </span>
        }
      />
      {/* Show logs tab for all pods */}
      {type.toLowerCase() === 'pod' && (
        <StyledTab
          label={
            <span>
              <i className="fa fa-align-left" style={{ marginRight: '8px' }}></i>
              {t('wecsDetailsPanel.tabs.logs')}
            </span>
          }
        />
      )}
      {/* Show Exec Pods tab for pod resources */}
      {type.toLowerCase() === 'pod' && (
        <StyledTab
          label={
            <span>
              <i className="fa fa-terminal" style={{ marginRight: '8px' }}></i>
              {t('wecsDetailsPanel.tabs.execPods')}
            </span>
          }
        />
      )}
    </Tabs>
  );
};

export default WecsDetailsTabs;
