'use client';

import { Box, Container, Typography, Paper, Card, CardContent } from '@mui/material';
import { useAuth } from '@/lib/auth-context';

export default function DashboardHome() {
  const { user } = useAuth();

  return (
    <Box
      sx={{
        flex: 1,
        bgcolor: '#f5f5f5',
        p: { xs: 2, md: 4 },
        overflow: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: '#1A1A1A',
              mb: 1,
            }}
          >
            Welcome to Survivor Fantasy League
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
            Hello {user?.displayName || user?.email}! This is your league dashboard.
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
          {/* Stats Cards */}
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Leagues
              </Typography>
              <Typography variant="h5" sx={{ color: '#E85D2A', fontWeight: 700 }}>
                0
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                My Rank
              </Typography>
              <Typography variant="h5" sx={{ color: '#20B2AA', fontWeight: 700 }}>
                —
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Points
              </Typography>
              <Typography variant="h5" sx={{ color: '#E85D2A', fontWeight: 700 }}>
                0
              </Typography>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Win Rate
              </Typography>
              <Typography variant="h5" sx={{ color: '#20B2AA', fontWeight: 700 }}>
                0%
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Main Content Area */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Getting Started
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
            Welcome to your Survivor Fantasy League dashboard. This is your central hub for managing leagues, 
            tracking your performance, and competing with friends. Use the navigation menu to explore different 
            sections of the app.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
