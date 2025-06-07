"use client";
import { createTheme } from '@mui/material/styles';

// Definition der Kernfarben
const TEAL = '#00A99D';
const GOLD = '#FFBF00';
const DARK_BG = 'rgb(12, 12, 12)';
const PAPER_BG = '#1E1E1E';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: TEAL },
    secondary: { main: GOLD },
    background: { default: DARK_BG, paper: PAPER_BG },
    text: { primary: 'rgba(255, 255, 255, 0.95)', secondary: 'rgba(255, 255, 255, 0.6)' },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
  typography: {
    fontFamily: "'Comfortaa', sans-serif",
    fontWeightBold: 700,
    fontWeightMedium: 600,
    fontWeightRegular: 400,
    h5: { fontWeight: 600, letterSpacing: '0.05em' },
    h6: { fontWeight: 600, letterSpacing: '0.05em' },
    button: { textTransform: 'none', fontWeight: 'bold' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiIconButton: {
      styleOverrides: {
        root: { color: 'rgba(255, 255, 255, 0.7)', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' } },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: { color: 'white' },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: TEAL,
            '& .MuiListItemIcon-root, & .MuiTypography-root': {
              color: 'white !important',
            },
            '&:hover': {
              backgroundColor: 'rgba(0, 169, 157, 0.8)',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(255, 191, 0, 0.1)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundColor: DARK_BG, backgroundImage: 'none', boxShadow: 'none' },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: DARK_BG, borderRight: '1px solid rgba(255, 255, 255, 0.12)' },
      },
    },
  },
});

export default theme;