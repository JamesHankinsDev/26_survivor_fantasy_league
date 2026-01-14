"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";
import { useAuth } from "@/lib/auth-context";

export default function VerifyEmailPage() {
  const { completeMagicLinkSignIn, user } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [error, setError] = useState("");

  useEffect(() => {
    const verifySignIn = async () => {
      try {
        // Get email from localStorage
        const email = window.localStorage.getItem("emailForSignIn");

        if (!email) {
          setStatus("error");
          setError("Unable to find your email. Please try signing in again.");
          return;
        }

        await completeMagicLinkSignIn(email);
        setStatus("success");

        // Redirect after short delay
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } catch (err: any) {
        setStatus("error");
        setError(err?.message || "Failed to verify sign-in link");
      }
    };

    // Only verify if not already signed in
    if (!user) {
      verifySignIn();
    } else {
      // Already signed in, redirect
      router.push("/dashboard");
    }
  }, [user, router, completeMagicLinkSignIn]);

  return (
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
        <Card>
          <CardContent sx={{ p: 4, textAlign: "center" }}>
            {status === "loading" && (
              <>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography variant="h6">Verifying your sign-in...</Typography>
              </>
            )}

            {status === "success" && (
              <>
                <Typography variant="h5" color="success.main" sx={{ mb: 2 }}>
                  ✓ Success!
                </Typography>
                <Typography variant="body1">
                  Redirecting to your dashboard...
                </Typography>
              </>
            )}

            {status === "error" && (
              <>
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
                <Button
                  variant="contained"
                  onClick={() => router.push("/")}
                  sx={{ mt: 2 }}
                >
                  Back to Sign In
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
