import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Paper,
    IconButton,
    useTheme,
    Alert,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    InputAdornment,

} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import BusinessIcon from '@mui/icons-material/Business';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import GrassIcon from '@mui/icons-material/Grass';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PeopleIcon from '@mui/icons-material/People';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import InfoIcon from '@mui/icons-material/Info';
import HelpIcon from '@mui/icons-material/Help';
import GavelIcon from '@mui/icons-material/Gavel';
import GroupsIcon from '@mui/icons-material/Groups';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import AppModal from '../Modals/AppModal';
import * as websiteApi from '../../services/websiteApiService';
import { v4 as uuidv4 } from 'uuid';

const iconOptions = [
    { label: 'Business', value: 'BusinessIcon', icon: <BusinessIcon /> },
    { label: 'Wallet', value: 'AccountBalanceWalletIcon', icon: <AccountBalanceWalletIcon /> },
    { label: 'People', value: 'PeopleIcon', icon: <PeopleIcon /> },
    { label: 'Soccer', value: 'SportsSoccerIcon', icon: <SportsSoccerIcon /> },
    { label: 'Assignment', value: 'AssignmentIcon', icon: <AssignmentIcon /> },
    { label: 'Seat', value: 'EventSeatIcon', icon: <EventSeatIcon /> },
    { label: 'Grass', value: 'GrassIcon', icon: <GrassIcon /> },
    { label: 'Balance', value: 'AccountBalanceIcon', icon: <AccountBalanceIcon /> },
    { label: 'Contact', value: 'ContactMailIcon', icon: <ContactMailIcon /> },
    { label: 'Info', value: 'InfoIcon', icon: <InfoIcon /> },
    { label: 'Help', value: 'HelpIcon', icon: <HelpIcon /> },
    { label: 'Gavel', value: 'GavelIcon', icon: <GavelIcon /> },
    { label: 'Groups', value: 'GroupsIcon', icon: <GroupsIcon /> },
    { label: 'Email', value: 'EmailIcon', icon: <EmailIcon /> },
    { label: 'Phone', value: 'PhoneIcon', icon: <PhoneIcon /> },
];

const FunctionariesManagement = () => {
    const theme = useTheme();

    const [functionaries, setFunctionaries] = useState([]);
    const [, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [currentFunctionary, setCurrentFunctionary] = useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // Form Data State
    const [formData, setFormData] = useState({
        id: '',
        function: '',
        name: '',
        icon: 'BusinessIcon'
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await websiteApi.getSettings('functionaries');
            let entries = [];
            if (data && Array.isArray(data.entries)) {
                entries = data.entries;
            } else if (Array.isArray(data)) {
                entries = data;
            }

            if (entries.length > 0) {
                const migratedData = entries.map(item => ({
                    ...item,
                    id: item.id || uuidv4()
                }));
                setFunctionaries(migratedData);
            } else {
                setFunctionaries([]);
            }
        } catch (err) {
            console.error('Failed to load functionaries:', err);
            setFunctionaries([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveList = async (newList) => {
        setLoading(true);
        try {
            await websiteApi.updateSettings('functionaries', { entries: newList });
            setFunctionaries(newList);
            setSuccess('Gespeichert!');
            setTimeout(() => setSuccess(null), 2000);
        } catch (err) {
            console.error('Error saving list', err);
            setError('Fehler beim Speichern');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = () => {
        setFormData({
            id: uuidv4(),
            function: '',
            name: '',
            icon: 'BusinessIcon'
        });
        setModalMode('create');
        setIsModalOpen(true);
    };

    const handleOpenEdit = (item) => {
        setCurrentFunctionary(item);
        setFormData({ ...item });
        setModalMode('edit');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCurrentFunctionary(null);
    };

    const handleFormSubmit = async () => {
        if (!formData.function || !formData.name) {
            setError('Bitte Funktion und Name ausfüllen');
            setTimeout(() => setError(null), 3000);
            return;
        }

        let newList;
        if (modalMode === 'create') {
            newList = [...functionaries, formData];
        } else {
            newList = functionaries.map(item => item.id === formData.id ? formData : item);
        }

        await handleSaveList(newList);
        handleCloseModal();
    };


    const handleDeleteClick = (id) => {
        setItemToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        const newList = functionaries.filter(item => item.id !== itemToDelete);
        await handleSaveList(newList);
        setDeleteModalOpen(false);
        setItemToDelete(null);
    };

    const getIconComponent = (iconName) => {
        const option = iconOptions.find(o => o.value === iconName);
        return option ? option.icon : <BusinessIcon />;
    };

    const inputStyle = {
        '& label.Mui-focused': { color: theme.palette.primary.main },
        '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: theme.palette.divider },
            '&:hover fieldset': { borderColor: theme.palette.text.secondary },
            '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
        },
        '& .MuiInputBase-input': { color: theme.palette.text.primary },
        '& label': { color: theme.palette.text.secondary },
        '& .MuiSelect-icon': { color: theme.palette.text.secondary },
    };


    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontFamily: 'comfortaa' }}>
                    Liste der Funktionäre
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenCreate}
                >
                    Hinzufügen
                </Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {functionaries.map((item) => (
                    <Paper key={item.id} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ minWidth: 40, display: 'flex', justifyContent: 'center', color: theme.palette.secondary.main }}>
                            {getIconComponent(item.icon)}
                        </Box>

                        <Box sx={{ flexGrow: 1, display: 'flex', gap: 2, flexDirection: 'column' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{item.function}</Typography>
                            <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>{item.name}</Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton color="primary" onClick={() => handleOpenEdit(item)}>
                                <EditIcon />
                            </IconButton>
                            <IconButton color="error" onClick={() => handleDeleteClick(item.id)}>
                                <DeleteIcon />
                            </IconButton>
                        </Box>
                    </Paper>
                ))}
                {functionaries.length === 0 && (
                    <Typography color="text.secondary" align="center">Keine Funktionäre eingetragen.</Typography>
                )}
            </Box>

            {/* Create/Edit Modal */}
            <AppModal
                open={isModalOpen}
                onClose={handleCloseModal}
                title={modalMode === 'create' ? 'Funktionär hinzufügen' : 'Funktionär bearbeiten'}
                actions={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <Button onClick={handleCloseModal} sx={{ color: theme.palette.text.secondary }}>Abbrechen</Button>
                        <Button onClick={handleFormSubmit} variant="contained" sx={{ backgroundColor: theme.palette.primary.main }}>Speichern</Button>
                    </Box>
                }
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    <TextField
                        label="Funktion"
                        value={formData.function}
                        onChange={(e) => setFormData({ ...formData, function: e.target.value })}
                        fullWidth
                        size="small"
                        sx={inputStyle}
                    />
                    <TextField
                        label="Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        fullWidth
                        size="small"
                        sx={inputStyle}
                    />
                    <FormControl size="small" fullWidth sx={inputStyle}>
                        <InputLabel>Icon</InputLabel>
                        <Select
                            label="Icon"
                            value={formData.icon}
                            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                            renderValue={(selected) => (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {getIconComponent(selected)}
                                    <Typography>{iconOptions.find(o => o.value === selected)?.label}</Typography>
                                </Box>
                            )}
                        >
                            {iconOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {option.icon}
                                        <Typography>{option.label}</Typography>
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </AppModal>

            {/* Delete Confirmation Details */}
            <AppModal
                open={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Eintrag löschen"
                actions={
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, width: '100%' }}>
                        <Button onClick={() => setDeleteModalOpen(false)} sx={{ color: theme.palette.text.secondary }}>
                            Abbrechen
                        </Button>
                        <Button variant="contained" color="error" onClick={confirmDelete}>
                            Löschen
                        </Button>
                    </Box>
                }
            >
                <Typography>Wollen Sie diesen Eintrag wirklich löschen?</Typography>
            </AppModal>
        </Box>
    );
};

export default FunctionariesManagement;
