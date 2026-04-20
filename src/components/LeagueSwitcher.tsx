"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FormControl,
  Select,
  MenuItem,
  Box,
  Typography,
  Divider,
  ListSubheader,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useUserLeagues } from "@/hooks/useLeagues";
import CreateLeagueDialog from "@/components/CreateLeagueDialog";
import type { League } from "@/types/league";

const STORAGE_KEY = "survivor:lastViewedLeagueId";
const CREATE_VALUE = "__create_league__";

interface LeagueSwitcherProps {
  onNavigate?: () => void;
}

export default function LeagueSwitcher({ onNavigate }: LeagueSwitcherProps) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { data: leagues = [] } = useUserLeagues(user?.uid || null);
  const [createOpen, setCreateOpen] = useState(false);

  const urlLeagueId = useMemo(() => {
    const match = pathname?.match(/\/dashboard\/my-leagues\/([^/]+)/);
    return match ? match[1] : null;
  }, [pathname]);

  const selected = useMemo(() => {
    if (urlLeagueId && leagues.some((l) => l.id === urlLeagueId)) return urlLeagueId;
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && leagues.some((l) => l.id === stored)) return stored;
    }
    if (leagues.length === 1) return leagues[0].id;
    return "";
  }, [urlLeagueId, leagues]);

  useEffect(() => {
    if (urlLeagueId && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, urlLeagueId);
    }
  }, [urlLeagueId]);

  const handleChange = (id: string) => {
    if (!id) return;
    if (id === CREATE_VALUE) {
      setCreateOpen(true);
      return;
    }
    router.push(`/dashboard/my-leagues/${id}`);
    onNavigate?.();
  };

  const handleLeagueCreated = (league: League) => {
    setCreateOpen(false);
    router.push(`/dashboard/my-leagues/${league.id}`);
    onNavigate?.();
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Typography
        variant="caption"
        sx={{
          display: "block",
          fontWeight: 600,
          color: "text.secondary",
          mb: 0.5,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          fontSize: "0.65rem",
        }}
      >
        League
      </Typography>
      <FormControl size="small" fullWidth>
        <Select
          value={selected}
          onChange={(e) => handleChange(e.target.value as string)}
          displayEmpty
          aria-label="Select league"
          renderValue={(value) => {
            if (!value) return <em style={{ opacity: 0.7 }}>Choose a league…</em>;
            const league = leagues.find((l) => l.id === value);
            return league?.name ?? "Unknown league";
          }}
          sx={{
            bgcolor: "background.paper",
            fontWeight: 600,
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "#E85D2A",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#D94E23",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#E85D2A",
              borderWidth: 2,
            },
          }}
        >
          {leagues.length > 0 && (
            <ListSubheader
              sx={{
                fontSize: "0.65rem",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                fontWeight: 700,
                lineHeight: 2,
                color: "text.secondary",
              }}
            >
              Your Leagues
            </ListSubheader>
          )}
          {leagues.map((l) => (
            <MenuItem key={l.id} value={l.id}>
              {l.name}
            </MenuItem>
          ))}
          {leagues.length > 0 && <Divider sx={{ my: 0.5 }} />}
          <MenuItem
            value={CREATE_VALUE}
            sx={{
              color: "#E85D2A",
              fontWeight: 600,
              gap: 1,
              "&:hover": { bgcolor: "rgba(232, 93, 42, 0.08)" },
            }}
          >
            <AddCircleOutlineIcon fontSize="small" />
            Create New League
          </MenuItem>
        </Select>
      </FormControl>

      {user && (
        <CreateLeagueDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onLeagueCreated={handleLeagueCreated}
        />
      )}
    </Box>
  );
}
