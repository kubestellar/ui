import React, { useState, useEffect, useContext } from "react";
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
} from "@mui/material";
import { BindingPolicyInfo } from "../../../types/bindingPolicy";
import { ThemeContext } from "../../../context/ThemeContext"; // Assuming you have this context

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

  const { theme } = useContext(ThemeContext); // Get the theme from context

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

  const isDarkTheme = theme === "dark"; // Check if the current theme is dark

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
        <DialogTitle className={isDarkTheme ? "bg-slate-800 text-white" : ""}>
          Edit Binding Policy
        </DialogTitle>
        <DialogContent
          className={isDarkTheme ? "bg-slate-800 text-white" : ""}
        >
          <Alert severity="info" sx={{ mb: 2 }}>
            <AlertTitle>Info</AlertTitle>
            Edit your binding policy configuration. Changes will be applied
            after saving.
          </Alert>

          <TextField
            fullWidth
            label="Binding Policy Name"
            value={policyName}
            onChange={(e) => setPolicyName(e.target.value)}
            margin="normal"
            required
            InputProps={{
              className: isDarkTheme ? "!text-white" : "", // Make input text white in dark mode
            }}
            className={isDarkTheme ? "bg-slate-800 text-white" : ""} // Dark background for input in dark mode
          />

          <div className="rounded-md border mt-4">
            <Editor
              height="400px"
              language="yaml"
              value={editorContent}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
              onChange={(value) => setEditorContent(value || "")}
            />
          </div>
        </DialogContent>

        <DialogActions
          className={isDarkTheme ? "bg-slate-800" : ""} // Dark background for footer buttons
        >
          <Button onClick={handleClose} className={isDarkTheme ? "text-white" : ""}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!policyName || !editorContent}
            className={isDarkTheme ? "bg-blue-700" : ""} // Button color in dark mode
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showUnsavedChanges}
        onClose={() => setShowUnsavedChanges(false)}
      >
        <DialogTitle className={isDarkTheme ? "bg-slate-800 text-white" : ""}>
          Unsaved Changes
        </DialogTitle>
        <DialogContent
          className={isDarkTheme ? "bg-slate-800 text-white" : ""}
        >
          <Alert severity="warning">
            <AlertTitle>Warning</AlertTitle>
            You have unsaved changes. Are you sure you want to close without
            saving?
          </Alert>
        </DialogContent>
        <DialogActions
          className={isDarkTheme ? "bg-slate-800" : ""}
        >
          <Button
            onClick={() => setShowUnsavedChanges(false)}
            className={isDarkTheme ? "text-white" : ""}
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
            className={isDarkTheme ? "bg-red-700" : ""}
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
