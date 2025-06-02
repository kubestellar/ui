import React, { useState } from 'react';
import { Box, Container, Tab, Tabs, Typography, useMediaQuery, useTheme } from '@mui/material';
import { usePlugins } from '../hooks/usePlugins';
import LoadingFallback from '../components/LoadingFallback';
import { PluginList } from '../components/plugins/PluginList';
import PluginStore from '../components/plugins/PluginStore';
import PluginConfiguration from '../components/plugins/PluginConfiguration';

const PluginManagement: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [tabValue, setTabValue] = useState(0);
  const { data: plugins, isLoading } = usePlugins();

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const tabs = [
    {
      label: 'Installed Plugins',
      count: plugins?.count || 0,
    },
    {
      label: 'Plugin Store',
      count: null,
    },
    {
      label: 'Configuration',
      count: null,
    },
  ];

  const renderTabContent = () => {
    switch (tabValue) {
      case 0:
        return <PluginList />;
      case 1:
        return <PluginStore />;
      case 2:
        return <PluginConfiguration />;
      default:
        return <PluginList />;
    }
  };

  if (isLoading) {
    return <LoadingFallback message="Loading plugin management..." size="large" />;
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Plugins
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Manage and configure KubeStellar plugins for enhanced functionality
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant={isMobile ? 'scrollable' : 'standard'}
            scrollButtons={isMobile ? 'auto' : false}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {tab.label}
                    {tab.count !== null && (
                      <Box
                        component="span"
                        sx={{
                          backgroundColor: 'primary.main',
                          color: 'primary.contrastText',
                          borderRadius: '50%',
                          px: 1,
                          py: 0.5,
                          fontSize: '0.75rem',
                          minWidth: '1.5rem',
                          textAlign: 'center',
                        }}
                      >
                        {tab.count}
                      </Box>
                    )}
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>

        {renderTabContent()}
      </Box>
    </Container>
  );
};

export default PluginManagement;
