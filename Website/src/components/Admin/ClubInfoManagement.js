import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Paper,
    Grid,
    Alert,
    CircularProgress,
    useTheme,
    Divider
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import BusinessIcon from '@mui/icons-material/Business';
import SecurityIcon from '@mui/icons-material/Security';
import GavelIcon from '@mui/icons-material/Gavel';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import * as websiteApi from '../../services/websiteApiService';

const defaultClubInfo = {
    address: {
        name: "Bunte Liga Freiburg",
        person: "c/o Jonas Krause",
        street: "Ferdinand-Weiß-Straße 92",
        city: "79106 Freiburg",
    },
    bankDetails: {
        name: "Sparkasse Freiburg",
        iban: "DE06 6805 0101 0010 1030 69",
        bic: "FRSPDE66XXX"
    },
    register: {
        court: "Amtsgericht Freiburg im Breisgau",
        number: "VR 3364"
    },
    taxId: "06469/42621",
    contact: {
        phone: "0761-809312",
        fax: "0761-1377804",
        email: "vorstand@bunteligafreiburg.de"
    },
    dataProtection: {
        name: "Bunte Liga Freiburg e.V.",
        street: "Ferdinand-Weiß-Straße 92",
        city: "79106 Freiburg",
        phone: "0761-809312",
        email: "datenschutz@bunteligafreiburg.de"
    },
    representatives: "Uwe Schmitt, Jens Karsten, Peter Deutschmann",
    contentResponsibility: "Stefan Schultheis, Jens Karsten, Thorsten Wrobel"
};

const ClubInfoManagement = () => {
    const theme = useTheme();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        address: { name: '', person: '', street: '', city: '' },
        bankDetails: { name: '', iban: '', bic: '' },
        register: { court: '', number: '' },
        taxId: '',
        contact: { phone: '', fax: '', email: '' },
        dataProtection: { name: '', street: '', city: '', email: '' }, // Phone removed
        representatives: '',
        contentResponsibility: ''
    });

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const data = await websiteApi.getSettings('club-info');
                if (data) {
                    // Merge with default structure to ensure all new trimmed fields exist/don't crash
                    setFormData(prev => ({
                        ...defaultClubInfo, // ensure defaults
                        ...data, // overwrite with DB data
                        // Explicitly strip old fields if they exist in DB to clean up state
                        address: { ...defaultClubInfo.address, ...data.address },
                        bankDetails: { name: data.bankDetails?.name || '', iban: data.bankDetails?.iban || '', bic: data.bankDetails?.bic || '' },
                        contact: { phone: data.contact?.phone || '', fax: data.contact?.fax || '', email: data.contact?.email || '' },
                        dataProtection: { ...defaultClubInfo.dataProtection, ...(data.dataProtection || {}) } // Ensure phone is not re-added
                    }));
                } else {
                    setFormData(defaultClubInfo);
                }
            } catch (err) {
                console.error('Failed to load club info:', err);
                setFormData(defaultClubInfo);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleChange = (section, field, value) => {
        setFormData(prev => {
            if (section) {
                return {
                    ...prev,
                    [section]: {
                        ...prev[section],
                        [field]: value
                    }
                };
            }
            return { ...prev, [field]: value };
        });
    };

    const handleSave = async () => {
        setLoading(true);
        // Clean up data before saving - only save what we manage now
        const dataToSave = {
            address: formData.address,
            bankDetails: formData.bankDetails,
            register: formData.register,
            taxId: formData.taxId,
            contact: formData.contact,
            dataProtection: { // Ensure no phone is saved
                name: formData.dataProtection.name,
                street: formData.dataProtection.street,
                city: formData.dataProtection.city,
                email: formData.dataProtection.email,
            },
            representatives: formData.representatives,
            contentResponsibility: formData.contentResponsibility
        };

        try {
            await websiteApi.updateSettings('club-info', dataToSave);
            setSuccess('Vereinsdaten erfolgreich aktualisiert');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Save error:', err);
            setError('Fehler beim Speichern');
        } finally {
            setLoading(false);
        }
    };

    const SectionHeader = ({ title, icon }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, borderBottom: `1px solid ${theme.palette.divider}`, pb: 0.5 }}>
            {icon && <Box sx={{ mr: 1 }}>{icon}</Box>}
            <Typography variant="h6" sx={{ fontFamily: 'comfortaa', color: theme.palette.primary.main }}>
                {title}
            </Typography>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}

            {loading && <CircularProgress sx={{ alignSelf: 'center' }} />}

            {/* Anschrift & Kontakt */}
            <Paper sx={{ p: 4, borderRadius: 2 }}>
                <SectionHeader icon={<BusinessIcon color="primary" />} title="Anschrift & Kontakt" />
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Vereinsname"
                            variant="outlined"
                            value={formData.address.name}
                            onChange={(e) => handleChange('address', 'name', e.target.value)}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="z.Hd. (Optional)"
                            variant="outlined"
                            value={formData.address.person}
                            onChange={(e) => handleChange('address', 'person', e.target.value)}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Straße & Hausnummer"
                            variant="outlined"
                            value={formData.address.street}
                            onChange={(e) => handleChange('address', 'street', e.target.value)}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="PLZ & Stadt"
                            variant="outlined"
                            value={formData.address.city}
                            onChange={(e) => handleChange('address', 'city', e.target.value)}
                            size="small"
                        />
                    </Grid>

                    <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>

                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            label="E-Mail"
                            variant="outlined"
                            value={formData.contact.email}
                            onChange={(e) => handleChange('contact', 'email', e.target.value)}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            label="Telefon"
                            variant="outlined"
                            value={formData.contact.phone}
                            onChange={(e) => handleChange('contact', 'phone', e.target.value)}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            label="Fax"
                            variant="outlined"
                            value={formData.contact.fax}
                            onChange={(e) => handleChange('contact', 'fax', e.target.value)}
                            size="small"
                        />
                    </Grid>
                </Grid>
            </Paper>

            {/* Bankverbindung */}
            <Paper sx={{ p: 3, borderRadius: 2 }}>
                <SectionHeader icon={<AccountBalanceIcon color="primary" />} title="Bankverbindung" />
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            label="Kontoinhaber"
                            variant="outlined"
                            value={formData.bankDetails.name}
                            onChange={(e) => handleChange('bankDetails', 'name', e.target.value)}
                            size="small"
                            autoComplete="off"
                        />
                    </Grid>
                    <Grid item xs={12} sm={5}>
                        <TextField
                            fullWidth
                            label="IBAN"
                            variant="outlined"
                            value={formData.bankDetails.iban}
                            onChange={(e) => handleChange('bankDetails', 'iban', e.target.value)}
                            size="small"
                            autoComplete="off"
                            inputProps={{ autoComplete: 'new-password' }} // Hack to disable Chrome autofill
                        />
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <TextField
                            fullWidth
                            label="BIC"
                            variant="outlined"
                            value={formData.bankDetails.bic}
                            onChange={(e) => handleChange('bankDetails', 'bic', e.target.value)}
                            size="small"
                            autoComplete="off"
                        />
                    </Grid>
                </Grid>
            </Paper>

            {/* Datenschutz */}
            <Paper sx={{ p: 4, borderRadius: 2 }}>
                <SectionHeader icon={<SecurityIcon color="primary" />} title="Datenschutz (Verantwortliche Stelle)" />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Bitte hier den Datenschutzbeauftragten (oder Verein) eintragen. Der Vereinsname wird auf der Webseite automatisch ergänzt.
                </Typography>
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Name / Ansprechpartner" // Changed to clarify it's the person/role
                            variant="outlined"
                            value={formData.dataProtection?.name || ''}
                            onChange={(e) => handleChange('dataProtection', 'name', e.target.value)}
                            size="small"
                            helperText="z.B. c/o Dr. Stefan Schultheis"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="E-Mail"
                            variant="outlined"
                            value={formData.dataProtection?.email || ''}
                            onChange={(e) => handleChange('dataProtection', 'email', e.target.value)}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Straße & Hausnummer"
                            variant="outlined"
                            value={formData.dataProtection?.street || ''}
                            onChange={(e) => handleChange('dataProtection', 'street', e.target.value)}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="PLZ & Stadt"
                            variant="outlined"
                            value={formData.dataProtection?.city || ''}
                            onChange={(e) => handleChange('dataProtection', 'city', e.target.value)}
                            size="small"
                        />
                    </Grid>
                </Grid>
            </Paper>

            {/* Impressum Daten */}
            <Paper sx={{ p: 4, borderRadius: 2 }}>
                <SectionHeader icon={<GavelIcon color="primary" />} title="Rechtliches & Vorstand" />
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            multiline
                            minRows={3}
                            label="Vertretungsberechtigter Vorstand (gem. § 26 BGB)"
                            variant="outlined"
                            value={formData.representatives}
                            onChange={(e) => handleChange(null, 'representatives', e.target.value)}
                            size="small"
                            helperText="Bitte alle vertretungsberechtigten Personen auflisten."
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            multiline
                            minRows={3}
                            label="Inhaltlich Verantwortlicher (gem. § 55 Abs. 2 RStV)"
                            variant="outlined"
                            value={formData.contentResponsibility}
                            onChange={(e) => handleChange(null, 'contentResponsibility', e.target.value)}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Registergericht"
                            variant="outlined"
                            value={formData.register.court}
                            onChange={(e) => handleChange('register', 'court', e.target.value)}
                            size="small"
                            helperText="z.B. Amtsgericht Freiburg"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Registernummer"
                            variant="outlined"
                            value={formData.register.number}
                            onChange={(e) => handleChange('register', 'number', e.target.value)}
                            size="small"
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            label="Steuernummer (Optional)"
                            variant="outlined"
                            value={formData.taxId}
                            onChange={(e) => handleChange(null, 'taxId', e.target.value)}
                            size="small"
                        />
                    </Grid>

                </Grid>
            </Paper>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={loading}
                    size="large"
                    sx={{
                        backgroundColor: theme.palette.secondary.main,
                        color: theme.palette.secondary.contrastText,
                        '&:hover': { backgroundColor: theme.palette.secondary.dark }
                    }}
                >
                    Speichern
                </Button>
            </Box>
        </Box>
    );
};

export default ClubInfoManagement;
