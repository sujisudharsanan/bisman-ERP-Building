'use client';

import { CssBaseline } from '@mui/material';
import {
  ThemeProvider as MuiThemeProvider,
  createTheme,
} from '@mui/material/styles';
import { ReactNode } from 'react';

export function ThemeRegistry({ children }: { children: ReactNode }) {
  const theme = createTheme({
    palette: {
      mode: 'light',
      primary: { main: '#2563eb' }, // Tailwind blue-600
      secondary: { main: '#9333ea' }, // Tailwind purple-600
    },
    typography: {
      fontFamily: 'Inter, sans-serif',
    },
  });

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}

// Also export a default theme instance
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563eb' },
    secondary: { main: '#9333ea' },
  },
  typography: { fontFamily: 'Inter, sans-serif' },
});

export default theme;
