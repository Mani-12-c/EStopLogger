import { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  Warning as EventIcon,
  Timer as TimerIcon,
  TrendingUp as TrendIcon,
  ErrorOutlined as EscalatedIcon,
  LocalFireDepartment as DispatchIcon,
  CheckCircle as ResolvedIcon,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import StatCard from '../../components/common/StatCard';
import StatusChip from '../../components/common/StatusChip';
import { analyticsService } from '../../services/analyticsService';
import { eventService } from '../../services/eventService';
import { stationService } from '../../services/stationService';
import { useAuth } from '../../context/AuthContext';
import type { DashboardSummary, EStopEventDTO, StationStatusDTO, FrequencyDTO } from '../../types';
import dayjs from 'dayjs';

const SEVERITY_COLORS: Record<string, string> = {
  LOW: '#22C55E',
  MEDIUM: '#F59E0B',
  HIGH: '#F97316',
  CRITICAL: '#EF4444',
};

const SHIFT_COLORS: Record<string, string> = {
  MORNING: '#3B82F6',
  AFTERNOON: '#F59E0B',
  NIGHT: '#8B5CF6',
};

const HMI_COLORS: Record<string, string> = {
  GREEN: '#22C55E',
  AMBER: '#F59E0B',
  RED: '#EF4444',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#F59E0B',
  ESCALATED: '#F97316',
  AUTO_DISPATCHED: '#EF4444',
  ACKNOWLEDGED: '#3B82F6',
  RESOLVED: '#22C55E',
};

const RISK_COLORS: Record<string, string> = {
  LOW: '#22C55E',
  MEDIUM: '#F59E0B',
  HIGH: '#F97316',
  CRITICAL: '#EF4444',
};

export default function DashboardPage() {
  const { hasRole } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [openEvents, setOpenEvents] = useState<EStopEventDTO[]>([]);
  const [stations, setStations] = useState<StationStatusDTO[]>([]);
  const [frequency, setFrequency] = useState<FrequencyDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const canViewEvents = hasRole('OPERATOR', 'SUPERVISOR');

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      const now = dayjs();
      const promises: Promise<any>[] = [
        analyticsService.getSummary().catch(() => null),
        stationService.getAll().catch(() => null),
        analyticsService
          .getPressFrequency(
            now.subtract(7, 'day').toISOString(),
            now.toISOString(),
            'day'
          )
          .catch(() => null),
      ];
      // Only fetch open events if user has event access (OPERATOR/SUPERVISOR)
      if (canViewEvents) {
        promises.push(eventService.getOpen().catch(() => null));
      }

      const results = await Promise.all(promises);
      if (results[0]) setSummary(results[0].data.data);
      if (results[1]) setStations(results[1].data.data || []);
      if (results[2]) setFrequency(results[2].data.data || []);
      if (canViewEvents && results[3]) setOpenEvents(results[3].data.data || []);
    } finally {
      setLoading(false);
    }
  };

  // Derived data
  const severityData = summary
    ? Object.entries(summary.eventsBySeverity || {}).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const shiftData = summary
    ? Object.entries(summary.eventsByShift || {}).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const statusData = summary
    ? Object.entries(summary.eventsByStatus || {})
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  const hmiCounts = stations.reduce(
    (acc, s) => {
      const st = s.currentHmiState || 'GREEN';
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const hmiData = Object.entries(hmiCounts).map(([name, value]) => ({
    name,
    value,
  }));

  if (loading) {
    return (
      <Grid container spacing={3}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Grid size={{ xs: 12, sm: 6, md: 2 }} key={i}>
            <Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} />
          </Grid>
        ))}
        {[1, 2].map((i) => (
          <Grid size={{ xs: 12, md: 6 }} key={`c-${i}`}>
            <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3 }} />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        Dashboard
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, color: '#666' }}>
        Real-time overview of your safety monitoring system
      </Typography>

      {/* KPI Cards — 6 cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard
            title="Events Today"
            value={summary?.totalEventsToday ?? 0}
            subtitle="E-Stop activations"
            icon={<EventIcon fontSize="small" />}
            color="#3B82F6"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard
            title="Open"
            value={summary?.openEvents ?? 0}
            subtitle="Awaiting ack"
            icon={<TrendIcon fontSize="small" />}
            color="#F59E0B"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard
            title="Escalated"
            value={summary?.escalatedEvents ?? 0}
            subtitle=">2 min unacked"
            icon={<EscalatedIcon fontSize="small" />}
            color="#F97316"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard
            title="Dispatched"
            value={summary?.autoDispatchedEvents ?? 0}
            subtitle="Auto-dispatched"
            icon={<DispatchIcon fontSize="small" />}
            color="#EF4444"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard
            title="Resolved"
            value={summary?.resolvedEvents ?? 0}
            subtitle="Closed tickets"
            icon={<ResolvedIcon fontSize="small" />}
            color="#22C55E"
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard
            title="Avg Response"
            value={
              summary?.meanAckTimeSeconds
                ? (() => {
                    const totalSec = Math.round(summary.meanAckTimeSeconds);
                    const min = Math.floor(totalSec / 60);
                    const sec = totalSec % 60;
                    return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
                  })()
                : '—'
            }
            subtitle="Mean ack time"
            icon={<TimerIcon fontSize="small" />}
            color="#8B5CF6"
          />
        </Grid>
      </Grid>

      {/* Charts Row 1 — Severity, Shift, Status Distribution */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Severity Breakdown */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Severity Distribution
              </Typography>
              <Box sx={{ height: 240 }}>
                {severityData.length === 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography variant="body2" sx={{ color: '#555' }}>No data</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={severityData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                        {severityData.map((entry) => (
                          <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || '#666'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#FFF' }} />
                      <Legend formatter={(value) => <span style={{ color: '#AAA', fontSize: 12 }}>{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Events by Shift */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Events by Shift
              </Typography>
              <Box sx={{ height: 240 }}>
                {shiftData.length === 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography variant="body2" sx={{ color: '#555' }}>No data</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={shiftData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} />
                      <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} />
                      <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#FFF' }} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {shiftData.map((entry) => (
                          <Cell key={entry.name} fill={SHIFT_COLORS[entry.name] || '#666'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Status Breakdown */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Events by Status
              </Typography>
              <Box sx={{ height: 240 }}>
                {statusData.length === 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography variant="body2" sx={{ color: '#555' }}>No data</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                        {statusData.map((entry) => (
                          <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#666'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#FFF' }} />
                      <Legend formatter={(value) => <span style={{ color: '#AAA', fontSize: 12 }}>{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 2 — HMI + 7-day Frequency */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* HMI State Overview */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Station HMI States
              </Typography>
              <Box sx={{ height: 280 }}>
                {hmiData.length === 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography variant="body2" sx={{ color: '#555' }}>No stations</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={hmiData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" stroke="none">
                        {hmiData.map((entry) => (
                          <Cell key={entry.name} fill={HMI_COLORS[entry.name] || '#666'} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#FFF' }} />
                      <Legend formatter={(value) => <span style={{ color: '#AAA', fontSize: 12 }}>{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 7-Day Frequency */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Event Frequency — Last 7 Days
              </Typography>
              <Box sx={{ height: 280 }}>
                {frequency.length === 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography variant="body2" sx={{ color: '#555' }}>No data for this period</Typography>
                  </Box>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={frequency}>
                      <defs>
                        <linearGradient id="freqGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="label" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} />
                      <YAxis tick={{ fill: '#888', fontSize: 11 }} axisLine={false} />
                      <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#FFF' }} />
                      <Area type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} fill="url(#freqGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Row 3 — High Risk Stations table + Recent Open Events (only for OPERATOR/SUPERVISOR) */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* High Risk Stations — full table */}
        <Grid size={{ xs: 12, md: canViewEvents ? 7 : 12 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                ⚠ High Risk Stations
              </Typography>
              {(!summary?.highRiskStations || summary.highRiskStations.length === 0) ? (
                <Typography variant="body2" sx={{ color: '#555', py: 4, textAlign: 'center' }}>
                  No risk data available
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Station</TableCell>
                        <TableCell align="center">Events</TableCell>
                        <TableCell align="center">Risk Score</TableCell>
                        <TableCell>Risk Level</TableCell>
                        <TableCell>Score Bar</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {summary.highRiskStations.map((s) => (
                        <TableRow key={s.stationId} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#FFF' }}>
                              {s.stationName}
                            </Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ color: '#AAA' }}>
                            {s.eventCount}
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" sx={{ fontWeight: 700, color: RISK_COLORS[s.riskLevel] || '#FFF' }}>
                              {s.riskScore}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={s.riskLevel}
                              size="small"
                              sx={{
                                bgcolor: (RISK_COLORS[s.riskLevel] || '#666') + '22',
                                color: RISK_COLORS[s.riskLevel] || '#666',
                                fontWeight: 700,
                                fontSize: '0.7rem',
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ minWidth: 120 }}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(s.riskScore, 100)}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: 'rgba(255,255,255,0.05)',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: RISK_COLORS[s.riskLevel] || '#666',
                                  borderRadius: 3,
                                },
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Open Events — only for OPERATOR / SUPERVISOR */}
        {canViewEvents && (
          <Grid size={{ xs: 12, md: 5 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Recent Open Events
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {openEvents.length === 0 && (
                    <Typography variant="body2" sx={{ color: '#666', py: 4, textAlign: 'center' }}>
                      No open events — all clear!
                    </Typography>
                  )}
                  {openEvents.slice(0, 8).map((evt) => (
                    <Box
                      key={evt.eventId}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                          {evt.stationName || `Station ${evt.stationId}`}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#666' }}>
                          {evt.pressedAt ? dayjs(evt.pressedAt).format('HH:mm:ss') : ''}
                          {evt.factoryName ? ` · ${evt.factoryName}` : ''}
                        </Typography>
                      </Box>
                      <StatusChip status={evt.severity || 'MEDIUM'} />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
