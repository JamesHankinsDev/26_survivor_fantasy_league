"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
  IconButton,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Close as CloseIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Home as HomeIcon,
  Group as GroupIcon,
  Leaderboard as LeaderboardIcon,
  SportsBaseball as SportsIcon,
  AdminPanelSettings as AdminIcon,
  Message as MessageIcon,
  Notifications as NotificationIcon,
} from "@mui/icons-material";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  tips?: string[];
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Welcome to Survivor Fantasy League!",
    description: "Let's take a quick tour to help you get started. You can skip this tutorial or replay it anytime from the About page.",
    icon: <HomeIcon sx={{ fontSize: 60, color: "#E85D2A" }} />,
    tips: [
      "This tour will show you the key features",
      "You can skip or exit at any time",
      "Come back to this tutorial from the About page",
    ],
  },
  {
    title: "Dashboard Home",
    description: "Your home base shows all your active leagues, quick stats, and recent performance. Select a league to view detailed standings and scores.",
    icon: <HomeIcon sx={{ fontSize: 60, color: "#E85D2A" }} />,
    tips: [
      "View your league rankings at a glance",
      "See total points across all leagues",
      "Quick access to your tribe roster",
    ],
  },
  {
    title: "My Leagues",
    description: "Create new leagues, join existing ones with a code, and manage all your fantasy teams in one place.",
    icon: <GroupIcon sx={{ fontSize: 60, color: "#E85D2A" }} />,
    tips: [
      "Create a league and invite friends",
      "Join leagues with a 6-character code",
      "View detailed standings for each league",
      "Draft your 5-castaway team",
    ],
  },
  {
    title: "League Message Boards",
    description: "Each league has its own message board where you can chat with other members, use @mentions, and react to messages with emojis.",
    icon: <MessageIcon sx={{ fontSize: 60, color: "#E85D2A" }} />,
    tips: [
      "Type @ to mention other players",
      "React to messages with emojis",
      "Edit or delete your own messages",
      "Get notified when someone mentions you",
    ],
  },
  {
    title: "Leaderboard",
    description: "Track your performance across all leagues. See who's leading, compare scores, and monitor your ranking throughout the season.",
    icon: <LeaderboardIcon sx={{ fontSize: 60, color: "#E85D2A" }} />,
    tips: [
      "View rankings across all leagues",
      "Track your progress over time",
      "See which castaways are scoring the most points",
    ],
  },
  {
    title: "Castaways",
    description: "Browse all competing castaways, view their stats, and see who's been eliminated. Use this to make strategic draft and add/drop decisions.",
    icon: <SportsIcon sx={{ fontSize: 60, color: "#E85D2A" }} />,
    tips: [
      "View detailed castaway profiles",
      "Check elimination status",
      "Plan your add/drop strategy",
      "See point totals for each castaway",
    ],
  },
  {
    title: "Admin Panel (League Owners)",
    description: "If you own a league, you can record eliminations, enter episode scores, and manage league settings from the Admin section.",
    icon: <AdminIcon sx={{ fontSize: 60, color: "#E85D2A" }} />,
    tips: [
      "Record who gets eliminated each episode",
      "Enter individual scoring events",
      "Points update automatically for all members",
      "Manage multiple leagues easily",
    ],
  },
  {
    title: "Notifications",
    description: "Stay updated with the notification bell in the top right. Get alerts for mentions, reactions, and league updates.",
    icon: <NotificationIcon sx={{ fontSize: 60, color: "#E85D2A" }} />,
    tips: [
      "The bell shakes when you have unread notifications",
      "Click to view all notifications",
      "Mark all as read with one click",
      "Get notified of mentions and reactions",
    ],
  },
  {
    title: "Ready to Play!",
    description: "You're all set! Create or join a league to get started. Remember, you need to draft 5 castaways to begin scoring points.",
    icon: <HomeIcon sx={{ fontSize: 60, color: "#E85D2A" }} />,
    tips: [
      "Create a league or join with a code",
      "Draft your team of 5 castaways",
      "Chat with league members",
      "Have fun and may the best tribe win!",
    ],
  },
];

interface AppTutorialProps {
  userId: string;
  open: boolean;
  onClose: () => void;
}

export default function AppTutorial({ userId, open, onClose }: AppTutorialProps) {
  const [activeStep, setActiveStep] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const currentStep = tutorialSteps[activeStep];
  const isLastStep = activeStep === tutorialSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleComplete = async () => {
    try {
      // Mark tutorial as completed in Firestore
      const userRef = doc(db, "users", userId);
      await setDoc(
        userRef,
        {
          tutorialCompleted: true,
          tutorialCompletedAt: new Date(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error saving tutorial completion:", error);
    }
    onClose();
  };

  const handleSkip = async () => {
    await handleComplete();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          minHeight: isMobile ? "100%" : 500,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: "rgba(232, 93, 42, 0.05)",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography variant="h5" fontWeight="bold" color="#E85D2A">
          App Tutorial
        </Typography>
        <IconButton onClick={handleSkip} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Stepper activeStep={activeStep} alternativeLabel={!isMobile}>
            {tutorialSteps.map((step, index) => (
              <Step key={index}>
                <StepLabel>{!isMobile && step.title}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: "center",
            bgcolor: "background.default",
            borderRadius: 2,
          }}
        >
          <Box sx={{ mb: 3 }}>{currentStep.icon}</Box>

          <Typography variant="h5" fontWeight="bold" gutterBottom>
            {currentStep.title}
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 3, maxWidth: 600, mx: "auto" }}
          >
            {currentStep.description}
          </Typography>

          {currentStep.tips && currentStep.tips.length > 0 && (
            <Box
              sx={{
                textAlign: "left",
                maxWidth: 500,
                mx: "auto",
                bgcolor: "background.paper",
                p: 2,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                💡 Quick Tips:
              </Typography>
              {currentStep.tips.map((tip, index) => (
                <Typography
                  key={index}
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 0.5, pl: 2 }}
                >
                  • {tip}
                </Typography>
              ))}
            </Box>
          )}

          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ display: "block", mt: 3 }}
          >
            Step {activeStep + 1} of {tutorialSteps.length}
          </Typography>
        </Paper>
      </DialogContent>

      <DialogActions
        sx={{
          justifyContent: "space-between",
          px: 3,
          py: 2,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Button onClick={handleSkip} color="inherit">
          Skip Tutorial
        </Button>

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0}
            startIcon={<BackIcon />}
            variant="outlined"
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            variant="contained"
            endIcon={isLastStep ? null : <NextIcon />}
            sx={{
              bgcolor: "#E85D2A",
              "&:hover": {
                bgcolor: "#D94E23",
              },
            }}
          >
            {isLastStep ? "Get Started!" : "Next"}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
