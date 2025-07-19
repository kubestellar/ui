import React, { Suspense } from 'react';
import { Box, Button, Stack, CircularProgress } from '@mui/material';
const MonacoEditor = React.lazy(() => import('@monaco-editor/react'));

interface EditTabProps {
  editFormat: 'yaml' | 'json';
  setEditFormat: (format: 'yaml' | 'json') => void;
  editedManifest: string;
  handleUpdate: () => void;
  theme: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  jsonToYaml: (jsonString: string) => string;
  handleEditorChange: (value: string | undefined) => void;
}

const EditTab: React.FC<EditTabProps> = ({
  editFormat,
  setEditFormat,
  editedManifest,
  handleUpdate,
  theme,
  t,
  jsonToYaml,
  handleEditorChange,
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Stack direction="row" spacing={4} mb={3} ml={4}>
        <Button
          variant={editFormat === 'yaml' ? 'contained' : 'outlined'}
          onClick={() => setEditFormat('yaml')}
          sx={{
            textTransform: 'none',
            backgroundColor: editFormat === 'yaml' ? '#2F86FF' : 'transparent',
            borderRadius: '8px',
            color: editFormat === 'yaml' ? '#fff' : '#2F86FF',
            border: editFormat === 'yaml' ? 'none' : '1px solid #2F86FF',
            '&:hover': {
              backgroundColor: editFormat === 'yaml' ? '#1565c0' : 'rgba(47, 134, 255, 0.08)',
            },
          }}
        >
          {t('wecsDetailsPanel.format.yaml')}
        </Button>
        <Button
          variant={editFormat === 'json' ? 'contained' : 'outlined'}
          onClick={() => setEditFormat('json')}
          sx={{
            textTransform: 'none',
            backgroundColor: editFormat === 'json' ? '#2F86FF' : 'transparent',
            borderRadius: '8px',
            color: editFormat === 'json' ? '#fff' : '#2F86FF',
            border: editFormat === 'json' ? 'none' : '1px solid #2F86FF',
            '&:hover': {
              backgroundColor: editFormat === 'json' ? '#1565c0' : 'rgba(47, 134, 255, 0.08)',
            },
          }}
        >
          {t('wecsDetailsPanel.format.json')}
        </Button>
      </Stack>
      <Box sx={{ overflow: 'auto', maxHeight: '500px' }}>
        <Suspense fallback={<CircularProgress />}>
          <MonacoEditor
            height="500px"
            language={editFormat}
            value={editFormat === 'yaml' ? jsonToYaml(editedManifest) : editedManifest}
            onChange={handleEditorChange}
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              readOnly: false,
              automaticLayout: true,
              wordWrap: 'on',
            }}
          />
        </Suspense>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button
          variant="contained"
          onClick={handleUpdate}
          sx={{
            textTransform: 'none',
            backgroundColor: '#2F86FF',
            borderRadius: '8px',
            color: '#fff',
            '&:hover': {
              backgroundColor: '#1565c0',
            },
          }}
        >
          {t('wecsDetailsPanel.common.update')}
        </Button>
      </Box>
    </Box>
  );
};

export default EditTab; 