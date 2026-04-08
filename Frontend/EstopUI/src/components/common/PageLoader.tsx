import { Box, CircularProgress, Typography } from '@mui/material';

export default function PageLoader({ text = 'Loading…' }: { text?: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 12,
        gap: 2,
      }}
    >
      <CircularProgress size={32} sx={{ color: '#FFF' }} />
      <Typography variant="body2" sx={{ color: '#666' }}>
        {text}
      </Typography>
    </Box>
  );
}
