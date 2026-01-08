import React from 'react';
import { Card, CardContent, CardMedia, Typography, Box } from '@mui/material';

export interface Castaway {
  id: string;
  name: string;
  image?: string;
  bio?: string;
  stats?: Record<string, any>;
}

export default function CastawayCard({ castaway }: { castaway: Castaway }) {
  return (
    <Box
      sx={{
        perspective: 1000,
        '&:hover .flip-inner': { transform: 'rotateY(180deg)' },
      }}
    >
      <Box
        className="flip-inner"
        sx={{
          position: 'relative',
          width: '100%',
          minHeight: 260,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.6s',
        }}
      >
        {/* Front */}
        <Card
          sx={{
            backfaceVisibility: 'hidden',
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {castaway.image && (
            <CardMedia component="img" height="160" image={castaway.image} alt={castaway.name} />
          )}
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {castaway.name}
            </Typography>
          </CardContent>
        </Card>

        {/* Back */}
        <Card
          sx={{
            backfaceVisibility: 'hidden',
            position: 'absolute',
            inset: 0,
            transform: 'rotateY(180deg)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            p: 2,
          }}
        >
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Stats
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {castaway.bio || 'No stats yet — coming soon.'}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
