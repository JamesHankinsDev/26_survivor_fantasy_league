"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Drawer,
  Fab,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  AppBar,
  Toolbar,
  Typography,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import { useTheme as useMuiTheme } from "@mui/material/styles";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import HomeIcon from "@mui/icons-material/Home";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import InfoIcon from "@mui/icons-material/Info";
import SportsBaseballIcon from "@mui/icons-material/SportsBaseball";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import LogoutIcon from "@mui/icons-material/Logout";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import ForumIcon from "@mui/icons-material/Forum";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { authLogger } from "@/lib/logger";
import { useUserLeagues } from "@/hooks/useLeagues";
import NotificationBell from "@/components/NotificationBell";
import PWAInstallButton from "@/components/PWAInstallButton";
import MessageBoard from "@/components/MessageBoard";
import LeagueSwitcher from "@/components/LeagueSwitcher";

const DRAWER_WIDTH = 280;

// Base navigation items (always shown)
const baseNavItems = [
  { label: "Home", icon: HomeIcon, path: "/dashboard" },
  {
    label: "Leaderboard",
    icon: LeaderboardIcon,
    path: "/dashboard/leaderboard",
  },
  {
    label: "Castaways",
    icon: SportsBaseballIcon,
    path: "/dashboard/castaways",
  },
];

// Admin nav item (only shown to league owners)
const adminNavItem = {
  label: "Admin",
  icon: AdminPanelSettingsIcon,
  path: "/dashboard/admin",
};

// About nav item (always shown)
const aboutNavItem = {
  label: "About",
  icon: InfoIcon,
  path: "/dashboard/about",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [messageDrawerOpen, setMessageDrawerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user, isDemoMode, exitDemoMode } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));

  // Fetch the user's first active league for the global message board
  const { data: userLeagues = [] } = useUserLeagues(user?.uid || null);
  const activeLeague = userLeagues[0] || null;
  const currentMember = activeLeague?.memberDetails?.find(
    (m) => m.userId === user?.uid,
  );

  // Build navigation items - Admin is now available to all users
  const navItems = [...baseNavItems, adminNavItem, aboutNavItem];

  const handleToggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleNavClick = (path: string) => {
    router.push(path);
    setDrawerOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (error) {
      authLogger.error("Logout failed:", error);
    }
  };

  const drawerContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: "rgba(232, 93, 42, 0.1)",
          borderBottom: "1px solid #E85D2A",
        }}
      >
        <Typography variant="h6" sx={{ color: "#E85D2A", fontWeight: 700 }}>
          Survivor League
        </Typography>
        <LeagueSwitcher onNavigate={() => setDrawerOpen(false)} />
      </Box>

      {/* Navigation Items */}
      <List sx={{ flex: 1, py: 2 }}>
        {navItems.map((item) => {
          const isHome = item.path === "/dashboard";
          const isSelected = isHome
            ? pathname === "/dashboard" ||
              pathname?.startsWith("/dashboard/my-leagues") === true
            : pathname === item.path;
          return (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              onClick={() => handleNavClick(item.path)}
              selected={isSelected}
              sx={{
                "&.Mui-selected": {
                  backgroundColor: "rgba(232, 93, 42, 0.12)",
                  borderLeft: "4px solid #E85D2A",
                  pl: 1.75,
                  "&:hover": {
                    backgroundColor: "rgba(232, 93, 42, 0.16)",
                  },
                },
                "&:hover": {
                  backgroundColor: "rgba(232, 93, 42, 0.08)",
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: isSelected ? "#E85D2A" : "inherit",
                  minWidth: 40,
                }}
              >
                <item.icon />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                sx={{
                  "& .MuiTypography-root": {
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? "#E85D2A" : "inherit",
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
          );
        })}
      </List>

      <Divider />

      {/* User Info */}
      <Box sx={{ p: 2 }}>
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", display: "block", mb: 1 }}
        >
          Signed in as:
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            mb: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {user?.displayName || user?.email}
        </Typography>

        {/* Theme Toggle Button */}
        <Box sx={{ mb: 2 }}>
          <Tooltip title="Toggle light/dark mode">
            <IconButton
              onClick={toggleTheme}
              aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
              sx={{
                width: "100%",
                color: "text.primary",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                "&:hover": {
                  backgroundColor: "action.hover",
                },
              }}
            >
              {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
              <Typography variant="body2" sx={{ ml: 1 }}>
                {mode === "dark" ? "Light Mode" : "Dark Mode"}
              </Typography>
            </IconButton>
          </Tooltip>
        </Box>

        {/* Logout Button */}
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              color: "#E85D2A",
              "&:hover": {
                backgroundColor: "rgba(232, 93, 42, 0.08)",
              },
            }}
          >
            <ListItemIcon sx={{ color: "#E85D2A", minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Sign Out" />
          </ListItemButton>
        </ListItem>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Skip to main content link for keyboard/screen reader users */}
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
            bgcolor: "#E85D2A",
            color: "white",
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

      {/* Fixed Notification Bell in Top Right */}
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

      {/* Mobile AppBar */}
      <AppBar
        sx={{
          display: { xs: "flex", md: "none" },
          bgcolor: "background.paper",
          color: "text.primary",
          boxShadow: 1,
          zIndex: 1300,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label={drawerOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={handleToggleDrawer}
            edge="start"
            sx={{ mr: 2 }}
          >
            {drawerOpen ? <CloseIcon /> : <MenuIcon />}
          </IconButton>
          <Typography
            variant="h6"
            sx={{ color: "#E85D2A", fontWeight: 700, flex: 1 }}
          >
            Survivor League
          </Typography>
          <Tooltip title="Toggle light/dark mode">
            <IconButton
              onClick={toggleTheme}
              aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}
              sx={{ color: "text.primary" }}
            >
              {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* PWA Install Button - shown globally */}
      <PWAInstallButton />

      {/* Sidebar Drawer */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={handleToggleDrawer}
        aria-label="Navigation menu"
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop Sidebar */}
      <Box
        component="nav"
        aria-label="Main navigation"
        sx={{
          display: { xs: "none", md: "block" },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          borderRight: "1px solid #E85D2A",
        }}
      >
        <Box sx={{ width: DRAWER_WIDTH, overflow: "auto" }}>
          {drawerContent}
        </Box>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        id="main-content"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          mt: { xs: 7, md: 0 },
        }}
      >
        {isDemoMode && (
          <Box
            sx={{
              bgcolor: "#E85D2A",
              color: "white",
              py: 0.75,
              px: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              fontSize: "0.85rem",
              fontWeight: 500,
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
      </Box>

      {/* Global Message Board Drawer */}
      {user && activeLeague && (
        <>
          {/* Desktop: Fixed button in bottom-left */}
          {!isMobile && !messageDrawerOpen && (
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
                bgcolor: "#E85D2A",
                "&:hover": { bgcolor: "#d14d1a" },
                borderRadius: 6,
                px: 3,
                py: 1.25,
                boxShadow: 4,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Message Board
            </Button>
          )}

          {/* Mobile: FAB in bottom-left */}
          {isMobile && !messageDrawerOpen && (
            <Fab
              color="primary"
              aria-label="Open message board"
              onClick={() => setMessageDrawerOpen(true)}
              sx={{
                position: "fixed",
                bottom: 24,
                left: 24,
                bgcolor: "#E85D2A",
                "&:hover": { bgcolor: "#d14d1a" },
                zIndex: 1200,
              }}
            >
              <ForumIcon />
            </Fab>
          )}

          <Drawer
            anchor={isMobile ? "bottom" : "right"}
            open={messageDrawerOpen}
            onClose={() => setMessageDrawerOpen(false)}
            variant="temporary"
            aria-label="League message board"
            ModalProps={{ keepMounted: true }}
            PaperProps={{
              sx: isMobile
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
              {/* Drawer Header */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 2,
                  py: 1.5,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  bgcolor: "rgba(232, 93, 42, 0.05)",
                  ...(isMobile && {
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                  }),
                }}
              >
                {isMobile && (
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
                  <ForumIcon sx={{ color: "#E85D2A", fontSize: 20 }} />
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

              {/* Drawer Body */}
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
    </Box>
  );
}
