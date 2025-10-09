import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { Box, Button, Table, TableBody, TableContainer, TableHead, TableRow, Paper, Typography, TextField, Avatar, useTheme, useMediaQuery, Alert, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { ReusableModal } from '../Helpers/modalUtils';
import { StyledTableCell } from '../Helpers/tableUtils';

const TeamManager = ({ teams, fetchData }) => {
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

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        setModalMode('view'); // Start im Ansichtsmodus
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setShowDeleteConfirm(false);
        setSelectedTeam(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modalMode === 'edit' && selectedTeam) {
                await updateDoc(doc(db, "teams", selectedTeam.id), { ...formData, updatedAt: serverTimestamp() });
            } else {
                await addDoc(collection(db, 'teams'), { ...formData, createdAt: serverTimestamp() });
            }
            handleCloseModal();
            fetchData();
        } catch (error) { console.error('Fehler:', error); }
    };

    const handleDelete = async () => {
        if (!selectedTeam) return;
        try {
            await deleteDoc(doc(db, 'teams', selectedTeam.id));
            handleCloseModal();
            fetchData();
        } catch (error) { console.error('Fehler beim Löschen:', error); }
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
                        <TextField size="small" label="Instagram URL" fullWidth value={formData.socialMedia.instagram} onChange={(e) => setFormData({ ...formData, socialMedia: { ...formData.socialMedia, instagram: e.target.value } })} sx={darkInputStyle} disabled={isReadOnly} />
                        <TextField size="small" label="Twitter URL" fullWidth value={formData.socialMedia.twitter} onChange={(e) => setFormData({ ...formData, socialMedia: { ...formData.socialMedia, twitter: e.target.value } })} sx={darkInputStyle} disabled={isReadOnly} />
                        
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
                            <StyledTableCell sx={{ width: '5%' }}>Logo</StyledTableCell>
                            <StyledTableCell>Name</StyledTableCell>
                            <StyledTableCell>Kontaktperson</StyledTableCell>
                            <StyledTableCell>E-Mail</StyledTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {teams.map(team => (
                            <TableRow key={team.id} onClick={() => handleRowClick(team)} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                                <StyledTableCell>
                                    <Avatar alt={team.name} src={team.logoUrl} sx={{ width: 32, height: 32, bgcolor: team.logoColor || '#666' }}>
                                        {!team.logoUrl && team.name.substring(0, 1).toUpperCase()}
                                    </Avatar>
                                </StyledTableCell>
                                <StyledTableCell>{team.name}</StyledTableCell>
                                <StyledTableCell>{team.contactPerson || '-'}</StyledTableCell>
                                <StyledTableCell>{team.contactEmail || '-'}</StyledTableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default TeamManager;

