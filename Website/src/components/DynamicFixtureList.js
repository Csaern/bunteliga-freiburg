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
import * as seasonApiService from '../services/seasonApiService';
import GameDetailsModal from './Modals/GameDetailsModal';

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
        px: isMobile ? 0.2 : 1, // Minimize padding on mobile
        fontSize: isMobile ? '0.7rem' : '0.95rem', // Larger fonts
        verticalAlign: 'middle',
        ...sx,
      }}
      {...props}
    >
      {children}
    </TableCell>
  );
};

const DynamicFixtureList = ({ title, details = true, seasonId, showType = 'all', userTeamId, maxWidth, disableContainer = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { teamId, isAdmin } = useAuth();
  const [fixtures, setFixtures] = useState([]);
  const [teams, setTeams] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [pitchesMap, setPitchesMap] = useState({});
  const [pitches, setPitches] = useState([]);
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
      setLoading(true);
      // 1. Season Data
      let activeTeamIds = [];
      if (seasonId) {
        try {
          const activeSeason = await seasonApiService.getActiveSeasonPublic();
          if (activeSeason && activeSeason.id === seasonId && activeSeason.teams) {
            activeTeamIds = activeSeason.teams
              .filter(t => t.status === 'active')
              .map(t => t.id || t.teamId)
              .filter(Boolean);
          } else {
            const seasonDoc = await getDoc(doc(db, 'seasons', seasonId));
            if (seasonDoc.exists()) {
              const seasonData = seasonDoc.data();
              if (seasonData.teams) {
                activeTeamIds = seasonData.teams
                  .filter(t => t.status === 'active')
                  .map(t => t.id || t.teamId)
                  .filter(Boolean);
              }
            }
          }
        } catch (e) {
          console.error('Season load error:', e);
        }
      }

      // 2. Teams
      let teamsArr = [];
      try {
        if (showType === 'results' || showType === 'all') {
          const teamsSnap = await getDocs(collection(db, 'teams'));
          teamsArr = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } else {
          try {
            teamsArr = await teamApi.getTeamsForActiveSeason();
          } catch {
            teamsArr = await teamApi.getTeamsForActiveSeasonPublic();
          }
        }
      } catch (e) {
        console.error('Teams load error:', e);
      }

      if (seasonId && activeTeamIds.length > 0) {
        teamsArr = teamsArr.filter(team => activeTeamIds.includes(team.id));
      }

      // ... (Initial filtering and team reduction)
      const teamsMap = teamsArr.reduce((acc, t) => {
        acc[t.id] = {
          name: t.name,
          logoColor: t.logoColor || '#666666',
          logoUrl: t.logoUrl,
          logoUrlLight: t.logoUrlLight,
          description: t.description,
          foundedYear: t.foundedYear,
        };
        return acc;
      }, {});
      // ALWAYS set initial teams
      setTeams({ ...teamsMap });

      // 3. Results
      let results = [];
      if (showType === 'results' || showType === 'all' || seasonId) {
        try {
          let resultsRaw = [];
          try {
            resultsRaw = await resultApi.getResultsForSeason(seasonId);
          } catch {
            resultsRaw = await resultApi.getResultsForSeasonPublic(seasonId);
          }
          results = resultsRaw
            .filter(r => r.status === 'confirmed')
            .filter(r => !userTeamId || r.homeTeamId === userTeamId || r.awayTeamId === userTeamId)
            .sort((a, b) => {
              const da = a.reportedAt ? new Date(a.reportedAt) : new Date(a.date);
              const db = b.reportedAt ? new Date(b.reportedAt) : new Date(b.date);
              return db - da;
            });
        } catch (e) {
          console.error('Results load error:', e);
        }
      }

      // 4. Bookings (Upcoming)
      let bookings = [];
      if (showType === 'upcoming' || showType === 'all') {
        try {
          if (userTeamId && seasonId) {
            try {
              bookings = await bookingApi.getUpcomingBookingsForTeam(seasonId, userTeamId);
            } catch {
              bookings = [];
            }
            if (!Array.isArray(bookings) || bookings.length === 0) {
              let allSeason = [];
              try {
                allSeason = await bookingApi.getBookingsForSeason(seasonId);
              } catch {
                allSeason = await bookingApi.getPublicBookingsForSeason(seasonId);
              }
              const now = new Date();
              bookings = allSeason.filter(b => {
                const d = normalizeToDate(b.date);
                return (b.homeTeamId === userTeamId || b.awayTeamId === userTeamId) && d && d >= now && b.status === 'confirmed';
              });
            }
          } else if (seasonId) {
            let allSeason = [];
            try {
              allSeason = await bookingApi.getBookingsForSeason(seasonId);
            } catch {
              allSeason = await bookingApi.getPublicBookingsForSeason(seasonId);
            }
            const now = new Date();
            bookings = allSeason.filter(b => {
              const d = normalizeToDate(b.date);
              return b.homeTeamId && b.awayTeamId && d && d >= now && b.status === 'confirmed';
            });
          }
          bookings.sort((a, b) => (normalizeToDate(a.date) || 0) - (normalizeToDate(b.date) || 0));
        } catch (e) {
          console.error('Bookings load error:', e);
        }
      }

      let allFixtures = [];

      // 5. Map Results
      if (showType === 'results' || showType === 'all') {
        // Missing Teams for results (often older teams)
        const missingIds = new Set();
        results.forEach(r => {
          if (r.homeTeamId && !teamsMap[r.homeTeamId]) missingIds.add(r.homeTeamId);
          if (r.awayTeamId && !teamsMap[r.awayTeamId]) missingIds.add(r.awayTeamId);
        });

        if (missingIds.size > 0) {
          await Promise.all(Array.from(missingIds).map(async id => {
            try {
              const docSnap = await getDoc(doc(db, 'teams', id));
              if (docSnap.exists()) {
                const data = docSnap.data();
                teamsMap[id] = {
                  name: data.name,
                  logoColor: data.logoColor || '#666666',
                  logoUrl: data.logoUrl,
                  logoUrlLight: data.logoUrlLight
                };
              } else {
                // Fallback name from results if possible
                const r = results.find(res => res.homeTeamId === id || res.awayTeamId === id);
                teamsMap[id] = {
                  name: (r?.homeTeamId === id ? r.homeTeamName : r.awayTeamName) || 'Unbekannt',
                  logoColor: '#666666'
                };
              }
            } catch { }
          }));
          setTeams({ ...teamsMap });
        }

        const bookingIds = results.filter(r => r.bookingId).map(r => r.bookingId);
        const bookingsMap = {};
        if (bookingIds.length > 0) {
          try {
            let bks = [];
            try { bks = await bookingApi.getBookingsForSeason(seasonId); } catch { bks = await bookingApi.getPublicBookingsForSeason(seasonId); }
            bks.forEach(b => { if (bookingIds.includes(b.id)) bookingsMap[b.id] = b; });
          } catch { }
        }

        allFixtures.push(...results.map(r => {
          const booking = r.bookingId ? bookingsMap[r.bookingId] : null;
          const fullDate = r.date || (booking ? booking.date : r.reportedAt);
          const d = normalizeToDate(fullDate);

          return {
            id: `result-${r.id}`,
            bookingId: r.bookingId,
            date: fullDate,
            time: d ? d.toTimeString().slice(0, 5) : '',
            homeTeamId: r.homeTeamId,
            awayTeamId: r.awayTeamId,
            homeScore: r.homeScore,
            awayScore: r.awayScore,
            isPast: true,
            location: r.location || (booking && booking.pitchId ? null : 'Unbekannt'),
            pitchId: booking ? booking.pitchId : null,
            homeTeamName: r.homeTeamName,
            awayTeamName: r.awayTeamName
          };
        }));
      }

      // 6. Pitch Names
      const pitchIds = new Set();
      allFixtures.forEach(f => f.pitchId && pitchIds.add(f.pitchId));
      bookings.forEach(b => b.pitchId && pitchIds.add(b.pitchId));

      const pitchesMapLocal = {};
      if (pitchIds.size > 0) {
        try {
          const pts = await pitchApi.getPublicPitches();
          setPitches(pts);
          pts.forEach(p => { if (pitchIds.has(p.id)) pitchesMapLocal[p.id] = p.name; });
          setPitchesMap(pitchesMapLocal);
        } catch { }
      }

      allFixtures.forEach(f => {
        if (!f.location && f.pitchId) f.location = pitchesMapLocal[f.pitchId] || 'Unbekannt';
        if (!f.location) f.location = 'Unbekannt';
      });

      // 7. Map Upcoming
      if (showType === 'upcoming' || showType === 'all') {
        allFixtures.push(...bookings.map(b => {
          const d = normalizeToDate(b.date);
          return {
            id: `booking-${b.id}`,
            bookingId: b.id,
            date: b.date,
            time: d ? d.toTimeString().slice(0, 5) : '',
            homeTeamId: b.homeTeamId,
            awayTeamId: b.awayTeamId,
            homeTeamName: b.homeTeamName || teamsMap[b.homeTeamId]?.name,
            awayTeamName: b.awayTeamName || teamsMap[b.awayTeamId]?.name,
            homeScore: null,
            awayScore: null,
            isPast: false,
            pitchId: b.pitchId,
            location: pitchesMapLocal[b.pitchId] || 'Unbekannt'
          };
        }));
      }

      // 8. Limits
      if (!userTeamId) {
        if (showType === 'results') allFixtures = allFixtures.slice(0, 5);
        else if (showType === 'upcoming') allFixtures = allFixtures.slice(0, 5);
      }

      setFixtures(allFixtures);
    } catch (error) {
      console.error('loadFixtures overall error:', error);
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
        // const pitches = await pitchApi.getPublicPitches();
        // const pitch = pitches.find(p => p.id === fixture.pitchId);
      } catch (error) {
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

  const getLogoUrl = (team) => {
    if (!team) return null;
    const isLightMode = theme.palette.mode === 'light';
    const logoUrlToUse = (isLightMode && team.logoUrlLight) ? team.logoUrlLight : team.logoUrl;
    return logoUrlToUse ? (logoUrlToUse.startsWith('http') ? logoUrlToUse : `${API_BASE_URL}${logoUrlToUse}`) : null;
  };

  const rowHeight = isMobile ? 55 : 60;

  const Wrapper = disableContainer ? Box : Container;
  const wrapperProps = disableContainer ? { sx: { my: 4 } } : { maxWidth: maxWidth || (details ? "xl" : "md"), sx: { my: 4, px: isMobile ? 0.25 : 2 } };

  if (loading) {
    return (
      <Wrapper {...wrapperProps}>
        <Typography
          variant={isMobile ? 'h4' : 'h3'}
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
      </Wrapper>
    );
  }

  // NEU: Empty State Handling
  if (fixtures.length === 0) {
    return (
      <Wrapper {...wrapperProps}>
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
        <Box sx={{ textAlign: 'center', py: 4, backgroundColor: theme.palette.background.paper, borderRadius: theme.shape.borderRadius, border: `1px solid ${theme.palette.divider}` }}>
          <Typography color="text.secondary" sx={{ fontFamily: 'Comfortaa' }}>
            {showType === 'results' ? 'Noch keine Ergebnisse vorhanden.' : 'Keine geplanten Spiele.'}
          </Typography>
        </Box>
      </Wrapper>
    );
  }

  const canReport = !!selectedFixture && selectedFixture.id.startsWith('booking-') && (isAdmin || (!!teamId && (String(teamId) === String(selectedFixture.homeTeamId) || String(teamId) === String(selectedFixture.awayTeamId))));
  const canCancel = !!selectedFixture && selectedFixture.id.startsWith('booking-') && !selectedFixture.isPast && (isAdmin || (!!teamId && (String(teamId) === String(selectedFixture.homeTeamId) || String(teamId) === String(selectedFixture.awayTeamId))));

  return (
    <Wrapper {...wrapperProps}>
      <Typography
        variant={isMobile ? 'h4' : 'h3'}
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
              return (
                <TableRow
                  key={fixture.id}
                  onClick={() => handleFixtureClick(fixture)}
                  sx={{
                    '&:hover': { backgroundColor: theme.palette.action.hover },
                    opacity: 1, // Full opacity for readability
                    height: rowHeight,
                    cursor: 'pointer',
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
                        variant="rounded"
                        alt={`${teams[fixture.homeTeamId]?.name || fixture.homeTeamName || 'Unbekannt'} Logo`}
                        src={getLogoUrl(teams[fixture.homeTeamId])}
                        sx={{
                          width: isMobile ? 28 : 32, // Etwas größer für bessere Sichtbarkeit
                          height: isMobile ? 28 : 32,
                          mb: 0.5,
                          fontSize: isMobile ? '0.7rem' : '0.7rem',
                          color: theme.palette.getContrastText(teams[fixture.homeTeamId]?.logoColor || theme.palette.grey[700]),
                          backgroundColor: 'transparent', // Kein Hintergrund für freigestellte Logos
                          // border: teams[fixture.homeTeamId]?.logoUrl ? `1px solid ${teams[fixture.homeTeamId]?.logoColor || theme.palette.grey[700]}` : 'none',
                          '& img': {
                            objectFit: 'contain',
                            width: '100%',
                            height: '100%',
                          }
                        }}
                      >
                        {!teams[fixture.homeTeamId]?.logoUrl && (teams[fixture.homeTeamId]?.name || fixture.homeTeamName || 'U').substring(0, 1).toUpperCase()}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.primary, fontSize: isMobile ? '0.75rem' : '0.95rem', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.1, width: '100%' }}>
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
                        variant="rounded"
                        alt={`${teams[fixture.awayTeamId]?.name || fixture.awayTeamName || 'Unbekannt'} Logo`}
                        src={getLogoUrl(teams[fixture.awayTeamId])}
                        sx={{
                          width: isMobile ? 28 : 32,
                          height: isMobile ? 28 : 32,
                          mb: 0.5,
                          fontSize: isMobile ? '0.7rem' : '0.7rem',
                          color: theme.palette.getContrastText(teams[fixture.awayTeamId]?.logoColor || theme.palette.grey[700]),
                          backgroundColor: 'transparent',
                          // border: teams[fixture.awayTeamId]?.logoUrl ? `1px solid ${teams[fixture.awayTeamId]?.logoColor || theme.palette.grey[700]}` : 'none',
                          '& img': {
                            objectFit: 'contain',
                            width: '100%',
                            height: '100%',
                          }
                        }}
                      >
                        {!teams[fixture.awayTeamId]?.logoUrl && (teams[fixture.awayTeamId]?.name || fixture.awayTeamName || 'U').substring(0, 1).toUpperCase()}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.primary, fontSize: isMobile ? '0.75rem' : '0.95rem', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.1, width: '100%' }}>
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
      <GameDetailsModal
        open={!!selectedFixture && !showReportModal}
        onClose={() => setSelectedFixture(null)}
        fixture={selectedFixture}
        teams={teams}
        pitches={pitches}
        handleReportResult={canReport ? handleReportResult : null}
        handleCancelBooking={canCancel ? handleCancelBooking : null}
      />

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
    </Wrapper>
  );
};

export default DynamicFixtureList;
