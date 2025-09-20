'use client';

import { Box, Grid, Paper, Typography } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StorageIcon from '@mui/icons-material/Storage';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

const metrics = [
  {
    title: 'Active Projects',
    value: '12',
    caption: '3 new this week',
    icon: <RocketLaunchIcon color="primary" />
  },
  {
    title: 'Models in Production',
    value: '8',
    caption: 'Accuracy avg 92%',
    icon: <TrendingUpIcon color="success" />
  },
  {
    title: 'Storage Utilization',
    value: '2.3 TB',
    caption: '65% of quota',
    icon: <StorageIcon color="warning" />
  }
];

export default function DashboardPage() {
  return (
    <Box display="flex" flexDirection="column" gap={3}>
      <Typography variant="h4" fontWeight={600} color="primary.light">
        Welcome back, Analyst
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Track your machine learning initiatives at a glance.
      </Typography>
      <Grid container spacing={3}>
        {metrics.map(metric => (
          <Grid item key={metric.title} xs={12} sm={6} md={4}>
            <Paper elevation={2} sx={{ p: 3, backgroundColor: 'background.paper' }}>
              <Box display="flex" alignItems="center" gap={2}>
                {metric.icon}
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    {metric.title}
                  </Typography>
                  <Typography variant="h5" fontWeight={600} color="text.primary">
                    {metric.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {metric.caption}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
