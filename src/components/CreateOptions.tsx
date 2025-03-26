import { useState, useEffect } from "react";
import jsyaml from "js-yaml";
import { Dialog, DialogContent, DialogTitle, Tabs, Box, Alert, SelectChangeEvent, Typography, Snackbar } from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import axios, { AxiosError } from "axios";
import { useWDSQueries } from "../hooks/queries/useWDSQueries";
import { toast } from "react-hot-toast";
import { StyledTab, getDialogPaperProps } from "./StyledComponents";
import { YamlTab } from "./Workloads/YamlTab";
import { UploadFileTab } from "./Workloads/UploadFileTab";
import { GitHubTab } from "./Workloads/GitHubTab";
import { AddCredentialsDialog } from "../components/Workloads/AddCredentialsDialog";
import { AddWebhookDialog } from "../components/Workloads/AddWebhookDialog";
import { CancelConfirmationDialog } from "../components/Workloads/CancelConfirmationDialog";

interface Props {
  activeOption: string | null;
  setActiveOption: (option: string | null) => void;
  onCancel: () => void;
}

interface FormData {
  repositoryUrl: string;
  path: string;
  credentials: string;
  branchSpecifier: string;
  webhook: string;
}

interface Workload {
  kind?: string;
  metadata?: { name?: string };
  [key: string]: unknown;
}

const CreateOptions = ({
  activeOption,
  setActiveOption,
  onCancel,
}: Props) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const initialEditorContent = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: example
  namespace: test
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-container
          image: nginx:latest
          ports:
            - containerPort: 80
`;
  const [editorContent, setEditorContent] = useState<string>(initialEditorContent);
  const [workloadName, setWorkloadName] = useState<string>("example");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "warning" | "info";
  }>({
    open: false,
    message: "",
    severity: "success",
  });
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [credentialDialogOpen, setCredentialDialogOpen] = useState(false);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [cancelConfirmationOpen, setCancelConfirmationOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [newCredential, setNewCredential] = useState({
    githubUsername: "",
    personalAccessToken: "",
  });
  const [newWebhook, setNewWebhook] = useState({
    webhookUrl: "",
    personalAccessToken: "",
  });
  const [credentialsList, setCredentialsList] = useState<string[]>(["none"]);
  const [webhooksList, setWebhooksList] = useState<string[]>(["none"]);
  const [isEditorContentEdited, setIsEditorContentEdited] = useState(false);

  const initialFormData: FormData = {
    repositoryUrl: "",
    path: "",
    credentials: "none",
    branchSpecifier: "main",
    webhook: "none",
  };
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const { useUploadWorkloadFile } = useWDSQueries();
  const uploadFileMutation = useUploadWorkloadFile();

  const detectContentType = (content: string): "json" | "yaml" => {
    try {
      JSON.parse(content);
      return "json";
    } catch {
      return "yaml";
    }
  };

  // --- Extract Workload Name from Editor Content (YAML Tab) ---
  useEffect(() => {
    if (!editorContent) {
      setWorkloadName("");
      return;
    }

    try {
      let documents: Workload[] = [];
      const contentType = detectContentType(editorContent);
      if (contentType === "json") {
        const parsed = JSON.parse(editorContent);
        documents = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        jsyaml.loadAll(editorContent, (doc) => documents.push(doc as Workload), {});
      }

      // Find the first document with metadata.name
      const docWithName = documents.find((doc) => doc?.metadata?.name);
      const name = docWithName?.metadata?.name || "";
      setWorkloadName(name);
    } catch (error) {
      console.error("Error parsing editor content:", error);
      setWorkloadName("");
    }
  }, [editorContent]);

  // --- Extract Workload Name from Uploaded File (Upload File Tab) ---
  useEffect(() => {
    if (!selectedFile) {
      setWorkloadName("");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) {
        setWorkloadName("");
        return;
      }

      try {
        let documents: Workload[] = [];
        const contentType = detectContentType(content);
        if (contentType === "json") {
          const parsed = JSON.parse(content);
          documents = Array.isArray(parsed) ? parsed : [parsed];
        } else {
          jsyaml.loadAll(content, (doc) => documents.push(doc as Workload), {});
        }

        const docWithName = documents.find((doc) => doc?.metadata?.name);
        const name = docWithName?.metadata?.name || "";
        setWorkloadName(name);
      } catch (error) {
        console.error("Error parsing uploaded file:", error);
        setWorkloadName("");
      }
    };
    reader.readAsText(selectedFile);
  }, [selectedFile]);

  // --- Track Editor Content Changes ---
  useEffect(() => {
    setIsEditorContentEdited(editorContent !== initialEditorContent);
  }, [editorContent, initialEditorContent]);

  // --- Load Stored Credentials and Webhooks ---
  useEffect(() => {
    const storedCredentials = localStorage.getItem("credentialsList");
    const storedWebhooks = localStorage.getItem("webhooksList");

    if (storedCredentials) {
      setCredentialsList(JSON.parse(storedCredentials));
    }
    if (storedWebhooks) {
      setWebhooksList(JSON.parse(storedWebhooks));
    }
  }, []);

  // --- Track Changes Across Tabs ---
  useEffect(() => {
    let changesDetected = false;

    if (activeOption === "option1") {
      changesDetected = editorContent !== initialEditorContent;
    } else if (activeOption === "option2") {
      changesDetected = !!selectedFile;
    } else if (activeOption === "option3") {
      changesDetected =
        formData.repositoryUrl !== initialFormData.repositoryUrl ||
        formData.path !== initialFormData.path ||
        formData.credentials !== initialFormData.credentials ||
        formData.branchSpecifier !== initialFormData.branchSpecifier ||
        formData.webhook !== initialFormData.webhook;
    }

    setHasChanges(changesDetected);
  }, [activeOption, editorContent, selectedFile, formData]);

  // --- Handle File Upload (Upload File Tab) ---
  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error("No file selected.");
      return;
    }

    const formData = new FormData();
    formData.append("wds", selectedFile);
    console.log("FormData Entries:", [...formData.entries()]);

    try {
      const response = await uploadFileMutation.mutateAsync({ data: formData });
      console.log("Mutation Response:", response);
      toast.success("Workload Deploy successful!");
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Upload Error:", {
        message: axiosError.message,
        status: axiosError.response?.status,
        data: axiosError.response?.data,
        headers: axiosError.response?.headers,
      });
      const errorMessage =
        axiosError.response?.data && typeof axiosError.response.data === "object"
          ? JSON.stringify(axiosError.response.data)
          : axiosError.message || "Unknown error";

      if (axiosError.response?.status === 500) {
        toast.error("Workload is already exist!");
      } else if (axiosError.response?.status === 409) {
        toast.error("Conflict error: Deployment already in progress!");
      } else {
        toast.error(`Upload failed: ${errorMessage}`);
      }
    }
  };

  // --- Handle Raw Upload (YAML Tab) ---
  const handleRawUpload = async () => {
    const fileContent = editorContent.trim();

    if (!fileContent) {
      toast.error("Please enter YAML or JSON content.");
      return;
    }

    try {
      // Parse all documents into an array
      let documents: Workload[] = [];
      const contentType = detectContentType(fileContent);
      if (contentType === "json") {
        const parsed = JSON.parse(fileContent);
        documents = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        jsyaml.loadAll(fileContent, (doc) => documents.push(doc as Workload), {});
      }

      // Validate that at least one document has metadata.name
      const hasName = documents.some((doc) => doc?.metadata?.name);
      if (!hasName) {
        toast.error("At least one document must have 'metadata.name'");
        return;
      }

      // Send the array of documents to the API
      const response = await axios.post("http://localhost:4000/api/resources", documents);

      if (response.status === 200 || response.status === 201) {
        toast.success("Deployment successful!");
        setTimeout(() => window.location.reload(), 500);
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error: unknown) {
      const err = error as AxiosError;
      console.error("Error uploading:", error);

      if (err.response) {
        if (err.response.status === 500) {
          toast.error("Deploy already exists!");
        } else if (err.response.status === 409) {
          toast.error("Conflict error: Deployment already in progress!");
        } else {
          toast.error(`Deployment failed! (${err.response.status})`);
        }
      } else {
        toast.error("Deployment failed due to network error!");
      }
    }
  };

  // --- Handle Deploy (GitHub Tab) ---
  const handleDeploy = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const requestBody = {
        repo_url: formData.repositoryUrl,
        folder_path: formData.path,
        branch: formData.branchSpecifier || "main",
        webhook: formData.webhook !== "none" ? formData.webhook : undefined,
      };

      const queryParams: { [key: string]: string } = {};
      if (formData.credentials !== "none") {
        const [git_username] = formData.credentials.split("-pat");
        const storedCredentials = JSON.parse(localStorage.getItem("credentialsListData") || "{}");
        const pat = storedCredentials[formData.credentials]?.personalAccessToken;
        queryParams.git_username = git_username;
        queryParams.git_token = pat;
        queryParams.branch = formData.branchSpecifier || "main";
      }

      const response = await axios.post(
        "http://localhost:4000/api/deploy",
        requestBody,
        {
          params: queryParams,
        }
      );

      console.log("Deploy response:", response);

      if (response.status === 200 || response.status === 201) {
        toast.success("Workload deployed successfully!");
        setFormData({
          repositoryUrl: "",
          path: "",
          credentials: "none",
          branchSpecifier: "main",
          webhook: "none",
        });
        setTimeout(() => window.location.reload(), 4000);
      } else {
        throw new Error("Unexpected response status: " + response.status);
      }
    } catch (error: unknown) {
      const err = error as AxiosError;
      console.error("Deploy error:", err);

      if (err.response) {
        if (err.response.status === 500) {
          toast.error("Failed to clone repo , fill correc data !");
        } else if (err.response.status === 400) {
          toast.error("Failed to deploy workload!");
        } else {
          toast.error(`Deployment failed! (${err.response.status})`);
        }
      } else {
        toast.error("Deployment failed due to network error!");
      }
    } finally {
      setLoading(false);
    }
  };

  // --- Handle Cancel Click ---
  const handleCancelClick = () => {
    if (hasChanges) {
      setCancelConfirmationOpen(true);
    } else {
      setSelectedFile(null);
      setError("");
      setActiveOption(null);
      onCancel();
    }
  };

  // --- Handle Confirm Cancel ---
  const handleConfirmCancel = () => {
    setSelectedFile(null);
    setError("");
    setActiveOption(null);
    setCancelConfirmationOpen(false);
    onCancel();
  };

  // --- Handle Close Cancel Confirmation ---
  const handleCloseCancelConfirmation = () => {
    setCancelConfirmationOpen(false);
  };

  // --- Validate Form (GitHub Tab) ---
  const validateForm = () => {
    let isValid = true;
    let errorMessage = "";

    if (!formData.repositoryUrl) {
      errorMessage = "Please enter Git repository.";
      isValid = false;
    } else if (!formData.path) {
      errorMessage = "Please enter Path.";
      isValid = false;
    }

    setError(errorMessage);
    return isValid;
  };

  // --- Handle Credential Change (GitHub Tab) ---
  const handleCredentialChange = (event: SelectChangeEvent<string>) => {
    setFormData({ ...formData, credentials: event.target.value });
  };

  // --- Handle Open Credential Dialog ---
  const handleOpenCredentialDialog = () => {
    setCredentialDialogOpen(true);
  };

  // --- Handle Add Credential ---
  const handleAddCredential = () => {
    if (newCredential.githubUsername && newCredential.personalAccessToken) {
      const credentialId = `${newCredential.githubUsername}-pat`;
      const updatedCredentialsList = [...credentialsList, credentialId];
      setCredentialsList(updatedCredentialsList);
      setFormData({ ...formData, credentials: credentialId });

      localStorage.setItem("credentialsList", JSON.stringify(updatedCredentialsList));
      const storedCredentials = JSON.parse(localStorage.getItem("credentialsListData") || "{}");
      storedCredentials[credentialId] = {
        githubUsername: newCredential.githubUsername,
        personalAccessToken: newCredential.personalAccessToken,
      };
      localStorage.setItem("credentialsListData", JSON.stringify(storedCredentials));

      setCredentialDialogOpen(false);
      toast.success("Credential added successfully!");
    } else {
      toast.error("Please fill in both GitHub Username and Personal Access Token.");
    }
  };

  // --- Handle Close Credential Dialog ---
  const handleCloseCredentialDialog = () => {
    setCredentialDialogOpen(false);
    setNewCredential({ githubUsername: "", personalAccessToken: "" });
    setFormData({ ...formData, credentials: "none" });
  };

  // --- Handle Webhook Change (GitHub Tab) ---
  const handleWebhookChange = (event: SelectChangeEvent<string>) => {
    setFormData({ ...formData, webhook: event.target.value });
  };

  // --- Handle Open Webhook Dialog ---
  const handleOpenWebhookDialog = () => {
    setWebhookDialogOpen(true);
  };

  // --- Handle Add Webhook ---
  const handleAddWebhook = () => {
    if (newWebhook.webhookUrl && newWebhook.personalAccessToken) {
      const webhookId = `${newWebhook.webhookUrl}-pat`;
      const updatedWebhooksList = [...webhooksList, webhookId];
      setWebhooksList(updatedWebhooksList);
      setFormData({ ...formData, webhook: webhookId });

      localStorage.setItem("webhooksList", JSON.stringify(updatedWebhooksList));
      const storedWebhooks = JSON.parse(localStorage.getItem("webhooksListData") || "{}");
      storedWebhooks[webhookId] = {
        webhookUrl: newWebhook.webhookUrl,
        personalAccessToken: newWebhook.personalAccessToken,
      };
      localStorage.setItem("webhooksListData", JSON.stringify(storedWebhooks));

      setNewWebhook({ webhookUrl: "", personalAccessToken: "" });
      setWebhookDialogOpen(false);
      toast.success("Webhook added successfully!");
    } else {
      toast.error("Please fill in both Webhook URL and Personal Access Token.");
    }
  };

  // --- Handle Close Webhook Dialog ---
  const handleCloseWebhookDialog = () => {
    setWebhookDialogOpen(false);
    setNewWebhook({ webhookUrl: "", personalAccessToken: "" });
    setFormData({ ...formData, webhook: "none" });
  };

  // --- Handle Drag Over (Upload File Tab) ---
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = "#1976d2";
  };

  // --- Handle Drag Leave (Upload File Tab) ---
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = "#bdbdbd";
  };

  // --- Handle Drop (Upload File Tab) ---
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = "#bdbdbd";
    const file = e.dataTransfer.files?.[0] || null;
    if (file && (file.name.endsWith(".yaml") || file.name.endsWith(".yml") || file.name.endsWith(".json"))) {
      setSelectedFile(file);
    } else {
      toast.error("Please upload a valid YAML or JSON file.");
    }
  };

  // --- Handle File Change (Upload File Tab) ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setSelectedFile(file);
    }
  };

  // --- Format File Size (Upload File Tab) ---
  const formatFileSize = (size: number): string => {
    if (size < 1024) return `${size} B`;
    const kb = size / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    // --- Main Dialog Section ---
    <>
      {error && (
        <Box sx={{ color: "red", mb: 1, textAlign: "center" }}>{error}</Box>
      )}
      <Dialog
        open={!!activeOption}
        onClose={onCancel}
        maxWidth="lg"
        fullWidth
        PaperProps={getDialogPaperProps()}
      >
        <DialogTitle sx={{ padding: "16px 16px", borderBottom: "1px solid #e0e0e0" }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "black" }}>
            Create Workload
          </Typography>
          <Typography sx={{ fontSize: "13px", color: "gray" }}>
            Create Workloads
          </Typography>
          <Tabs
            value={activeOption}
            onChange={(_event, newValue) => setActiveOption(newValue)}
            sx={{
              mt: 2,
              ".MuiTabs-indicator": {
                display: "none",
              },
            }}
          >
            <StyledTab
              label="YAML"
              value="option1"
              icon={<span role="img" aria-label="yaml" style={{ fontSize: "0.9rem" }}>📄</span>}
              iconPosition="start"
            />
            <StyledTab
              label="From File"
              value="option2"
              icon={<span role="img" aria-label="file" style={{ fontSize: "0.9rem" }}>📁</span>}
              iconPosition="start"
            />
            <StyledTab
              label="GitHub"
              value="option3"
              icon={<GitHubIcon sx={{ fontSize: "0.9rem" }} />}
              iconPosition="start"
            />
          </Tabs>
        </DialogTitle>
        <DialogContent sx={{ padding: "17px", backgroundColor: "#fff", height: "64.5vh", overflow: "hidden" }}>
          <Box sx={{ width: "100%", mt: 2, height: "100%" }}>
            {activeOption === "option1" && (
              <YamlTab
                editorContent={editorContent}
                setEditorContent={setEditorContent}
                workloadName={workloadName}
                detectContentType={detectContentType}
                isEditorContentEdited={isEditorContentEdited}
                loading={loading}
                handleRawUpload={handleRawUpload}
                handleCancelClick={handleCancelClick}
              />
            )}
            {activeOption === "option2" && (
              <UploadFileTab
                workloadName={workloadName}
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                loading={loading}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                handleFileChange={handleFileChange}
                formatFileSize={formatFileSize}
                handleFileUpload={handleFileUpload}
                handleCancelClick={handleCancelClick}
              />
            )}
            {activeOption === "option3" && (
              <GitHubTab
                formData={formData}
                setFormData={setFormData}
                error={error}
                credentialsList={credentialsList}
                webhooksList={webhooksList}
                loading={loading}
                hasChanges={hasChanges}
                handleCredentialChange={handleCredentialChange}
                handleOpenCredentialDialog={handleOpenCredentialDialog}
                handleWebhookChange={handleWebhookChange}
                handleOpenWebhookDialog={handleOpenWebhookDialog}
                validateForm={validateForm}
                handleDeploy={handleDeploy}
                handleCancelClick={handleCancelClick}
              />
            )}
          </Box>
        </DialogContent>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Dialog>

      <AddCredentialsDialog
        credentialDialogOpen={credentialDialogOpen}
        newCredential={newCredential}
        setNewCredential={setNewCredential}
        handleAddCredential={handleAddCredential}
        handleCloseCredentialDialog={handleCloseCredentialDialog}
      />

      <AddWebhookDialog
        webhookDialogOpen={webhookDialogOpen}
        newWebhook={newWebhook}
        setNewWebhook={setNewWebhook}
        handleAddWebhook={handleAddWebhook}
        handleCloseWebhookDialog={handleCloseWebhookDialog}
      />

      <CancelConfirmationDialog
        cancelConfirmationOpen={cancelConfirmationOpen}
        handleCloseCancelConfirmation={handleCloseCancelConfirmation}
        handleConfirmCancel={handleConfirmCancel}
      />
    </>
  );
};

export default CreateOptions;