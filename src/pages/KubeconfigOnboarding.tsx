import React from "react";
import { Button, Card, CardContent, Typography, TextField, Box } from "@mui/material";

const KubeconfigOnboarding: React.FC = () => {
  return (
    <Box display="flex" height="100vh" bgcolor="#E0F2F1">
              
      {/* Main Content */}
      <Box flex={1} p={4}>
        <Box bgcolor="white" boxShadow={3} borderRadius={2} p={4}>
          <Typography variant="h5" fontWeight="bold">Create Cluster</Typography>
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6">Cluster Details</Typography>
              <Box mt={2}>
                <TextField fullWidth label="Cluster Name" defaultValue="xyz cluster" disabled margin="normal" />
                <TextField fullWidth label="Import Mode" defaultValue="Kubeconfig" disabled margin="normal" />
                <Button variant="contained" color="secondary" sx={{ mt: 2 }}>Upload</Button>
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