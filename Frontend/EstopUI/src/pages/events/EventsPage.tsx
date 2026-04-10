import { useEffect, useState, useCallback } from 'react';
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
  TablePagination,
  TextField,
  MenuItem,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import StatusChip from '../../components/common/StatusChip';
import PageLoader from '../../components/common/PageLoader';
import { eventService } from '../../services/eventService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import type { EStopEventDTO, Page } from '../../types';
import dayjs from 'dayjs';

export default function EventsPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const toast = useToast();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(15);
  const [data, setData] = useState<Page<EStopEventDTO> | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newEvt, setNewEvt] = useState({
    stationId: '',
    factoryId: '',
    blockId: '',
  });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await eventService.getAll({
        page,
        size,
        status: statusFilter || undefined,
        severity: severityFilter || undefined,
      });
      setData(res.data.data);
    } finally {
      setLoading(false);
    }
  }, [page, size, statusFilter, severityFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await eventService.create({
        stationId: parseInt(newEvt.stationId),
        factoryId: newEvt.factoryId,
        blockId: newEvt.blockId,
      });
      setCreateOpen(false);
      setNewEvt({ stationId: '', factoryId: '', blockId: '' });
      toast.success('Event created successfully');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4">E-Stop Events</Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            {data?.totalElements ?? 0} total events
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={load} sx={{ color: '#888' }}>
            <RefreshIcon />
          </IconButton>
          {hasRole('OPERATOR', 'SUPERVISOR') && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
            >
              New Event
            </Button>
          )}
        </Box>
      </Box>

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            fullWidth
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">All</MenuItem>
            {['OPEN', 'ACKNOWLEDGED', 'ESCALATED', 'CRITICAL', 'AUTO_DISPATCHED', 'RELEASED', 'RESOLVED', 'CLOSED'].map(
              (s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              )
            )}
          </TextField>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            fullWidth
            select
            label="Severity"
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">All</MenuItem>
            {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      {/* Table */}
      {loading && !data ? (
        <PageLoader />
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Station</TableCell>
                  <TableCell>Factory</TableCell>
                  <TableCell>Pressed At</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Risk</TableCell>
                  <TableCell>Rapid</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.content.map((e) => (
                  <TableRow
                    key={e.eventId}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/events/${e.eventId}`)}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>#{e.eventId}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: '#FFF' }}>
                        {e.stationName || `Station ${e.stationId}`}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: '#AAA' }}>
                      {e.factoryName || e.factoryId}
                    </TableCell>
                    <TableCell sx={{ color: '#AAA' }}>
                      {e.pressedAt
                        ? dayjs(e.pressedAt).format('MMM DD, HH:mm:ss')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={e.eventStatus || 'OPEN'} />
                    </TableCell>
                    <TableCell>
                      <StatusChip status={e.severity || 'MEDIUM'} />
                    </TableCell>
                    <TableCell sx={{ color: '#AAA' }}>
                      {e.riskScore ?? '—'}
                    </TableCell>
                    <TableCell sx={{ color: e.isRapidSequence ? '#EF4444' : '#666' }}>
                      {e.isRapidSequence ? '⚡ Yes' : 'No'}
                    </TableCell>
                  </TableRow>
                ))}
                {data?.content.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 6, color: '#666' }}>
                      No events found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data?.totalElements ?? 0}
            page={page}
            rowsPerPage={size}
            rowsPerPageOptions={[10, 15, 25, 50]}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => {
              setSize(parseInt(e.target.value));
              setPage(0);
            }}
            sx={{
              color: '#888',
              '.MuiTablePagination-selectIcon': { color: '#888' },
            }}
          />
        </Card>
      )}

      {/* Create Event Dialog */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>New E-Stop Event</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Station ID"
            type="number"
            value={newEvt.stationId}
            onChange={(e) => setNewEvt({ ...newEvt, stationId: e.target.value })}
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth
            label="Factory ID"
            value={newEvt.factoryId}
            onChange={(e) => setNewEvt({ ...newEvt, factoryId: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Block ID"
            value={newEvt.blockId}
            onChange={(e) => setNewEvt({ ...newEvt, blockId: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ color: '#888' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !newEvt.stationId || !newEvt.factoryId || !newEvt.blockId}
          >
            {creating ? 'Creating…' : 'Create Event'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
