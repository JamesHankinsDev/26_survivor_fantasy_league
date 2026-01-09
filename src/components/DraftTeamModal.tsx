"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Castaway } from "@/types/castaway";

interface DraftTeamModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (selectedCastawayIds: string[]) => Promise<void>;
  allCastaways: Castaway[];
  eliminatedCastawayIds: string[];
}

const DRAFT_SIZE = 5;

export const DraftTeamModal: React.FC<DraftTeamModalProps> = ({
  open,
  onClose,
  onSubmit,
  allCastaways,
  eliminatedCastawayIds,
}) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const eliminatedSet = new Set(eliminatedCastawayIds);
  const availableCastaways = allCastaways.filter(
    (c) => !eliminatedSet.has(c.id)
  );

  const toggleCastaway = (castawayId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(castawayId)) {
      newSelected.delete(castawayId);
    } else {
      if (newSelected.size < DRAFT_SIZE) {
        newSelected.add(castawayId);
      }
    }
    setSelected(newSelected);
  };

  const handleSubmit = async () => {
    if (selected.size !== DRAFT_SIZE) {
      setError(`You must select exactly ${DRAFT_SIZE} castaways`);
      return;
    }

    setError("");
    setLoading(true);

    try {
      await onSubmit(Array.from(selected));
      setSelected(new Set());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit draft");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelected(new Set());
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Draft Your Team ({selected.size}/{DRAFT_SIZE})
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Typography variant="body2" sx={{ mb: 3, color: "#666" }}>
            Select exactly {DRAFT_SIZE} castaways to form your initial team. You
            can make 1 add/drop change per week after the draft is complete.
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
              gap: 2,
            }}
          >
            {availableCastaways.map((castaway) => {
              const isSelected = selected.has(castaway.id);
              return (
                <Card
                  key={castaway.id}
                  onClick={() => toggleCastaway(castaway.id)}
                  sx={{
                    cursor: "pointer",
                    height: "100%",
                    border: isSelected
                      ? "3px solid #1976d2"
                      : "2px solid transparent",
                    backgroundColor: isSelected ? "#e3f2fd" : "transparent",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      boxShadow: 3,
                      borderColor: "#1976d2",
                    },
                    position: "relative",
                  }}
                >
                  {castaway.image && (
                    <CardMedia
                      component="img"
                      height="200"
                      image={castaway.image}
                      alt={castaway.name}
                      sx={{ objectFit: "cover" }}
                    />
                  )}
                  <CardContent sx={{ p: 1.5 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 1,
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.9rem",
                          flex: 1,
                        }}
                      >
                        {castaway.name}
                      </Typography>
                      {isSelected && (
                        <CheckCircleIcon
                          sx={{
                            color: "#1976d2",
                            fontSize: "1.3rem",
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          {selected.size > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: "bold", mb: 1 }}
              >
                Selected Castaways ({selected.size}/{DRAFT_SIZE}):
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {Array.from(selected).map((castawayId) => {
                  const castaway = availableCastaways.find(
                    (c) => c.id === castawayId
                  );
                  return (
                    <Chip
                      key={castawayId}
                      label={castaway?.name}
                      onDelete={() => toggleCastaway(castawayId)}
                      color="primary"
                      variant="outlined"
                    />
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || selected.size !== DRAFT_SIZE}
        >
          {loading ? <CircularProgress size={24} /> : "Submit Draft"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
