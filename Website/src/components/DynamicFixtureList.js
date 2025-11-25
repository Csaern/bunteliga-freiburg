// src/components/DynamicFixtureList.js
import React, { useState, useEffect, useCallback } from 'react';
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
  Button,
  TextField,
  Snackbar,
  Alert,
} from '@mui/material';
import * as teamApi from '../services/teamApiService';
import * as bookingApi from '../services/bookingApiService';
import * as resultApi from '../services/resultApiService';
import { ReusableModal } from './Helpers/modalUtils';
import { useAuth } from '../context/AuthProvider';
import * as pitchApi from '../services/pitchApiService';
import { API_BASE_URL } from '../services/apiClient';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
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
        color: theme.palette.text.primary,
        fontFamily: 'Comfortaa',
        borderBottom: `1px solid ${theme.palette.divider}`,
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

const DynamicFixtureList = ({ title, details = true, seasonId, showType = 'all', userTeamId }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { teamId } = useAuth();
  const [fixtures, setFixtures] = useState([]);
  const [teams, setTeams] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [pitchName, setPitchName] = useState('');
  const [pitchesMap, setPitchesMap] = useState({});
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({ homeScore: '', awayScore: '' });
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Robust date normalization for Firestore Timestamp, {_seconds, _nanoseconds}, or ISO string
  // Firestore Timestamps werden als {_seconds, _nanoseconds} serialisiert, wenn sie über JSON gesendet werden
  const normalizeToDate = (maybeDate) => {
    if (!maybeDate) return null;

    // Fall 1: Firestore Timestamp Objekt (direkt aus Firestore, hat toDate() Methode)
    if (typeof maybeDate.toDate === 'function') {
      return maybeDate.toDate();
    }

    // Fall 2: Serialisiertes Firestore Timestamp Format {_seconds, _nanoseconds}
    // Dies passiert, wenn Firestore Timestamps über JSON/HTTP gesendet werden
    if (typeof maybeDate === 'object' && typeof maybeDate._seconds === 'number') {
      // Konvertiere Sekunden zu Millisekunden
      const milliseconds = maybeDate._seconds * 1000;
      // Wenn _nanoseconds vorhanden sind, addiere sie (nanoseconds / 1_000_000 = milliseconds)
      if (typeof maybeDate._nanoseconds === 'number') {
        return new Date(milliseconds + (maybeDate._nanoseconds / 1000000));
      }
      return new Date(milliseconds);
    }

    // Fall 3: JavaScript Date Objekt oder ISO String
    const d = new Date(maybeDate);
    return isNaN(d.getTime()) ? null : d;
  };

  const loadFixtures = useCallback(async () => {
    try {
      // Teams laden
      // Wenn Ergebnisse angezeigt werden, lade alle Teams aus Firestore (für vollständige Logo-Daten)
      // Ansonsten nur Teams der aktiven Saison
      let teamsArr = [];
      if (showType === 'results' || showType === 'all') {
        // Lade alle Teams aus Firestore für vollständige Logo-Daten
        try {
          const teamsSnap = await getDocs(collection(db, 'teams'));
          teamsArr = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (firestoreError) {
          console.error('Fehler beim Laden aller Teams aus Firestore:', firestoreError);
          // Fallback: Versuche API
          try {
            teamsArr = await teamApi.getTeamsForActiveSeason();
          } catch (authError) {
            try {
              teamsArr = await teamApi.getTeamsForActiveSeasonPublic();
            } catch (publicError) {
              console.error('Teams konnten nicht geladen werden:', authError, publicError);
              teamsArr = [];
            }
          }
        }
      } else {
        // Für zukünftige Spiele: Nur Teams der aktiven Saison
        try {
          teamsArr = await teamApi.getTeamsForActiveSeason();
        } catch (authError) {
          try {
            teamsArr = await teamApi.getTeamsForActiveSeasonPublic();
          } catch (publicError) {
            console.error('Teams konnten nicht geladen werden:', authError, publicError);
            teamsArr = [];
          }
        }
      }
      const teamsMap = teamsArr.reduce((acc, t) => {
        acc[t.id] = {
          name: t.name,
          logoColor: t.logoColor || '#666666',
          logoUrl: t.logoUrl,
          description: t.description,
          foundedYear: t.foundedYear,
        };
        return acc;
      }, {});
      setTeams(teamsMap);

      // Ergebnisse (nur bestätigte) aus Backend
      let resultsRaw = [];
      if (seasonId) {
        try {
          resultsRaw = await resultApi.getResultsForSeason(seasonId);
        } catch (authError) {
          try {
            resultsRaw = await resultApi.getResultsForSeasonPublic(seasonId);
          } catch (publicError) {
            console.error('Ergebnisse konnten nicht geladen werden:', authError, publicError);
            resultsRaw = [];
          }
        }
      }
      const results = resultsRaw
        .filter(result => result.status === 'confirmed')
        .filter(result => {
          if (userTeamId) {
            return result.homeTeamId === userTeamId || result.awayTeamId === userTeamId;
          }
          return true;
        })
        .sort((a, b) => {
          const dateA = a.reportedAt ? new Date(a.reportedAt) : new Date(a.date);
          const dateB = b.reportedAt ? new Date(b.reportedAt) : new Date(b.date);
          return dateB - dateA;
        });

      // Zukünftige Spiele
      let bookings = [];
      if (showType === 'upcoming' || showType === 'all') {
        if (userTeamId && seasonId) {
          // Use explicit team endpoint; if call fails or is empty, fallback to local filtering
          try {
            bookings = await bookingApi.getUpcomingBookingsForTeam(seasonId, userTeamId);
          } catch (e) {
            bookings = [];
          }
          bookings = Array.isArray(bookings) ? bookings.filter(b => b.status === 'confirmed') : [];

          if (!Array.isArray(bookings) || bookings.length === 0) {
            let allSeason = [];
            try {
              allSeason = await bookingApi.getBookingsForSeason(seasonId);
            } catch (authError) {
              try {
                allSeason = await bookingApi.getPublicBookingsForSeason(seasonId);
              } catch (publicError) {
                console.error('Buchungen konnten nicht geladen werden:', authError, publicError);
                allSeason = [];
              }
            }
            const now = new Date();
            bookings = allSeason.filter(b => {
              const d = normalizeToDate(b.date);
              const involvesTeam = b.homeTeamId === userTeamId || b.awayTeamId === userTeamId;
              const isFuture = d && d >= now;
              const statusOk = b.status === 'confirmed';
              return involvesTeam && isFuture && statusOk;
            });
            bookings.sort((a, b) => {
              const da = normalizeToDate(a.date) || new Date(0);
              const db = normalizeToDate(b.date) || new Date(0);
              return da - db;
            });
          }
        } else if (seasonId) {
          // Fallback: alle Saison-Buchungen und zukünftige, belegte filtern
          let allSeason = [];
          try {
            allSeason = await bookingApi.getBookingsForSeason(seasonId);
          } catch (authError) {
            try {
              allSeason = await bookingApi.getPublicBookingsForSeason(seasonId);
            } catch (publicError) {
              console.error('Buchungen konnten nicht geladen werden:', authError, publicError);
              allSeason = [];
            }
          }
          const now = new Date();
          bookings = allSeason.filter(b => {
            const d = normalizeToDate(b.date);
            return b.homeTeamId && b.awayTeamId && d && d >= now && b.status === 'confirmed';
          });
          bookings.sort((a, b) => {
            const da = normalizeToDate(a.date) || new Date(0);
            const db = normalizeToDate(b.date) || new Date(0);
            return da - db;
          });
        }
      }

      // Kombiniere Ergebnisse und Buchungen basierend auf showType
      let allFixtures = [];

      if (showType === 'results' || showType === 'all') {
        // Prüfe, ob Teams aus Ergebnissen fehlen und lade sie nach
        const missingTeamIds = new Set();
        results.forEach(result => {
          if (result.homeTeamId && !teamsMap[result.homeTeamId]) {
            missingTeamIds.add(result.homeTeamId);
          }
          if (result.awayTeamId && !teamsMap[result.awayTeamId]) {
            missingTeamIds.add(result.awayTeamId);
          }
        });

        // Lade fehlende Teams aus Firestore
        if (missingTeamIds.size > 0) {
          try {
            const missingIdsArray = Array.from(missingTeamIds);
            const batchPromises = missingIdsArray.map(async (teamId) => {
              try {
                const teamDocRef = doc(db, 'teams', teamId);
                const teamDoc = await getDoc(teamDocRef);
                if (teamDoc.exists()) {
                  const teamData = { id: teamDoc.id, ...teamDoc.data() };
                  teamsMap[teamId] = {
                    name: teamData.name || 'Unbekannt',
                    logoColor: teamData.logoColor || '#666666',
                    logoUrl: teamData.logoUrl,
                    description: teamData.description,
                    foundedYear: teamData.foundedYear,
                  };
                } else {
                  // Fallback: Verwende Teamname aus Ergebnis
                  const result = results.find(r => r.homeTeamId === teamId || r.awayTeamId === teamId);
                  teamsMap[teamId] = {
                    name: (result?.homeTeamId === teamId ? result.homeTeamName : result?.awayTeamName) || 'Unbekannt',
                    logoColor: '#666666',
                    logoUrl: null,
                  };
                }
              } catch (error) {
                console.error(`Fehler beim Laden von Team ${teamId}:`, error);
                // Fallback: Verwende Teamname aus Ergebnis
                const result = results.find(r => r.homeTeamId === teamId || r.awayTeamId === teamId);
                teamsMap[teamId] = {
                  name: (result?.homeTeamId === teamId ? result.homeTeamName : result?.awayTeamName) || 'Unbekannt',
                  logoColor: '#666666',
                  logoUrl: null,
                };
              }
            });
            await Promise.all(batchPromises);
          } catch (error) {
            console.error('Fehler beim Nachladen fehlender Teams:', error);
            // Fallback: Verwende Teamnamen aus Ergebnissen
            results.forEach(result => {
              if (result.homeTeamId && result.homeTeamName && !teamsMap[result.homeTeamId]) {
                teamsMap[result.homeTeamId] = {
                  name: result.homeTeamName,
                  logoColor: '#666666',
                  logoUrl: null,
                };
              }
              if (result.awayTeamId && result.awayTeamName && !teamsMap[result.awayTeamId]) {
                teamsMap[result.awayTeamId] = {
                  name: result.awayTeamName,
                  logoColor: '#666666',
                  logoUrl: null,
                };
              }
            });
          }
        }
        // Aktualisiere den State mit den erweiterten Teamdaten
        setTeams(teamsMap);

        // Lade Buchungen für Ergebnisse, die eine bookingId haben, um das Spieldatum zu bekommen
        const bookingIds = results.filter(r => r.bookingId).map(r => r.bookingId);
        const bookingsMap = {};
        if (bookingIds.length > 0 && seasonId) {
          try {
            let allBookings = [];
            try {
              allBookings = await bookingApi.getBookingsForSeason(seasonId);
            } catch (authError) {
              try {
                allBookings = await bookingApi.getPublicBookingsForSeason(seasonId);
              } catch (publicError) {
                console.error('Buchungen konnten nicht geladen werden:', publicError);
              }
            }
            allBookings.forEach(booking => {
              if (bookingIds.includes(booking.id)) {
                bookingsMap[booking.id] = booking;
              }
            });
          } catch (error) {
            console.error('Fehler beim Laden der Buchungen für Ergebnisse:', error);
          }
        }

        allFixtures.push(...results.map(result => {
          // Versuche das Datum aus der zugehörigen Buchung zu bekommen, sonst verwende reportedAt
          let resultDate = null;
          let resultTime = '';

          if (result.bookingId && bookingsMap[result.bookingId]) {
            const booking = bookingsMap[result.bookingId];
            const bookingDate = normalizeToDate(booking.date);
            if (bookingDate) {
              resultDate = bookingDate.toISOString().split('T')[0];
              resultTime = bookingDate.toTimeString().slice(0, 5);
            }
          }

          // Fallback: Verwende reportedAt
          if (!resultDate) {
            const reportedDate = normalizeToDate(result.reportedAt);
            if (reportedDate) {
              resultDate = reportedDate.toISOString().split('T')[0];
              resultTime = reportedDate.toTimeString().slice(0, 5);
            }
          }

          return {
            id: `result-${result.id}`,
            date: resultDate || '',
            time: resultTime,
            homeTeamId: result.homeTeamId,
            awayTeamId: result.awayTeamId,
            homeScore: result.homeScore,
            awayScore: result.awayScore,
            isPast: true,
            location: 'Unbekannt',
            homeTeamName: result.homeTeamName,
            awayTeamName: result.awayTeamName,
          };
        }));
      }

      if (showType === 'upcoming' || showType === 'all') {
        // Lade Pitch-Namen für bevorstehende Spiele
        const pitchIds = [...new Set(bookings.map(b => b.pitchId).filter(Boolean))];
        const pitchesData = {};
        if (pitchIds.length > 0) {
          try {
            const pitches = await pitchApi.getPublicPitches();
            pitches.forEach(pitch => {
              if (pitchIds.includes(pitch.id)) {
                pitchesData[pitch.id] = pitch.name;
              }
            });
            setPitchesMap(pitchesData);
          } catch (error) {
            console.error('Fehler beim Laden der Plätze:', error);
          }
        }

        allFixtures.push(...bookings.map(booking => ({
          id: `booking-${booking.id}`,
          bookingId: booking.id,
          date: (() => { const d = normalizeToDate(booking.date); return d ? d.toISOString().split('T')[0] : ''; })(),
          time: (() => { const d = normalizeToDate(booking.date); return d ? d.toTimeString().slice(0, 5) : ''; })(),
          homeTeamId: booking.homeTeamId,
          awayTeamId: booking.awayTeamId,
          homeScore: null,
          awayScore: null,
          isPast: false,
          pitchId: booking.pitchId,
          location: pitchesData[booking.pitchId] || 'Unbekannt',
        })));
      }

      // Limitiere die Anzahl nur für allgemeine Übersichten (ohne spezifisches Team)
      if (!userTeamId) {
        if (showType === 'results') {
          // Zeige nur die letzten 5 Ergebnisse
          allFixtures = allFixtures.slice(0, 5);
        } else if (showType === 'upcoming') {
          // Zeige nur die nächsten 5 Spiele
          allFixtures = allFixtures.slice(0, 5);
        }
      }

      setFixtures(allFixtures);
    } catch (error) {
      console.error('Fehler beim Laden der Spiele:', error);
    } finally {
      setLoading(false);
    }
  }, [seasonId, showType, userTeamId]);

  useEffect(() => {
    loadFixtures();
  }, [loadFixtures]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Datum unbekannt';
    const date = normalizeToDate(dateString);
    if (!date || isNaN(date.getTime())) {
      // Versuche es als ISO-String zu parsen
      const parsed = new Date(dateString);
      if (isNaN(parsed.getTime())) {
        return 'Datum unbekannt';
      }
      return parsed.toLocaleDateString('de-DE');
    }
    return date.toLocaleDateString('de-DE');
  };

  const getWeekday = (dateString) => {
    if (!dateString) return '';
    const date = normalizeToDate(dateString);
    if (!date || isNaN(date.getTime())) {
      // Versuche es als ISO-String zu parsen
      const parsed = new Date(dateString);
      if (isNaN(parsed.getTime())) {
        return '';
      }
      return parsed.toLocaleDateString('de-DE', { weekday: 'short' });
    }
    return date.toLocaleDateString('de-DE', { weekday: 'short' });
  };

  const handleFixtureClick = async (fixture) => {
    setSelectedFixture(fixture);
    if (fixture.pitchId) {
      try {
        const pitches = await pitchApi.getPublicPitches();
        const pitch = pitches.find(p => p.id === fixture.pitchId);
        setPitchName(pitch ? pitch.name : 'Unbekannt');
      } catch (error) {
        setPitchName('Unbekannt');
      }
    }
  };

  const handleCancelBooking = async () => {
    if (!teamId || !selectedFixture?.bookingId) {
      setNotification({ open: true, message: "Keinem Team zugeordnet oder keine Buchung gefunden.", severity: 'error' });
      return;
    }

    const confirmed = window.confirm('Möchten Sie diese Buchung wirklich absagen?');
    if (!confirmed) return;

    try {
      await bookingApi.cancelBooking(selectedFixture.bookingId);
      setNotification({ open: true, message: "Buchung erfolgreich abgesagt.", severity: 'success' });
      setSelectedFixture(null);
      loadFixtures();
    } catch (error) {
      console.error("Fehler beim Absagen der Buchung:", error);
      setNotification({ open: true, message: error.message || "Fehler beim Absagen der Buchung.", severity: 'error' });
    }
  };

  const handleReportResult = () => {
    if (!selectedFixture?.bookingId) return;
    setShowReportModal(true);
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFixture?.bookingId || !teamId) {
      setNotification({ open: true, message: "Keinem Team zugeordnet oder keine Buchung gefunden.", severity: 'error' });
      return;
    }
    if (reportForm.homeScore === '' || reportForm.awayScore === '') {
      setNotification({ open: true, message: "Bitte gib beide Ergebnisse ein.", severity: 'error' });
      return;
    }

    setReportSubmitting(true);
    try {
      await resultApi.reportResult(selectedFixture.bookingId, {
        homeScore: parseInt(reportForm.homeScore, 10),
        awayScore: parseInt(reportForm.awayScore, 10),
        reportedByTeamId: teamId,
      });
      setNotification({ open: true, message: "Ergebnis erfolgreich gemeldet!", severity: 'success' });
      setShowReportModal(false);
      setSelectedFixture(null);
      setReportForm({ homeScore: '', awayScore: '' });
      loadFixtures();
    } catch (error) {
      console.error('Fehler beim Melden des Ergebnisses:', error);
      setNotification({ open: true, message: error.message || 'Fehler beim Melden des Ergebnisses.', severity: 'error' });
    } finally {
      setReportSubmitting(false);
    }
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
            color: theme.palette.primary.main,
            fontWeight: 700,
            fontFamily: 'Comfortaa',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {title}
        </Typography>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">Lade Spiele...</Typography>
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
          color: theme.palette.primary.main,
          fontWeight: 700,
          fontFamily: 'Comfortaa',
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
          backgroundColor: theme.palette.background.paper,
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Table aria-label="Spielplan Tabelle" size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: theme.palette.action.hover, height: rowHeight / 1.5 }}>
              {details && (
                <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.text.primary, width: isMobile ? '25%' : '15%' }}>
                  {isMobile ? 'Datum/Zeit' : 'Datum'}
                </StyledTableCell>
              )}
              {details && (
                <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.primary, width: '10%' }} hideOnMobile={true}>
                  Uhrzeit
                </StyledTableCell>
              )}

              <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.text.primary, width: details ? (isMobile ? '30%' : '25%') : '42.5%', textAlign: 'center' }}>Heim</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.primary, width: '15%' }}>Erg.</StyledTableCell>
              <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.text.primary, width: details ? (isMobile ? '30%' : '25%') : '42.5%', textAlign: 'center' }}>Auswärts</StyledTableCell>

              {details && (
                <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.text.primary, width: '15%' }} hideOnMobile={showType !== 'upcoming'}>
                  Ort
                </StyledTableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {fixtures.map((fixture) => {
              const isUpcoming = !fixture.isPast && fixture.bookingId && (userTeamId || teamId);
              const isMyGame = isUpcoming && (fixture.homeTeamId === (userTeamId || teamId) || fixture.awayTeamId === (userTeamId || teamId));

              return (
                <TableRow
                  key={fixture.id}
                  onClick={isMyGame ? () => handleFixtureClick(fixture) : undefined}
                  sx={{
                    '&:hover': { backgroundColor: theme.palette.action.hover },
                    opacity: fixture.isPast ? 0.7 : 1,
                    height: rowHeight,
                    cursor: isMyGame ? 'pointer' : 'default',
                  }}
                >
                  {details && (
                    <StyledTableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'flex-start', textAlign: isMobile ? 'center' : 'left' }}>
                        {!isMobile && (
                          <Typography variant="caption" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.secondary, fontSize: '0.7rem', lineHeight: 1.2 }}>
                            {getWeekday(fixture.date)}
                          </Typography>
                        )}
                        <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', fontSize: isMobile ? '0.6rem' : '0.8rem', lineHeight: 1.2 }}>
                          {formatDate(fixture.date)}
                        </Typography>
                        {isMobile && (
                          <Typography variant="caption" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.secondary, fontSize: '0.55rem', mt: 0.25, lineHeight: 1.2 }}>
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
                        alt={`${teams[fixture.homeTeamId]?.name || fixture.homeTeamName || 'Unbekannt'} Logo`}
                        src={teams[fixture.homeTeamId]?.logoUrl ? (teams[fixture.homeTeamId].logoUrl.startsWith('http') ? teams[fixture.homeTeamId].logoUrl : `${API_BASE_URL}${teams[fixture.homeTeamId].logoUrl}`) : null}
                        sx={{
                          width: isMobile ? 22 : 20,
                          height: isMobile ? 22 : 20,
                          mb: 0.5,
                          fontSize: isMobile ? '0.7rem' : '0.7rem',
                          color: theme.palette.getContrastText(teams[fixture.homeTeamId]?.logoColor || theme.palette.grey[700]),
                          backgroundColor: teams[fixture.homeTeamId]?.logoColor || theme.palette.grey[700],
                          border: teams[fixture.homeTeamId]?.logoUrl ? `1px solid ${teams[fixture.homeTeamId]?.logoColor || theme.palette.grey[700]}` : 'none'
                        }}
                      >
                        {!teams[fixture.homeTeamId]?.logoUrl && (teams[fixture.homeTeamId]?.name || fixture.homeTeamName || 'U').substring(0, 1).toUpperCase()}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.primary, fontSize: isMobile ? '0.6rem' : '0.8rem', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.1, width: '100%' }}>
                        {teams[fixture.homeTeamId]?.name || fixture.homeTeamName || 'Unbekannt'}
                      </Typography>
                    </Box>
                  </StyledTableCell>
                  <StyledTableCell align="center" sx={{ fontWeight: 'bold' }}>
                    {fixture.isPast ? (
                      <Chip
                        label={`${fixture.homeScore} : ${fixture.awayScore}`}
                        size="small"
                        sx={{
                          fontFamily: 'Comfortaa',
                          fontWeight: 'bold',
                          backgroundColor: theme.palette.action.selected,
                          color: theme.palette.text.primary,
                          fontSize: isMobile ? '0.6rem' : '0.8rem',
                          height: isMobile ? '16px' : '22px',
                          lineHeight: isMobile ? '16px' : '22px',
                          px: isMobile ? 0.5 : 1
                        }}
                      />
                    ) : (
                      <Typography variant="caption" sx={{ color: theme.palette.text.disabled, fontSize: isMobile ? '0.65rem' : 'inherit' }}>vs.</Typography>
                    )}
                  </StyledTableCell>
                  <StyledTableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '100%' }}>
                      <Avatar
                        alt={`${teams[fixture.awayTeamId]?.name || fixture.awayTeamName || 'Unbekannt'} Logo`}
                        src={teams[fixture.awayTeamId]?.logoUrl ? (teams[fixture.awayTeamId].logoUrl.startsWith('http') ? teams[fixture.awayTeamId].logoUrl : `${API_BASE_URL}${teams[fixture.awayTeamId].logoUrl}`) : null}
                        sx={{
                          width: isMobile ? 22 : 20,
                          height: isMobile ? 22 : 20,
                          mb: 0.5,
                          fontSize: isMobile ? '0.7rem' : '0.7rem',
                          color: theme.palette.getContrastText(teams[fixture.awayTeamId]?.logoColor || theme.palette.grey[700]),
                          backgroundColor: teams[fixture.awayTeamId]?.logoColor || theme.palette.grey[700],
                          border: teams[fixture.awayTeamId]?.logoUrl ? `1px solid ${teams[fixture.awayTeamId]?.logoColor || theme.palette.grey[700]}` : 'none'
                        }}
                      >
                        {!teams[fixture.awayTeamId]?.logoUrl && (teams[fixture.awayTeamId]?.name || fixture.awayTeamName || 'U').substring(0, 1).toUpperCase()}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.primary, fontSize: isMobile ? '0.6rem' : '0.8rem', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.1, width: '100%' }}>
                        {teams[fixture.awayTeamId]?.name || fixture.awayTeamName || 'Unbekannt'}
                      </Typography>
                    </Box>
                  </StyledTableCell>

                  {details && (
                    <StyledTableCell hideOnMobile={showType !== 'upcoming'}>
                      {fixture.location || (fixture.pitchId && pitchesMap[fixture.pitchId]) || 'Unbekannt'}
                    </StyledTableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal für Spiel-Details */}
      {selectedFixture && !showReportModal && (
        <ReusableModal
          open={!!selectedFixture}
          onClose={() => setSelectedFixture(null)}
          title="Spiel-Details"
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, fontFamily: 'Comfortaa', mb: 0.5 }}>Datum</Typography>
              <Typography sx={{ color: theme.palette.text.primary, fontFamily: 'Comfortaa' }}>
                {formatDate(selectedFixture.date)} ({getWeekday(selectedFixture.date)})
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, fontFamily: 'Comfortaa', mb: 0.5 }}>Uhrzeit</Typography>
              <Typography sx={{ color: theme.palette.text.primary, fontFamily: 'Comfortaa' }}>{selectedFixture.time} Uhr</Typography>
            </Box>
            {pitchName && (
              <Box>
                <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, fontFamily: 'Comfortaa', mb: 0.5 }}>Ort</Typography>
                <Typography sx={{ color: theme.palette.text.primary, fontFamily: 'Comfortaa' }}>{pitchName}</Typography>
              </Box>
            )}
            <Box>
              <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, fontFamily: 'Comfortaa', mb: 0.5 }}>Heim</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar
                  src={teams[selectedFixture.homeTeamId]?.logoUrl ? (teams[selectedFixture.homeTeamId].logoUrl.startsWith('http') ? teams[selectedFixture.homeTeamId].logoUrl : `${API_BASE_URL}${teams[selectedFixture.homeTeamId].logoUrl}`) : null}
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: teams[selectedFixture.homeTeamId]?.logoColor || theme.palette.grey[700],
                    fontSize: '0.8rem'
                  }}
                >
                  {!teams[selectedFixture.homeTeamId]?.logoUrl && (teams[selectedFixture.homeTeamId]?.name || selectedFixture.homeTeamName || 'H').charAt(0).toUpperCase()}
                </Avatar>
                <Typography sx={{ color: theme.palette.text.primary, fontFamily: 'Comfortaa' }}>
                  {teams[selectedFixture.homeTeamId]?.name || selectedFixture.homeTeamName || 'Unbekannt'}
                </Typography>
              </Box>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, fontFamily: 'Comfortaa', mb: 0.5 }}>Auswärts</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar
                  src={teams[selectedFixture.awayTeamId]?.logoUrl ? (teams[selectedFixture.awayTeamId].logoUrl.startsWith('http') ? teams[selectedFixture.awayTeamId].logoUrl : `${API_BASE_URL}${teams[selectedFixture.awayTeamId].logoUrl}`) : null}
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: teams[selectedFixture.awayTeamId]?.logoColor || theme.palette.grey[700],
                    fontSize: '0.8rem'
                  }}
                >
                  {!teams[selectedFixture.awayTeamId]?.logoUrl && (teams[selectedFixture.awayTeamId]?.name || selectedFixture.awayTeamName || 'A').charAt(0).toUpperCase()}
                </Avatar>
                <Typography sx={{ color: theme.palette.text.primary, fontFamily: 'Comfortaa' }}>
                  {teams[selectedFixture.awayTeamId]?.name || selectedFixture.awayTeamName || 'Unbekannt'}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2, pt: 2, borderTop: '1px solid', borderColor: theme.palette.divider }}>
              <Button
                variant="outlined"
                onClick={() => setSelectedFixture(null)}
                sx={{ color: theme.palette.text.secondary, borderColor: theme.palette.divider }}
              >
                Schließen
              </Button>
              {selectedFixture.bookingId && (
                <>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleReportResult}
                    sx={{ bgcolor: theme.palette.primary.main }}
                  >
                    Ergebnis melden
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleCancelBooking}
                  >
                    Spiel absagen
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </ReusableModal>
      )}

      {/* Modal für Ergebnis melden */}
      {showReportModal && selectedFixture && (
        <ReusableModal
          open={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setReportForm({ homeScore: '', awayScore: '' });
          }}
          title="Ergebnis melden"
        >
          <Box component="form" onSubmit={handleReportSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography sx={{ color: theme.palette.text.primary, fontFamily: 'Comfortaa', mb: 1 }}>
              {teams[selectedFixture.homeTeamId]?.name || selectedFixture.homeTeamName || 'Unbekannt'} vs. {teams[selectedFixture.awayTeamId]?.name || selectedFixture.awayTeamName || 'Unbekannt'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                type="number"
                size="small"
                label={`Tore ${teams[selectedFixture.homeTeamId]?.name || selectedFixture.homeTeamName || 'Heim'}`}
                value={reportForm.homeScore}
                onChange={(e) => setReportForm({ ...reportForm, homeScore: e.target.value })}
                fullWidth
                required
                sx={{
                  '& label.Mui-focused': { color: theme.palette.primary.main },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: theme.palette.divider },
                    '&:hover fieldset': { borderColor: theme.palette.text.secondary },
                    '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
                  },
                  '& .MuiInputBase-input': { color: theme.palette.text.primary },
                  '& label': { color: theme.palette.text.secondary },
                }}
              />
              <Typography sx={{ color: theme.palette.text.secondary, fontFamily: 'Comfortaa' }}>:</Typography>
              <TextField
                type="number"
                size="small"
                label={`Tore ${teams[selectedFixture.awayTeamId]?.name || selectedFixture.awayTeamName || 'Auswärts'}`}
                value={reportForm.awayScore}
                onChange={(e) => setReportForm({ ...reportForm, awayScore: e.target.value })}
                fullWidth
                required
                sx={{
                  '& label.Mui-focused': { color: theme.palette.primary.main },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: theme.palette.divider },
                    '&:hover fieldset': { borderColor: theme.palette.text.secondary },
                    '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
                  },
                  '& .MuiInputBase-input': { color: theme.palette.text.primary },
                  '& label': { color: theme.palette.text.secondary },
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setShowReportModal(false);
                  setReportForm({ homeScore: '', awayScore: '' });
                }}
                sx={{ color: theme.palette.text.secondary, borderColor: theme.palette.divider }}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={reportSubmitting || reportForm.homeScore === '' || reportForm.awayScore === ''}
                sx={{ bgcolor: theme.palette.primary.main }}
              >
                {reportSubmitting ? 'Wird gespeichert...' : 'Ergebnis melden'}
              </Button>
            </Box>
          </Box>
        </ReusableModal>
      )}

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setNotification({ ...notification, open: false })} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default DynamicFixtureList;
