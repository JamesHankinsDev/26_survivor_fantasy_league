"use client";

import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import {
  NOTIFY_SCHEDULE_OPTIONS,
  type NotifySchedule,
  describeSendAfter,
  resolveSendAfter,
} from "@/utils/notifySchedule";

export interface NotifySchedulePickerProps {
  schedule: NotifySchedule;
  onScheduleChange: (schedule: NotifySchedule) => void;
  /** `datetime-local` value, only meaningful while schedule === "custom". */
  customValue: string;
  onCustomValueChange: (value: string) => void;
  /** Overrides the default "Push notification" label. */
  label?: string;
  disabled?: boolean;
}

/**
 * Admin control for when a push is released.
 *
 * Defaults to holding until after the West Coast airing, because the common
 * case — entering scores while the episode is still on — is exactly the case
 * where an immediate push spoils it for half the league.
 */
export default function NotifySchedulePicker({
  schedule,
  onScheduleChange,
  customValue,
  onCustomValueChange,
  label = "Push notification",
  disabled = false,
}: NotifySchedulePickerProps) {
  const resolved = resolveSendAfter(schedule, customValue);
  const selected = NOTIFY_SCHEDULE_OPTIONS.find((o) => o.value === schedule);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <FormControl size="small" fullWidth disabled={disabled}>
        <InputLabel id="notify-schedule-label">{label}</InputLabel>
        <Select
          labelId="notify-schedule-label"
          label={label}
          value={schedule}
          onChange={(e) => onScheduleChange(e.target.value as NotifySchedule)}
        >
          {NOTIFY_SCHEDULE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {schedule === "custom" && (
        <TextField
          size="small"
          type="datetime-local"
          label="Release at (your local time)"
          value={customValue}
          onChange={(e) => onCustomValueChange(e.target.value)}
          disabled={disabled}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />
      )}

      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {describeSendAfter(resolved)}
        {selected && schedule !== "custom" ? ` ${selected.hint}.` : ""}
      </Typography>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        The in-app notification appears in everyone&apos;s bell right away either
        way — only the phone notification is held.
      </Typography>
    </Box>
  );
}
