"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Divider,
  Stack,
  CircularProgress,
  Alert,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { useAuth } from "@/lib/auth-context";

const theme = createTheme({
  palette: {
    primary: {
      main: "#E85D2A", // Warm orange
    },
    secondary: {
      main: "#20B2AA", // Aqua/Teal accent
    },
    background: {
      default: "#f5f5f5",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h3: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
  },
});

export default function LandingPage() {
  const {
    user,
    loading: authLoading,
    error: authError,
    signInWithGoogle,
  } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect to dashboard if user is logged in
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign-in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle guest access
  const handleGuestAccess = () => {
    setIsLoading(true);
    // Implement guest access logic here
    // You can redirect to a guest dashboard or set a guest session
    console.log("Guest access initiated");
  };

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #B8360F 0%, #1A1A1A 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress sx={{ color: "#E85D2A" }} />
        </Box>
      </ThemeProvider>
    );
  }

  // Render landing page (user is redirected via useEffect if logged in)
  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #B8360F 0%, #1A1A1A 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            py: 4,
          }}
        >
          <Container maxWidth="sm">
            <Stack spacing={4} alignItems="center">
              {/* Header Section */}
              <Box sx={{ textAlign: "center", color: "white" }}>
                <Typography
                  variant="h3"
                  component="h1"
                  sx={{
                    mb: 2,
                    fontSize: { xs: "2.5rem", sm: "3rem" },
                    fontWeight: 800,
                    letterSpacing: "-0.5px",
                  }}
                >
                  Survivor Fantasy League
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    opacity: 0.9,
                    fontWeight: 300,
                    letterSpacing: "0.3px",
                  }}
                >
                  Compete with friends in the ultimate Survivor experience
                </Typography>
              </Box>

              {/* Main Card */}
              <Card
                sx={{
                  width: "100%",
                  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
                  borderRadius: 3,
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Stack spacing={3}>
                    {/* Error Alert */}
                    {authError && <Alert severity="error">{authError}</Alert>}

                    {/* Welcome Text */}
                    <Box sx={{ textAlign: "center" }}>
                      <Typography
                        variant="h5"
                        sx={{
                          mb: 1,
                          color: "text.primary",
                        }}
                      >
                        Welcome
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: "text.secondary",
                        }}
                      >
                        Sign in with your Google account to get started
                      </Typography>
                    </Box>

                    {/* Google Sign-In Button */}
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                      startIcon={
                        isLoading ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          <GoogleIcon />
                        )
                      }
                      sx={{
                        py: 1.5,
                        fontWeight: 600,
                        fontSize: "1rem",
                        textTransform: "none",
                        borderRadius: 1.5,
                        background:
                          "linear-gradient(135deg, #D94E23 0%, #E85D2A 100%)",
                        "&:hover": {
                          background:
                            "linear-gradient(135deg, #C93F1A 0%, #D94E23 100%)",
                        },
                        "&:disabled": {
                          background: "rgba(217, 78, 35, 0.5)",
                        },
                      }}
                    >
                      {isLoading ? "Signing in..." : "Sign in with Google"}
                    </Button>

                    {/* Divider */}
                    <Divider sx={{ my: 1 }}>OR</Divider>

                    {/* Guest Access Button */}
                    <Button
                      variant="outlined"
                      size="large"
                      fullWidth
                      onClick={handleGuestAccess}
                      disabled={isLoading}
                      sx={{
                        py: 1.5,
                        fontWeight: 600,
                        fontSize: "1rem",
                        textTransform: "none",
                        borderRadius: 1.5,
                        borderColor: "#E85D2A",
                        color: "#E85D2A",
                        "&:hover": {
                          borderColor: "#D94E23",
                          color: "#D94E23",
                          backgroundColor: "rgba(217, 78, 35, 0.08)",
                        },
                        "&:disabled": {
                          borderColor: "rgba(217, 78, 35, 0.5)",
                          color: "rgba(217, 78, 35, 0.5)",
                        },
                      }}
                    >
                      Continue as Guest
                    </Button>
                  </Stack>
                </CardContent>
              </Card>

              {/* Footer Text */}
              <Typography
                variant="caption"
                sx={{
                  textAlign: "center",
                  color: "white",
                  opacity: 0.8,
                  maxWidth: 400,
                }}
              >
                By signing in, you agree to our Terms of Service and Privacy
                Policy
              </Typography>
            </Stack>
          </Container>
        </Box>
      </ThemeProvider>
    );
  }

  // Loading state while redirecting
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #B8360F 0%, #1A1A1A 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress sx={{ color: "#E85D2A" }} />
      </Box>
    </ThemeProvider>
  );
}
