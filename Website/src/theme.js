import { createTheme } from '@mui/material/styles';

const getTheme = (mode) => {
    const isLight = mode === 'light';

    return createTheme({
        palette: {
            mode,
            ...(isLight
                ? {
                    // Light Mode Palette
                    primary: {
                        main: '#E91E63', // Pink (High Contrast)
                        contrastText: '#ffffff',
                    },
                    secondary: {
                        main: '#FFC107', // Amber/Yellow
                        contrastText: '#000000',
                    },
                    background: {
                        default: '#fcfcfc', // Ultra-light grey (almost white)
                        paper: '#ffffff',
                    },
                    text: {
                        primary: '#000000', // Absolute Black for max contrast
                        secondary: '#212121', // Darker grey for better readability
                    },
                    divider: 'rgba(0, 0, 0, 0.12)',
                }
                : {
                    // Dark Mode Palette
                    primary: {
                        main: '#00A99D', // Original Teal
                        contrastText: '#ffffff',
                    },
                    secondary: {
                        main: '#FFBF00', // Original Amber
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
                    divider: 'rgba(255, 255, 255, 0.12)',
                }),
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
                textTransform: 'none',
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
                        backgroundImage: 'none',
                        boxShadow: 'none', // Remove shadows globally as requested
                        border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid #333', // Subtle border
                    },
                    elevation1: {
                        boxShadow: 'none',
                    },
                    elevation2: {
                        boxShadow: 'none',
                    },
                    elevation3: {
                        boxShadow: 'none',
                    },
                    elevation4: {
                        boxShadow: 'none',
                    },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        boxShadow: 'none',
                        border: isLight ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid #444', // Subtle border matching Paper
                    },
                },
            },
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        border: 'none', // Handle AppBar border separately if needed, or let typical styling apply
                        borderBottom: isLight ? '1px solid rgba(0,0,0,0.12)' : '1px solid rgba(255,255,255,0.12)',
                    }
                }
            },
            MuiTableCell: {
                styleOverrides: {
                    body: {
                        color: isLight ? '#000000' : 'inherit', // Absolute black for maximum contrast
                        fontWeight: isLight ? 500 : 400, // Slightly bolder in light mode for readability
                    },
                },
            },
        },
    })
};

export default getTheme;
