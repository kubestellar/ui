import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  Typography, 
  TextField, 
  Button, 
  Box,
  Container,
  Grid,
  Snackbar,
  Alert,
  AlertColor // Import AlertColor type
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import LoadingFallback from "./LoadingFallback";
import "../index.css";

const Profile = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usernameError, setUsernameError] = useState(false);
  const [usernameErrorMessage, setUsernameErrorMessage] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  // Type snackbarSeverity with AlertColor
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertColor>("success");
  
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username.trim()) {
      setUsernameError(true);
      setUsernameErrorMessage("Please enter username");
      setPasswordError(false);
      return;
    }

    try {
      const loginResponse = await fetch("http://localhost:4000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const loginData = await loginResponse.json();

      if (loginResponse.ok) {
        localStorage.setItem("jwtToken", loginData.token);
        console.log("Token stored:", localStorage.getItem("jwtToken"));

        const token = localStorage.getItem("jwtToken");
        const protectedResponse = await fetch("http://localhost:4000/protected", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        const protectedData = await protectedResponse.json();

        if (protectedResponse.ok) {
          setSnackbarMessage("Login successful");
          setSnackbarSeverity("success");
          setOpenSnackbar(true);
          setTimeout(() => {
            navigate("/");
          }, 1000);
        } else {
          setSnackbarMessage(protectedData.error || "Invalid token");
          setSnackbarSeverity("error");
          setOpenSnackbar(true);
          localStorage.removeItem("jwtToken");
          setTimeout(() => {
            navigate("/profile");
          }, 1000);
        }

        setUsernameError(false);
        setPasswordError(false);
      } else {
        setUsernameError(false);
        setUsernameErrorMessage("");
        setPasswordError(true);
      }
    } catch (error) {
      setUsernameError(false);
      setUsernameErrorMessage("");
      setPasswordError(true);
      console.error("Error:", error);
    }
  };  

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    if (location.state && (location.state as { errorMessage?: string }).errorMessage) {
      setSnackbarMessage("You need to sign in to continue. Let’s get you logged in!");
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      navigate(location.pathname, { replace: true, state: {} });
    }

    return () => clearTimeout(timer);
  }, [location, navigate]);

  if (loading) return <LoadingFallback message="Loading Profile..." size="medium" />;

  return (
    <Box sx={{ 
      height: "100vh", 
      width: "100vw", 
      overflow: "hidden", 
      position: "fixed", 
      top: 0, 
      left: 0,
      zIndex: 1000,
    }}>
      <Container maxWidth={false} sx={{ height: "100%", padding: 0, margin: 0 }}>
        <Grid container sx={{ height: "100%" }}>
          <Grid 
            item 
            xs={12} 
            md={9.4} 
            sx={{ 
              display: "flex", 
              flexDirection: "column", 
              justifyContent: "center", 
              alignItems: "center",
              color: "white",
              textAlign: "center",
              padding: 4,
              background: "rgb(0, 81, 255)",
              backgroundSize: "cover",
              height: "100vh",
              width: "100%",
            }}
          >
            <Typography 
              variant="h2" 
              sx={{ 
                mb: 12, 
                fontFamily: "Got Milk Sans Serif, sans-serif",
              }}
            >
              got multi-cluster!
            </Typography>
            <Box sx={{ 
              width: "200px", 
              height: "200px", 
              backgroundImage: `url('https://docs.kubestellar.io/release-0.26.0/logo.png')`,
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
            }} />
          </Grid>
          <Grid 
            item 
            xs={12} 
            md={2.6} 
            sx={{ 
              display: "flex", 
              justifyContent: "center", 
              alignItems: "center",
              background: "white",
              padding: 4,
              height: "100vh",
            }}
          >
            <Card sx={{ 
              width: "100%", 
              maxWidth: 360, 
              boxShadow: 0, 
              borderRadius: 0,
              background: "transparent",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}>
              <CardContent sx={{ 
                display: "flex", 
                flexDirection: "column", 
                justifyContent: "center", 
                flexGrow: 1, 
              }}>
                <Box sx={{ 
                  mt: -3,
                  display: "flex", 
                  justifyContent: "center", 
                  mb: 6,
                }}>
                  <img
                    src="https://docs.kubestellar.io/release-0.26.0/KubeStellar-with-Logo-transparent-v2.png" 
                    alt="KubeStellar Logo"
                    style={{ width: "250px" }}
                  />
                </Box>
                <form onSubmit={handleSubmit} style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                  <TextField
                    fullWidth
                    label="Username"
                    variant="standard"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setUsernameError(false);
                      setUsernameErrorMessage("");
                    }}
                    error={usernameError}
                    helperText={usernameError ? usernameErrorMessage : ""}
                    margin="dense"
                    sx={{ 
                      "& .MuiInputBase-root": { 
                        borderRadius: 0,
                      },
                      "& .MuiInput-underline:before": { 
                        borderBottom: "1px solid gray",
                      },
                      "& .MuiInput-underline:after": { 
                        borderBottom: "1px solid gray",
                      },
                      "& .MuiInput-underline:hover:not(.Mui-disabled):before": { 
                        borderBottom: "1px solid gray",
                      },
                      minHeight: "70px",
                    }}
                  />
                  <Box sx={{ mt: 3, position: "relative" }}>
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
                      margin="dense"
                      sx={{ 
                        "& .MuiInputBase-root": { 
                          borderRadius: 0,
                        },
                        "& .MuiInput-underline:before": { 
                          borderBottom: "1px solid gray",
                        },
                        "& .MuiInput-underline:after": { 
                          borderBottom: "1px solid gray",
                        },
                        "& .MuiInput-underline:hover:not(.Mui-disabled):before": { 
                          borderBottom: "1px solid gray",
                        },
                        minHeight: "70px",
                      }}
                    />
                    {passwordError && (
                      <Typography 
                        sx={{ 
                          color: "error.main", 
                          position: "absolute",
                          top: "100%", // Position below password field
                          left: 0,
                          right: 0,
                          textAlign: "center",
                          mt: 1, // Small margin to avoid overlap
                        }}
                      >
                        Invalid username or password
                      </Typography>
                    )}
                  </Box>
                  <Button 
                    type="submit" 
                    variant="text"
                    fullWidth 
                    sx={{ 
                      mt: 8, // Fixed margin-top to maintain position
                      color: "rgb(5, 128, 243)",
                      borderRadius: 2,
                      fontWeight: "bold",
                      p: "15px",
                      border: "none",
                      "&:hover": {
                        backgroundColor: "rgba(0, 102, 255, 0.1)",
                        color: "rgb(5, 128, 243)",
                        border: "none",
                      },
                      "&:focus": {
                        outline: "none",
                        border: "none",
                      },
                      "&:active": {
                        border: "none",
                      },
                    }}
                  >
                    SIGN IN
                  </Button>
                </form>
                <Box sx={{ 
                  display: "flex", 
                  justifyContent: "center", 
                  mb: -2,
                  mt: "auto",
                  textAlign: "center",
                  alignItems: "center",
                }}>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Profile;