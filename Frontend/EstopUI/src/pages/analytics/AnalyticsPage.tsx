import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import PageLoader from '../../components/common/PageLoader';
import { analyticsService } from '../../services/analyticsService';
import type { FrequencyDTO, ShiftReportDTO, StationRiskDTO } from '../../types';
import dayjs from 'dayjs';



const RISK_COLORS: Record<string, string> = {
  LOW: '#22C55E',
  MEDIUM: '#F59E0B',
  HIGH: '#F97316',
  CRITICAL: '#EF4444',
};

const tooltipStyle = {
  contentStyle: {
    background: '#1A1A1A',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#FFF',
  },
};

export default function AnalyticsPage() {
  const [groupBy, setGroupBy] = useState('day');
  const [frequency, setFrequency] = useState<FrequencyDTO[]>([]);
  const [riskStations, setRiskStations] = useState<StationRiskDTO[]>([]);
  const [shiftReport, setShiftReport] = useState<ShiftReportDTO | null>(null);
  const [riskTrend, setRiskTrend] = useState<FrequencyDTO[]>([]);
  const [selectedStation, setSelectedStation] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [groupBy]);

  const loadData = async () => {
    setLoading(true);
    const now = dayjs();
    try {
      const [freqRes, riskRes, shiftRes] = await Promise.all([
        analyticsService
          .getPressFrequency(
            now.subtract(30, 'day').toISOString(),
            now.toISOString(),
            groupBy
          )
          .catch(() => null),
        analyticsService.getHighRiskStations(undefined, 10).catch(() => null),
        analyticsService
          .getShiftReport(now.format('YYYY-MM-DD'))
          .catch(() => null),
      ]);
      if (freqRes) setFrequency(freqRes.data.data || []);
      if (riskRes) setRiskStations(riskRes.data.data || []);
      if (shiftRes) setShiftReport(shiftRes.data.data);
    } finally {
      setLoading(false);
    }
  };

  // Load risk trend when station changes
  useEffect(() => {
    if (selectedStation) {
      analyticsService
        .getRiskTrend(selectedStation as number, 12)
        .then((res) => setRiskTrend(res.data.data || []))
        .catch(() => setRiskTrend([]));
    }
  }, [selectedStation]);

  // Prepare shift chart data
  const shiftBarData = shiftReport
    ? Object.entries(shiftReport.eventsByShift).map(([shift, count]) => ({
        shift,
        events: count,
        avgAck: shiftReport.avgAckTimeByShift?.[shift] ?? 0,
        escalations: shiftReport.escalationsByShift?.[shift] ?? 0,
      }))
    : [];

  // Risk distribution pie
  const riskDistribution = riskStations.reduce(
    (acc, s) => {
      acc[s.riskLevel] = (acc[s.riskLevel] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const riskPieData = Object.entries(riskDistribution).map(([name, value]) => ({
    name,
    value,
  }));

  if (loading) return <PageLoader />;

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 0.5 }}>
        Analytics
      </Typography>
      <Typography variant="body2" sx={{ color: '#666', mb: 3 }}>
        Insights and trends from your safety data
      </Typography>

      {/* Frequency Chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Event Frequency — Last 30 Days
            </Typography>
            <TextField
              select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              sx={{ width: 140 }}
            >
              <MenuItem value="day">By Day</MenuItem>
              <MenuItem value="hour">By Hour</MenuItem>
              <MenuItem value="shift">By Shift</MenuItem>
              <MenuItem value="station">By Station</MenuItem>
            </TextField>
          </Box>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={frequency}>
                <defs>
                  <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
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
                  tick={{ fill: '#888', fontSize: 10 }}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: '#888', fontSize: 11 }}
                  axisLine={false}
                />
                <Tooltip {...tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#aGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Row 2 */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Shift Report */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Today's Shift Report
              </Typography>
              <Box sx={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={shiftBarData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      dataKey="shift"
                      tick={{ fill: '#888', fontSize: 11 }}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#888', fontSize: 11 }}
                      axisLine={false}
                    />
                    <Tooltip {...tooltipStyle} />
                    <Legend
                      formatter={(value) => (
                        <span style={{ color: '#AAA', fontSize: 12 }}>
                          {value}
                        </span>
                      )}
                    />
                    <Bar
                      dataKey="events"
                      name="Events"
                      fill="#3B82F6"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="escalations"
                      name="Escalations"
                      fill="#EF4444"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Risk Distribution */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Station Risk Distribution
              </Typography>
              <Box sx={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {riskPieData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={RISK_COLORS[entry.name] || '#666'}
                        />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
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

      {/* High Risk Stations Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            High Risk Stations
          </Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={riskStations}
                layout="vertical"
                margin={{ left: 80 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fill: '#888', fontSize: 11 }}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="stationName"
                  tick={{ fill: '#AAA', fontSize: 11 }}
                  axisLine={false}
                  width={80}
                />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="riskScore" name="Risk Score" radius={[0, 4, 4, 0]}>
                  {riskStations.map((s) => (
                    <Cell
                      key={s.stationId}
                      fill={RISK_COLORS[s.riskLevel] || '#666'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </CardContent>
      </Card>

      {/* Risk Trend for a Station */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Station Risk Score Trend
            </Typography>
            <TextField
              select
              label="Station"
              value={selectedStation}
              onChange={(e) =>
                setSelectedStation(
                  e.target.value ? Number(e.target.value) : ''
                )
              }
              sx={{ width: 200 }}
            >
              <MenuItem value="">Select station</MenuItem>
              {riskStations.map((s) => (
                <MenuItem key={s.stationId} value={s.stationId}>
                  {s.stationName}
                </MenuItem>
              ))}
            </TextField>
          </Box>
          <Box sx={{ height: 280 }}>
            {riskTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={riskTrend}>
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
                  <Tooltip {...tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Risk Score"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={{ fill: '#F59E0B', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="body2" sx={{ color: '#666' }}>
                  Select a station to view risk trend
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
