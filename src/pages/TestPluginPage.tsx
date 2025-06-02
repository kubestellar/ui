  // import ArrowBackIcon from '@mui/icons-material/ArrowBack';
  // import { Box, Button, Typography, Card, CardContent, TextField, Grid, Paper, Divider } from '@mui/material';
  // import React, { useState, useEffect } from 'react';
  // import { useNavigate } from 'react-router-dom';
  // import testPlugin from '../plugins/TestPlugin';

  // const TestPluginPage: React.FC = () => {
  //   const navigate = useNavigate();
  //   const [userName, setUserName] = useState('');
  //   const [greeting, setGreeting] = useState('');
  //   const [uiMessage, setUiMessage] = useState('');
  //   const [customMessage, setCustomMessage] = useState('');
  //   const [initialized, setInitialized] = useState(false);

  //   // Initialize the plugin when component mounts
  //   useEffect(() => {
  //     try {
  //       const initMessage = testPlugin.init();
  //       console.log(initMessage);
  //       setInitialized(true);
  //       setUiMessage("Plugin initialized successfully!");
  //     } catch (error) {
  //       console.error("Failed to initialize plugin:", error);
  //       setUiMessage(`Error initializing plugin: ${error instanceof Error ? error.message : 'Unknown error'}`);
  //     }
  //   }, []);

  //   const handleGoBack = () => {
  //     navigate('/plugins');
  //   };

  //   const handleGetGreeting = () => {
  //     if (!userName.trim()) {
  //       setGreeting('Please enter your name');
  //       return;
  //     }
  //     const greeting = testPlugin.getGreeting(userName);
  //     setGreeting(greeting);
  //   };

  //   const handleUpdateUI = () => {
  //     const result = testPlugin.updateUI(customMessage);
  //     setUiMessage(result);
  //   };

  //   return (
  //     <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
  //       <Button
  //         startIcon={<ArrowBackIcon />}
  //         onClick={handleGoBack}
  //         variant="outlined"
  //         sx={{ mb: 3 }}
  //       >
  //         Back to Plugins
  //       </Button>

  //       <Typography variant="h4" component="h1" gutterBottom>
  //         Test Plugin Demo
  //       </Typography>

  //       <Grid container spacing={3}>
  //         <Grid item xs={12} md={6}>
  //           <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
  //             <Typography variant="h6" gutterBottom>Plugin Information</Typography>
  //             <Divider sx={{ mb: 2 }} />
  //             <Box sx={{ mb: 2 }}>
  //               <Typography variant="subtitle1">Name: {testPlugin.name}</Typography>
  //               <Typography variant="subtitle1">Version: {testPlugin.version}</Typography>
  //               <Typography variant="subtitle1">Status: {initialized ? 'Initialized' : 'Not Initialized'}</Typography>
  //             </Box>
              
  //             <TextField
  //               fullWidth
  //               label="Enter your name"
  //               variant="outlined"
  //               value={userName}
  //               onChange={(e) => setUserName(e.target.value)}
  //               sx={{ mb: 2 }}
  //             />
  //             <Button
  //               variant="contained"
  //               onClick={handleGetGreeting}
  //               fullWidth
  //               sx={{ mb: 2 }}
  //             >
  //               Get Greeting
  //             </Button>
  //             {greeting && (
  //               <Card variant="outlined" sx={{ mt: 2 }}>
  //                 <CardContent>
  //                   <Typography>{greeting}</Typography>
  //                 </CardContent>
  //               </Card>
  //             )}
  //           </Paper>
  //         </Grid>

  //         <Grid item xs={12} md={6}>
  //           <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
  //             <Typography variant="h6" gutterBottom>Update UI</Typography>
  //             <Divider sx={{ mb: 2 }} />
  //             <TextField
  //               fullWidth
  //               label="Enter a message"
  //               variant="outlined"
  //               value={customMessage}
  //               onChange={(e) => setCustomMessage(e.target.value)}
  //               sx={{ mb: 2 }}
  //               multiline
  //               rows={3}
  //             />
  //             <Button
  //               variant="contained"
  //               color="primary"
  //               onClick={handleUpdateUI}
  //               fullWidth
  //             >
  //               Update UI
  //             </Button>
  //             {uiMessage && (
  //               <Card variant="outlined" sx={{ mt: 2, p: 2, bgcolor: 'action.hover' }}>
  //                 <Typography variant="body2">{uiMessage}</Typography>
  //               </Card>
  //             )}
  //           </Paper>
  //         </Grid>
  //       </Grid>
  //     </Box>
  //   );
  // };

  // export default TestPluginPage;


//   import ArrowBackIcon from '@mui/icons-material/ArrowBack';
// import { Box, Button, Card, CardContent, Divider, Grid, Paper, TextField, Typography } from '@mui/material';
// import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import testPlugin from '../plugins/TestPlugin';

// const TestPluginPage: React.FC = () => {
//   const navigate = useNavigate();
//   const [userName, setUserName] = useState('');
//   const [greeting, setGreeting] = useState('');
//   const [uiMessage, setUiMessage] = useState('');
//   const [customMessage, setCustomMessage] = useState('');
//   const [initialized, setInitialized] = useState(false);

//   // Initialize the plugin when component mounts
//   useEffect(() => {
//     try {
//       const initMessage = testPlugin.init();
//       console.log(initMessage);
//       setInitialized(true);
//       setUiMessage("Plugin initialized successfully!");
//     } catch (error) {
//       console.error("Failed to initialize plugin:", error);
//       setUiMessage(`Error initializing plugin: ${error instanceof Error ? error.message : 'Unknown error'}`);
//     }
//   }, []);

//   const handleGoBack = () => {
//     navigate('/plugins');
//   };

//   const handleGetGreeting = () => {
//     if (!userName.trim()) {
//       setGreeting('Please enter your name');
//       return;
//     }
//     const greeting = testPlugin.getGreeting(userName);
//     setGreeting(greeting);
//   };

//   const handleUpdateUI = () => {
//     const result = testPlugin.updateUI(customMessage);
//     setUiMessage(result);
//   };

//   const handleNavigateToOnboard = () => {
//     navigate('clusters/onboard');
//   };

//   const handleNavigateToDetach = () => {
//     navigate('/clusters/detach');
//   };

//   return (
//     <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
//       <Button
//         startIcon={<ArrowBackIcon />}
//         onClick={handleGoBack}
//         variant="outlined"
//         sx={{ mb: 3 }}
//       >
//         Back to Plugins
//       </Button>

//       <Typography variant="h4" component="h1" gutterBottom>
//         Test Plugin Demo
//       </Typography>

//       <Grid container spacing={3}>
//         <Grid item xs={12} md={6}>
//           <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
//             <Typography variant="h6" gutterBottom>Plugin Information</Typography>
//             <Divider sx={{ mb: 2 }} />
//             <Box sx={{ mb: 2 }}>
//               <Typography variant="subtitle1">Name: {testPlugin.name}</Typography>
//               <Typography variant="subtitle1">Version: {testPlugin.version}</Typography>
//               <Typography variant="subtitle1">Status: {initialized ? 'Initialized' : 'Not Initialized'}</Typography>
//             </Box>
            
//             <TextField
//               fullWidth
//               label="Enter your name"
//               variant="outlined"
//               value={userName}
//               onChange={(e) => setUserName(e.target.value)}
//               sx={{ mb: 2 }}
//             />
//             <Button
//               variant="contained"
//               onClick={handleGetGreeting}
//               fullWidth
//               sx={{ mb: 2 }}
//             >
//               Get Greeting
//             </Button>
//             {greeting && (
//               <Card variant="outlined" sx={{ mt: 2 }}>
//                 <CardContent>
//                   <Typography>{greeting}</Typography>
//                 </CardContent>
//               </Card>
//             )}
//           </Paper>
//         </Grid>

//         <Grid item xs={12} md={6}>
//           <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
//             <Typography variant="h6" gutterBottom>Update UI</Typography>
//             <Divider sx={{ mb: 2 }} />
//             <TextField
//               fullWidth
//               label="Enter a message"
//               variant="outlined"
//               value={customMessage}
//               onChange={(e) => setCustomMessage(e.target.value)}
//               sx={{ mb: 2 }}
//               multiline
//               rows={3}
//             />
//             <Button
//               variant="contained"
//               color="primary"
//               onClick={handleUpdateUI}
//               fullWidth
//               sx={{ mb: 2 }}
//             >
//               Update UI
//             </Button>
//             {uiMessage && (
//               <Card variant="outlined" sx={{ mt: 2, p: 2, bgcolor: 'action.hover' }}>
//                 <Typography variant="body2">{uiMessage}</Typography>
//               </Card>
//             )}
//             <Divider sx={{ my: 2 }} />
//             <Typography variant="h6" gutterBottom>Cluster Management</Typography>
//             <Button
//               variant="contained"
//               color="secondary"
//               onClick={handleNavigateToOnboard}
//               fullWidth
//               sx={{ mb: 1 }}
//             >
//               Onboard Cluster
//             </Button>
//             <Button
//               variant="contained"
//               color="error"
//               onClick={handleNavigateToDetach}
//               fullWidth
//             >
//               Detach Cluster
//             </Button>
//           </Paper>
//         </Grid>
//       </Grid>
//     </Box>
//   );
// };

// export default TestPluginPage;



import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, Divider, Paper, Typography } from '@mui/material';
import React from 'react';
import { useNavigate } from 'react-router-dom';

const TestPluginPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate('/plugins');
  };

  const handleNavigateToOnboard = () => {
    console.log('Navigating to OnboardForm at /plugins/test-plugin/clusters/onboard', new Date().toISOString());
    navigate('/plugins/test-plugin/clusters/api/onboard');
  };

  const handleNavigateToDetach = () => {
    console.log('Navigating to DetachForm at /plugins/test-plugin/clusters/detach', new Date().toISOString());
    navigate('/plugins/test-plugin/clusters/detach');
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={handleGoBack}
        variant="outlined"
        sx={{ mb: 3 }}
      >
        Back to Plugins
      </Button>

      <Typography variant="h4" component="h1" gutterBottom>
        KubeStellar Cluster Management
      </Typography>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Cluster Management Plugin</Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Manage your clusters with tools for onboarding and detaching clusters in KubeStellar.
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          onClick={handleNavigateToOnboard}
          fullWidth
          sx={{ mb: 1 }}
        >
          Onboard Cluster
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleNavigateToDetach}
          fullWidth
        >
          Detach Cluster
        </Button>
      </Paper>
      {/* <Outlet/> */}
    </Box>
  );
};

export default TestPluginPage;

