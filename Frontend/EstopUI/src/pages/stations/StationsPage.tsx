import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  IconButton,
  Grid,
} from '@mui/material';
import { Search as SearchIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import StatusChip from '../../components/common/StatusChip';
import PageLoader from '../../components/common/PageLoader';
import { stationService } from '../../services/stationService';
import type { StationStatusDTO } from '../../types';

export default function StationsPage() {
  const navigate = useNavigate();
  const [stations, setStations] = useState<StationStatusDTO[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await stationService.getAll();
      setStations(res.data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = stations.filter(
    (s) =>
      s.stationName.toLowerCase().includes(search.toLowerCase()) ||
      s.factoryName.toLowerCase().includes(search.toLowerCase()) ||
      s.blockId.toLowerCase().includes(search.toLowerCase())
  );

  // Summary counts
  const hmiCounts = stations.reduce(
    (acc, s) => {
      acc[s.currentHmiState] = (acc[s.currentHmiState] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (loading) return <PageLoader />;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4">Stations</Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            {stations.length} stations across all factories
          </Typography>
        </Box>
        <IconButton onClick={load} sx={{ color: '#888' }}>
          <RefreshIcon />
        </IconButton>
      </Box>

      {/* HMI summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {['GREEN', 'AMBER', 'RED'].map((state) => (
          <Grid size={{ xs: 4 }} key={state}>
            <Card sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                {hmiCounts[state] || 0}
              </Typography>
              <StatusChip status={state} />
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search by station, factory, or block…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#666' }} />
              </InputAdornment>
            ),
          },
        }}
      />

      {/* Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Station</TableCell>
                <TableCell>Factory</TableCell>
                <TableCell>Block</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>HMI State</TableCell>
                <TableCell align="right">Open Events</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((s) => (
                <TableRow
                  key={s.stationId}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/stations/${s.stationId}`)}
                >
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#FFF' }}>
                      {s.stationName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      ID: {s.stationId}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ color: '#AAA' }}>{s.factoryName}</TableCell>
                  <TableCell sx={{ color: '#AAA' }}>{s.blockId}</TableCell>
                  <TableCell>
                    <StatusChip status={s.status} />
                  </TableCell>
                  <TableCell>
                    <StatusChip status={s.currentHmiState} />
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: s.openEventCount > 0 ? '#EF4444' : '#22C55E',
                      }}
                    >
                      {s.openEventCount}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6, color: '#666' }}>
                    No stations found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
