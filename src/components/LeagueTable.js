import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  Avatar,
  useTheme,
  Chip, // Import Chip für die Form-Anzeige
  Container, // Container importiert
  useMediaQuery, // Import für Responsive Design
} from '@mui/material';

// Hilfsfunktion zum Erstellen der Teamdaten, jetzt mit 'form' und 'logoColor'
const createTeamData = (
  rank,
  logoColor, // Farbe für den Avatar-Placeholder (Hex-Code oder MUI-Farbname)
  name,
  formString, // S, U, N als String, z.B. "SSUSS"
  played,
  won,
  drawn,
  lost,
  goalsFor,
  goalsAgainst,
  points
) => {
  const goalDifference = goalsFor - goalsAgainst;
  return {
    rank,
    logoColor,
    name,
    form: formString.split(''), // Form als Array von Buchstaben speichern
    played,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    goalDifference,
    points,
  };
};

// Aktualisierte Daten basierend auf dem Bild (Sieg = 2 Pkt, Unentschieden = 1 Pkt)
const tableData = [
  createTeamData(1, '#D32F2F', 'Rakete Freiburg', 'SSUSS', 5, 4, 1, 0, 27, 6, 9), // Dunkelrot
  createTeamData(2, '#757575', 'Die 2. Wahl', 'SSSS', 4, 4, 0, 0, 18, 7, 8),       // Grau
  createTeamData(3, '#5D4037', 'Lokomotive Littenweiler', 'USNSN', 6, 3, 1, 2, 29, 11, 7), // Braun
  createTeamData(4, '#C2185B', 'Red Sea', 'SSS', 3, 3, 0, 0, 15, 8, 6),           // Pink/Magenta
  createTeamData(5, '#00796B', 'Wurschtwecklebombers', 'SSS', 3, 3, 0, 0, 14, 7, 6), // Dunkles Türkis/Grün
  createTeamData(6, '#FBC02D', 'Latinos Freiburg', 'UUSSN', 5, 2, 2, 1, 16, 16, 6), // Gelb/Gold
  createTeamData(7, '#388E3C', 'Soccerfield Rockers', 'USNS', 4, 2, 1, 1, 13, 6, 5), // Grün
  createTeamData(8, '#1976D2', 'Dynamo Tresen', 'USNS', 4, 2, 1, 1, 10, 7, 5),       // Blau
  createTeamData(9, '#E91E63', 'Kante Freiburg', 'SUNSN', 5, 2, 1, 2, 10, 12, 5),    // Kräftiges Pink
  createTeamData(10, '#00BCD4', 'Union Eisenwaden', 'NSSN', 4, 2, 0, 2, 15, 7, 4),   // Cyan
  createTeamData(11, '#B71C1C', 'Haxe des Bösen', 'UNS', 3, 1, 1, 1, 12, 6, 3),      // Dunkelrot
  createTeamData(12, '#424242', 'SEK', 'NNUS', 4, 1, 1, 2, 8, 10, 3),               // Dunkelgrau
  createTeamData(13, '#64B5F6', 'Chimichurri Auriazul', 'NUNNS', 5, 1, 1, 3, 10, 34, 3), // Hellblau
  createTeamData(14, '#F5F5F5', 'Kämpfende Herzen', 'SNNN', 4, 1, 0, 3, 16, 17, 2), // Sehr helles Grau (fast weiß)
  createTeamData(15, '#81D4FA', '1. FC Ferdi Weiss', 'N', 1, 0, 0, 1, 0, 3, 0),     // Sehr helles Blau
  createTeamData(16, '#795548', 'Dampflokomotive Littenweiler', 'NNN', 3, 0, 0, 3, 2, 9, 0), // Braun
  createTeamData(17, '#FFEB3B', 'Zeugen Yeboahs', 'NN', 2, 0, 0, 2, 6, 17, 0),      // Gelb
  createTeamData(18, '#D7CCC8', 'Dübel-Lattenkreuz', 'NNNN', 4, 0, 0, 4, 2, 18, 0), // Hellgrau-Beige
  createTeamData(19, '#212121', 'CC Freiburg', 'NNN', 3, 0, 0, 3, 8, 30, 0),        // Fast Schwarz
];


// Stil für die Tabellenzellen
const StyledTableCell = ({ children, sx, align, hideOnMobile, ...props }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile && hideOnMobile) {
    return null; // Blendet die Zelle auf mobilen Geräten aus, wenn hideOnMobile true ist
  }

  return (
    <TableCell
      align={align}
      sx={{
        color: theme.palette.grey[300],
        fontFamily: 'comfortaa',
        borderBottom: `1px solid ${theme.palette.grey[800]}`,
        py: isMobile ? 0.5 : 1, // Weniger Padding auf Mobile
        px: isMobile ? 0.5 : 1, // Weniger Padding auf Mobile
        fontSize: isMobile ? '0.7rem' : '0.8rem', // Kleinere Schrift auf Mobile
        ...sx,
      }}
      {...props}
    >
      {children}
    </TableCell>
  );
};

// Komponente zur Darstellung der Form-Icons
const FormDisplay = ({ formArray }) => {
  const theme = useTheme();
  const getFormStyle = (result) => {
    switch (result) {
      case 'S':
        return { backgroundColor: theme.palette.success.main, color: theme.palette.common.white, width: 25, height: 25, fontSize: '0.7rem', margin: '0 2px' };
      case 'U':
        return { backgroundColor: theme.palette.warning.main, color: theme.palette.common.black, width: 25, height: 25, fontSize: '0.7rem', margin: '0 2px' };
      case 'N':
        return { backgroundColor: theme.palette.error.main, color: theme.palette.common.white, width: 25, height: 25, fontSize: '0.7rem', margin: '0 2px' };
      default:
        return { width: 25, height: 25, fontSize: '0.7rem', margin: '0 2px' };
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {formArray.slice(-5).map((result, index) => ( 
        <Chip key={index} label={result} size="small" sx={getFormStyle(result)} />
      ))}
    </Box>
  );
};


const LeagueTable = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Container maxWidth="xl" sx={{ my: 4, px: isMobile ? 1 : 2 }}> {/* Weniger Padding auf Mobile */}
      <Typography 
        variant={isMobile ? 'h5' : 'h4'} // Kleinere Überschrift auf Mobile
        sx={{ 
            mb: 2, // Weniger Margin Bottom auf Mobile
            mt: 2,
            color: theme.palette.error.main, 
            fontWeight: 700,
            fontFamily: 'comfortaa',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
        }}
      >
        LIGA-TABELLE
      </Typography>
      <TableContainer 
        component={Paper} 
        sx={{ 
            backgroundColor: '#111', 
            borderRadius: theme.shape.borderRadius,
            border: `1px solid ${theme.palette.grey[800]}`,
        }}
      >
        <Table aria-label="Fußballtabelle" size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'rgba(255,255,255,0.05)'}}>
              <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.grey[100], width: isMobile ? '8%' : '3%' }}>#</StyledTableCell>
              <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.grey[100], width: isMobile ? '42%' : '25%' }}>Team</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.grey[100] }}>Sp.</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.grey[100] }} hideOnMobile>S</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.grey[100] }} hideOnMobile>U</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.grey[100] }} hideOnMobile>N</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.grey[100] }} hideOnMobile>Tore</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.grey[100] }}>Diff.</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.grey[100] }}>Pkt.</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.grey[100], width: isMobile ? 'auto' : '15%' }} hideOnMobile>Form</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tableData.map((row) => (
              <TableRow 
                key={row.name} 
                sx={{ 
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                    ...(row.rank === 1 && { backgroundColor: 'rgba(112, 112, 112, 0.29)'}), // Deine vorherige Farbe für Platz 1
                }}
              >
                <StyledTableCell component="th" scope="row" sx={{ fontWeight: 'bold', color: row.rank === 1 ? theme.palette.error.light : theme.palette.grey[100]}}>
                  {row.rank}
                </StyledTableCell>
                <StyledTableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar 
                        alt={`${row.name} Logo`} 
                        sx={{ 
                            width: isMobile ? 16 : 20, 
                            height: isMobile ? 16 : 20, 
                            mr: isMobile ? 0.5 : 1, 
                            fontSize: isMobile ? '0.6rem' : '0.7rem',
                            color: theme.palette.getContrastText(row.logoColor || theme.palette.grey[700]), 
                            backgroundColor: row.logoColor || theme.palette.grey[700] 
                        }} 
                    >
                        {row.name.substring(0,1).toUpperCase()}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[100], fontSize: isMobile ? '0.7rem' : '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.name}
                    </Typography>
                  </Box>
                </StyledTableCell>
                <StyledTableCell align="center">{row.played}</StyledTableCell>
                <StyledTableCell align="center" hideOnMobile>{row.won}</StyledTableCell>
                <StyledTableCell align="center" hideOnMobile>{row.drawn}</StyledTableCell>
                <StyledTableCell align="center" hideOnMobile>{row.lost}</StyledTableCell>
                <StyledTableCell align="center" hideOnMobile>{`${row.goalsFor}:${row.goalsAgainst}`}</StyledTableCell>
                <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: row.goalDifference > 0 ? theme.palette.success.light : (row.goalDifference < 0 ? theme.palette.error.light : theme.palette.grey[300]) }}>
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                </StyledTableCell>
                <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.grey[100] }}>{row.points}</StyledTableCell>
                <StyledTableCell align="center" hideOnMobile>
                  <FormDisplay formArray={row.form} />
                </StyledTableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default LeagueTable;
