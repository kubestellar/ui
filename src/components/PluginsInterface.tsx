import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Button, TextField, List, ListItem, ListItemText, CircularProgress } from '@mui/material';
import SearchBox from './common/SearchBox';

// Dummy data for installed plugins
const initialPlugins = [
  { name: 'Sample Plugin 1', source: 'GitHub', description: 'A plugin from GitHub.' },
  { name: 'Sample Plugin 2', source: 'Local', description: 'A plugin from local file.' },
];

const PluginsInterface: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [plugins, setPlugins] = useState(initialPlugins);
  const [search, setSearch] = useState('');
  const [installing, setInstalling] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [localFile, setLocalFile] = useState<File | null>(null);

  // Filter plugins by search
  const filteredPlugins = plugins.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleInstallFromGitHub = () => {
    setInstalling(true);
    setTimeout(() => {
      setPlugins([...plugins, { name: githubUrl.split('/').pop() || githubUrl, source: 'GitHub', description: 'Installed from GitHub.' }]);
      setGithubUrl('');
      setInstalling(false);
    }, 1500);
  };

  const handleInstallFromLocal = () => {
    if (!localFile) return;
    setInstalling(true);
    setTimeout(() => {
      setPlugins([...plugins, { name: localFile.name, source: 'Local', description: 'Installed from local file.' }]);
      setLocalFile(null);
      setInstalling(false);
    }, 1500);
  };

  return (
    <Box sx={{ p: 4, maxWidth: 600, margin: 'auto' }}>
      <Typography variant="h5" fontWeight="bold" mb={2}>Plugins Interface</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Installed Plugins" />
        <Tab label="Install from GitHub" />
        <Tab label="Install from Local" />
      </Tabs>
      {tab === 0 && (
        <>
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Search installed plugins..."
            colors={{ primary: '#1976d2', text: '#222', textSecondary: '#888', border: '#ccc' }}
            isDark={false}
          />
          <List sx={{ mt: 2 }}>
            {filteredPlugins.length === 0 ? (
              <ListItem><ListItemText primary="No plugins found." /></ListItem>
            ) : (
              filteredPlugins.map((plugin, idx) => (
                <ListItem key={idx} divider>
                  <ListItemText
                    primary={plugin.name}
                    secondary={`${plugin.description} (Source: ${plugin.source})`}
                  />
                </ListItem>
              ))
            )}
          </List>
        </>
      )}
      {tab === 1 && (
        <Box sx={{ mt: 2 }}>
          <TextField
            label="GitHub Repo URL"
            value={githubUrl}
            onChange={e => setGithubUrl(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            onClick={handleInstallFromGitHub}
            disabled={!githubUrl || installing}
          >
            {installing ? <CircularProgress size={20} /> : 'Install from GitHub'}
          </Button>
        </Box>
      )}
      {tab === 2 && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            component="label"
            sx={{ mb: 2 }}
          >
            Select Local Plugin
            <input
              type="file"
              hidden
              onChange={e => setLocalFile(e.target.files ? e.target.files[0] : null)}
            />
          </Button>
          {localFile && <Typography mb={2}>Selected: {localFile.name}</Typography>}
          <Button
            variant="contained"
            onClick={handleInstallFromLocal}
            disabled={!localFile || installing}
          >
            {installing ? <CircularProgress size={20} /> : 'Install from Local'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default PluginsInterface;
