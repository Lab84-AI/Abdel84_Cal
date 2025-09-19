'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from '@mui/material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

const formatSegment = (segment: string) =>
  segment
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <MuiBreadcrumbs
      separator={<NavigateNextIcon fontSize="small" sx={{ color: 'text.disabled' }} />}
      aria-label="breadcrumb"
      sx={{ color: 'text.secondary', fontSize: 14 }}
    >
      <Link
        component={NextLink}
        href="/dashboard"
        color="text.secondary"
        underline="hover"
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
      >
        <HomeOutlinedIcon sx={{ fontSize: 18 }} />
        Home
      </Link>
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`;
        const isLast = index === segments.length - 1;
        return isLast ? (
          <Typography key={href} color="text.primary" fontWeight={600} fontSize={14}>
            {formatSegment(segment)}
          </Typography>
        ) : (
          <Link
            key={href}
            component={NextLink}
            href={href}
            color="text.secondary"
            underline="hover"
            sx={{ fontSize: 14 }}
          >
            {formatSegment(segment)}
          </Link>
        );
      })}
    </MuiBreadcrumbs>
  );
}
