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
  Container,
  useMediaQuery,
  Chip,
} from '@mui/material';

// Hilfsfunktion zur Erstellung der Daten
const createChampionData = (id, name, logoColor, years) => {
  return {
    id,
    name,
    logoColor,
    years: years.sort((a, b) => b - a),
    championships: years.length,
  };
};

// Beispieldaten für die Ehrentafel
const hallOfFameData = [
  createChampionData(1, 'Dynamo Tresen', '#1976D2', [2017, 2015, 2014, 2012]),
  createChampionData(2, 'Rakete Freiburg', '#D32F2F', [2024, 2022, 2020]),
  createChampionData(3, 'Lokomotive Littenweiler', '#5D4037', [2023, 2019]),
  createChampionData(4, 'Wurschtwecklebombers', '#00796B', [2016, 2013]),
  createChampionData(5, 'Die 2. Wahl', '#757575', [2021]),
  createChampionData(6, 'Red Sea', '#C2185B', [2018]),
];

// Eine wiederverwendbare, gestylte Tabellenzelle
const StyledTableCell = ({ children, sx, align, ...props }) => {
  const theme = useTheme();
  return (
    <TableCell
      align={align}
      sx={{
        color: theme.palette.text.secondary, // Was grey[300]
        fontFamily: 'comfortaa',
        borderBottom: `1px solid ${theme.palette.divider}`, // Was grey[800]
        py: 1.5,
        verticalAlign: 'middle', // Stellt sicher, dass alles vertikal zentriert ist
        ...sx,
      }}
      {...props}
    >
      {children}
    </TableCell>
  );
};

const HallOfFame = ({ title }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Sortiere die Daten nach Anzahl der Meisterschaften (absteigend)
  const sortedChampions = React.useMemo(() => {
    return [...hallOfFameData].sort((a, b) => b.championships - a.championships);
  }, []);

  return (
    <Container maxWidth="lg" sx={{ my: 4, px: isMobile ? 1 : 2 }}>
      <Typography
        variant={isMobile ? 'h5' : 'h4'}
        sx={{
          mb: 3,
          mt: 2,
          color: theme.palette.primary.main, // Was #00A99D (Primary Dark default)
          fontWeight: 700,
          fontFamily: 'comfortaa',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {title}
      </Typography>
      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: theme.palette.background.paper, // Was #111
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.divider}`, // Was grey[800]
        }}
      >
        <Table aria-label="Ehrentafel der Meister">
          <TableHead>
            <TableRow sx={{ backgroundColor: theme.palette.action.hover }}> {/* Was rgba(255,255,255,0.05) */}
              <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.text.primary, width: isMobile ? '15%' : '10%', fontSize: isMobile ? '0.7rem' : 'inherit' }}>Rang</StyledTableCell>
              <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.text.primary, width: isMobile ? '60%' : '30%', fontSize: isMobile ? '0.7rem' : 'inherit' }}>Team</StyledTableCell>
              {!isMobile && (
                <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.text.primary, width: '45%' }}>Meisterjahre</StyledTableCell>
              )}
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.primary, width: isMobile ? '25%' : '15%', fontSize: isMobile ? '0.7rem' : 'inherit' }}>Titel</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedChampions.map((team, index) => (
              <TableRow
                key={team.id}
                sx={{ '&:hover': { backgroundColor: theme.palette.action.hover } }}
              >
                <StyledTableCell component="th" scope="row" sx={{ fontWeight: 'bold', fontSize: isMobile ? '0.8rem' : '1.1rem', color: theme.palette.text.primary }}>
                  {index + 1}
                </StyledTableCell>
                <StyledTableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar
                      alt={`${team.name} Logo`}
                      sx={{
                        width: isMobile ? 28 : 40,
                        height: isMobile ? 28 : 40,
                        mr: isMobile ? 1 : 2,
                        fontSize: isMobile ? '0.7rem' : '0.7rem',
                        color: theme.palette.getContrastText(team.logoColor || theme.palette.grey[700]),
                        backgroundColor: team.logoColor || theme.palette.grey[700],
                      }}
                    >
                      {team.name.substring(0, 1).toUpperCase()}
                    </Avatar>
                    <Typography noWrap sx={{ fontFamily: 'comfortaa', color: theme.palette.text.primary, fontSize: isMobile ? '0.6rem' : '1rem', fontWeight: 600 }}>
                      {team.name}
                    </Typography>
                  </Box>
                </StyledTableCell>

                {/* Meisterjahre werden nur auf dem Desktop angezeigt */}
                {!isMobile && (
                  <StyledTableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {team.years.map((year) => (
                        <Chip key={year} label={year} sx={{ fontFamily: 'comfortaa', fontWeight: 'bold', backgroundColor: theme.palette.action.selected, color: theme.palette.text.primary }} />
                      ))}
                    </Box>
                  </StyledTableCell>
                )}
                <StyledTableCell align="center">
                  <Typography variant="h6" sx={{ fontFamily: 'comfortaa', color: theme.palette.text.primary, fontWeight: 'bold', fontSize: isMobile ? '0.8rem' : '1.2rem' }}>
                    {team.championships}
                  </Typography>
                </StyledTableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default HallOfFame;
