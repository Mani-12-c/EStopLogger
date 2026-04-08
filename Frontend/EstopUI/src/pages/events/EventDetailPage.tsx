import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import StatusChip from '../../components/common/StatusChip';
import PageLoader from '../../components/common/PageLoader';
import { eventService } from '../../services/eventService';
import { ackService } from '../../services/ackService';
import { auditService } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import type { EStopEventDTO, AckRequest, EventTimelineDTO, ResolutionCategory } from '../../types';
import dayjs from 'dayjs';

const RESOLUTION_OPTIONS: { value: ResolutionCategory; label: string }[] = [
  { value: 'FALSE_ALARM', label: 'False Alarm' },
  { value: 'EQUIPMENT_MALFUNCTION', label: 'Equipment Malfunction' },
  { value: 'SAFETY_HAZARD', label: 'Safety Hazard' },
  { value: 'OPERATOR_ERROR', label: 'Operator Error' },
  { value: 'OTHER', label: 'Other' },
];

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const toast = useToast();

  const [event, setEvent] = useState<EStopEventDTO | null>(null);
  const [timeline, setTimeline] = useState<EventTimelineDTO | null>(null);
  const [loading, setLoading] = useState(true);

  // Ack dialog
  const [ackOpen, setAckOpen] = useState(false);
  const [ackForm, setAckForm] = useState<AckRequest>({
    resolutionCategory: 'FALSE_ALARM',
    customResolutionText: '',
  });
  const [acking, setAcking] = useState(false);
  const [ackError, setAckError] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      eventService.getById(Number(id)),
      auditService.getTimeline(Number(id)).catch(() => null),
    ])
      .then(([evtRes, tlRes]) => {
        setEvent(evtRes.data.data);
        if (tlRes) setTimeline(tlRes.data.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleAck = async () => {
    if (!event?.eventId) return;
    setAcking(true);
    setAckError('');
    try {
      await ackService.acknowledge(event.eventId, ackForm);
      toast.success('Event acknowledged successfully!');
      setAckOpen(false);
      // Reload event
      const res = await eventService.getById(event.eventId);
      setEvent(res.data.data);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Acknowledgement failed';
      setAckError(msg);
      toast.error(msg);
    } finally {
      setAcking(false);
    }
  };

  if (loading) return <PageLoader />;
  if (!event)
    return (
      <Typography sx={{ color: '#666', py: 8, textAlign: 'center' }}>
        Event not found
      </Typography>
    );

  const isOpen = event.eventStatus === 'OPEN' || event.eventStatus === 'ESCALATED' || event.eventStatus === 'CRITICAL';

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/events')} sx={{ color: '#888' }}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h4">Event #{event.eventId}</Typography>
            <StatusChip status={event.eventStatus || 'OPEN'} size="medium" />
          </Box>
          <Typography variant="body2" sx={{ color: '#666' }}>
            {event.stationName || `Station ${event.stationId}`} ·{' '}
            {event.factoryName || event.factoryId}
          </Typography>
        </Box>
        {isOpen && hasRole('OPERATOR') && (
          <Button variant="contained" onClick={() => setAckOpen(true)}>
            Acknowledge
          </Button>
        )}
      </Box>

      {/* Info cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 2 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#888' }}>
                SEVERITY
              </Typography>
              <Box sx={{ mt: 0.5 }}>
                <StatusChip status={event.severity || 'MEDIUM'} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#888' }}>
                RISK SCORE
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>
                {event.riskScore ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#888' }}>
                RAPID SEQ
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  mt: 0.5,
                  color: event.isRapidSequence ? '#EF4444' : '#22C55E',
                }}
              >
                {event.isRapidSequence ? 'YES' : 'NO'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#888' }}>
                PRESSED AT
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                {event.pressedAt
                  ? dayjs(event.pressedAt).format('MMM DD, YYYY HH:mm:ss')
                  : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#888' }}>
                CORRELATED WORK
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, mt: 0.5 }}>
                {event.workType || 'None'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Timeline */}
      {timeline && timeline.timeline && timeline.timeline.length > 0 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Event Timeline
            </Typography>
            <Stepper orientation="vertical" activeStep={-1}>
              {timeline.timeline.map((entry, idx) => (
                <Step key={idx} active completed>
                  <StepLabel
                    sx={{
                      '& .MuiStepIcon-root': { color: '#3B82F6' },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#FFF' }}>
                      {entry.action}
                    </Typography>
                  </StepLabel>
                  <StepContent>
                    <Typography variant="caption" sx={{ color: '#888' }}>
                      {dayjs(entry.time).format('MMM DD, HH:mm:ss')} · by{' '}
                      {entry.by}
                    </Typography>
                    {entry.details && (
                      <Typography variant="body2" sx={{ color: '#AAA', mt: 0.5 }}>
                        {entry.details}
                      </Typography>
                    )}
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </CardContent>
        </Card>
      )}

      {/* Acknowledge Dialog */}
      <Dialog
        open={ackOpen}
        onClose={() => setAckOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Acknowledge Event #{event.eventId}
        </DialogTitle>
        <DialogContent>
          {ackError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {ackError}
            </Alert>
          )}
          <TextField
            fullWidth
            select
            label="Resolution Category"
            value={ackForm.resolutionCategory}
            onChange={(e) =>
              setAckForm({
                ...ackForm,
                resolutionCategory: e.target.value as ResolutionCategory,
              })
            }
            sx={{ mt: 1, mb: 2 }}
          >
            {RESOLUTION_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Additional Notes (optional)"
            value={ackForm.customResolutionText || ''}
            onChange={(e) =>
              setAckForm({ ...ackForm, customResolutionText: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setAckOpen(false)} sx={{ color: '#888' }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAck} disabled={acking}>
            {acking ? 'Acknowledging…' : 'Acknowledge'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
