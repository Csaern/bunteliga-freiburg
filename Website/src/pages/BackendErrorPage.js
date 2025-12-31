import React from 'react';
import { Box, Typography, Container, Paper } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import logo from '../img/logo.png';

const lightPalette = [
    '#E91E63', // Pink
    '#FFC107', // Amber/Yellow
    '#9C27B0', // Purple
    '#00BCD4', // Cyan
];

const darkPalette = [
    '#00A99D', // Original Teal
    '#FFBF00', // Original Amber
    '#3366CC', // Original Blue
    '#4CAF50', // Original Green
];

const ColorfulText = ({ text }) => {
    const theme = useTheme();
    const palette = theme.palette.mode === 'light' ? lightPalette : darkPalette;

    return (
        <Box component="span" sx={{ display: 'inline-flex' }}>
            {text.split('').map((char, index) => (
                <Box component="span" key={index} sx={{ color: palette[index % palette.length] }}>
                    {char}
                </Box>
            ))}
        </Box>
    );
};

const BackendErrorPage = () => {
    return (
        <Container component="main" maxWidth="md" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Paper
                elevation={0}
                sx={{
                    p: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    backgroundColor: 'transparent',
                    border: 'none', // Remove border as requested
                }}
            >
                {/* 
                   Exact replica of the Header Logo Section (Desktop view).
                   Using the same dimensions and typography styles.
                */}
                <Box sx={{
                    display: 'flex', alignItems: 'center', mb: 8, transform: 'scale(1.5)' /* Increased margin-bottom (mb) for more spacing */
                }}>

                    <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <img
                            src={logo}
                            alt="Bunte Liga Freiburg Logo"
                            style={{
                                height: '65px', // initialLogoHeight from Header.js
                                width: 'auto',
                                maxHeight: '65px',
                                objectFit: 'contain'
                            }}
                        />
                    </Box>

                    <Box sx={{
                        ml: 1,
                        pt: 0.2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        textAlign: 'left',
                        lineHeight: 1.1,
                        fontWeight: 700,
                        color: 'text.primary' // Ensures color adapts to theme like 'inherit' in header
                    }}>
                        <Typography component="span" variant="h5" sx={{ fontWeight: 'inherit', letterSpacing: '.2rem', color: 'inherit' }}>
                            BUNTE LIGA
                        </Typography>
                        <Typography component="span" variant="h4" sx={{ fontWeight: 'inherit', pt: 0.3, letterSpacing: '0.05em', mt: '-0.1em', lineHeight: 1 }}>
                            <ColorfulText text="FREIBURG" />
                        </Typography>
                    </Box>

                </Box>

                <Typography variant="h6" sx={{ mt: 4, mb: 4, fontStyle: 'italic', color: 'text.secondary' }}>
                    "Wir verleihen gerade Donald Trump den Bunte Liga - Friedenspreis und sind gleich wieder da."
                </Typography>

                <Typography variant="caption" display="block" sx={{ mt: 4, color: 'text.disabled' }}>
                    Error: Backend Connection Refused. FIFA Corruption detected? Maybe.
                </Typography>

            </Paper>
        </Container>
    );
};

export default BackendErrorPage;
