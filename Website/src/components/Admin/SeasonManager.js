import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Table, TableBody, TableContainer, TableHead, TableRow, Paper, Typography, TextField, useTheme, useMediaQuery, CircularProgress, Alert, Select, MenuItem, FormControl, InputLabel, Tabs, Tab, IconButton, Tooltip, Autocomplete } from '@mui/material';
import { ReusableModal } from '../Helpers/modalUtils';
import { StyledTableCell } from '../Helpers/tableUtils';
import * as seasonApiService from '../../services/seasonApiService';
import * as teamApiService from '../../services/teamApiService';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import DeleteIcon from '@mui/icons-material/Delete';

const formatDateForInput = (dateValue) => {
    if (!dateValue) return '';
    if (typeof dateValue === 'string') return dateValue.substring(0, 10);
    if (dateValue.toDate) return dateValue.toDate().toISOString().substring(0, 10);
    try { return new Date(dateValue).toISOString().substring(0, 10); } catch (e) { return ''; }
};

const defaultSeasonData = {
    name: `Saison ${new Date().getFullYear()}`,
    startDate: '',
    endDate: '',
    playMode: 'double_round_robin',
    maxDenials: 3,
    cancellationDeadlineDays: 3,
    forfeitWinScore: 3,
    forfeitLossScore: 0,
    pointsForWin: 3,
    pointsForDraw: 1,
    pointsForLoss: 0,
    teams: []
};

const StatusIndicator = ({ status }) => {
    const theme = useTheme();
    const color = {
        active: theme.palette.success.main,
        finished: theme.palette.error.main,
        planning: theme.palette.grey[700],
    }[status] || theme.palette.grey[700];
    return <Box sx={{ width: 12, height: 12, backgroundColor: color, borderRadius: '50%' }} />;
};

const TabPanel = (props) => {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</Box>}
        </div>
    );
};

const SeasonManager = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const autocompleteInputRef = useRef(null);

    const darkInputStyle = {
        '& label.Mui-focused': { color: '#00A99D' },
        '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: 'grey.700' },
            '&:hover fieldset': { borderColor: 'grey.500' },
            '&.Mui-focused fieldset': { borderColor: '#00A99D' },
            '&.Mui-disabled .MuiOutlinedInput-notchedOutline': { borderColor: 'grey.800' },
        },
        '& .MuiInputBase-input': { color: 'grey.100', colorScheme: 'dark' },
        '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: theme.palette.grey[500] },
        '& label': { color: 'grey.400' },
        '& label.Mui-disabled': { color: 'grey.600' },
        '& .MuiSelect-icon': { color: 'grey.400' },
        // KORREKTUR: Icon-Farbe für Autocomplete hinzugefügt
        '& .MuiAutocomplete-popupIndicator': { color: 'grey.400' },
    };

    const [seasons, setSeasons] = useState([]);
    const [allTeams, setAllTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('view');
    const [selectedSeason, setSelectedSeason] = useState(null);
    const [formData, setFormData] = useState(defaultSeasonData);
    const [activeTab, setActiveTab] = useState(0);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [actionToConfirm, setActionToConfirm] = useState(null);

    useEffect(() => {
        // Dieser Hook fokussiert das Suchfeld neu, NACHDEM es durch den key-Wechsel zurückgesetzt wurde.
        if ((modalMode === 'edit' || modalMode === 'create') && activeTab === 1) {
            setTimeout(() => autocompleteInputRef.current?.focus(), 0);
        }
    }, [formData.teams.length, modalMode, activeTab]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError('');
            const [seasonsData, teamsData] = await Promise.all([
                seasonApiService.getAllSeasons(),
                teamApiService.getAllTeams()
            ]);
            setSeasons(seasonsData);
            setAllTeams(teamsData);
        } catch (err) {
            setError('Fehler beim Laden der Daten.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleOpenCreateModal = () => {
        setSelectedSeason(null);
        setFormData(defaultSeasonData);
        setModalMode('create');
        setActiveTab(0);
        setIsModalOpen(true);
    };

    const handleRowClick = (season) => {
        setSelectedSeason(season);
        setFormData({ ...defaultSeasonData, ...season, startDate: formatDateForInput(season.startDate), endDate: formatDateForInput(season.endDate) });
        setModalMode('view');
        setActiveTab(0);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleFormChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value, 10) || 0 : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const dataToSend = { ...formData, teams: formData.teams.map(t => ({ id: t.id, name: t.name })) };
            if (modalMode === 'edit') {
                await seasonApiService.updateSeason(selectedSeason.id, dataToSend);
            } else {
                await seasonApiService.createSeason(dataToSend);
            }
            fetchData();
            handleCloseModal();
        } catch (err) { setError('Fehler beim Speichern.'); }
    };

    const handleActionRequest = (action, seasonId) => {
        const season = seasons.find(s => s.id === seasonId);
        if (season) {
            setActionToConfirm({ action, seasonId, seasonName: season.name });
            setIsConfirmModalOpen(true);
        }
    };

    const handleConfirmAction = async () => {
        if (!actionToConfirm) return;
        const { action, seasonId } = actionToConfirm;
        try {
            switch (action) {
                case 'activate': await seasonApiService.setCurrentSeason(seasonId); break;
                case 'finish': await seasonApiService.finishSeason(seasonId); break;
                case 'archive': await seasonApiService.archiveSeason(seasonId); break;
                default: break;
            }
            fetchData();
        } catch (err) {
            setError(err.message || 'Aktion fehlgeschlagen.');
        } finally {
            setIsConfirmModalOpen(false);
            setActionToConfirm(null);
        }
    };

    const handleAddTeam = (team) => {
        if (team && !formData.teams.some(t => t.id === team.id)) {
            setFormData(prev => ({ ...prev, teams: [...prev.teams, team] }));
        }
    };

    const handleRemoveTeam = (teamId) => {
        setFormData(prev => ({ ...prev, teams: prev.teams.filter(t => t.id !== teamId) }));
    };

    const availableTeams = allTeams.filter(team => !formData.teams.some(selected => selected.id === team.id));
    const isReadOnly = modalMode === 'view';
    const hasActiveSeason = seasons.some(s => s.status === 'active');

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress sx={{ color: '#00A99D' }} /></Box>;

    return (
        <Box sx={{ p: { sm: 3 } }}>
            <Typography variant={isMobile ? 'h6' : 'h4'} sx={{ mb: 2, mt: 2, color: '#00A99D', fontWeight: 700, fontFamily: 'comfortaa', textAlign: 'center', textTransform: 'uppercase' }}>
                Saisonverwaltung
            </Typography>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                <Button variant="contained" onClick={handleOpenCreateModal} sx={{ backgroundColor: '#00A99D', '&:hover': { backgroundColor: '#00897B' } }}>
                    Neue Saison erstellen
                </Button>
            </Box>
            {error && <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ffcdd2' }}>{error}</Alert>}

            <ReusableModal
                open={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                title="Aktion bestätigen"
            >
                {actionToConfirm && (
                    <>
                        <Typography sx={{ color: 'grey.300', mb: 3 }}>
                            {`Möchtest du die Aktion "${
                                { activate: 'Aktivieren', finish: 'Beenden', archive: 'Archivieren' }[actionToConfirm.action]
                            }" für die Saison "${actionToConfirm.seasonName}" wirklich durchführen?`}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                            <Button variant="outlined" onClick={() => setIsConfirmModalOpen(false)} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>
                                Abbrechen
                            </Button>
                            <Button variant="contained" onClick={handleConfirmAction} sx={{ backgroundColor: '#00A99D' }}>
                                Bestätigen
                            </Button>
                        </Box>
                    </>
                )}
            </ReusableModal>

            <ReusableModal open={isModalOpen} onClose={handleCloseModal} title={modalMode === 'create' ? 'Neue Saison erstellen' : 'Saison Details'}>
                <form onSubmit={handleSubmit}>
                    <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTabs-indicator': { backgroundColor: '#00A99D' }, '& .MuiTab-root.Mui-selected': { color: '#00A99D' } }}>
                        <Tab label="Allgemein & Regeln" sx={{ color: 'grey.400', textTransform: 'none' }} />
                        <Tab label={`Teams (${formData.teams.length})`} sx={{ color: 'grey.400', textTransform: 'none' }} />
                    </Tabs>
                    <Box sx={{ height: '55vh', overflowY: 'auto' }}>
                        <TabPanel value={activeTab} index={0}>
                            <TextField size="small" label="Name" name="name" value={formData.name} onChange={handleFormChange} disabled={isReadOnly} fullWidth sx={darkInputStyle} />
                            <TextField size="small" label="Startdatum" name="startDate" type="date" value={formData.startDate} onChange={handleFormChange} disabled={isReadOnly} fullWidth InputLabelProps={{ shrink: true }} sx={darkInputStyle} />
                            <TextField size="small" label="Enddatum" name="endDate" type="date" value={formData.endDate} onChange={handleFormChange} disabled={isReadOnly} fullWidth InputLabelProps={{ shrink: true }} sx={darkInputStyle} />
                            <FormControl size="small" fullWidth sx={darkInputStyle} disabled={isReadOnly}>
                                <InputLabel>Spielmodus</InputLabel>
                                <Select name="playMode" value={formData.playMode} label="Spielmodus" onChange={handleFormChange} MenuProps={{ PaperProps: { sx: { bgcolor: '#333', color: 'grey.200' } } }}>
                                    <MenuItem value="single_round_robin">Nur Hinrunde</MenuItem>
                                    <MenuItem value="double_round_robin">Hin- und Rückrunde</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField size="small" label="Punkte für Sieg" name="pointsForWin" type="number" value={formData.pointsForWin} onChange={handleFormChange} disabled={isReadOnly} fullWidth sx={darkInputStyle} />
                            <TextField size="small" label="Punkte für Unentschieden" name="pointsForDraw" type="number" value={formData.pointsForDraw} onChange={handleFormChange} disabled={isReadOnly} fullWidth sx={darkInputStyle} />
                            <TextField size="small" label="Max. Spielabsagen" name="maxDenials" type="number" value={formData.maxDenials} onChange={handleFormChange} disabled={isReadOnly} fullWidth sx={darkInputStyle} />
                            <TextField size="small" label="Stornierungsfrist (Tage)" name="cancellationDeadlineDays" type="number" value={formData.cancellationDeadlineDays} onChange={handleFormChange} disabled={isReadOnly} fullWidth sx={darkInputStyle} />
                            <TextField size="small" label="Tore für Sieger (Strafw.)" name="forfeitWinScore" type="number" value={formData.forfeitWinScore} onChange={handleFormChange} disabled={isReadOnly} fullWidth sx={darkInputStyle} />
                            <TextField size="small" label="Tore für Verlierer (Strafw.)" name="forfeitLossScore" type="number" value={formData.forfeitLossScore} onChange={handleFormChange} disabled={isReadOnly} fullWidth sx={darkInputStyle} />
                        </TabPanel>
                        <TabPanel value={activeTab} index={1}>
                            {!isReadOnly && (
                                <Autocomplete
                                    key={formData.teams.length} // Dieser Key erzwingt das Neuladen der Komponente und leert sie
                                    options={availableTeams}
                                    getOptionLabel={(option) => option.name}
                                    onChange={(event, newValue) => {
                                        if (newValue) {
                                            handleAddTeam(newValue);
                                            // Der Fokus wird jetzt durch den useEffect oben gesteuert
                                        }
                                    }}
                                    noOptionsText={<Typography sx={{ color: 'grey.400' }}>Keine Teams gefunden</Typography>}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            size="small"
                                            label="Team suchen & hinzufügen"
                                            sx={darkInputStyle}
                                            inputRef={autocompleteInputRef}
                                        />
                                    )}
                                    sx={{ mb: 2 }}
                                    PaperComponent={(props) => <Paper {...props} sx={{ bgcolor: '#333', color: 'grey.200' }} />}
                                />
                            )}
                            <TableContainer component={Paper} sx={{ backgroundColor: '#1e1e1e', flexGrow: 1 }}>
                                <Table stickyHeader>
                                    <TableHead>
                                        <TableRow sx={{ '& .MuiTableCell-root': { backgroundColor: '#1e1e1e' } }}>
                                            <StyledTableCell>Teamname</StyledTableCell>
                                            {!isReadOnly && <StyledTableCell align="right"></StyledTableCell>}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {formData.teams.map(team => (
                                            <TableRow key={team.id} sx={{ height: '53px' }}>
                                                <StyledTableCell>{team.name}</StyledTableCell>
                                                {!isReadOnly && (
                                                    <StyledTableCell align="right">
                                                        <IconButton size="small" onClick={() => handleRemoveTeam(team.id)}><DeleteIcon fontSize="small" sx={{ color: 'grey.500', '&:hover': { color: 'error.main' } }} /></IconButton>
                                                    </StyledTableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </TabPanel>
                    </Box>
                    <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                        {modalMode === 'create' && (<><Button variant="outlined" onClick={handleCloseModal} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button><Button type="submit" variant="contained" sx={{ backgroundColor: '#00A99D' }}>Erstellen</Button></>)}
                        {modalMode === 'view' && (<><Button variant="outlined" onClick={handleCloseModal} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Schließen</Button><Button variant="contained" onClick={() => setModalMode('edit')} sx={{ backgroundColor: '#00A99D' }}>Bearbeiten</Button></>)}
                        {modalMode === 'edit' && (<><Button variant="outlined" onClick={() => setModalMode('view')} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button><Button type="submit" variant="contained" sx={{ backgroundColor: '#00A99D' }}>Speichern</Button></>)}
                    </Box>
                </form>
            </ReusableModal>

            <TableContainer component={Paper} sx={{ backgroundColor: '#111', borderRadius: 2, border: '1px solid', borderColor: 'grey.800' }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ borderBottom: `2px solid ${theme.palette.grey[800]}` }}>
                            <StyledTableCell align="center" sx={{ width: '5%' }}>Status</StyledTableCell>
                            <StyledTableCell>Name</StyledTableCell>
                            {!isMobile && <StyledTableCell>Modus</StyledTableCell>}
                            {!isMobile && <StyledTableCell align="center">Teams</StyledTableCell>}
                            <StyledTableCell align="right">Aktionen</StyledTableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {seasons.filter(s => s.status !== 'archived').sort((a, b) => (b.name > a.name ? 1 : -1)).map(season => (
                            <TableRow key={season.id} onClick={() => handleRowClick(season)} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' }, height: '53px' }}>
                                <StyledTableCell align="center"><StatusIndicator status={season.status} /></StyledTableCell>
                                <StyledTableCell>{season.name}</StyledTableCell>
                                {!isMobile && <StyledTableCell>{season.playMode === 'double_round_robin' ? 'Hin- & Rückrunde' : 'Nur Hinrunde'}</StyledTableCell>}
                                {!isMobile && <StyledTableCell align="center">{season.teams?.length || 0}</StyledTableCell>}
                                <StyledTableCell align="right">
                                    <Box onClick={e => e.stopPropagation()} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <Tooltip title="Saison beenden">
                                            <span>
                                                <IconButton onClick={() => handleActionRequest('finish', season.id)} disabled={season.status !== 'active'}>
                                                    <StopCircleOutlinedIcon sx={{ color: season.status === 'active' ? 'warning.light' : 'grey.800' }} />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title={hasActiveSeason && season.status === 'planning' ? "Es läuft bereits eine Saison" : "Saison aktivieren"}>
                                            <span>
                                                <IconButton onClick={() => handleActionRequest('activate', season.id)} disabled={season.status !== 'planning' || hasActiveSeason}>
                                                    <PlayCircleOutlineIcon sx={{ color: season.status === 'planning' && !hasActiveSeason ? 'success.light' : 'grey.800' }} />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title="Saison archivieren">
                                            <span>
                                                <IconButton onClick={() => handleActionRequest('archive', season.id)} disabled={season.status !== 'finished'}>
                                                    <ArchiveOutlinedIcon sx={{ color: season.status === 'finished' ? 'error.light' : 'grey.800' }} />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Box>
                                </StyledTableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default SeasonManager;
