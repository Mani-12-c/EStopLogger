import { Chip } from '@mui/material';

const STATUS_MAP: Record<string, { color: string; bg: string }> = {
  OPEN: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  ACKNOWLEDGED: { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  ESCALATED: { color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  CRITICAL: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  RESOLVED: { color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  RELEASED: { color: '#06B6D4', bg: 'rgba(6,182,212,0.12)' },
  AUTO_DISPATCHED: { color: '#DC2626', bg: 'rgba(220,38,38,0.12)' },
  CLOSED: { color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
  // Severity
  LOW: { color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  MEDIUM: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  HIGH: { color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  // HMI
  GREEN: { color: '#22C55E', bg: 'rgba(34,197,94,0.15)' },
  AMBER: { color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  RED: { color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
  // Station
  ACTIVE: { color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  INACTIVE: { color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
  MAINTENANCE: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
};

interface Props {
  status: string;
  size?: 'small' | 'medium';
}

export default function StatusChip({ status, size = 'small' }: Props) {
  const s = STATUS_MAP[status] || { color: '#999', bg: 'rgba(153,153,153,0.12)' };
  return (
    <Chip
      label={status}
      size={size}
      sx={{
        color: s.color,
        bgcolor: s.bg,
        fontWeight: 700,
        fontSize: size === 'small' ? '0.7rem' : '0.8rem',
        letterSpacing: '0.04em',
        border: 'none',
      }}
    />
  );
}
