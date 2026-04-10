import { useEffect, useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Skeleton,
} from '@mui/material';
import {
  Warning as EventIcon,
  Timer as TimerIcon,
  TrendingUp as TrendIcon,
  ErrorOutlined as EscalatedIcon,
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

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [openEvents, setOpenEvents] = useState<EStopEventDTO[]>([]);
  const [stations, setStations] = useState<StationStatusDTO[]>([]);
  const [frequency, setFrequency] = useState<FrequencyDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const now = dayjs();
      const [sumRes, evtRes, staRes, freqRes] = await Promise.all([
        analyticsService.getSummary().catch(() => null),
        eventService.getOpen().catch(() => null),
        stationService.getAll().catch(() => null),
        analyticsService
          .getPressFrequency(
            now.subtract(7, 'day').toISOString(),
            now.toISOString(),
            'day'
          )
          .catch(() => null),
      ]);
      if (sumRes) setSummary(sumRes.data.data);
      if (evtRes) setOpenEvents(evtRes.data.data || []);
      if (staRes) setStations(staRes.data.data || []);
      if (freqRes) setFrequency(freqRes.data.data || []);
    } finally {
      setLoading(false);
    }
  };

  // Derived data
  const severityData = summary
    ? Object.entries(summary.eventsBySeverity).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const shiftData = summary
    ? Object.entries(summary.eventsByShift).map(([name, value]) => ({
        name,
        value,
      }))
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
        {[1, 2, 3, 4].map((i) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}>
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

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Events Today"
            value={summary?.totalEventsToday ?? 0}
            subtitle="E-Stop activations"
            icon={<EventIcon fontSize="small" />}
            color="#3B82F6"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Open Events"
            value={summary?.openEvents ?? 0}
            subtitle="Awaiting acknowledgement"
            icon={<TrendIcon fontSize="small" />}
            color="#F59E0B"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Escalated"
            value={summary?.escalatedEvents ?? 0}
            subtitle="Passed 2-min threshold"
            icon={<EscalatedIcon fontSize="small" />}
            color="#EF4444"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
            subtitle="Mean acknowledgement time"
            icon={<TimerIcon fontSize="small" />}
            color="#22C55E"
          />
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Severity Breakdown */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, mb: 2 }}
              >
                Severity Distribution
              </Typography>
              <Box sx={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {severityData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={SEVERITY_COLORS[entry.name] || '#666'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#1A1A1A',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        color: '#FFF',
                      }}
                    />
                    <Legend
                      formatter={(value) => (
                        <span style={{ color: '#AAA', fontSize: 12 }}>
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Events by Shift */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, mb: 2 }}
              >
                Events by Shift
              </Typography>
              <Box sx={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={shiftData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#888', fontSize: 11 }}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#888', fontSize: 11 }}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#1A1A1A',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        color: '#FFF',
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {shiftData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={SHIFT_COLORS[entry.name] || '#666'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* HMI State Overview */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, mb: 2 }}
              >
                Station HMI States
              </Typography>
              <Box sx={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={hmiData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {hmiData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={HMI_COLORS[entry.name] || '#666'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#1A1A1A',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        color: '#FFF',
                      }}
                    />
                    <Legend
                      formatter={(value) => (
                        <span style={{ color: '#AAA', fontSize: 12 }}>
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* 7-Day Frequency */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, mb: 2 }}
              >
                Event Frequency — Last 7 Days
              </Typography>
              <Box sx={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={frequency}>
                    <defs>
                      <linearGradient id="freqGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#888', fontSize: 11 }}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#888', fontSize: 11 }}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#1A1A1A',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 8,
                        color: '#FFF',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      fill="url(#freqGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Open Events */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, mb: 2 }}
              >
                Recent Open Events
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {openEvents.length === 0 && (
                  <Typography variant="body2" sx={{ color: '#666', py: 4, textAlign: 'center' }}>
                    No open events
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
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, fontSize: '0.8rem' }}
                      >
                        {evt.stationName || `Station ${evt.stationId}`}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#666' }}>
                        {evt.pressedAt
                          ? dayjs(evt.pressedAt).format('HH:mm:ss')
                          : ''}
                      </Typography>
                    </Box>
                    <StatusChip status={evt.severity || 'MEDIUM'} />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* High Risk Stations */}
      {summary?.highRiskStations && summary.highRiskStations.length > 0 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              ⚠ High Risk Stations
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {summary.highRiskStations.map((s) => (
                <StatusChip key={s} status="CRITICAL" size="medium" />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
