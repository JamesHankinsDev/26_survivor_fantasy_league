'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, increment, arrayUnion } from 'firebase/firestore';
import { League } from '@/types/league';

type JoinStatus = 'loading' | 'success' | 'error' | 'already_member' | 'league_full' | 'not_found';

export default function JoinLeaguePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const joinCode = params.code as string;

  const [status, setStatus] = useState<JoinStatus>('loading');
  const [league, setLeague] = useState<League | null>(null);
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // First, redirect to home if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  // Find league by join code
  useEffect(() => {
    if (!user || !db || !joinCode) return;

    const findAndJoinLeague = async () => {
      try {
        setStatus('loading');
        setMessage('Looking up league...');

        const leaguesRef = collection(db, 'leagues');
        const q = query(leaguesRef, where('joinCode', '==', joinCode.toUpperCase()));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setStatus('not_found');
          setMessage('League not found. Please check the join code.');
          return;
        }

        const leagueDoc = snapshot.docs[0];
        const leagueData = leagueDoc.data();
        const foundLeague: League = {
          id: leagueDoc.id,
          name: leagueData.name,
          ownerId: leagueData.ownerId,
          ownerName: leagueData.ownerName,
          ownerEmail: leagueData.ownerEmail,
          maxPlayers: leagueData.maxPlayers,
          currentPlayers: leagueData.currentPlayers || 1,
          joinCode: leagueData.joinCode,
          members: leagueData.members || [],
          memberDetails: leagueData.memberDetails || [],
          createdAt: leagueData.createdAt?.toDate() || new Date(),
          updatedAt: leagueData.updatedAt?.toDate() || new Date(),
          status: leagueData.status || 'active',
        };

        setLeague(foundLeague);

        // Check if user is already a member
        if (foundLeague.members.includes(user.uid)) {
          setStatus('already_member');
          setMessage('You are already a member of this league.');
          return;
        }

        // Check if league is full
        if (foundLeague.currentPlayers >= foundLeague.maxPlayers) {
          setStatus('league_full');
          setMessage('This league is full. No more players can join.');
          return;
        }

        setStatus('success');
        setMessage('Ready to join!');
      } catch (err: any) {
        console.error('Error finding league:', err);
        setStatus('error');
        setMessage(err.message || 'An error occurred while looking up the league.');
      }
    };

    findAndJoinLeague();
  }, [user, db, joinCode]);

  const handleJoinLeague = async () => {
    if (!league || !user || !db) return;

    try {
      setIsProcessing(true);
      setMessage('Joining league...');

      const leagueRef = doc(db, 'leagues', league.id);
      
      // Create new tribe member entry for the user
      const newMember = {
        userId: user.uid,
        displayName: user.displayName || 'Unknown',
        avatar: user.photoURL || '',
        tribeColor: '#20B2AA',
        points: 0,
        joinedAt: new Date(),
      };

      await updateDoc(leagueRef, {
        members: arrayUnion(user.uid),
        memberDetails: arrayUnion(newMember),
        currentPlayers: increment(1),
        updatedAt: new Date(),
      });

      setStatus('success');
      setMessage(`Successfully joined ${league.name}!`);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Error joining league:', err);
      setStatus('error');
      setMessage(err.message || 'Failed to join league.');
      setIsProcessing(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #B8360F 0%, #1A1A1A 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            borderRadius: 3,
          }}
        >
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Stack spacing={3} alignItems="center">
              {/* Icon */}
              {status === 'loading' && <CircularProgress sx={{ color: '#E85D2A' }} />}
              {status === 'success' && (
                <CheckCircleIcon sx={{ fontSize: 60, color: '#20B2AA' }} />
              )}
              {(status === 'error' || status === 'not_found' || status === 'league_full' || status === 'already_member') && (
                <ErrorIcon sx={{ fontSize: 60, color: '#E85D2A' }} />
              )}

              {/* Title */}
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {status === 'loading' && 'Finding League...'}
                {status === 'success' && league && `Join ${league.name}?`}
                {(status === 'error' || status === 'not_found') && 'Oops!'}
                {status === 'league_full' && 'League Full'}
                {status === 'already_member' && 'Already Joined'}
              </Typography>

              {/* League Info */}
              {league && (
                <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1, width: '100%' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {league.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                    Owner: {league.ownerName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Players: {league.currentPlayers} / {league.maxPlayers}
                  </Typography>
                </Box>
              )}

              {/* Message */}
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  textAlign: 'center',
                }}
              >
                {message}
              </Typography>

              {/* Actions */}
              <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => router.push('/dashboard')}
                  disabled={isProcessing}
                >
                  Back to Dashboard
                </Button>

                {status === 'success' && (
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleJoinLeague}
                    disabled={isProcessing}
                    sx={{
                      background:
                        'linear-gradient(135deg, #D94E23 0%, #E85D2A 100%)',
                      '&:hover': {
                        background:
                          'linear-gradient(135deg, #C93F1A 0%, #D94E23 100%)',
                      },
                    }}
                  >
                    {isProcessing ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      'Join League'
                    )}
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
