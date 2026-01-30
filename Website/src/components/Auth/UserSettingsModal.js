import React, { useState } from 'react';
import {
    Tabs,
    Tab,
    Box,
    Typography,
    Button,
    TextField,
    InputAdornment,
    IconButton,
    Alert,
    CircularProgress,
    Divider,
    useTheme,
    alpha,
    Switch,
    FormControlLabel,
    FormGroup,
    Collapse
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import LogoutIcon from '@mui/icons-material/Logout';
import LockIcon from '@mui/icons-material/Lock';
import NotificationsIcon from '@mui/icons-material/Notifications';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import * as userApiService from '../../services/userApiService';
import notificationApiService from '../../services/notificationApiService';
import { useAuth } from '../../context/AuthProvider';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import AppModal from '../Modals/AppModal';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Avatar from '@mui/material/Avatar';
import DraftsIcon from '@mui/icons-material/Drafts';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import Badge from '@mui/material/Badge';
import Tooltip from '@mui/material/Tooltip';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

function TabPanel(props) {
    const { children, value, index, style, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`user-settings-tabpanel-${index}`}
            aria-labelledby={`user-settings-tab-${index}`}
            style={{
                ...style,
                flex: value === index ? 1 : 0,
                display: value === index ? 'flex' : 'none',
                flexDirection: 'column',
                minHeight: 0
            }}
            {...other}
        >
            {value === index && (
                <Box sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    py: 1
                }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const UserSettingsModal = ({ open, onClose }) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { currentUser, settings, setSettings } = useAuth();
    const [tabValue, setTabValue] = useState(0);

    // Email Settings State
    const [emailPrefs, setEmailPrefs] = useState({
        gameRequests: true,
        gameResults: true,
        gameCancellations: true
    });
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [settingsError, setSettingsError] = useState('');
    const [settingsSuccess, setSettingsSuccess] = useState(false);
    const [emailSettingsExpanded, setEmailSettingsExpanded] = useState(false);

    // Password change state
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [passwordExpanded, setPasswordExpanded] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [notifLoading, setNotifLoading] = useState(false);

    // Initial fetch when opening modal if tab is 0
    React.useEffect(() => {
        if (open && tabValue === 0) {
            fetchNotifications();
            // Initialize email prefs from context
            if (settings?.emailNotifications) {
                setEmailPrefs(settings.emailNotifications);
            }
        }
    }, [open, tabValue, settings]);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
        setError('');
        setSuccess(false);
        setSettingsError('');
        setSettingsSuccess(false);
        if (newValue === 0) {
            fetchNotifications();
            // Initialize email prefs from context
            if (settings?.emailNotifications) {
                setEmailPrefs(settings.emailNotifications);
            }
        }
    };

    const fetchNotifications = async () => {
        setNotifLoading(true);
        try {
            const data = await notificationApiService.getNotifications();
            setNotifications(data);
        } catch (err) {
            console.error('Fehler beim Laden der Benachrichtigungen:', err);
        } finally {
            setNotifLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            await notificationApiService.markAsRead(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error('Fehler beim als gelesen markieren:', err);
        }
    };

    const markAllRead = async () => {
        try {
            await notificationApiService.markAllAsRead();
            setNotifications([]);
        } catch (err) {
            console.error('Fehler beim alles als gelesen markieren:', err);
        }
    };

    const handleEmailPrefToggle = (key) => {
        setEmailPrefs(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
        setSettingsSuccess(false);
    };

    const saveEmailSettings = async () => {
        setSettingsLoading(true);
        setSettingsError('');
        setSettingsSuccess(false);
        try {
            const newSettings = await userApiService.updateSettings({
                emailNotifications: emailPrefs
            });
            setSettings(newSettings);
            setSettingsSuccess(true);
            setTimeout(() => setSettingsSuccess(false), 3000);
        } catch (err) {
            console.error('Fehler beim Speichern der Einstellungen:', err);
            setSettingsError(err.message || 'Fehler beim Speichern.');
        } finally {
            setSettingsLoading(false);
        }
    };

    const getNotifIcon = (type) => {
        switch (type) {
            case 'new_booking_request': return <SportsSoccerIcon color="primary" />;
            case 'booking_confirmed': return <CheckCircleIcon color="success" />;
            case 'booking_denied': return <CancelIcon color="error" />;
            case 'booking_cancelled':
            case 'admin_booking_cancelled': return <CancelIcon color="error" />;
            case 'result_reported': return <InfoIcon color="primary" />;
            case 'result_confirmed': return <CheckCircleIcon color="success" />;
            case 'result_rejected': return <CancelIcon color="error" />;
            case 'admin_result_override': return <SportsSoccerIcon color="warning" />;
            default: return <NotificationsIcon color="action" />;
        }
    };

    const handlePasswordChange = async (e) => {
        if (e) e.preventDefault();

        if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            setError('Bitte füllen Sie alle Felder aus.');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError('Die neuen Passwörter stimmen nicht überein.');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setError('Das neue Passwort muss mindestens 6 Zeichen lang sein.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await userApiService.changePassword(passwordData.oldPassword, passwordData.newPassword);
            setSuccess(true);
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            console.error(err);
            setError(err.message || 'Fehler beim Ändern des Passworts.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            onClose();
            navigate('/');
        } catch (error) {
            console.error("Fehler beim Abmelden:", error);
        }
    };

    const handleClose = () => {
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setSuccess(false);
        setError('');
        setSettingsError('');
        setSettingsSuccess(false);
        setEmailSettingsExpanded(false);
        setPasswordExpanded(false);
        setShowPassword(false);
        setTabValue(0);
        onClose();
    };

    return (
        <AppModal
            open={open}
            onClose={handleClose}
            title="Benutzereinstellungen"
            maxWidth="sm"
            minHeight="600px"
            actions={
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', px: 1 }}>
                    <Button onClick={handleClose} sx={{ color: theme.palette.text.secondary }}>
                        Zurück
                    </Button>
                    {tabValue === 0 && notifications.length > 0 && (
                        <Button
                            variant="contained"
                            startIcon={<MarkEmailReadIcon />}
                            onClick={markAllRead}
                            sx={{
                                bgcolor: theme.palette.primary.main,
                                borderRadius: 2,
                                fontWeight: 'bold'
                            }}
                        >
                            Alle gelesen
                        </Button>
                    )}
                </Box>
            }
        >
            <Box sx={{
                position: 'sticky',
                top: -24, // Matches DialogContent top padding
                zIndex: 10,
                bgcolor: 'background.paper',
                borderBottom: 1,
                borderColor: 'divider',
                mt: -3,
                mx: -3,
                pt: 1
            }}>
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    sx={{
                        '& .MuiTab-root': {
                            py: 1.5,
                            fontFamily: 'Comfortaa',
                            fontWeight: 'bold',
                            textTransform: 'none',
                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                            minHeight: 48
                        }
                    }}
                >
                    <Tab icon={<NotificationsIcon sx={{ fontSize: { xs: '1.1rem', sm: '1.4rem' } }} />} iconPosition="start" label="Benachrichtigungen" />
                    <Tab icon={<PersonIcon sx={{ fontSize: { xs: '1.1rem', sm: '1.4rem' } }} />} iconPosition="start" label="Allgemein" />
                </Tabs>
            </Box>

            <Box sx={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                px: { xs: 1.5, sm: 3 }, // Reduced for mobile
                pb: 2
            }}>
                <TabPanel value={tabValue} index={1}>
                    <Box sx={{ flex: 1, overflowY: 'auto', py: 1, pr: { xs: 1, sm: 1.5 } }}>
                        <Box sx={{ mb: 4 }}>
                            <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, mb: 1, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                Benutzerkonto
                            </Typography>
                            <Box sx={{
                                p: 2,
                                borderRadius: 2,
                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                            }}>
                                <Typography sx={{ fontWeight: 'bold' }}>{currentUser?.displayName || 'Benutzer'}</Typography>
                                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>{currentUser?.email}</Typography>
                            </Box>
                        </Box>

                        <Divider sx={{ my: 3 }} />

                        <Box>
                            <Button
                                fullWidth
                                onClick={() => setPasswordExpanded(!passwordExpanded)}
                                sx={{
                                    justifyContent: 'space-between',
                                    textTransform: 'none',
                                    color: theme.palette.text.primary,
                                    py: 1,
                                    px: 1,
                                    borderRadius: 2,
                                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) }
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <LockIcon sx={{ color: theme.palette.primary.main }} />
                                    <Typography variant="body1" sx={{ fontWeight: 'bold', fontFamily: 'Comfortaa' }}>
                                        Passwort ändern
                                    </Typography>
                                </Box>
                                {passwordExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </Button>

                            <Collapse in={passwordExpanded}>
                                <Box component="form" onSubmit={handlePasswordChange} sx={{
                                    mt: 1,
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: alpha(theme.palette.primary.main, 0.03),
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <input type="text" name="username" autoComplete="username" style={{ display: 'none' }} readOnly />

                                        <TextField
                                            margin="dense"
                                            label="Aktuelles Passwort"
                                            type={showPassword ? 'text' : 'password'}
                                            fullWidth
                                            variant="outlined"
                                            name="current-password"
                                            autoComplete="current-password"
                                            value={passwordData.oldPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                            disabled={loading}
                                            size="small"
                                        />
                                        <TextField
                                            margin="dense"
                                            label="Neues Passwort"
                                            type={showPassword ? 'text' : 'password'}
                                            fullWidth
                                            variant="outlined"
                                            name="new-password"
                                            autoComplete="new-password"
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            disabled={loading}
                                            size="small"
                                            InputProps={{
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" tabIndex={-1}>
                                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            }}
                                        />
                                        <TextField
                                            margin="dense"
                                            label="Neues Passwort bestätigen"
                                            type={showPassword ? 'text' : 'password'}
                                            fullWidth
                                            variant="outlined"
                                            name="confirm-password"
                                            autoComplete="new-password"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            disabled={loading}
                                            size="small"
                                        />

                                        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
                                        {success && <Alert severity="success" sx={{ mt: 1 }}>Passwort erfolgreich geändert!</Alert>}

                                        <Button
                                            type="submit"
                                            variant="contained"
                                            disabled={loading}
                                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LockIcon />}
                                            sx={{ mt: 1, py: 1, borderRadius: 2, fontWeight: 'bold' }}
                                        >
                                            Passwort aktualisieren
                                        </Button>
                                    </Box>
                                </Box>
                            </Collapse>
                        </Box>

                        <Divider sx={{ my: 4 }} />

                        <Button
                            fullWidth
                            variant="outlined"
                            color="error"
                            onClick={handleLogout}
                            startIcon={<LogoutIcon />}
                            sx={{
                                py: 1.5,
                                borderRadius: 2,
                                fontWeight: 'bold',
                                borderStyle: 'dashed',
                                '&:hover': {
                                    borderStyle: 'solid',
                                    bgcolor: alpha(theme.palette.error.main, 0.05)
                                }
                            }}
                        >
                            Abmelden
                        </Button>
                    </Box>
                </TabPanel>

                <TabPanel value={tabValue} index={0}>
                    <Box sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0
                    }}>
                        <Typography variant="subtitle2" sx={{
                            color: theme.palette.text.secondary,
                            mb: 1.5,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            flexShrink: 0,
                            pt: 1
                        }}>
                            <NotificationsIcon fontSize="small" /> Kürzliche Aktivitäten
                        </Typography>

                        <Box sx={{
                            flexGrow: 1,
                            overflowY: 'auto',
                            minHeight: 0,
                            pl: 0.5,
                            pr: { xs: 1, sm: 1.5 }, // Space for scrollbar
                            mb: 1,
                            height: '100%'
                        }}>
                            {notifLoading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                                    <CircularProgress />
                                </Box>
                            ) : notifications.length === 0 ? (
                                <Box sx={{ textAlign: 'center', py: 5 }}>
                                    <DraftsIcon sx={{ fontSize: 48, color: theme.palette.text.disabled, mb: 2 }} />
                                    <Typography sx={{ color: theme.palette.text.secondary }}>
                                        Keine ungelesenen Benachrichtigungen.
                                    </Typography>
                                </Box>
                            ) : (
                                <List sx={{ width: '100%', bgcolor: 'background.paper', p: 0 }}>
                                    {notifications.map((notif, index) => (
                                        <React.Fragment key={notif.id}>
                                            <ListItem
                                                alignItems="flex-start"
                                                onClick={() => markAsRead(notif.id)}
                                                sx={{
                                                    borderRadius: 2,
                                                    mb: 1,
                                                    cursor: 'pointer',
                                                    '&:hover': {
                                                        bgcolor: alpha(theme.palette.primary.main, 0.05)
                                                    },
                                                    transition: 'background-color 0.2s'
                                                }}
                                            >
                                                <ListItemAvatar>
                                                    <Avatar sx={{ bgcolor: alpha(theme.palette.background.paper, 0.1), border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                                                        {getNotifIcon(notif.type)}
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                                                {notif.title}
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                                                                {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleString('de-DE', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Vor kurzem'}
                                                            </Typography>
                                                        </Box>
                                                    }
                                                    secondary={
                                                        <Typography
                                                            variant="body2"
                                                            sx={{ color: theme.palette.text.secondary, mt: 0.5 }}
                                                        >
                                                            {notif.message}
                                                        </Typography>
                                                    }
                                                />
                                            </ListItem>
                                            {index < notifications.length - 1 && <Divider variant="inset" component="li" />}
                                        </React.Fragment>
                                    ))}
                                </List>
                            )}
                        </Box>

                        <Divider sx={{ my: 1, opacity: 0.6, flexShrink: 0 }} />

                        {/* E-Mail-Benachrichtigungseinstellungen (Festhaltend unten) */}
                        <Box sx={{ mt: 1, flexShrink: 0 }}>
                            <Button
                                fullWidth
                                onClick={() => setEmailSettingsExpanded(!emailSettingsExpanded)}
                                sx={{
                                    justifyContent: 'space-between',
                                    textTransform: 'none',
                                    color: theme.palette.text.primary,
                                    py: 1,
                                    px: 1,
                                    borderRadius: 2,
                                    '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.05) }
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <EmailIcon sx={{ color: theme.palette.secondary.main }} />
                                    <Typography variant="body1" sx={{ fontWeight: 'bold', fontFamily: 'Comfortaa' }}>
                                        E-Mail-Einstellungen
                                    </Typography>
                                </Box>
                                {emailSettingsExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </Button>

                            <Collapse in={emailSettingsExpanded}>
                                <Box sx={{
                                    mt: 1,
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: alpha(theme.palette.secondary.main, 0.03),
                                    border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
                                }}>
                                    <Typography variant="caption" sx={{ color: theme.palette.text.secondary, mb: 1, display: 'block' }}>
                                        Wähle aus, bei welchen Ereignissen du zusätzlich eine E-Mail erhalten möchtest.
                                    </Typography>

                                    <FormGroup>
                                        <FormControlLabel
                                            control={<Switch checked={emailPrefs.gameRequests} onChange={() => handleEmailPrefToggle('gameRequests')} color="secondary" size="small" />}
                                            label={<Typography variant="body2" sx={{ fontSize: '0.82rem' }}>Spielanfragen (Neue, Zusagen, Absagen)</Typography>}
                                        />
                                        <FormControlLabel
                                            control={<Switch checked={emailPrefs.gameResults} onChange={() => handleEmailPrefToggle('gameResults')} color="secondary" size="small" />}
                                            label={<Typography variant="body2" sx={{ fontSize: '0.82rem' }}>Ergebnisse (Meldungen & Bestätigungen)</Typography>}
                                        />
                                        <FormControlLabel
                                            control={<Switch checked={emailPrefs.gameCancellations} onChange={() => handleEmailPrefToggle('gameCancellations')} color="secondary" size="small" />}
                                            label={<Typography variant="body2" sx={{ fontSize: '0.82rem' }}>Herausforderungen & Absagen</Typography>}
                                        />
                                    </FormGroup>

                                    {settingsError && <Alert severity="error" sx={{ mt: 1.5 }} size="small">{settingsError}</Alert>}
                                    {settingsSuccess && <Alert severity="success" sx={{ mt: 1.5 }} size="small">Einstellungen gespeichert!</Alert>}

                                    <Button
                                        fullWidth
                                        variant="contained"
                                        color="secondary"
                                        onClick={saveEmailSettings}
                                        disabled={settingsLoading}
                                        sx={{ mt: 1.5, borderRadius: 2, fontWeight: 'bold', py: 0.8 }}
                                        startIcon={settingsLoading ? <CircularProgress size={16} color="inherit" /> : null}
                                    >
                                        Einstellungen speichern
                                    </Button>
                                </Box>
                            </Collapse>
                        </Box>
                    </Box>
                </TabPanel>
            </Box>
        </AppModal>
    );
};

export default UserSettingsModal;
