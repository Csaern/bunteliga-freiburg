import React, { useState, useEffect } from 'react';
import { Box, Button, Table, TableBody, TableContainer, TableHead, TableRow, Paper, Typography, TextField, MenuItem, InputAdornment, Alert, useTheme, useMediaQuery, IconButton, Menu, Snackbar, CircularProgress, Avatar } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AppModal from '../Modals/AppModal';
import { StyledTableCell, filterData } from '../Helpers/tableUtils';
import { formatGermanDate } from '../Helpers/dateUtils';
import * as resultApiService from '../../services/resultApiService';
import * as bookingApiService from '../../services/bookingApiService';
import * as pitchApiService from '../../services/pitchApiService';
import { API_BASE_URL } from '../../services/apiClient';
import AdminResultForm from './Forms/AdminResultForm';

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

const TeamLogo = ({ team, size = 24 }) => {
    const theme = useTheme();
    const isLightMode = theme.palette.mode === 'light';
    const logoUrlToUse = (isLightMode && team?.logoUrlLight) ? team.logoUrlLight : team?.logoUrl;
    const logoUrl = logoUrlToUse ? (logoUrlToUse.startsWith('http') ? logoUrlToUse : `${API_BASE_URL}${logoUrlToUse}`) : null;

    if (logoUrl) {
        return (
            <Box
                component="img"
                src={logoUrl}
                alt={`${team?.name || 'Team'} Logo`}
                sx={{
                    width: size,
                    height: size,
                    objectFit: 'contain',
                    mr: 1
                }}
            />
        );
    }

    return (
        <Avatar
            sx={{
                width: size,
                height: size,
                fontSize: `${size * 0.4}px`,
                color: theme.palette.getContrastText(team?.logoColor || theme.palette.grey[700]),
                backgroundColor: team?.logoColor || theme.palette.grey[700],
                mr: 1
            }}
        >
            {(team?.name || 'U').substring(0, 1).toUpperCase()}
        </Avatar>
    );
};

const ResultManager = ({ teams, currentSeason, getTeamName }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const inputStyle = {
        '& label.Mui-focused': { color: theme.palette.primary.main },
        '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: theme.palette.divider }, '&:hover fieldset': { borderColor: theme.palette.text.secondary }, '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main }, },
        '& .MuiInputBase-input': { color: theme.palette.text.primary, accentColor: theme.palette.primary.main },
        '& label': { color: theme.palette.text.secondary },
        '& .MuiSelect-icon': { color: theme.palette.text.secondary },
        '& .Mui-disabled': { WebkitTextFillColor: `${theme.palette.text.disabled} !important`, color: `${theme.palette.text.disabled} !important` },
        '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.action.disabledBackground },
    };

    const [results, setResults] = useState([]);
    const [bookingsNeedingResult, setBookingsNeedingResult] = useState([]);
    const [allBookings, setAllBookings] = useState([]);
    const [allPitches, setAllPitches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedResult, setSelectedResult] = useState(null);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [anchorEl, setAnchorEl] = useState(null);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

    const fetchData = async () => {
        if (!currentSeason?.id) return;
        setLoading(true);
        try {
            const [pendingBookingsData, resultsData, pitchesData, allBookingsData] = await Promise.all([
                bookingApiService.getBookingsNeedingResult(currentSeason.id),
                resultApiService.getResultsForSeason(currentSeason.id),
                pitchApiService.getAllPitches(),
                bookingApiService.getBookingsForSeason(currentSeason.id)
            ]);
            setBookingsNeedingResult(pendingBookingsData);
            setResults(resultsData);
            setAllPitches(pitchesData);
            setAllBookings(allBookingsData);
        } catch (error) {
            setNotification({ open: true, message: 'Fehler beim Laden der Ergebnisdaten.', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSeason?.id]);

    const parseDate = (dateObj) => {
        if (!dateObj) return new Date();
        if (dateObj instanceof Date) return dateObj;
        if (dateObj._seconds) return new Date(dateObj._seconds * 1000);
        return new Date(dateObj);
    };

    const handleOpenCreateModal = () => {
        setSelectedResult(null);
        setSelectedBooking(null);
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


    const searchableFields = [{ key: 'homeTeamId', accessor: (result) => getTeamName(result.homeTeamId) }, { key: 'awayTeamId', accessor: (result) => getTeamName(result.awayTeamId) }];
    const filteredResults = filterData(results, searchTerm, searchableFields);

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress sx={{ color: theme.palette.primary.main }} /></Box>;
    }

    return (
        <Box sx={{ p: { sm: 3 } }}>
            <Snackbar open={notification.open} autoHideDuration={6000} onClose={() => setNotification({ ...notification, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setNotification({ ...notification, open: false })} severity={notification.severity} sx={{ width: '100%' }}>{notification.message}</Alert>
            </Snackbar>

            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ color: theme.palette.text.primary, fontWeight: 700, fontFamily: 'comfortaa', textTransform: 'uppercase' }}>
                    AKTIONEN
                </Typography>
                {currentSeason && (
                    <Typography variant={isMobile ? 'body1' : 'h6'} sx={{ color: theme.palette.text.secondary, fontFamily: 'comfortaa' }}>
                        {currentSeason.name}
                    </Typography>
                )}
            </Box>
            <TableContainer component={Paper} sx={{ backgroundColor: theme.palette.background.paper, borderRadius: 2, boxShadow: 'none', mb: 5 }}>
                <Table size="small">
                    <TableHead><TableRow sx={{ backgroundColor: theme.palette.action.hover }}><StyledTableCell sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>Datum</StyledTableCell><StyledTableCell sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>Details</StyledTableCell></TableRow></TableHead>
                    <TableBody>
                        {bookingsNeedingResult.length > 0 ? bookingsNeedingResult.map(booking => {
                            return (
                                <TableRow key={booking.id} onClick={() => handleBookingRowClick(booking)} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: theme.palette.action.hover } }}>
                                    <StyledTableCell>{formatGermanDate(parseDate(booking.date))}</StyledTableCell>
                                    <StyledTableCell>
                                        <Typography variant="body2" sx={{ fontFamily: 'comfortaa', fontWeight: 'bold' }}>
                                            {getTeamName(booking.homeTeamId)} vs {getTeamName(booking.awayTeamId)}
                                        </Typography>
                                    </StyledTableCell>
                                </TableRow>
                            );
                        }) : <TableRow><StyledTableCell colSpan={2} align="center" sx={{ color: 'grey.600' }}>Keine offenen Ergebnisse zum Eintragen.</StyledTableCell></TableRow>}
                    </TableBody>
                </Table>
            </TableContainer>

            <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ mb: 2, color: theme.palette.primary.main, fontWeight: 700, fontFamily: 'comfortaa', textAlign: 'center' }}>
                ERGEBNISVERWALTUNG
            </Typography>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                <Button variant="contained" onClick={handleOpenCreateModal} sx={{ backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }}>
                    Freies Ergebnis erstellen
                </Button>
            </Box>
            <TextField fullWidth variant="outlined" size="small" placeholder="Suche nach Team..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ ...inputStyle, mb: 2 }} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: 'grey.500' }} /></InputAdornment>), }} />

            <AppModal
                open={isModalOpen}
                onClose={handleCloseModal}
                title={modalMode === 'create' ? 'Neues Ergebnis' : 'Ergebnisdetails'}
                fullScreenMobile
                actions={
                    // Actions logic handled mostly within AdminResultForm or custom view below, but we can standardize the container here if needed.
                    // However, specific actions like "Confirm / Reject" are unique to result view.
                    // Let's implement generic close/cancel logic here if applicable, or leave empty if the form handles it.
                    // For consistency, we should try to hoist buttons here.
                    null
                }
            >
                {modalMode !== 'delete' ? (
                    <AdminResultForm
                        initialData={modalMode === 'edit' || modalMode === 'view' ? selectedResult : (selectedBooking ? {
                            homeTeamId: selectedBooking.homeTeamId,
                            awayTeamId: selectedBooking.awayTeamId,
                            bookingId: selectedBooking.id,
                            homeScore: '',
                            awayScore: '',
                            date: selectedBooking.date,
                            pitchId: selectedBooking.pitchId
                        } : null)}
                        teams={currentSeason.teams}
                        pitches={allPitches}
                        season={currentSeason}
                        results={results}
                        bookings={allBookings}
                        mode={modalMode}
                        onEdit={() => setModalMode('edit')}
                        onSubmit={async (data) => {
                            if (!currentSeason) { setNotification({ open: true, message: 'Keine aktuelle Saison gefunden!', severity: 'error' }); return; }

                            try {
                                const resultData = { ...data, homeScore: parseInt(data.homeScore), awayScore: parseInt(data.awayScore), seasonId: currentSeason?.id };

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
                        }}
                        onCancel={handleCloseModal}
                    // Helper to hoist buttons or keep them inside form?
                    // Given the complexity of AdminResultForm, keeping them inside might be easier for now, BUT `AppModal` expects actions prop.
                    // Ideally AdminResultForm should not render its own buttons if we use AppModal actions.
                    // I will keep existing behavior inside AppModal body for now to minimal risk, as AdminResultForm might have complex validation logic locally.
                    />
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Box sx={{ textAlign: 'center' }}>
                                <TeamLogo team={teams.find(t => t.id === selectedResult?.homeTeamId)} size={48} />
                                <Typography variant="h6">{getTeamName(selectedResult?.homeTeamId)}</Typography>
                            </Box>
                            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{selectedResult?.homeScore} : {selectedResult?.awayScore}</Typography>
                            <Box sx={{ textAlign: 'center' }}>
                                <TeamLogo team={teams.find(t => t.id === selectedResult?.awayTeamId)} size={48} />
                                <Typography variant="h6">{getTeamName(selectedResult?.awayTeamId)}</Typography>
                            </Box>
                        </Box>

                        {showDeleteConfirm && (<Alert severity="error" sx={{ bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ffcdd2' }}>Möchtest du dieses Ergebnis wirklich löschen?</Alert>)}

                        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            {!showDeleteConfirm && (selectedResult?.status === 'pending' ? (
                                <>
                                    <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => { }}>Ablehnen</Button>
                                    <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={handleConfirmResult}>Bestätigen</Button>
                                    <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ color: 'grey.400' }}><MoreVertIcon /></IconButton>
                                    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} PaperProps={{ sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary } }}>
                                        <MenuItem onClick={() => { setModalMode('edit'); setAnchorEl(null); }}>Bearbeiten</MenuItem>
                                        <MenuItem onClick={() => { setShowDeleteConfirm(true); setAnchorEl(null); }}>Löschen</MenuItem>
                                    </Menu>
                                </>
                            ) : (
                                <>
                                    <Button variant="outlined" color="error" onClick={() => setShowDeleteConfirm(true)}>Löschen</Button>
                                    <Button variant="contained" onClick={() => setModalMode('edit')} sx={{ backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }}>Bearbeiten</Button>
                                </>
                            ))}
                            {showDeleteConfirm && (
                                <>
                                    <Button variant="outlined" onClick={() => setShowDeleteConfirm(false)} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button>
                                    <Button variant="contained" color="error" onClick={handleDelete}>Endgültig löschen</Button>
                                </>
                            )}
                        </Box>
                    </Box>
                )}
            </AppModal>

            <TableContainer component={Paper} sx={{ backgroundColor: theme.palette.background.paper, borderRadius: 2, boxShadow: 'none' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: theme.palette.action.hover }}>
                            {!isMobile && <StyledTableCell align="center" sx={{ width: '5%', color: theme.palette.text.primary, fontWeight: 'bold' }}>Status</StyledTableCell>}
                            <StyledTableCell sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>Datum</StyledTableCell>
                            <StyledTableCell align="center" sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>Heim</StyledTableCell>
                            <StyledTableCell align="center" sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>Erg.</StyledTableCell>
                            <StyledTableCell align="center" sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>Auswärts</StyledTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredResults.map(result => {
                            const homeTeam = teams.find(t => t.id === result.homeTeamId);
                            const awayTeam = teams.find(t => t.id === result.awayTeamId);
                            return (
                                <TableRow key={result.id} onClick={() => handleResultRowClick(result)} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: theme.palette.action.hover } }}>
                                    {!isMobile && <StyledTableCell align="center"><StatusIndicator status={result.status} /></StyledTableCell>}
                                    <StyledTableCell>{formatGermanDate(parseDate(result.reportedAt))}</StyledTableCell>
                                    <StyledTableCell align="center">
                                        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-end', gap: 1 }}>
                                            {isMobile ? (
                                                <>
                                                    <TeamLogo team={homeTeam} size={24} />
                                                    <Typography variant="body2" sx={{ fontFamily: 'comfortaa', fontSize: '0.75rem', lineHeight: 1.1 }}>{getTeamName(result.homeTeamId)}</Typography>
                                                </>
                                            ) : (
                                                <>
                                                    <Typography variant="body2" sx={{ fontFamily: 'comfortaa' }}>{getTeamName(result.homeTeamId)}</Typography>
                                                    <TeamLogo team={homeTeam} size={24} />
                                                </>
                                            )}
                                        </Box>
                                    </StyledTableCell>
                                    <StyledTableCell align="center" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                        {result.homeScore} : {result.awayScore}
                                    </StyledTableCell>
                                    <StyledTableCell align="center">
                                        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start', gap: 1 }}>
                                            <TeamLogo team={awayTeam} size={24} />
                                            <Typography variant="body2" sx={{ fontFamily: 'comfortaa', fontSize: '0.75rem', lineHeight: 1.1 }}>{getTeamName(result.awayTeamId)}</Typography>
                                        </Box>
                                    </StyledTableCell>
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
