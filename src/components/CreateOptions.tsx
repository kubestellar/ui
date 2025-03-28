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
import { HelmTab } from "./Workloads/HelmTab";
import { AddCredentialsDialog } from "../components/Workloads/AddCredentialsDialog";
import { AddWebhookDialog } from "../components/Workloads/AddWebhookDialog";
import { CancelConfirmationDialog } from "../components/Workloads/CancelConfirmationDialog";
import useTheme from "../stores/themeStore";
import helmicon from "../assets/Helm.png"

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

interface HelmFormData {
  repoName: string;
  repoUrl: string;
  chartName: string;
  releaseName: string;
  version: string;
  namespace: string;
}

interface Workload {
  kind?: string;
  metadata?: {
    name?: string;
    namespace?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function generateRandomString(length: number) {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const CreateOptions = ({
  activeOption,
  setActiveOption,
  onCancel,
}: Props) => {
  const theme = useTheme((state) => state.theme);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const randomStrings = generateRandomString(5);
  const initialEditorContent = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: example-${randomStrings}
  namespace: test-${randomStrings}
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

  const initialHelmFormData: HelmFormData = {
    repoName: "",
    repoUrl: "",
    chartName: "",
    releaseName: "",
    version: "", // Changed from "latest" to "" to make it empty by default
    namespace: "default",
  };
  const [helmFormData, setHelmFormData] = useState<HelmFormData>(initialHelmFormData);

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

      const docWithName = documents.find((doc) => doc?.metadata?.name);
      const name = docWithName?.metadata?.name || "";
      setWorkloadName(name);
    } catch (error) {
      console.error("Error parsing editor content:", error);
      setWorkloadName("");
    }
  }, [editorContent]);

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

  useEffect(() => {
    setIsEditorContentEdited(editorContent !== initialEditorContent);
  }, [editorContent, initialEditorContent]);

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
    } else if (activeOption === "option4") {
      changesDetected =
        helmFormData.repoName !== initialHelmFormData.repoName ||
        helmFormData.repoUrl !== initialHelmFormData.repoUrl ||
        helmFormData.chartName !== initialHelmFormData.chartName ||
        helmFormData.releaseName !== initialHelmFormData.releaseName ||
        helmFormData.version !== initialHelmFormData.version ||
        helmFormData.namespace !== initialHelmFormData.namespace;
    }

    setHasChanges(changesDetected);
  }, [activeOption, editorContent, selectedFile, formData, helmFormData]);

  const handleFileUpload = async (autoNs: boolean) => {
    if (!selectedFile) {
      toast.error("No file selected.");
      return;
    }

    const formData = new FormData();
    formData.append("wds", selectedFile);
    console.log("FormData Entries:", [...formData.entries()]);

    try {
      const response = await uploadFileMutation.mutateAsync({ data: formData, autoNs });
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
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          if (content) {
            try {
              let documents: Workload[] = [];
              const contentType = detectContentType(content);
              if (contentType === "json") {
                const parsed = JSON.parse(content);
                documents = Array.isArray(parsed) ? parsed : [parsed];
              } else {
                jsyaml.loadAll(content, (doc) => documents.push(doc as Workload), {});
              }
              const docWithKind = documents.find((doc) => doc?.kind);
              const kind = docWithKind?.kind || "Unknown";
              const namespace = docWithKind?.metadata?.namespace || "default";
              toast.error(`Failed to create ${kind} ${workloadName} in namespace ${namespace}, workload is already exists or Namspace ${namespace} not Found`);
            } catch (parseError) {
              console.error("Error parsing file for kind:", parseError);
              toast.error(`Failed to create Unknown ${workloadName} workload is already exists`);
            }
          } else {
            toast.error(`Failed to create Unknown ${workloadName} workload is already exists`);
          }
        };
        reader.readAsText(selectedFile);
      } else if (axiosError.response?.status === 409) {
        toast.error("Conflict error: Deployment already in progress!");
      } else {
        toast.error(`Upload failed: ${errorMessage}`);
      }
    }
  };

  const handleRawUpload = async (autoNs: boolean) => {
    const fileContent = editorContent.trim();

    if (!fileContent) {
      toast.error("Please enter YAML or JSON content.");
      return;
    }

    try {
      let documents: Workload[] = [];
      const contentType = detectContentType(fileContent);
      if (contentType === "json") {
        const parsed = JSON.parse(fileContent);
        documents = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        jsyaml.loadAll(fileContent, (doc) => documents.push(doc as Workload), {});
      }

      const hasName = documents.some((doc) => doc?.metadata?.name);
      if (!hasName) {
        toast.error("At least one document must have 'metadata.name'");
        return;
      }

      const response = await axios.post(
        `http://localhost:4000/api/resources?auto_ns=${autoNs}`,
        documents
      );

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
          let documents: Workload[] = [];
          const contentType = detectContentType(fileContent);
          if (contentType === "json") {
            const parsed = JSON.parse(fileContent);
            documents = Array.isArray(parsed) ? parsed : [parsed];
          } else {
            jsyaml.loadAll(fileContent, (doc) => documents.push(doc as Workload), {});
          }
          const docWithKind = documents.find((doc) => doc?.kind);
          const kind = docWithKind?.kind || "Unknown";
          const namespace = docWithKind?.metadata?.namespace || "default";
          toast.error(`Failed to create ${kind}: ${workloadName} in namespace ${namespace}, workload is already exists or Namspace ${namespace} not Found`);
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
          toast.error("Failed to clone repository, fill correct url and path !");
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

  const handleHelmDeploy = async () => {
    if (!validateHelmForm()) {
      return;
    }

    setLoading(true);

    try {
      // Conditionally build the requestBody, excluding the version field if it's empty
      const requestBody: { [key: string]: string } = {
        repoName: helmFormData.repoName,
        repoURL: helmFormData.repoUrl,
        chartName: helmFormData.chartName,
        releaseName: helmFormData.releaseName,
        namespace: helmFormData.namespace || "default",
      };

      // Only include the version field if it's not empty
      if (helmFormData.version) {
        requestBody.version = helmFormData.version;
      }

      const response = await axios.post(
        "http://localhost:4000/deploy/helm",
        requestBody,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Helm Deploy response:", response);

      if (response.status === 200 || response.status === 201) {
        toast.success("Helm chart deployed successfully!");
        setHelmFormData({
          repoName: "",
          repoUrl: "",
          chartName: "",
          releaseName: "",
          version: "", // Reset to empty string
          namespace: "default",
        });
        setTimeout(() => window.location.reload(), 4000);
      } else {
        throw new Error("Unexpected response status: " + response.status);
      }
    } catch (error: unknown) {
      const err = error as AxiosError;
      console.error("Helm Deploy error:", err);

      if (err.response) {
        if (err.response.status === 500) {
          toast.error("Deployment failed: failed to install chart: cannot re-use a name that is still in use!");
        } else if (err.response.status === 400) {
          toast.error("Failed to deploy Helm chart!");
        } else {
          toast.error(`Helm deployment failed! (${err.response.status})`);
        }
      } else {
        toast.error("Helm deployment failed due to network error!");
      }
    } finally {
      setLoading(false);
    }
  };

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

  const handleConfirmCancel = () => {
    setSelectedFile(null);
    setError("");
    setActiveOption(null);
    setCancelConfirmationOpen(false);
    onCancel();
  };

  const handleCloseCancelConfirmation = () => {
    setCancelConfirmationOpen(false);
  };

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

  const validateHelmForm = () => {
    let isValid = true;
    let errorMessage = "";

    if (!helmFormData.repoName) {
      errorMessage = "Please enter Repository Name.";
      isValid = false;
    } else if (!helmFormData.repoUrl) {
      errorMessage = "Please enter Repository URL.";
      isValid = false;
    } else if (!helmFormData.chartName) {
      errorMessage = "Please enter Chart Name.";
      isValid = false;
    } else if (!helmFormData.releaseName) {
      errorMessage = "Please enter Release Name.";
      isValid = false;
    }

    setError(errorMessage);
    return isValid;
  };

  const handleCredentialChange = (event: SelectChangeEvent<string>) => {
    setFormData({ ...formData, credentials: event.target.value });
  };

  const handleOpenCredentialDialog = () => {
    setCredentialDialogOpen(true);
  };

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

  const handleCloseCredentialDialog = () => {
    setCredentialDialogOpen(false);
    setNewCredential({ githubUsername: "", personalAccessToken: "" });
    setFormData({ ...formData, credentials: "none" });
  };

  const handleWebhookChange = (event: SelectChangeEvent<string>) => {
    setFormData({ ...formData, webhook: event.target.value });
  };

  const handleOpenWebhookDialog = () => {
    setWebhookDialogOpen(true);
  };

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

  const handleCloseWebhookDialog = () => {
    setWebhookDialogOpen(false);
    setNewWebhook({ webhookUrl: "", personalAccessToken: "" });
    setFormData({ ...formData, webhook: "none" });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = "#1976d2";
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = "#bdbdbd";
  };

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setSelectedFile(file);
    }
  };

  const formatFileSize = (size: number): string => {
    if (size < 1024) return `${size} B`;
    const kb = size / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <>
      {error && (
        <Box sx={{ color: "red", mb: 1, textAlign: "center" }}>{error}</Box>
      )}
      <Dialog
        open={!!activeOption}
        onClose={onCancel}
        maxWidth="lg"
        fullWidth
        PaperProps={getDialogPaperProps(theme)}
      >
        <DialogTitle sx={{ 
          padding: "16px 16px", 
          borderBottom: theme === "dark" ? "1px solid #444" : "1px solid #e0e0e0",
        }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 600, 
            color: theme === "dark" ? "#d4d4d4" : "black",
          }}>
            Create Workload
          </Typography>
          <Typography sx={{ 
            fontSize: "13px", 
            color: theme === "dark" ? "#858585" : "gray",
          }}>
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
              "& .MuiTab-root": {
                color: theme === "dark" ? "#d4d4d4" : "#333",
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
            <StyledTab
              label="Helm"
              value="option4"
               icon={
                <img 
                  src={helmicon} 
                  alt="Helm" 
                  width={24} 
                  height={24} 
                  style={{ filter: theme === "dark" ? "brightness(0) saturate(100%) invert(1)" : "none" }} 
                />
              }        
              iconPosition="start"
            />
          </Tabs>
        </DialogTitle>
        <DialogContent sx={{ 
          padding: "17px", 
          height: "100vh", 
          overflow: "hidden",
        }}>
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
            {activeOption === "option4" && (
              <HelmTab
                formData={helmFormData}
                setFormData={setHelmFormData}
                error={error}
                loading={loading}
                hasChanges={hasChanges}
                validateForm={validateHelmForm}
                handleDeploy={handleHelmDeploy}
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
            sx={{ 
              width: "100%",
              backgroundColor: theme === "dark" ? "#333" : "#fff",
              color: theme === "dark" ? "#d4d4d4" : "#333",
            }}
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
