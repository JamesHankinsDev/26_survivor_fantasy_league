"use client";

import { useState, useEffect } from "react";
import { Button, Snackbar, Alert, IconButton, Tooltip } from "@mui/material";
import {
  Download as DownloadIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { logger } from "@/lib/logger";

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check iOS standalone mode
    if ((window.navigator as NavigatorWithStandalone).standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser install prompt
      e.preventDefault();

      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show our custom install button after a delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000); // Wait 3 seconds before showing
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for successful installation
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setInstallSuccess(true);
      setDeferredPrompt(null);
      setShowPrompt(false);

      // Track installation (optional - for analytics)
      logger.log("PWA was installed successfully");
    });

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the browser's install prompt
    await deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      logger.log("User accepted the install prompt");
    } else {
      logger.log("User dismissed the install prompt");
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for 7 days
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Don't show if no install prompt available
  if (!deferredPrompt && !showPrompt) {
    return null;
  }

  return (
    <>
      {/* Desktop: Header button */}
      <Tooltip title="Install app for faster access and offline support">
        <Button
          variant="outlined"
          color="primary"
          startIcon={<DownloadIcon />}
          onClick={handleInstallClick}
          sx={{
            display: { xs: "none", md: "flex" },
            borderColor: "#20B2AA",
            color: "#20B2AA",
            "&:hover": {
              borderColor: "#1a9a94",
              backgroundColor: "rgba(32, 178, 170, 0.1)",
            },
          }}
        >
          Install App
        </Button>
      </Tooltip>

      {/* Mobile: Bottom banner */}
      <Snackbar
        open={showPrompt}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{
          bottom: { xs: 80, sm: 24 },
          "& .MuiSnackbarContent-root": {
            minWidth: "90%",
          },
        }}
      >
        <Alert
          severity="info"
          icon={<DownloadIcon />}
          action={
            <>
              <Button
                color="inherit"
                size="small"
                onClick={handleInstallClick}
                sx={{ fontWeight: "bold" }}
              >
                Install
              </Button>
              <IconButton
                size="small"
                aria-label="close"
                color="inherit"
                onClick={handleDismiss}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </>
          }
          sx={{
            width: "100%",
            backgroundColor: "#20B2AA",
            color: "white",
            "& .MuiAlert-icon": {
              color: "white",
            },
          }}
        >
          Install Survivor Fantasy League for quick access!
        </Alert>
      </Snackbar>

      {/* Success notification */}
      <Snackbar
        open={installSuccess}
        autoHideDuration={5000}
        onClose={() => setInstallSuccess(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setInstallSuccess(false)}
          severity="success"
          icon={<CheckCircleIcon />}
          sx={{ width: "100%" }}
        >
          App installed successfully! Find it on your home screen.
        </Alert>
      </Snackbar>
    </>
  );
}
