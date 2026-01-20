"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Drawer,
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
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import HomeIcon from "@mui/icons-material/Home";
import GroupIcon from "@mui/icons-material/Group";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import InfoIcon from "@mui/icons-material/Info";
import SportsBaseballIcon from "@mui/icons-material/SportsBaseball";
import LeaderboardIcon from "@mui/icons-material/Leaderboard";
import LogoutIcon from "@mui/icons-material/Logout";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import NotificationBell from "@/components/NotificationBell";

const DRAWER_WIDTH = 280;

// Base navigation items (always shown)
const baseNavItems = [
  { label: "Home", icon: HomeIcon, path: "/dashboard" },
  { label: "My Leagues", icon: GroupIcon, path: "/dashboard/my-leagues" },
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
  const router = useRouter();
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { mode, toggleTheme } = useTheme();

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
      console.error("Logout error:", error);
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
      </Box>

      {/* Navigation Items */}
      <List sx={{ flex: 1, py: 2 }}>
        {navItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              onClick={() => handleNavClick(item.path)}
              selected={pathname === item.path}
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
                  color: pathname === item.path ? "#E85D2A" : "inherit",
                  minWidth: 40,
                }}
              >
                <item.icon />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                sx={{
                  "& .MuiTypography-root": {
                    fontWeight: pathname === item.path ? 600 : 400,
                    color: pathname === item.path ? "#E85D2A" : "inherit",
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
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
            aria-label="toggle drawer"
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
            <IconButton onClick={toggleTheme} sx={{ color: "text.primary" }}>
              {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={handleToggleDrawer}
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
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          mt: { xs: 7, md: 0 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
