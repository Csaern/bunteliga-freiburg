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
} from '@mui/material';
// Icon importieren
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';

// Hilfsfunktion zur Erstellung der Saisondaten, jetzt mit 1., 2. und 3. Platz
const createSeasonData = (id, year, first, second, third) => {
  return { id, year, first, second, third };
};

// Beispieldaten: Die Top 3 pro Saison
const seasonData = [
  createSeasonData(1, 2024, 
    { name: 'Rakete Freiburg', logoColor: '#D32F2F' },
    { name: 'Die 2. Wahl', logoColor: '#757575' },
    { name: 'Lokomotive Littenweiler', logoColor: '#5D4037' }
  ),
  createSeasonData(2, 2023, 
    { name: 'Lokomotive Littenweiler', logoColor: '#5D4037' },
    { name: 'Rakete Freiburg', logoColor: '#D32F2F' },
    { name: 'Dynamo Tresen', logoColor: '#1976D2' }
  ),
  createSeasonData(3, 2022, 
    { name: 'Rakete Freiburg', logoColor: '#D32F2F' },
    { name: 'Red Sea', logoColor: '#C2185B' },
    { name: 'Die 2. Wahl', logoColor: '#757575' }
  ),
  createSeasonData(4, 2021, 
    { name: 'Die 2. Wahl', logoColor: '#757575' },
    { name: 'Wurschtwecklebombers', logoColor: '#00796B' },
    { name: 'Rakete Freiburg', logoColor: '#D32F2F' }
  ),
];

// Wiederverwendbare Komponente zur Anzeige eines Teams
const TeamDisplay = ({ name, logoColor, isMobile }) => {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Avatar
        alt={`${name} Logo`}
        sx={{
          width: isMobile ? 24 : 32,
          height: isMobile ? 24 : 32,
          mr: isMobile ? 1.5 : 2,
          fontSize: isMobile ? '0.7rem' : '0.8rem',
          color: theme.palette.getContrastText(logoColor || theme.palette.grey[700]),
          backgroundColor: logoColor || theme.palette.grey[700],
        }}
      >
        {name.substring(0, 1).toUpperCase()}
      </Avatar>
      <Typography noWrap sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[200], fontSize: isMobile ? '0.8rem' : '1rem' }}>
        {name}
      </Typography>
    </Box>
  );
};

const SeasonChampionsList = ({ title = "Ehrentafel" }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Container maxWidth="lg" sx={{ my: 4, px: isMobile ? 1 : 2 }}>
      <Typography
        variant={isMobile ? 'h5' : 'h4'}
        sx={{
          mb: 3,
          mt: 2,
          color: '#00A99D',
          fontWeight: 700,
          fontFamily: 'comfortaa',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {title}
      </Typography>
      
      <Paper sx={{ backgroundColor: '#111', borderRadius: theme.shape.borderRadius, border: `1px solid ${theme.palette.grey[800]}` }}>
        <TableContainer>
          <Table aria-label="Ehrentafel">
            {/* TableHead wird nur auf Desktop angezeigt */}
            {!isMobile && (
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  <TableCell sx={{ width: '15%', borderBottomColor: 'grey.800', color: theme.palette.grey[100], fontFamily: 'comfortaa', fontWeight: 'bold' }}>Saison</TableCell>
                  <TableCell align="center" sx={{ width: '28.3%', borderBottomColor: 'grey.800' }}><MilitaryTechIcon sx={{ color: '#FFD700' }} /></TableCell>
                  <TableCell align="center" sx={{ width: '28.3%', borderBottomColor: 'grey.800' }}><MilitaryTechIcon sx={{ color: '#C0C0C0' }} /></TableCell>
                  <TableCell align="center" sx={{ width: '28.3%', borderBottomColor: 'grey.800' }}><MilitaryTechIcon sx={{ color: '#CD7F32' }} /></TableCell>
                </TableRow>
              </TableHead>
            )}
            <TableBody>
              {seasonData.map((season) => (
                <TableRow key={season.id} sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } }}>
                  {isMobile ? (
                    // Mobile Ansicht: Eine Zelle, die die gesamte Zeile einnimmt
                    <TableCell sx={{ p: 2, borderBottomColor: 'grey.800' }}>
                      <Typography sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[100], fontWeight: 'bold', fontSize: '0.8rem', mb: 2, textAlign: "center" }}>
                        Saison {season.year}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                        <MilitaryTechIcon sx={{ color: '#FFD700', mr: 1.5, flexShrink: 0 }} />
                        <TeamDisplay name={season.first.name} logoColor={season.first.logoColor} isMobile={isMobile} />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                        <MilitaryTechIcon sx={{ color: '#C0C0C0', mr: 1.5, flexShrink: 0 }} />
                        <TeamDisplay name={season.second.name} logoColor={season.second.logoColor} isMobile={isMobile} />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <MilitaryTechIcon sx={{ color: '#CD7F32', mr: 1.5, flexShrink: 0 }} />
                        <TeamDisplay name={season.third.name} logoColor={season.third.logoColor} isMobile={isMobile} />
                      </Box>
                    </TableCell>
                  ) : (
                    // Desktop Ansicht: Vier separate Zellen
                    <>
                      <TableCell sx={{ borderBottomColor: 'grey.800', py: 2 }}>
                        <Typography sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[100], fontWeight: 'bold', fontSize: '1.1rem' }}>
                          {season.year}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderBottomColor: 'grey.800', py: 2 }}><TeamDisplay name={season.first.name} logoColor={season.first.logoColor} /></TableCell>
                      <TableCell sx={{ borderBottomColor: 'grey.800', py: 2 }}><TeamDisplay name={season.second.name} logoColor={season.second.logoColor} /></TableCell>
                      <TableCell sx={{ borderBottomColor: 'grey.800', py: 2 }}><TeamDisplay name={season.third.name} logoColor={season.third.logoColor} /></TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};

export default SeasonChampionsList;
