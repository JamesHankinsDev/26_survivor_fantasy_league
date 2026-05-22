"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import RestoreIcon from "@mui/icons-material/Restore";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Season,
  SeasonOverride,
  getSeasonStatus,
} from "@/data/seasons";
import {
  useSaveSeasonOverride,
  useSeasonsWithOverrides,
} from "@/hooks/useSeasonsWithOverrides";

type DraftField = "name" | "theme" | "premiereDate" | "mergeWeek";

interface DraftMap {
  [seasonNumber: number]: Partial<Record<DraftField, string>>;
}

export default function AdminSeasonsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { seasons, overrides, isLoading } = useSeasonsWithOverrides();
  const saveOverride = useSaveSeasonOverride();

  const [drafts, setDrafts] = useState<DraftMap>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirm, setConfirm] = useState<
    | null
    | {
        type: "launch" | "conclude" | "reset";
        seasonNumber: number;
        seasonName: string;
      }
  >(null);

  useEffect(() => {
    if (!user) router.push("/");
  }, [user, router]);

  const setDraft = (n: number, field: DraftField, value: string) =>
    setDrafts((prev) => ({
      ...prev,
      [n]: { ...prev[n], [field]: value },
    }));

  const getValue = (season: Season, field: DraftField): string => {
    const draft = drafts[season.number]?.[field];
    if (draft !== undefined) return draft;
    if (field === "mergeWeek") return season.mergeWeek != null ? String(season.mergeWeek) : "";
    return String(season[field] ?? "");
  };

  const hasUnsavedEdits = useMemo(() => {
    return (seasonNumber: number, season: Season) => {
      const d = drafts[seasonNumber];
      if (!d) return false;
      for (const key of Object.keys(d) as DraftField[]) {
        const draftValue = d[key];
        const currentValue =
          key === "mergeWeek"
            ? season.mergeWeek != null
              ? String(season.mergeWeek)
              : ""
            : String(season[key] ?? "");
        if (draftValue !== currentValue) return true;
      }
      return false;
    };
  }, [drafts]);

  const handleSave = async (season: Season) => {
    const d = drafts[season.number];
    if (!d) return;

    setError("");
    setSuccess("");

    const override: SeasonOverride = {};
    if (d.name !== undefined && d.name.trim().length > 0) override.name = d.name.trim();
    if (d.theme !== undefined) override.theme = d.theme;
    if (d.premiereDate !== undefined && d.premiereDate.length > 0)
      override.premiereDate = d.premiereDate;
    if (d.mergeWeek !== undefined) {
      const trimmed = d.mergeWeek.trim();
      if (trimmed === "") override.mergeWeek = null;
      else {
        const parsed = parseInt(trimmed, 10);
        if (Number.isNaN(parsed) || parsed < 1 || parsed > 20) {
          setError(`Merge week must be a number between 1 and 20.`);
          return;
        }
        override.mergeWeek = parsed;
      }
    }

    try {
      await saveOverride.mutateAsync({ seasonNumber: season.number, override });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[season.number];
        return next;
      });
      setSuccess(`Saved updates to ${season.name}.`);
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    }
  };

  const handleLifecycleAction = async () => {
    if (!confirm) return;
    const { type, seasonNumber, seasonName } = confirm;
    setError("");
    setSuccess("");

    try {
      if (type === "launch") {
        await saveOverride.mutateAsync({
          seasonNumber,
          override: { isActive: true, concludedAt: null },
        });
        setSuccess(`${seasonName} is now active.`);
      } else if (type === "conclude") {
        const today = new Date().toISOString().slice(0, 10);
        await saveOverride.mutateAsync({
          seasonNumber,
          override: { isActive: false, concludedAt: today },
        });
        setSuccess(`${seasonName} marked as concluded.`);
      } else if (type === "reset") {
        // Clear the override doc by writing all fields to their "unset" values
        // — null nullable fields, omit string fields (we can't truly delete a
        // doc from here without admin SDK, so we set isActive back to undefined
        // by writing a tombstone document with merge=false isn't trivial;
        // instead set the lifecycle fields explicitly to match the static.)
        await saveOverride.mutateAsync({
          seasonNumber,
          override: { isActive: false, concludedAt: null },
        });
        setSuccess(`${seasonName} reset to static defaults.`);
      }
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update lifecycle.");
    } finally {
      setConfirm(null);
    }
  };

  if (!user) return null;
  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress sx={{ color: "#E85D2A" }} />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Admin: Seasons
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
        Edit any season's displayed metadata or flip its lifecycle. Changes save
        immediately and are visible to every member.
      </Typography>

      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack spacing={3}>
        {seasons.map((season) => {
          const status = getSeasonStatus(season);
          const dirty = hasUnsavedEdits(season.number, season);
          const hasOverride = Boolean(overrides[season.number]);

          return (
            <Paper key={season.number} sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap">
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {season.name}
                </Typography>
                <StatusChip status={status} />
                {hasOverride && (
                  <Chip
                    label="Override active"
                    size="small"
                    sx={{ bgcolor: "rgba(232, 93, 42, 0.12)", color: "#E85D2A", fontWeight: 600 }}
                  />
                )}
              </Stack>

              <Stack spacing={2}>
                <TextField
                  label="Name"
                  fullWidth
                  size="small"
                  value={getValue(season, "name")}
                  onChange={(e) => setDraft(season.number, "name", e.target.value)}
                />
                <TextField
                  label="Theme"
                  fullWidth
                  size="small"
                  value={getValue(season, "theme")}
                  onChange={(e) => setDraft(season.number, "theme", e.target.value)}
                />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Premiere Date"
                    type="date"
                    size="small"
                    value={getValue(season, "premiereDate")}
                    onChange={(e) => setDraft(season.number, "premiereDate", e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Merge Week"
                    type="number"
                    size="small"
                    placeholder="e.g. 7"
                    value={getValue(season, "mergeWeek")}
                    onChange={(e) => setDraft(season.number, "mergeWeek", e.target.value)}
                    inputProps={{ min: 1, max: 20 }}
                    sx={{ flex: 1 }}
                    helperText="Used by the season recap. Leave blank to clear."
                  />
                </Stack>
              </Stack>

              <Divider sx={{ my: 2.5 }} />

              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Button
                  variant="contained"
                  disabled={!dirty || saveOverride.isPending}
                  onClick={() => handleSave(season)}
                  sx={{ bgcolor: "#E85D2A", "&:hover": { bgcolor: "#D94E23" } }}
                >
                  {saveOverride.isPending ? <CircularProgress size={20} /> : "Save Edits"}
                </Button>

                {status !== "current" && (
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<RocketLaunchIcon />}
                    onClick={() =>
                      setConfirm({
                        type: "launch",
                        seasonNumber: season.number,
                        seasonName: season.name,
                      })
                    }
                  >
                    Launch Season
                  </Button>
                )}

                {status !== "past" && (
                  <Button
                    variant="outlined"
                    color="warning"
                    startIcon={<EmojiEventsIcon />}
                    onClick={() =>
                      setConfirm({
                        type: "conclude",
                        seasonNumber: season.number,
                        seasonName: season.name,
                      })
                    }
                  >
                    Mark Concluded
                  </Button>
                )}

                {hasOverride && (
                  <Button
                    variant="text"
                    color="inherit"
                    startIcon={<RestoreIcon />}
                    onClick={() =>
                      setConfirm({
                        type: "reset",
                        seasonNumber: season.number,
                        seasonName: season.name,
                      })
                    }
                  >
                    Reset Lifecycle
                  </Button>
                )}
              </Stack>
            </Paper>
          );
        })}
      </Stack>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)}>
        <DialogTitle>
          {confirm?.type === "launch"
            ? `Launch ${confirm?.seasonName}?`
            : confirm?.type === "conclude"
              ? `Mark ${confirm?.seasonName} as concluded?`
              : `Reset ${confirm?.seasonName} lifecycle?`}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {confirm?.type === "launch" && (
              <>
                This will make <strong>{confirm.seasonName}</strong> the active season.
                New leagues will stamp this season. The Home page, leaderboard,
                and cron lock job will all begin treating it as in-play.
              </>
            )}
            {confirm?.type === "conclude" && (
              <>
                This will deactivate <strong>{confirm.seasonName}</strong> and mark
                it concluded as of today. League pages will flip to read-only and
                the season recap will start showing to members on next sign-in.
              </>
            )}
            {confirm?.type === "reset" && (
              <>
                Clears the lifecycle override for <strong>{confirm.seasonName}</strong>
                (sets isActive=false, concludedAt=null). Edited metadata fields
                like name/theme are preserved.
              </>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirm(null)}>Cancel</Button>
          <Button
            onClick={handleLifecycleAction}
            variant="contained"
            color={
              confirm?.type === "launch"
                ? "success"
                : confirm?.type === "conclude"
                  ? "warning"
                  : "inherit"
            }
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

const StatusChip = ({ status }: { status: ReturnType<typeof getSeasonStatus> }) => {
  if (status === "current")
    return (
      <Chip
        label="Active"
        size="small"
        sx={{ bgcolor: "#20B2AA", color: "white", fontWeight: 700 }}
      />
    );
  if (status === "past")
    return (
      <Chip
        label="Concluded"
        size="small"
        sx={{ bgcolor: "#888", color: "white", fontWeight: 700 }}
      />
    );
  return (
    <Chip
      label="Upcoming"
      size="small"
      sx={{ bgcolor: "#5C6BC0", color: "white", fontWeight: 700 }}
    />
  );
};
