import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { Box, Button, Table, TableBody, TableContainer, TableHead, TableRow, Paper, Typography, TextField, Select, MenuItem, FormControl, InputLabel, Switch, InputAdornment, FormControlLabel, Alert, useTheme, useMediaQuery } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { ReusableModal } from '../Helpers/modalUtils';
import { StyledTableCell, filterData } from '../Helpers/tableUtils';

const UserManager = ({ users, teams, fetchData, currentUser, getTeamName }) => {
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

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('view'); // 'create', 'view', 'edit'
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '', teamId: '', isAdmin: false });
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (selectedUser) {
            setFormData({
                email: selectedUser.email || '',
                password: '', // Password is not fetched, so it's always empty in the form
                teamId: selectedUser.teamId || '',
                isAdmin: selectedUser.isAdmin || false,
            });
        }
    }, [selectedUser]);

    const handleOpenCreateModal = () => {
        setSelectedUser(null);
        setFormData({ email: '', password: '', teamId: '', isAdmin: false });
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
        if (modalMode === 'edit' && selectedUser) {
            // Update logic
            await handleUpdateUser(selectedUser.id, {
                teamId: formData.teamId || null,
                isAdmin: formData.isAdmin,
                role: formData.isAdmin ? 'admin' : 'team',
            });
        } else if (modalMode === 'create') {
            // Create logic
            const password = formData.password || generatePassword();
            const adminEmail = currentUser.email;
            const adminPassword = prompt('Bitte Admin-Passwort zur Bestätigung eingeben:');
            if (!adminPassword) return;

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, formData.email, password);
                const userData = {
                    uid: userCredential.user.uid,
                    email: formData.email,
                    teamId: formData.teamId || null,
                    role: formData.isAdmin ? 'admin' : 'team',
                    isAdmin: formData.isAdmin,
                    createdAt: serverTimestamp(),
                };
                await setDoc(doc(db, 'users', userCredential.user.uid), userData);
                await signOut(auth);
                await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
                alert(`Benutzer erfolgreich erstellt!\nPasswort: ${password}`);
                fetchData();
            } catch (error) {
                console.error('Fehler beim Erstellen des Benutzers:', error);
                alert('Fehler: ' + error.message);
                try {
                    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
                } catch (reauthError) {
                    console.error("Kritischer Fehler: Admin konnte nicht erneut angemeldet werden.", reauthError);
                }
            }
        }
        handleCloseModal();
    };

    const handleUpdateUser = async (userId, updates) => {
        try {
            await updateDoc(doc(db, 'users', userId), { ...updates, updatedAt: serverTimestamp() });
            fetchData();
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Benutzers:', error);
        }
    };

    const handleDelete = async () => {
        if (!selectedUser) return;
        try {
            // Note: Deleting a user from Firestore doesn't delete them from Firebase Auth.
            // This requires a backend function for security reasons.
            await deleteDoc(doc(db, 'users', selectedUser.id));
            alert('Benutzer aus der Datenbank gelöscht. Das Auth-Konto muss manuell entfernt werden.');
            handleCloseModal();
            fetchData();
        } catch (error) {
            console.error('Fehler beim Löschen des Benutzers:', error);
        }
    };

    const searchableFields = [
        { key: 'email' },
        { key: 'teamId', accessor: (user) => getTeamName(user.teamId) },
    ];

    const filteredUsers = filterData(users, searchTerm, searchableFields);

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

            <TextField fullWidth variant="outlined" size="small" placeholder="Suche nach Email oder Team..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ ...darkInputStyle, mb: 2 }}
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: 'grey.500' }} /></InputAdornment>), }}
            />

            <ReusableModal open={isModalOpen} onClose={handleCloseModal} title={modalMode === 'create' ? 'Neuen Benutzer erstellen' : 'Benutzerdetails'}>
                <form onSubmit={handleSubmit}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField size="small" label="Email" type="email" fullWidth required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} sx={darkInputStyle} disabled={modalMode !== 'create'} />
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
                                <StyledTableCell>Email</StyledTableCell>
                                <StyledTableCell>Team</StyledTableCell>
                                <StyledTableCell align="center">Admin</StyledTableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredUsers.map(user => (
                                <TableRow key={user.id} onClick={() => handleRowClick(user)} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                                    <StyledTableCell>{user.email}</StyledTableCell>
                                    <StyledTableCell>{getTeamName(user.teamId) || '-'}</StyledTableCell>
                                    <StyledTableCell align="center">
                                        <Switch 
                                            checked={user.isAdmin} 
                                            readOnly 
                                            sx={{ 
                                                cursor: 'pointer',
                                                '& .MuiSwitch-switchBase.Mui-checked': { color: '#FFBF00' },
                                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#FFBF00' },
                                            }} 
                                        />
                                    </StyledTableCell>
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
