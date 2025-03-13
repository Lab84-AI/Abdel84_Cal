import { createTheme } from '@mui/material';

// Theme configuration
export const getTheme = (mode) => {
  if (mode === 'dark') {
    return createTheme({
      palette: {
        mode: 'dark',
        primary: { main: '#90caf9' },
        secondary: { main: '#f48fb1' },
        background: { default: '#121212', paper: '#1e1e1e' },
      },
    });
  } else if (mode === 'colorful') {
    return createTheme({
      palette: {
        mode: 'light',
        primary: { main: '#3f51b5' },
        secondary: { main: '#f50057' },
        background: { default: '#f0f4f8', paper: '#ffffff' },
        text: { primary: '#333333' },
      },
    });
  } else {
    // Light theme (default)
    return createTheme({
      palette: {
        mode: 'light',
        primary: { main: '#1976d2' },
        secondary: { main: '#dc004e' },
      },
    });
  }
};
