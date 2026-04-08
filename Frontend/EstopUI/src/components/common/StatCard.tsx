import { Card, CardContent, Typography, Box } from '@mui/material';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: string;
  trend?: { value: number; label: string };
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  color = '#FFF',
  trend,
}: Props) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography
            variant="body2"
            sx={{
              textTransform: 'uppercase',
              fontSize: '0.7rem',
              letterSpacing: '0.08em',
              color: '#888',
              fontWeight: 600,
            }}
          >
            {title}
          </Typography>
          {icon && (
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: `${color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color,
              }}
            >
              {icon}
            </Box>
          )}
        </Box>

        <Typography
          variant="h4"
          sx={{ fontWeight: 800, color, lineHeight: 1 }}
        >
          {value}
        </Typography>

        {subtitle && (
          <Typography variant="body2" sx={{ mt: 1, color: '#666' }}>
            {subtitle}
          </Typography>
        )}

        {trend && (
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="caption"
              sx={{
                px: 1,
                py: 0.25,
                borderRadius: 1,
                fontWeight: 700,
                bgcolor:
                  trend.value >= 0
                    ? 'rgba(239,68,68,0.15)'
                    : 'rgba(34,197,94,0.15)',
                color: trend.value >= 0 ? '#EF4444' : '#22C55E',
              }}
            >
              {trend.value >= 0 ? '+' : ''}
              {trend.value}%
            </Typography>
            <Typography variant="caption" sx={{ color: '#666' }}>
              {trend.label}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
