import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#00A99D', // Teal
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#FFBF00', // Amber/Gelb
            contrastText: '#000000',
        },
        background: {
            default: '#0c0c0c',
            paper: '#111111',
        },
        text: {
            primary: '#ffffff',
            secondary: '#b0b0b0',
        },
        error: {
            main: '#d32f2f',
        },
        success: {
            main: '#2e7d32',
        },
        warning: {
            main: '#ed6c02',
        },
        info: {
            main: '#0288d1',
        },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontFamily: '"Comfortaa", sans-serif',
            fontWeight: 700,
        },
        h2: {
            fontFamily: '"Comfortaa", sans-serif',
            fontWeight: 700,
        },
        h3: {
            fontFamily: '"Comfortaa", sans-serif',
            fontWeight: 600,
        },
        h4: {
            fontFamily: '"Comfortaa", sans-serif',
            fontWeight: 600,
        },
        h5: {
            fontFamily: '"Comfortaa", sans-serif',
            fontWeight: 500,
        },
        h6: {
            fontFamily: '"Comfortaa", sans-serif',
            fontWeight: 500,
        },
        button: {
            fontFamily: '"Comfortaa", sans-serif',
            fontWeight: 700,
            textTransform: 'none', // Buttons standardmäßig nicht komplett großgeschrieben
        },
        subtitle1: {
            fontFamily: '"Comfortaa", sans-serif',
        },
        subtitle2: {
            fontFamily: '"Comfortaa", sans-serif',
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: '8px',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none', // Deaktiviert den Standard-Overlay bei Dark Mode
                },
            },
        },
    },
});

export default theme;
