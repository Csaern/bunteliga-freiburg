import React, { useState, useEffect } from 'react';
import { Box, Button, Table, TableBody, TableContainer, TableHead, TableRow, Paper, Typography, TextField, Select, MenuItem, FormControl, InputLabel, Switch, InputAdornment, FormControlLabel, Alert, useTheme, useMediaQuery, CircularProgress, Snackbar } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { ReusableModal } from '../Helpers/modalUtils';
import { StyledTableCell, filterData } from '../Helpers/tableUtils';
import * as userApiService from '../../services/userApiService'; // NEU

// NEU: Status-Indikator für die mobile Ansicht
const StatusIndicator = ({ isAdmin }) => (
    <Box
        sx={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: isAdmin ? '#FFBF00' : 'grey.600', // Gelb für Admin, Grau für normal
            mr: 2,
            flexShrink: 0,
        }}
    />
);

const UserManager = ({ teams, getTeamName }) => {
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
        // NEU: Styling für deaktivierte Elemente
        '& .Mui-disabled': {
            WebkitTextFillColor: `${theme.palette.grey[500]} !important`,
            color: `${theme.palette.grey[500]} !important`,
        },
        '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
            borderColor: 'grey.800',
        },
    };

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('view'); // 'create', 'view', 'edit'
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '', teamId: '', isAdmin: false, displayName: '' });
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const fetchedUsers = await userApiService.getAllUsers();
            // Die Anreicherung passiert jetzt im Backend. Wir fügen nur noch die 'id' hinzu.
            const usersWithId = fetchedUsers.map(u => ({ ...u, id: u.uid }));
            setUsers(usersWithId);
        } catch (err) {
            setNotification({ open: true, message: 'Fehler beim Laden der Benutzer.', severity: 'error' });
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedUser) {
            setFormData({
                email: selectedUser.email || '',
                displayName: selectedUser.displayName || '',
                password: '',
                teamId: selectedUser.teamId || '',
                isAdmin: selectedUser.isAdmin || false,
            });
        }
    }, [selectedUser]);

    const handleOpenCreateModal = () => {
        setSelectedUser(null);
        setFormData({ email: '', password: '', teamId: '', isAdmin: false, displayName: '' });
        setModalMode('create');
        setIsModalOpen(true);
    };

    const handleRowClick = (user) => {
        setSelectedUser(user);
        setModalMode('view');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setShowDeleteConfirm(false);
        setSelectedUser(null);
    };

    const handleNotificationClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setNotification({ ...notification, open: false });
    };

    const generatePassword = () => {
        const length = 12;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modalMode === 'edit' && selectedUser) {
                await userApiService.updateUser(selectedUser.id, {
                    teamId: formData.teamId || null,
                    isAdmin: formData.isAdmin,
                });
                setNotification({ open: true, message: 'Benutzer erfolgreich aktualisiert.', severity: 'success' });
            } else if (modalMode === 'create') {
                const password = formData.password || generatePassword();
                await userApiService.createUser({
                    email: formData.email,
                    password: password,
                    displayName: formData.displayName || formData.email.split('@')[0],
                    teamId: formData.teamId || null,
                    isAdmin: formData.isAdmin,
                });
                setNotification({ open: true, message: `Benutzer erfolgreich erstellt! Passwort: ${password}`, severity: 'success' });
            }
            fetchData();
            handleCloseModal();
        } catch (err) {
            setNotification({ open: true, message: err.message || 'Ein Fehler ist aufgetreten.', severity: 'error' });
        }
    };

    const handleDelete = async () => {
        if (!selectedUser) return;
        try {
            await userApiService.deleteUser(selectedUser.id);
            setNotification({ open: true, message: 'Benutzer wurde vollständig gelöscht.', severity: 'success' });
            fetchData();
            handleCloseModal();
        } catch (err) {
            setNotification({ open: true, message: 'Fehler beim Löschen des Benutzers.', severity: 'error' });
        }
    };

    const searchableFields = [
        { key: 'email' },
        { key: 'displayName' },
        { key: 'teamName' }, // KORREKTUR: Direkt nach dem vom Backend gelieferten Team-Namen suchen
    ];

    const filteredUsers = filterData(users, searchTerm, searchableFields);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress sx={{ color: '#00A99D' }} /></Box>;

    return (
        <Box sx={{ p: { sm: 3 } }}>
            <Typography variant={isMobile ? 'h6' : 'h4'} sx={{ mb: 2, mt: 2, color: '#00A99D', fontWeight: 700, fontFamily: 'comfortaa', textAlign: 'center', textTransform: 'uppercase' }}>
                Benutzerverwaltung
            </Typography>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                <Button variant="contained" onClick={handleOpenCreateModal} sx={{ backgroundColor: '#00A99D', '&:hover': { backgroundColor: '#00897B' } }}>
                    Neuen Benutzer erstellen
                </Button>
            </Box>
            
            <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleNotificationClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleNotificationClose} severity={notification.severity} sx={{ width: '100%', '.MuiAlert-message': { overflow: 'hidden' } }}>
                    {notification.message}
                </Alert>
            </Snackbar>

            <TextField fullWidth variant="outlined" size="small" placeholder="Suche nach Email, Name oder Team..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ ...darkInputStyle, mb: 2 }}
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: 'grey.500' }} /></InputAdornment>), }}
            />

            <ReusableModal open={isModalOpen} onClose={handleCloseModal} title={modalMode === 'create' ? 'Neuen Benutzer erstellen' : 'Benutzerdetails'}>
                <form onSubmit={handleSubmit}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField size="small" label="Email" type="email" fullWidth required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} sx={darkInputStyle} disabled={modalMode !== 'create'} />
                        <TextField size="small" label="Anzeigename" type="text" fullWidth value={formData.displayName} onChange={(e) => setFormData({ ...formData, displayName: e.target.value })} sx={darkInputStyle} disabled={modalMode === 'view'} />
                        {modalMode === 'create' && (
                            <TextField size="small" label="Passwort (optional)" type="password" fullWidth placeholder="Leer lassen für autom. Passwort" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} sx={darkInputStyle} />
                        )}
                        <FormControl size="small" fullWidth sx={darkInputStyle} disabled={modalMode === 'view'}>
                            <InputLabel>Team</InputLabel>
                            <Select value={formData.teamId} label="Team" onChange={(e) => setFormData({ ...formData, teamId: e.target.value })} MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200' } } }}>
                                <MenuItem value=""><em>Kein Team</em></MenuItem>
                                {teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.isAdmin}
                                    onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                                    disabled={modalMode === 'view'}
                                    sx={{
                                        '& .MuiSwitch-switchBase.Mui-checked': { color: '#FFBF00' },
                                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#FFBF00' },
                                    }}
                                />
                            }
                            label="Administrator"
                            sx={{
                                color: 'grey.100',
                                // Stellt sicher, dass das Label im deaktivierten Zustand hell bleibt
                                '& .MuiFormControlLabel-label.Mui-disabled': {
                                    color: theme.palette.grey[500],
                                }
                            }}
                        />
                        
                        {showDeleteConfirm && modalMode === 'view' && (
                            <Alert severity="error" sx={{ bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ffcdd2' }}>
                                Benutzer wirklich löschen? Dies kann nicht rückgängig gemacht werden.
                            </Alert>
                        )}

                        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                            {modalMode === 'create' && <>
                                <Button variant="outlined" onClick={handleCloseModal} sx={{ color: 'grey.400', borderColor: 'grey.700', '&:hover': { borderColor: 'grey.500' } }}>Abbrechen</Button>
                                <Button type="submit" variant="contained" sx={{ backgroundColor: '#00A99D', '&:hover': { backgroundColor: '#00897B' } }}>Erstellen</Button>
                            </>}
                            {modalMode === 'view' && !showDeleteConfirm && <>
                                <Button variant="outlined" color="error" onClick={() => setShowDeleteConfirm(true)}>Löschen</Button>
                                <Button variant="contained" onClick={() => setModalMode('edit')} sx={{ backgroundColor: '#00A99D', '&:hover': { backgroundColor: '#00897B' } }}>Bearbeiten</Button>
                            </>}
                            {modalMode === 'view' && showDeleteConfirm && <>
                                <Button variant="outlined" onClick={() => setShowDeleteConfirm(false)} sx={{ color: 'grey.400', borderColor: 'grey.700', '&:hover': { borderColor: 'grey.500' } }}>Abbrechen</Button>
                                <Button variant="contained" color="error" onClick={handleDelete}>Endgültig löschen</Button>
                            </>}
                            {modalMode === 'edit' && <>
                                <Button variant="outlined" onClick={() => {
                                    // Setzt das Formular auf den ursprünglichen Zustand des ausgewählten Benutzers zurück
                                    if (selectedUser) {
                                        setFormData({
                                            email: selectedUser.email || '',
                                            displayName: selectedUser.displayName || '',
                                            password: '',
                                            teamId: selectedUser.teamId || '',
                                            isAdmin: selectedUser.isAdmin || false,
                                        });
                                    }
                                    setModalMode('view');
                                }} sx={{ color: 'grey.400', borderColor: 'grey.700', '&:hover': { borderColor: 'grey.500' } }}>Abbrechen</Button>
                                <Button type="submit" variant="contained" sx={{ backgroundColor: '#00A99D', '&:hover': { backgroundColor: '#00897B' } }}>Speichern</Button>
                            </>}

                        </Box>
                    </Box>
                </form>
            </ReusableModal>

            {filteredUsers.length === 0 ? (
                <Paper sx={{ backgroundColor: '#111', borderRadius: 2, p: 3, textAlign: 'center', border: '1px solid #222' }}>
                    <Typography sx={{ color: 'grey.500' }}>{searchTerm ? 'Keine passenden Benutzer gefunden.' : 'Keine Benutzer vorhanden.'}</Typography>
                </Paper>
            ) : (
                <TableContainer component={Paper} sx={{ backgroundColor: '#111', borderRadius: 2, border: '1px solid', borderColor: 'grey.800' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ borderBottom: `2px solid ${theme.palette.grey[800]}` }}>
                                {isMobile ? (
                                    <StyledTableCell>Benutzer</StyledTableCell>
                                ) : (
                                    <>
                                        <StyledTableCell sx={{ width: '5%' }} />
                                        <StyledTableCell>Email</StyledTableCell>
                                        <StyledTableCell>Team</StyledTableCell>
                                    </>
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredUsers.map(user => (
                                <TableRow key={user.id} onClick={() => handleRowClick(user)} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                                    {isMobile ? (
                                        <StyledTableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <StatusIndicator isAdmin={user.isAdmin} />
                                                <Box>
                                                    <Typography sx={{ fontSize: '0.9rem', color: 'grey.100' }}>{user.email}</Typography>
                                                    <Typography sx={{ fontSize: '0.8rem', color: 'grey.500' }}>{user.teamName || 'Kein Team'}</Typography>
                                                </Box>
                                            </Box>
                                        </StyledTableCell>
                                    ) : (
                                        <>
                                            <StyledTableCell sx={{ py: 1.5 }}>
                                                <StatusIndicator isAdmin={user.isAdmin} />
                                            </StyledTableCell>
                                            <StyledTableCell sx={{ py: 1.5 }}>{user.email}</StyledTableCell>
                                            <StyledTableCell sx={{ py: 1.5 }}>{user.teamName || '-'}</StyledTableCell>
                                        </>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default UserManager;
