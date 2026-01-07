'use client';

import { useEffect, useState } from 'react';
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
  Paper,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const theme = createTheme({
  palette: {
    primary: {
      main: '#E85D2A', // Warm orange
    },
    secondary: {
      main: '#20B2AA', // Aqua/Teal accent
    },
    background: {
      default: '#f5f5f5',
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
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  useEffect(() => {
    // Load Google Sign-In script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleLoaded(true);
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const handleGoogleSignIn = (response: any) => {
    console.log('Google Sign-In response:', response);
    setIsLoading(true);
    // Handle the JWT token from Google Sign-In
    // You can send this to your backend for verification
  };

  const handleGuestAccess = () => {
    setIsLoading(true);
    // Handle guest access logic
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #B8360F 0%, #1A1A1A 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Container maxWidth="sm">
          <Stack spacing={4} alignItems="center">
            {/* Header Section */}
            <Box sx={{ textAlign: 'center', color: 'white' }}>
              <Typography
                variant="h3"
                component="h1"
                sx={{
                  mb: 2,
                  fontSize: { xs: '2.5rem', sm: '3rem' },
                  fontWeight: 800,
                  letterSpacing: '-0.5px',
                }}
              >
                Survivor Fantasy League
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  opacity: 0.9,
                  fontWeight: 300,
                  letterSpacing: '0.3px',
                }}
              >
                Compete with friends in the ultimate Survivor experience
              </Typography>
            </Box>

            {/* Main Card */}
            <Card
              sx={{
                width: '100%',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                borderRadius: 3,
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Stack spacing={3}>
                  {/* Welcome Text */}
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography
                      variant="h5"
                      sx={{
                        mb: 1,
                        color: 'text.primary',
                      }}
                    >
                      Welcome
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        color: 'text.secondary',
                      }}
                    >
                      Sign in with your Google account to get started
                    </Typography>
                  </Box>

                  {/* Google Sign-In Button Container */}
                  {googleLoaded && (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        py: 1,
                      }}
                    >
                      <div
                        id="g_id_onload"
                        data-client_id={
                          process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
                        }
                        data-callback="handleGoogleSignIn"
                      ></div>
                      <div
                        id="g_id_signin"
                        data-type="standard"
                        data-size="large"
                        data-theme="outline"
                        data-text="signin_with"
                        data-shape="rectangular"
                        data-logo_alignment="left"
                      ></div>
                    </Box>
                  )}

                  {/* Divider */}
                  <Divider sx={{ my: 1 }}>OR</Divider>

                  {/* Guest Access Button */}
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handleGuestAccess}
                    disabled={isLoading}
                    sx={{
                      py: 1.5,
                      fontWeight: 600,
                      fontSize: '1rem',
                      textTransform: 'none',
                      borderRadius: 1.5,
                      background: 'linear-gradient(135deg, #D94E23 0%, #E85D2A 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #C93F1A 0%, #D94E23 100%)',
                      },
                      '&:disabled': {
                        background: 'rgba(217, 78, 35, 0.5)',
                      },
                    }}
                    startIcon={
                      isLoading ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : undefined
                    }
                  >
                    {isLoading ? 'Signing in...' : 'Continue as Guest'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* Footer Text */}
            <Typography
              variant="caption"
              sx={{
                textAlign: 'center',
                color: 'white',
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
