"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Drawer,
  Fab,
  IconButton,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme as useMuiTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ForumIcon from "@mui/icons-material/Forum";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useUserLeagues } from "@/hooks/useLeagues";
import NotificationBell from "@/components/NotificationBell";
import PWAInstallButton from "@/components/PWAInstallButton";
import MessageBoard from "@/components/MessageBoard";
import SeasonRecapModal from "@/components/SeasonRecapModal";
import { useSeasonRecap } from "@/hooks/useSeasonRecap";
import SeasonRuleProposalModal from "@/components/SeasonRuleProposalModal";
import { useS51RuleProposal } from "@/hooks/useS51RuleProposal";
import Sidebar from "@/components/shell/Sidebar";
import TopNav from "@/components/shell/TopNav";
import MobileTabBar from "@/components/shell/MobileTabBar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [messageDrawerOpen, setMessageDrawerOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const [proposalOpen, setProposalOpen] = useState(false);
  const router = useRouter();
  const { user, isDemoMode, exitDemoMode } = useAuth();
  const { layout } = useTheme();
  const muiTheme = useMuiTheme();
  const belowMd = useMediaQuery(muiTheme.breakpoints.down("md"));

  // Sidebar at md+ when chosen; topnav forced below md regardless of preference.
  const effectiveLayout: "sidebar" | "topnav" =
    belowMd ? "topnav" : layout;

  const { data: userLeagues = [] } = useUserLeagues(user?.uid || null);
  const activeLeague = userLeagues[0] || null;
  const currentMember = activeLeague?.memberDetails?.find(
    (m) => m.userId === user?.uid,
  );

  // Season recap: auto-open once per concluded league per user.
  const { recap, shouldAutoOpen, markSeen } = useSeasonRecap(activeLeague);
  useEffect(() => {
    if (shouldAutoOpen) setRecapOpen(true);
  }, [shouldAutoOpen]);
  const handleRecapClose = () => {
    setRecapOpen(false);
    markSeen();
  };

  // S51 rule proposal: auto-open once per user, deferred while the recap is up.
  const proposal = useS51RuleProposal(activeLeague);
  useEffect(() => {
    if (recapOpen || shouldAutoOpen) return;
    if (proposal.shouldAutoOpen) setProposalOpen(true);
  }, [recapOpen, shouldAutoOpen, proposal.shouldAutoOpen]);
  const handleProposalClose = () => {
    setProposalOpen(false);
    proposal.markSeen();
  };

  return (
    <div className="sfl-app" data-layout={effectiveLayout}>
      {/* Skip to main content (a11y) */}
      <Box
        component="a"
        href="#main-content"
        sx={{
          position: "absolute",
          left: -9999,
          top: "auto",
          width: 1,
          height: 1,
          overflow: "hidden",
          zIndex: 9999,
          "&:focus": {
            position: "fixed",
            top: 8,
            left: 8,
            width: "auto",
            height: "auto",
            overflow: "visible",
            bgcolor: "var(--ink)",
            color: "var(--bg)",
            px: 2,
            py: 1,
            borderRadius: 1,
            fontSize: "0.875rem",
            fontWeight: 600,
            textDecoration: "none",
            boxShadow: 3,
          },
        }}
      >
        Skip to main content
      </Box>

      {/* Fixed notification bell, top-right */}
      {user && (
        <Box
          sx={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 1400,
          }}
        >
          <NotificationBell userId={user.uid} />
        </Box>
      )}

      {/* PWA install button — global */}
      <PWAInstallButton />

      {/* Shell — sidebar or topnav (slim top bar on mobile + bottom tab bar) */}
      {effectiveLayout === "sidebar" ? <Sidebar /> : <TopNav />}
      {belowMd && user && <MobileTabBar />}

      {/* Main content */}
      <main id="main-content" className="sfl-main">
        {isDemoMode && (
          <Box
            sx={{
              bgcolor: "var(--flame)",
              color: "white",
              py: 0.75,
              px: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              textAlign: "center",
              gap: 1,
              fontSize: "0.85rem",
              fontWeight: 500,
              borderRadius: "var(--r-md)",
            }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 16 }} />
            You are viewing a demo. Changes won&apos;t be saved.
            <Button
              size="small"
              onClick={() => {
                exitDemoMode();
                router.push("/");
              }}
              sx={{
                color: "white",
                fontWeight: 700,
                ml: 1,
                textTransform: "none",
                py: 0,
                minHeight: 0,
                fontSize: "0.85rem",
                textDecoration: "underline",
              }}
            >
              Exit Demo
            </Button>
          </Box>
        )}
        {children}
      </main>

      {/* Season recap modal — auto-opens once per concluded league per user */}
      {activeLeague && (
        <SeasonRecapModal
          open={recapOpen}
          league={activeLeague}
          recap={recap}
          onClose={handleRecapClose}
        />
      )}

      {/* S51 rule proposal modal — auto-opens once per user; defers behind recap */}
      {activeLeague && proposal.proposalRelevant && (
        <SeasonRuleProposalModal
          open={proposalOpen}
          league={activeLeague}
          backtest={proposal.backtest}
          sourceSeasonNumber={proposal.sourceSeasonNumber ?? 50}
          targetSeasonNumber={proposal.targetSeasonNumber}
          onClose={handleProposalClose}
        />
      )}

      {/* Global message board drawer */}
      {user && activeLeague && (
        <>
          {!belowMd && !messageDrawerOpen && (
            <Button
              variant="contained"
              startIcon={<ForumIcon />}
              onClick={() => setMessageDrawerOpen(true)}
              aria-label="Open message board"
              sx={{
                position: "fixed",
                bottom: 24,
                left: 24,
                zIndex: 1200,
                bgcolor: "var(--flame)",
                "&:hover": { bgcolor: "var(--flame-deep)" },
                borderRadius: 6,
                px: 3,
                py: 1.25,
                boxShadow: 4,
                textTransform: "none",
                fontWeight: 600,
                color: "white",
              }}
            >
              Message Board
            </Button>
          )}

          {belowMd && !messageDrawerOpen && (
            <Fab
              color="primary"
              aria-label="Open message board"
              onClick={() => setMessageDrawerOpen(true)}
              sx={{
                position: "fixed",
                // Sits above the fixed bottom tab bar on mobile.
                bottom: "calc(72px + env(safe-area-inset-bottom))",
                left: 20,
                bgcolor: "var(--flame)",
                "&:hover": { bgcolor: "var(--flame-deep)" },
                zIndex: 1200,
              }}
            >
              <ForumIcon />
            </Fab>
          )}

          <Drawer
            anchor={belowMd ? "bottom" : "right"}
            open={messageDrawerOpen}
            onClose={() => setMessageDrawerOpen(false)}
            variant="temporary"
            aria-label="League message board"
            ModalProps={{ keepMounted: true }}
            PaperProps={{
              sx: belowMd
                ? {
                    height: "85vh",
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                  }
                : {
                    width: { md: 420, lg: 480 },
                    maxWidth: "100vw",
                  },
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 2,
                  py: 1.5,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  bgcolor: "color-mix(in oklch, var(--flame) 6%, var(--bg-paper))",
                  ...(belowMd && {
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                  }),
                }}
              >
                {belowMd && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 8,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 36,
                      height: 4,
                      borderRadius: 2,
                      bgcolor: "divider",
                    }}
                  />
                )}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <ForumIcon sx={{ color: "var(--flame)", fontSize: 20 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {activeLeague.name} Chat
                  </Typography>
                </Box>
                <IconButton
                  onClick={() => setMessageDrawerOpen(false)}
                  size="small"
                  aria-label="Close message board"
                >
                  <CloseIcon />
                </IconButton>
              </Box>

              <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
                <MessageBoard
                  league={activeLeague}
                  currentUserId={user.uid}
                  currentUserName={
                    currentMember?.displayName || user.displayName || user.email || "Anonymous"
                  }
                  currentUserAvatar={currentMember?.avatar}
                />
              </Box>
            </Box>
          </Drawer>
        </>
      )}
    </div>
  );
}
