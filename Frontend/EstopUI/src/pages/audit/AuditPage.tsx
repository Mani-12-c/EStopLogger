import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  Grid,
  IconButton,
  Chip,
  MenuItem,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Warning as EventIcon,
  Timer as TimerIcon,
  TrendingUp as TrendIcon,
  ErrorOutlined as EscalatedIcon,
  CheckCircle as ResolvedIcon,
  LocalFireDepartment as DispatchIcon,
} from '@mui/icons-material';
import StatCard from '../../components/common/StatCard';
import PageLoader from '../../components/common/PageLoader';
import { auditService } from '../../services/auditService';
import { analyticsService } from '../../services/analyticsService';
import type { AuditLogDTO, Page, DashboardSummary } from '../../types';
import dayjs from 'dayjs';

const ACTION_COLORS: Record<string, string> = {
  'E-STOP_PRESSED': '#EF4444',
  'ACKNOWLEDGED': '#3B82F6',
  'AUTO_DISPATCHED': '#F97316',
  'ESCALATED': '#F59E0B',
  'RESOLVED': '#22C55E',
  'RELEASED': '#8B5CF6',
  'STATUS_CHANGED': '#06B6D4',
  'E-STOP_RELEASED': '#A78BFA',
  'REAL_EMERGENCY_CONFIRMED': '#DC2626',
  'CORRELATION_DETECTED': '#14B8A6',
};

export default function AuditPage() {
  const [data, setData] = useState<Page<AuditLogDTO> | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [logRes, sumRes] = await Promise.all([
        auditService.getLogs({
          page,
          size,
          action: actionFilter || undefined,
          from: fromDate ? dayjs(fromDate).toISOString() : undefined,
          to: toDate ? dayjs(toDate).toISOString() : undefined,
        }),
        analyticsService.getSummary().catch(() => null),
      ]);
      setData(logRes.data.data);
      if (sumRes) setSummary(sumRes.data.data);
    } finally {
      setLoading(false);
    }
  }, [page, size, actionFilter, fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async () => {
    const from = fromDate
      ? dayjs(fromDate).toISOString()
      : dayjs().subtract(30, 'day').toISOString();
    const to = toDate ? dayjs(toDate).toISOString() : dayjs().toISOString();
    try {
      const res = await auditService.exportCsv(from, to);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'audit_report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      // silently fail
    }
  };

  // Compute action distribution from loaded logs
  const actionCounts: Record<string, number> = {};
  data?.content.forEach((log) => {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4">Audit Logs</Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Immutable trail of all system actions — compliance overview
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={load} sx={{ color: '#888' }}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            sx={{ borderColor: 'rgba(255,255,255,0.2)', color: '#FFF' }}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* Auditor Summary KPI Cards */}
      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <StatCard title="Events Today" value={summary.totalEventsToday ?? 0} subtitle="E-Stop activations" icon={<EventIcon fontSize="small" />} color="#3B82F6" />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <StatCard title="Open" value={summary.openEvents ?? 0} subtitle="Awaiting ack" icon={<TrendIcon fontSize="small" />} color="#F59E0B" />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <StatCard title="Escalated" value={summary.escalatedEvents ?? 0} subtitle=">2 min unacked" icon={<EscalatedIcon fontSize="small" />} color="#F97316" />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <StatCard title="Dispatched" value={summary.autoDispatchedEvents ?? 0} subtitle="Auto-dispatched" icon={<DispatchIcon fontSize="small" />} color="#EF4444" />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <StatCard title="Resolved" value={summary.resolvedEvents ?? 0} subtitle="Closed tickets" icon={<ResolvedIcon fontSize="small" />} color="#22C55E" />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <StatCard
              title="Avg Response"
              value={summary.meanAckTimeSeconds ? (() => { const t = Math.round(summary.meanAckTimeSeconds); const m = Math.floor(t / 60); const s = t % 60; return m > 0 ? `${m}m ${s}s` : `${s}s`; })() : '—'}
              subtitle="Mean ack time"
              icon={<TimerIcon fontSize="small" />}
              color="#8B5CF6"
            />
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <TextField
            fullWidth
            select
            label="Action"
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">All Actions</MenuItem>
            {['E-STOP_PRESSED', 'ACKNOWLEDGED', 'AUTO_DISPATCHED', 'ESCALATED', 'RESOLVED', 'RELEASED', 'E-STOP_RELEASED', 'STATUS_CHANGED', 'REAL_EMERGENCY_CONFIRMED', 'CORRELATION_DETECTED'].map((a) => (
              <MenuItem key={a} value={a}>{a.replace(/_/g, ' ')}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            fullWidth
            type="date"
            label="From"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(0);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <TextField
            fullWidth
            type="date"
            label="To"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(0);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CardContent sx={{ py: 1, textAlign: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>{data?.totalElements ?? 0}</Typography>
              <Typography variant="caption" sx={{ color: '#888' }}>Total Audit Records</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {loading && !data ? (
        <PageLoader />
      ) : (
        <Card>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell>Performed By</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.content.map((log) => (
                  <TableRow key={log.auditId} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      #{log.auditId}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.action.replace(/_/g, ' ')}
                        size="small"
                        sx={{
                          bgcolor: (ACTION_COLORS[log.action] || '#666') + '22',
                          color: ACTION_COLORS[log.action] || '#AAA',
                          fontWeight: 700,
                          fontSize: '0.68rem',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#AAA' }}>
                      {log.eventId ? `#${log.eventId}` : '—'}
                    </TableCell>
                    <TableCell sx={{ color: '#AAA' }}>
                      {log.performedByName || (log.performedBy ? `User #${log.performedBy}` : 'System')}
                    </TableCell>
                    <TableCell sx={{ color: '#888', whiteSpace: 'nowrap' }}>
                      {dayjs(log.timestamp).format('MMM DD, HH:mm:ss')}
                    </TableCell>
                    <TableCell
                      sx={{
                        color: '#888',
                        maxWidth: 350,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {log.details}
                    </TableCell>
                  </TableRow>
                ))}
                {data?.content.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      sx={{ textAlign: 'center', py: 6, color: '#666' }}
                    >
                      No audit logs found
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
            sx={{ color: '#888' }}
          />
        </Card>
      )}
    </Box>
  );
}
