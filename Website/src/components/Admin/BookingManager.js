import React, { useState, useEffect } from 'react';
import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, useTheme, useMediaQuery, Typography, TextField, InputAdornment, Select, MenuItem, FormControl, InputLabel, Checkbox, FormControlLabel, Divider, Alert, Snackbar, CircularProgress, ListItemText } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { ReusableModal } from '../Helpers/modalUtils';
import { formatGermanDate, formatDateForSearch } from '../Helpers/dateUtils';
import { StyledTableCell, filterData } from '../Helpers/tableUtils';
import * as bookingApiService from '../../services/bookingApiService';
import * as pitchApiService from '../../services/pitchApiService';
import * as teamApiService from '../../services/teamApiService';
import AdminBookingForm from './Forms/AdminBookingForm';

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

// ... imports


// ... StatusIndicator code ...

const BookingManager = ({ currentSeason }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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

    const scrollbarStyle = {
        '&::-webkit-scrollbar': { width: '8px' },
        '&::-webkit-scrollbar-track': { background: theme.palette.action.hover, borderRadius: '4px' },
        '&::-webkit-scrollbar-thumb': { background: theme.palette.primary.main, borderRadius: '4px' },
        '&::-webkit-scrollbar-thumb:hover': { background: theme.palette.primary.dark }
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
    // Removed specific formData state for single booking as it is now handled by AdminBookingForm
    const [searchTerm, setSearchTerm] = useState('');
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

    // Bulk Form Data remains here
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

    // Removed collisionCheck, potentialOpponents, isOpponentLoading as they are now in AdminBookingForm

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

    // Removed Effects for collision check and opponent fetch

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
    };

    const handleSubmit = async (data) => {
        if (!currentSeason?.id) {
            setNotification({ open: true, message: 'Keine aktive Saison gefunden. Bitte erstellen Sie zuerst eine aktive Saison.', severity: 'error' });
            return;
        }
        try {
            const combinedDate = new Date(`${data.date}T${data.time}`);
            const bookingData = {
                seasonId: currentSeason.id,
                pitchId: data.pitchId,
                homeTeamId: data.homeTeamId || null,
                awayTeamId: data.awayTeamId || null,
                date: combinedDate.toISOString(),
                duration: data.duration,
                friendly: data.friendly,
                status: data.status
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
        // ... bulk check code ... (This seemed huge in the view_file, did I truncate it?)
        // To be safe, I'm assuming the replacer extracts 'handleBulkCheck' logic. 
        // Wait, I should not delete the bulk logic. The replacement block replaces 
        // lines 32-587, which includes `handleBulkCheck`. 
        // I MUST RE-INCLUDE IT.
        if (!currentSeason?.id) {
            setNotification({ open: true, message: 'Keine aktive Saison gefunden.', severity: 'error' });
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
            setNotification({ open: true, message: 'Keine aktive Saison gefunden.', severity: 'error' });
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
            <Typography variant={isMobile ? 'h6' : 'h4'} sx={{ mb: 2, mt: 2, color: theme.palette.primary.main, fontWeight: 700, fontFamily: 'comfortaa', textAlign: 'center', textTransform: 'uppercase' }}>
                Buchungsverwaltung
            </Typography>
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button variant="contained" onClick={handleOpenCreateModal} sx={{ backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }} size={isMobile ? 'small' : 'medium'}>
                    Neue Buchung
                </Button>
                <Button variant="outlined" onClick={() => setIsBulkModalOpen(true)} sx={{ color: theme.palette.primary.main, borderColor: theme.palette.primary.main, '&:hover': { borderColor: theme.palette.primary.dark, backgroundColor: 'rgba(0, 169, 157, 0.1)' } }} size={isMobile ? 'small' : 'medium'}>
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
                        ...inputStyle,
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
                {showDeleteConfirm ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'center' }}>
                        <Alert severity="error" sx={{ bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ffcdd2' }}>
                            Möchtest du diese Buchung wirklich löschen?
                        </Alert>
                        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 1 }}>
                            <Button variant="outlined" onClick={() => setShowDeleteConfirm(false)} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>
                                Abbrechen
                            </Button>
                            <Button variant="contained" color="error" onClick={handleDelete}>
                                Endgültig löschen
                            </Button>
                        </Box>
                    </Box>
                ) : (
                    <AdminBookingForm
                        initialData={modalMode !== 'create' ? selectedBooking : null}
                        currentSeason={currentSeason}
                        allPitches={allPitches}
                        allTeams={allTeams}
                        mode={modalMode}
                        onSubmit={handleSubmit}
                        onCancel={handleCloseModal}
                        onEdit={() => setModalMode('edit')}
                        onDelete={() => setShowDeleteConfirm(true)}
                    />
                )}
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
                                    sx={inputStyle}
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
                                    sx={inputStyle}
                                />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <FormControl size="small" fullWidth required sx={inputStyle} >
                                    <InputLabel>Startzeit</InputLabel>
                                    <Select
                                        value={bulkFormData.startTime}
                                        label="Startzeit"
                                        onChange={(e) => {
                                            const newStartTime = e.target.value;
                                            setBulkFormData(prev => ({ ...prev, startTime: newStartTime, endTime: '' }));
                                        }}
                                        MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary, maxHeight: 300, ...scrollbarStyle } } }}
                                    >
                                        {timeOptions.map(time => (
                                            <MenuItem key={time} value={time}>{time}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <FormControl size="small" fullWidth required sx={inputStyle}>
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
                                        MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary, maxHeight: 300, ...scrollbarStyle } } }}
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
                                            <FormControl size="small" fullWidth sx={inputStyle}>
                                                <InputLabel>Dauer (Minuten)</InputLabel>
                                                <Select
                                                    value={bulkFormData.timeInterval}
                                                    label="Dauer (Minuten)"
                                                    onChange={(e) => setBulkFormData({ ...bulkFormData, timeInterval: parseInt(e.target.value) })}
                                                    MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary, ...scrollbarStyle } } }}
                                                >
                                                    <MenuItem value={90}>90 Minuten</MenuItem>
                                                    <MenuItem value={120} disabled={!canSelect120}>
                                                        120 Minuten
                                                    </MenuItem>
                                                </Select>
                                            </FormControl>
                                            <FormControl size="small" fullWidth required sx={inputStyle}>
                                                <InputLabel>Plätze (nur offizielle)</InputLabel>
                                                <Select
                                                    multiple
                                                    value={bulkFormData.pitchIds}
                                                    label="Plätze (nur offizielle)"
                                                    onChange={(e) => setBulkFormData({ ...bulkFormData, pitchIds: e.target.value })}
                                                    renderValue={(selected) => selected.map(id => getPitchName(id)).join(', ')}
                                                    MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary, ...scrollbarStyle } } }}
                                                >
                                                    {officialPitches.length > 0 ? (
                                                        officialPitches.map(p => <MenuItem key={p.id} value={p.id}><Checkbox checked={bulkFormData.pitchIds.indexOf(p.id) > -1} sx={{ color: theme.palette.text.secondary, '&.Mui-checked': { color: theme.palette.primary.main } }} /> <ListItemText primary={p.name} /></MenuItem>)
                                                    ) : (
                                                        <MenuItem disabled sx={{ fontStyle: 'italic', color: theme.palette.text.disabled }}>
                                                            Keine offiziellen Plätze gefunden.
                                                        </MenuItem>
                                                    )}
                                                </Select>
                                            </FormControl>
                                        </Box>
                                    </>
                                );
                            })()}

                            <Divider sx={{ my: 1, borderColor: theme.palette.divider }} />
                            <Typography sx={{ color: theme.palette.text.secondary, fontFamily: 'comfortaa', fontSize: '0.9rem' }}>Wochentage</Typography>
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
                                                        color: isDisabled ? theme.palette.action.disabled : theme.palette.text.secondary,
                                                        '&.Mui-checked': { color: theme.palette.primary.main },
                                                        '&.Mui-disabled': { color: theme.palette.action.disabled }
                                                    }}
                                                />}
                                                label={<Typography sx={{ color: isDisabled ? theme.palette.text.disabled : theme.palette.text.primary, fontSize: '0.8rem' }}>{day.label}</Typography>}
                                            />
                                        );
                                    });
                                })()}
                            </Box>
                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
                                <Button variant="outlined" onClick={handleCloseBulkModal} sx={{ color: theme.palette.text.secondary, borderColor: theme.palette.divider, '&:hover': { borderColor: theme.palette.text.primary, color: theme.palette.text.primary } }}>Abbrechen</Button>
                                {(() => {
                                    const start = new Date(`2000-01-01T${bulkFormData.startTime}`);
                                    const end = new Date(`2000-01-01T${bulkFormData.endTime}`);
                                    const diffMinutes = (end - start) / 60000;
                                    const isTooShort = diffMinutes < 90;

                                    return (
                                        <Button type="submit" variant="contained" sx={{ backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }} disabled={isChecking || isTooShort}>
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
                                <Typography sx={{ color: theme.palette.text.secondary }}>
                                    Es wurden <strong>{bulkCheckResult.totalSlots}</strong> mögliche Termine gefunden.
                                </Typography>
                                <Alert severity="success" sx={{ bgcolor: 'rgba(46, 125, 50, 0.1)', color: theme.palette.success.main }}>
                                    <strong>{bulkCheckResult.validSlots.length}</strong> davon können erfolgreich erstellt werden.
                                </Alert>
                                {bulkCheckResult.collidingSlots.length > 0 && (
                                    <Alert severity="warning" sx={{ bgcolor: 'rgba(237, 108, 2, 0.1)', color: theme.palette.warning.main }}>
                                        <strong>{bulkCheckResult.collidingSlots.length}</strong> Termine kollidieren mit bestehenden Buchungen und werden übersprungen:
                                        <Box component="ul" sx={{ pl: 2, mt: 1, maxHeight: 150, overflowY: 'auto' }}>
                                            {bulkCheckResult.collidingSlots.map((slot, index) => (
                                                <Typography component="li" key={index} variant="body2">{slot.readableDate} um {slot.readableTime} Uhr ({slot.pitchName})</Typography>
                                            ))}
                                        </Box>
                                    </Alert>
                                )}
                                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
                                    <Button variant="outlined" onClick={() => setBulkModalStep('form')} sx={{ color: theme.palette.text.secondary, borderColor: theme.palette.divider, '&:hover': { borderColor: theme.palette.text.primary, color: theme.palette.text.primary } }}>Zurück</Button>
                                    <Button variant="contained" onClick={handleBulkCreate} sx={{ backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }} disabled={bulkCheckResult.validSlots.length === 0}>
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
                    <Paper sx={{ backgroundColor: theme.palette.background.paper, borderRadius: 2, p: { xs: 3, sm: 5 }, textAlign: 'center', border: '1px solid', borderColor: theme.palette.divider }}>
                        <Typography sx={{ color: theme.palette.text.secondary, fontFamily: 'comfortaa' }}>
                            {searchTerm ? 'Keine passenden Buchungen gefunden.' : 'Keine Buchungen für die aktuelle Saison vorhanden.'}
                        </Typography>
                    </Paper>
                ) : (
                    <TableContainer component={Paper} sx={{ backgroundColor: theme.palette.background.paper, borderRadius: theme.shape.borderRadius, border: `1px solid ${theme.palette.divider}`, mb: 5 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow sx={{ backgroundColor: theme.palette.action.hover }}>
                                    <StyledTableCell sx={{ width: '5%', color: theme.palette.text.primary, fontWeight: 'bold' }}>Status</StyledTableCell>
                                    <StyledTableCell sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>Datum</StyledTableCell>
                                    <StyledTableCell sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>Uhrzeit</StyledTableCell>
                                    <StyledTableCell sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>Platz</StyledTableCell>
                                    <StyledTableCell sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>Heim</StyledTableCell>
                                    <StyledTableCell sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>Auswärts</StyledTableCell>
                                    {!isMobile && <StyledTableCell align="center" sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>Dauer</StyledTableCell>}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredBookings.sort((a, b) => new Date(a.date) - new Date(b.date)).map(booking => {
                                    const startTime = new Date(booking.date).toTimeString().slice(0, 5);
                                    const endTime = booking.duration ? new Date(new Date(booking.date).getTime() + booking.duration * 60000).toTimeString().slice(0, 5) : '-';
                                    const timeRange = `${startTime} - ${endTime}`;

                                    return isMobile ? (
                                        <TableRow key={booking.id} onClick={() => handleRowClick(booking)} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: theme.palette.action.hover } }}>
                                            <TableCell colSpan={6} sx={{ p: 0, border: 'none', borderBottom: `1px solid ${theme.palette.divider}` }}>
                                                <Box sx={{ display: 'flex', alignItems: 'stretch', minHeight: '70px' }}>
                                                    <StatusIndicator status={booking.status} />
                                                    <Box sx={{ flexGrow: 1, p: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                        <Typography sx={{ textAlign: 'center', fontSize: '0.65rem', color: theme.palette.text.secondary, lineHeight: 1.2, mb: 0.5 }}>{getPitchName(booking.pitchId)}</Typography>
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <Box sx={{ textAlign: 'center', pr: 2 }}>
                                                                <Typography sx={{ fontSize: '0.7rem', color: theme.palette.text.secondary }}>{formatGermanDate(booking.date)}</Typography>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 'bold', color: theme.palette.text.primary }}>{timeRange}</Typography>
                                                                    {booking.friendly && <Typography sx={{ color: theme.palette.mode === 'light' ? theme.palette.warning.dark : '#FFD700', fontWeight: 'bold', fontSize: '0.8rem' }}>F</Typography>}
                                                                </Box>
                                                            </Box>
                                                            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', pl: 2, borderLeft: `1px solid ${theme.palette.divider}` }}>
                                                                <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: theme.palette.text.primary }}>{displayTeamName(booking.homeTeamId)}</Typography>
                                                                <Typography sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem', my: 0.25 }}>vs.</Typography>
                                                                <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: theme.palette.text.primary }}>{displayTeamName(booking.awayTeamId)}</Typography>
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        <TableRow key={booking.id} onClick={() => handleRowClick(booking)} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: theme.palette.action.hover } }}>
                                            <StyledTableCell align="center"><StatusIndicator status={booking.status} /></StyledTableCell>
                                            <StyledTableCell>{formatGermanDate(booking.date)}</StyledTableCell>
                                            <StyledTableCell>
                                                {timeRange}
                                                {booking.friendly && <Typography component="span" sx={{ ml: 1, color: theme.palette.mode === 'light' ? theme.palette.warning.dark : '#FFD700', fontWeight: 'bold' }}>F</Typography>}
                                            </StyledTableCell>
                                            <StyledTableCell>{getPitchName(booking.pitchId)}</StyledTableCell>
                                            <StyledTableCell>{displayTeamName(booking.homeTeamId)}</StyledTableCell>
                                            <StyledTableCell>{displayTeamName(booking.awayTeamId)}</StyledTableCell>
                                            <StyledTableCell align="center">{booking.duration ? `${booking.duration}'` : '-'}</StyledTableCell>
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
