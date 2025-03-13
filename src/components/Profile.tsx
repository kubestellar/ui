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
  FormControlLabel,
  Checkbox,
  InputAdornment,
  AlertColor,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import LoadingFallback from "./LoadingFallback";
import kubestellar_word from "../assets/kubes.png"
import kubestellar_icon from "../assets/kubestellar-icon-color.png"
import user from "../assets/user.png"
import key from "../assets/key.png"

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
      background: "#99D8F7", // Solid bluish background for the entire page
    }}>
      <Container maxWidth={false} sx={{ height: "100%", padding: 0, margin: 0 }}>
        <Grid container sx={{ height: "100%", width: "100vw", margin: 0 }}>
          {/* left section */}
          <Grid 
            item 
            xs={12} 
            md={6} 
            sx={{ 
              display: "flex", 
              flexDirection: "column", 
              justifyContent: "center", 
              alignItems: "center",
              color: "#FFFFFF", // White text fill
              textAlign: "center",
              padding: 4,
              height: "100vh",
              width: "100%",
              position: "relative", // For positioning the diamond gradient overlay
            }}
          >
            <Typography 
              variant="h1" 
              sx={{ 
                mb: 14, 
                fontFamily: "Got Milk Sans Serif, sans-serif",
                WebkitTextStroke: "1px #5294F6", // Stroke color for "got multi-cluster!"
                color: "#FFFFFF", // Fill color for text
              }}
            >
              got multi-cluster?
            </Typography>
            {/* Diamond-shaped gradient overlay behind the icon */}
            <Box
              sx={{
                position: "absolute",
                top: "50%", // Center vertically
                left: "50%", // Center horizontally
                transform: "translate(-50%, -50%) rotate(45deg)", // Rotate to create a diamond shape
                width: "600px", // Adjust size to match the image
                height: "600px",
                background: "radial-gradient(ellipse at center, #D4FCE4 20%, transparent 75%)", // Diamond gradient effect
                zIndex: 1, // Behind the icon and text
              }}
            />
            <img
              src={kubestellar_icon}
              alt="KubeStellar Small Logo"
              style={{ 
                width: "380px", 
                opacity: 1, 
                marginBottom: "10px", 
                marginBlockEnd: "60px", 
                position: "relative", 
                zIndex: 2 // Above the gradient
              }}
            />
            <img
              src={kubestellar_word}
              alt="KubeStellar Small Logo"
              style={{ width: "650px", opacity: 1, position: "relative", zIndex: 2 }}
            />
          </Grid>
          {/* right section */}
          <Grid 
            item 
            xs={12} 
            md={6} 
            sx={{ 
              display: "flex", 
              justifyContent: "center", 
              alignItems: "center", 
              background: "white",
              padding: 4,
              height: "100vh",
              width: "100%", // Ensure full width
              margin: 0, // Remove any margin
            }}
          >
            <Card sx={{ 
              width: "100%", 
              maxWidth: 560, 
              boxShadow: 0, 
              borderRadius: 0,
              background: "transparent",
              display: "flex", 
              flexDirection: "column",
              alignItems: "flex-start",
            }}>
              <CardContent sx={{ 
                width: "100%", 
                padding: "20px", 
                display: "flex", 
                flexDirection: "column",
                alignItems: "flex-start",
              }}>
                <Typography 
                  variant="h4" 
                  sx={{ 
                    mb: 6, 
                    color: "#000000", 
                    textAlign: "left", 
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                    fontSize: "40px",
                    overflow: "visible",
                    fontFamily: "revert"
                  }}
                >
                  Sign in to KubeStellar
                </Typography>
                <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  {/* Username Label and Input with Icon */}
                  <Box sx={{ width: "100%", mb: 3 }}>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: "gray", 
                        textAlign: "left",
                        fontSize: "25px",
                        fontFamily: "system-ui"
                      }}
                    >
                      Username
                    </Typography>
                    <TextField
                      fullWidth
                      variant="outlined"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setUsernameError(false);
                        setUsernameErrorMessage("");
                      }}
                      error={usernameError}
                      helperText={usernameError ? usernameErrorMessage : ""}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <img src={user} alt="User Icon" style={{ width: "40px", height: "35px" }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ 
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                          height: "36px",
                          "& .MuiInputBase-input": {
                            padding: "8px 14px",
                          },
                          "& .MuiOutlinedInput-notchedOutline": {
                            border: "3px solid gray", // Set 2px solid black border
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            border: "3px solid gray", // Ensure border on hover
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            border: "3px solid gray", // Ensure border on focus
                          },
                        },
                        width: "100%",
                      }}
                    />
                  </Box>
                  {/* Password Label and Input with Icon */}
                  <Box sx={{ width: "100%" }}>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        color: "gray", 
                        textAlign: "left",
                        fontSize: "25px",
                        fontFamily: "system-ui"
                      }}
                    >
                      Password
                    </Typography>
                    <TextField
                      fullWidth
                      type="password"
                      variant="outlined"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordError(false);
                      }}
                      error={passwordError}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <img src={key} alt="Key Icon" style={{ width: "30px", height: "30px" }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ 
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 2,
                          height: "36px",
                          "& .MuiInputBase-input": {
                            padding: "8px 14px",
                          },
                          "& .MuiOutlinedInput-notchedOutline": {
                            border: "3px solid gray", // Set 3px solid gray border
                          },
                          "&:hover .MuiOutlinedInput-notchedOutline": {
                            border: "3px solid gray", // Ensure border on hover
                          },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                            border: "3px solid gray", // Ensure border on focus
                          },
                        },
                        width: "100%",
                      }}
                    />
                  </Box>
                  {/* Keep the "Keep me signed in" checkbox */}
                  <Box sx={{ display: "flex", alignItems: "center", width: "100%", mt: 1, ml: "15px" }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          sx={{
                            "&.MuiCheckbox-root": {
                              borderRadius: "2px", // Apply border radius directly to the checkbox root
                            },
                            "& .MuiSvgIcon-root": {
                              borderRadius: "2px", // Ensure the SVG icon (checkmark) also has the border radius
                            },
                          }}
                        />
                      }
                      label="Keep me signed in"
                      sx={{
                        color: "gray",
                        "& .MuiFormControlLabel-label": {
                          fontSize: "20px", // Increase font size of the label
                          fontWeight: "550",
                          fontFamily: "system-ui"
                        },
                      }}
                    />
                  </Box>
                  <Box sx={{ width: "100%" }}>
                    <Button 
                      type="submit" 
                      variant="contained"
                      fullWidth 
                      sx={{ 
                        mt: 2,
                        backgroundColor: "#007AFF",
                        color: "#FFFFFF",
                        p: 0,
                        borderRadius: 2,
                        fontWeight: "bold",
                        fontSize: "20px",
                        textTransform: "none", // Prevent uppercase transformation
                        "&:hover": {
                          backgroundColor: "#0062CC",
                        },
                      }}
                    >
                      Sign In
                    </Button>
                  </Box>
                  <Box sx={{ mt: 2, width: "100%", display: "flex", justifyContent: "center", gap: "7px" }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        mt: 0, 
                        color: "gray", 
                        fontWeight: "bold",
                        textAlign: "center",
                        fontSize: "16px"
                      }}
                    >
                      Don’t have an account?
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        mt: 0, 
                        color: "#007AFF", 
                        textAlign: "center",
                        textDecoration: "underline",
                        cursor: "pointer",
                        fontSize: "16px",
                        fontWeight: "bold",
                      }}
                    >
                      Register
                    </Typography>
                  </Box>
                </form>
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