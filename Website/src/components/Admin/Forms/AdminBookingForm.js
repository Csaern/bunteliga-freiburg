import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Divider, Alert, CircularProgress, Typography, useTheme, useMediaQuery } from '@mui/material';
import * as bookingApiService from '../../../services/bookingApiService';
import * as teamApiService from '../../../services/teamApiService';

const AdminBookingForm = ({
    initialData,
    currentSeason,
    allPitches,
    allTeams,
    onSubmit,
    onCancel,
    onEdit,
    onDelete,
    mode = 'create' // 'create' | 'edit' | 'view'
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const isReadOnly = mode === 'view';

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

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        pitchId: '',
        homeTeamId: '',
        awayTeamId: '',
        isAvailable: true,
        duration: 90,
        friendly: false,
        status: 'available'
    });

    const [collisionCheck, setCollisionCheck] = useState({ status: 'idle', message: '' });
    const [potentialOpponents, setPotentialOpponents] = useState([]);
    const [isOpponentLoading, setIsOpponentLoading] = useState(false);

    // Initialize Data
    useEffect(() => {
        if (initialData) {
            const getSafeDate = (d) => {
                if (!d) return new Date();
                if (d instanceof Date) return d;
                if (typeof d?.toDate === 'function') return d.toDate(); // Firestore Timestamp
                if (d?._seconds) return new Date(d._seconds * 1000); // Firestore timestamp serialized
                return new Date(d); // String or other
            };

            const dateObj = getSafeDate(initialData.date);
            const isValidDate = !isNaN(dateObj.getTime());

            const dateStr = isValidDate ? dateObj.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            const timeStr = isValidDate ? dateObj.toTimeString().slice(0, 5) : (initialData.time || '10:00');

            setFormData({
                date: dateStr,
                time: timeStr,
                pitchId: initialData.pitchId || '',
                homeTeamId: initialData.homeTeamId || '',
                awayTeamId: initialData.awayTeamId || '',
                duration: initialData.duration || 90,
                isAvailable: initialData.status === 'available',
                friendly: initialData.friendly || false,
                status: initialData.status || 'available'
            });
        }
    }, [initialData]);

    // Collision Check
    useEffect(() => {
        const checkCollision = async () => {
            if (mode === 'view') return; // Don't check in view mode

            const { date, time, pitchId, duration } = formData;
            if (!date || !time || !pitchId || !duration) {
                setCollisionCheck({ status: 'idle', message: '' });
                return;
            }

            const selectedPitch = allPitches.find(p => p.id === pitchId);
            if (!selectedPitch || !selectedPitch.isVerified) {
                setCollisionCheck({ status: 'idle', message: '' });
                return;
            }

            // Check if ignored (same as current if editing)
            if (mode === 'edit' && initialData) {
                // Determine original values for comparison
                const getSafeDate = (d) => {
                    if (!d) return null;
                    if (d instanceof Date) return d;
                    if (typeof d?.toDate === 'function') return d.toDate();
                    if (d?._seconds) return new Date(d._seconds * 1000);
                    return new Date(d);
                };

                const originalDateObj = getSafeDate(initialData.date);
                if (originalDateObj && !isNaN(originalDateObj.getTime())) {
                    const originalDateStr = originalDateObj.toISOString().split('T')[0];
                    const originalTimeStr = originalDateObj.toTimeString().slice(0, 5);

                    if (date === originalDateStr && time === originalTimeStr && pitchId === initialData.pitchId) {
                        setCollisionCheck({ status: 'success', message: 'Keine Änderung an Termin/Platz.' });
                        return;
                    }
                }
            }

            setCollisionCheck({ status: 'checking', message: 'Prüfe Verfügbarkeit...' });

            try {
                const combinedDate = new Date(`${date}T${time}`);
                if (isNaN(combinedDate.getTime())) {
                    setCollisionCheck({ status: 'idle', message: '' });
                    return;
                }

                const dataToSend = {
                    pitchId,
                    date: combinedDate.toISOString(),
                    duration,
                    bookingIdToIgnore: mode === 'edit' ? initialData?.id : null
                };

                const result = await bookingApiService.checkSingleSlot(dataToSend);

                if (result.isAvailable) {
                    setCollisionCheck({ status: 'success', message: 'Dieser Termin ist verfügbar.' });
                } else {
                    setCollisionCheck({ status: 'error', message: `Der Platz ist belegt` });
                }
            } catch (error) {
                setCollisionCheck({ status: 'idle', message: 'Prüfung fehlgeschlagen.' });
            }
        };

        const handler = setTimeout(() => {
            checkCollision();
        }, 500);

        return () => clearTimeout(handler);
    }, [formData.date, formData.time, formData.pitchId, formData.duration, mode, allPitches, initialData]);

    // Fetch Opponents
    // Fetch Opponents
    useEffect(() => {
        const fetchOpponents = async () => {
            if (!formData.homeTeamId) {
                setPotentialOpponents([]);
                return;
            }

            // If we are in view mode, we might not need to fetch, but it doesn't hurt.
            // Importantly, we do NOT reset awayTeamId here anymore.

            setIsOpponentLoading(true);
            try {
                const opponents = await teamApiService.getPotentialOpponents(formData.homeTeamId);
                setPotentialOpponents(opponents);
            } catch (error) {
                console.error('Error fetching opponents', error);
                setPotentialOpponents([]);
            } finally {
                setIsOpponentLoading(false);
            }
        };

        fetchOpponents();
    }, [formData.homeTeamId]);

    const getTeamName = (teamId) => {
        if (!teamId) return null;
        const team = allTeams.find(t => t.id === teamId);
        return team ? team.name : 'Unbekannt';
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                        size="small" label="Datum" type="date" fullWidth
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        InputLabelProps={{ shrink: true }} required sx={inputStyle} disabled={isReadOnly}
                    />
                    <TextField
                        size="small" label="Uhrzeit" type="time" fullWidth
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        InputLabelProps={{ shrink: true }} required sx={inputStyle} disabled={isReadOnly}
                    />
                </Box>

                <FormControl size="small" fullWidth required sx={inputStyle} disabled={isReadOnly}>
                    <InputLabel>Dauer (Minuten)</InputLabel>
                    <Select
                        value={formData.duration}
                        label="Dauer (Minuten)"
                        onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                        MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary } } }}
                    >
                        <MenuItem value={90}>90 Minuten</MenuItem>
                        <MenuItem value={120}>120 Minuten</MenuItem>
                    </Select>
                </FormControl>

                <FormControl size="small" fullWidth required sx={inputStyle} disabled={isReadOnly}>
                    <InputLabel>Platz</InputLabel>
                    <Select
                        value={formData.pitchId}
                        label="Platz"
                        onChange={(e) => setFormData({ ...formData, pitchId: e.target.value })}
                        MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary } } }}
                    >
                        {allPitches.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                    </Select>
                </FormControl>

                {collisionCheck.status !== 'idle' && (
                    <Alert
                        severity={collisionCheck.status === 'success' ? 'success' : collisionCheck.status === 'error' ? 'error' : 'info'}
                        icon={collisionCheck.status === 'checking' ? <CircularProgress size={20} /> : null}
                        sx={{
                            mt: 1,
                            bgcolor: collisionCheck.status === 'error' ? 'rgba(211, 47, 47, 0.1)' : 'rgba(46, 125, 50, 0.1)',
                            color: collisionCheck.status === 'error' ? '#ffcdd2' : '#a5d6a7'
                        }}
                    >
                        {collisionCheck.message}
                    </Alert>
                )}

                <Divider sx={{ my: 1, borderColor: theme.palette.divider }} />

                <FormControl size="small" fullWidth sx={inputStyle} disabled={isReadOnly}>
                    <InputLabel>Heim</InputLabel>
                    <Select
                        value={formData.homeTeamId}
                        label="Heim"
                        onChange={(e) => setFormData({ ...formData, homeTeamId: e.target.value, awayTeamId: '' })} // Reset away team on change
                        MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary } } }}
                    >
                        <MenuItem value=""><em>-</em></MenuItem>
                        {allTeams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                    </Select>
                </FormControl>

                <Typography sx={{ color: theme.palette.text.secondary, textAlign: 'center' }}>vs</Typography>

                <FormControl size="small" fullWidth sx={inputStyle} disabled={isReadOnly || !formData.homeTeamId}>
                    <InputLabel>Auswärts</InputLabel>
                    <Select
                        value={formData.awayTeamId}
                        label="Auswärts"
                        onChange={(e) => setFormData({ ...formData, awayTeamId: e.target.value })}
                        MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary } } }}
                    >
                        <MenuItem value=""><em>-</em></MenuItem>
                        {formData.awayTeamId && (
                            <MenuItem value={formData.awayTeamId}>
                                {getTeamName(formData.awayTeamId) || 'Unbekanntes Team'}
                            </MenuItem>
                        )}
                        {potentialOpponents
                            .filter(t => t.id !== formData.awayTeamId)
                            .map(opponent => (
                                <MenuItem key={opponent.id} value={opponent.id}>
                                    {opponent.name}
                                </MenuItem>
                            ))
                        }
                    </Select>
                </FormControl>

                <Divider sx={{ my: 1, borderColor: theme.palette.divider }} />

                <FormControl size="small" fullWidth sx={inputStyle} disabled={isReadOnly}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={formData.status}
                        label="Status"
                        onChange={(e) => {
                            const newStatus = e.target.value;
                            setFormData({ ...formData, status: newStatus, isAvailable: newStatus === 'available' });
                        }}
                        MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary } } }}
                    >
                        <MenuItem value="available" disabled={!!formData.homeTeamId || !!formData.awayTeamId}>Verfügbar</MenuItem>
                        <MenuItem value="pending_away_confirm">Anfrage von Heimteam</MenuItem>
                        <MenuItem value="confirmed">Bestätigt</MenuItem>
                        <MenuItem value="cancelled">Abgesagt</MenuItem>
                        <MenuItem value="blocked">Gesperrt</MenuItem>
                    </Select>
                </FormControl>

                {(formData.status === 'cancelled' || formData.status === 'blocked') && (
                    <Alert severity="warning" sx={{ mt: 1, bgcolor: 'rgba(237, 108, 2, 0.1)', color: '#ffcc80' }}>
                        {formData.status === 'cancelled'
                            ? 'Achtung: Wenn Sie speichern, wird die Buchung wieder freigegeben (Status: Verfügbar, Teams werden entfernt).'
                            : 'Achtung: Wenn Sie speichern, wird der Platz gesperrt und die Teams werden entfernt.'}
                    </Alert>
                )}

                <FormControlLabel
                    control={<Checkbox
                        checked={formData.friendly}
                        onChange={(e) => setFormData({ ...formData, friendly: e.target.checked })}
                        sx={{ color: theme.palette.text.secondary, '&.Mui-checked': { color: '#FFD700' }, '&.Mui-disabled': { color: theme.palette.action.disabled } }}
                        disabled={isReadOnly}
                    />}
                    label={<Typography sx={{ color: theme.palette.text.primary }}>Freundschaftsspiel</Typography>}
                />

                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
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

                    {mode === 'view' && onDelete && (
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={onDelete}
                        >
                            Löschen
                        </Button>
                    )}

                    {mode !== 'view' && (
                        <Button
                            type="submit"
                            variant="contained"
                            sx={{ backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }}
                            disabled={collisionCheck.status === 'error' || collisionCheck.status === 'checking'}
                        >
                            {mode === 'create' ? 'Erstellen' : 'Speichern'}
                        </Button>
                    )}
                </Box>
            </Box>
        </form>
    );
};

export default AdminBookingForm;
