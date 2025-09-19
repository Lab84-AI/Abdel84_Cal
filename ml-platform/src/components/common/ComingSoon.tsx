'use client';

import { Paper, Typography } from '@mui/material';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';

interface ComingSoonProps {
  title: string;
  description: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        px: { xs: 3, md: 6 },
        py: { xs: 4, md: 6 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 2,
        border: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      <AccessTimeOutlinedIcon sx={{ fontSize: 48, color: 'primary.light' }} />
      <Typography variant="h5" fontWeight={600} color="text.primary">
        {title}
      </Typography>
      <Typography variant="body1" color="text.secondary" maxWidth={480}>
        {description}
      </Typography>
    </Paper>
  );
}
