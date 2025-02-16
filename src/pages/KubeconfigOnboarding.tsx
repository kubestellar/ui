import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, Card, CardContent, Typography, TextField, Box, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { api } from "../lib/api";

interface Cluster {
  clusterName: string;
  status: string;
}

const KubeconfigOnboarding: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [showTimeoutDialog, setShowTimeoutDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const { clusterName = "", importMode = "" } = location.state || {};

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setUploadStatus(null);
    }
  };

  const handleOnboard = async () => {
    if (!selectedFile) {
      setUploadStatus("❌ Please select a kubeconfig file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("clusterName", clusterName);

    try {
      await api.post("/api/clusters/onboard", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadStatus(`✅ Cluster onboarding started.`);
      setIsPolling(true);
    } catch (error) {
      console.error("Error onboarding cluster:", error);
      setUploadStatus("❌ Onboarding failed. Please try again.");
    }
  };

  useEffect(() => {
    if (!isPolling) return;

    const timeout = setTimeout(() => {
      setShowTimeoutDialog(true);
      setIsPolling(false);
      navigate("/");
    }, 120000);

    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/api/clusters/status`);
        const clusterStatus = response.data?.find((c: Cluster) => c.clusterName === clusterName)?.status;
        if (clusterStatus) {
          setOnboardingStatus(clusterStatus);

          if (clusterStatus === "Active") {
            clearInterval(interval);
            clearTimeout(timeout);
            setIsPolling(false);
            navigate("/its");
          }
        }
      } catch (error) {
        console.error("Error checking status:", error);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isPolling, clusterName, navigate]);

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <Card sx={{ width: 500, p: 3, borderRadius: 2, boxShadow: 3, bgcolor: "white" }}>
        <CardContent>
          <Typography variant="h5" fontWeight="bold" align="center">
            Onboard Cluster
          </Typography>
          <Typography variant="h6" sx={{ mt: 2 }}>
            Cluster Details
          </Typography>
          <Box mt={2} display="flex" flexDirection="column" alignItems="center" gap={2}>
            <TextField fullWidth label="Cluster Name" value={clusterName} disabled margin="normal" />
            <TextField fullWidth label="Import Mode" value={importMode} disabled margin="normal" />

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept=".kubeconfig,.yaml,.yml"
              onChange={handleFileChange}
            />
            <Button variant="contained" color="primary" onClick={() => fileInputRef.current?.click()} sx={{ mt: 1 }}>
              {selectedFile ? "Change File" : "Choose File"}
            </Button>

            {selectedFile && <Typography variant="body2">Selected: {selectedFile.name}</Typography>}

            {uploadStatus && (
              <Typography variant="body2" color={uploadStatus.includes("✅") ? "green" : "red"}>
                {uploadStatus}
              </Typography>
            )}

            {isPolling && (
              <Box display="flex" alignItems="center" gap={1}>
                <CircularProgress size={20} />
                <Typography variant="body2">Checking onboarding status...</Typography>
              </Box>
            )}

            {onboardingStatus && (
              <Typography variant="body2" color={onboardingStatus === "Active" ? "green" : "blue"}>
                {onboardingStatus}
              </Typography>
            )}
          </Box>
        </CardContent>

        <Box mt={3} display="flex" justifyContent="space-between" p={2}>
          <Button variant="outlined" onClick={() => navigate(-1)} disabled={isPolling}>
            Back
          </Button>
          <Button variant="contained" color="primary" onClick={handleOnboard} disabled={!selectedFile || isPolling}>
            Onboard
          </Button>
        </Box>
      </Card>

      {/* Timeout Dialog */}
      <Dialog open={showTimeoutDialog} onClose={() => navigate("/home")}>
        <DialogTitle>Timeout</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            The onboarding process took too long and has been timed out.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate("/")} color="primary">
            Go to Home
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default KubeconfigOnboarding;
