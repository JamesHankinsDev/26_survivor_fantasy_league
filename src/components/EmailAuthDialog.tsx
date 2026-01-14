"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
} from "@mui/material";
import { useAuth } from "@/lib/auth-context";

interface EmailAuthDialogProps {
  open: boolean;
  onClose: () => void;
  onGoogleSignIn: () => void;
}

export default function EmailAuthDialog({
  open,
  onClose,
  onGoogleSignIn,
}: EmailAuthDialogProps) {
  const { signUpWithEmail, signInWithEmail, sendMagicLink } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup" | "magic">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const isGmailAddress = (email: string) => {
    return email.toLowerCase().endsWith("@gmail.com");
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setError("");
    setSuccess("");
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (isGmailAddress(email)) {
      setError("Gmail accounts must use Google Sign-In");
      return;
    }

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(email, password);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (isGmailAddress(email)) {
      setError("Gmail accounts must use Google Sign-In");
      return;
    }

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email, password);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (isGmailAddress(email)) {
      setError("Gmail accounts must use Google Sign-In");
      return;
    }

    if (!email) {
      setError("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      await sendMagicLink(email);
      setSuccess("Check your email for a magic link to sign in!");
    } catch (err: any) {
      setError(err?.message || "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
    setTab("signin");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Sign In to Survivor Fantasy League</DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
          <Tabs
            value={tab}
            onChange={(_, newValue) => {
              setTab(newValue);
              setError("");
              setSuccess("");
            }}
          >
            <Tab label="Sign In" value="signin" />
            <Tab label="Sign Up" value="signup" />
            <Tab label="Magic Link" value="magic" />
          </Tabs>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {tab === "signin" && (
          <Box component="form" onSubmit={handleSignIn}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              margin="normal"
              required
              autoFocus
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Sign In"}
            </Button>
          </Box>
        )}

        {tab === "signup" && (
          <Box component="form" onSubmit={handleSignUp}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              margin="normal"
              required
              autoFocus
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              helperText="At least 8 characters"
            />
            <TextField
              fullWidth
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
              required
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : "Create Account"}
            </Button>
          </Box>
        )}

        {tab === "magic" && (
          <Box component="form" onSubmit={handleMagicLink}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Enter your email and we'll send you a magic link to sign in
              without a password.
            </Typography>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              margin="normal"
              required
              autoFocus
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 2 }}
              disabled={loading || !!success}
            >
              {loading ? <CircularProgress size={24} /> : "Send Magic Link"}
            </Button>
          </Box>
        )}

        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            or
          </Typography>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => {
              handleClose();
              onGoogleSignIn();
            }}
          >
            Continue with Google
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
}
