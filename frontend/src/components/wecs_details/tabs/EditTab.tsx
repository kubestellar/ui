import React, { Suspense, useState, useEffect } from 'react';
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
  yamlToJson: (yamlString: string) => string;
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
  yamlToJson,
  handleEditorChange,
  loadingManifest = false,
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);

  // Ensure manifest is in the correct format on mount and when editFormat/editedManifest changes
  useEffect(() => {
    if (!editedManifest || editedManifest.trim() === '') return;
    let needsConversion = false;
    try {
      if (editFormat === 'yaml') {
        // Try parsing as YAML, then convert to JSON and back to YAML to normalize
        const asJson = yamlToJson(editedManifest);
        const asYaml = jsonToYaml(asJson);
        // If the YAML produced from the JSON is different, update
        if (editedManifest.trim() !== asYaml.trim()) {
          needsConversion = true;
          handleEditorChange(asYaml);
        }
      } else if (editFormat === 'json') {
        // Try parsing as JSON, if fails, try converting from YAML
        try {
          JSON.parse(editedManifest);
        } catch {
          // Not valid JSON, try converting from YAML
          try {
            const asJson = yamlToJson(editedManifest);
            // Pretty-print JSON
            const prettyJson = JSON.stringify(JSON.parse(asJson), null, 2);
            needsConversion = true;
            handleEditorChange(prettyJson);
          } catch {
            // Ignore, will be caught by validation
          }
        }
      }
    } catch {
      // Ignore, will be caught by validation
    }
    // If no conversion needed, do nothing
  }, [editFormat, editedManifest, handleEditorChange, jsonToYaml, yamlToJson]);

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
        // For YAML, use the YAML parser for validation
        yamlToJson(content); // This will throw an error if YAML is invalid
      }
      setValidationError(null);
      return true;
    } catch (error) {
      setValidationError(
        `Invalid ${format.toUpperCase()} format: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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

  // Handle format switching
  const handleFormatChange = (newFormat: 'yaml' | 'json') => {
    if (newFormat === editFormat) return;

    try {
      let convertedContent: string;

      if (newFormat === 'yaml') {
        // Convert from JSON to YAML
        convertedContent = jsonToYaml(editedManifest);
      } else {
        // Convert from YAML to JSON
        convertedContent = yamlToJson(editedManifest);
      }

      // Update the editor content with converted format
      handleEditorChange(convertedContent);
      setEditFormat(newFormat);
      setValidationError(null);
    } catch (error) {
      console.error('Error converting format:', error);
      setValidationError(
        `Failed to convert to ${newFormat.toUpperCase()}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
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
          onClick={() => handleFormatChange('yaml')}
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
          onClick={() => handleFormatChange('json')}
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
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '500px',
            }}
          >
            <CircularProgress />
          </Box>
        ) : (
          <Suspense fallback={<CircularProgress />}>
            <MonacoEditor
              height="500px"
              language={editFormat}
              value={editedManifest}
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
