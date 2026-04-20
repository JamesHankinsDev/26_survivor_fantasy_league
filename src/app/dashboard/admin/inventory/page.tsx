"use client";

import { useState } from "react";
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { CURRENT_SEASON } from "@/data/seasons";
import { useSeasonCastaways } from "@/hooks/useCastaways";
import { setCastawayInventoryItem } from "@/utils/scoring";
import { dbLogger } from "@/lib/logger";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-client";
import { INVENTORY_ITEMS } from "@/utils/inventoryConfig";
import { getInventory, InventoryItem } from "@/types/castaway";

export default function AdminInventoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: castaways = [], isLoading } = useSeasonCastaways(
    CURRENT_SEASON.number,
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleAdjust = async (
    castawayId: string,
    item: InventoryItem,
    nextCount: number,
  ) => {
    const key = `${castawayId}:${item}`;
    setSavingKey(key);
    setError("");
    setSuccess("");
    try {
      await setCastawayInventoryItem(
        CURRENT_SEASON.number,
        castawayId,
        item,
        nextCount,
      );
      await queryClient.invalidateQueries({
        queryKey: queryKeys.castaways.season(CURRENT_SEASON.number),
      });
      setSuccess("Inventory updated.");
      setTimeout(() => setSuccess(""), 1500);
    } catch (err) {
      dbLogger.error("Error updating inventory:", err);
      setError(err instanceof Error ? err.message : "Failed to update inventory.");
    } finally {
      setSavingKey(null);
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!user) {
    router.push("/");
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>
        Manage {CURRENT_SEASON.name} Inventory
      </Typography>
      <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
        Track idols and advantages per castaway. Changes save immediately and are
        visible to all leagues.
      </Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Legend */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          mb: 3,
          p: 1.5,
          bgcolor: "rgba(0,0,0,0.02)",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
        }}
      >
        {INVENTORY_ITEMS.map(({ key, label, Icon, accent }) => (
          <Box
            key={key}
            sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
          >
            <Icon sx={{ fontSize: 18, color: accent }} />
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              {label}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
          },
          gap: 2,
          mb: 4,
        }}
      >
        {castaways.map((castaway) => {
          const inv = getInventory(castaway);
          return (
            <Card
              key={castaway.id}
              sx={{
                opacity: castaway.eliminated ? 0.65 : 1,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 2,
                  py: 1.5,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                {castaway.image && (
                  <Box
                    component="img"
                    src={castaway.image}
                    alt={castaway.name}
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      objectFit: "cover",
                      objectPosition: "top",
                      filter: castaway.eliminated ? "grayscale(100%)" : "none",
                    }}
                  />
                )}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {castaway.name}
                  </Typography>
                  {castaway.eliminated && (
                    <Typography
                      variant="caption"
                      sx={{ color: "#d32f2f", fontWeight: 600 }}
                    >
                      Eliminated
                    </Typography>
                  )}
                </Box>
              </Box>

              <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {INVENTORY_ITEMS.map(({ key, label, Icon, accent, gradient, frame }) => {
                  const count = inv[key];
                  const isSaving = savingKey === `${castaway.id}:${key}`;
                  return (
                    <Box
                      key={key}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Tooltip title={label}>
                        <Box
                          sx={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            background: count > 0 ? gradient : "transparent",
                            border: `2px solid ${count > 0 ? frame : "#ccc"}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Icon
                            sx={{
                              fontSize: 16,
                              color: count > 0 ? "#fff" : "#aaa",
                            }}
                          />
                        </Box>
                      </Tooltip>
                      <Typography
                        sx={{
                          flex: 1,
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          color: count > 0 ? accent : "text.secondary",
                        }}
                      >
                        {label}
                      </Typography>
                      <IconButton
                        size="small"
                        aria-label={`Decrease ${label}`}
                        onClick={() => handleAdjust(castaway.id, key, count - 1)}
                        disabled={count <= 0 || isSaving}
                        sx={{ border: "1px solid", borderColor: "divider" }}
                      >
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <Typography
                        sx={{
                          minWidth: 20,
                          textAlign: "center",
                          fontWeight: 700,
                          fontSize: "0.95rem",
                        }}
                      >
                        {isSaving ? "…" : count}
                      </Typography>
                      <IconButton
                        size="small"
                        aria-label={`Increase ${label}`}
                        onClick={() => handleAdjust(castaway.id, key, count + 1)}
                        disabled={isSaving}
                        sx={{ border: "1px solid", borderColor: "divider" }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </Box>

      <Button variant="outlined" onClick={() => router.back()}>
        Back
      </Button>
    </Container>
  );
}
