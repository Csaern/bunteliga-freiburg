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
    const [logoFileLight, setLogoFileLight] = useState(null); // NEU

    const fetchData = async () => {
        setLoading(true);
        try {
            const teamsData = await teamApiService.getAllTeams();
            setTeams(teamsData);
        } catch (error) {
            console.error("Fehler beim Laden der Teams:", error);
            setNotification({ open: true, message: "Fehler beim Laden der Teams.", severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenCreateModal = () => {
        setFormData(initialFormData);
        setSelectedTeam(null);
        setModalMode('create');
        setIsModalOpen(true);
        setLogoFile(null);
        setLogoFileLight(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setShowDeleteConfirm(false);
        setSelectedTeam(null);
        setLogoFile(null);
        setLogoFileLight(null);
    };

    const handleRowClick = (team) => {
        setSelectedTeam(team);
        setFormData({
            name: team.name,
            foundedYear: team.foundedYear || '',
            description: team.description || '',
            contactPerson: team.contactPerson || '',
            contactEmail: team.contactEmail || '',
            contactPhone: team.contactPhone || '',
            website: team.website || '',
            logoColor: team.logoColor || '#666666',
            socialMedia: team.socialMedia || { facebook: '', instagram: '', twitter: '' }
        });
        setModalMode('view');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modalMode === 'create') {
                const newTeam = await teamApiService.createTeam(formData);
                setTeams([...teams, newTeam]);
                setNotification({ open: true, message: 'Team erfolgreich erstellt.', severity: 'success' });
                // Wenn ein Logo ausgewählt wurde, lade es jetzt hoch
                if (logoFile) {
                    const formDataLogo = new FormData();
                    formDataLogo.append('teamLogo', logoFile);
                    await teamApiService.uploadTeamLogo(newTeam.id, formDataLogo, 'dark');
                }
                if (logoFileLight) {
                    const formDataLogo = new FormData();
                    formDataLogo.append('teamLogo', logoFileLight);
                    await teamApiService.uploadTeamLogo(newTeam.id, formDataLogo, 'light');
                }
                handleCloseModal();
                fetchData(); // Refresh um sicherzugehen
            } else if (modalMode === 'edit' && selectedTeam) {
                const updatedTeam = await teamApiService.updateTeam(selectedTeam.id, formData);
                setTeams(teams.map(t => t.id === selectedTeam.id ? updatedTeam : t));
                setNotification({ open: true, message: 'Team erfolgreich aktualisiert.', severity: 'success' });
                handleCloseModal();
            }
        } catch (error) {
            console.error("Fehler beim Speichern:", error);
            setNotification({ open: true, message: error.message || 'Fehler beim Speichern.', severity: 'error' });
        }
    };

    const handleDelete = async () => {
        if (!selectedTeam) return;
        try {
            await teamApiService.deleteTeam(selectedTeam.id);
            setTeams(teams.filter(t => t.id !== selectedTeam.id));
            setNotification({ open: true, message: 'Team erfolgreich gelöscht.', severity: 'success' });
            handleCloseModal();
        } catch (error) {
            console.error("Fehler beim Löschen:", error);
            setNotification({ open: true, message: error.message || 'Fehler beim Löschen.', severity: 'error' });
        }
    };

    const handleNotificationClose = () => {
        setNotification({ ...notification, open: false });
    };

    const handleLogoUpload = async (type = 'dark') => {
        const fileToUpload = type === 'light' ? logoFileLight : logoFile;
        if (!fileToUpload || !selectedTeam) return;

        const formData = new FormData();
        formData.append('teamLogo', fileToUpload);

        try {
            // API Call mit type Parameter
            const updatedTeam = await teamApiService.uploadTeamLogo(selectedTeam.id, formData, type);
            setNotification({ open: true, message: `${type === 'light' ? 'Light Mode' : 'Dark Mode'} Logo erfolgreich hochgeladen.`, severity: 'success' });

            if (type === 'light') setLogoFileLight(null);
            else setLogoFile(null);

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
            <Typography variant={isMobile ? 'h6' : 'h4'} sx={{ mb: 2, mt: 2, color: theme.palette.primary.main, fontWeight: 700, fontFamily: 'comfortaa', textAlign: 'center', textTransform: 'uppercase' }}>
                Teamverwaltung
            </Typography>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                <Button variant="contained" onClick={handleOpenCreateModal} sx={{ backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }}>
                    Neues Team erstellen
                </Button>
            </Box>

            <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleNotificationClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleNotificationClose} severity={notification.severity} sx={{ width: '100%' }}>{notification.message}</Alert>
            </Snackbar>

            <ReusableModal open={isModalOpen} onClose={handleCloseModal} title={modalMode === 'create' ? 'Neues Team' : 'Teamdetails'}>
                <form onSubmit={handleSubmit}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '70vh', overflowY: 'auto', pr: 1, pt: 1 }}>
                        <TextField size="small" label="Teamname" fullWidth required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} sx={inputStyle} disabled={isReadOnly} />
                        <FormControl size="small" fullWidth sx={inputStyle} disabled={isReadOnly}>
                            <InputLabel>Gründungsjahr</InputLabel>
                            <Select value={formData.foundedYear} label="Gründungsjahr" onChange={(e) => setFormData({ ...formData, foundedYear: e.target.value })} MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary, maxHeight: 200 } } }}>
                                {years.map(year => <MenuItem key={year} value={year}>{year}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField size="small" label="Beschreibung" multiline rows={3} fullWidth value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} sx={inputStyle} disabled={isReadOnly} />
                        <TextField size="small" label="Kontaktperson" fullWidth value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} sx={inputStyle} disabled={isReadOnly} />
                        <TextField size="small" label="Kontakt E-Mail" type="email" fullWidth value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })} sx={inputStyle} disabled={isReadOnly} />
                        <TextField size="small" label="Kontakt Telefon" fullWidth value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} sx={inputStyle} disabled={isReadOnly} />
                        <TextField size="small" label="Webseite" fullWidth value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} sx={inputStyle} disabled={isReadOnly} />
                        <TextField size="small" label="Logofarbe (Hex-Code)" fullWidth value={formData.logoColor} onChange={(e) => setFormData({ ...formData, logoColor: e.target.value })} sx={inputStyle} disabled={isReadOnly} />
                        <TextField size="small" label="Facebook URL" fullWidth value={formData.socialMedia.facebook} onChange={(e) => setFormData({ ...formData, socialMedia: { ...formData.socialMedia, facebook: e.target.value } })} sx={inputStyle} disabled={isReadOnly} />
                        {/* KORREKTUR: Tippfehler e.g.value -> e.target.value */}
                        <TextField size="small" label="Instagram URL" fullWidth value={formData.socialMedia.instagram} onChange={(e) => setFormData({ ...formData, socialMedia: { ...formData.socialMedia, instagram: e.target.value } })} sx={inputStyle} disabled={isReadOnly} />
                        <TextField size="small" label="Twitter URL" fullWidth value={formData.socialMedia.twitter} onChange={(e) => setFormData({ ...formData, socialMedia: { ...formData.socialMedia, twitter: e.target.value } })} sx={inputStyle} disabled={isReadOnly} />

                        {/* NEU: Logo-Upload-Sektion (Dark Mode / Default) */}
                        {(modalMode === 'edit' || modalMode === 'view') && selectedTeam && (
                            <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
                                <Box sx={{ border: '1px dashed', borderColor: 'grey.700', p: 2, borderRadius: 1, mt: 1, flex: 1 }}>
                                    <Typography sx={{ color: 'grey.300', mb: 1 }}>Logo (Dark Mode / Default)</Typography>
                                    <input
                                        accept="image/png, image/jpeg, image/webp"
                                        style={{ display: 'none' }}
                                        id="logo-upload-file-dark"
                                        type="file"
                                        onChange={(e) => setLogoFile(e.target.files[0])}
                                    />
                                    <label htmlFor="logo-upload-file-dark">
                                        <Button variant="outlined" component="span" sx={{ color: 'grey.400', borderColor: 'grey.700', mr: 1, mb: 1 }}>
                                            Datei auswählen
                                        </Button>
                                    </label>
                                    {logoFile && (
                                        <Button variant="contained" onClick={() => handleLogoUpload('dark')} sx={{ backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark }, mb: 1 }}>
                                            Hochladen
                                        </Button>
                                    )}
                                    {logoFile && <Typography sx={{ color: 'grey.500', fontSize: '0.8rem', display: 'block' }}>{logoFile.name}</Typography>}
                                    {selectedTeam?.logoUrl && (
                                        <Box mt={2}>
                                            <Typography variant="caption" display="block" color="grey.500" mb={0.5}>Aktuell:</Typography>
                                            <Box component="img" src={`${API_BASE_URL}${selectedTeam.logoUrl}`} alt="Dark Logo" sx={{ width: 48, height: 48, objectFit: 'contain', bgcolor: '#222', p: 0.5, borderRadius: 1 }} />
                                        </Box>
                                    )}
                                </Box>

                                <Box sx={{ border: '1px dashed', borderColor: 'grey.700', p: 2, borderRadius: 1, mt: 1, flex: 1 }}>
                                    <Typography sx={{ color: 'grey.300', mb: 1 }}>Logo (Light Mode)</Typography>
                                    <input
                                        accept="image/png, image/jpeg, image/webp"
                                        style={{ display: 'none' }}
                                        id="logo-upload-file-light"
                                        type="file"
                                        onChange={(e) => setLogoFileLight(e.target.files[0])}
                                    />
                                    <label htmlFor="logo-upload-file-light">
                                        <Button variant="outlined" component="span" sx={{ color: 'grey.400', borderColor: 'grey.700', mr: 1, mb: 1 }}>
                                            Datei auswählen
                                        </Button>
                                    </label>
                                    {logoFileLight && (
                                        <Button variant="contained" onClick={() => handleLogoUpload('light')} sx={{ backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark }, mb: 1 }}>
                                            Hochladen
                                        </Button>
                                    )}
                                    {logoFileLight && <Typography sx={{ color: 'grey.500', fontSize: '0.8rem', display: 'block' }}>{logoFileLight.name}</Typography>}
                                    {selectedTeam.logoUrlLight && (
                                        <Box mt={2}>
                                            <Typography variant="caption" display="block" color="grey.500" mb={0.5}>Aktuell:</Typography>
                                            <Box component="img" src={`${API_BASE_URL}${selectedTeam.logoUrlLight}`} alt="Light Logo" sx={{ width: 48, height: 48, objectFit: 'contain', bgcolor: '#eee', p: 0.5, borderRadius: 1 }} />
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        )}

                        {showDeleteConfirm && (<Alert severity="error" sx={{ bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ffcdd2' }}>Möchtest du dieses Team wirklich löschen?</Alert>)}
                    </Box>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                        {modalMode === 'create' && <><Button variant="outlined" onClick={handleCloseModal} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button><Button type="submit" variant="contained" sx={{ backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }}>Erstellen</Button></>}
                        {modalMode === 'view' && !showDeleteConfirm && <><Button variant="outlined" color="error" onClick={() => setShowDeleteConfirm(true)}>Löschen</Button><Button variant="contained" onClick={() => setModalMode('edit')} sx={{ backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }}>Bearbeiten</Button></>}
                        {modalMode === 'view' && showDeleteConfirm && <><Button variant="outlined" onClick={() => setShowDeleteConfirm(false)} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button><Button variant="contained" color="error" onClick={handleDelete}>Endgültig löschen</Button></>}
                        {modalMode === 'edit' && <><Button variant="outlined" onClick={() => { setModalMode('view'); setShowDeleteConfirm(false); }} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button><Button type="submit" variant="contained" sx={{ backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }}>Speichern</Button></>}
                    </Box>
                </form>
            </ReusableModal>

            <TableContainer component={Paper} sx={{ backgroundColor: theme.palette.background.paper, borderRadius: 2, border: '1px solid', borderColor: theme.palette.divider }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: theme.palette.action.hover }}>
                            {/* KORREKTUR: Leere Zelle für die korrekte Ausrichtung, kein Header-Text für das Logo */}
                            <StyledTableCell sx={{ width: isMobile ? '15%' : '5%', color: theme.palette.text.primary, fontWeight: 'bold' }} />
                            <StyledTableCell sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>Name</StyledTableCell>
                            {/* KORREKTUR: Spalten werden im Mobile-Modus ausgeblendet */}
                            {!isMobile && <StyledTableCell sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>Kontaktperson</StyledTableCell>}
                            {!isMobile && <StyledTableCell sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>E-Mail</StyledTableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {teams.map(team => (
                            <TableRow key={team.id} onClick={() => handleRowClick(team)} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: theme.palette.action.hover } }}>
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
                                                color: team.logoColor || theme.palette.grey[700]
                                            }} />
                                            {/* Ebene 2: Der darüberliegende, feinere Rand */}
                                            <ShieldOutlinedIcon sx={{
                                                position: 'absolute',
                                                width: '100%',
                                                height: '100%',
                                                color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)'
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

