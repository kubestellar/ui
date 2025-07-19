import React, { Suspense, useState } from 'react';
import { Box, Button, Stack, CircularProgress, Alert } from '@mui/material';
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
  loadingManifest?: boolean;
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
  loadingManifest = false,
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate JSON/YAML content
  const validateContent = (content: string, format: 'yaml' | 'json'): boolean => {
    if (!content || content.trim() === '') {
      setValidationError('Content cannot be empty');
      return false;
    }

    try {
      if (format === 'json') {
        JSON.parse(content);
      } else {
        // For YAML, we'll do basic validation
        // In a real implementation, you'd use a YAML parser
        if (content.includes('{') && content.includes('}')) {
          // This is a very basic check - in production you'd use a proper YAML parser
          JSON.parse(jsonToYaml(content));
        }
      }
      setValidationError(null);
      return true;
    } catch (error) {
      setValidationError(`Invalid ${format.toUpperCase()} format: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  const handleEditorChangeWithValidation = (value: string | undefined) => {
    handleEditorChange(value);
    if (value) {
      validateContent(value, editFormat);
    } else {
      setValidationError(null);
    }
  };

  const handleUpdateWithValidation = () => {
    if (validateContent(editedManifest, editFormat)) {
      handleUpdate();
    }
  };

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

      {validationError && (
        <Alert severity="error" sx={{ mb: 2, mx: 4 }}>
          {validationError}
        </Alert>
      )}

      <Box sx={{ overflow: 'auto', maxHeight: '500px' }}>
        {loadingManifest ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '500px' }}>
            <CircularProgress />
          </Box>
        ) : (
          <Suspense fallback={<CircularProgress />}>
            <MonacoEditor
              height="500px"
              language={editFormat}
              value={editFormat === 'yaml' ? jsonToYaml(editedManifest) : editedManifest}
              onChange={handleEditorChangeWithValidation}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                readOnly: false,
                automaticLayout: true,
                wordWrap: 'on',
                formatOnPaste: true,
                formatOnType: true,
              }}
            />
          </Suspense>
        )}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button
          variant="contained"
          onClick={handleUpdateWithValidation}
          disabled={loadingManifest || !!validationError}
          sx={{
            textTransform: 'none',
            backgroundColor: '#2F86FF',
            borderRadius: '8px',
            color: '#fff',
            '&:hover': {
              backgroundColor: '#1565c0',
            },
            '&:disabled': {
              backgroundColor: '#ccc',
              color: '#666',
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
