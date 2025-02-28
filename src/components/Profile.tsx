import { useState, useEffect } from "react"; // Added useEffect
import { 
  Card, 
  CardContent, 
  Typography, 
  TextField, 
  Button, 
  Box,
  Container,
  Grid
} from "@mui/material";
import LoadingFallback from "./LoadingFallback";
import kube from "../assets/kubestellar.png"

const Profile = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameError, setUsernameError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setUsernameError(true);
      return;
    }
    if (!password.trim()) {
      setPasswordError(true);
      return;
    }
    console.log("Username:", username);
    console.log("Password:", password);
    setUsernameError(false);
    setPasswordError(false);
  };

  // Use useEffect to simulate loading and set loading to false after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000); // 1-second delay to simulate loading

    // Cleanup timer on unmount
    return () => clearTimeout(timer);
  }, []); // Empty dependency array ensures this runs once on mount

  if (loading) return <LoadingFallback message="Loading Profile..." size="medium" />;
  return (
    <Container maxWidth={false} sx={{ height: '100%', padding: 0, margin: 0 }}>
      <Grid container sx={{ height: '100%' }}>
        {/* Left Section (Background with Mascot and Text) */}
        <Grid 
          item 
          xs={12} 
          md={9.4} 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center',
            color: 'white',
            textAlign: 'center',
            padding: 4,
            // background: `
            //   linear-gradient(to top left, rgba(138, 43, 226, 0.8) 0%, rgba(0, 77, 153, 0.8) 100%),
            //   url(${stargf})
            // `,
            background: 'rgb(0, 81, 255)',
            backgroundSize: 'cover',
          }}
        >
          <Typography variant="h4" sx={{ mb: 15 }}>
          Let's Multi-Cluster!
           </Typography>
          <Box sx={{ 
            width: '200px', 
            height: '200px', 
            backgroundImage: `url('https://docs.kubestellar.io/release-0.26.0/logo.png')`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }} />
        </Grid>

        {/* Right Section (Login Form) */}
        <Grid 
          item 
          xs={12} 
          md={2.6} 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            background: 'white',
            padding: 4,
          }}
        >
          <Card sx={{ 
            width: '100%', 
            maxWidth: 360, 
            boxShadow: 0, 
            borderRadius: 0,
            background: 'transparent',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}>
            <CardContent sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              flexGrow: 1, 
            }}>
              <Box sx={{ 
                mt: -3,
                display: 'flex', 
                justifyContent: 'center', 
                mb: 6,
              }}>
                <img
                  src="https://docs.kubestellar.io/release-0.26.0/KubeStellar-with-Logo-transparent-v2.png" 
                  alt="Kubestellar Logo"
                  style={{ width: '250px' }}
                />
              </Box>
              <form onSubmit={handleSubmit} style={{ flexGrow: 1 }}>
                <TextField
                  fullWidth
                  label="Username"
                  variant="standard"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameError(false);
                  }}
                  error={usernameError}
                  helperText={usernameError ? "Username is required" : ""}
                  margin="dense"
                  sx={{ 
                    '& .MuiInputBase-root': { 
                      borderRadius: 0,
                    },
                    '& .MuiInput-underline:before': { 
                      borderBottom: '1px solid gray',
                    },
                    '& .MuiInput-underline:after': { 
                      borderBottom: '1px solid gray',
                    },
                    '& .MuiInput-underline:hover:not(.Mui-disabled):before': { 
                      borderBottom: '1px solid gray',
                    },
                    minHeight: '70px',
                  }}
                />
                <Box sx={{ mt: 3 }}>
                  <TextField
                    fullWidth
                    type="password"
                    label="Password"
                    variant="standard"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError(false);
                    }}
                    error={passwordError}
                    helperText={passwordError ? "Password is required" : ""}
                    margin="dense"
                    sx={{ 
                      '& .MuiInputBase-root': { 
                        borderRadius: 0,
                      },
                      '& .MuiInput-underline:before': { 
                        borderBottom: '1px solid gray',
                      },
                      '& .MuiInput-underline:after': { 
                        borderBottom: '1px solid gray',
                      },
                      '& .MuiInput-underline:hover:not(.Mui-disabled):before': { 
                        borderBottom: '1px solid gray',
                      },
                      minHeight: '70px',
                    }}
                  />
                </Box>
                <Button 
                  type="submit" 
                  variant="text"
                  fullWidth 
                  sx={{ 
                    mt: 4, 
                    color: 'rgb(5, 128, 243)',
                    borderRadius: 2,
                    fontWeight: 'bold',
                    p: '15px',
                    border: 'none',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 102, 255, 0.1)',
                      color: 'rgb(5, 128, 243)',
                      border: 'none',
                    },
                    '&:focus': {
                      outline: 'none',
                      border: 'none',
                    },
                    '&:active': {
                      border: 'none',
                    },
                  }}
                >
                  SIGN IN
                </Button>
              </form>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                mb: -2,
                mt: 'auto',
                textAlign: 'center',
                alignItems: 'center',
              }}>
                <img
                  // src="https://docs.kubestellar.io/release-0.26.0/KubeStellar-with-Logo.png" 
                  src={kube}
                  alt="Kubestellar Small Logo"
                  style={{ width: '140px', opacity: 0.7 }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Profile;