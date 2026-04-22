import { Card, CardContent, Typography, Box, useTheme } from '@mui/material';
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
  color,
  trend,
}: Props) {
  const theme = useTheme();
  const accent = color ?? theme.palette.primary.main;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: '20px 20px 16px' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography
            variant="overline"
            sx={{
              fontSize: '0.68rem',
              letterSpacing: '0.09em',
              fontWeight: 700,
              color: 'text.secondary',
              lineHeight: 1.4,
            }}
          >
            {title}
          </Typography>
          {icon && (
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 1.5,
                bgcolor: `${accent}18`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: accent,
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
          )}
        </Box>

        <Typography
          variant="h4"
          sx={{ fontWeight: 800, color: accent, lineHeight: 1, fontSize: { xs: '1.5rem', sm: '2rem' } }}
        >
          {value}
        </Typography>

        {subtitle && (
          <Typography variant="caption" sx={{ mt: 0.75, color: 'text.secondary', display: 'block' }}>
            {subtitle}
          </Typography>
        )}

        {trend && (
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="caption"
              sx={{
                px: 0.75,
                py: 0.25,
                borderRadius: 1,
                fontWeight: 700,
                bgcolor: trend.value >= 0 ? 'rgba(220,38,38,0.12)' : 'rgba(22,163,74,0.12)',
                color: trend.value >= 0 ? 'error.main' : 'success.main',
              }}
            >
              {trend.value >= 0 ? '+' : ''}{trend.value}%
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {trend.label}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

