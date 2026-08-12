import React, { useState, useEffect, useCallback } from 'react';
import {
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
    Divider,
    Button,
    RadioGroup,
    FormControlLabel,
    Radio,
    Checkbox,
    ListItemText
} from '@mui/material';
import { useAuth } from '../../context/AuthProvider';
import * as pitchApi from '../../services/pitchApiService';
import * as bookingApi from '../../services/bookingApiService';
import * as teamApi from '../../services/teamApiService';
import * as seasonApi from '../../services/seasonApiService';
import * as matchApi from '../../services/matchApiService'; // NEU: Isolierte API
import AppModal from './AppModal';

const steps = ['Spielart', 'Platzwahl', 'Details & Buchung'];

const CreateGameModal = ({ open, onClose, onGameCreated }) => {
    const { teamId } = useAuth();
    const theme = useTheme();

    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // --- DATA ---
    const [teams, setTeams] = useState([]);
    const [pitches, setPitches] = useState([]);
    const [activeSeason, setActiveSeason] = useState(null);
    const [seasonBookings, setSeasonBookings] = useState([]); // All bookings to check limits AND +/- 2 days
    const [scFreiburgDates, setScFreiburgDates] = useState([]); // YYYY-MM-DD
    const [availableSlots, setAvailableSlots] = useState([]);

    // --- STEP 1: Spielart ---
    const [gameType, setGameType] = useState('league');

    // --- STEP 2: Platzwahl ---
    const [pitchCategory, setPitchCategory] = useState('official'); // 'official' | 'own'
    const [officialPitchSelections, setOfficialPitchSelections] = useState([]); // Array of pitchIds
    const [ownPitchSelection, setOwnPitchSelection] = useState(''); // pitchId or 'new'
    
    // Pitch Details Form (for own/new)
    const [pitchFormData, setPitchFormData] = useState({
        name: '', address: '', type: 'Rasen', notes: ''
    });

    // --- STEP 3: Details ---
    const [opponentId, setOpponentId] = useState('');
    const [selectedDate, setSelectedDate] = useState(''); // String YYYY-MM-DD or localised date string
    const [selectedSlotId, setSelectedSlotId] = useState(''); // For official
    const [selectedTime, setSelectedTime] = useState(''); // For own/new

    const [bwHolidays, setBwHolidays] = useState({ publicHolidays: [], schoolHolidays: [] });

    const resetForm = useCallback(() => {
        setActiveStep(0);
        setGameType('league');
        setPitchCategory('official');
        setOfficialPitchSelections([]);
        setOwnPitchSelection('');
        setPitchFormData({ name: '', address: '', type: 'Rasen', notes: '' });
        setOpponentId('');
        setSelectedDate('');
        setSelectedSlotId('');
        setSelectedTime('');
        setError('');
        setSuccess('');
    }, []);

    const loadInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [season, teamsData, pitchesData, scDates, holidays] = await Promise.all([
                seasonApi.getActiveSeason(),
                teamApi.getTeamsForActiveSeason(),
                pitchApi.getVerifiedPitches(),
                matchApi.getScFreiburgHomeGames().catch(() => []), // Fallback to empty array
                matchApi.getBWHolidays().catch(() => ({ publicHolidays: [], schoolHolidays: [] }))
            ]);
            setActiveSeason(season);
            setTeams(teamsData.filter(t => t.id !== teamId));
            setPitches(pitchesData);
            setScFreiburgDates(scDates);
            setBwHolidays(holidays);

            if (season) {
                const [bookings, slots] = await Promise.all([
                    bookingApi.getPublicBookingsForSeason(season.id),
                    bookingApi.getAvailableBookings(season.id)
                ]);
                setSeasonBookings(bookings);
                setAvailableSlots(slots);
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

    // Cleanup Step 3 when opponent changes
    useEffect(() => {
        setSelectedDate('');
        setSelectedSlotId('');
        setSelectedTime('');
    }, [opponentId]);

    // Handle Pitch Selection Changes
    const handleOfficialPitchChange = (event) => {
        const value = event.target.value;
        setOfficialPitchSelections(typeof value === 'string' ? value.split(',') : value);
    };

    const handleOwnPitchChange = (e) => {
        const value = e.target.value;
        setOwnPitchSelection(value);
        if (value === 'new') {
            setPitchFormData({ name: '', address: '', type: 'Rasen', notes: '' });
        } else {
            const pitch = pitches.find(p => p.id === value);
            if (pitch) {
                setPitchFormData({
                    name: pitch.name, address: pitch.address, type: pitch.type, notes: pitch.notes || ''
                });
            }
        }
    };


    // --- HELPERS ---
    const formatDateISO = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        // Correctly shift by timezone to get literal local date
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    };

    const isDateWithin2Days = (dateA, dateB) => {
        const msPerDay = 1000 * 60 * 60 * 24;
        const diff = Math.abs(dateA.getTime() - dateB.getTime());
        return diff <= (2 * msPerDay);
    };

    // --- OPPONENT DATA ---
    const getFilteredTeams = () => {
        if (!activeSeason || gameType === 'friendly') return teams;
        const maxGames = activeSeason.playMode === 'single_round_robin' ? 1 : 2; 
        return teams.filter(opponent => {
            const gamesCount = seasonBookings.filter(b => {
                const isMatch = (b.homeTeamId === teamId && b.awayTeamId === opponent.id) ||
                                (b.homeTeamId === opponent.id && b.awayTeamId === teamId);
                const isValid = b.status !== 'cancelled' && b.status !== 'declined';
                return isMatch && isValid && !b.friendly;
            }).length;
            return gamesCount < maxGames;
        });
    };
    const filteredTeams = getFilteredTeams();

    // Check +/- 2 Days conditions for a specific date (YYYY-MM-DD or Date object)
    const checkDateStatusForOpponent = (checkDateObj) => {
        if (!opponentId) return { disabled: false, warning: false, isScFreiburg: false };
        
        let hasConfirmedGame = false;
        let hasPendingRequest = false;

        // Opponent's existing bookings
        const opponentGames = seasonBookings.filter(b => 
            (b.homeTeamId === opponentId || b.awayTeamId === opponentId) && 
            b.status !== 'cancelled' && b.status !== 'declined'
        );

        for (const game of opponentGames) {
            const gameDateObj = new Date(game.date._seconds ? game.date._seconds * 1000 : game.date);
            if (isDateWithin2Days(checkDateObj, gameDateObj)) {
                if (game.status === 'confirmed' || game.status === 'booked' || game.status === 'completed') {
                    hasConfirmedGame = true;
                    break; 
                }
                if (game.status === 'pending_home_confirm' || game.status === 'pending_away_confirm') {
                    hasPendingRequest = true;
                }
            }
        }

        const dateISO = formatDateISO(checkDateObj);
        const isScFreiburg = scFreiburgDates.includes(dateISO);

        // Check BW Holidays
        const pubH = bwHolidays.publicHolidays?.find(h => dateISO >= h.startDate && dateISO <= h.endDate);
        const schH = bwHolidays.schoolHolidays?.find(h => dateISO >= h.startDate && dateISO <= h.endDate);

        return {
            disabled: hasConfirmedGame, // Grau/Unklickbar
            warning: hasPendingRequest, // Gelb
            isScFreiburg: isScFreiburg, // Rot
            publicHoliday: pubH ? pubH.name : null,
            schoolHoliday: schH ? schH.name : null
        };
    };

    // --- OFFICIAL DATES LOGIC ---
    // Generate valid dates strictly from the slots in the selected OFFICIAL pitches
    const getOfficialDatesOptions = () => {
        if (!officialPitchSelections.length || pitchCategory !== 'official' || !activeSeason || !opponentId) return [];
        
        const now = Date.now();
        const releaseHours = activeSeason?.friendlyGamesReleaseHours || 48;
        const releaseMillis = releaseHours * 60 * 60 * 1000;

        // Filter valid slots
        const validSlots = availableSlots.filter(s => {
            if (!officialPitchSelections.includes(s.pitchId)) return false;
            
            const slotDateMillis = s.date._seconds * 1000;
            if (slotDateMillis <= now) return false;

            const isReleasedByTime = (slotDateMillis - now) < releaseMillis;
            if (gameType === 'friendly') {
                return s.friendly === true || isReleasedByTime;
            }
            return !s.friendly;
        });

        // Group by Date String (Lokalisierte Ansicht als Key)
        const dateMap = new Map();
        
        validSlots.forEach(s => {
            const dObj = new Date(s.date._seconds * 1000);
            
            // Check status for filtering OUT hard collisions
            const status = checkDateStatusForOpponent(dObj);
            
            const keyStr = dObj.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
            
            if (!dateMap.has(keyStr)) {
                dateMap.set(keyStr, {
                    dateStr: keyStr,
                    dateObj: dObj,
                    pitchesPresent: new Set(),
                    warning: status.warning,
                    isScFreiburg: status.isScFreiburg,
                    disabled: status.disabled,
                    publicHoliday: status.publicHoliday,
                    schoolHoliday: status.schoolHoliday
                });
            }
            const record = dateMap.get(keyStr);
            record.pitchesPresent.add(s.pitchId);
        });

        // WICHTIG: Die Keys im dateMap nach echtem Datum sortieren
        const sortedEntries = Array.from(dateMap.values()).sort((a, b) => a.dateObj - b.dateObj);

        return sortedEntries.map(r => {
            const numPitches = r.pitchesPresent.size;
            let pitchNameSuffix = '';
            if (numPitches === 1) {
                const pid = Array.from(r.pitchesPresent)[0];
                const p = pitches.find(x => x.id === pid);
                pitchNameSuffix = p ? p.name : '1 Platz';
            } else {
                pitchNameSuffix = `${numPitches} Plätze`; 
            }

            return {
                valueStr: r.dateStr,
                dateStr: r.dateStr,
                pitchNameSuffix: pitchNameSuffix,
                warning: r.warning,
                isScFreiburg: r.isScFreiburg,
                disabled: r.disabled,
                publicHoliday: r.publicHoliday,
                schoolHoliday: r.schoolHoliday
            };
        });
    };

    const officialDateOptions = getOfficialDatesOptions();

    // Valid Slots for the exact selected Official Date
    const getSlotsForSelectedDate = () => {
        if (!selectedDate) return [];
        return availableSlots
            .filter(s => {
                const dObj = new Date(s.date._seconds * 1000);
                const dStr = dObj.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
                return dStr === selectedDate && officialPitchSelections.includes(s.pitchId) && (dObj.getTime() > Date.now());
            })
            .filter(s => {
                const slotDateMillis = s.date._seconds * 1000;
                const releaseMillis = (activeSeason?.friendlyGamesReleaseHours || 48) * 60 * 60 * 1000;
                const isReleasedByTime = (slotDateMillis - Date.now()) < releaseMillis;
                if (gameType === 'friendly') return s.friendly || isReleasedByTime;
                return !s.friendly;
            })
            .map(s => {
                const dObj = new Date(s.date._seconds * 1000);
                const time = dObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                const pitch = pitches.find(p => p.id === s.pitchId);
                const multiPrefix = officialPitchSelections.length > 1 && pitch ? `${pitch.name} - ` : '';
                
                return {
                    id: s.id,
                    label: `${multiPrefix}${time} Uhr`
                };
            });
    };
    const officialSlotOptions = getSlotsForSelectedDate();


    // --- CUSTOM DATES LOGIC ---
    // Constraints for <input type="date">
    const getMinDate = () => {
        const today = new Date();
        const seasonStart = activeSeason?.startDate ? new Date(activeSeason.startDate._seconds * 1000) : null;
        return formatDateISO((seasonStart && seasonStart > today) ? seasonStart : today);
    };

    const getMaxDate = () => {
        const seasonEnd = activeSeason?.endDate ? new Date(activeSeason.endDate._seconds * 1000) : null;
        return seasonEnd ? formatDateISO(seasonEnd) : '';
    };

    // Re-validate custom date anytime it changes (to show error/warnings below it)
    let customDateStatus = null;
    if (pitchCategory === 'own' && selectedDate && opponentId) {
        try {
            // Check if selectedDate is valid YYYY-MM-DD before passing to Date
            if (selectedDate && selectedDate.includes('-')) {
                customDateStatus = checkDateStatusForOpponent(new Date(selectedDate));
            }
        } catch (e) {
            console.error("Invalid date string for custom date status:", selectedDate);
        }
    }


    // --- SUBMISSION ---
    const handleNext = () => {
        if (activeStep === 0 && !gameType) return setError("Bitte wähle eine Spielart.");
        if (activeStep === 1) {
            if (pitchCategory === 'official' && officialPitchSelections.length === 0) {
                return setError("Bitte wähle mindestens einen offiziellen Platz.");
            }
            if (pitchCategory === 'own') {
                if (!ownPitchSelection) return setError("Bitte wähle einen eigenen Platz.");
                if (ownPitchSelection === 'new' && !pitchFormData.name) return setError("Bitte gib dem Platz einen Namen.");
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
        if (customDateStatus?.disabled) {
            return setError("Der Gegner hat an/um dieses Datum bereits ein Spiel. Bitte wähle ein anderes.");
        }

        setError('');
        setLoading(true);
        try {
            if (pitchCategory === 'official') {
                // Official via NEW ROUTES
                await matchApi.requestOfficialMatch({
                    slotId: selectedSlotId,
                    homeTeamId: teamId,
                    awayTeamId: opponentId,
                    friendly: gameType === 'friendly'
                });
            } else {
                // Own Pitch via NEW ROUTES
                if (!selectedDate || !selectedTime) throw new Error("Bitte Datum und Uhrzeit wählen.");
                
                let finalPitchId = ownPitchSelection;
                if (ownPitchSelection === 'new') {
                    const createdPitch = await pitchApi.createPitch({ ...pitchFormData, teamId });
                    finalPitchId = createdPitch.id;
                } else {
                    await pitchApi.updatePitch(finalPitchId, pitchFormData);
                }

                const [h, m] = selectedTime.split(':').map(Number);
                if (h < 8 || h > 22 || (h === 22 && m > 0)) {
                    throw new Error("Uhrzeit muss zwischen 08:00 und 22:00 Uhr liegen.");
                }

                const dateTime = new Date(selectedDate);
                dateTime.setHours(parseInt(h), parseInt(m));

                await matchApi.createCustomMatch({
                    pitchId: finalPitchId,
                    homeTeamId: teamId,
                    awayTeamId: opponentId,
                    seasonId: activeSeason.id,
                    date: dateTime.toISOString(),
                    time: selectedTime,
                    duration: 90,
                    friendly: gameType === 'friendly'
                });
            }
            setSuccess("Anfrage erfolgreich versendet!");
            setTimeout(() => { onClose(); if (onGameCreated) onGameCreated(); }, 1500);
        } catch (err) {
            setError(err.message || "Fehler beim Erstellen.");
        } finally {
            setLoading(false);
        }
    };


    // --- STYLES ---
    const activeInputStyle = {
        '& .MuiOutlinedInput-root': {
            '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main }
        },
        '& .MuiInputLabel-root.Mui-focused': { color: theme.palette.primary.main },
    };

    const menuProps = {
        PaperProps: {
            sx: {
                maxHeight: 300,
                '&::-webkit-scrollbar': {
                    width: '6px',
                },
                '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                    background: theme.palette.mode === 'dark' ? '#555' : '#ccc',
                    borderRadius: '3px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                    background: theme.palette.mode === 'dark' ? '#777' : '#aaa',
                },
            }
        }
    };


    // --- RENDERERS ---
    const renderStep1 = () => (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontFamily: 'Comfortaa' }}>Art des Spiels</Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel sx={{ '&.Mui-focused': { color: theme.palette.primary.main } }}>Spielart</InputLabel>
                <Select value={gameType} label="Spielart" onChange={(e) => setGameType(e.target.value)} sx={activeInputStyle} MenuProps={menuProps}>
                    <MenuItem value="league">Ligaspiel</MenuItem>
                    <MenuItem value="friendly">Freundschaftsspiel</MenuItem>
                </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {gameType === 'friendly' ? 'Freundschaftsspiele haben keinen Einfluss auf die Ligatabelle.' : 'Ligespiele unterliegen den Saisonregeln.'}
            </Typography>
        </Box>
    );

    const renderStep2 = () => {
        const officialPitches = pitches.filter(p => p.isVerified);
        const myPitches = pitches.filter(p => p.teamId === teamId && !p.isVerified);

        return (
            <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontFamily: 'Comfortaa' }}>Kategorie</Typography>
                
                <FormControl component="fieldset" sx={{ mb: 3 }}>
                    <RadioGroup 
                        row 
                        value={pitchCategory} 
                        onChange={(e) => {
                            setPitchCategory(e.target.value);
                            setOfficialPitchSelections([]); // reset
                            setOwnPitchSelection(''); // reset
                            setSelectedDate(''); // NEU: Verhindert Crash beim Switch, da Datum-Formats inkompatibel sind!
                            setSelectedSlotId('');
                            setSelectedTime('');
                        }}
                    >
                        <FormControlLabel value="official" control={<Radio color="primary" />} label="Offizielle Plätze" />
                        <FormControlLabel value="own" control={<Radio color="primary" />} label="Eigener Platz" />
                    </RadioGroup>
                </FormControl>

                {pitchCategory === 'official' && (
                    <FormControl fullWidth sx={{ mb: 3 }}>
                        <InputLabel sx={{ '&.Mui-focused': { color: theme.palette.primary.main } }}>Offizielle Plätze wählen</InputLabel>
                        <Select
                            multiple
                            value={officialPitchSelections}
                            label="Offizielle Plätze wählen"
                            onChange={handleOfficialPitchChange}
                            renderValue={(selected) => selected.map(id => officialPitches.find(p => p.id === id)?.name).join(', ')}
                            sx={activeInputStyle}
                            MenuProps={menuProps}
                        >
                            {officialPitches.map((p) => (
                                <MenuItem key={p.id} value={p.id}>
                                    <Checkbox checked={officialPitchSelections.indexOf(p.id) > -1} />
                                    <ListItemText primary={p.name} />
                                </MenuItem>
                            ))}
                        </Select>
                        <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary' }}>
                            Du kannst mehrere Plätze auswählen, um danach alle passenden freien Termine im Überblick zu haben.
                        </Typography>
                    </FormControl>
                )}

                {pitchCategory === 'own' && (
                    <Box sx={{ mb: 3 }}>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel sx={{ '&.Mui-focused': { color: theme.palette.primary.main } }}>Dein Platz</InputLabel>
                            <Select
                                value={ownPitchSelection}
                                label="Dein Platz"
                                onChange={handleOwnPitchChange}
                                sx={activeInputStyle}
                                MenuProps={menuProps}
                            >
                                <MenuItem value="new" sx={{ color: theme.palette.primary.main, fontWeight: 'bold' }}>+ Neuer Platz</MenuItem>
                                {myPitches.length > 0 && <Divider />}
                                {myPitches.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                            </Select>
                        </FormControl>

                        {(ownPitchSelection !== '') && (
                            <Box sx={{ p: 2, border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
                                <Typography variant="subtitle2" sx={{ mb: 2, color: theme.palette.text.secondary }}>
                                    {ownPitchSelection === 'new' ? 'Neuen Platz anlegen' : 'Platz bearbeiten'}
                                </Typography>
                                <TextField label="Name des Platzes" fullWidth sx={{ mb: 2, ...activeInputStyle }} value={pitchFormData.name} onChange={(e) => setPitchFormData({ ...pitchFormData, name: e.target.value })} />
                                <TextField label="Adresse" fullWidth sx={{ mb: 2, ...activeInputStyle }} value={pitchFormData.address} onChange={(e) => setPitchFormData({ ...pitchFormData, address: e.target.value })} />
                                <FormControl fullWidth sx={{ mb: 2 }}>
                                    <InputLabel sx={{ '&.Mui-focused': { color: theme.palette.primary.main } }}>Belag</InputLabel>
                                    <Select value={pitchFormData.type} label="Belag" onChange={(e) => setPitchFormData({ ...pitchFormData, type: e.target.value })} sx={activeInputStyle} MenuProps={menuProps}>
                                        <MenuItem value="Rasen">Rasen</MenuItem><MenuItem value="Kunstrasen">Kunstrasen</MenuItem><MenuItem value="Hartplatz">Hartplatz</MenuItem>
                                    </Select>
                                </FormControl>
                            </Box>
                        )}
                    </Box>
                )}
            </Box>
        );
    };

    const renderStep3 = () => (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontFamily: 'Comfortaa' }}>Details & Buchung</Typography>
            
            {/* 1. GEGNER AUSBWÄHLEN (Immer zuerst) */}
            <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel sx={{ '&.Mui-focused': { color: theme.palette.primary.main } }}>1. Gegner</InputLabel>
                <Select value={opponentId} label="1. Gegner" onChange={(e) => setOpponentId(e.target.value)} sx={activeInputStyle} MenuProps={menuProps}>
                    {filteredTeams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                </Select>
                {filteredTeams.length === 0 && <Typography variant="caption" color="error">Saisonlimit erreicht.</Typography>}
            </FormControl>

            {/* 2. DATUM AUSWAHL (Abhängig vom Gegner) */}
            <FormControl fullWidth sx={{ mb: 3 }} disabled={!opponentId}>
                {pitchCategory === 'official' ? (
                    <>
                        <InputLabel sx={{ '&.Mui-focused': { color: theme.palette.primary.main } }}>2. Datum</InputLabel>
                        <Select 
                            value={selectedDate} 
                            label="2. Datum" 
                            onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlotId(''); }} 
                            sx={activeInputStyle}
                            MenuProps={menuProps}
                            renderValue={(selected) => selected}
                        >
                            {officialDateOptions.map((opt, i) => {
                                // Default styling
                                let color = theme.palette.text.primary; // Weiß/Normal
                                
                                if (opt.disabled) {
                                    return (
                                        <MenuItem key={i} value={opt.valueStr} disabled>
                                            <Typography sx={{ color: theme.palette.text.disabled }}>
                                                {opt.dateStr} <Typography component="span" variant="caption" sx={{ ml: 1 }}>(Gegner spielt bereits)</Typography>
                                            </Typography>
                                        </MenuItem>
                                    );
                                }

                                if (opt.warning) color = '#F2C12E'; // Gelb
                                if (opt.schoolHoliday) color = '#F2C12E'; // Gelb
                                if (opt.publicHoliday) color = theme.palette.info.main; // Blau (überschreibt Gelb)

                                return (
                                    <MenuItem key={i} value={opt.valueStr}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
                                            <Typography sx={{ color: color, mr: 1, whiteSpace: 'nowrap' }}>
                                                {opt.dateStr}
                                            </Typography>
                                            
                                            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, whiteSpace: 'nowrap' }}>
                                                {opt.pitchNameSuffix}
                                            </Typography>

                                            {opt.isScFreiburg && (
                                                <Typography variant="caption" sx={{ color: theme.palette.error.main, ml: 1, fontWeight: 'bold' }}>
                                                    (SC)
                                                </Typography>
                                            )}
                                        </Box>
                                    </MenuItem>
                                );
                            })}
                            {officialDateOptions.length === 0 && opponentId && <MenuItem disabled>Keine Termine für diese Platzkombination</MenuItem>}
                        </Select>
                    </>
                ) : (
                    <>
                        <TextField
                            label="2. Datum"
                            type="date"
                            fullWidth
                            sx={activeInputStyle}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ min: getMinDate(), max: getMaxDate() }}
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </>
                )}
                
                {customDateStatus && customDateStatus.disabled && (
                    <Typography variant="caption" sx={{ mt: 1, color: theme.palette.text.secondary }}>
                        Der Gegner hat an/um dieses Datum herum bereits ein festes Spiel. Bitte weiche auf ein anderes +/- 3 Tage aus!
                    </Typography>
                )}
                {customDateStatus && customDateStatus.warning && (
                    <Typography variant="caption" sx={{ mt: 1, color: '#F2C12E' }}>
                        Gelb: Der Gegner hat eine offene Terminanfrage in diesem Zeitraum (+/- 2 Tage).
                    </Typography>
                )}
                {customDateStatus && customDateStatus.isScFreiburg && (
                    <Typography variant="caption" sx={{ mt: 1, color: theme.palette.error.main, display: 'block' }}>
                        Rot: Heimspiel des SC Freiburg an diesem Tag! Parkplätze beachten!
                    </Typography>
                )}
                {customDateStatus && customDateStatus.publicHoliday && (
                    <Typography variant="caption" sx={{ mt: 1, color: theme.palette.info.main, display: 'block' }}>
                        Blau: {customDateStatus.publicHoliday}
                    </Typography>
                )}
                {customDateStatus && customDateStatus.schoolHoliday && (
                    <Typography variant="caption" sx={{ mt: 1, color: '#F2C12E', display: 'block' }}>
                        Gelb: {customDateStatus.schoolHoliday}
                    </Typography>
                )}
            </FormControl>

            {/* 3. UHRZEIT / SLOT (Abhängig vom Datum) */}
            <FormControl fullWidth sx={{ mb: 2 }} disabled={!selectedDate || (customDateStatus && customDateStatus.disabled)}>
                {pitchCategory === 'official' ? (
                    <>
                        <InputLabel sx={{ '&.Mui-focused': { color: theme.palette.primary.main } }}>3. Slot wählen</InputLabel>
                        <Select value={selectedSlotId} label="3. Slot wählen" onChange={(e) => setSelectedSlotId(e.target.value)} sx={activeInputStyle} MenuProps={menuProps}>
                            {officialSlotOptions.map(opt => <MenuItem key={opt.id} value={opt.id}>{opt.label}</MenuItem>)}
                        </Select>
                    </>
                ) : (
                    <TextField
                        label="3. Uhrzeit"
                        type="time"
                        fullWidth
                        sx={activeInputStyle}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ min: "08:00", max: "22:00" }}
                        value={selectedTime}
                        onChange={(e) => setSelectedTime(e.target.value)}
                        helperText="Zwischen 08:00 und 22:00 Uhr"
                    />
                )}
            </FormControl>
        </Box>
    );

    const actionButtons = (
        <>
            <Button onClick={onClose} color="inherit">Abbrechen</Button>
            <Box sx={{ flex: '1 1 auto' }} />
            {activeStep > 0 && <Button onClick={handleBack} sx={{ mr: 1 }}>Zurück</Button>}
            {activeStep < steps.length - 1 ? (
                <Button onClick={handleNext} variant="contained">Weiter</Button>
            ) : (
                <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading || success || !selectedDate || (pitchCategory==='official' && !selectedSlotId) || (pitchCategory==='own' && !selectedTime) || (customDateStatus?.disabled)}>
                    {loading ? <CircularProgress size={24} /> : 'Anfragen'}
                </Button>
            )}
        </>
    );

    return (
        <AppModal open={open} onClose={onClose} title="Neues Spiel erstellen" actions={actionButtons} loading={loading}>
            <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
                {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
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
