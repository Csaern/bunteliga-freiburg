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
import QrCode2Icon from '@mui/icons-material/QrCode2';
import PeopleIcon from '@mui/icons-material/People';

const contactInfo = {
    generalNote: "Kontaktadressen der einzelnen Teams findet Ihr auf der Seite Teams! Für andere Anliegen nutze bitte dieses Formular.",
    address: {
        name: "Bunte Liga Freiburg",
        person: "c/o Jonas Krause",
        street: "Ferdinand-Weiß-Straße 92",
        city: "79106 Freiburg",
    },
    responsibilities: [
        { function: "1. Vorstand", name: "Jonas Krause" },
        { function: "2. Vorstand", name: "Jens Karsten" },
        { function: "Kassenwart", name: "Peter Deutschmann" },
        { function: "Kassenprüfer", name: "Klaus Becker" },
        { function: "Kassenprüfer", name: "Valentin Czisch" },
        { function: "Spielausschuss", name: "Benedikt Greiner" },
        { function: "Spielausschuss", name: "Dominik Seifer" },
        { function: "Ergebnisdienst", name: "Peter" },
        { function: "Platzvergabe", name: "Carlos" },
        { function: "Platzpflege", name: "Rasenteam" },
    ],
    bankDetails: {
        name: "Sparkasse Freiburg",
        iban: "DE06 6805 0101 0010 1030 69",
        bic: "FRSPDE66XXX",
        qrNote: "Oder zahl einfach per QR Code."
    }
};

const getIconForFunction = (functionName) => {
    const lowerFuncName = functionName.toLowerCase();
    if (lowerFuncName.includes('vorstand')) return <BusinessIcon />;
    if (lowerFuncName.includes('kassenwart')) return <AccountBalanceWalletIcon />;
    if (lowerFuncName.includes('kassenprüfer')) return <PeopleIcon />;
    if (lowerFuncName.includes('spielausschuss')) return <SportsSoccerIcon />;
    if (lowerFuncName.includes('ergebnisdienst')) return <AssignmentIcon />;
    if (lowerFuncName.includes('platzvergabe')) return <EventSeatIcon />;
    if (lowerFuncName.includes('platzpflege')) return <GrassIcon />;
    return <BusinessIcon />;
};

const InfoSection = ({ title, icon, children, sx }) => {
    const theme = useTheme();
    return (
        <Paper
            elevation={3}
            sx={{
                p: { xs: 2, sm: 3 },
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

const ContactContent = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [formData, setFormData] = React.useState({
        recipient: '',
        name: '',
        email: '',
        subject: '',
        message: '',
    });

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        console.log('Formulardaten:', formData);
        setFormData({ recipient: '', name: '', email: '', subject: '', message: '' });
        alert('Nachricht gesendet (simuliert)!');
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

    const groupedResponsibilities = React.useMemo(() => {
        return contactInfo.responsibilities.reduce((acc, current) => {
            const { function: funcName, name } = current;
            if (!acc[funcName]) {
                acc[funcName] = { names: [], icon: getIconForFunction(funcName) };
            }
            acc[funcName].names.push(name);
            return acc;
        }, {});
    }, []);

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: { xs: 3, sm: 4 },
                width: '100%',
            }}
        >
            <Typography
                variant="h3"
                component="h1"
                textAlign="center"
                sx={{ fontFamily: 'Comfortaa', fontWeight: 700, color: theme.palette.primary.main, mb: 1 }}
            >
                KONTAKT
            </Typography>

            <Typography
                variant="body1"
                textAlign="center"
                sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.secondary, mb: 3 }}
            >
                {contactInfo.generalNote}
            </Typography>

            <Box sx={{ width: '100%' }}>
                <InfoSection title="Anschrift" icon={<LocationOnIcon />}>
                    <Typography variant={isMobile ? "body2" : "body1"} sx={{ fontFamily: 'Comfortaa', lineHeight: 1.7, color: theme.palette.text.secondary }}>
                        {contactInfo.address.name}<br />
                        {contactInfo.address.person}<br />
                        {contactInfo.address.street}<br />
                        {contactInfo.address.city}
                    </Typography>
                </InfoSection>
            </Box>

            <Box sx={{ width: '100%' }}>
                <InfoSection title="Verantwortliche Personen" icon={<BusinessIcon sx={{ color: theme.palette.secondary.main }} />}>
                    <TableContainer>
                        <Table size="small" aria-label="Verantwortliche Personen">
                            <TableHead>
                                <TableRow sx={{ '& .MuiTableCell-head': { color: theme.palette.text.primary, fontWeight: 'bold', fontFamily: 'Comfortaa', borderBottom: `1px solid ${theme.palette.divider}`, fontSize: isMobile ? '0.8rem' : '0.9rem', py: 1 } }}>
                                    <TableCell sx={{ width: isMobile ? '45%' : '40%', py: 1.5, px: isMobile ? 1 : 1.5 }}>Funktion</TableCell>
                                    <TableCell sx={{ py: 1.5, px: isMobile ? 1 : 1.5 }}>Name(n)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.entries(groupedResponsibilities).map(([funcName, data]) => (
                                    <TableRow key={funcName} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell component="th" scope="row" sx={{ color: theme.palette.text.secondary, fontFamily: 'Comfortaa', borderBottom: `1px solid ${theme.palette.divider}`, py: isMobile ? 1 : 1.5, px: isMobile ? 1 : 1.5, verticalAlign: 'top' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                {data.icon && <ListItemIcon sx={{ minWidth: 'auto', mr: isMobile ? 1 : 1.5, mt: 0.3 }}>{React.cloneElement(data.icon, { sx: { ...data.icon.props.sx, fontSize: isMobile ? '1.2rem' : '1.4rem', color: theme.palette.secondary.main } })}</ListItemIcon>}
                                                <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', color: 'inherit', fontSize: isMobile ? '0.75rem' : '0.9rem' }}>
                                                    {funcName}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ color: theme.palette.text.secondary, fontFamily: 'Comfortaa', borderBottom: `1px solid ${theme.palette.divider}`, py: isMobile ? 1 : 1.5, px: isMobile ? 1 : 1.5 }}>
                                            {data.names.map((name, index) => (
                                                <Typography key={index} variant="body2" sx={{ fontFamily: 'Comfortaa', color: 'inherit', fontSize: isMobile ? '0.75rem' : '0.9rem', display: 'block' /* Jeder Name in einer neuen Zeile */ }}>
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
            </Box>

            <Box sx={{ width: '100%' }}>
                <InfoSection title="Bankverbindung" icon={<AccountBalanceIcon />}>
                    <Typography variant={isMobile ? "body2" : "body1"} sx={{ fontFamily: 'Comfortaa', lineHeight: 1.7, color: theme.palette.text.secondary }}>
                        {contactInfo.bankDetails.name}<br />
                        IBAN: {contactInfo.bankDetails.iban}<br />
                        BIC: {contactInfo.bankDetails.bic}
                    </Typography>
                    <Typography variant="caption" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.disabled, display: 'flex', alignItems: 'center', mt: 1 }}>
                        <QrCode2Icon sx={{ fontSize: '1.2rem', mr: 0.5, color: theme.palette.secondary.main }} /> {contactInfo.bankDetails.qrNote}
                    </Typography>
                </InfoSection>
            </Box>

            <Box sx={{ width: '100%' }}>
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
                                Nachricht senden
                            </Button>
                        </Box>
                    </Box>
                </InfoSection>
            </Box>
        </Box>
    );
};

export default ContactContent;
