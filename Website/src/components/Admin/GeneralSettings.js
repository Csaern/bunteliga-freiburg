import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, useTheme, TextField, Button, Checkbox, FormControlLabel, Paper, Alert, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WebsiteManager from './WebsiteManager';
import * as systemApiService from '../../services/systemApiService';

const EmailSettings = () => {
    const theme = useTheme();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [testRecipient, setTestRecipient] = useState('');

    const [formData, setFormData] = useState({
        smtpHost: '',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
        smtpSecure: false,
        senderName: 'Bunte Liga Admin',
        contactEmail: '' // New field for Contact Form Recipient
    });

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const config = await systemApiService.getEmailConfig();
            setFormData(prev => ({
                ...prev,
                ...config
            }));
        } catch (error) {
            console.error('Failed to load email config:', error);
            // Optionally show error, but maybe just default to empty is fine if never set
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, checked, type } = e.target;

        let newValue = type === 'checkbox' ? checked : value;

        setFormData(prev => {
            const newData = { ...prev, [name]: newValue };

            // Auto-configure Secure based on Port
            if (name === 'smtpPort') {
                if (value === '465') newData.smtpSecure = true;
                if (value === '587' || value === '25') newData.smtpSecure = false;
            }
            return newData;
        });
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await systemApiService.saveEmailConfig(formData);
            setNotification({ open: true, message: 'Einstellungen erfolgreich gespeichert.', severity: 'success' });
        } catch (error) {
            setNotification({ open: true, message: 'Fehler beim Speichern: ' + (error.response?.data?.error || error.message), severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleTestClick = () => {
        setIsTestModalOpen(true);
    };

    const handleSendTestEmail = async () => {
        if (!testRecipient) return;
        try {
            setTesting(true);
            await systemApiService.testEmailConfig(formData, testRecipient);
            setNotification({ open: true, message: 'Test-Email erfolgreich gesendet!', severity: 'success' });
            setIsTestModalOpen(false);
        } catch (error) {
            setNotification({ open: true, message: 'Fehler beim Senden: ' + (error.response?.data?.error || error.message), severity: 'error' });
        } finally {
            setTesting(false);
        }
    };

    if (loading) return <CircularProgress />;

    const inputStyle = {
        '& label.Mui-focused': { color: theme.palette.primary.main },
        '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: theme.palette.divider },
            '&:hover fieldset': { borderColor: theme.palette.text.secondary },
            '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
        },
        '& .MuiInputBase-input': { color: theme.palette.text.primary },
        '& label': { color: theme.palette.text.secondary },
    };

    return (
        <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
            <Typography variant="h6" sx={{ mb: 3, fontFamily: 'comfortaa', color: theme.palette.text.primary }}>
                SMTP Email-Konfiguration
            </Typography>

            {notification.open && (
                <Alert severity={notification.severity} onClose={() => setNotification({ ...notification, open: false })} sx={{ mb: 2 }}>
                    {notification.message}
                </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                {/* Accordion 1: SMTP Configuration */}
                <Accordion defaultExpanded sx={{ backgroundColor: theme.palette.background.paper, boxShadow: 'none', '&:before': { display: 'none' }, border: `1px solid ${theme.palette.divider}`, borderRadius: '4px !important' }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: theme.palette.action.hover }}>
                        <Typography sx={{ fontFamily: 'comfortaa', fontWeight: 'bold' }}>SMTP Konfiguration</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                        <TextField
                            label="SMTP Host"
                            name="smtpHost"
                            value={formData.smtpHost}
                            onChange={handleChange}
                            fullWidth
                            size="small"
                            sx={inputStyle}
                            placeholder="smtp.example.com"
                        />
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="SMTP Port"
                                name="smtpPort"
                                type="number"
                                value={formData.smtpPort}
                                onChange={handleChange}
                                fullWidth
                                size="small"
                                sx={inputStyle}
                            />
                            <Box>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            name="smtpSecure"
                                            checked={formData.smtpSecure}
                                            onChange={handleChange}
                                            sx={{ color: theme.palette.primary.main, '&.Mui-checked': { color: theme.palette.primary.main } }}
                                        />
                                    }
                                    label="Secure (SSL/TLS)"
                                    sx={{ color: theme.palette.text.primary, whiteSpace: 'nowrap' }}
                                />
                                <Typography variant="caption" sx={{ display: 'block', color: theme.palette.text.secondary, mt: -0.5, ml: 3.5 }}>
                                    (Aktivieren für Port 465, deaktivieren für 587/STARTTLS)
                                </Typography>
                            </Box>
                        </Box>
                        <TextField
                            label="Benutzername / Email"
                            name="smtpUser"
                            value={formData.smtpUser}
                            onChange={handleChange}
                            fullWidth
                            size="small"
                            sx={inputStyle}
                        />
                        <TextField
                            label="Passwort"
                            name="smtpPassword"
                            type="password"
                            value={formData.smtpPassword}
                            onChange={handleChange}
                            fullWidth
                            size="small"
                            sx={inputStyle}
                        />
                        <TextField
                            label="Absender Name"
                            name="senderName"
                            value={formData.senderName}
                            onChange={handleChange}
                            fullWidth
                            size="small"
                            sx={inputStyle}
                            helperText="Der Name, der als Absender angezeigt wird"
                        />
                        <Button
                            variant="outlined"
                            onClick={handleTestClick}
                            disabled={testing || !formData.smtpHost}
                            sx={{ color: theme.palette.primary.main, borderColor: theme.palette.primary.main, alignSelf: 'flex-start', mt: 1 }}
                        >
                            {testing ? <CircularProgress size={24} /> : 'Verbindung testen'}
                        </Button>
                    </AccordionDetails>
                </Accordion>

                {/* Accordion 2: Contact Form Configuration */}
                <Accordion sx={{ backgroundColor: theme.palette.background.paper, boxShadow: 'none', '&:before': { display: 'none' }, border: `1px solid ${theme.palette.divider}`, borderRadius: '4px !important' }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: theme.palette.action.hover }}>
                        <Typography sx={{ fontFamily: 'comfortaa', fontWeight: 'bold' }}>Kontaktformular Einstellungen</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 1 }}>
                            An welche E-Mail-Adresse sollen Nachrichten aus dem Kontaktformular gesendet werden?
                        </Typography>
                        <TextField
                            label="Empfänger-Email für Kontaktanfragen"
                            name="contactEmail"
                            value={formData.contactEmail || ''}
                            onChange={handleChange}
                            fullWidth
                            size="small"
                            sx={inputStyle}
                            type="email"
                            placeholder="kontakt@bunteliga-freiburg.de"
                        />
                    </AccordionDetails>
                </Accordion>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={saving}
                        sx={{ bgcolor: theme.palette.primary.main, '&:hover': { bgcolor: theme.palette.primary.dark }, minWidth: 150 }}
                    >
                        {saving ? <CircularProgress size={24} color="inherit" /> : 'Einstellungen speichern'}
                    </Button>
                </Box>
            </Box>

            <Dialog open={isTestModalOpen} onClose={() => setIsTestModalOpen(false)}>
                <DialogTitle>Test Email senden</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Gib eine Email-Adresse ein, an die eine Test-Nachricht gesendet werden soll.
                    </Typography>
                    <TextField
                        autoFocus
                        label="Empfänger Email"
                        fullWidth
                        value={testRecipient}
                        onChange={(e) => setTestRecipient(e.target.value)}
                        variant="outlined"
                        size="small"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsTestModalOpen(false)}>Abbrechen</Button>
                    <Button onClick={handleSendTestEmail} variant="contained" disabled={!testRecipient || testing}>
                        {testing ? 'Sende...' : 'Senden'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

const GeneralSettings = () => {
    const theme = useTheme();
    const [activeTab, setActiveTab] = useState(0);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Typography variant="h4" sx={{
                mb: 2,
                mt: 2,
                color: theme.palette.primary.main,
                fontWeight: 700,
                fontFamily: 'comfortaa',
                textAlign: 'center',
                textTransform: 'uppercase'
            }}>
                Allgemeine Einstellungen
            </Typography>

            <Paper sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    centered
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="Website" sx={{ fontFamily: 'comfortaa', fontWeight: 600, textTransform: 'none', fontSize: '1.1rem' }} />
                    <Tab label="Benachrichtigungen" sx={{ fontFamily: 'comfortaa', fontWeight: 600, textTransform: 'none', fontSize: '1.1rem' }} />
                </Tabs>

                <Box sx={{ p: 1 }}>
                    {activeTab === 0 && <WebsiteManager />}
                    {activeTab === 1 && <EmailSettings />}
                </Box>
            </Paper>
        </Box>
    );
};

export default GeneralSettings;
