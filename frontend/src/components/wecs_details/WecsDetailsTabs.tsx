import React from 'react';
import { Tabs } from '@mui/material';
import { StyledTab } from './WecsDetailsStyles';

interface WecsDetailsTabsProps {
  tabValue: number;
  type: string;
  isDeploymentOrJobPod?: boolean;
  theme: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
}

const WecsDetailsTabs: React.FC<WecsDetailsTabsProps> = ({
  tabValue,
  type,
  isDeploymentOrJobPod,
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
      {/* Only show logs tab for deployment/job pods */}
      {type.toLowerCase() === 'pod' &&
        isDeploymentOrJobPod &&
        type.toLowerCase() !== 'cluster' && (
          <StyledTab
            label={
              <span>
                <i className="fa fa-align-left" style={{ marginRight: '8px' }}></i>
                {t('wecsDetailsPanel.tabs.logs')}
              </span>
            }
          />
        )}
      {/* Only show Exec Pods tab for pod resources */}
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