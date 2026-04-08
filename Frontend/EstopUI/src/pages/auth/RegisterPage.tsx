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
} from '@mui/material';
import { RadioButtonChecked as LogoIcon } from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import type { RegisterRequest, UserRole, ShiftType } from '../../types';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
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
        bgcolor: '#0A0A0A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 460, border: '1px solid rgba(255,255,255,0.08)' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <LogoIcon sx={{ fontSize: 40, color: '#EF4444', mb: 1 }} />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Create Account
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Full Name"
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              sx={{ mb: 2 }}
              autoFocus
            />
            <TextField
              fullWidth
              label="Username"
              value={form.username}
              onChange={(e) => set('username', e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              select
              label="Role"
              value={form.role}
              onChange={(e) => set('role', e.target.value as UserRole)}
              sx={{ mb: 2 }}
            >
              <MenuItem value="OPERATOR">Operator</MenuItem>
              <MenuItem value="SUPERVISOR">Supervisor</MenuItem>
              <MenuItem value="AUDITOR">Auditor</MenuItem>
            </TextField>
            <TextField
              fullWidth
              select
              label="Shift"
              value={form.shift || ''}
              onChange={(e) =>
                set('shift', e.target.value ? (e.target.value as ShiftType) : null)
              }
              sx={{ mb: 2 }}
            >
              <MenuItem value="">None</MenuItem>
              <MenuItem value="MORNING">Morning (6AM–2PM)</MenuItem>
              <MenuItem value="AFTERNOON">Afternoon (2PM–10PM)</MenuItem>
              <MenuItem value="NIGHT">Night (10PM–6AM)</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="Assigned Station ID"
              type="number"
              value={form.assignedStationId || ''}
              onChange={(e) =>
                set(
                  'assignedStationId',
                  e.target.value ? parseInt(e.target.value) : null
                )
              }
              sx={{ mb: 3 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || !form.username || !form.password || !form.fullName}
              sx={{ py: 1.5 }}
            >
              {loading ? 'Creating…' : 'Create Account'}
            </Button>
          </form>

          <Typography variant="body2" sx={{ textAlign: 'center', mt: 3, color: '#666' }}>
            Already have an account?{' '}
            <Link
              component={RouterLink}
              to="/login"
              sx={{ color: '#FFF', fontWeight: 600 }}
            >
              Sign In
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
