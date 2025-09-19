'use client';

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
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import ScatterPlotOutlinedIcon from '@mui/icons-material/ScatterPlotOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import LeaderboardOutlinedIcon from '@mui/icons-material/LeaderboardOutlined';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import SettingsSuggestOutlinedIcon from '@mui/icons-material/SettingsSuggestOutlined';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NavSection } from '@/types/navigation';

const drawerWidth = 288;

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        title: 'Dashboard',
        path: '/dashboard',
        icon: <DashboardOutlinedIcon />
      },
      {
        title: 'Data Upload',
        path: '/data/upload',
        icon: <CloudUploadOutlinedIcon />
      },
      {
        title: 'Exploration & EDA',
        path: '/data/exploration',
        icon: <InsightsOutlinedIcon />
      },
      {
        title: 'Dataset Splits',
        path: '/data/splitting',
        icon: <ScatterPlotOutlinedIcon />
      }
    ]
  },
  {
    title: 'Models',
    items: [
      {
        title: 'Model Training',
        path: '/models/training',
        icon: <ScienceOutlinedIcon />
      },
      {
        title: 'Hyperparameter Optimization',
        path: '/models/optimization',
        icon: <TuneOutlinedIcon />
      },
      {
        title: 'Performance & Comparison',
        path: '/models/performance',
        icon: <LeaderboardOutlinedIcon />,
        badge: 'New'
      },
      {
        title: 'Interpretability',
        path: '/models/interpretability',
        icon: <LightbulbOutlinedIcon />
      }
    ]
  },
  {
    title: 'Operations',
    items: [
      {
        title: 'Deployments',
        path: '/deployments',
        icon: <CloudOutlinedIcon />
      },
      {
        title: 'Projects',
        path: '/projects',
        icon: <GroupOutlinedIcon />
      },
      {
        title: 'Experiment Tracking',
        path: '/experiments',
        icon: <AssessmentOutlinedIcon />
      },
      {
        title: 'Workflows',
        path: '/workflows',
        icon: <SettingsSuggestOutlinedIcon />
      }
    ]
  }
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  const content = (
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
              const isActive = pathname.startsWith(item.path);
              return (
                <ListItemButton
                  key={item.title}
                  component={Link}
                  href={item.path}
                  onClick={onClose}
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
            backgroundColor: 'background.paper',
            borderRight: '1px solid rgba(255,255,255,0.08)'
          }
        }}
      >
        {content}
      </Drawer>
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', lg: 'block' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            backgroundColor: 'background.paper',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            boxSizing: 'border-box'
          }
        }}
      >
        {content}
      </Drawer>
    </>
  );
}

export { drawerWidth };
