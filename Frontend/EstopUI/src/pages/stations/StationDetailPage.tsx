import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import StatusChip from '../../components/common/StatusChip';
import PageLoader from '../../components/common/PageLoader';
import { stationService } from '../../services/stationService';
import { eventService } from '../../services/eventService';
import type { StationStatusDTO, EStopEventDTO } from '../../types';
import dayjs from 'dayjs';

export default function StationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [station, setStation] = useState<StationStatusDTO | null>(null);
  const [events, setEvents] = useState<EStopEventDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      stationService.getById(Number(id)),
      eventService.getByStation(Number(id)),
    ])
      .then(([staRes, evtRes]) => {
        setStation(staRes.data.data);
        setEvents(evtRes.data.data || []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader />;
  if (!station)
    return (
      <Typography sx={{ color: '#666', py: 8, textAlign: 'center' }}>
        Station not found
      </Typography>
    );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/stations')} sx={{ color: '#888' }}>
          <ArrowBack />
        </IconButton>
        <Box>
          <Typography variant="h4">{station.stationName}</Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            {station.factoryName} · Block {station.blockId}
          </Typography>
        </Box>
      </Box>

      {/* Info cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="caption" sx={{ color: '#888' }}>
                HMI STATE
              </Typography>
              <Box sx={{ mt: 1 }}>
                <StatusChip status={station.currentHmiState} size="medium" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="caption" sx={{ color: '#888' }}>
                STATUS
              </Typography>
              <Box sx={{ mt: 1 }}>
                <StatusChip status={station.status} size="medium" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="caption" sx={{ color: '#888' }}>
                OPEN EVENTS
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: station.openEventCount > 0 ? '#EF4444' : '#22C55E' }}>
                {station.openEventCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="caption" sx={{ color: '#888' }}>
                TOTAL EVENTS
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                {events.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Event history */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            Event History
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Pressed At</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Risk Score</TableCell>
                  <TableCell>Rapid?</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.map((e) => (
                  <TableRow
                    key={e.eventId}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/events/${e.eventId}`)}
                  >
                    <TableCell>#{e.eventId}</TableCell>
                    <TableCell sx={{ color: '#AAA' }}>
                      {e.pressedAt ? dayjs(e.pressedAt).format('MMM DD, HH:mm:ss') : '—'}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={e.eventStatus || 'OPEN'} />
                    </TableCell>
                    <TableCell>
                      <StatusChip status={e.severity || 'MEDIUM'} />
                    </TableCell>
                    <TableCell sx={{ color: '#AAA' }}>{e.riskScore ?? '—'}</TableCell>
                    <TableCell sx={{ color: e.isRapidSequence ? '#EF4444' : '#666' }}>
                      {e.isRapidSequence ? 'Yes' : 'No'}
                    </TableCell>
                  </TableRow>
                ))}
                {events.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: '#666' }}>
                      No events for this station
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
