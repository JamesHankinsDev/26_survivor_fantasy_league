"use client";

import { useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import EventIcon from "@mui/icons-material/Event";
import { Season } from "@/data/seasons";
import { useSeasonNotifications } from "@/hooks/useSeasonNotifications";
import { formatSeasonDate, daysUntilSeasonDate } from "@/utils/seasonDates";

interface FutureSeasonCardProps {
  season: Season;
}

export default function FutureSeasonCard({ season }: FutureSeasonCardProps) {
  const { isSubscribed, toggle, loaded } = useSeasonNotifications();
  const subscribed = isSubscribed(season.number);

  const days = useMemo(() => daysUntilSeasonDate(season.premiereDate), [season.premiereDate]);
  const premiereLabel = useMemo(
    () => formatSeasonDate(season.premiereDate),
    [season.premiereDate],
  );

  return (
    <Card
      sx={{
        borderLeft: "4px solid #5C6BC0",
        background:
          "linear-gradient(135deg, rgba(92, 107, 192, 0.06) 0%, rgba(92, 107, 192, 0) 60%)",
        height: "100%",
      }}
    >
      <CardContent sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <Typography
          variant="overline"
          sx={{ color: "#5C6BC0", letterSpacing: 2, fontWeight: 700 }}
        >
          Upcoming
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
          {season.name}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          {season.theme}
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <EventIcon sx={{ fontSize: 18, color: "text.secondary" }} />
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Premieres <strong>{premiereLabel}</strong>
          </Typography>
        </Stack>

        <Box
          sx={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 0.75,
            mb: 3,
          }}
        >
          <Typography
            sx={{
              fontSize: "2.25rem",
              fontWeight: 900,
              color: "#5C6BC0",
              lineHeight: 1,
            }}
          >
            {days}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {days === 1 ? "day away" : "days away"}
          </Typography>
        </Box>

        <Box sx={{ mt: "auto" }}>
          <Button
            variant={subscribed ? "contained" : "outlined"}
            size="small"
            disabled={!loaded}
            onClick={() => toggle(season.number)}
            startIcon={
              subscribed ? <NotificationsActiveIcon /> : <NotificationsNoneIcon />
            }
            sx={{
              textTransform: "none",
              fontWeight: 600,
              ...(subscribed
                ? {
                    bgcolor: "#5C6BC0",
                    "&:hover": { bgcolor: "#3F51B5" },
                  }
                : {
                    color: "#5C6BC0",
                    borderColor: "#5C6BC0",
                    "&:hover": {
                      borderColor: "#3F51B5",
                      bgcolor: "rgba(92, 107, 192, 0.08)",
                    },
                  }),
            }}
          >
            {subscribed ? "Notifications On" : "Notify Me"}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
