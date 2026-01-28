import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stepper,
    Step,
    StepLabel,
    Box,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    CircularProgress,
    Alert,
    useTheme,
    useMediaQuery,
    Divider
} from '@mui/material';
import { useAuth } from '../../context/AuthProvider';
import * as pitchApi from '../../services/pitchApiService';
import * as bookingApi from '../../services/bookingApiService';
import * as teamApi from '../../services/teamApiService';
import * as seasonApi from '../../services/seasonApiService';

import AppModal from './AppModal';

const steps = ['Spielart', 'Platzwahl', 'Details & Buchung'];

const CreateGameModal = ({ open, onClose, onGameCreated }) => {
    const { teamId } = useAuth();
    const theme = useTheme();
    // fullScreen logic handled by AppModal

    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Data
    const [teams, setTeams] = useState([]);
    const [pitches, setPitches] = useState([]);
    const [activeSeason, setActiveSeason] = useState(null);
    const [availableSlots, setAvailableSlots] = useState([]);
    const [availableDates, setAvailableDates] = useState([]);
    const [seasonBookings, setSeasonBookings] = useState([]); // All bookings for the season

    // Form State
    const [gameType, setGameType] = useState('league'); // Default: league
    const [pitchSelection, setPitchSelection] = useState(''); // pitchId or 'new'
    const [pitchSourceType, setPitchSourceType] = useState(''); // 'official', 'own', 'new'

    // Pitch Details Form (for own/new)
    const [pitchFormData, setPitchFormData] = useState({
        name: '',
        address: '',
        type: 'Rasen',
        notes: ''
    });

    const [selectedDate, setSelectedDate] = useState(''); // For official: date string. For own: date object/string
    const [selectedTime, setSelectedTime] = useState(''); // For own/new
    const [selectedSlotId, setSelectedSlotId] = useState(''); // For official
    const [opponentId, setOpponentId] = useState('');


    const resetForm = useCallback(() => {
        setActiveStep(0);
        setGameType('league'); // Default: league
        setPitchSelection('');
        setPitchSourceType('');
        setPitchFormData({ name: '', address: '', type: 'Rasen', notes: '' });
        setSelectedDate('');
        setSelectedTime('');
        setSelectedSlotId('');
        setOpponentId('');
        setError('');
        setSuccess('');
    }, []);

    const loadInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [season, teamsData, pitchesData] = await Promise.all([
                seasonApi.getActiveSeason(),
                teamApi.getTeamsForActiveSeason(),
                pitchApi.getVerifiedPitches()
            ]);
            setActiveSeason(season);
            setTeams(teamsData.filter(t => t.id !== teamId)); // Exclude own team
            setPitches(pitchesData);

            // Fetch all bookings to filter opponents
            if (season) {
                const bookings = await bookingApi.getPublicBookingsForSeason(season.id);
                setSeasonBookings(bookings);
            }

        } catch (err) {
            console.error("Error loading data:", err);
            setError("Fehler beim Laden der Daten.");
        } finally {
            setLoading(false);
        }
    }, [teamId]);

    useEffect(() => {
        if (open) {
            loadInitialData();
            resetForm();
        }
    }, [open, loadInitialData, resetForm]);

    const fetchAvailableSlots = useCallback(async () => {
        if (!activeSeason) return;
        try {
            const slots = await bookingApi.getAvailableBookings(activeSeason.id);
            setAvailableSlots(slots);
        } catch (err) {
            console.error("Error fetching slots:", err);
        }
    }, [activeSeason]);

    // Fetch available slots when official pitch is selected (or just fetch all once)
    useEffect(() => {
        if (activeSeason) {
            fetchAvailableSlots();
        }
    }, [activeSeason, fetchAvailableSlots]);

    // Update available dates based on game type and selected pitch (if official)
    useEffect(() => {
        if (pitchSourceType === 'official' && availableSlots.length > 0) {
            // Filter slots based on game type and selected pitch
            const filteredSlots = availableSlots.filter(s => {
                // Must match selected pitch
                if (s.pitchId !== pitchSelection) return false;

                const slotDateMillis = s.date._seconds * 1000;
                const now = Date.now();

                // NEU: Nur zukünftige Termine
                if (slotDateMillis <= now) return false;

                // Friendly filter: If friendly game, slot must be friendly OR released for friendly games by time.
                // If league game, slot must NOT be friendly.
                const releaseHours = activeSeason?.friendlyGamesReleaseHours || 48;
                const releaseMillis = releaseHours * 60 * 60 * 1000;
                const isReleasedByTime = (slotDateMillis - now) < releaseMillis;

                if (gameType === 'friendly') {
                    return s.friendly === true || isReleasedByTime;
                } else {
                    return !s.friendly;
                }
            });

            const dates = [...new Set(filteredSlots.map(s => {
                const d = new Date(s.date._seconds * 1000);
                return d.toLocaleDateString('de-DE');
            }))];
            setAvailableDates(dates);

            // Reset date if not in new list
            if (selectedDate && !dates.includes(selectedDate)) {
                setSelectedDate('');
                setSelectedSlotId('');
            }
        }
    }, [pitchSelection, pitchSourceType, gameType, availableSlots, activeSeason?.friendlyGamesReleaseHours, selectedDate]);

    const handlePitchChange = (e) => {
        const value = e.target.value;
        setPitchSelection(value);

        if (value === 'new') {
            setPitchSourceType('new');
            setPitchFormData({ name: '', address: '', type: 'Rasen', notes: '' });
        } else {
            const pitch = pitches.find(p => p.id === value);
            if (pitch) {
                if (pitch.isVerified) {
                    setPitchSourceType('official');
                } else {
                    setPitchSourceType('own');
                    // Pre-fill form for own pitch
                    setPitchFormData({
                        name: pitch.name,
                        address: pitch.address,
                        type: pitch.type,
                        notes: pitch.notes || ''
                    });
                }
            }
        }
    };

    const handleNext = () => {
        if (activeStep === 0 && !gameType) {
            setError("Bitte wähle eine Spielart.");
            return;
        }
        if (activeStep === 1) {
            if (!pitchSelection) {
                setError("Bitte wähle einen Platz.");
                return;
            }
            if ((pitchSourceType === 'own' || pitchSourceType === 'new') && !pitchFormData.name) {
                setError("Bitte gib dem Platz einen Namen.");
                return;
            }
        }
        setError('');
        setActiveStep((prev) => prev + 1);
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
        setError('');
    };

    const handleSubmit = async () => {
        setError('');
        setLoading(true);
        try {
            let finalPitchId = pitchSelection;

            // 1. Create New Pitch or Update Own Pitch
            if (pitchSourceType === 'new') {
                const createdPitch = await pitchApi.createPitch({ ...pitchFormData, teamId });
                finalPitchId = createdPitch.id;
            } else if (pitchSourceType === 'own') {
                // Update existing pitch
                await pitchApi.updatePitch(finalPitchId, pitchFormData);
            }

            // 2. Create Booking
            if (pitchSourceType === 'official') {
                // Official Slot Booking
                await bookingApi.requestBookingSlot(selectedSlotId, {
                    homeTeamId: teamId,
                    awayTeamId: opponentId,
                    friendly: gameType === 'friendly'
                });
            } else {
                // Validation for custom date/time
                if (!selectedDate || !selectedTime) {
                    throw new Error("Bitte Datum und Uhrzeit wählen.");
                }

                // Time validation 08:00 - 22:00
                const [h, m] = selectedTime.split(':').map(Number);
                if (h < 8 || h > 22 || (h === 22 && m > 0)) {
                    throw new Error("Die Uhrzeit muss zwischen 08:00 und 22:00 Uhr liegen.");
                }

                const [hours, minutes] = selectedTime.split(':');
                const dateTime = new Date(selectedDate);
                dateTime.setHours(parseInt(hours), parseInt(minutes));

                await bookingApi.createCustomBooking({
                    pitchId: finalPitchId,
                    homeTeamId: teamId,
                    awayTeamId: opponentId,
                    seasonId: activeSeason.id,
                    date: dateTime.toISOString(),
                    time: selectedTime,
                    duration: 90, // Standard duration for custom games
                    friendly: gameType === 'friendly'
                });
            }

            setSuccess("Spielanfrage erfolgreich versendet!");
            setTimeout(() => {
                onClose();
                if (onGameCreated) onGameCreated();
            }, 1500);

        } catch (err) {
            console.error("Error creating game:", err);
            setError(err.message || "Fehler beim Erstellen des Spiels.");
        } finally {
            setLoading(false);
        }
    };

    // Helper to format date for input min/max
    const formatDateISO = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    };

    // Calculate constraints
    const getMinDate = () => {
        const today = new Date();
        const seasonStart = activeSeason?.startDate ? new Date(activeSeason.startDate._seconds * 1000) : null;

        let min = today;
        if (seasonStart && seasonStart > today) {
            min = seasonStart;
        }
        return formatDateISO(min);
    };

    const getMaxDate = () => {
        const seasonEnd = activeSeason?.endDate ? new Date(activeSeason.endDate._seconds * 1000) : null;
        return seasonEnd ? formatDateISO(seasonEnd) : '';
    };

    // --- Styles ---
    const activeInputStyle = {
        '& .MuiOutlinedInput-root': {
            '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
            },
        },
        '& .MuiInputLabel-root.Mui-focused': {
            color: theme.palette.primary.main,
        },
        '& .MuiInputBase-input': {
            color: theme.palette.text.primary,
        }
    };

    // --- Filter Teams Logic ---
    const getFilteredTeams = () => {
        if (!activeSeason || gameType === 'friendly') {
            return teams; // No limits for friendly games
        }

        const maxGames = activeSeason.playMode === 'single_round_robin' ? 1 : 2; // Default to 2 (double) if not single

        return teams.filter(opponent => {
            // Count existing bookings between my team and this opponent
            const gamesCount = seasonBookings.filter(b => {
                const isMatch = (b.homeTeamId === teamId && b.awayTeamId === opponent.id) ||
                    (b.homeTeamId === opponent.id && b.awayTeamId === teamId);
                // Only count valid games (not cancelled)
                // Assuming status 'cancelled' or similar exists. If not, check logic.
                // Usually status is 'confirmed', 'pending...', 'completed'.
                // We should probably count everything that is NOT cancelled.
                const isValid = b.status !== 'cancelled' && b.status !== 'declined';
                // Also check if it's a league game (not friendly)
                const isLeague = !b.friendly;

                return isMatch && isValid && isLeague;
            }).length;

            return gamesCount < maxGames;
        });
    };

    const filteredTeams = getFilteredTeams();

    // --- Render Steps ---

    const renderStep1 = () => (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontFamily: 'Comfortaa' }}>Art des Spiels</Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel sx={{ '&.Mui-focused': { color: theme.palette.primary.main } }}>Spielart</InputLabel>
                <Select
                    value={gameType}
                    label="Spielart"
                    onChange={(e) => setGameType(e.target.value)}
                    sx={activeInputStyle}
                >
                    <MenuItem value="league">Ligaspiel</MenuItem>
                    <MenuItem value="friendly">Freundschaftsspiel</MenuItem>
                </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {gameType === 'friendly'
                    ? 'Freundschaftsspiele haben keinen Einfluss auf die Ligatabelle.'
                    : 'Ligespiele unterliegen den Saisonregeln (z.B. max. Begegnungen pro Saison).'}
            </Typography>
        </Box>
    );

    const renderStep2 = () => {
        // Group pitches for display
        const officialPitches = pitches.filter(p => p.isVerified);
        const myPitches = pitches.filter(p => p.teamId === teamId && !p.isVerified);

        return (
            <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontFamily: 'Comfortaa' }}>Platzwahl</Typography>

                <Alert severity="info" sx={{ mb: 2, bgcolor: 'rgba(0, 169, 157, 0.1)', color: theme.palette.text.primary }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Offizielle Plätze:</strong> Hier können nur vom Liga-Management freigegebene Zeitslots gebucht werden.
                    </Typography>
                    <Typography variant="body2">
                        <strong>Eigene Plätze:</strong> Datum und Uhrzeit sind frei wählbar.
                    </Typography>
                </Alert>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel sx={{ '&.Mui-focused': { color: theme.palette.primary.main } }}>Platz auswählen</InputLabel>
                    <Select
                        value={pitchSelection}
                        label="Platz auswählen"
                        onChange={handlePitchChange}
                        sx={activeInputStyle}
                    >
                        <MenuItem value="new" sx={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>
                            + Neuer Platz
                        </MenuItem>
                        <Divider />
                        {myPitches.length > 0 && [
                            <MenuItem disabled key="header-own" sx={{ opacity: 1, fontWeight: 'bold', fontSize: '0.8rem' }}>Eigene Plätze</MenuItem>,
                            ...myPitches.map(p => (
                                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                            )),
                            <Divider key="div-own" />
                        ]}
                        <MenuItem disabled sx={{ opacity: 1, fontWeight: 'bold', fontSize: '0.8rem' }}>Offizielle Plätze</MenuItem>
                        {officialPitches.map(p => (
                            <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Form for Own/New Pitches */}
                {(pitchSourceType === 'own' || pitchSourceType === 'new') && (
                    <Box sx={{ mt: 2, p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, color: theme.palette.text.secondary }}>
                            {pitchSourceType === 'new' ? 'Neuen Platz anlegen' : 'Platzdaten bearbeiten'}
                        </Typography>
                        <TextField
                            label="Name des Platzes"
                            fullWidth
                            sx={{ mb: 2, ...activeInputStyle }}
                            value={pitchFormData.name}
                            onChange={(e) => setPitchFormData({ ...pitchFormData, name: e.target.value })}
                        />
                        <TextField
                            label="Adresse"
                            fullWidth
                            sx={{ mb: 2, ...activeInputStyle }}
                            value={pitchFormData.address}
                            onChange={(e) => setPitchFormData({ ...pitchFormData, address: e.target.value })}
                        />
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel sx={{ '&.Mui-focused': { color: theme.palette.primary.main } }}>Belag</InputLabel>
                            <Select
                                value={pitchFormData.type}
                                label="Belag"
                                onChange={(e) => setPitchFormData({ ...pitchFormData, type: e.target.value })}
                                sx={activeInputStyle}
                            >
                                <MenuItem value="Rasen">Rasen</MenuItem>
                                <MenuItem value="Kunstrasen">Kunstrasen</MenuItem>
                                <MenuItem value="Hartplatz">Hartplatz</MenuItem>
                                <MenuItem value="Bolzplatz">Bolzplatz</MenuItem>
                                <MenuItem value="Sonstiges">Sonstiges</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Notizen"
                            fullWidth
                            multiline
                            rows={2}
                            value={pitchFormData.notes}
                            onChange={(e) => setPitchFormData({ ...pitchFormData, notes: e.target.value })}
                            sx={activeInputStyle}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                            Hinweis: Für die Verfügbarkeit und Bespielbarkeit eigener Plätze ist das Team selbst verantwortlich.
                        </Typography>
                    </Box>
                )}
            </Box>
        );
    };

    const renderStep3 = () => {
        const pitchName = pitchSourceType === 'new'
            ? (pitchFormData.name || 'Neuer Platz')
            : (pitches.find(p => p.id === pitchSelection)?.name || 'Unbekannter Platz');

        return (
            <Box sx={{ mt: 2 }}>
                {/* Summary Header */}
                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontFamily: 'Comfortaa', fontWeight: 700, color: theme.palette.primary.main }}>
                        {gameType === 'friendly' ? 'Freundschaftsspiel' : 'Ligaspiel'}
                    </Typography>
                    <Typography variant="h6" sx={{ fontFamily: 'Comfortaa' }}>
                        {pitchName}
                    </Typography>
                    {pitchFormData.address && (
                        <Typography variant="caption" color="text.secondary">
                            {pitchFormData.address}
                        </Typography>
                    )}
                </Box>

                <Divider sx={{ mb: 3 }} />

                <Typography variant="h6" gutterBottom sx={{ fontFamily: 'Comfortaa' }}>Details & Buchung</Typography>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel sx={{ '&.Mui-focused': { color: theme.palette.primary.main } }}>Gegner</InputLabel>
                    <Select
                        value={opponentId}
                        label="Gegner"
                        onChange={(e) => setOpponentId(e.target.value)}
                        sx={activeInputStyle}
                    >
                        {filteredTeams.map(t => (
                            <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                        ))}
                    </Select>
                    {filteredTeams.length === 0 && (
                        <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                            Keine möglichen Gegner mehr verfügbar (Saisonlimit erreicht).
                        </Typography>
                    )}
                </FormControl>

                {pitchSourceType === 'official' ? (
                    <>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel sx={{ '&.Mui-focused': { color: theme.palette.primary.main } }}>Datum</InputLabel>
                            <Select
                                value={selectedDate}
                                label="Datum"
                                onChange={(e) => {
                                    setSelectedDate(e.target.value);
                                    setSelectedSlotId(''); // Reset slot when date changes
                                }}
                                sx={activeInputStyle}
                            >
                                {availableDates.length > 0 ? (
                                    availableDates.map(date => (
                                        <MenuItem key={date} value={date}>{date}</MenuItem>
                                    ))
                                ) : (
                                    <MenuItem disabled>Keine Termine verfügbar</MenuItem>
                                )}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth disabled={!selectedDate}>
                            <InputLabel sx={{ '&.Mui-focused': { color: theme.palette.primary.main } }}>Verfügbare Slots</InputLabel>
                            <Select
                                value={selectedSlotId}
                                label="Verfügbare Slots"
                                onChange={(e) => setSelectedSlotId(e.target.value)}
                                sx={activeInputStyle}
                            >
                                {availableSlots
                                    .filter(s => {
                                        const slotDateMillis = s.date._seconds * 1000;
                                        const d = new Date(slotDateMillis);
                                        const now = Date.now();

                                        // Date match
                                        if (d.toLocaleDateString('de-DE') !== selectedDate) return false;
                                        // Pitch match
                                        if (s.pitchId !== pitchSelection) return false;
                                        // Future match
                                        if (slotDateMillis <= now) return false;

                                        // Friendly match
                                        const releaseHours = activeSeason?.friendlyGamesReleaseHours || 48;
                                        const releaseMillis = releaseHours * 60 * 60 * 1000;
                                        const isReleasedByTime = (slotDateMillis - now) < releaseMillis;

                                        if (gameType === 'friendly') {
                                            return s.friendly === true || isReleasedByTime;
                                        }
                                        return !s.friendly;
                                    })
                                    .map(s => {
                                        const d = new Date(s.date._seconds * 1000);
                                        const time = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                                        // Resolve pitch name from pitches list
                                        // const pName = pitches.find(p => p.id === s.pitchId)?.name || 'Unbekannter Platz';
                                        return (
                                            <MenuItem key={s.id} value={s.id}>
                                                {time} Uhr
                                            </MenuItem>
                                        );
                                    })}
                            </Select>
                        </FormControl>
                    </>
                ) : (
                    <>
                        <TextField
                            label="Datum"
                            type="date"
                            fullWidth
                            sx={{ mb: 2, ...activeInputStyle }}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{
                                min: getMinDate(),
                                max: getMaxDate()
                            }}
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                        <TextField
                            label="Uhrzeit"
                            type="time"
                            fullWidth
                            sx={{ ...activeInputStyle }}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{
                                min: "08:00",
                                max: "22:00"
                            }}
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            helperText="Zwischen 08:00 und 22:00 Uhr"
                        />
                    </>
                )}
            </Box>
        );
    };

    const actionButtons = (
        <>
            <Button onClick={onClose} color="inherit">
                Abbrechen
            </Button>
            <Box sx={{ flex: '1 1 auto' }} />
            {activeStep > 0 && (
                <Button onClick={handleBack} sx={{ mr: 1 }}>
                    Zurück
                </Button>
            )}
            {activeStep < steps.length - 1 ? (
                <Button onClick={handleNext} variant="contained">
                    Weiter
                </Button>
            ) : (
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color="primary"
                    disabled={loading || success}
                >
                    {loading ? <CircularProgress size={24} /> : 'Spiel anfragen'}
                </Button>
            )}
        </>
    );

    return (
        <AppModal
            open={open}
            onClose={onClose}
            title="Neues Spiel erstellen"
            actions={actionButtons}
            loading={loading}
        >
            <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
                {steps.map((label) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            {activeStep === 0 && renderStep1()}
            {activeStep === 1 && renderStep2()}
            {activeStep === 2 && renderStep3()}
        </AppModal>
    );
};

export default CreateGameModal;


