import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { Box, Button, Table, TableBody, TableContainer, TableHead, TableRow, Paper, Typography, TextField, FormControl, InputLabel, Select, MenuItem, InputAdornment, Alert, useTheme, useMediaQuery, IconButton, Menu } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { ReusableModal } from '../Helpers/modalUtils';
import { StyledTableCell, filterData } from '../Helpers/tableUtils';

// Status-Indikator als farbiger Kreis
const StatusIndicator = ({ status }) => {
    const theme = useTheme();
    const color = {
        pending: theme.palette.warning.main,
        confirmed: theme.palette.success.main,
        rejected: theme.palette.error.main,
    }[status] || theme.palette.grey[700];

    return <Box sx={{ width: 12, height: 12, backgroundColor: color, borderRadius: '50%' }} />;
};

const ResultManager = ({ results, teams, currentSeason, currentUser, fetchData, getTeamName }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const darkInputStyle = {
        '& label.Mui-focused': { color: '#00A99D' },
        '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: 'grey.700' },
            '&:hover fieldset': { borderColor: 'grey.500' },
            '&.Mui-focused fieldset': { borderColor: '#00A99D' },
        },
        '& .MuiInputBase-input': { color: 'grey.100', colorScheme: 'dark' },
        '& label': { color: 'grey.400' },
        '& .MuiSelect-icon': { color: 'grey.400' },
        '& .Mui-disabled': { WebkitTextFillColor: `${theme.palette.grey[500]} !important`, color: `${theme.palette.grey[500]} !important` },
        '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': { borderColor: 'grey.800' },
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedResult, setSelectedResult] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [formData, setFormData] = useState({ homeTeamId: '', awayTeamId: '', homeScore: '', awayScore: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [anchorEl, setAnchorEl] = useState(null); // State für das "Mehr"-Menü

    const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);

    useEffect(() => {
        if (selectedResult) {
            setFormData({
                homeTeamId: selectedResult.homeTeamId || '',
                awayTeamId: selectedResult.awayTeamId || '',
                homeScore: selectedResult.homeScore ?? '',
                awayScore: selectedResult.awayScore ?? '',
            });
        }
    }, [selectedResult]);

    const handleOpenCreateModal = () => {
        setSelectedResult(null);
        setFormData({ homeTeamId: '', awayTeamId: '', homeScore: '', awayScore: '' });
        setModalMode('create');
        setIsModalOpen(true);
    };

    const handleRowClick = (result) => {
        setSelectedResult(result);
        setModalMode('view');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setShowDeleteConfirm(false);
        setSelectedResult(null);
        handleMenuClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentSeason) { alert('Keine aktuelle Saison gefunden!'); return; }
        if (formData.homeTeamId === formData.awayTeamId) { alert('Heim- und Auswärtsmannschaft müssen unterschiedlich sein!'); return; }

        try {
            const resultData = { ...formData, homeScore: parseInt(formData.homeScore), awayScore: parseInt(formData.awayScore), seasonId: currentSeason.id };
            
            if (modalMode === 'edit' && selectedResult) {
                // Wenn bearbeitet wird, Ergebnis aktualisieren UND auf 'confirmed' setzen
                await updateDoc(doc(db, "results", selectedResult.id), { 
                    ...resultData, 
                    status: 'confirmed',
                    confirmedBy: currentUser.uid,
                    confirmedAt: serverTimestamp(),
                    updatedAt: serverTimestamp() 
                });
            } else {
                // Beim Erstellen wird es direkt als 'confirmed' angelegt
                await addDoc(collection(db, 'results'), { 
                    ...resultData, 
                    date: new Date().toISOString().split('T')[0], 
                    reportedBy: currentUser.uid, 
                    reportedAt: serverTimestamp(), 
                    status: 'confirmed', 
                    confirmedBy: currentUser.uid, 
                    confirmedAt: serverTimestamp() 
                });
            }
            handleCloseModal();
            fetchData();
        } catch (error) { console.error('Fehler:', error); }
    };

    const handleDelete = async () => {
        if (!selectedResult) return;
        try {
            await deleteDoc(doc(db, 'results', selectedResult.id));
            handleCloseModal();
            fetchData();
        } catch (error) { console.error('Fehler beim Löschen:', error); }
    };

    const handleConfirmResult = async () => {
        if (!selectedResult) return;
        try {
            await updateDoc(doc(db, "results", selectedResult.id), { status: 'confirmed', confirmedBy: currentUser.uid, confirmedAt: serverTimestamp() });
            handleCloseModal();
            fetchData();
        } catch (error) { console.error('Fehler beim Bestätigen:', error); }
    };

    const handleRejectResult = async () => {
        if (!selectedResult) return;
        try {
            await updateDoc(doc(db, "results", selectedResult.id), { status: 'rejected', rejectedBy: currentUser.uid, rejectedAt: serverTimestamp() });
            handleCloseModal();
            fetchData();
        } catch (error) { console.error('Fehler beim Ablehnen:', error); }
    };

    const isReadOnly = modalMode === 'view';
    const searchableFields = [{ key: 'homeTeamId', accessor: (result) => getTeamName(result.homeTeamId) }, { key: 'awayTeamId', accessor: (result) => getTeamName(result.awayTeamId) }];
    const filteredResults = filterData(results, searchTerm, searchableFields);

    return (
        <Box sx={{ p: { sm: 3 } }}>
            <Typography variant={isMobile ? 'h6' : 'h4'} sx={{ mb: 2, mt: 2, color: '#00A99D', fontWeight: 700, fontFamily: 'comfortaa', textAlign: 'center', textTransform: 'uppercase' }}>
                Ergebnisverwaltung
            </Typography>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                <Button variant="contained" onClick={handleOpenCreateModal} sx={{ backgroundColor: '#00A99D', '&:hover': { backgroundColor: '#00897B' } }}>
                    Neues Ergebnis erstellen
                </Button>
            </Box>

            <TextField fullWidth variant="outlined" size="small" placeholder="Suche nach Team..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ ...darkInputStyle, mb: 2 }}
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: 'grey.500' }} /></InputAdornment>), }}
            />

            <ReusableModal open={isModalOpen} onClose={handleCloseModal} title={modalMode === 'create' ? 'Neues Ergebnis' : 'Ergebnisdetails'}>
                <form onSubmit={handleSubmit}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <FormControl size="small" fullWidth required sx={darkInputStyle} disabled={isReadOnly}>
                            <InputLabel>Heim</InputLabel>
                            <Select value={formData.homeTeamId} label="Heim" onChange={(e) => setFormData({ ...formData, homeTeamId: e.target.value })} MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200' } } }}>
                                {teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" fullWidth required sx={darkInputStyle} disabled={isReadOnly}>
                            <InputLabel>Auswärts</InputLabel>
                            <Select value={formData.awayTeamId} label="Auswärts" onChange={(e) => setFormData({ ...formData, awayTeamId: e.target.value })} MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200' } } }}>
                                {teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
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
                            
                            {modalMode === 'view' && !showDeleteConfirm && (
                                selectedResult?.status === 'pending' ? (
                                    <>
                                        <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={handleRejectResult}>Ablehnen</Button>
                                        <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={handleConfirmResult}>Bestätigen</Button>
                                        <IconButton onClick={handleMenuOpen} sx={{ color: 'grey.400' }}><MoreVertIcon /></IconButton>
                                        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} PaperProps={{ sx: { bgcolor: '#333', color: 'grey.200' } }}>
                                            <MenuItem onClick={() => { setModalMode('edit'); handleMenuClose(); }}>Bearbeiten</MenuItem>
                                            <MenuItem onClick={() => { setShowDeleteConfirm(true); handleMenuClose(); }}>Löschen</MenuItem>
                                        </Menu>
                                    </>
                                ) : (
                                    <>
                                        <Button variant="outlined" color="error" onClick={() => setShowDeleteConfirm(true)}>Löschen</Button>
                                        <Button variant="contained" onClick={() => setModalMode('edit')} sx={{ backgroundColor: '#00A99D' }}>Bearbeiten</Button>
                                    </>
                                )
                            )}

                            {modalMode === 'view' && showDeleteConfirm && <><Button variant="outlined" onClick={() => setShowDeleteConfirm(false)} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button><Button variant="contained" color="error" onClick={handleDelete}>Endgültig löschen</Button></>}
                            {modalMode === 'edit' && <><Button variant="outlined" onClick={() => { setModalMode('view'); setShowDeleteConfirm(false); }} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button><Button type="submit" variant="contained" sx={{ backgroundColor: '#00A99D' }}>Speichern</Button></>}
                        </Box>
                    </Box>
                </form>
            </ReusableModal>

            <TableContainer component={Paper} sx={{ backgroundColor: '#111', borderRadius: 2, border: '1px solid', borderColor: 'grey.800' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ borderBottom: `2px solid ${theme.palette.grey[800]}` }}>
                            <StyledTableCell align="center" sx={{ width: '5%' }}>Status</StyledTableCell>
                            <StyledTableCell>Datum</StyledTableCell>
                            <StyledTableCell>Heim</StyledTableCell>
                            <StyledTableCell>Auswärts</StyledTableCell>
                            <StyledTableCell align="center">Ergebnis</StyledTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredResults.map(result => (
                            <TableRow key={result.id} onClick={() => handleRowClick(result)} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                                <StyledTableCell align="center"><StatusIndicator status={result.status} /></StyledTableCell>
                                <StyledTableCell>{result.date}</StyledTableCell>
                                <StyledTableCell>{getTeamName(result.homeTeamId)}</StyledTableCell>
                                <StyledTableCell>{getTeamName(result.awayTeamId)}</StyledTableCell>
                                <StyledTableCell align="center">{result.homeScore} : {result.awayScore}</StyledTableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default ResultManager;
