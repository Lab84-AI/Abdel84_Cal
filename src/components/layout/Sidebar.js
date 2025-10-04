import {
  Box,
  Chip,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Typography
} from '@mui/material';
import { navSections } from '../../data/navigation';
import { useNavigation } from '../../contexts/NavigationContext';

export const drawerWidth = 288;

function SidebarContent({ onNavigate }) {
  const { path } = useNavigation();

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default'
      }}
    >
      <Box px={3} py={4} display="flex" flexDirection="column" gap={1}>
        <Typography variant="subtitle2" color="text.secondary">
          ML Platform
        </Typography>
        <Typography variant="h5" fontWeight={700} color="text.primary">
          Aurora AI Control Center
        </Typography>
        <Typography variant="body2" color="text.secondary">
          End-to-end machine learning lifecycle management
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'divider', opacity: 0.2 }} />
      <Box flex={1} overflow="auto">
        {navSections.map(section => (
          <List
            key={section.title}
            subheader={
              <ListSubheader
                component="div"
                disableSticky
                sx={{
                  background: 'transparent',
                  color: 'text.secondary',
                  fontWeight: 600,
                  letterSpacing: 0.5
                }}
              >
                {section.title}
              </ListSubheader>
            }
            sx={{
              '& .MuiListItemButton-root': {
                borderRadius: 2,
                mx: 1,
                mb: 0.5
              }
            }}
          >
            {section.items.map(item => {
              const isActive = path.startsWith(item.path);
              return (
                <ListItemButton
                  key={item.title}
                  onClick={() => onNavigate(item.path)}
                  selected={isActive}
                  sx={{
                    color: isActive ? 'primary.contrastText' : 'text.secondary',
                    bgcolor: isActive ? 'primary.main' : 'transparent'
                  }}
                >
                  <ListItemIcon sx={{ color: isActive ? 'primary.contrastText' : 'text.secondary' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    primaryTypographyProps={{ fontWeight: isActive ? 600 : 500 }}
                  />
                  {item.badge && (
                    <Chip size="small" color="secondary" label={item.badge} sx={{ ml: 1 }} />
                  )}
                </ListItemButton>
              );
            })}
          </List>
        ))}
      </Box>
      <Box px={3} py={3}>
        <Typography variant="caption" color="text.secondary">
          Aurora AI Platform © {new Date().getFullYear()}
        </Typography>
      </Box>
    </Box>
  );
}

export default function Sidebar({ open, onClose, onNavigate }) {
  return (
    <>
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box'
          }
        }}
      >
        <SidebarContent onNavigate={path => {
          onNavigate(path);
          onClose();
        }} />
      </Drawer>
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', lg: 'block' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid rgba(255,255,255,0.08)'
          }
        }}
      >
        <SidebarContent onNavigate={onNavigate} />
      </Drawer>
    </>
  );
}
