import React from 'react';
import { Box, Typography, TextField, IconButton, useTheme, useMediaQuery, Avatar } from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';
import { API_BASE_URL } from '../services/apiClient';

const ScoreInput = ({ homeTeam, awayTeam, score, setScore, hideTeamInfo = false }) => {
    // ... existing hooks ...
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const handleIncrement = (side) => {
        setScore(prev => ({
            ...prev,
            [side]: ((parseInt(prev[side]) || 0) + 1).toString()
        }));
    };

    const handleDecrement = (side) => {
        setScore(prev => ({
            ...prev,
            [side]: Math.max(0, (parseInt(prev[side]) || 0) - 1).toString()
        }));
    };

    const handleChange = (side, value) => {
        setScore(prev => ({
            ...prev,
            [side]: value
        }));
    };

    const renderStepperInput = (side) => (
        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: 1 }}>
            {!isMobile && (
                <IconButton type="button" size="small" onClick={() => handleDecrement(side)} sx={{ bgcolor: theme.palette.action.hover }}>
                    <RemoveIcon fontSize="small" />
                </IconButton>
            )}
            {isMobile && (
                <IconButton type="button" size="small" onClick={() => handleIncrement(side)} sx={{ bgcolor: theme.palette.action.hover }}>
                    <AddIcon fontSize="small" />
                </IconButton>
            )}
            <TextField
                type="number"
                size="small"
                value={score[side]}
                onChange={(e) => handleChange(side, e.target.value)}
                sx={{
                    width: '60px',
                    '& input': { textAlign: 'center', p: 1 },
                    '& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button': { display: 'none' },
                    '& input[type=number]': { MozAppearance: 'textfield' }
                }}
                inputProps={{ min: 0 }}
            />
            {isMobile && (
                <IconButton type="button" size="small" onClick={() => handleDecrement(side)} sx={{ bgcolor: theme.palette.action.hover }}>
                    <RemoveIcon fontSize="small" />
                </IconButton>
            )}
            {!isMobile && (
                <IconButton type="button" size="small" onClick={() => handleIncrement(side)} sx={{ bgcolor: theme.palette.action.hover }}>
                    <AddIcon fontSize="small" />
                </IconButton>
            )}
        </Box>
    );

    const renderLogo = (team) => {
        if (!team) return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Avatar sx={{ width: 56, height: 56, fontSize: '1rem' }}>?</Avatar>
                <Typography sx={{ fontFamily: 'Comfortaa', fontWeight: 'bold', textAlign: 'center', lineHeight: 1.2, fontSize: '0.9rem', mt: 1 }}>
                    Unbekannt
                </Typography>
            </Box>
        );

        const isLightMode = theme.palette.mode === 'light';
        const logoToUse = (isLightMode && team.logoUrlLight) ? team.logoUrlLight : team.logoUrl;

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {logoToUse ? (
                    <Box
                        component="img"
                        src={logoToUse.startsWith('http') ? logoToUse : `${API_BASE_URL}${logoToUse}`}
                        alt={team.name}
                        sx={{ width: 56, height: 56, objectFit: 'contain' }}
                    />
                ) : (
                    <Avatar sx={{ width: 56, height: 56, fontSize: '1rem', bgcolor: team.logoColor || 'grey' }}>
                        {team.name ? team.name.substring(0, 1).toUpperCase() : '?'}
                    </Avatar>
                )}
                <Typography sx={{ fontFamily: 'Comfortaa', fontWeight: 'bold', textAlign: 'center', lineHeight: 1.2, fontSize: '0.9rem', mt: 1 }}>
                    {team.name}
                </Typography>
            </Box>
        );
    };

    return (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch', justifyContent: 'center' }}>
            {/* Home Score */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, width: '35%' }}>
                {!hideTeamInfo && (
                    <Box sx={{ minHeight: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
                        {renderLogo(homeTeam)}
                    </Box>
                )}
                {renderStepperInput('home')}
            </Box>

            <Typography sx={{ fontWeight: 'bold', fontSize: '1.5rem', mt: hideTeamInfo ? 1 : 4 }}>:</Typography>

            {/* Away Score */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, width: '35%' }}>
                {!hideTeamInfo && (
                    <Box sx={{ minHeight: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
                        {renderLogo(awayTeam)}
                    </Box>
                )}
                {renderStepperInput('away')}
            </Box>
        </Box>
    );
};

export default ScoreInput;
