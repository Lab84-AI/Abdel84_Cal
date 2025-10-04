import { Box } from '@mui/material';
import { useState } from 'react';
import Sidebar, { drawerWidth } from './Sidebar';
import Header from './Header';
import Breadcrumbs from './Breadcrumbs';
import { useNavigation } from '../../contexts/NavigationContext';

export default function AppLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { navigate } = useNavigation();

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} onNavigate={navigate} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: { lg: `${drawerWidth}px` },
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh'
        }}
      >
        <Header onMenuClick={() => setMobileOpen(true)} />
        <Box component="section" sx={{ px: { xs: 2, md: 4 }, py: 3, flexGrow: 1 }}>
          <Breadcrumbs />
          <Box mt={3} display="flex" flexDirection="column" gap={3}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
