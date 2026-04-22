import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  MenuItem,
  Link,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  RadioButtonChecked as LogoIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { useThemeMode } from '../../context/ThemeContext';
import type { RegisterRequest, UserRole, ShiftType } from '../../types';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { mode, toggle } = useThemeMode();
  const [form, setForm] = useState<RegisterRequest>({
    username: '',
    password: '',
    fullName: '',
    role: 'OPERATOR',
    assignedStationId: null,
    shift: null,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authService.register(form);
      login(res.data.data);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (key: string, val: any) => setForm({ ...form, [key]: val });

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        position: 'relative',
      }}
    >
      <Tooltip title={mode === 'dark' ? 'Switch to light' : 'Switch to dark'}>
        <IconButton
          onClick={toggle}
          sx={{ position: 'absolute', top: 16, right: 16, color: 'text.secondary' }}
        >
          {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </Tooltip>

      <Card sx={{ width: '100%', maxWidth: 460 }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <LogoIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
              Create Account
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              E‑Stop Logger — Industrial Safety
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField fullWidth label="Full Name" value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)} sx={{ mb: 2 }} autoFocus />
            <TextField fullWidth label="Username" value={form.username}
              onChange={(e) => set('username', e.target.value)} sx={{ mb: 2 }} />
            <TextField fullWidth label="Password" type="password" value={form.password}
              onChange={(e) => set('password', e.target.value)} sx={{ mb: 2 }} />
            <TextField fullWidth select label="Role" value={form.role}
              onChange={(e) => set('role', e.target.value as UserRole)} sx={{ mb: 2 }}>
              <MenuItem value="OPERATOR">Operator</MenuItem>
              <MenuItem value="SUPERVISOR">Supervisor</MenuItem>
              <MenuItem value="AUDITOR">Auditor</MenuItem>
            </TextField>
            <TextField fullWidth select label="Shift" value={form.shift || ''}
              onChange={(e) => set('shift', e.target.value ? (e.target.value as ShiftType) : null)}
              sx={{ mb: 2 }}>
              <MenuItem value="">None</MenuItem>
              <MenuItem value="MORNING">Morning (6AM–2PM)</MenuItem>
              <MenuItem value="AFTERNOON">Afternoon (2PM–10PM)</MenuItem>
              <MenuItem value="NIGHT">Night (10PM–6AM)</MenuItem>
            </TextField>
            <TextField fullWidth label="Assigned Station ID" type="number"
              value={form.assignedStationId || ''}
              onChange={(e) => set('assignedStationId', e.target.value ? parseInt(e.target.value) : null)}
              sx={{ mb: 3 }} />
            <Button type="submit" fullWidth variant="contained" size="large"
              disabled={loading || !form.username || !form.password || !form.fullName}
              sx={{ py: 1.4, fontWeight: 700 }}>
              {loading ? 'Creating…' : 'Create Account'}
            </Button>
          </form>

          <Typography variant="body2" sx={{ textAlign: 'center', mt: 3, color: 'text.secondary' }}>
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" sx={{ color: 'primary.main', fontWeight: 600 }}>
              Sign In
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
