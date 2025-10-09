import React, { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, useTheme, useMediaQuery, Typography, TextField, InputAdornment, Select, MenuItem, FormControl, InputLabel, Checkbox, FormControlLabel, Divider, Alert } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { ReusableModal } from '../Helpers/modalUtils';
import { formatGermanDate, formatDateForSearch } from '../Helpers/dateUtils';
import { StyledTableCell, filterData } from '../Helpers/tableUtils';

// Status-Indikator bleibt hier, da er spezifisch für Bookings ist
const StatusIndicator = ({ isAvailable }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const color = isAvailable ? theme.palette.success.main : theme.palette.error.main;

    if (isMobile) {
        return <Box sx={{ width: '4px', bgcolor: color }} />;
    }

    return <Box sx={{ width: '10px', height: '10px', bgcolor: color, borderRadius: '50%', boxShadow: `0 0 8px ${color}` }} />;
};

const BookingManager = ({ bookings, pitches, teams, currentSeason, fetchData, getTeamName, getPitchName }) => {
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

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('view');
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [formData, setFormData] = useState({ date: '', time: '', pitchId: '', homeTeamId: '', awayTeamId: '', isAvailable: true });
    const [searchTerm, setSearchTerm] = useState('');
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkFormData, setBulkFormData] = useState({
        startDate: '', endDate: '', startTime: '', endTime: '', timeInterval: 120, pitchId: '',
        daysOfWeek: [6, 0], isAvailable: true
    });

    useEffect(() => {
        if (selectedBooking) {
            setFormData({
                date: selectedBooking.date || '', time: selectedBooking.time || '', pitchId: selectedBooking.pitchId || '',
                homeTeamId: selectedBooking.homeTeamId || '', awayTeamId: selectedBooking.awayTeamId || '',
                isAvailable: selectedBooking.isAvailable !== false,
            });
        }
    }, [selectedBooking]);

    const handleOpenCreateModal = () => {
        setSelectedBooking(null);
        setFormData({ date: '', time: '', pitchId: '', homeTeamId: '', awayTeamId: '', isAvailable: true });
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const bookingData = { ...formData, seasonId: currentSeason?.id || null };
            if (modalMode === 'edit' && selectedBooking) {
                await updateDoc(doc(db, "bookings", selectedBooking.id), { ...bookingData, updatedAt: serverTimestamp() });
            } else {
                await addDoc(collection(db, "bookings"), { ...bookingData, createdAt: serverTimestamp() });
            }
            handleCloseModal();
            fetchData();
        } catch (error) { console.error('Fehler:', error); }
    };

    const handleDelete = async () => {
        if (!selectedBooking) return;
        try {
            await deleteDoc(doc(db, "bookings", selectedBooking.id));
            handleCloseModal();
            fetchData();
        } catch (error) { console.error('Fehler:', error); }
    };

    const handleCloseBulkModal = () => setIsBulkModalOpen(false);

    const generateTimeSlots = (startTime, endTime, interval) => {
        const slots = [];
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        let current = new Date(start);
        while (current < end) {
            slots.push(current.toTimeString().slice(0, 5));
            current.setMinutes(current.getMinutes() + interval);
        }
        return slots;
    };

    const generateDateRange = (startDate, endDate, daysOfWeek) => {
        const dates = [];
        const current = new Date(startDate);
        const end = new Date(endDate);
        while (current <= end) {
            if (daysOfWeek.includes(current.getDay())) {
                dates.push(current.toISOString().split('T')[0]);
            }
            current.setDate(current.getDate() + 1);
        }
        return dates;
    };

    const handleBulkCreate = async (e) => {
        e.preventDefault();
        try {
            const timeSlots = generateTimeSlots(bulkFormData.startTime, bulkFormData.endTime, bulkFormData.timeInterval);
            const dates = generateDateRange(bulkFormData.startDate, bulkFormData.endDate, bulkFormData.daysOfWeek);
            let createdCount = 0;
            for (const date of dates) {
                for (const time of timeSlots) {
                    const bookingExists = bookings.some(b => b.date === date && b.time === time && b.pitchId === bulkFormData.pitchId);
                    if (!bookingExists) {
                        await addDoc(collection(db, "bookings"), {
                            date, time, pitchId: bulkFormData.pitchId, isAvailable: bulkFormData.isAvailable,
                            seasonId: currentSeason?.id || null, createdAt: serverTimestamp(),
                        });
                        createdCount++;
                    }
                }
            }
            alert(`${createdCount} neue Zeitslots erfolgreich erstellt!`);
            handleCloseBulkModal();
            fetchData();
        } catch (error) {
            console.error('Fehler beim Erstellen der Zeitslots:', error);
            alert('Fehler beim Erstellen der Zeitslots!');
        }
    };

    const isReadOnly = modalMode === 'view';

    const displayTeamName = (teamId) => {
        const name = getTeamName(teamId);
        return (!name || name === 'Unbekannt') ? '-' : name;
    };

    const searchableFields = [
        { key: 'date', accessor: (booking) => formatDateForSearch(booking.date) },
        { key: 'time' },
        { key: 'pitchId', accessor: (booking) => getPitchName(booking.pitchId) },
        { key: 'homeTeamId', accessor: (booking) => getTeamName(booking.homeTeamId) },
        { key: 'awayTeamId', accessor: (booking) => getTeamName(booking.awayTeamId) },
    ];

    const filteredBookings = filterData(bookings, searchTerm, searchableFields);

    return (
        <Box sx={{ p: { sm: 3 } }}>
            <Typography variant={isMobile ? 'h6' : 'h4'} sx={{ mb: 2, mt: 2, color: '#00A99D', fontWeight: 700, fontFamily: 'comfortaa', textAlign: 'center', textTransform: 'uppercase' }}>
                Buchungsverwaltung
            </Typography>
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button variant="contained" onClick={handleOpenCreateModal} sx={{ backgroundColor: '#00A99D', '&:hover': { backgroundColor: '#00897B' } }} size={isMobile ? 'small' : 'medium'}>
                    Neue Buchung
                </Button>
                <Button variant="outlined" onClick={() => setIsBulkModalOpen(true)} sx={{ color: '#00A99D', borderColor: '#00A99D', '&:hover': { borderColor: '#00897B', backgroundColor: 'rgba(0, 169, 157, 0.1)' } }} size={isMobile ? 'small' : 'medium'}>
                    Neuer Zeitslot
                </Button>
            </Box>

            <TextField fullWidth variant="outlined" size="small" placeholder="Suche nach Datum, Platz, Team..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ ...darkInputStyle, mb: 2 }}
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: 'grey.500' }} /></InputAdornment>), }}
            />

            <ReusableModal open={isModalOpen} onClose={handleCloseModal} title={modalMode === 'create' ? 'Neue Buchung erstellen' : 'Buchungsdetails'}>
                <form onSubmit={handleSubmit}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField size="small" label="Datum" type="date" fullWidth value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} InputLabelProps={{ shrink: true }} required sx={darkInputStyle} disabled={isReadOnly} />
                            <TextField size="small" label="Uhrzeit" type="time" fullWidth value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} InputLabelProps={{ shrink: true }} required sx={darkInputStyle} disabled={isReadOnly} />
                        </Box>
                        <FormControl size="small" fullWidth required sx={darkInputStyle} disabled={isReadOnly}>
                            <InputLabel>Platz</InputLabel>
                            <Select value={formData.pitchId} label="Platz" onChange={(e) => setFormData({ ...formData, pitchId: e.target.value })} MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200' } } }}>
                                {pitches.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Divider sx={{ my: 1, borderColor: 'grey.800' }} />
                        <FormControl size="small" fullWidth sx={darkInputStyle} disabled={isReadOnly}>
                            <InputLabel>Heim</InputLabel>
                            <Select value={formData.homeTeamId} label="Heim" onChange={(e) => setFormData({ ...formData, homeTeamId: e.target.value })} MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200' } } }}>
                                <MenuItem value=""><em>Keine</em></MenuItem>
                                {teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Typography sx={{ color: 'grey.500', textAlign: 'center' }}>vs</Typography>
                        <FormControl size="small" fullWidth sx={darkInputStyle} disabled={isReadOnly}>
                            <InputLabel>Auswärts</InputLabel>
                            <Select value={formData.awayTeamId} label="Auswärts" onChange={(e) => setFormData({ ...formData, awayTeamId: e.target.value })} MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200' } } }}>
                                <MenuItem value=""><em>Keine</em></MenuItem>
                                {teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControlLabel control={<Checkbox checked={formData.isAvailable} onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })} sx={{ color: 'grey.100', '&.Mui-checked': { color: '#00A99D' }, '&.Mui-disabled': { color: 'grey.700' } }} disabled={isReadOnly} />} label={<Typography sx={{ color: 'grey.100' }}>Verfügbar</Typography>} />
                        {showDeleteConfirm && modalMode === 'view' && (<Alert severity="error" sx={{ bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ffcdd2' }}>Möchtest du diese Buchung wirklich endgültig löschen?</Alert>)}
                        <Box sx={{ mt: 1, display: 'flex', justifyContent: modalMode === 'create' ? 'flex-end' : 'center', gap: 1, flexWrap: 'wrap' }}>
                            {modalMode === 'create' && <><Button variant="outlined" onClick={handleCloseModal} sx={{ color: 'grey.400', borderColor: 'grey.700', '&:hover': { borderColor: 'grey.500' } }}>Abbrechen</Button><Button type="submit" variant="contained" sx={{ backgroundColor: '#00A99D', '&:hover': { backgroundColor: '#00897B' } }}>Erstellen</Button></>}
                            {modalMode === 'view' && !showDeleteConfirm && <><Button variant="outlined" color="error" onClick={() => setShowDeleteConfirm(true)}>Löschen</Button><Button variant="contained" onClick={() => setModalMode('edit')} sx={{ backgroundColor: '#00A99D', '&:hover': { backgroundColor: '#00897B' } }}>Bearbeiten</Button></>}
                            {modalMode === 'view' && showDeleteConfirm && <><Button variant="outlined" onClick={() => setShowDeleteConfirm(false)} sx={{ color: 'grey.400', borderColor: 'grey.700', '&:hover': { borderColor: 'grey.500' } }}>Abbrechen</Button><Button variant="contained" color="error" onClick={handleDelete}>Endgültig löschen</Button></>}
                            {modalMode === 'edit' && <><Button variant="outlined" onClick={() => { setModalMode('view'); setShowDeleteConfirm(false); }} sx={{ color: 'grey.400', borderColor: 'grey.700', '&:hover': { borderColor: 'grey.500' } }}>Abbrechen</Button><Button type="submit" variant="contained" sx={{ backgroundColor: '#00A99D', '&:hover': { backgroundColor: '#00897B' } }}>Speichern</Button></>}
                        </Box>
                    </Box>
                </form>
            </ReusableModal>

            <ReusableModal open={isBulkModalOpen} onClose={handleCloseBulkModal} title="Zeitslots erstellen">
                <form onSubmit={handleBulkCreate}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField size="small" label="Startdatum" type="date" fullWidth value={bulkFormData.startDate} onChange={(e) => setBulkFormData({ ...bulkFormData, startDate: e.target.value })} InputLabelProps={{ shrink: true }} required sx={darkInputStyle} />
                            <TextField size="small" label="Enddatum" type="date" fullWidth value={bulkFormData.endDate} onChange={(e) => setBulkFormData({ ...bulkFormData, endDate: e.target.value })} InputLabelProps={{ shrink: true }} required sx={darkInputStyle} />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField size="small" label="Startzeit" type="time" fullWidth value={bulkFormData.startTime} onChange={(e) => setBulkFormData({ ...bulkFormData, startTime: e.target.value })} InputLabelProps={{ shrink: true }} required sx={darkInputStyle} />
                            <TextField size="small" label="Endzeit" type="time" fullWidth value={bulkFormData.endTime} onChange={(e) => setBulkFormData({ ...bulkFormData, endTime: e.target.value })} InputLabelProps={{ shrink: true }} required sx={darkInputStyle} />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <FormControl size="small" fullWidth sx={darkInputStyle}>
                                <InputLabel>Zeitintervall</InputLabel>
                                <Select value={bulkFormData.timeInterval} label="Zeitintervall" onChange={(e) => setBulkFormData({ ...bulkFormData, timeInterval: parseInt(e.target.value) })} MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200' } } }}>
                                    <MenuItem value={90}>90 Minuten</MenuItem>
                                    <MenuItem value={120}>120 Minuten</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl size="small" fullWidth required sx={darkInputStyle}>
                                <InputLabel>Platz</InputLabel>
                                <Select value={bulkFormData.pitchId} label="Platz" onChange={(e) => setBulkFormData({ ...bulkFormData, pitchId: e.target.value })} MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200' } } }}>
                                    {pitches.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Box>
                        <Divider sx={{ my: 1, borderColor: 'grey.800' }} />
                        <Typography sx={{ color: 'grey.300', fontFamily: 'comfortaa', fontSize: '0.9rem' }}>Wochentage</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {[{ value: 1, label: 'Mo' }, { value: 2, label: 'Di' }, { value: 3, label: 'Mi' }, { value: 4, label: 'Do' }, { value: 5, label: 'Fr' }, { value: 6, label: 'Sa' }, { value: 0, label: 'So' }].map(day => (
                                <FormControlLabel key={day.value}
                                    control={<Checkbox size="small" checked={bulkFormData.daysOfWeek.includes(day.value)}
                                        onChange={(e) => {
                                            const newDays = e.target.checked ? [...bulkFormData.daysOfWeek, day.value] : bulkFormData.daysOfWeek.filter(d => d !== day.value);
                                            setBulkFormData({ ...bulkFormData, daysOfWeek: newDays });
                                        }}
                                        sx={{ color: 'grey.100', '&.Mui-checked': { color: '#00A99D' } }}
                                        disabled={day.value >= 1 && day.value <= 5}
                                    />}
                                    label={<Typography sx={{ color: 'grey.100', fontSize: '0.8rem' }}>{day.label}</Typography>}
                                />
                            ))}
                        </Box>
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
                            <Button variant="outlined" onClick={handleCloseBulkModal} sx={{ color: 'grey.400', borderColor: 'grey.700', '&:hover': { borderColor: 'grey.500' } }}>Abbrechen</Button>
                            <Button type="submit" variant="contained" sx={{ backgroundColor: '#00A99D', '&:hover': { backgroundColor: '#00897B' } }}>erstellen</Button>
                        </Box>
                    </Box>
                </form>
            </ReusableModal>

            {filteredBookings.length === 0 ? (
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
                                    <StyledTableCell>Uhrzeit</StyledTableCell>
                                    <StyledTableCell>Platz</StyledTableCell>
                                    <StyledTableCell>Heim</StyledTableCell>
                                    <StyledTableCell>Auswärts</StyledTableCell>
                                </TableRow>
                            )}
                        </TableHead>
                        <TableBody>
                            {filteredBookings.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`)).map(booking => (
                                isMobile ? (
                                    <TableRow key={booking.id} onClick={() => handleRowClick(booking)} sx={{ backgroundColor: '#0e0e0eff', cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                                        <TableCell colSpan={6} sx={{ p: 0, border: 'none', borderBottom: `1px solid ${theme.palette.grey[800]}` }}>
                                            <Box sx={{ display: 'flex', alignItems: 'stretch', minHeight: '70px' }}>
                                                <StatusIndicator isAvailable={booking.isAvailable} />
                                                <Box sx={{ flexGrow: 1, p: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                    <Typography sx={{ textAlign: 'center', fontSize: '0.65rem', color: 'grey.500', lineHeight: 1.2, mb: 0.5 }}>{getPitchName(booking.pitchId)}</Typography>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <Box sx={{ textAlign: 'center', pr: 2 }}>
                                                            <Typography sx={{ fontSize: '0.7rem', color: 'grey.300' }}>{formatGermanDate(booking.date)}</Typography>
                                                            <Typography sx={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'grey.100' }}>{booking.time}</Typography>
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
                                        <StyledTableCell align="center"><StatusIndicator isAvailable={booking.isAvailable} /></StyledTableCell>
                                        <StyledTableCell>{formatGermanDate(booking.date)}</StyledTableCell>
                                        <StyledTableCell>{booking.time}</StyledTableCell>
                                        <StyledTableCell>{getPitchName(booking.pitchId)}</StyledTableCell>
                                        <StyledTableCell>{displayTeamName(booking.homeTeamId)}</StyledTableCell>
                                        <StyledTableCell>{displayTeamName(booking.awayTeamId)}</StyledTableCell>
                                    </TableRow>
                                )
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default BookingManager;


