import React, { useState, useEffect } from 'react';
import { Box, Button, Table, TableBody, TableContainer, TableHead, TableRow, Paper, Typography, TextField, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel, Alert, useTheme, useMediaQuery, CircularProgress, Snackbar, Link, InputAdornment } from '@mui/material';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SearchIcon from '@mui/icons-material/Search';
import { ReusableModal } from '../Helpers/modalUtils';
import { StyledTableCell, filterData } from '../Helpers/tableUtils';
import * as pitchApiService from '../../services/pitchApiService';
import { API_BASE_URL } from '../../services/apiClient'; // NEU: Für Bild-URL benötigt

const PitchManager = ({ teams }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // KORREKTUR: Styling exakt vom UserManager übernommen
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
        '& .Mui-disabled': {
            WebkitTextFillColor: `${theme.palette.grey[500]} !important`,
            color: `${theme.palette.grey[500]} !important`,
        },
        '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
            borderColor: 'grey.800',
        },
    };

    const initialFormData = { name: '', address: '', type: '', notes: '', teamId: '', isVerified: false };

    const [pitches, setPitches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('view');
    const [selectedPitch, setSelectedPitch] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [formData, setFormData] = useState(initialFormData);
    const [searchTerm, setSearchTerm] = useState('');
    const [googleMapsLink, setGoogleMapsLink] = useState('');
    const [pitchImageFile, setPitchImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [showImageDeleteConfirm, setShowImageDeleteConfirm] = useState(false); // NEU: State für Lösch-Bestätigung

    const fetchData = async () => {
        try {
            setLoading(true);
            const fetchedPitches = await pitchApiService.getAllPitches();
            setPitches(fetchedPitches);
        } catch (err) {
            setNotification({ open: true, message: 'Fehler beim Laden der Plätze.', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // KORREKTUR: Generiert den Google Maps Link live bei der Eingabe
    useEffect(() => {
        if (formData.address && formData.address.trim() !== '') {
            const encodedAddress = encodeURIComponent(formData.address);
            setGoogleMapsLink(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`);
        } else {
            setGoogleMapsLink('');
        }
    }, [formData.address]);

    useEffect(() => {
        if (selectedPitch) {
            setFormData({
                name: selectedPitch.name || '',
                address: selectedPitch.address || '',
                type: selectedPitch.type || '',
                notes: selectedPitch.notes || '',
                teamId: selectedPitch.teamId || '',
                isVerified: selectedPitch.isVerified || false,
            });
            // NEU: Setzt die Vorschau auf das vorhandene Bild
            if (selectedPitch.imageUrl) {
                setImagePreview(`${API_BASE_URL}${selectedPitch.imageUrl}`);
            }
        }
    }, [selectedPitch]);

    const handleOpenCreateModal = () => {
        setSelectedPitch(null);
        setFormData(initialFormData);
        setModalMode('create');
        setIsModalOpen(true);
    };

    const handleRowClick = (pitch) => {
        setSelectedPitch(pitch);
        setModalMode('view');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setShowDeleteConfirm(false);
        setShowImageDeleteConfirm(false); // NEU: Zurücksetzen
        setSelectedPitch(null);
        setPitchImageFile(null); // NEU: Bilddatei zurücksetzen
        // NEU: Speicher für die Vorschau freigeben
        if (imagePreview && imagePreview.startsWith('blob:')) {
            URL.revokeObjectURL(imagePreview);
        }
        setImagePreview('');
    };

    const handleNotificationClose = () => setNotification({ ...notification, open: false });

    // NEU: Handler für die Auswahl einer Bilddatei
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setPitchImageFile(file);
            // Vorschau-URL erstellen
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);
        }
    };

    // NEU: Funktion zum Hochladen des Bildes
    const handleImageUpload = async () => {
        if (!pitchImageFile || !selectedPitch) return;
        const formData = new FormData();
        formData.append('pitchImage', pitchImageFile);

        try {
            const updatedPitch = await pitchApiService.uploadPitchImage(selectedPitch.id, formData);
            setNotification({ open: true, message: 'Bild erfolgreich hochgeladen.', severity: 'success' });
            setPitchImageFile(null);
            setPitches(prev => prev.map(p => p.id === updatedPitch.id ? updatedPitch : p));
            setSelectedPitch(updatedPitch);
        } catch (error) {
            setNotification({ open: true, message: error.message || 'Fehler beim Hochladen des Bildes.', severity: 'error' });
        }
    };

    // NEU: Funktion zum Löschen des Bildes
    const handleDeleteImage = async () => {
        if (!selectedPitch) return;
        try {
            const updatedPitch = await pitchApiService.deletePitchImage(selectedPitch.id);
            setNotification({ open: true, message: 'Bild erfolgreich entfernt.', severity: 'success' });
            setImagePreview('');
            setShowImageDeleteConfirm(false);
            setPitches(prev => prev.map(p => p.id === updatedPitch.id ? updatedPitch : p));
            setSelectedPitch(updatedPitch);
        } catch (error) {
            setNotification({ open: true, message: error.message || 'Fehler beim Entfernen des Bildes.', severity: 'error' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modalMode === 'edit' && selectedPitch) {
                await pitchApiService.updatePitch(selectedPitch.id, formData);
                setNotification({ open: true, message: 'Platz erfolgreich aktualisiert.', severity: 'success' });
            } else if (modalMode === 'create') {
                await pitchApiService.createPitch(formData);
                setNotification({ open: true, message: 'Platz erfolgreich erstellt.', severity: 'success' });
            }
            fetchData();
            handleCloseModal();
        } catch (err) {
            setNotification({ open: true, message: err.message || 'Ein Fehler ist aufgetreten.', severity: 'error' });
        }
    };

    // KORREKTUR: Umbenannt und Logik angepasst.
    const handleArchive = async () => {
        if (!selectedPitch) return;
        try {
            await pitchApiService.archivePitch(selectedPitch.id);
            setNotification({ open: true, message: 'Platz erfolgreich archiviert.', severity: 'success' });
            fetchData(); // Lädt die Liste neu, der archivierte Platz verschwindet.
            handleCloseModal();
        } catch (err) {
            setNotification({ open: true, message: 'Fehler beim Archivieren des Platzes.', severity: 'error' });
        }
    };

    const getTeamName = (teamId) => teams.find(t => t.id === teamId)?.name || '-';
    const searchableFields = [{ key: 'name' }, { key: 'address' }, { key: 'teamId', accessor: getTeamName }];
    const filteredPitches = filterData(pitches, searchTerm, searchableFields);

    // KORREKTUR: Sortiert die Plätze, sodass offizielle immer oben stehen.
    const sortedPitches = [...filteredPitches].sort((a, b) => {
        // Sortiert nach 'isVerified' (true zuerst), dann alphabetisch nach 'name'
        return (b.isVerified - a.isVerified) || a.name.localeCompare(b.name);
    });

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress sx={{ color: '#00A99D' }} /></Box>;

    return (
        <Box sx={{ p: { sm: 3 } }}>
            <Typography variant={isMobile ? 'h6' : 'h4'} sx={{ mb: 2, mt: 2, color: '#00A99D', fontWeight: 700, fontFamily: 'comfortaa', textAlign: 'center', textTransform: 'uppercase' }}>
                Platzverwaltung
            </Typography>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                <Button variant="contained" onClick={handleOpenCreateModal} sx={{ backgroundColor: '#00A99D', '&:hover': { backgroundColor: '#00897B' } }}>
                    Neuen Platz erstellen
                </Button>
            </Box>
            
            <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleNotificationClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleNotificationClose} severity={notification.severity} sx={{ width: '100%' }}>{notification.message}</Alert>
            </Snackbar>

            <TextField fullWidth variant="outlined" size="small" placeholder="Suche nach Name, Adresse oder Team..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ ...darkInputStyle, mb: 2 }}
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: 'grey.500' }} /></InputAdornment>), }}
            />

            <ReusableModal open={isModalOpen} onClose={handleCloseModal} title={modalMode === 'create' ? 'Neuen Platz erstellen' : 'Platzdetails'}>
                <form onSubmit={handleSubmit}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: '70vh', overflowY: 'auto', pr: 1, pt: 1 }}>
                        <TextField size="small" label="Platzname" fullWidth required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} sx={darkInputStyle} disabled={modalMode === 'view'} />
                        <TextField size="small" label="Adresse" fullWidth value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} sx={darkInputStyle} disabled={modalMode === 'view'} />
                        
                        {/* KORREKTUR: Live Google Maps Link zur Überprüfung */}
                        {googleMapsLink && modalMode !== 'view' && (
                            <Button component={Link} href={googleMapsLink} target="_blank" rel="noopener noreferrer" variant="outlined" sx={{ color: '#00A99D', borderColor: 'grey.700', '&:hover': { borderColor: '#00A99D' } }}>
                                Adresse auf Google Maps prüfen
                            </Button>
                        )}

                        {/* NEU: Bild-Upload-Sektion */}
                        {(modalMode === 'edit' || modalMode === 'view') && (
                            <Box sx={{ border: '1px dashed', borderColor: 'grey.700', p: 2, borderRadius: 1, mt: 1 }}>
                                <Typography sx={{ color: 'grey.300', mb: 1 }}>Platz-Bild</Typography>
                                {imagePreview && (
                                    <Box
                                        component="img"
                                        src={imagePreview}
                                        alt="Platz-Vorschau"
                                        sx={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 1, mb: 2 }}
                                    />
                                )}
                                
                                {/* NEU: Sektion für Lösch-Bestätigung */}
                                {showImageDeleteConfirm ? (
                                    <Box>
                                        <Alert severity="warning" sx={{ mb: 1 }}>Bild wirklich entfernen?</Alert>
                                        <Button variant="outlined" size="small" onClick={() => setShowImageDeleteConfirm(false)} sx={{ mr: 1, color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button>
                                        <Button variant="contained" size="small" color="error" onClick={handleDeleteImage}>Endgültig entfernen</Button>
                                    </Box>
                                ) : (
                                    <Box>
                                        <input
                                            accept="image/png, image/jpeg, image/webp"
                                            style={{ display: 'none' }}
                                            id="pitch-image-upload"
                                            type="file"
                                            onChange={handleFileChange}
                                            disabled={modalMode === 'view'}
                                        />
                                        <label htmlFor="pitch-image-upload">
                                            <Button variant="outlined" component="span" disabled={modalMode === 'view'} sx={{ color: 'grey.400', borderColor: 'grey.700', mr: 1 }}>
                                                Datei auswählen
                                            </Button>
                                        </label>
                                        {pitchImageFile && (
                                            <Button variant="contained" onClick={handleImageUpload} sx={{ backgroundColor: '#00A99D' }}>
                                                Jetzt hochladen
                                            </Button>
                                        )}
                                        {/* NEU: Button zum Starten des Löschvorgangs */}
                                        {imagePreview && !pitchImageFile && modalMode !== 'view' && (
                                            <Button variant="outlined" color="error" size="small" onClick={() => setShowImageDeleteConfirm(true)} sx={{ ml: 1 }}>
                                                Entfernen
                                            </Button>
                                        )}
                                    </Box>
                                )}
                            </Box>
                        )}

                        <FormControl size="small" fullWidth sx={darkInputStyle} disabled={modalMode === 'view'}>
                            <InputLabel>Typ</InputLabel>
                            <Select value={formData.type} label="Typ" onChange={(e) => setFormData({ ...formData, type: e.target.value })} MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200' } } }}>
                                <MenuItem value="Rasen">Rasen</MenuItem>
                                <MenuItem value="Kunstrasen">Kunstrasen</MenuItem>
                                <MenuItem value="Hartplatz">Hartplatz</MenuItem>
                                <MenuItem value="Bolzplatz">Bolzplatz</MenuItem>
                                <MenuItem value="Sonstiges">Sonstiges</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small" fullWidth sx={darkInputStyle} disabled={modalMode === 'view'}>
                            <InputLabel>Gehört zu Team</InputLabel>
                            <Select value={formData.teamId} label="Gehört zu Team" onChange={(e) => setFormData({ ...formData, teamId: e.target.value })} MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200' } } }}>
                                <MenuItem value=""><em>Kein Team / Liga-Platz</em></MenuItem>
                                {teams.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField size="small" label="Hinweise" multiline rows={3} fullWidth value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} sx={darkInputStyle} disabled={modalMode === 'view'} />
                        
                        {/* KORREKTUR: Styling für Switch und Label vom UserManager übernommen */}
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.isVerified}
                                    onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
                                    disabled={modalMode === 'view'}
                                    sx={{
                                        '& .MuiSwitch-switchBase.Mui-checked': { color: '#FFBF00' },
                                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#FFBF00' },
                                    }}
                                />
                            }
                            label="Offizieller Liga-Platz"
                            sx={{ color: 'grey.100', '& .MuiFormControlLabel-label.Mui-disabled': { color: theme.palette.grey[500] } }}
                        />
                        
                        {showDeleteConfirm && (<Alert severity="error" sx={{ bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ffcdd2' }}>Platz wirklich archivieren?</Alert>)}

                        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                            {modalMode === 'create' && <><Button variant="outlined" onClick={handleCloseModal} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button><Button type="submit" variant="contained" sx={{ backgroundColor: '#00A99D' }}>Erstellen</Button></>}
                            {modalMode === 'view' && !showDeleteConfirm && <><Button variant="outlined" color="error" onClick={() => setShowDeleteConfirm(true)}>Archivieren</Button><Button variant="contained" onClick={() => setModalMode('edit')} sx={{ backgroundColor: '#00A99D' }}>Bearbeiten</Button></>}
                            {modalMode === 'view' && showDeleteConfirm && <><Button variant="outlined" onClick={() => setShowDeleteConfirm(false)} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button><Button variant="contained" color="error" onClick={handleArchive}>Endgültig archivieren</Button></>}
                            {modalMode === 'edit' && <><Button variant="outlined" onClick={() => setModalMode('view')} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button><Button type="submit" variant="contained" sx={{ backgroundColor: '#00A99D' }}>Speichern</Button></>}
                        </Box>
                    </Box>
                </form>
            </ReusableModal>

            <TableContainer component={Paper} sx={{ backgroundColor: '#111', borderRadius: 2, border: '1px solid', borderColor: 'grey.800' }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ borderBottom: `2px solid ${theme.palette.grey[800]}` }}>
                            <StyledTableCell align="center" sx={{ width: isMobile ? '15%' : '5%' }}>Bild</StyledTableCell>
                            <StyledTableCell>Name</StyledTableCell>
                            {!isMobile && <StyledTableCell>Team</StyledTableCell>}
                            {!isMobile && <StyledTableCell>Adresse</StyledTableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedPitches.map(pitch => (
                            <TableRow key={pitch.id} onClick={() => handleRowClick(pitch)} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                                <StyledTableCell align="center">
                                    {pitch.imageUrl ? (
                                        <Box
                                            component="img"
                                            src={`${API_BASE_URL}${pitch.imageUrl}`}
                                            alt={pitch.name}
                                            sx={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 1.5 }}
                                        />
                                    ) : (
                                        <VerifiedUserIcon sx={{ color: pitch.isVerified ? '#FFBF00' : 'grey.700', fontSize: 24 }} />
                                    )}
                                </StyledTableCell>
                                <StyledTableCell>
                                    <Box>
                                        <Typography sx={{ fontSize: '0.9rem', color: 'grey.100' }}>{pitch.name}</Typography>
                                        {/* KORREKTUR: Zeigt "Bunte Liga" oder Teamname an */}
                                        <Typography sx={{ fontSize: '0.8rem', color: pitch.isVerified ? 'warning.light' : 'grey.500' }}>
                                            {pitch.isVerified ? 'Bunte Liga' : (isMobile ? getTeamName(pitch.teamId) : '')}
                                        </Typography>
                                    </Box>
                                </StyledTableCell>
                                {!isMobile && <StyledTableCell>{getTeamName(pitch.teamId)}</StyledTableCell>}
                                {!isMobile && <StyledTableCell>{pitch.address || '-'}</StyledTableCell>}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default PitchManager;