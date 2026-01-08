'use client';

import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Stack,
  Button,
  Avatar,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { TribeMember, getMemberRank } from '@/types/league';

interface TribeCardProps {
  member: TribeMember;
  rank: number;
  isCurrentUser?: boolean;
  onEdit?: () => void;
  allMembers: TribeMember[];
}

export default function TribeCard({
  member,
  rank,
  isCurrentUser,
  onEdit,
  allMembers,
}: TribeCardProps) {
  const getRankColor = (rankNum: number) => {
    if (rankNum === 1) return '#FFD700'; // Gold
    if (rankNum === 2) return '#C0C0C0'; // Silver
    if (rankNum === 3) return '#CD7F32'; // Bronze
    return '#20B2AA'; // Default aqua
  };

  const getRankLabel = (rankNum: number) => {
    const suffix = rankNum % 10 === 1 && rankNum !== 11 ? 'st' : rankNum % 10 === 2 && rankNum !== 12 ? 'nd' : rankNum % 10 === 3 && rankNum !== 13 ? 'rd' : 'th';
    return `${rankNum}${suffix}`;
  };

  return (
    <Card
      sx={{
        borderLeft: `6px solid ${member.tribeColor}`,
        boxShadow: isCurrentUser ? '0 0 0 3px rgba(232, 93, 42, 0.2)' : 1,
        position: 'relative',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 2,
        },
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          {/* Header with Avatar and Name */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              src={member.avatar}
              alt={member.displayName}
              sx={{
                width: 64,
                height: 64,
                border: `3px solid ${member.tribeColor}`,
                bgcolor: member.tribeColor,
              }}
            />
            <Box sx={{ flex: 1 }}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 0.5 }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {member.displayName}
                </Typography>
                {rank <= 3 && (
                  <EmojiEventsIcon
                    sx={{ color: getRankColor(rank), fontSize: '20px' }}
                  />
                )}
              </Stack>
              {isCurrentUser && (
                <Chip
                  label="Your Tribe"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(232, 93, 42, 0.1)',
                    color: '#E85D2A',
                    fontWeight: 600,
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Rank and Points */}
          <Stack
            direction="row"
            spacing={2}
            sx={{
              p: 1.5,
              bgcolor: 'rgba(32, 178, 170, 0.05)',
              borderRadius: 1,
            }}
          >
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Rank
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: getRankColor(rank),
                  fontWeight: 700,
                }}
              >
                {getRankLabel(rank)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Points
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#E85D2A' }}>
                {member.points}
              </Typography>
            </Box>
          </Stack>

          {/* Actions */}
          {isCurrentUser && onEdit && (
            <Button
              onClick={onEdit}
              variant="outlined"
              size="small"
              fullWidth
              sx={{
                color: '#E85D2A',
                borderColor: '#E85D2A',
                '&:hover': {
                  bgcolor: 'rgba(232, 93, 42, 0.05)',
                  borderColor: '#D94E23',
                },
              }}
            >
              Edit Tribe Info
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
