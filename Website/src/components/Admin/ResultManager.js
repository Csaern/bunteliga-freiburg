import React, { useState, useEffect } from 'react';
import { Box, Button, Table, TableBody, TableContainer, TableHead, TableRow, Paper, Typography, TextField, FormControl, InputLabel, Select, MenuItem, InputAdornment, Alert, useTheme, useMediaQuery, IconButton, Menu, Snackbar, CircularProgress, Avatar } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { ReusableModal } from '../Helpers/modalUtils';
import { StyledTableCell, filterData } from '../Helpers/tableUtils';
import { formatGermanDate } from '../Helpers/dateUtils';
import * as resultApiService from '../../services/resultApiService';
import * as bookingApiService from '../../services/bookingApiService';
import { API_BASE_URL } from '../../services/apiClient';

// Status-Indikator als farbiger Kreis
const StatusIndicator = ({ status }) => {
    const theme = useTheme();
    const statusConfig = {
        pending: { color: theme.palette.warning.main, label: 'Ausstehend' },
        confirmed: { color: theme.palette.success.main, label: 'Bestätigt' },
        disputed: { color: theme.palette.error.main, label: 'Konflikt' },
        rejected: { color: theme.palette.error.main, label: 'Abgelehnt' },
    };
    const config = statusConfig[status] || { color: theme.palette.grey[700] };
    return <Box sx={{ width: 12, height: 12, backgroundColor: config.color, borderRadius: '50%' }} title={config.label} />;
};

// Helper-Komponente für Team-Logo-Anzeige
const TeamLogo = ({ team, size = 24 }) => {
    const theme = useTheme();
    const logoUrl = team?.logoUrl ? (team.logoUrl.startsWith('http') ? team.logoUrl : `${API_BASE_URL}${team.logoUrl}`) : null;
    
    return (
        <Avatar
            alt={`${team?.name || 'Unbekannt'} Logo`}
            src={logoUrl}
            sx={{
                width: size,
                height: size,
                fontSize: `${size * 0.4}px`,
                color: theme.palette.getContrastText(team?.logoColor || theme.palette.grey[700]),
                backgroundColor: team?.logoColor || theme.palette.grey[700],
                border: logoUrl ? `1px solid ${team?.logoColor || theme.palette.grey[700]}` : 'none',
                mr: 1
            }}
        >
            {!logoUrl && (team?.name || 'U').substring(0, 1).toUpperCase()}
        </Avatar>
    );
};

// KORREKTUR: Die Komponente holt ihre Daten jetzt selbst und benötigt weniger Props.
const ResultManager = ({ teams, currentSeason, getTeamName }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const darkInputStyle = {
        '& label.Mui-focused': { color: '#00A99D' },
        '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'grey.700' }, '&:hover fieldset': { borderColor: 'grey.500' }, '&.Mui-focused fieldset': { borderColor: '#00A99D' }, },
        '& .MuiInputBase-input': { color: 'grey.100', colorScheme: 'dark' },
        '& label': { color: 'grey.400' },
        '& .MuiSelect-icon': { color: 'grey.400' },
        '& .Mui-disabled': { WebkitTextFillColor: `${theme.palette.grey[500]} !important`, color: `${theme.palette.grey[500]} !important` },
        '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': { borderColor: 'grey.800' },
    };

    // --- STATE MANAGEMENT ---
    const [results, setResults] = useState([]);
    const [bookingsNeedingResult, setBookingsNeedingResult] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedResult, setSelectedResult] = useState(null);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [formData, setFormData] = useState({ homeTeamId: '', awayTeamId: '', homeScore: '', awayScore: '', bookingId: null });
    const [searchTerm, setSearchTerm] = useState('');
    const [anchorEl, setAnchorEl] = useState(null);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

    // --- DATA FETCHING ---
    const fetchData = async () => {
        if (!currentSeason?.id) return; 
        setLoading(true);
        try {
            const [pendingBookingsData, resultsData] = await Promise.all([
                bookingApiService.getBookingsNeedingResult(currentSeason.id),
                resultApiService.getResultsForSeason(currentSeason.id)
            ]);
            setBookingsNeedingResult(pendingBookingsData);
            setResults(resultsData);
        } catch (error) {
            setNotification({ open: true, message: 'Fehler beim Laden der Ergebnisdaten.', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentSeason?.id]);

    // NEU: Hilfsfunktion zur sicheren Umwandlung von Firestore-Timestamps in JS-Date-Objekte.
    const parseDate = (dateObj) => {
        if (!dateObj) return new Date();
        // Prüft, ob es bereits ein JS-Date-Objekt ist
        if (dateObj instanceof Date) return dateObj;
        // Prüft auf das Firestore-Timestamp-Format
        if (dateObj._seconds) return new Date(dateObj._seconds * 1000);
        // Fallback für andere String-Formate
        return new Date(dateObj);
    };

    useEffect(() => {
        if (selectedResult) {
            setFormData({
                homeTeamId: selectedResult.homeTeamId || '',
                awayTeamId: selectedResult.awayTeamId || '',
                homeScore: selectedResult.homeScore ?? '',
                awayScore: selectedResult.awayScore ?? '',
                bookingId: selectedResult.bookingId || null,
            });
        } else if (selectedBooking) {
            setFormData({
                homeTeamId: selectedBooking.homeTeamId || '',
                awayTeamId: selectedBooking.awayTeamId || '',
                homeScore: '',
                awayScore: '',
                bookingId: selectedBooking.id,
            });
        }
    }, [selectedResult, selectedBooking]);

    const handleOpenCreateModal = () => {
        setSelectedResult(null);
        setSelectedBooking(null);
        setFormData({ homeTeamId: '', awayTeamId: '', homeScore: '', awayScore: '', bookingId: null });
        setModalMode('create');
        setIsModalOpen(true);
    };

    const handleBookingRowClick = (booking) => {
        setSelectedBooking(booking);
        setSelectedResult(null);
        setModalMode('create');
        setIsModalOpen(true);
    };

    const handleResultRowClick = (result) => {
        setSelectedResult(result);
        setSelectedBooking(null);
        setModalMode('view');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setShowDeleteConfirm(false);
        setSelectedResult(null);
        setSelectedBooking(null);
        setAnchorEl(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentSeason) { setNotification({ open: true, message: 'Keine aktuelle Saison gefunden!', severity: 'error' }); return; }
        if (formData.homeTeamId === formData.awayTeamId) { setNotification({ open: true, message: 'Heim- und Auswärtsmannschaft müssen unterschiedlich sein!', severity: 'error' }); return; }

        try {
            const resultData = { ...formData, homeScore: parseInt(formData.homeScore), awayScore: parseInt(formData.awayScore), seasonId: currentSeason?.id };
            
            if (modalMode === 'edit' && selectedResult) {
                await resultApiService.adminUpdateResult(selectedResult.id, { ...resultData, status: 'confirmed' });
                setNotification({ open: true, message: 'Ergebnis erfolgreich aktualisiert.', severity: 'success' });
            } else {
                await resultApiService.adminCreateResult(resultData);
                setNotification({ open: true, message: 'Ergebnis erfolgreich erstellt.', severity: 'success' });
            }
            handleCloseModal();
            fetchData();
        } catch (error) { setNotification({ open: true, message: error.message || 'Fehler beim Speichern.', severity: 'error' }); }
    };

    const handleDelete = async () => {
        if (!selectedResult) return;
        try {
            await resultApiService.adminDeleteResult(selectedResult.id);
            setNotification({ open: true, message: 'Ergebnis gelöscht.', severity: 'success' });
            handleCloseModal();
            fetchData();
        } catch (error) { setNotification({ open: true, message: error.message || 'Fehler beim Löschen.', severity: 'error' }); }
    };

    const handleConfirmResult = async () => {
        if (!selectedResult) return;
        try {
            await resultApiService.adminUpdateResult(selectedResult.id, { ...selectedResult, status: 'confirmed' });
            setNotification({ open: true, message: 'Ergebnis bestätigt.', severity: 'success' });
            handleCloseModal();
            fetchData();
        } catch (error) { setNotification({ open: true, message: error.message || 'Fehler beim Bestätigen.', severity: 'error' }); }
    };

    const isReadOnly = modalMode === 'view';
    const isFromBooking = !!selectedBooking || (selectedResult && selectedResult.bookingId);
    const searchableFields = [{ key: 'homeTeamId', accessor: (result) => getTeamName(result.homeTeamId) }, { key: 'awayTeamId', accessor: (result) => getTeamName(result.awayTeamId) }];
    const filteredResults = filterData(results, searchTerm, searchableFields);

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress sx={{ color: '#00A99D' }} /></Box>;
    }

    return (
        <Box sx={{ p: { sm: 3 } }}>
            <Snackbar open={notification.open} autoHideDuration={6000} onClose={() => setNotification({ ...notification, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setNotification({ ...notification, open: false })} severity={notification.severity} sx={{ width: '100%' }}>{notification.message}</Alert>
            </Snackbar>

            <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ mb: 2, color: '#00A99D', fontWeight: 700, fontFamily: 'comfortaa', textAlign: 'center' }}>
                Ergebnisse zum Eintragen
            </Typography>
            <TableContainer component={Paper} sx={{ backgroundColor: '#111', borderRadius: 2, border: '1px solid', borderColor: 'grey.800', mb: 5 }}>
                <Table size="small">
                    <TableHead><TableRow sx={{ borderBottom: `2px solid ${theme.palette.grey[800]}` }}><StyledTableCell>Datum</StyledTableCell><StyledTableCell>Heim</StyledTableCell><StyledTableCell>Auswärts</StyledTableCell></TableRow></TableHead>
                    <TableBody>
                        {bookingsNeedingResult.length > 0 ? bookingsNeedingResult.map(booking => {
                            const homeTeam = teams.find(t => t.id === booking.homeTeamId);
                            const awayTeam = teams.find(t => t.id === booking.awayTeamId);
                            return (
                                <TableRow key={booking.id} onClick={() => handleBookingRowClick(booking)} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                                    {/* KORREKTUR: Die neue parseDate-Funktion wird auch hier für die Anzeige verwendet. */}
                                    <StyledTableCell>{formatGermanDate(parseDate(booking.date))}</StyledTableCell>
                                    <StyledTableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <TeamLogo team={homeTeam} size={isMobile ? 20 : 24} />
                                            <Typography variant="body2" sx={{ fontFamily: 'comfortaa' }}>{getTeamName(booking.homeTeamId)}</Typography>
                                        </Box>
                                    </StyledTableCell>
                                    <StyledTableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <TeamLogo team={awayTeam} size={isMobile ? 20 : 24} />
                                            <Typography variant="body2" sx={{ fontFamily: 'comfortaa' }}>{getTeamName(booking.awayTeamId)}</Typography>
                                        </Box>
                                    </StyledTableCell>
                                </TableRow>
                            );
                        }) : <TableRow><StyledTableCell colSpan={3} align="center" sx={{ color: 'grey.600' }}>Keine offenen Ergebnisse zum Eintragen.</StyledTableCell></TableRow>}
                    </TableBody>
                </Table>
            </TableContainer>

            <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ mb: 2, color: '#00A99D', fontWeight: 700, fontFamily: 'comfortaa', textAlign: 'center' }}>
                Ergebnisverwaltung
            </Typography>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                <Button variant="contained" onClick={handleOpenCreateModal} sx={{ backgroundColor: '#00A99D', '&:hover': { backgroundColor: '#00897B' } }}>
                    Freies Ergebnis erstellen
                </Button>
            </Box>
            <TextField fullWidth variant="outlined" size="small" placeholder="Suche nach Team..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ ...darkInputStyle, mb: 2 }} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: 'grey.500' }} /></InputAdornment>), }}/>

            <ReusableModal open={isModalOpen} onClose={handleCloseModal} title={modalMode === 'create' ? 'Neues Ergebnis' : 'Ergebnisdetails'}>
                <form onSubmit={handleSubmit}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <FormControl size="small" fullWidth required sx={darkInputStyle} disabled={isReadOnly || isFromBooking}>
                            <InputLabel>Heim</InputLabel>
                            <Select value={formData.homeTeamId} label="Heim" onChange={(e) => setFormData({ ...formData, homeTeamId: e.target.value })} MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200' } } }}>
                                {currentSeason.teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" fullWidth required sx={darkInputStyle} disabled={isReadOnly || isFromBooking}>
                            <InputLabel>Auswärts</InputLabel>
                            <Select value={formData.awayTeamId} label="Auswärts" onChange={(e) => setFormData({ ...formData, awayTeamId: e.target.value })} MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200' } } }}>
                                {currentSeason.teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <TextField size="small" label="Tore Heim" type="number" fullWidth required value={formData.homeScore} onChange={(e) => setFormData({ ...formData, homeScore: e.target.value })} sx={darkInputStyle} disabled={isReadOnly} />
                            <Typography sx={{ color: 'grey.400' }}>:</Typography>
                            <TextField size="small" label="Tore Auswärts" type="number" fullWidth required value={formData.awayScore} onChange={(e) => setFormData({ ...formData, awayScore: e.target.value })} sx={darkInputStyle} disabled={isReadOnly} />
                        </Box>
                        {showDeleteConfirm && modalMode === 'view' && (<Alert severity="error" sx={{ bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ffcdd2' }}>Möchtest du dieses Ergebnis wirklich löschen?</Alert>)}
                        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            {modalMode === 'create' && <><Button variant="outlined" onClick={handleCloseModal} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button><Button type="submit" variant="contained" sx={{ backgroundColor: '#00A99D' }}>Erstellen</Button></>}
                            {modalMode === 'view' && !showDeleteConfirm && (selectedResult?.status === 'pending' ? (<><Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => {}}>Ablehnen</Button><Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={handleConfirmResult}>Bestätigen</Button><IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ color: 'grey.400' }}><MoreVertIcon /></IconButton><Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { bgcolor: '#333', color: 'grey.200' } }}><MenuItem onClick={() => { setModalMode('edit'); setAnchorEl(null); }}>Bearbeiten</MenuItem><MenuItem onClick={() => { setShowDeleteConfirm(true); setAnchorEl(null); }}>Löschen</MenuItem></Menu></>) : (<><Button variant="outlined" color="error" onClick={() => setShowDeleteConfirm(true)}>Löschen</Button><Button variant="contained" onClick={() => setModalMode('edit')} sx={{ backgroundColor: '#00A99D' }}>Bearbeiten</Button></>))}
                            {modalMode === 'view' && showDeleteConfirm && <><Button variant="outlined" onClick={() => setShowDeleteConfirm(false)} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button><Button variant="contained" color="error" onClick={handleDelete}>Endgültig löschen</Button></>}
                            {modalMode === 'edit' && <><Button variant="outlined" onClick={() => { setModalMode('view'); setShowDeleteConfirm(false); }} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button><Button type="submit" variant="contained" sx={{ backgroundColor: '#00A99D' }}>Speichern</Button></>}
                        </Box>
                    </Box>
                </form>
            </ReusableModal>

            <TableContainer component={Paper} sx={{ backgroundColor: '#111', borderRadius: 2, border: '1px solid', borderColor: 'grey.800' }}>
                <Table size="small">
                    <TableHead><TableRow sx={{ borderBottom: `2px solid ${theme.palette.grey[800]}` }}><StyledTableCell align="center" sx={{ width: '5%' }}>Status</StyledTableCell><StyledTableCell>Datum</StyledTableCell><StyledTableCell>Heim</StyledTableCell><StyledTableCell>Auswärts</StyledTableCell><StyledTableCell align="center">Ergebnis</StyledTableCell></TableRow></TableHead>
                    <TableBody>
                        {filteredResults.map(result => {
                            const homeTeam = teams.find(t => t.id === result.homeTeamId);
                            const awayTeam = teams.find(t => t.id === result.awayTeamId);
                            return (
                                <TableRow key={result.id} onClick={() => handleResultRowClick(result)} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                                    <StyledTableCell align="center"><StatusIndicator status={result.status} /></StyledTableCell>
                                    <StyledTableCell>{formatGermanDate(parseDate(result.reportedAt))}</StyledTableCell>
                                    <StyledTableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <TeamLogo team={homeTeam} size={isMobile ? 20 : 24} />
                                            <Typography variant="body2" sx={{ fontFamily: 'comfortaa' }}>{getTeamName(result.homeTeamId)}</Typography>
                                        </Box>
                                    </StyledTableCell>
                                    <StyledTableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <TeamLogo team={awayTeam} size={isMobile ? 20 : 24} />
                                            <Typography variant="body2" sx={{ fontFamily: 'comfortaa' }}>{getTeamName(result.awayTeamId)}</Typography>
                                        </Box>
                                    </StyledTableCell>
                                    <StyledTableCell align="center">{result.homeScore} : {result.awayScore}</StyledTableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default ResultManager;
