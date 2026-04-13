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
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  ArrowBack,
  LocalHospital,
  LocalFireDepartment,
  Security,
  Warning,
  Emergency,
  CheckCircle,
  Person,
} from '@mui/icons-material';
import StatusChip from '../../components/common/StatusChip';
import PageLoader from '../../components/common/PageLoader';
import { eventService } from '../../services/eventService';
import { ackService } from '../../services/ackService';
import { auditService } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import type { EStopEventDTO, AckRequest, AckResponse, EventTimelineDTO, ResolutionCategory, DispatchDTO } from '../../types';
import dayjs from 'dayjs';

const RESOLUTION_OPTIONS: { value: ResolutionCategory; label: string }[] = [
  { value: 'FALSE_ALARM', label: 'False Alarm' },
  { value: 'REAL_EMERGENCY', label: 'Real Emergency' },
  { value: 'TESTING_MAINTENANCE', label: 'Testing/Maintenance' },
  { value: 'MACHINE_FAULT', label: 'Machine Fault' },
  { value: 'CUSTOM_RESOLUTION', label: 'Custom Resolution' },
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
  const [resolving, setResolving] = useState(false);
  const [dispatches, setDispatches] = useState<DispatchDTO[]>([]);
  const [pressingAgain, setPressingAgain] = useState(false);
  const [ackDetails, setAckDetails] = useState<AckResponse | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      eventService.getById(Number(id)),
      auditService.getTimeline(Number(id)).catch(() => null),
      eventService.getDispatches(Number(id)).catch(() => null),
      ackService.getByEvent(Number(id)).catch(() => null),
    ])
      .then(([evtRes, tlRes, dispRes, ackRes]) => {
        setEvent(evtRes.data.data);
        if (tlRes) setTimeline(tlRes.data.data);
        if (dispRes) setDispatches(dispRes.data.data || []);
        if (ackRes?.data?.data) setAckDetails(ackRes.data.data);
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
      // Reload event + ack details
      const [evtRes, ackRes] = await Promise.all([
        eventService.getById(event.eventId),
        ackService.getByEvent(event.eventId).catch(() => null),
      ]);
      setEvent(evtRes.data.data);
      if (ackRes?.data?.data) setAckDetails(ackRes.data.data);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Acknowledgement failed';
      setAckError(msg);
      toast.error(msg);
    } finally {
      setAcking(false);
    }
  };

  const handleResolve = async () => {
    if (!event?.eventId) return;
    setResolving(true);
    try {
      await ackService.resolve(event.eventId);
      toast.success('Ticket closed — event resolved!');
      const res = await eventService.getById(event.eventId);
      setEvent(res.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to close ticket');
    } finally {
      setResolving(false);
    }
  };

  /** Rapid sequence: operator presses E-Stop a second time — releases this event (no duplicate) */
  const handlePressAgain = async () => {
    if (!event?.eventId) return;
    setPressingAgain(true);
    try {
      const releaseRes = await eventService.release(event.eventId);
      toast.success('E-Stop released — rapid sequence detected!');
      setEvent(releaseRes.data.data);
      // Reload dispatches
      const dispRes = await eventService.getDispatches(event.eventId).catch(() => null);
      if (dispRes) setDispatches(dispRes.data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to release E-Stop');
    } finally {
      setPressingAgain(false);
    }
  };

  const getDispatchIcon = (type: string) => {
    switch (type) {
      case 'AMBULANCE': return <LocalHospital sx={{ color: '#EF4444' }} />;
      case 'FIRE_DEPT': return <LocalFireDepartment sx={{ color: '#F97316' }} />;
      case 'SECURITY': return <Security sx={{ color: '#3B82F6' }} />;
      case 'ALL_EMERGENCY': return <Emergency sx={{ color: '#DC2626' }} />;
      case 'SUPERVISOR_ALERT': return <Warning sx={{ color: '#EAB308' }} />;
      default: return <Warning sx={{ color: '#888' }} />;
    }
  };

  const getDispatchLabel = (type: string) => {
    switch (type) {
      case 'AMBULANCE': return 'Ambulance Dispatched';
      case 'FIRE_DEPT': return 'Fire Department Dispatched';
      case 'SECURITY': return 'Security Dispatched';
      case 'ALL_EMERGENCY': return 'All Emergency Services Dispatched';
      case 'SUPERVISOR_ALERT': return 'Supervisor Alerted';
      default: return type;
    }
  };

  if (loading) return <PageLoader />;
  if (!event)
    return (
      <Typography sx={{ color: '#666', py: 8, textAlign: 'center' }}>
        Event not found
      </Typography>
    );

  const isAckable = event.eventStatus === 'OPEN' || event.eventStatus === 'ESCALATED' || event.eventStatus === 'CRITICAL' || event.eventStatus === 'AUTO_DISPATCHED' || event.eventStatus === 'RELEASED';

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
        {isAckable && hasRole('OPERATOR', 'SUPERVISOR') && (
          <Button variant="contained" onClick={() => setAckOpen(true)}>
            Acknowledge
          </Button>
        )}
        {event.eventStatus === 'OPEN' && hasRole('OPERATOR', 'SUPERVISOR') && (
          <Button
            variant="contained"
            color="error"
            onClick={handlePressAgain}
            disabled={pressingAgain}
            sx={{ fontWeight: 700 }}
          >
            {pressingAgain ? 'Pressing…' : '🔴 Press E-Stop Again'}
          </Button>
        )}
        {event.eventStatus === 'ACKNOWLEDGED' && hasRole('SUPERVISOR') && (
          <Button
            variant="contained"
            color="success"
            onClick={handleResolve}
            disabled={resolving}
          >
            {resolving ? 'Closing…' : 'Close Ticket'}
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

      {/* Dispatch Details — shown when help has been dispatched */}
      {dispatches.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Emergency sx={{ color: '#EF4444' }} />
              Help Dispatched
            </Typography>
            <Typography variant="body2" sx={{ color: '#888', mb: 2 }}>
              The following emergency services were automatically dispatched for this event.
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List disablePadding>
              {dispatches.map((d) => (
                <ListItem
                  key={d.dispatchId}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.03)',
                    borderRadius: 2,
                    mb: 1,
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 44 }}>
                    {getDispatchIcon(d.dispatchType)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {getDispatchLabel(d.dispatchType)}
                        </Typography>
                        <Chip
                          label={d.responseStatus}
                          size="small"
                          sx={{
                            bgcolor: d.responseStatus === 'DISPATCHED' ? '#22C55E22' : '#888',
                            color: d.responseStatus === 'DISPATCHED' ? '#22C55E' : '#FFF',
                            fontWeight: 600,
                            fontSize: '0.7rem',
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#AAA', display: 'block' }}>
                          Reason: {d.triggerReason}
                        </Typography>
                        {d.notes && (
                          <Typography variant="caption" sx={{ color: '#888', display: 'block', mt: 0.3 }}>
                            {d.notes}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 0.3 }}>
                          Dispatched at: {dayjs(d.dispatchedAt).format('MMM DD, HH:mm:ss')}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Acknowledgement Details — shown once event has been acknowledged */}
      {ackDetails && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircle sx={{ color: '#22C55E' }} />
              Acknowledgement Details
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Person sx={{ color: '#3B82F6', fontSize: 20 }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>
                      Acknowledged By
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {ackDetails.username}
                      <Chip
                        label={ackDetails.role}
                        size="small"
                        sx={{
                          ml: 1,
                          bgcolor: ackDetails.role === 'SUPERVISOR' ? '#8B5CF622' : '#3B82F622',
                          color: ackDetails.role === 'SUPERVISOR' ? '#8B5CF6' : '#3B82F6',
                          fontWeight: 600,
                          fontSize: '0.65rem',
                          height: 20,
                        }}
                      />
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>
                    Acknowledged At
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {dayjs(ackDetails.acknowledgedAt).format('MMM DD, YYYY HH:mm:ss')}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>
                    Resolution Category
                  </Typography>
                  <Chip
                    label={ackDetails.resolutionCategory.replace(/_/g, ' ')}
                    size="small"
                    sx={{
                      mt: 0.5,
                      bgcolor:
                        ackDetails.resolutionCategory === 'REAL_EMERGENCY' ? '#EF444422' :
                        ackDetails.resolutionCategory === 'FALSE_ALARM' ? '#EAB30822' :
                        '#3B82F622',
                      color:
                        ackDetails.resolutionCategory === 'REAL_EMERGENCY' ? '#EF4444' :
                        ackDetails.resolutionCategory === 'FALSE_ALARM' ? '#EAB308' :
                        '#3B82F6',
                      fontWeight: 600,
                    }}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#888', display: 'block' }}>
                    Within Threshold (2 min)
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: ackDetails.ackWithinThreshold ? '#22C55E' : '#EF4444' }}>
                    {ackDetails.ackWithinThreshold ? '✅ Yes' : '❌ No'}
                  </Typography>
                </Box>
              </Grid>
              {ackDetails.customResolutionText && (
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, p: 2, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 0.5 }}>
                      Comments / Notes
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#DDD', whiteSpace: 'pre-wrap' }}>
                      {ackDetails.customResolutionText}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

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
