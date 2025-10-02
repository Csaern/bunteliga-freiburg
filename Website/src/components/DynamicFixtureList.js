// src/components/DynamicFixtureList.js
import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
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
import { db } from '../firebase';

const StyledTableCell = ({ children, sx, align, hideOnMobile, ...props }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile && hideOnMobile) {
    return null;
  }

  return (
    <TableCell
      align={align}
      sx={{
        color: theme.palette.grey[300],
        fontFamily: 'comfortaa',
        borderBottom: `1px solid ${theme.palette.grey[800]}`,
        py: isMobile ? 0.5 : 1,
        px: isMobile ? 0.3 : 1,
        fontSize: isMobile ? '0.6rem' : '0.85rem',
        verticalAlign: 'middle',
        ...sx,
      }}
      {...props}
    >
      {children}
    </TableCell>
  );
};

const DynamicFixtureList = ({ title, details = true, seasonId, showType = 'all' }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [fixtures, setFixtures] = useState([]);
  const [teams, setTeams] = useState({});
  const [loading, setLoading] = useState(true);

  const loadFixtures = useCallback(async () => {
    try {
      // Teams laden
      const teamsSnap = await getDocs(collection(db, 'teams'));
      const teamsMap = {};
      teamsSnap.docs.forEach(doc => {
        const teamData = doc.data();
        teamsMap[doc.id] = {
          name: teamData.name,
          logoColor: teamData.logoColor || '#666666'
        };
      });
      setTeams(teamsMap);

      // Ergebnisse laden (nur bestätigte)
      let resultsQuery = collection(db, 'results');
      if (seasonId) {
        resultsQuery = query(collection(db, 'results'), where('seasonId', '==', seasonId));
      }
      const resultsSnap = await getDocs(resultsQuery);
      const results = resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(result => result.status === 'confirmed')
        .sort((a, b) => {
          // Sortiere nach Datum und Uhrzeit (neueste zuerst)
          const dateA = new Date(`${a.date}T${a.time}`);
          const dateB = new Date(`${b.date}T${b.time}`);
          return dateB - dateA;
        });

      // Buchungen laden (für zukünftige Spiele)
      const bookingsSnap = await getDocs(collection(db, 'bookings'));
      const bookings = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(booking => booking.homeTeamId && booking.awayTeamId && !booking.isAvailable)
        .filter(booking => {
          // Prüfe, ob für dieses Spiel bereits ein Ergebnis existiert
          return !results.some(result => 
            result.homeTeamId === booking.homeTeamId &&
            result.awayTeamId === booking.awayTeamId &&
            result.date === booking.date &&
            result.time === booking.time
          );
        })
        .sort((a, b) => {
          // Sortiere nach Datum und Uhrzeit (älteste zuerst für zukünftige Spiele)
          const dateA = new Date(`${a.date}T${a.time}`);
          const dateB = new Date(`${b.date}T${b.time}`);
          return dateA - dateB;
        });

      // Kombiniere Ergebnisse und Buchungen basierend auf showType
      let allFixtures = [];
      
      if (showType === 'results' || showType === 'all') {
        allFixtures.push(...results.map(result => ({
          id: `result-${result.id}`,
          date: result.date,
          time: result.time,
          homeTeamId: result.homeTeamId,
          awayTeamId: result.awayTeamId,
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          isPast: true,
          location: 'Unbekannt'
        })));
      }
      
      if (showType === 'upcoming' || showType === 'all') {
        allFixtures.push(...bookings.map(booking => ({
          id: `booking-${booking.id}`,
          date: booking.date,
          time: booking.time,
          homeTeamId: booking.homeTeamId,
          awayTeamId: booking.awayTeamId,
          homeScore: null,
          awayScore: null,
          isPast: false,
          location: 'Unbekannt'
        })));
      }

      // Limitiere die Anzahl für Homepage
      if (showType === 'results') {
        // Zeige nur die letzten 5 Ergebnisse
        allFixtures = allFixtures.slice(0, 5);
      } else if (showType === 'upcoming') {
        // Zeige nur die nächsten 5 Spiele
        allFixtures = allFixtures.slice(0, 5);
      }

      setFixtures(allFixtures);
    } catch (error) {
      console.error('Fehler beim Laden der Spiele:', error);
    } finally {
      setLoading(false);
    }
  }, [seasonId, showType]);

  useEffect(() => {
    loadFixtures();
  }, [loadFixtures]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE');
  };

  const getWeekday = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { weekday: 'short' });
  };

  const rowHeight = isMobile ? 55 : 60;

  if (loading) {
    return (
      <Container maxWidth={details ? "xl" : "md"} sx={{ my: 4, px: isMobile ? 0.25 : 2 }}>
        <Typography
          variant={isMobile ? 'h6' : 'h4'}
          sx={{
            mb: isMobile ? 1.5 : 3,
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
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="grey.400">Lade Spiele...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth={details ? "xl" : "md"} sx={{ my: 4, px: isMobile ? 0.25 : 2 }}>
      <Typography
        variant={isMobile ? 'h6' : 'h4'}
        sx={{
          mb: isMobile ? 1.5 : 3,
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
      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: '#111',
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.grey[800]}`,
        }}
      >
        <Table aria-label="Spielplan Tabelle" size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'rgba(255,255,255,0.05)', height: rowHeight / 1.5 }}>
              {details && (
                <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.grey[100], width: isMobile ? '25%' : '15%' }}>
                  {isMobile ? 'Datum/Zeit' : 'Datum'}
                </StyledTableCell>
              )}
              {details && (
                <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.grey[100], width: '10%' }} hideOnMobile={true}>
                  Uhrzeit
                </StyledTableCell>
              )}
              
              <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.grey[100], width: details ? (isMobile ? '30%' : '25%') : '42.5%', textAlign: 'center' }}>Heim</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.grey[100], width: '15%' }}>Erg.</StyledTableCell>
              <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.grey[100], width: details ? (isMobile ? '30%' : '25%') : '42.5%', textAlign: 'center' }}>Auswärts</StyledTableCell>
              
              {details && (
                <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.grey[100], width: '15%' }} hideOnMobile={true}>
                  Ort
                </StyledTableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {fixtures.map((fixture) => (
              <TableRow
                key={fixture.id}
                sx={{
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                  opacity: fixture.isPast ? 0.7 : 1,
                  height: rowHeight,
                }}
              >
                {details && (
                  <StyledTableCell>
                    <Box sx={{display: 'flex', flexDirection:'column', alignItems: isMobile? 'center' : 'flex-start', textAlign: isMobile? 'center' : 'left'}}>
                      {!isMobile && (
                        <Typography variant="caption" sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[400], fontSize: '0.7rem', lineHeight:1.2 }}>
                          {getWeekday(fixture.date)}
                        </Typography>
                      )}
                      <Typography variant="body2" sx={{ fontFamily: 'comfortaa', fontSize: isMobile ? '0.6rem' : '0.8rem', lineHeight:1.2 }}>
                        {formatDate(fixture.date)}
                      </Typography>
                      {isMobile && (
                        <Typography variant="caption" sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[400], fontSize: '0.55rem', mt:0.25, lineHeight:1.2 }}>
                          {fixture.time} Uhr
                        </Typography>
                      )}
                    </Box>
                  </StyledTableCell>
                )}
                {details && (
                  <StyledTableCell align="center" hideOnMobile={true}>{fixture.time}</StyledTableCell>
                )}
                
                <StyledTableCell>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '100%' }}>
                    <Avatar 
                      alt={`${teams[fixture.homeTeamId]?.name || 'Unbekannt'} Logo`} 
                      sx={{ 
                        width: isMobile ? 22 : 20, 
                        height: isMobile ? 22 : 20, 
                        mb: 0.5, 
                        fontSize: isMobile ? '0.7rem' : '0.7rem', 
                        color: theme.palette.getContrastText(teams[fixture.homeTeamId]?.logoColor || theme.palette.grey[700]), 
                        backgroundColor: teams[fixture.homeTeamId]?.logoColor || theme.palette.grey[700] 
                      }}
                    >
                      {(teams[fixture.homeTeamId]?.name || 'U').substring(0,1).toUpperCase()}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[100], fontSize: isMobile ? '0.6rem' : '0.8rem', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.1, width:'100%' }}>
                      {teams[fixture.homeTeamId]?.name || 'Unbekannt'}
                    </Typography>
                  </Box>
                </StyledTableCell>
                <StyledTableCell align="center" sx={{ fontWeight: 'bold' }}>
                  {fixture.isPast ? (
                    <Chip 
                      label={`${fixture.homeScore} : ${fixture.awayScore}`} 
                      size="small" 
                      sx={{ 
                        fontFamily: 'comfortaa', 
                        fontWeight: 'bold', 
                        backgroundColor: theme.palette.grey[700], 
                        color: theme.palette.grey[100], 
                        fontSize: isMobile ? '0.6rem' : '0.8rem', 
                        height: isMobile ? '16px' : '22px', 
                        lineHeight: isMobile ? '16px' : '22px', 
                        px: isMobile ? 0.5 : 1 
                      }} 
                    />
                  ) : (
                    <Typography variant="caption" sx={{color: theme.palette.grey[500], fontSize: isMobile ? '0.65rem' : 'inherit'}}>vs.</Typography>
                  )}
                </StyledTableCell>
                <StyledTableCell>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '100%' }}>
                    <Avatar 
                      alt={`${teams[fixture.awayTeamId]?.name || 'Unbekannt'} Logo`} 
                      sx={{ 
                        width: isMobile ? 22 : 20, 
                        height: isMobile ? 22 : 20, 
                        mb: 0.5, 
                        fontSize: isMobile ? '0.7rem' : '0.7rem', 
                        color: theme.palette.getContrastText(teams[fixture.awayTeamId]?.logoColor || theme.palette.grey[700]), 
                        backgroundColor: teams[fixture.awayTeamId]?.logoColor || theme.palette.grey[700] 
                      }}
                    >
                      {(teams[fixture.awayTeamId]?.name || 'U').substring(0,1).toUpperCase()}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[100], fontSize: isMobile ? '0.6rem' : '0.8rem', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.1, width:'100%' }}>
                      {teams[fixture.awayTeamId]?.name || 'Unbekannt'}
                    </Typography>
                  </Box>
                </StyledTableCell>
                
                {details && (
                  <StyledTableCell hideOnMobile={true}>{fixture.location}</StyledTableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default DynamicFixtureList;
