import {
  alpha,
  Avatar,
  Badge,
  Box,
  IconButton,
  InputBase,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';

export default function Header({ onMenuClick }) {
  return (
    <Box
      component="header"
      sx={{
        height: 72,
        display: 'flex',
        alignItems: 'center',
        px: 3,
        gap: 3,
        backdropFilter: 'blur(12px)',
        backgroundColor: alpha('#111418', 0.85),
        borderBottom: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      <IconButton onClick={onMenuClick} sx={{ display: { lg: 'none' } }} color="inherit">
        <MenuIcon />
      </IconButton>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          backgroundColor: alpha('#ffffff', 0.04),
          px: 2,
          py: 1,
          borderRadius: 2
        }}
      >
        <SearchIcon sx={{ color: 'text.secondary' }} />
        <InputBase
          placeholder="Search projects, models, datasets..."
          sx={{ flex: 1, color: 'text.primary' }}
          inputProps={{ 'aria-label': 'search' }}
        />
      </Box>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Tooltip title="Support">
          <IconButton color="inherit">
            <HelpOutlineOutlinedIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Notifications">
          <IconButton color="inherit">
            <Badge color="error" variant="dot" overlap="circular">
              <NotificationsNoneOutlinedIcon />
            </Badge>
          </IconButton>
        </Tooltip>
        <Tooltip title="Settings">
          <IconButton color="inherit">
            <SettingsOutlinedIcon />
          </IconButton>
        </Tooltip>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Box textAlign="right">
            <Typography variant="subtitle2" color="text.primary">
              Jordan Williams
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Lead ML Engineer
            </Typography>
          </Box>
          <Avatar src="https://i.pravatar.cc/100?img=5" alt="Jordan Williams" />
        </Stack>
      </Stack>
    </Box>
  );
}
