import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, FormControl, InputLabel, Select, MenuItem, Divider, useTheme, Typography, useMediaQuery } from '@mui/material';

const AdminResultForm = ({ initialData, teams, pitches, results = [], bookings = [], season, onSubmit, onCancel, onEdit, mode = 'create' }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isReadOnly = mode === 'view';

    const [formData, setFormData] = useState({
        homeTeamId: '',
        awayTeamId: '',
        homeScore: '',
        awayScore: '',
        bookingId: null,
        date: '',
        time: '',
        location: ''
    });

    const [matchingBooking, setMatchingBooking] = useState(null);

    // Reset Auswärtsteam wenn Heimteam geändert wird (nur bei manueller Eingabe)
    const handleHomeTeamChange = (e) => {
        setFormData({ ...formData, homeTeamId: e.target.value, awayTeamId: '' });
    };

    // Helper to parse dates safely
    const parseDate = (d) => {
        if (!d) return null;
        if (d instanceof Date) return d;
        if (d.toDate) return d.toDate();
        if (d._seconds) return new Date(d._seconds * 1000);
        return new Date(d);
    };

    // Check for existing open booking
    useEffect(() => {
        if (formData.homeTeamId && formData.awayTeamId && !initialData?.bookingId) {
            const match = bookings.find(b =>
                b.homeTeamId === formData.homeTeamId &&
                b.awayTeamId === formData.awayTeamId &&
                b.status === 'confirmed'
            );
            setMatchingBooking(match || null);
        } else {
            setMatchingBooking(null);
        }
    }, [formData.homeTeamId, formData.awayTeamId, bookings, initialData?.bookingId]);

    // Handle linking booking
    const handleLinkBooking = () => {
        if (matchingBooking) {
            const d = parseDate(matchingBooking.date);
            const timeStr = d ? d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
            const dateStr = d ? d.toISOString().split('T')[0] : '';
            const pitchName = matchingBooking.pitchId ? (pitches?.find(p => p.id === matchingBooking.pitchId)?.name || '') : '';

            setFormData(prev => ({
                ...prev,
                bookingId: matchingBooking.id,
                date: dateStr || prev.date,
                time: timeStr !== '00:00' ? timeStr : prev.time,
                location: pitchName || prev.location
            }));
        }
    };

    // Determine status of away team option
    const getAwayTeamStatus = (teamId) => {
        if (teamId === formData.homeTeamId) return 'hidden';

        // Limit Check
        if (season && results && !initialData?.bookingId) {
            const playMode = season.playMode || 'double_round_robin';
            let maxMatches = 2;
            if (playMode === 'single_round_robin') maxMatches = 1;

            const existingMatches = results.filter(r => {
                if (initialData?.id && r.id === initialData.id) return false; // Exclude self if editing
                if (r.status === 'cancelled') return false;
                return (r.homeTeamId === formData.homeTeamId && r.awayTeamId === teamId) ||
                    (r.homeTeamId === teamId && r.awayTeamId === formData.homeTeamId);
            });

            if (existingMatches.length >= maxMatches) return 'hidden';
        }

        // Future Booking Check
        const booking = bookings.find(b =>
            ((b.homeTeamId === formData.homeTeamId && b.awayTeamId === teamId) ||
                (b.homeTeamId === teamId && b.awayTeamId === formData.homeTeamId)) &&
            b.status === 'confirmed'
        );

        if (booking) {
            const d = parseDate(booking.date);
            // Check if date is in future (ignoring time for safety? No, full date comparison)
            if (d && d > new Date()) return 'disabled_future';
        }

        return 'valid';
    };

    useEffect(() => {
        if (initialData) {
            const d = parseDate(initialData.date);
            setFormData({
                homeTeamId: initialData.homeTeamId || '',
                awayTeamId: initialData.awayTeamId || '',
                homeScore: initialData.homeScore ?? '',
                awayScore: initialData.awayScore ?? '',
                bookingId: initialData.bookingId || null,
                date: d ? d.toISOString().split('T')[0] : '',
                time: d ? d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '',
                location: initialData.location || (initialData.pitchId ? pitches?.find(p => p.id === initialData.pitchId)?.name : '') || ''
            });
        }
    }, [initialData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (formData.homeTeamId === formData.awayTeamId) {
            alert('Heim- und Auswärtsmannschaft müssen unterschiedlich sein!');
            return;
        }

        let finalDate = null;
        if (formData.date) {
            finalDate = new Date(formData.date);
            if (formData.time) {
                const [hours, minutes] = formData.time.split(':');
                finalDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
            }
        }

        onSubmit({ ...formData, date: finalDate });
    };

    const inputStyle = {
        '& label.Mui-focused': { color: theme.palette.primary.main },
        '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: theme.palette.divider },
            '&:hover fieldset': { borderColor: theme.palette.text.secondary },
            '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
        },
        '& .MuiInputBase-input': { color: theme.palette.text.primary, accentColor: theme.palette.primary.main },
        '& label': { color: theme.palette.text.secondary },
        '& .MuiSelect-icon': { color: theme.palette.text.secondary },
        '& .Mui-disabled': { WebkitTextFillColor: `${theme.palette.text.disabled} !important`, color: `${theme.palette.text.disabled} !important` },
        '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.action.disabledBackground },
    };

    return (
        <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                {/* Termin & Ort */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                        size="small"
                        label="Datum"
                        type="date"
                        fullWidth
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        disabled={isReadOnly || !!initialData?.bookingId || !!formData.bookingId}
                        InputLabelProps={{ shrink: true }}
                        sx={inputStyle}
                    />
                    <TextField
                        size="small"
                        label="Zeit"
                        type="time"
                        fullWidth
                        required
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        disabled={isReadOnly || !!initialData?.bookingId || !!formData.bookingId}
                        InputLabelProps={{ shrink: true }}
                        sx={inputStyle}
                    />
                </Box>

                <FormControl size="small" fullWidth required sx={inputStyle} disabled={isReadOnly || !!initialData?.bookingId || !!formData.bookingId}>
                    <InputLabel>Platz</InputLabel>
                    <Select
                        value={pitches?.find(p => p.name === formData.location)?.id || ''}
                        label="Platz"
                        onChange={(e) => {
                            const selectedPitch = pitches?.find(p => p.id === e.target.value);
                            setFormData({ ...formData, location: selectedPitch ? selectedPitch.name : '' });
                        }}
                        MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary } } }}
                    >
                        {pitches?.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                    </Select>
                </FormControl>

                <Divider sx={{ my: 1, borderColor: theme.palette.divider }} />

                {/* Teams */}
                <FormControl size="small" fullWidth required sx={inputStyle} disabled={isReadOnly || !!initialData?.bookingId}>
                    <InputLabel>Heim</InputLabel>
                    <Select
                        value={formData.homeTeamId}
                        label="Heim"
                        onChange={handleHomeTeamChange}
                        disabled={isReadOnly || !!initialData?.bookingId}
                        MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary } } }}
                    >
                        {teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                    </Select>
                </FormControl>

                <Typography sx={{ color: theme.palette.text.secondary, textAlign: 'center' }}>vs</Typography>

                <FormControl size="small" fullWidth required sx={inputStyle} disabled={isReadOnly || !!initialData?.bookingId || !formData.homeTeamId}>
                    <InputLabel>Auswärts</InputLabel>
                    <Select
                        value={formData.awayTeamId}
                        label="Auswärts"
                        onChange={(e) => setFormData({ ...formData, awayTeamId: e.target.value })}
                        disabled={isReadOnly || !!initialData?.bookingId || !formData.homeTeamId}
                        MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary } } }}
                    >
                        {/* Option anzeigen für das aktuell gewählte Team, auch wenn es nicht mehr verfügbar wäre */}
                        {initialData?.awayTeamId && getAwayTeamStatus(initialData.awayTeamId) === 'hidden' && (
                            <MenuItem value={initialData.awayTeamId}>
                                {teams.find(t => t.id === initialData.awayTeamId)?.name || 'Aktuelles Team'}
                            </MenuItem>
                        )}
                        {teams.map(t => {
                            const status = getAwayTeamStatus(t.id);
                            if (status === 'hidden') return null;

                            return (
                                <MenuItem
                                    key={t.id}
                                    value={t.id}
                                    disabled={status.startsWith('disabled')}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                        <Typography>{t.name}</Typography>
                                        {status === 'disabled_future' && (
                                            <Typography variant="caption" sx={{ color: theme.palette.warning.main, ml: 1 }}>
                                                (Zukunft)
                                            </Typography>
                                        )}
                                    </Box>
                                </MenuItem>
                            );
                        })}
                    </Select>
                </FormControl>

                <Divider sx={{ my: 1, borderColor: theme.palette.divider }} />

                {/* Tore */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TextField
                        size="small"
                        label="Tore Heim"
                        type="number"
                        fullWidth
                        required
                        value={formData.homeScore}
                        onChange={(e) => setFormData({ ...formData, homeScore: e.target.value })}
                        sx={inputStyle}
                        disabled={isReadOnly}
                    />
                    <Typography sx={{ color: 'grey.400' }}>:</Typography>
                    <TextField
                        size="small"
                        label="Tore Auswärts"
                        type="number"
                        fullWidth
                        required
                        value={formData.awayScore}
                        onChange={(e) => setFormData({ ...formData, awayScore: e.target.value })}
                        sx={inputStyle}
                        disabled={isReadOnly}
                    />
                </Box>

                {/* Booking Linking Alert */}
                {matchingBooking && !formData.bookingId && !isReadOnly && (
                    <Box sx={{
                        mt: 1,
                        p: 1.5,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: theme.palette.info.main,
                        bgcolor: `rgba(${parseInt(theme.palette.info.main.slice(1, 3), 16)}, ${parseInt(theme.palette.info.main.slice(3, 5), 16)}, ${parseInt(theme.palette.info.main.slice(5, 7), 16)}, 0.1)`,
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        alignItems: isMobile ? 'flex-start' : 'center',
                        justifyContent: 'space-between',
                        gap: 1
                    }}>
                        <Box>
                            <Typography variant="subtitle2" sx={{ color: theme.palette.info.main, fontWeight: 'bold' }}>
                                Offene Buchung gefunden
                            </Typography>
                            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                                {parseDate(matchingBooking.date)?.toLocaleDateString('de-DE')} • {parseDate(matchingBooking.date)?.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                            </Typography>
                        </Box>
                        <Button
                            variant="outlined"
                            color="info"
                            size="small"
                            onClick={handleLinkBooking}
                            fullWidth={isMobile}
                            sx={{ whiteSpace: 'nowrap' }}
                        >
                            Verknüpfen
                        </Button>
                    </Box>
                )}

                {formData.bookingId && matchingBooking && (
                    <Box sx={{
                        mt: 1,
                        p: 1,
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: theme.palette.success.main,
                        bgcolor: `rgba(${parseInt(theme.palette.success.main.slice(1, 3), 16)}, ${parseInt(theme.palette.success.main.slice(3, 5), 16)}, ${parseInt(theme.palette.success.main.slice(5, 7), 16)}, 0.1)`,
                        textAlign: 'center'
                    }}>
                        <Typography variant="caption" sx={{ color: theme.palette.success.main, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                            <span>✓</span> Mit Buchung verknüpft
                            {!isReadOnly && (
                                <Button
                                    size="small"
                                    color="inherit"
                                    sx={{ minWidth: 'auto', p: 0, ml: 1, textDecoration: 'underline' }}
                                    onClick={() => setFormData({ ...formData, bookingId: null })}
                                >
                                    (Lösen)
                                </Button>
                            )}
                        </Typography>
                    </Box>
                )}

                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 1 }}>
                    <Button variant="outlined" onClick={onCancel} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>
                        Abbrechen
                    </Button>

                    {mode === 'view' && onEdit && (
                        <Button
                            variant="contained"
                            onClick={onEdit}
                            sx={{ backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }}
                        >
                            Bearbeiten
                        </Button>
                    )}

                    {mode !== 'view' && (
                        <Button
                            type="submit"
                            variant="contained"
                            sx={{ backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }}
                        >
                            Speichern
                        </Button>
                    )}
                </Box>
            </Box>
        </form>
    );
};

export default AdminResultForm;
