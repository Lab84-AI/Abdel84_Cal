import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from '@mui/material';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { useNavigation } from '../../contexts/NavigationContext';

function formatSegment(segment) {
  return segment
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function Breadcrumbs() {
  const { path, navigate } = useNavigation();
  const segments = path.split('/').filter(Boolean);

  return (
    <MuiBreadcrumbs
      separator={<NavigateNextIcon fontSize="small" sx={{ color: 'text.disabled' }} />}
      aria-label="breadcrumb"
      sx={{ color: 'text.secondary', fontSize: 14 }}
    >
      <Link
        component="button"
        type="button"
        onClick={() => navigate('/dashboard')}
        color="text.secondary"
        underline="hover"
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, font: 'inherit' }}
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
            component="button"
            type="button"
            onClick={() => navigate(href)}
            color="text.secondary"
            underline="hover"
            sx={{ fontSize: 14, font: 'inherit' }}
          >
            {formatSegment(segment)}
          </Link>
        );
      })}
    </MuiBreadcrumbs>
  );
}
