import React, { useState } from "react";
import { Button, Card, CardContent, Input, Typography, TextField, Box } from "@mui/material";
import axios from "axios";

const KubeconfigOnboarding: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setUploadStatus(null); // Reset status when a new file is selected
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a kubeconfig file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await axios.post("/api/upload-kubeconfig", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadStatus(`✅ Upload successful: ${response.data.message}`);
    } catch (error) {
      console.error('Error fetching file information:', error);
      setUploadStatus("❌ Upload failed. Please try again.");
    }
  };

  return (
    <Box 
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    height="100vh"
    bgcolor="#E0F2F1">
              
      {/* Main Content */}
      <Box flex={1} p={4}>
        <Box bgcolor="white" boxShadow={3} borderRadius={2} p={4}>
          <Typography variant="h5" fontWeight="bold">Create Cluster</Typography>
          <Card sx={{ width: 500, p: 3, borderRadius: 2}}>
            <CardContent>
              <Typography variant="h6">Cluster Details</Typography>
              <Box mt={2}display="flex" flexDirection="column" alignItems="center" gap={2} p={3}>
                <TextField fullWidth label="Cluster Name" defaultValue="xyz cluster" disabled margin="normal" />
                <TextField fullWidth label="Import Mode" defaultValue="Kubeconfig" disabled margin="normal" />
                <Input type="file" inputProps={{ accept: ".kubeconfig" }} onChange={handleFileChange} />
                {selectedFile && <Typography variant="body2">Selected: {selectedFile.name}</Typography>}
                <Button variant="contained" color="primary" onClick={handleUpload} disabled={!selectedFile}>
                  Upload Kubeconfig
                </Button>
                {uploadStatus && <Typography variant="body2">{uploadStatus}</Typography>}
              </Box>
            </CardContent>
          </Card>
          
          <Box mt={3} display="flex" gap={2}>
            <Button variant="outlined">Back</Button>
            <Button variant="contained" color="primary">Next</Button>
            <Button variant="text" color="primary">Cancel</Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default KubeconfigOnboarding;