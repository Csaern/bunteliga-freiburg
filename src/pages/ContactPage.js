import * as React from 'react';
import {
  Box,
  Container,
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

const blaugrün = '#00A99D';
const gelb = '#FFBF00';

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
  if (lowerFuncName.includes('vorstand')) return <BusinessIcon sx={{ color: gelb }} />;
  if (lowerFuncName.includes('kassenwart')) return <AccountBalanceWalletIcon sx={{ color: gelb }} />;
  if (lowerFuncName.includes('kassenprüfer')) return <PeopleIcon sx={{ color: gelb }} />;
  if (lowerFuncName.includes('spielausschuss')) return <SportsSoccerIcon sx={{ color: gelb }} />;
  if (lowerFuncName.includes('ergebnisdienst')) return <AssignmentIcon sx={{ color: gelb }} />;
  if (lowerFuncName.includes('platzvergabe')) return <EventSeatIcon sx={{ color: gelb }} />;
  if (lowerFuncName.includes('platzpflege')) return <GrassIcon sx={{ color: gelb }} />;
  return <BusinessIcon sx={{ color: gelb }} />; 
};


const InfoSection = ({ title, icon, children, sx }) => {
  const theme = useTheme();
  return (
    <Paper
      elevation={3}
      sx={{
        p: { xs: 2, sm: 3 },
        backgroundColor: 'rgba(28, 28, 28, 0.9)',
        backdropFilter: 'blur(5px)',
        borderRadius: theme.shape.borderRadius,
        border: `1px solid ${theme.palette.grey[800]}`,
        ...sx,
      }}
    >
      {title && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon && <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5, color: gelb }}>{icon}</ListItemIcon>}
          <Typography variant="h6" component="h3" sx={{ fontFamily: 'comfortaa', fontWeight: 600, color: theme.palette.common.white }}>
            {title}
          </Typography>
        </Box>
      )}
      {children}
    </Paper>
  );
};

const ContactPage = () => {
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
      color: theme.palette.grey[400],
      fontFamily: 'comfortaa',
      '&.Mui-focused': {
        color: gelb,
      },
    },
    '& .MuiInputBase-input': {
      color: theme.palette.common.white,
      fontFamily: 'comfortaa',
      fontSize: '0.95rem',
    },
    '& .MuiOutlinedInput-root': {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      '& fieldset': {
        borderColor: theme.palette.grey[700],
      },
      '&:hover fieldset': {
        borderColor: theme.palette.grey[500],
      },
      '&.Mui-focused fieldset': {
        borderColor: gelb,
      },
    },
    '& .MuiSelect-select': {
        paddingTop: '14px',
        paddingBottom: '14px',
        lineHeight: '1.4375em',
    },
    '& .MuiSvgIcon-root': {
        color: theme.palette.grey[400],
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
    <Container
      maxWidth="md"
      sx={{
        py: { xs: 3, sm: 4 },
        px: { xs: 2, sm: 3 },
        color: theme.palette.common.white,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: { xs: 3, sm: 4 },
      }}
    >
      <Typography
        variant="h3"
        component="h1"
        textAlign="center"
        sx={{ fontFamily: 'comfortaa', fontWeight: 700, color: blaugrün, mb: 1 }}
      >
        KONTAKT
      </Typography>

      <Typography
        variant="body1"
        textAlign="center"
        sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[300], mb: 3 }}
      >
        {contactInfo.generalNote}
      </Typography>

      <Box sx={{ width: '100%' }}>
        <InfoSection title="Anschrift" icon={<LocationOnIcon />}>
          <Typography variant={isMobile ? "body2" : "body1"} sx={{ fontFamily: 'comfortaa', lineHeight: 1.7, color: theme.palette.grey[200] }}>
            {contactInfo.address.name}<br />
            {contactInfo.address.person}<br />
            {contactInfo.address.street}<br />
            {contactInfo.address.city}
          </Typography>
        </InfoSection>
      </Box>

      <Box sx={{ width: '100%' }}>
        <InfoSection title="Verantwortliche Personen" icon={<BusinessIcon sx={{color: gelb }} />}>
          <TableContainer>
            <Table size="small" aria-label="Verantwortliche Personen">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': { color: theme.palette.common.white, fontWeight: 'bold', fontFamily: 'comfortaa', borderBottom: `1px solid ${theme.palette.grey[700]}`, fontSize: isMobile ? '0.8rem' : '0.9rem', py: 1 } }}>
                  <TableCell sx={{ width: isMobile ? '45%' : '40%', py: 1.5, px: isMobile ? 1 : 1.5 }}>Funktion</TableCell>
                  <TableCell sx={{ py: 1.5, px: isMobile ? 1 : 1.5 }}>Name(n)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(groupedResponsibilities).map(([funcName, data]) => (
                  <TableRow key={funcName} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell component="th" scope="row" sx={{ color: theme.palette.grey[100], fontFamily: 'comfortaa', borderBottom: `1px solid ${theme.palette.grey[800]}`, py: isMobile ? 1 : 1.5, px: isMobile ? 1 : 1.5, verticalAlign: 'top' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {data.icon && <ListItemIcon sx={{ minWidth: 'auto', mr: isMobile ? 1 : 1.5, mt: 0.3 }}>{React.cloneElement(data.icon, { sx: { ...data.icon.props.sx, fontSize: isMobile ? '1.2rem' : '1.4rem' } })}</ListItemIcon>}
                        <Typography variant="body2" sx={{ fontFamily: 'comfortaa', color: 'inherit', fontSize: isMobile ? '0.75rem' : '0.9rem' }}>
                          {funcName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: theme.palette.grey[200], fontFamily: 'comfortaa', borderBottom: `1px solid ${theme.palette.grey[800]}`, py: isMobile ? 1 : 1.5, px: isMobile ? 1 : 1.5 }}>
                      {data.names.map((name, index) => (
                        <Typography key={index} variant="body2" sx={{ fontFamily: 'comfortaa', color: 'inherit', fontSize: isMobile ? '0.75rem' : '0.9rem', display: 'block' /* Jeder Name in einer neuen Zeile */ }}>
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
          <Typography variant={isMobile ? "body2" : "body1"} sx={{ fontFamily: 'comfortaa', lineHeight: 1.7, color: theme.palette.grey[200] }}>
            {contactInfo.bankDetails.name}<br />
            IBAN: {contactInfo.bankDetails.iban}<br />
            BIC: {contactInfo.bankDetails.bic}
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[400], display: 'flex', alignItems: 'center', mt: 1 }}>
            <QrCode2Icon sx={{ fontSize: '1.2rem', mr: 0.5, color: gelb }} /> {contactInfo.bankDetails.qrNote}
          </Typography>
        </InfoSection>
      </Box>
      
      <Box sx={{ width: '100%'}}>
        <InfoSection title="Schreib uns!" icon={<SendIcon sx={{color: gelb }} />}>
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
                            backgroundColor: 'rgb(20,20,20)', 
                            color: theme.palette.common.white,
                            fontFamily: 'comfortaa',
                            border: `1px solid ${theme.palette.grey[700]}`,
                            maxHeight: 250, // Begrenzt die Höhe des Dropdowns
                            '& .MuiMenuItem-root': {
                                fontFamily: 'comfortaa',
                                color: theme.palette.grey[300], 
                                '&:hover': {
                                    backgroundColor: theme.palette.grey[800],
                                    color: theme.palette.common.white,
                                },
                                '&.Mui-selected': { 
                                    backgroundColor: 'rgba(255, 191, 0, 0.2)', 
                                    color: theme.palette.common.white,
                                    '&:hover': {
                                       backgroundColor: 'rgba(255, 191, 0, 0.3)',
                                    }
                                }
                            }
                          },
                        },
                      }}
                    >
                      <MenuItem value="" disabled sx={{fontFamily:'comfortaa'}}><em>Bitte auswählen</em></MenuItem>
                      <MenuItem value="vorstand" sx={{fontFamily:'comfortaa'}}>Vorstand</MenuItem>
                      <MenuItem value="kassenwart" sx={{fontFamily:'comfortaa'}}>Kassenwart</MenuItem>
                      <MenuItem value="spielausschuss" sx={{fontFamily:'comfortaa'}}>Spielausschuss</MenuItem>
                      <MenuItem value="ergebnisdienst" sx={{fontFamily:'comfortaa'}}>Ergebnisdienst</MenuItem>
                      <MenuItem value="platzvergabe" sx={{fontFamily:'comfortaa'}}>Platzvergabe/Platzpflege</MenuItem>
                      <MenuItem value="sonstiges" sx={{fontFamily:'comfortaa'}}>Sonstiges</MenuItem>
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
                  <Box sx={{ display: 'flex', justifyContent: 'center'}}>
                <Button
                    type="submit"
                    variant="contained"
                    endIcon={<SendIcon />}
                    sx={{
                      fontFamily: 'comfortaa',
                      fontWeight: 'bold',
                      py: 1.5,
                      
                      backgroundColor: gelb, 
                      color: theme.palette.common.black, 
                      mt: 1, 
                      '&:hover': {
                        backgroundColor: theme.palette.warning.dark, 
                      },
                    }}
                  >
                    Nachricht senden
                  </Button>
                  </Box>
            </Box>
          </InfoSection>
      </Box>

    </Container>
  );
};

export default ContactPage;
