'use client';

import { alpha, Box, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  progress?: number;
  color?: 'primary' | 'success' | 'warning' | 'error';
}

const trendCopy: Record<NonNullable<MetricCardProps['trend']>, string> = {
  up: 'increase',
  down: 'decrease',
  stable: 'no change'
};

export default function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend = 'stable',
  trendValue,
  progress,
  color = 'primary'
}: MetricCardProps) {
  const showTrend = Boolean(trendValue);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        border: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        {icon && (
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: theme => alpha(theme.palette[color].main, 0.16),
              color: `${color}.main`
            }}
          >
            {icon}
          </Box>
        )}
        <Box>
          <Typography variant="overline" color="text.secondary" letterSpacing={0.6}>
            {title}
          </Typography>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      </Stack>
      {progress !== undefined && (
        <Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 6,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.08)'
            }}
            color={color}
          />
        </Box>
      )}
      {showTrend && (
        <Chip
          size="small"
          color={trend === 'down' ? 'error' : trend === 'up' ? 'success' : 'default'}
          label={`${trendValue} ${trendCopy[trend]}`}
          sx={{ alignSelf: 'flex-start' }}
        />
      )}
    </Paper>
  );
}
