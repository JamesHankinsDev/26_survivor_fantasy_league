"use client";

import { useState, useEffect } from "react";
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Box,
  Typography,
  Divider,
  ListItemIcon,
  ListItemText,
  Button,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  Campaign as CampaignIcon,
  EmojiEvents as TrophyIcon,
  Message as MessageIcon,
  PersonAdd as PersonAddIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Notification } from "@/types/league";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

// Shake animation keyframes
const shakeAnimation = `
  @keyframes shake {
    0%, 100% { transform: rotate(0deg); }
    10%, 30%, 50%, 70%, 90% { transform: rotate(-10deg); }
    20%, 40%, 60%, 80% { transform: rotate(10deg); }
  }
`;

interface NotificationBellProps {
  userId: string;
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!userId) return;

    const notificationsRef = collection(db, "users", userId, "notifications");
    const q = query(notificationsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = [];
      snapshot.forEach((doc) => {
        notifs.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
        } as Notification);
      });
      setNotifications(notifs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      const notifRef = doc(
        db,
        "users",
        userId,
        "notifications",
        notification.id,
      );
      await updateDoc(notifRef, { read: true });
    }

    router.push(notification.link);
    handleClose();
  };

  const handleMarkAllRead = async () => {
    const batch = writeBatch(db);
    const unreadNotifs = notifications.filter((n) => !n.read);

    unreadNotifs.forEach((notif) => {
      const notifRef = doc(db, "users", userId, "notifications", notif.id);
      batch.update(notifRef, { read: true });
    });

    await batch.commit();
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "score_update":
        return <TrophyIcon fontSize="small" color="primary" />;
      case "mention":
        return <CampaignIcon fontSize="small" color="secondary" />;
      case "new_message":
        return <MessageIcon fontSize="small" color="info" />;
      case "league_invite":
        return <PersonAddIcon fontSize="small" color="success" />;
      case "rank_change":
        return <TrophyIcon fontSize="small" color="warning" />;
      default:
        return <NotificationsIcon fontSize="small" />;
    }
  };

  return (
    <>
      <style>{shakeAnimation}</style>
      <Tooltip title="Notifications">
        <IconButton
          onClick={handleOpen}
          color="inherit"
          sx={{
            bgcolor: "background.paper",
            boxShadow: 3,
            "&:hover": {
              bgcolor: "background.paper",
              boxShadow: 4,
            },
            animation:
              unreadCount > 0 ? "shake 2s ease-in-out infinite" : "none",
          }}
        >
          <Badge badgeContent={unreadCount} color="error">
            {unreadCount > 0 ? (
              <NotificationsIcon />
            ) : (
              <NotificationsNoneIcon />
            )}
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 380,
            maxHeight: 500,
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<CheckCircleIcon />}
              onClick={handleMarkAllRead}
            >
              Mark all read
            </Button>
          )}
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <NotificationsNoneIcon
              sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
            {notifications.map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  py: 1.5,
                  px: 2,
                  backgroundColor: notification.read
                    ? "transparent"
                    : "action.hover",
                  borderLeft: notification.read ? "none" : "3px solid",
                  borderColor: "primary.main",
                  alignItems: "flex-start",
                  whiteSpace: "normal",
                }}
              >
                <ListItemIcon sx={{ mt: 0.5 }}>
                  {getNotificationIcon(notification.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" fontWeight="bold">
                      {notification.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                      >
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {formatDistanceToNow(notification.createdAt, {
                          addSuffix: true,
                        })}
                      </Typography>
                    </>
                  }
                />
              </MenuItem>
            ))}
          </Box>
        )}
      </Menu>
    </>
  );
}
