'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Stack,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { League } from '@/types/league';

interface LeaguePreview {
  id: string;
  name: string;
  ownerName: string;
  currentPlayers: number;
  maxPlayers: number;
}

export default function MyLeaguesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [leagues, setLeagues] = useState<LeaguePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
      return;
    }

    if (!user) return;

    try {
      // Listen for leagues where user is a member
      const leaguesRef = collection(db, 'leagues');
      const q = query(leaguesRef, where('members', 'array-contains', user.uid));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const leagueList: LeaguePreview[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data() as League;
            leagueList.push({
              id: doc.id,
              name: data.name,
              ownerName: data.ownerName,
              currentPlayers: data.currentPlayers,
              maxPlayers: data.maxPlayers,
            });
          });
          setLeagues(leagueList);
          setLoading(false);
        },
        (err) => {
          console.error('Error fetching leagues:', err);
          setError('Failed to load your leagues');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up league listener:', err);
      setError('Failed to load your leagues');
      setLoading(false);
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress sx={{ color: '#E85D2A' }} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1A1A1A', mb: 1 }}>
          My Leagues
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          View and manage the leagues you're participating in
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {leagues.length === 0 ? (
        <Card sx={{ bgcolor: 'rgba(232, 93, 42, 0.05)', border: '2px dashed #E85D2A' }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'text.secondary' }}>
              You haven't joined any leagues yet
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push('/dashboard/admin')}
              sx={{
                bgcolor: '#E85D2A',
                '&:hover': { bgcolor: '#D94E23' },
              }}
            >
              Create a League
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {leagues.map((league) => (
            <Card
              key={league.id}
              sx={{
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
              onClick={() => router.push(`/dashboard/my-leagues/${league.id}`)}
            >
              <CardContent>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {league.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Owner: {league.ownerName}
                    </Typography>
                  </Box>
                  <Stack
                    direction={{ xs: 'row', sm: 'column' }}
                    spacing={1}
                    sx={{ alignItems: { xs: 'center', sm: 'flex-end' } }}
                  >
                    <Box
                      sx={{
                        px: 2,
                        py: 1,
                        bgcolor: 'rgba(32, 178, 170, 0.1)',
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#20B2AA' }}>
                        {league.currentPlayers}/{league.maxPlayers} Players
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Click to view →
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}
