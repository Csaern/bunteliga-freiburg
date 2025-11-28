import React, { useState, useEffect } from 'react';
import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, useTheme, useMediaQuery, Typography, TextField, InputAdornment, Select, MenuItem, FormControl, InputLabel, Checkbox, FormControlLabel, Divider, Alert, Snackbar, CircularProgress, ListItemText } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { ReusableModal } from '../Helpers/modalUtils';
import { formatGermanDate, formatDateForSearch } from '../Helpers/dateUtils';
import { StyledTableCell, filterData } from '../Helpers/tableUtils';
import * as bookingApiService from '../../services/bookingApiService';
import * as pitchApiService from '../../services/pitchApiService';
import * as teamApiService from '../../services/teamApiService';

const StatusIndicator = ({ status }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const statusConfig = {
        available: { color: theme.palette.success.main, label: 'Verfügbar' },
        confirmed: { color: theme.palette.info.main, label: 'Bestätigt' },
        pending_away_confirm: { color: theme.palette.warning.main, label: 'Wartet auf Gegner' },
        cancelled: { color: theme.palette.error.main, label: 'Abgesagt' },
        blocked: { color: theme.palette.grey[600], label: 'Gesperrt' },
        default: { color: theme.palette.grey[700], label: status }
    };

    const config = statusConfig[status] || statusConfig.default;

    if (isMobile) {
        return <Box sx={{ width: '4px', bgcolor: config.color }} />;
    }

    return <Box sx={{ width: '10px', height: '10px', bgcolor: config.color, borderRadius: '50%', boxShadow: `0 0 8px ${config.color}` }} />;
};

const BookingManager = ({ currentSeason }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const darkInputStyle = {
        '& label.Mui-focused': { color: '#00A99D' },
        '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: 'grey.700' },
            '&:hover fieldset': { borderColor: 'grey.500' },
            '&.Mui-focused fieldset': { borderColor: '#00A99D' },
        },
        '& .MuiInputBase-input': { color: 'grey.100', colorScheme: 'dark', accentColor: '#00A99D' },
        '& label': { color: 'grey.400' },
        '& .MuiSelect-icon': { color: 'grey.400' },
        '& .Mui-disabled': { WebkitTextFillColor: `${theme.palette.grey[400]} !important`, color: `${theme.palette.grey[400]} !important` },
        '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': { borderColor: 'grey.800' },
    };

    const scrollbarStyle = {
        '&::-webkit-scrollbar': { width: '8px' },
        '&::-webkit-scrollbar-track': { background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px' },
        '&::-webkit-scrollbar-thumb': { background: '#00A99D', borderRadius: '4px' },
        '&::-webkit-scrollbar-thumb:hover': { background: '#00897B' }
    };

    const [localBookings, setLocalBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

    const [allPitches, setAllPitches] = useState([]);
    const [allTeams, setAllTeams] = useState([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('view');
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [formData, setFormData] = useState({ date: '', time: '', pitchId: '', homeTeamId: '', awayTeamId: '', isAvailable: true, duration: 90, friendly: false, status: 'available' });
    const [searchTerm, setSearchTerm] = useState('');
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkFormData, setBulkFormData] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        startTime: '10:00',
        endTime: '18:00',
        timeInterval: 120,
        pitchIds: [],
        daysOfWeek: [6, 0]
    });
    const [bulkModalStep, setBulkModalStep] = useState('form');
    const [bulkCheckResult, setBulkCheckResult] = useState(null);
    const [isChecking, setIsChecking] = useState(false);
    const [collisionCheck, setCollisionCheck] = useState({ status: 'idle', message: '' });
    const [potentialOpponents, setPotentialOpponents] = useState([]);
    const [isOpponentLoading, setIsOpponentLoading] = useState(false);

    const parseDate = (dateObj) => {
        if (!dateObj) return new Date();
        if (dateObj.toDate) return dateObj.toDate();
        if (dateObj._seconds) return new Date(dateObj._seconds * 1000);
        return new Date(dateObj);
    };

    const fetchData = async () => {
        if (!currentSeason?.id) return;
        setLoading(true);
        try {
            const bookingsPromise = bookingApiService.getBookingsForSeason(currentSeason.id);
            const pitchesPromise = pitchApiService.getAllPitches();
            const teamsPromise = teamApiService.getTeamsForActiveSeason();

            const [bookingsData, pitchesData, teamsData] = await Promise.all([bookingsPromise, pitchesPromise, teamsPromise]);

            const formattedData = bookingsData.map(b => ({ ...b, date: parseDate(b.date) }));
            setLocalBookings(formattedData);
            setAllPitches(pitchesData);
            setAllTeams(teamsData);

        } catch (error) {
            setNotification({ open: true, message: 'Fehler beim Laden der Daten.', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentSeason]);

    useEffect(() => {
        const checkCollision = async () => {
            if (modalMode !== 'create' && modalMode !== 'edit') return;

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

            if (modalMode === 'edit' && selectedBooking) {
                const originalDate = new Date(selectedBooking.date);
                const originalDateStr = originalDate.toISOString().split('T')[0];
                const originalTimeStr = originalDate.toTimeString().slice(0, 5);

                if (date === originalDateStr && time === originalTimeStr && pitchId === selectedBooking.pitchId) {
                    setCollisionCheck({ status: 'success', message: 'Keine Änderung an Termin/Platz.' });
                    return;
                }
            }

            setCollisionCheck({ status: 'checking', message: 'Prüfe Verfügbarkeit...' });

            try {
                const combinedDate = new Date(`${date}T${time}`);
                const dataToSend = {
                    pitchId,
                    date: combinedDate.toISOString(),
                    duration,
                    bookingIdToIgnore: modalMode === 'edit' ? selectedBooking.id : null
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
    }, [formData.date, formData.time, formData.pitchId, formData.duration, modalMode, allPitches, selectedBooking]);


    useEffect(() => {
        if (selectedBooking) {
            const bookingDate = new Date(selectedBooking.date);
            setFormData({
                date: bookingDate.toISOString().split('T')[0],
                time: bookingDate.toTimeString().slice(0, 5),
                pitchId: selectedBooking.pitchId || '',
                homeTeamId: selectedBooking.homeTeamId || '', awayTeamId: selectedBooking.awayTeamId || '',
                duration: selectedBooking.duration || 90,
                isAvailable: selectedBooking.status === 'available',
                friendly: selectedBooking.friendly || false,
                status: selectedBooking.status || 'available'
            });
        }
    }, [selectedBooking]);

    useEffect(() => {
        const fetchOpponents = async () => {
            if (!formData.homeTeamId) {
                setPotentialOpponents([]);
                setFormData(prev => ({ ...prev, awayTeamId: '' }));
                return;
            }

            setIsOpponentLoading(true);
            try {
                const opponents = await teamApiService.getPotentialOpponents(formData.homeTeamId);
                setPotentialOpponents(opponents);
            } catch (error) {
                setNotification({ open: true, message: 'Fehler beim Laden der Gegner.', severity: 'error' });
                setPotentialOpponents([]);
            } finally {
                setIsOpponentLoading(false);
            }
        };

        fetchOpponents();
    }, [formData.homeTeamId]);

    const isTeamInPotentialOpponents = (teamId) => {
        return potentialOpponents.some(t => t.id === teamId);
    };

    const getPitchName = (pitchId) => {
        const pitch = allPitches.find(p => p.id === pitchId);
        return pitch ? pitch.name : 'Unbekannter Platz';
    };

    const getTeamName = (teamId) => {
        if (!teamId) return null;
        const team = allTeams.find(t => t.id === teamId);
        return team ? team.name : 'Unbekannt';
    };

    const handleOpenCreateModal = () => {
        setSelectedBooking(null);
        setFormData({
            date: new Date().toISOString().split('T')[0],
            time: '10:00',
            pitchId: '',
            homeTeamId: '',
            awayTeamId: '',
            isAvailable: true,
            duration: 120,
            friendly: false,
            status: 'available'
        });
        setModalMode('create');
        setIsModalOpen(true);
    };

    const handleRowClick = (booking) => {
        setSelectedBooking(booking);
        setModalMode('view');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setShowDeleteConfirm(false);
        setSelectedBooking(null);
        setCollisionCheck({ status: 'idle', message: '' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentSeason?.id) {
            setNotification({ open: true, message: 'Keine aktive Saison gefunden. Bitte erstellen Sie zuerst eine aktive Saison.', severity: 'error' });
            return;
        }
        try {
            const combinedDate = new Date(`${formData.date}T${formData.time}`);
            const bookingData = {
                seasonId: currentSeason.id,
                pitchId: formData.pitchId,
                homeTeamId: formData.homeTeamId || null,
                awayTeamId: formData.awayTeamId || null,
                date: combinedDate.toISOString(),
                duration: formData.duration,
                friendly: formData.friendly,
                status: formData.status
            };

            if (modalMode === 'create') {
                await bookingApiService.adminCreateBooking(bookingData);
                setNotification({ open: true, message: 'Buchung erstellt.', severity: 'success' });
            } else if (modalMode === 'edit' && selectedBooking) {
                await bookingApiService.adminUpdateBooking(selectedBooking.id, bookingData);
                setNotification({ open: true, message: 'Buchung aktualisiert.', severity: 'success' });
            }

            handleCloseModal();
            fetchData();
        } catch (error) {
            setNotification({ open: true, message: error.message || 'Ein Fehler ist aufgetreten.', severity: 'error' });
        }
    };

    const handleDelete = async () => {
        if (!selectedBooking) return;
        try {
            await bookingApiService.adminDeleteBooking(selectedBooking.id);
            setNotification({ open: true, message: 'Buchung gelöscht.', severity: 'success' });
            handleCloseModal();
            fetchData();
        } catch (error) {
            setNotification({ open: true, message: error.message || 'Fehler beim Löschen.', severity: 'error' });
        }
    };

    const handleCloseBulkModal = () => {
        setIsBulkModalOpen(false);
        setTimeout(() => {
            setBulkModalStep('form');
            setBulkCheckResult(null);
        }, 300);
    };

    const generateTimeOptions = () => {
        const options = [];
        for (let hour = 8; hour <= 20; hour++) {
            for (let min = 0; min < 60; min += 15) {
                if (hour === 20 && min > 0) break;
                const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                options.push(timeString);
            }
        }
        return options;
    };
    const timeOptions = generateTimeOptions();

    const generateTimeSlots = (startTime, endTime, interval) => {
        const slots = [];
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        let current = new Date(start);
        while (current < end) {
            const slotEndTime = new Date(current.getTime() + interval * 60000);
            if (slotEndTime > end) {
                break;
            }
            slots.push(current.toTimeString().slice(0, 5));
            current.setMinutes(current.getMinutes() + interval);
        }
        return slots;
    };

    const handleBulkCheck = async (e) => {
        e.preventDefault();
        if (!currentSeason?.id) {
            setNotification({ open: true, message: 'Keine aktive Saison gefunden. Bitte erstellen Sie zuerst eine aktive Saison.', severity: 'error' });
            return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedStartDate = new Date(bulkFormData.startDate);

        if (selectedStartDate < today) {
            setNotification({ open: true, message: 'Das Startdatum darf nicht in der Vergangenheit liegen.', severity: 'error' });
            return;
        }

        let effectiveEndDate = bulkFormData.endDate;
        if (!effectiveEndDate) {
            effectiveEndDate = bulkFormData.startDate;
        }

        if (new Date(effectiveEndDate) < selectedStartDate) {
            setNotification({ open: true, message: 'Das Enddatum darf nicht vor dem Startdatum liegen.', severity: 'error' });
            return;
        }

        setIsChecking(true);
        try {
            const daysObject = { 0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false };
            bulkFormData.daysOfWeek.forEach(day => { daysObject[day] = true; });

            const dataToSend = {
                seasonId: currentSeason.id,
                pitchIds: bulkFormData.pitchIds,
                startDate: bulkFormData.startDate,
                endDate: effectiveEndDate,
                days: daysObject,
                times: generateTimeSlots(bulkFormData.startTime, bulkFormData.endTime, bulkFormData.timeInterval),
                timeInterval: bulkFormData.timeInterval,
            };

            const result = await bookingApiService.bulkCheckSlots(dataToSend);
            setBulkCheckResult(result);
            setBulkModalStep('confirm');
        } catch (error) {
            setNotification({ open: true, message: error.message || 'Fehler bei der Prüfung.', severity: 'error' });
        } finally {
            setIsChecking(false);
        }
    };

    const handleBulkCreate = async () => {
        if (!bulkCheckResult || bulkCheckResult.validSlots.length === 0) return;
        if (!currentSeason?.id) {
            setNotification({ open: true, message: 'Keine aktive Saison gefunden. Bitte erstellen Sie zuerst eine aktive Saison.', severity: 'error' });
            return;
        }
        try {
            const dataToSend = {
                seasonId: currentSeason.id,
                slotsToCreate: bulkCheckResult.validSlots,
            };

            await bookingApiService.bulkCreateSlots(dataToSend);
            setNotification({ open: true, message: `${bulkCheckResult.validSlots.length} Zeitslots erfolgreich erstellt!`, severity: 'success' });
            handleCloseBulkModal();
            fetchData();
        } catch (error) {
            setNotification({ open: true, message: error.message || 'Fehler beim Erstellen der Zeitslots!', severity: 'error' });
        }
    };

    const isReadOnly = modalMode === 'view';
    const displayTeamName = (teamId) => getTeamName(teamId) || '-';

    const searchableFields = [
        { key: 'date', accessor: (booking) => formatDateForSearch(booking.date) },
        { key: 'pitchId', accessor: (booking) => getPitchName(booking.pitchId) },
        { key: 'homeTeamId', accessor: (booking) => getTeamName(booking.homeTeamId) },
        { key: 'awayTeamId', accessor: (booking) => getTeamName(booking.awayTeamId) },
        { key: 'friendly', accessor: (booking) => booking.friendly ? 'Freundschaftsspiel' : '' }
    ];

    const filteredBookings = filterData(localBookings, searchTerm, searchableFields);
    const officialPitches = allPitches.filter(p => p.isVerified && !p.isArchived);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress sx={{ color: '#00A99D' }} /></Box>;

    return (
        <Box sx={{ p: { sm: 3 } }}>
            <Snackbar open={notification.open} autoHideDuration={6000} onClose={() => setNotification({ ...notification, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setNotification({ ...notification, open: false })} severity={notification.severity} sx={{ width: '100%' }}>{notification.message}</Alert>
            </Snackbar>
            <Typography variant={isMobile ? 'h6' : 'h4'} sx={{ mb: 2, mt: 2, color: '#00A99D', fontWeight: 700, fontFamily: 'comfortaa', textAlign: 'center', textTransform: 'uppercase' }}>
                Buchungsverwaltung
            </Typography>
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button variant="contained" onClick={handleOpenCreateModal} sx={{ backgroundColor: '#00A99D', '&:hover': { backgroundColor: '#00897B' } }} size={isMobile ? 'small' : 'medium'}>
                    Neue Buchung
                </Button>
                <Button variant="outlined" onClick={() => setIsBulkModalOpen(true)} sx={{ color: '#00A99D', borderColor: '#00A99D', '&:hover': { borderColor: '#00897B', backgroundColor: 'rgba(0, 169, 157, 0.1)' } }} size={isMobile ? 'small' : 'medium'}>
                    Zeitslots erstellen
                </Button>
            </Box>

            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    placeholder="Suche nach Datum, Platz, Team..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{
                        ...darkInputStyle,
                        maxWidth: '600px'
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: theme.palette.text.secondary }} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            <ReusableModal open={isModalOpen} onClose={handleCloseModal} title={modalMode === 'create' ? 'Neue Buchung erstellen' : 'Buchungsdetails'}>
                <form onSubmit={handleSubmit}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField size="small" label="Datum" type="date" fullWidth value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} InputLabelProps={{ shrink: true }} required sx={darkInputStyle} disabled={isReadOnly} />
                            <TextField size="small" label="Uhrzeit" type="time" fullWidth value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} InputLabelProps={{ shrink: true }} required sx={darkInputStyle} disabled={isReadOnly} />
                        </Box>

                        <FormControl size="small" fullWidth required sx={darkInputStyle} disabled={isReadOnly}>
                            <InputLabel>Dauer (Minuten)</InputLabel>
                            <Select
                                value={formData.duration}
                                label="Dauer (Minuten)"
                                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                                MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200' } } }}
                            >
                                <MenuItem value={90}>90 Minuten</MenuItem>
                                <MenuItem value={120}>120 Minuten</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" fullWidth required sx={darkInputStyle} disabled={isReadOnly}>
                            <InputLabel>Platz</InputLabel>
                            <Select value={formData.pitchId} label="Platz" onChange={(e) => setFormData({ ...formData, pitchId: e.target.value })} MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200' } } }}>
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

                        <Divider sx={{ my: 1, borderColor: 'grey.800' }} />
                        <FormControl size="small" fullWidth sx={darkInputStyle} disabled={isReadOnly}>
                            <InputLabel>Heim</InputLabel>
                            <Select value={formData.homeTeamId} label="Heim" onChange={(e) => setFormData({ ...formData, homeTeamId: e.target.value })} MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200' } } }}>
                                <MenuItem value=""><em>-</em></MenuItem>
                                {allTeams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Typography sx={{ color: 'grey.500', textAlign: 'center' }}>vs</Typography>
                        <FormControl size="small" fullWidth sx={darkInputStyle} disabled={isReadOnly || !formData.homeTeamId || isOpponentLoading}>
                            <InputLabel>Auswärts</InputLabel>
                            <Select value={formData.awayTeamId} label="Auswärts" onChange={(e) => setFormData({ ...formData, awayTeamId: e.target.value })} MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200' } } }}>
                                <MenuItem value=""><em>-</em></MenuItem>
                                {formData.awayTeamId && !potentialOpponents.find(t => t.id === formData.awayTeamId) && (
                                    <MenuItem value={formData.awayTeamId}>{getTeamName(formData.awayTeamId)}</MenuItem>
                                )}
                                {isOpponentLoading ? (
                                    <MenuItem disabled><em>Lade Gegner...</em></MenuItem>
                                ) : (
                                    potentialOpponents.map(opponent => (
                                        <MenuItem key={opponent.id} value={opponent.id}>
                                            {opponent.name}
                                        </MenuItem>
                                    ))
                                )}
                            </Select>
                        </FormControl>

                        <Divider sx={{ my: 1, borderColor: 'grey.800' }} />
                        <FormControl size="small" fullWidth sx={darkInputStyle} disabled={isReadOnly}>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={formData.status}
                                label="Status"
                                onChange={(e) => {
                                    const newStatus = e.target.value;
                                    setFormData({ ...formData, status: newStatus, isAvailable: newStatus === 'available' });
                                }}
                                MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200' } } }}
                            >
                                <MenuItem value="available" disabled={!!formData.homeTeamId || !!formData.awayTeamId}>Verfügbar</MenuItem>
                                <MenuItem value="pending_away_confirm">Anfrage von Heimteam</MenuItem>
                                <MenuItem value="confirmed">Bestätigt</MenuItem>
                                <MenuItem value="cancelled">Abgesagt</MenuItem>
                                <MenuItem value="blocked">Gesperrt</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControlLabel
                            control={<Checkbox
                                checked={formData.friendly}
                                onChange={(e) => setFormData({ ...formData, friendly: e.target.checked })}
                                sx={{ color: 'grey.100', '&.Mui-checked': { color: '#FFD700' }, '&.Mui-disabled': { color: 'grey.700' } }}
                                disabled={isReadOnly}
                            />}
                            label={<Typography sx={{ color: 'grey.100' }}>Freundschaftsspiel</Typography>}
                        />
                        {showDeleteConfirm && modalMode === 'view' && (<Alert severity="error" sx={{ bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ffcdd2' }}>Möchtest du diese Buchung wirklich endgültig löschen?</Alert>)}
                        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                            {modalMode === 'create' && <><Button variant="outlined" onClick={handleCloseModal} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button><Button type="submit" variant="contained" sx={{ backgroundColor: '#00A99D' }} disabled={collisionCheck.status === 'error' || collisionCheck.status === 'checking'}>Erstellen</Button></>}
                            {modalMode === 'view' && !showDeleteConfirm && <><Button variant="outlined" color="error" onClick={() => setShowDeleteConfirm(true)}>Löschen</Button><Button variant="contained" onClick={() => setModalMode('edit')} sx={{ backgroundColor: '#00A99D' }}>Bearbeiten</Button></>}
                            {modalMode === 'view' && showDeleteConfirm && <><Button variant="outlined" onClick={() => setShowDeleteConfirm(false)} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button><Button variant="contained" color="error" onClick={handleDelete}>Endgültig löschen</Button></>}
                            {modalMode === 'edit' && <><Button variant="outlined" onClick={() => { setModalMode('view'); setShowDeleteConfirm(false); }} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button><Button type="submit" variant="contained" sx={{ backgroundColor: '#00A99D' }} disabled={collisionCheck.status === 'error' || collisionCheck.status === 'checking'}>Speichern</Button></>}
                        </Box>
                    </Box>
                </form>
            </ReusableModal>

            <ReusableModal open={isBulkModalOpen} onClose={handleCloseBulkModal} title={bulkModalStep === 'form' ? "Zeitslots erstellen" : "Erstellung prüfen"}>
                {bulkModalStep === 'form' ? (
                    <form onSubmit={handleBulkCheck}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <TextField
                                    size="small"
                                    label="Startdatum"
                                    type="date"
                                    fullWidth
                                    value={bulkFormData.startDate}
                                    onChange={(e) => {
                                        const newStartDate = e.target.value;
                                        setBulkFormData(prev => ({
                                            ...prev,
                                            startDate: newStartDate,
                                            endDate: prev.endDate && prev.endDate < newStartDate ? '' : prev.endDate
                                        }));
                                    }}
                                    InputLabelProps={{ shrink: true }}
                                    inputProps={{ min: new Date().toISOString().split('T')[0] }}
                                    required
                                    sx={darkInputStyle}
                                />
                                <TextField
                                    size="small"
                                    label="Enddatum (Optional)"
                                    type="date"
                                    fullWidth
                                    value={bulkFormData.endDate}
                                    onChange={(e) => setBulkFormData({ ...bulkFormData, endDate: e.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                    inputProps={{ min: bulkFormData.startDate }}
                                    sx={darkInputStyle}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <FormControl size="small" fullWidth required sx={darkInputStyle}>
                                    <InputLabel>Startzeit</InputLabel>
                                    <Select
                                        value={bulkFormData.startTime}
                                        label="Startzeit"
                                        onChange={(e) => {
                                            const newStartTime = e.target.value;
                                            setBulkFormData(prev => ({ ...prev, startTime: newStartTime, endTime: '' }));
                                        }}
                                        MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200', maxHeight: 300, ...scrollbarStyle } } }}
                                    >
                                        {timeOptions.map(time => (
                                            <MenuItem key={time} value={time}>{time}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <FormControl size="small" fullWidth required sx={darkInputStyle}>
                                    <InputLabel>Endzeit</InputLabel>
                                    <Select
                                        value={bulkFormData.endTime}
                                        label="Endzeit"
                                        onChange={(e) => {
                                            const newEndTime = e.target.value;
                                            const start = new Date(`2000-01-01T${bulkFormData.startTime}`);
                                            const end = new Date(`2000-01-01T${newEndTime}`);
                                            const diffMinutes = (end - start) / 60000;

                                            setBulkFormData(prev => ({
                                                ...prev,
                                                endTime: newEndTime,
                                                timeInterval: (diffMinutes < 120 && prev.timeInterval === 120) ? 90 : prev.timeInterval
                                            }));
                                        }}
                                        MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200', maxHeight: 300, ...scrollbarStyle } } }}
                                    >
                                        {timeOptions.filter(t => {
                                            if (!bulkFormData.startTime) return true;
                                            const start = new Date(`2000-01-01T${bulkFormData.startTime}`);
                                            const end = new Date(`2000-01-01T${t}`);
                                            const diffMinutes = (end - start) / 60000;
                                            return diffMinutes >= 90;
                                        }).map(time => (
                                            <MenuItem key={time} value={time}>{time}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>

                            {(() => {
                                const start = new Date(`2000-01-01T${bulkFormData.startTime}`);
                                const end = new Date(`2000-01-01T${bulkFormData.endTime}`);
                                const diffMinutes = (end - start) / 60000;
                                const isTooShort = diffMinutes < 90;
                                const canSelect120 = diffMinutes >= 120;

                                return (
                                    <>
                                        {isTooShort && bulkFormData.endTime && (
                                            <Alert severity="warning" sx={{ bgcolor: 'rgba(237, 108, 2, 0.1)', color: '#ffcc80', py: 0, px: 2, alignItems: 'center' }}>
                                                Zeitraum zu kurz
                                            </Alert>
                                        )}
                                        <Box sx={{ display: 'flex', gap: 2 }}>
                                            <FormControl size="small" fullWidth sx={darkInputStyle}>
                                                <InputLabel>Dauer (Minuten)</InputLabel>
                                                <Select
                                                    value={bulkFormData.timeInterval}
                                                    label="Dauer (Minuten)"
                                                    onChange={(e) => setBulkFormData({ ...bulkFormData, timeInterval: parseInt(e.target.value) })}
                                                    MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200', ...scrollbarStyle } } }}
                                                >
                                                    <MenuItem value={90}>90 Minuten</MenuItem>
                                                    <MenuItem value={120} disabled={!canSelect120}>
                                                        120 Minuten
                                                    </MenuItem>
                                                </Select>
                                            </FormControl>
                                            <FormControl size="small" fullWidth required sx={darkInputStyle}>
                                                <InputLabel>Plätze (nur offizielle)</InputLabel>
                                                <Select multiple value={bulkFormData.pitchIds} label="Plätze (nur offizielle)" onChange={(e) => setBulkFormData({ ...bulkFormData, pitchIds: e.target.value })} renderValue={(selected) => selected.map(id => getPitchName(id)).join(', ')} MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200', ...scrollbarStyle } } }}>
                                                    {officialPitches.length > 0 ? (
                                                        officialPitches.map(p => <MenuItem key={p.id} value={p.id}><Checkbox checked={bulkFormData.pitchIds.indexOf(p.id) > -1} sx={{ color: 'grey.100', '&.Mui-checked': { color: '#00A99D' } }} /> <ListItemText primary={p.name} /></MenuItem>)
                                                    ) : (
                                                        <MenuItem disabled sx={{ fontStyle: 'italic', color: 'grey.600' }}>
                                                            Keine offiziellen Plätze gefunden.
                                                        </MenuItem>
                                                    )}
                                                </Select>
                                            </FormControl>
                                        </Box>
                                    </>
                                );
                            })()}

                            <Divider sx={{ my: 1, borderColor: 'grey.800' }} />
                            <Typography sx={{ color: 'grey.300', fontFamily: 'comfortaa', fontSize: '0.9rem' }}>Wochentage</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {(() => {
                                    const availableWeekdays = new Set();
                                    if (bulkFormData.startDate) {
                                        const start = new Date(bulkFormData.startDate);
                                        const end = bulkFormData.endDate ? new Date(bulkFormData.endDate) : new Date(start);

                                        if ((end - start) / (1000 * 60 * 60 * 24) >= 6) {
                                            [0, 1, 2, 3, 4, 5, 6].forEach(d => availableWeekdays.add(d));
                                        } else {
                                            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                                                availableWeekdays.add(d.getDay());
                                            }
                                        }
                                    }

                                    return [{ value: 1, label: 'Mo' }, { value: 2, label: 'Di' }, { value: 3, label: 'Mi' }, { value: 4, label: 'Do' }, { value: 5, label: 'Fr' }, { value: 6, label: 'Sa' }, { value: 0, label: 'So' }].map(day => {
                                        const isDisabled = !availableWeekdays.has(day.value);
                                        const isChecked = bulkFormData.daysOfWeek.includes(day.value) && !isDisabled;

                                        return (
                                            <FormControlLabel key={day.value}
                                                control={<Checkbox size="small" checked={isChecked}
                                                    onChange={(e) => {
                                                        const newDays = e.target.checked ? [...bulkFormData.daysOfWeek, day.value] : bulkFormData.daysOfWeek.filter(d => d !== day.value);
                                                        setBulkFormData({ ...bulkFormData, daysOfWeek: newDays });
                                                    }}
                                                    disabled={isDisabled}
                                                    sx={{
                                                        color: isDisabled ? 'grey.800' : 'grey.100',
                                                        '&.Mui-checked': { color: '#00A99D' },
                                                        '&.Mui-disabled': { color: 'grey.800' }
                                                    }}
                                                />}
                                                label={<Typography sx={{ color: isDisabled ? 'grey.700' : 'grey.100', fontSize: '0.8rem' }}>{day.label}</Typography>}
                                            />
                                        );
                                    });
                                })()}
                            </Box>
                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
                                <Button variant="outlined" onClick={handleCloseBulkModal} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button>
                                {(() => {
                                    const start = new Date(`2000-01-01T${bulkFormData.startTime}`);
                                    const end = new Date(`2000-01-01T${bulkFormData.endTime}`);
                                    const diffMinutes = (end - start) / 60000;
                                    const isTooShort = diffMinutes < 90;

                                    return (
                                        <Button type="submit" variant="contained" sx={{ backgroundColor: '#00A99D' }} disabled={isChecking || isTooShort}>
                                            {isChecking ? <CircularProgress size={24} color="inherit" /> : 'Termine prüfen'}
                                        </Button>
                                    );
                                })()}
                            </Box>
                        </Box>
                    </form>
                ) : (
                    <Box>
                        {bulkCheckResult && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Typography sx={{ color: 'grey.200' }}>
                                    Es wurden <strong>{bulkCheckResult.totalSlots}</strong> mögliche Termine gefunden.
                                </Typography>
                                <Alert severity="success" sx={{ bgcolor: 'rgba(46, 125, 50, 0.2)', color: '#a5d6a7' }}>
                                    <strong>{bulkCheckResult.validSlots.length}</strong> davon können erfolgreich erstellt werden.
                                </Alert>
                                {bulkCheckResult.collidingSlots.length > 0 && (
                                    <Alert severity="warning" sx={{ bgcolor: 'rgba(237, 108, 2, 0.2)', color: '#ffcc80' }}>
                                        <strong>{bulkCheckResult.collidingSlots.length}</strong> Termine kollidieren mit bestehenden Buchungen und werden übersprungen:
                                        <Box component="ul" sx={{ pl: 2, mt: 1, maxHeight: 150, overflowY: 'auto' }}>
                                            {bulkCheckResult.collidingSlots.map((slot, index) => (
                                                <Typography component="li" key={index} variant="body2">{slot.readableDate} um {slot.readableTime} Uhr ({slot.pitchName})</Typography>
                                            ))}
                                        </Box>
                                    </Alert>
                                )}
                                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
                                    <Button variant="outlined" onClick={() => setBulkModalStep('form')} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Zurück</Button>
                                    <Button variant="contained" onClick={handleBulkCreate} sx={{ backgroundColor: '#00A99D' }} disabled={bulkCheckResult.validSlots.length === 0}>
                                        {bulkCheckResult.validSlots.length} Termine erstellen
                                    </Button>
                                </Box>
                            </Box>
                        )}
                    </Box>
                )}
            </ReusableModal>

            {
                filteredBookings.length === 0 ? (
                    <Paper sx={{ backgroundColor: '#111', borderRadius: 2, p: { xs: 3, sm: 5 }, textAlign: 'center', border: '1px solid #222' }}>
                        <Typography sx={{ color: 'grey.500', fontFamily: 'comfortaa' }}>
                            {searchTerm ? 'Keine passenden Buchungen gefunden.' : 'Keine Buchungen für die aktuelle Saison vorhanden.'}
                        </Typography>
                    </Paper>
                ) : (
                    <TableContainer component={Paper} sx={{ backgroundColor: '#111', borderRadius: 2, border: '1px solid', borderColor: 'grey.800' }}>
                        <Table size="small">
                            <TableHead>
                                {isMobile ? (
                                    <TableRow sx={{ borderBottom: `2px solid ${theme.palette.grey[800]}` }}><StyledTableCell align="center" colSpan={6}>Buchungen</StyledTableCell></TableRow>
                                ) : (
                                    <TableRow sx={{ borderBottom: `2px solid ${theme.palette.grey[800]}` }}>
                                        <StyledTableCell align="center" sx={{ width: '40px' }}> </StyledTableCell>
                                        <StyledTableCell>Datum</StyledTableCell>
                                        <StyledTableCell>Zeitraum</StyledTableCell>
                                        <StyledTableCell>Platz</StyledTableCell>
                                        <StyledTableCell>Heim</StyledTableCell>
                                        <StyledTableCell>Auswärts</StyledTableCell>
                                    </TableRow>
                                )}
                            </TableHead>
                            <TableBody>
                                {filteredBookings.sort((a, b) => new Date(a.date) - new Date(b.date)).map(booking => {
                                    const startTime = new Date(booking.date).toTimeString().slice(0, 5);
                                    const endTime = booking.duration ? new Date(new Date(booking.date).getTime() + booking.duration * 60000).toTimeString().slice(0, 5) : '-';
                                    const timeRange = `${startTime} - ${endTime}`;

                                    return isMobile ? (
                                        <TableRow key={booking.id} onClick={() => handleRowClick(booking)} sx={{ backgroundColor: '#0e0e0eff', cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                                            <TableCell colSpan={6} sx={{ p: 0, border: 'none', borderBottom: `1px solid ${theme.palette.grey[800]}` }}>
                                                <Box sx={{ display: 'flex', alignItems: 'stretch', minHeight: '70px' }}>
                                                    <StatusIndicator status={booking.status} />
                                                    <Box sx={{ flexGrow: 1, p: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                        <Typography sx={{ textAlign: 'center', fontSize: '0.65rem', color: 'grey.500', lineHeight: 1.2, mb: 0.5 }}>{getPitchName(booking.pitchId)}</Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <Box sx={{ textAlign: 'center', pr: 2 }}>
                                                                <Typography sx={{ fontSize: '0.7rem', color: 'grey.300' }}>{formatGermanDate(booking.date)}</Typography>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'grey.100' }}>{timeRange}</Typography>
                                                                    {booking.friendly && <Typography sx={{ color: '#FFD700', fontWeight: 'bold', fontSize: '0.8rem' }}>F</Typography>}
                                                                </Box>
                                                            </Box>
                                                            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', pl: 2, borderLeft: `1px solid ${theme.palette.grey[800]}` }}>
                                                                <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: 'grey.100' }}>{displayTeamName(booking.homeTeamId)}</Typography>
                                                                <Typography sx={{ color: 'grey.500', fontSize: '0.7rem', my: 0.25 }}>vs.</Typography>
                                                                <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: 'grey.100' }}>{displayTeamName(booking.awayTeamId)}</Typography>
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <TableRow key={booking.id} onClick={() => handleRowClick(booking)} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                                            <StyledTableCell align="center"><StatusIndicator status={booking.status} /></StyledTableCell>
                                            <StyledTableCell>{formatGermanDate(booking.date)}</StyledTableCell>
                                            <StyledTableCell>
                                                {timeRange}
                                                {booking.friendly && <Typography component="span" sx={{ ml: 1, color: '#FFD700', fontWeight: 'bold' }}>F</Typography>}
                                            </StyledTableCell>
                                            <StyledTableCell>{getPitchName(booking.pitchId)}</StyledTableCell>
                                            <StyledTableCell>{displayTeamName(booking.homeTeamId)}</StyledTableCell>
                                            <StyledTableCell>{displayTeamName(booking.awayTeamId)}</StyledTableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )
            }
        </Box >
    );
};

export default BookingManager;
