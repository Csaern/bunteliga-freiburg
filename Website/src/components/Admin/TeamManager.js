import React, { useState, useEffect } from 'react';
import { Box, Button, Table, TableBody, TableContainer, TableHead, TableRow, Paper, Typography, TextField, useTheme, useMediaQuery, Alert, FormControl, InputLabel, Select, MenuItem, Snackbar, CircularProgress } from '@mui/material';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import ShieldIcon from '@mui/icons-material/Shield'; // NEU: Gefülltes Wappen-Icon importieren
import { ReusableModal } from '../Helpers/modalUtils';
import { StyledTableCell } from '../Helpers/tableUtils';
import * as teamApiService from '../../services/teamApiService';
import { API_BASE_URL } from '../../services/apiClient';

// KORREKTUR: Die Komponente ist jetzt autark und holt ihre Daten selbst.
// Die Props 'teams' und 'fetchData' werden nicht mehr benötigt.
const TeamManager = () => {
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

    const initialFormData = {
        name: '', foundedYear: '', description: '', contactPerson: '',
        contactEmail: '', contactPhone: '', website: '', logoColor: '#666666',
        socialMedia: { facebook: '', instagram: '', twitter: '' }
    };

    // NEU: Die Komponente verwaltet ihren eigenen State für Teams, Ladezustand und Fehler.
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
    const [logoFile, setLogoFile] = useState(null);

    // NEU: Eigene, lokale fetchData-Funktion, die den Node.js Server abfragt.
    const fetchData = async () => {
        try {
            setLoading(true);
            const fetchedTeams = await teamApiService.getAllTeams();
            setTeams(fetchedTeams);
        } catch (error) {
            setNotification({ open: true, message: 'Fehler beim Laden der Teams.', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // NEU: Lädt die Daten einmalig, wenn die Komponente montiert wird.
    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedTeam) {
            setFormData({
                name: selectedTeam.name || '',
                foundedYear: selectedTeam.foundedYear || '',
                description: selectedTeam.description || '',
                contactPerson: selectedTeam.contactPerson || '',
                contactEmail: selectedTeam.contactEmail || '',
                contactPhone: selectedTeam.contactPhone || '',
                website: selectedTeam.website || '',
                logoColor: selectedTeam.logoColor || '#666666',
                socialMedia: selectedTeam.socialMedia || { facebook: '', instagram: '', twitter: '' }
            });
        } else {
            setFormData(initialFormData);
        }
    }, [selectedTeam]);

    const handleOpenCreateModal = () => {
        setSelectedTeam(null);
        setModalMode('create');
        setIsModalOpen(true);
    };

    const handleRowClick = (team) => {
        setSelectedTeam(team);
        setModalMode('view');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setShowDeleteConfirm(false);
        setSelectedTeam(null);
        setLogoFile(null);
    };

    const handleNotificationClose = () => setNotification({ ...notification, open: false });

    // KORREKTUR: Optimierte Update-Logik, um Fehler zu vermeiden und die Performance zu verbessern.
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modalMode === 'edit' && selectedTeam) {
                const updatedTeam = await teamApiService.updateTeam(selectedTeam.id, formData);
                setTeams(prevTeams => prevTeams.map(t => t.id === updatedTeam.id ? updatedTeam : t));
                setNotification({ open: true, message: 'Team erfolgreich aktualisiert.', severity: 'success' });
            } else {
                await teamApiService.createTeam(formData);
                setNotification({ open: true, message: 'Team erfolgreich erstellt.', severity: 'success' });
                fetchData();
            }
            handleCloseModal();
        } catch (error) {
            setNotification({ open: true, message: error.message || 'Ein Fehler ist aufgetreten.', severity: 'error' });
        }
    };

    const handleDelete = async () => {
        if (!selectedTeam) return;
        try {
            await teamApiService.deleteTeam(selectedTeam.id);
            setNotification({ open: true, message: 'Team erfolgreich gelöscht.', severity: 'success' });
            handleCloseModal();
            fetchData();
        } catch (error) {
            setNotification({ open: true, message: 'Fehler beim Löschen des Teams.', severity: 'error' });
        }
    };

    const handleLogoUpload = async () => {
        if (!logoFile || !selectedTeam) return;
        const formData = new FormData();
        formData.append('teamLogo', logoFile);

        try {
            const updatedTeam = await teamApiService.uploadTeamLogo(selectedTeam.id, formData);
            setNotification({ open: true, message: 'Logo erfolgreich hochgeladen.', severity: 'success' });
            setLogoFile(null);
            setSelectedTeam(updatedTeam);
            setTeams(prevTeams => prevTeams.map(t => t.id === updatedTeam.id ? updatedTeam : t));
        } catch (error) {
            setNotification({ open: true, message: error.message || 'Fehler beim Hochladen des Logos.', severity: 'error' });
        }
    };

    const generateYears = () => {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let year = currentYear; year >= 1950; year--) {
            years.push(year);
        }
        return years;
    };
    const years = generateYears();
    const isReadOnly = modalMode === 'view';

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress sx={{ color: '#00A99D' }} /></Box>;
    }

    return (
        <Box sx={{ p: { sm: 3 } }}>
            <Typography variant={isMobile ? 'h6' : 'h4'} sx={{ mb: 2, mt: 2, color: '#00A99D', fontWeight: 700, fontFamily: 'comfortaa', textAlign: 'center', textTransform: 'uppercase' }}>
                Teamverwaltung
            </Typography>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                <Button variant="contained" onClick={handleOpenCreateModal} sx={{ backgroundColor: '#00A99D', '&:hover': { backgroundColor: '#00897B' } }}>
                    Neues Team erstellen
                </Button>
            </Box>

            <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleNotificationClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleNotificationClose} severity={notification.severity} sx={{ width: '100%' }}>{notification.message}</Alert>
            </Snackbar>

            <ReusableModal open={isModalOpen} onClose={handleCloseModal} title={modalMode === 'create' ? 'Neues Team' : 'Teamdetails'}>
                <form onSubmit={handleSubmit}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '70vh', overflowY: 'auto', pr: 1, pt: 1}}>
                        <TextField size="small" label="Teamname" fullWidth required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} sx={darkInputStyle} disabled={isReadOnly} />
                        <FormControl size="small" fullWidth sx={darkInputStyle} disabled={isReadOnly}>
                            <InputLabel>Gründungsjahr</InputLabel>
                            <Select value={formData.foundedYear} label="Gründungsjahr" onChange={(e) => setFormData({ ...formData, foundedYear: e.target.value })} MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200', maxHeight: 200 } } }}>
                                {years.map(year => <MenuItem key={year} value={year}>{year}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField size="small" label="Beschreibung" multiline rows={3} fullWidth value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} sx={darkInputStyle} disabled={isReadOnly} />
                        <TextField size="small" label="Kontaktperson" fullWidth value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} sx={darkInputStyle} disabled={isReadOnly} />
                        <TextField size="small" label="Kontakt E-Mail" type="email" fullWidth value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })} sx={darkInputStyle} disabled={isReadOnly} />
                        <TextField size="small" label="Kontakt Telefon" fullWidth value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} sx={darkInputStyle} disabled={isReadOnly} />
                        <TextField size="small" label="Webseite" fullWidth value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} sx={darkInputStyle} disabled={isReadOnly} />
                        <TextField size="small" label="Logofarbe (Hex-Code)" fullWidth value={formData.logoColor} onChange={(e) => setFormData({ ...formData, logoColor: e.target.value })} sx={darkInputStyle} disabled={isReadOnly} />
                        <TextField size="small" label="Facebook URL" fullWidth value={formData.socialMedia.facebook} onChange={(e) => setFormData({ ...formData, socialMedia: { ...formData.socialMedia, facebook: e.target.value } })} sx={darkInputStyle} disabled={isReadOnly} />
                        {/* KORREKTUR: Tippfehler e.g.value -> e.target.value */}
                        <TextField size="small" label="Instagram URL" fullWidth value={formData.socialMedia.instagram} onChange={(e) => setFormData({ ...formData, socialMedia: { ...formData.socialMedia, instagram: e.target.value } })} sx={darkInputStyle} disabled={isReadOnly} />
                        <TextField size="small" label="Twitter URL" fullWidth value={formData.socialMedia.twitter} onChange={(e) => setFormData({ ...formData, socialMedia: { ...formData.socialMedia, twitter: e.target.value } })} sx={darkInputStyle} disabled={isReadOnly} />
                        
                        {/* NEU: Logo-Upload-Sektion */}
                        {(modalMode === 'edit' || modalMode === 'view') && (
                            <Box sx={{ border: '1px dashed', borderColor: 'grey.700', p: 2, borderRadius: 1, mt: 1 }}>
                                <Typography sx={{ color: 'grey.300', mb: 1 }}>Logo hochladen</Typography>
                                <input
                                    accept="image/png, image/jpeg, image/webp"
                                    style={{ display: 'none' }}
                                    id="logo-upload-file"
                                    type="file"
                                    onChange={(e) => setLogoFile(e.target.files[0])}
                                />
                                <label htmlFor="logo-upload-file">
                                    <Button variant="outlined" component="span" sx={{ color: 'grey.400', borderColor: 'grey.700', mr: 1 }}>
                                        Datei auswählen
                                    </Button>
                                </label>
                                {logoFile && (
                                    <Button variant="contained" onClick={handleLogoUpload} sx={{ backgroundColor: '#00A99D' }}>
                                        Jetzt hochladen
                                    </Button>
                                )}
                                {logoFile && <Typography sx={{ color: 'grey.500', fontSize: '0.8rem', display: 'block', mt: 1 }}>{logoFile.name}</Typography>}
                            </Box>
                        )}

                        {showDeleteConfirm && (<Alert severity="error" sx={{ bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ffcdd2' }}>Möchtest du dieses Team wirklich löschen?</Alert>)}
                    </Box>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                        {modalMode === 'create' && <><Button variant="outlined" onClick={handleCloseModal} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button><Button type="submit" variant="contained" sx={{ backgroundColor: '#00A99D' }}>Erstellen</Button></>}
                        {modalMode === 'view' && !showDeleteConfirm && <><Button variant="outlined" color="error" onClick={() => setShowDeleteConfirm(true)}>Löschen</Button><Button variant="contained" onClick={() => setModalMode('edit')} sx={{ backgroundColor: '#00A99D' }}>Bearbeiten</Button></>}
                        {modalMode === 'view' && showDeleteConfirm && <><Button variant="outlined" onClick={() => setShowDeleteConfirm(false)} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button><Button variant="contained" color="error" onClick={handleDelete}>Endgültig löschen</Button></>}
                        {modalMode === 'edit' && <><Button variant="outlined" onClick={() => { setModalMode('view'); setShowDeleteConfirm(false); }} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button><Button type="submit" variant="contained" sx={{ backgroundColor: '#00A99D' }}>Speichern</Button></>}
                    </Box>
                </form>
            </ReusableModal>

            <TableContainer component={Paper} sx={{ backgroundColor: '#111', borderRadius: 2, border: '1px solid', borderColor: 'grey.800' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ borderBottom: `2px solid ${theme.palette.grey[800]}` }}>
                            {/* KORREKTUR: Leere Zelle für die korrekte Ausrichtung, kein Header-Text für das Logo */}
                            <StyledTableCell sx={{ width: isMobile ? '15%' : '5%' }} />
                            <StyledTableCell>Name</StyledTableCell>
                            {/* KORREKTUR: Spalten werden im Mobile-Modus ausgeblendet */}
                            {!isMobile && <StyledTableCell>Kontaktperson</StyledTableCell>}
                            {!isMobile && <StyledTableCell>E-Mail</StyledTableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {teams.map(team => (
                            <TableRow key={team.id} onClick={() => handleRowClick(team)} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                                <StyledTableCell>
                                    {team.logoUrl ? (
                                        <Box
                                            component="img"
                                            src={`${API_BASE_URL}${team.logoUrl}`}
                                            alt={`${team.name} Logo`}
                                            sx={{
                                                width: 48, // Leicht vergrößert für bessere Darstellung
                                                height: 48,
                                                objectFit: 'contain',
                                                borderRadius: 1.5, // Etwas weichere Kanten
                                            }}
                                        />
                                    ) : (
                                        // KORREKTUR: Wappen mit farbigem Inneren und feinem Rand
                                        <Box sx={{
                                            position: 'relative',
                                            width: 48,
                                            height: 48,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {/* Ebene 1: Die farbige Füllung */}
                                            <ShieldIcon sx={{
                                                position: 'absolute',
                                                width: '100%',
                                                height: '100%',
                                                color: team.logoColor || '#424242' // Dunkelgrau als Standard-Füllung
                                            }} />
                                            {/* Ebene 2: Der darüberliegende, feinere Rand */}
                                            <ShieldOutlinedIcon sx={{
                                                position: 'absolute',
                                                width: '100%',
                                                height: '100%',
                                                color: 'rgba(255, 255, 255, 0.3)' // Subtiler, heller Rand
                                            }} />
                                            {/* Ebene 3: Der Buchstabe */}
                                            <Typography sx={{
                                                position: 'relative',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                fontSize: '1.2rem',
                                                textShadow: '1px 1px 3px rgba(0,0,0,0.7)'
                                            }}>
                                                {team.name.substring(0, 1).toUpperCase()}
                                            </Typography>
                                        </Box>
                                    )}
                                </StyledTableCell>
                                <StyledTableCell>{team.name}</StyledTableCell>
                                {/* KORREKTUR: Spalten werden im Mobile-Modus ausgeblendet */}
                                {!isMobile && <StyledTableCell>{team.contactPerson || '-'}</StyledTableCell>}
                                {!isMobile && <StyledTableCell>{team.contactEmail || '-'}</StyledTableCell>}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default TeamManager;

