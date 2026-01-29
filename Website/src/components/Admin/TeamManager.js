import React, { useState, useEffect } from 'react';
import { Box, Button, Table, TableBody, TableContainer, TableHead, TableRow, Paper, Typography, TextField, useTheme, useMediaQuery, Alert, Snackbar, CircularProgress, InputAdornment, Tabs, Tab } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AppModal from '../Modals/AppModal';
import { StyledTableCell, filterData } from '../Helpers/tableUtils';
import * as teamApiService from '../../services/teamApiService';
import { API_BASE_URL } from '../../services/apiClient';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import ShieldIcon from '@mui/icons-material/Shield';

const TabPanel = (props) => {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && (
                <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {children}
                </Box>
            )}
        </div>
    );
};

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
        name: '', contactPerson: '',
        contactEmail: '', contactPhone: '', logoColor: '#666666'
    };

    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
    const [logoFile, setLogoFile] = useState(null);
    const [logoFileLight, setLogoFileLight] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState(0);

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
        setActiveTab(0);
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
            contactPerson: team.contactPerson || '',
            contactEmail: team.contactEmail || '',
            contactPhone: team.contactPhone || '',
            logoColor: team.logoColor || '#666666'
        });
        setModalMode('view');
        setIsModalOpen(true);
        setActiveTab(0);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        try {
            if (modalMode === 'create') {
                const newTeam = await teamApiService.createTeam(formData);
                setTeams([...teams, newTeam]);
                setNotification({ open: true, message: 'Team erfolgreich erstellt.', severity: 'success' });

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
                fetchData();
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

    const isReadOnly = modalMode === 'view';

    const searchableFields = [{ key: 'name' }, { key: 'contactPerson' }, { key: 'contactEmail' }];
    const filteredTeams = filterData(teams, searchTerm, searchableFields);

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

            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    placeholder="Suche nach Team, Kontakt..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ ...inputStyle, maxWidth: '600px' }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: theme.palette.text.secondary }} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleNotificationClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleNotificationClose} severity={notification.severity} sx={{ width: '100%' }}>{notification.message}</Alert>
            </Snackbar>

            <AppModal
                open={isModalOpen}
                onClose={handleCloseModal}
                title={modalMode === 'create' ? 'Neues Team' : 'Teamdetails'}
                fullScreenMobile
                actions={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                        <Button
                            onClick={handleCloseModal}
                            sx={{ color: theme.palette.text.secondary }}
                        >
                            {modalMode === 'view' ? 'Schließen' : 'Abbrechen'}
                        </Button>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {modalMode === 'view' && !showDeleteConfirm && (
                                <>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={() => setShowDeleteConfirm(true)}
                                    >
                                        Löschen
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={() => setModalMode('edit')}
                                        sx={{ backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }}
                                    >
                                        Bearbeiten
                                    </Button>
                                </>
                            )}

                            {modalMode === 'view' && showDeleteConfirm && (
                                <>
                                    <Button
                                        variant="outlined"
                                        onClick={() => setShowDeleteConfirm(false)}
                                        sx={{ color: theme.palette.text.secondary }}
                                    >
                                        Abbrechen
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="error"
                                        onClick={handleDelete}
                                    >
                                        Endgültig löschen
                                    </Button>
                                </>
                            )}

                            {modalMode !== 'view' && (
                                <Button
                                    onClick={handleSubmit}
                                    variant="contained"
                                    sx={{ backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }}
                                >
                                    {modalMode === 'create' ? 'Erstellen' : 'Speichern'}
                                </Button>
                            )}
                        </Box>
                    </Box>
                }
            >
                <form id="team-form" onSubmit={handleSubmit}>
                    <Tabs
                        value={activeTab}
                        onChange={(e, newValue) => setActiveTab(newValue)}
                        variant="fullWidth"
                        textColor="primary"
                        indicatorColor="primary"
                        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                    >
                        <Tab icon={<PersonOutlineIcon />} label="Allgemeine Daten" />
                        <Tab icon={<PaletteOutlinedIcon />} label="Logos & Farben" />
                    </Tabs>

                    <TabPanel value={activeTab} index={0}>
                        <TextField size="small" label="Teamname" fullWidth required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} sx={inputStyle} disabled={isReadOnly} />
                        <TextField size="small" label="Kontaktperson" fullWidth value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} sx={inputStyle} disabled={isReadOnly} />
                        <TextField size="small" label="Kontakt E-Mail" type="email" fullWidth value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })} sx={inputStyle} disabled={isReadOnly} />
                        <TextField size="small" label="Kontakt Telefon" fullWidth value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} sx={inputStyle} disabled={isReadOnly} />
                    </TabPanel>

                    <TabPanel value={activeTab} index={1}>
                        <TextField size="small" label="Logofarbe (Hex-Code)" fullWidth value={formData.logoColor} onChange={(e) => setFormData({ ...formData, logoColor: e.target.value })} sx={inputStyle} disabled={isReadOnly} />

                        {(modalMode === 'edit' || modalMode === 'view') && selectedTeam ? (
                            <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
                                <Box sx={{ border: '1px dashed', borderColor: theme.palette.divider, p: 2, borderRadius: 1, mt: 1, flex: 1 }}>
                                    <Typography sx={{ color: theme.palette.text.secondary, mb: 1 }}>Logo (Dark Mode / Default)</Typography>
                                    <input
                                        accept="image/png, image/jpeg, image/webp"
                                        style={{ display: 'none' }}
                                        id="logo-upload-file-dark"
                                        type="file"
                                        onChange={(e) => setLogoFile(e.target.files[0])}
                                    />
                                    <label htmlFor="logo-upload-file-dark">
                                        <Button variant="outlined" component="span" disabled={isReadOnly} sx={{ color: theme.palette.text.secondary, borderColor: theme.palette.divider, mr: 1, mb: 1 }}>
                                            Datei auswählen
                                        </Button>
                                    </label>
                                    {logoFile && (
                                        <Button variant="contained" onClick={() => handleLogoUpload('dark')} sx={{ backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark }, mb: 1 }}>
                                            Hochladen
                                        </Button>
                                    )}
                                    {logoFile && <Typography sx={{ color: theme.palette.text.secondary, fontSize: '0.8rem', display: 'block' }}>{logoFile.name}</Typography>}
                                    {selectedTeam?.logoUrl && (
                                        <Box mt={2}>
                                            <Typography variant="caption" display="block" color={theme.palette.text.secondary} mb={0.5}>Aktuell:</Typography>
                                            <Box component="img" src={`${API_BASE_URL}${selectedTeam.logoUrl}`} alt="Dark Logo" sx={{ width: 48, height: 48, objectFit: 'contain', bgcolor: '#222', p: 0.5, borderRadius: 1 }} />
                                        </Box>
                                    )}
                                </Box>

                                <Box sx={{ border: '1px dashed', borderColor: theme.palette.divider, p: 2, borderRadius: 1, mt: 1, flex: 1 }}>
                                    <Typography sx={{ color: theme.palette.text.secondary, mb: 1 }}>Logo (Light Mode)</Typography>
                                    <input
                                        accept="image/png, image/jpeg, image/webp"
                                        style={{ display: 'none' }}
                                        id="logo-upload-file-light"
                                        type="file"
                                        onChange={(e) => setLogoFileLight(e.target.files[0])}
                                    />
                                    <label htmlFor="logo-upload-file-light">
                                        <Button variant="outlined" component="span" disabled={isReadOnly} sx={{ color: theme.palette.text.secondary, borderColor: theme.palette.divider, mr: 1, mb: 1 }}>
                                            Datei auswählen
                                        </Button>
                                    </label>
                                    {logoFileLight && (
                                        <Button variant="contained" onClick={() => handleLogoUpload('light')} sx={{ backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark }, mb: 1 }}>
                                            Hochladen
                                        </Button>
                                    )}
                                    {logoFileLight && <Typography sx={{ color: theme.palette.text.secondary, fontSize: '0.8rem', display: 'block' }}>{logoFileLight.name}</Typography>}
                                    {selectedTeam.logoUrlLight && (
                                        <Box mt={2}>
                                            <Typography variant="caption" display="block" color={theme.palette.text.secondary} mb={0.5}>Aktuell:</Typography>
                                            <Box component="img" src={`${API_BASE_URL}${selectedTeam.logoUrlLight}`} alt="Light Logo" sx={{ width: 48, height: 48, objectFit: 'contain', bgcolor: '#eee', p: 0.5, borderRadius: 1 }} />
                                        </Box>
                                    )}
                                </Box>
                            </Box>
                        ) : (
                            (modalMode === 'create' || !selectedTeam) && (
                                <Alert severity="info" sx={{ mt: 2 }}>
                                    Du kannst Bilder hochladen, nachdem das Team erstellt wurde.
                                </Alert>
                            )
                        )}
                        {showDeleteConfirm && (<Alert severity="error" sx={{ bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ffcdd2', mt: 2 }}>Möchtest du dieses Team wirklich löschen?</Alert>)}
                    </TabPanel>
                </form>
            </AppModal>

            <TableContainer component={Paper} sx={{ backgroundColor: theme.palette.background.paper, borderRadius: 2, boxShadow: 'none' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: theme.palette.action.hover }}>
                            <StyledTableCell sx={{ width: isMobile ? '15%' : '5%', color: theme.palette.text.primary, fontWeight: 'bold' }} />
                            <StyledTableCell sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>Name</StyledTableCell>
                            {!isMobile && <StyledTableCell sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>Kontaktperson</StyledTableCell>}
                            {!isMobile && <StyledTableCell sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>E-Mail</StyledTableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredTeams.map(team => (
                            <TableRow key={team.id} onClick={() => handleRowClick(team)} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: theme.palette.action.hover } }}>
                                <StyledTableCell>
                                    {team.logoUrl ? (
                                        <Box
                                            component="img"
                                            src={`${API_BASE_URL}${team.logoUrl}`}
                                            alt={`${team.name} Logo`}
                                            sx={{
                                                width: 48,
                                                height: 48,
                                                objectFit: 'contain',
                                                borderRadius: 1.5,
                                            }}
                                        />
                                    ) : (
                                        <Box sx={{
                                            position: 'relative',
                                            width: 48,
                                            height: 48,
                                            backgroundColor: 'rgba(0,0,0,0.1)',
                                            borderRadius: 1.5,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <ShieldIcon sx={{ fontSize: 40, color: 'rgba(0,0,0,0.2)' }} />
                                            {team.name && (
                                                <Typography sx={{
                                                    position: 'absolute',
                                                    fontWeight: 'bold',
                                                    color: '#fff',
                                                    textShadow: '0px 1px 2px rgba(0,0,0,0.5)',
                                                    fontSize: '0.8rem',
                                                }}>
                                                    {team.name.charAt(0)}
                                                </Typography>
                                            )}
                                        </Box>
                                    )}
                                </StyledTableCell>
                                <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>{team.name}</StyledTableCell>
                                {!isMobile && <StyledTableCell sx={{ color: theme.palette.text.primary }}>{team.contactPerson || '-'}</StyledTableCell>}
                                {!isMobile && <StyledTableCell sx={{ color: theme.palette.text.primary }}>{team.contactEmail || '-'}</StyledTableCell>}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default TeamManager;
