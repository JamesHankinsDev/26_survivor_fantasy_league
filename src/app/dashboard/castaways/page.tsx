"use client";

import { Container, Box, Typography } from "@mui/material";
import CASTAWAYS from "@/data/castaways";
import CastawayCard from "@/components/CastawayCard";

export default function CastawaysPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Castaways — Survivor Season 50
      </Typography>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "repeat(1, minmax(0, 1fr))",
            sm: "repeat(2, minmax(0, 1fr))",
            md: "repeat(3, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
        }}
      >
        {CASTAWAYS.map((c) => (
          <Box key={c.id} sx={{ width: "100%" }}>
            <CastawayCard castaway={c} />
          </Box>
        ))}
      </Box>
    </Container>
  );
}
