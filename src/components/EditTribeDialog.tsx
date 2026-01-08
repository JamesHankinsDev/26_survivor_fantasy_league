'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Stack,
  Typography,
  Alert,
} from '@mui/material';
import { TribeMember } from '@/types/league';

interface EditTribeDialogProps {
  open: boolean;
  tribeMember: TribeMember | null;
  onSave: (displayName: string, avatar: string, tribeColor: string) => Promise<void>;
  onClose: () => void;
}

export default function EditTribeDialog({
  open,
  tribeMember,
  onSave,
  onClose,
}: EditTribeDialogProps) {
  const [displayName, setDisplayName] = useState(tribeMember?.displayName || '');
  const [avatar, setAvatar] = useState(tribeMember?.avatar || '');
  const [tribeColor, setTribeColor] = useState(tribeMember?.tribeColor || '#20B2AA');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave(displayName.trim(), avatar.trim(), tribeColor);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tribe info');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDisplayName(tribeMember?.displayName || '');
    setAvatar(tribeMember?.avatar || '');
    setTribeColor(tribeMember?.tribeColor || '#20B2AA');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Your Tribe</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            fullWidth
            placeholder="Your survivor name"
          />

          <TextField
            label="Avatar URL"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            fullWidth
            placeholder="https://example.com/avatar.jpg"
            helperText="Link to your profile image"
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Tribe Color
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <input
                type="color"
                value={tribeColor}
                onChange={(e) => setTribeColor(e.target.value)}
                style={{
                  width: '60px',
                  height: '40px',
                  border: '2px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {tribeColor}
              </Typography>
            </Box>
          </Box>

          {avatar && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Preview
              </Typography>
              <Box
                component="img"
                src={avatar}
                alt="Avatar preview"
                sx={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '8px',
                  border: `3px solid ${tribeColor}`,
                  objectFit: 'cover',
                }}
                onError={() => {
                  /* Invalid URL, will show broken image */
                }}
              />
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
          sx={{
            bgcolor: '#E85D2A',
            '&:hover': { bgcolor: '#D94E23' },
          }}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
