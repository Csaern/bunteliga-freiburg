import * as React from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Paper,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    useTheme,
    TableContainer,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    ListItemIcon,
    useMediaQuery,
    Container,
    Grid,
    Snackbar,
    Alert,
    CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import BusinessIcon from '@mui/icons-material/Business';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import GrassIcon from '@mui/icons-material/Grass';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PeopleIcon from '@mui/icons-material/People';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import FaxIcon from '@mui/icons-material/Fax';
import QRCode from "react-qr-code";

import * as websiteApi from '../services/websiteApiService';

const iconMapping = {
    'BusinessIcon': <BusinessIcon />,
    'AccountBalanceWalletIcon': <AccountBalanceWalletIcon />,
    'PeopleIcon': <PeopleIcon />,
    'SportsSoccerIcon': <SportsSoccerIcon />,
    'AssignmentIcon': <AssignmentIcon />,
    'EventSeatIcon': <EventSeatIcon />,
    'GrassIcon': <GrassIcon />,
    'AccountBalanceIcon': <AccountBalanceIcon />,
};

const getIconComponent = (iconName) => {
    return iconMapping[iconName] || <BusinessIcon />;
};

const InfoSection = ({ title, icon, children, sx }) => {
    const theme = useTheme();
    return (
        <Paper
            elevation={3}
            sx={{
                p: { xs: 1.5, sm: 3 },
                backgroundColor: theme.palette.background.paper,
                backgroundImage: 'none',
                borderRadius: theme.shape.borderRadius,
                border: `1px solid ${theme.palette.divider}`,
                ...sx,
            }}
        >
            {title && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {icon && <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5, color: theme.palette.secondary.main }}>{icon}</ListItemIcon>}
                    <Typography variant="h6" component="h3" sx={{ fontFamily: 'Comfortaa', fontWeight: 600, color: theme.palette.text.primary }}>
                        {title}
                    </Typography>
                </Box>
            )}
            {children}
        </Paper>
    );
};



// ... existing imports

const ContactContent = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [clubInfo, setClubInfo] = React.useState(null);
    const [functionaries, setFunctionaries] = React.useState([]);

    React.useEffect(() => {
        const loadData = async () => {
            try {
                const [infoData, funcData] = await Promise.all([
                    websiteApi.getSettings('club-info'),
                    websiteApi.getSettings('functionaries')
                ]);

                // If data is missing (not yet saved in Admin), use an empty structure or defaults to prevent sticking on "Loading..."
                if (infoData) {
                    setClubInfo(infoData);
                } else {
                    // Fallback to minimal structure to allow page to render (even if empty)
                    setClubInfo({
                        address: {}, bankDetails: {}, contact: {}, register: {}, dataProtection: {}
                    });
                }

                if (funcData) {
                    if (Array.isArray(funcData.entries)) {
                        setFunctionaries(funcData.entries);
                    } else if (Array.isArray(funcData)) {
                        setFunctionaries(funcData);
                    }
                }
            } catch (error) {
                console.error('Failed to load contact info', error);
                // Even on error, stop loading state (here by setting empty)
                setClubInfo({ address: {}, bankDetails: {}, contact: {}, register: {}, dataProtection: {} });
            }
        };
        loadData();
    }, []);

    // Form state and handlers (keep existing)
    const [formData, setFormData] = React.useState({
        recipient: '',
        name: '',
        email: '',
        subject: '',
        message: '',
    });
    const [submitting, setSubmitting] = React.useState(false);
    const [notification, setNotification] = React.useState({ open: false, message: '', severity: 'info' });

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        try {
            await websiteApi.sendContactForm(formData);
            setNotification({ open: true, message: 'Nachricht erfolgreich gesendet!', severity: 'success' });
            setFormData({ recipient: '', name: '', email: '', subject: '', message: '' });
        } catch (error) {
            console.error(error);
            setNotification({ open: true, message: error.message || 'Fehler beim Senden der Nachricht.', severity: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleCloseNotification = () => {
        setNotification({ ...notification, open: false });
    };

    const formFieldStyles = {
        width: '100%',
        mb: 2.5,
        '& .MuiInputLabel-root': {
            color: theme.palette.text.secondary,
            fontFamily: 'Comfortaa',
            '&.Mui-focused': {
                color: theme.palette.secondary.main,
            },
        },
        '& .MuiInputBase-input': {
            color: theme.palette.text.primary,
            fontFamily: 'Comfortaa',
            fontSize: '0.95rem',
        },
        '& .MuiOutlinedInput-root': {
            backgroundColor: theme.palette.action.hover,
            '& fieldset': {
                borderColor: theme.palette.divider,
            },
            '&:hover fieldset': {
                borderColor: theme.palette.text.secondary,
            },
            '&.Mui-focused fieldset': {
                borderColor: theme.palette.secondary.main,
            },
        },
        '& .MuiSelect-select': {
            paddingTop: '14px',
            paddingBottom: '14px',
            lineHeight: '1.4375em',
        },
        '& .MuiSvgIcon-root': {
            color: theme.palette.text.secondary,
        }
    };

    const groupedFunctions = React.useMemo(() => {
        const groups = {};
        functionaries.forEach(item => {
            if (!groups[item.function]) {
                groups[item.function] = {
                    icon: getIconComponent(item.icon),
                    names: []
                };
            }
            groups[item.function].names.push(item.name);
        });
        return groups;
    }, [functionaries]);

    const generateEpcQr = (iban, bic, name) => {
        if (!iban || !bic || !name) return "";
        // EPC-QR Standard for SEPA Credit Transfer
        return `BCD\n002\n1\nSCT\n${bic}\n${name}\n${iban}\nEUR0.00\n\n`;
    };

    if (!clubInfo) {
        return <Typography sx={{ p: 4, textAlign: 'center' }}>Lade Daten...</Typography>;
    }

    const qrValue = generateEpcQr(clubInfo.bankDetails.iban, clubInfo.bankDetails.bic, clubInfo.bankDetails.name);

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 4, sm: 6 } }}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: { xs: 4, sm: 6 },
                    width: '100%',
                    mx: 'auto',
                }}
            >
                <Box textAlign="center">
                    <Typography
                        variant={isMobile ? 'h4' : 'h3'}
                        component="h1"
                        sx={{ fontFamily: 'Comfortaa', fontWeight: 700, color: theme.palette.primary.main, mb: 2, textTransform: 'uppercase' }}
                    >
                        Kontakt
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.secondary, maxWidth: '600px', mx: 'auto', lineHeight: 1.6 }}
                    >
                        Kontaktadressen der einzelnen Teams findet Ihr auf der Seite "Teams"! Für alle anderen Anliegen an die Liga oder den Vorstand nutzt bitte das Formular unten oder die angegebenen Kontaktwege.
                    </Typography>
                </Box>

                {/* Info Grid */}
                <Grid container spacing={4} direction="column">
                    {/* 1. Anschrift */}
                    <Grid item xs={12}>
                        <InfoSection title="Anschrift" icon={<LocationOnIcon />}>
                            <Typography variant="body1" sx={{ fontFamily: 'Comfortaa', lineHeight: 1.8, color: theme.palette.text.primary }}>
                                <strong>{clubInfo?.address?.name}</strong><br />
                                {clubInfo?.address?.person && <>{clubInfo.address.person}<br /></>}
                                {clubInfo?.address?.street}<br />
                                {clubInfo?.address?.city}
                            </Typography>
                            <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {clubInfo?.contact?.email && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: theme.palette.text.secondary }}>
                                        <EmailIcon fontSize="small" color="secondary" />
                                        <Typography component="a" href={`mailto:${clubInfo.contact.email}`} sx={{ color: 'inherit', textDecoration: 'none', fontFamily: 'Comfortaa', '&:hover': { color: theme.palette.primary.main } }}>
                                            {clubInfo.contact.email}
                                        </Typography>
                                    </Box>
                                )}
                                {clubInfo?.contact?.phone && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: theme.palette.text.secondary }}>
                                        <PhoneIcon fontSize="small" color="secondary" />
                                        <Typography component="a" href={`tel:${clubInfo.contact.phone}`} sx={{ color: 'inherit', textDecoration: 'none', fontFamily: 'Comfortaa', '&:hover': { color: theme.palette.primary.main } }}>
                                            {clubInfo.contact.phone}
                                        </Typography>
                                    </Box>
                                )}
                                {clubInfo?.contact?.fax && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: theme.palette.text.secondary }}>
                                        <FaxIcon fontSize="small" color="secondary" />
                                        <Typography sx={{ fontFamily: 'Comfortaa' }}>{clubInfo.contact.fax}</Typography>
                                    </Box>
                                )}
                            </Box>
                        </InfoSection>
                    </Grid>

                    {/* 2. Funktionäre (moved up) */}
                    <Grid item xs={12}>
                        <InfoSection title="Funktionäre" icon={<BusinessIcon />} sx={{ p: 0, overflow: 'hidden' }}>
                            <TableContainer>
                                <Table size={isMobile ? "small" : "medium"}>
                                    <TableHead sx={{ bgcolor: theme.palette.action.hover }}>
                                        <TableRow>
                                            <TableCell sx={{ fontFamily: 'Comfortaa', fontWeight: 'bold' }}>Funktion</TableCell>
                                            <TableCell sx={{ fontFamily: 'Comfortaa', fontWeight: 'bold' }}>Name(n)</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Object.entries(groupedFunctions).map(([funcName, data]) => (
                                            <TableRow key={funcName} hover>
                                                <TableCell component="th" scope="row" sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Box sx={{ color: theme.palette.secondary.main, display: 'flex' }}>
                                                            {React.cloneElement(data.icon, { fontSize: 'small' })}
                                                        </Box>
                                                        <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', fontWeight: 500 }}>
                                                            {funcName}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                                                    {data.names.map((name, index) => (
                                                        <Typography key={index} variant="body2" sx={{ fontFamily: 'Comfortaa', display: 'block', py: 0.5 }}>
                                                            {name}
                                                        </Typography>
                                                    ))}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </InfoSection>
                    </Grid>

                    {/* 3. Bankverbindung (moved down) */}
                    <Grid item xs={12}>
                        <InfoSection title="Bankverbindung" icon={<AccountBalanceIcon />}>
                            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, gap: 3 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="body1" sx={{ fontFamily: 'Comfortaa', lineHeight: 1.8, color: theme.palette.text.primary, mb: 1 }}>
                                        <strong>{clubInfo?.bankDetails?.name}</strong>
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.secondary, mb: 0.5, fontSize: '1.1rem' }}>
                                        IBAN: {clubInfo?.bankDetails?.iban}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.secondary, fontSize: '1.1rem' }}>
                                        BIC: {clubInfo?.bankDetails?.bic}
                                    </Typography>
                                </Box>
                                {qrValue && (
                                    <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, border: `1px solid ${theme.palette.divider}`, alignSelf: { xs: 'center', md: 'auto' }, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <QRCode
                                            value={qrValue}
                                            size={120}
                                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                            viewBox={`0 0 256 256`}
                                        />
                                        <Typography variant="caption" sx={{ mt: 1, color: 'text.secondary', fontSize: '0.7rem', textAlign: 'center' }}>
                                            Mit Banking-App scannen
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </InfoSection>
                    </Grid>

                    {/* 4. Kontaktformular */}
                    <Grid item xs={12}>
                        <InfoSection title="Schreib uns!" icon={<SendIcon sx={{ color: theme.palette.secondary.main }} />}>
                            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                                <FormControl fullWidth sx={formFieldStyles}>
                                    <InputLabel id="recipient-label">An wen?</InputLabel>
                                    <Select
                                        labelId="recipient-label"
                                        id="recipient"
                                        name="recipient"
                                        value={formData.recipient}
                                        label="An wen?"
                                        onChange={handleChange}
                                        MenuProps={{
                                            PaperProps: {
                                                sx: {
                                                    backgroundColor: theme.palette.background.paper,
                                                    color: theme.palette.text.primary,
                                                    fontFamily: 'Comfortaa',
                                                    border: `1px solid ${theme.palette.divider}`,
                                                    maxHeight: 250, // Begrenzt die Höhe des Dropdowns
                                                    '& .MuiMenuItem-root': {
                                                        fontFamily: 'Comfortaa',
                                                        color: theme.palette.text.secondary,
                                                        '&:hover': {
                                                            backgroundColor: theme.palette.action.hover,
                                                            color: theme.palette.text.primary,
                                                        },
                                                        '&.Mui-selected': {
                                                            backgroundColor: theme.palette.action.selected,
                                                            color: theme.palette.text.primary,
                                                            '&:hover': {
                                                                backgroundColor: theme.palette.action.selected,
                                                            }
                                                        }
                                                    }
                                                },
                                            },
                                        }}
                                    >
                                        <MenuItem value="" disabled sx={{ fontFamily: 'Comfortaa' }}><em>Bitte auswählen</em></MenuItem>
                                        <MenuItem value="vorstand" sx={{ fontFamily: 'Comfortaa' }}>Vorstand</MenuItem>
                                        <MenuItem value="kassenwart" sx={{ fontFamily: 'Comfortaa' }}>Kassenwart</MenuItem>
                                        <MenuItem value="spielausschuss" sx={{ fontFamily: 'Comfortaa' }}>Spielausschuss</MenuItem>
                                        <MenuItem value="ergebnisdienst" sx={{ fontFamily: 'Comfortaa' }}>Ergebnisdienst</MenuItem>
                                        <MenuItem value="platzvergabe" sx={{ fontFamily: 'Comfortaa' }}>Platzvergabe/Platzpflege</MenuItem>
                                        <MenuItem value="sonstiges" sx={{ fontFamily: 'Comfortaa' }}>Sonstiges</MenuItem>
                                    </Select>
                                </FormControl>
                                <TextField
                                    required
                                    fullWidth
                                    id="name"
                                    label="Dein Name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    sx={formFieldStyles}
                                />
                                <TextField
                                    required
                                    fullWidth
                                    id="email"
                                    label="Deine E-Mail"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    sx={formFieldStyles}
                                />
                                <TextField
                                    required
                                    fullWidth
                                    id="subject"
                                    label="Betreff"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    sx={formFieldStyles}
                                />
                                <TextField
                                    required
                                    fullWidth
                                    id="message"
                                    label="Deine Nachricht"
                                    name="message"
                                    multiline
                                    rows={5}
                                    value={formData.message}
                                    onChange={handleChange}
                                    sx={formFieldStyles}
                                />
                                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        endIcon={<SendIcon />}
                                        sx={{
                                            fontFamily: 'Comfortaa',
                                            fontWeight: 'bold',
                                            py: 1.5,
                                            backgroundColor: theme.palette.secondary.main,
                                            color: theme.palette.common.black,
                                            mt: 1,
                                            '&:hover': {
                                                backgroundColor: theme.palette.secondary.dark,
                                            },
                                        }}
                                    >
                                        {submitting ? <CircularProgress size={24} color="inherit" /> : 'Nachricht senden'}
                                    </Button>
                                </Box>
                            </Box>
                        </InfoSection>
                    </Grid>
                </Grid>

                <Snackbar open={notification.open} autoHideDuration={6000} onClose={handleCloseNotification}>
                    <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
                        {notification.message}
                    </Alert>
                </Snackbar>
            </Box>
        </Container>
    );
};

export default ContactContent;
