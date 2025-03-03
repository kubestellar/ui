import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import yaml from "js-yaml";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Alert,
  AlertTitle,
  TextField,
  Snackbar,
  Box,
} from "@mui/material";
import { BindingPolicyInfo } from "../../../types/bindingPolicy";
import useTheme from "../../../stores/themeStore";

interface EditBindingPolicyDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (policyData: Partial<BindingPolicyInfo>) => void;
  policy: BindingPolicyInfo;
}

const EditBindingPolicyDialog: React.FC<EditBindingPolicyDialogProps> = ({
  open,
  onClose,
  onSave,
  policy,
}) => {
  const [editorContent, setEditorContent] = useState<string>(policy.yaml);
  const [policyName, setPolicyName] = useState<string>(policy.name);
  const [error, setError] = useState<string>("");
  const [showUnsavedChanges, setShowUnsavedChanges] = useState(false);
  const theme = useTheme((state) => state.theme)
  const isDarkTheme = theme === "dark";

  useEffect(() => {
    setEditorContent(policy.yaml);
    setPolicyName(policy.name);
  }, [policy]);

  const validateYaml = (content: string): boolean => {
    try {
      yaml.load(content);
      return true;
    } catch (e) {
      if (e instanceof Error) {
        setError(`Invalid YAML format: ${e.message}`);
      } else {
        setError("Invalid YAML format");
      }
      return false;
    }
  };

  const handleSave = () => {
    if (!validateYaml(editorContent)) {
      return;
    }
    onSave({
      ...policy,
      name: policyName,
      yaml: editorContent,
    });
    onClose();
  };

  const handleClose = () => {
    if (policyName !== policy.name || editorContent !== policy.yaml) {
      setShowUnsavedChanges(true);
    } else {
      onClose();
    }
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            height: '90vh',
            m: 2,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: isDarkTheme ? '#1e293b' : '#fff',
            color: isDarkTheme ? '#fff' : 'inherit',
          }
        }}
      >
        <DialogTitle>
          <Box className={isDarkTheme ? 'text-white' : ''}>
            Edit Binding Policy
          </Box>
        </DialogTitle>
        <DialogContent sx={{ 
          flex: 1,
          overflow: 'auto',
          p: 2,
          '&:first-of-type': {
            pt: 2
          }
        }}>
          <Alert 
            severity="info" 
            sx={{ 
              mb: 2,
              backgroundColor: isDarkTheme ? 'rgba(59, 130, 246, 0.1)' : undefined,
              color: isDarkTheme ? '#fff' : undefined,
              '& .MuiAlert-icon': {
                color: isDarkTheme ? '#60a5fa' : undefined,
              },
            }}
          >
            <AlertTitle className={isDarkTheme ? 'text-blue-400' : ''}>
              Info
            </AlertTitle>
            Edit your binding policy configuration. Changes will be applied after saving.
          </Alert>

          <TextField
            fullWidth
            label="Binding Policy Name"
            value={policyName}
            onChange={(e) => setPolicyName(e.target.value)}
            margin="normal"
            required
            sx={{
              '& .MuiInputLabel-root': {
                color: isDarkTheme ? 'rgba(255, 255, 255, 0.7)' : undefined,
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.23)' : undefined,
                },
                '&:hover fieldset': {
                  borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.4)' : undefined,
                },
              },
              '& .MuiInputBase-input': {
                color: isDarkTheme ? '#fff' : undefined,
              },
            }}
          />

          <Box sx={{ mt: 4, border: 1, borderColor: isDarkTheme ? 'gray.700' : 'divider' }}>
            <Editor
              height="400px"
              language="yaml"
              value={editorContent}
              theme={isDarkTheme ? "vs-dark" : "light"}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
              onChange={(value) => setEditorContent(value || "")}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ 
          p: 2,
          borderTop: 1,
          borderColor: 'divider'
        }}>
          <Button 
            onClick={handleClose}
            variant="outlined"
            sx={{
              color: isDarkTheme ? '#fff' : undefined,
              borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.23)' : undefined,
              '&:hover': {
                borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.4)' : undefined,
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!policyName || !editorContent}
            sx={{
              backgroundColor: isDarkTheme ? '#3b82f6' : undefined,
              '&:hover': {
                backgroundColor: isDarkTheme ? '#2563eb' : undefined,
              },
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showUnsavedChanges}
        onClose={() => setShowUnsavedChanges(false)}
        PaperProps={{
          style: {
            backgroundColor: isDarkTheme ? '#1e293b' : '#fff',
            color: isDarkTheme ? '#fff' : 'inherit',
          },
        }}
      >
        <DialogTitle className={isDarkTheme ? 'text-white' : ''}>
          Unsaved Changes
        </DialogTitle>
        <DialogContent>
          <Alert 
            severity="warning"
            sx={{
              backgroundColor: isDarkTheme ? 'rgba(234, 179, 8, 0.1)' : undefined,
              color: isDarkTheme ? '#fff' : undefined,
              '& .MuiAlert-icon': {
                color: isDarkTheme ? '#fbbf24' : undefined,
              },
            }}
          >
            <AlertTitle className={isDarkTheme ? 'text-yellow-400' : ''}>
              Warning
            </AlertTitle>
            You have unsaved changes. Are you sure you want to close without saving?
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setShowUnsavedChanges(false)}
            variant="outlined"
            sx={{
              color: isDarkTheme ? '#fff' : undefined,
              borderColor: isDarkTheme ? 'rgba(255, 255, 255, 0.23)' : undefined,
            }}
          >
            Continue Editing
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setShowUnsavedChanges(false);
              onClose();
            }}
            sx={{
              backgroundColor: isDarkTheme ? '#dc2626' : undefined,
              '&:hover': {
                backgroundColor: isDarkTheme ? '#b91c1c' : undefined,
              },
            }}
          >
            Discard Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError("")}
        message={error}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </>
  );
};

export default EditBindingPolicyDialog;