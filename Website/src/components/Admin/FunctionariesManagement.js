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

} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
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
import { ReusableModal } from '../Helpers/modalUtils';
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

    // Edit State: similar to RulesManagement
    const [editState, setEditState] = useState(null); // { id, data: { ... } }
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

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
                    // Ensure ID is present
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

    // Start editing a row
    const handleEditClick = (item) => {
        setEditState({
            id: item.id,
            data: { ...item }
        });
    };

    // Cancel editing
    const handleCancelEdit = () => {
        setEditState(null);
    };

    // Update field in edit state
    const handleFieldChange = (field, value) => {
        setEditState(prev => ({
            ...prev,
            data: { ...prev.data, [field]: value }
        }));
    };

    // Save single edited row
    const handleSaveRow = async () => {
        if (!editState) return;

        const newList = functionaries.map(item =>
            item.id === editState.id ? editState.data : item
        );

        await handleSaveList(newList);
        setEditState(null);
    };

    // Prepare delete
    const handleDeleteClick = (id) => {
        setItemToDelete(id);
        setDeleteModalOpen(true);
    };

    // Confirm delete
    const confirmDelete = async () => {
        const newList = functionaries.filter(item => item.id !== itemToDelete);
        await handleSaveList(newList);
        setDeleteModalOpen(false);
        setItemToDelete(null);
    };

    // Add new item
    const handleAddNew = () => {
        const newItem = {
            id: uuidv4(),
            function: 'Neue Funktion',
            name: '',
            icon: 'BusinessIcon'
        };
        // Add to list and immediately go to edit mode
        const newList = [...functionaries, newItem];
        setFunctionaries(newList); // Optimistic update
        setEditState({ id: newItem.id, data: newItem });
        // Warning: We are not saving to backend yet, only when user clicks 'save' on the row.
        // If they cancel, we should probably remove the "new" item or just let it revert.
        // Actually, if they cancel edit on a NEW item that hasn't been saved, it will revert to "Neue Funktion" which is fine.
    };

    const getIconComponent = (iconName) => {
        const option = iconOptions.find(o => o.value === iconName);
        return option ? option.icon : <BusinessIcon />;
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
                    onClick={handleAddNew}
                    disabled={!!editState} // Disable add while editing
                >
                    Hinzufügen
                </Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {functionaries.map((item) => {
                    const isEditing = editState && editState.id === item.id;
                    const displayData = isEditing ? editState.data : item;

                    return (
                        <Paper key={item.id} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                            {/* Icon Selection */}
                            <Box sx={{ minWidth: 80, display: 'flex', justifyContent: 'center' }}>
                                {isEditing ? (
                                    <FormControl size="small">
                                        <Select
                                            value={displayData.icon}
                                            onChange={(e) => handleFieldChange('icon', e.target.value)}
                                            displayEmpty
                                            renderValue={(selected) => (
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    {getIconComponent(selected)}
                                                </Box>
                                            )}
                                        >
                                            {iconOptions.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        {option.icon}
                                                        {/* Show label in dropdown, but requested to remove text... 
                                                             User said "Entferne den Text beim icon". If they mean in the dropdown item too? 
                                                             Let's keep label in dropdown for clarity but hide in selection (renderValue). 
                                                          */}
                                                    </Box>
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                ) : (
                                    <Box sx={{ color: theme.palette.secondary.main }}>
                                        {getIconComponent(item.icon)}
                                    </Box>
                                )}
                            </Box>

                            {/* Function & Name */}
                            <Box sx={{ flexGrow: 1, display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                                {isEditing ? (
                                    <>
                                        <TextField
                                            label="Funktion"
                                            value={displayData.function}
                                            onChange={(e) => handleFieldChange('function', e.target.value)}
                                            fullWidth
                                            size="small"
                                        />
                                        <TextField
                                            label="Name"
                                            value={displayData.name}
                                            onChange={(e) => handleFieldChange('name', e.target.value)}
                                            fullWidth
                                            size="small"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{item.function}</Typography>
                                        </Box>
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="body1">{item.name}</Typography>
                                        </Box>
                                    </>
                                )}
                            </Box>

                            {/* Actions */}
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                {isEditing ? (
                                    <>
                                        <IconButton color="success" onClick={handleSaveRow}>
                                            <CheckIcon />
                                        </IconButton>
                                        <IconButton onClick={handleCancelEdit}>
                                            <CloseIcon />
                                        </IconButton>
                                    </>
                                ) : (
                                    <>
                                        <IconButton color="primary" onClick={() => handleEditClick(item)}>
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton color="error" onClick={() => handleDeleteClick(item.id)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </>
                                )}
                            </Box>
                        </Paper>
                    );
                })}
                {functionaries.length === 0 && (
                    <Typography color="text.secondary" align="center">Keine Funktionäre eingetragen.</Typography>
                )}
            </Box>

            <ReusableModal
                open={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                title="Eintrag löschen"
            >
                <Typography>Wollen Sie diesen Eintrag wirklich löschen?</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                    <Button
                        onClick={() => setDeleteModalOpen(false)}
                        variant="outlined"
                        sx={{ fontFamily: 'Comfortaa', borderColor: 'divider', color: 'text.secondary' }}
                    >
                        Abbrechen
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={confirmDelete}
                        sx={{ fontFamily: 'Comfortaa', fontWeight: 'bold' }}
                    >
                        Löschen
                    </Button>
                </Box>
            </ReusableModal>
        </Box>
    );
};

export default FunctionariesManagement;
