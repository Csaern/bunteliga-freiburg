// src/components/BookingOverview.js
import React, { useState, useEffect } from 'react';
// Frontend nutzt Backend-APIs; direkter Firestore-Zugriff entfällt für Aktionen
import * as seasonApi from '../services/seasonApiService';
import * as pitchApi from '../services/pitchApiService';
import * as bookingApi from '../services/bookingApiService';
import * as teamApi from '../services/teamApiService';
import { useAuth } from '../context/AuthProvider';
import { ReusableModal } from './Helpers/modalUtils';
import { Box, Button, FormControl, InputLabel, Select, MenuItem, TextField, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useTheme, useMediaQuery, Alert, Snackbar, CircularProgress, Divider, Checkbox, FormControlLabel, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { StyledTableCell, filterData } from './Helpers/tableUtils';
import { formatDateForSearch } from './Helpers/dateUtils';

const BookingOverview = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [awayTeam, setAwayTeam] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [currentSeason, setCurrentSeason] = useState(null);
  const { currentUser, teamId, role } = useAuth();
  const [potentialOpponents, setPotentialOpponents] = useState([]);
  const [isOpponentLoading, setIsOpponentLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [submitting, setSubmitting] = useState(false);
  const [isFriendlyGame, setIsFriendlyGame] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const darkInputStyle = {
    '& label.Mui-focused': { color: theme.palette.primary.main },
    '& .MuiOutlinedInput-root': {
      '& fieldset': { borderColor: theme.palette.divider },
      '&:hover fieldset': { borderColor: theme.palette.text.secondary },
      '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
    },
    '& .MuiInputBase-input': { color: theme.palette.text.primary, colorScheme: 'dark', accentColor: theme.palette.primary.main },
    '& label': { color: theme.palette.text.secondary },
    '& .MuiSelect-icon': { color: theme.palette.text.secondary },
    '& .Mui-disabled': { WebkitTextFillColor: `${theme.palette.text.disabled} !important`, color: `${theme.palette.text.disabled} !important` },
    '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.action.disabledBackground },
  };

  // parseDate-Funktion wie im Admin
  const parseDate = (dateObj) => {
    if (!dateObj) return new Date();
    if (dateObj.toDate) return dateObj.toDate();
    if (dateObj._seconds) return new Date(dateObj._seconds * 1000);
    return new Date(dateObj);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Verwende öffentliche APIs für alle User (auch ohne Admin-Rechte)
      const activeSeason = await seasonApi.getActiveSeasonPublic().catch(() => null);
      if (!activeSeason) {
        console.error('Keine aktive Saison gefunden.');
        setLoading(false);
        return;
      }
      setCurrentSeason(activeSeason);

      const [bookingsData, pitchesData, teamsData] = await Promise.all([
        bookingApi.getPublicBookingsForSeason(activeSeason.id),
        pitchApi.getPublicPitches(),
        teamApi.getTeamsForActiveSeasonPublic()
      ]);

      // Formatiere die Daten wie im Admin
      const formattedBookings = bookingsData.map(b => ({ ...b, date: parseDate(b.date) }));

      // Konvertiere Teams-Array zu Objekt für einfacheren Zugriff
      const teams = teamsData.reduce((acc, t) => { acc[t.id] = t.name; return acc; }, {});

      setData({
        pitches: pitchesData,
        teams,
        bookings: formattedBookings
      });
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      setNotification({ open: true, message: 'Fehler beim Laden der Daten.', severity: 'error' });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBookNow = (booking) => {
    const bookingDate = new Date(booking.date);
    setSelectedSlot({
      id: booking.id,
      date: bookingDate,
      pitchId: booking.pitchId,
      time: bookingDate.toTimeString().slice(0, 5),
      friendly: booking.friendly || false
    });
    setIsFriendlyGame(booking.friendly || false);
  };

  // Lade potenzielle Gegner, sobald das Modal geöffnet wird
  useEffect(() => {
    const loadOpponents = async () => {
      if (!selectedSlot || !teamId) { setPotentialOpponents([]); return; }
      setIsOpponentLoading(true);
      try {
        const opponents = await teamApi.getPotentialOpponents(teamId, isFriendlyGame);
        setPotentialOpponents(opponents || []);
      } catch (e) {
        setPotentialOpponents([]);
      } finally {
        setIsOpponentLoading(false);
      }
    };
    loadOpponents();
  }, [selectedSlot, teamId, isFriendlyGame]);

  const submitBooking = async (e) => {
    e.preventDefault();
    // Nur eingeloggte Team-User dürfen buchen
    if (!currentUser || !teamId) {
      setNotification({ open: true, message: "Bitte melden Sie sich mit einem Team-Account an, um zu buchen.", severity: 'error' });
      return;
    }

    // Prüfe, ob aktuelle Saison vorhanden ist
    if (!currentSeason) {
      setNotification({ open: true, message: "Keine aktuelle Saison gefunden! Bitte kontaktieren Sie einen Administrator.", severity: 'error' });
      return;
    }

    if (!awayTeam) {
      setNotification({ open: true, message: "Bitte wählen Sie ein Auswärtsteam aus.", severity: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      // Anfrage an Backend: vorhandenen Slot anfragen
      await bookingApi.requestBookingSlot(
        selectedSlot.id,
        teamId,
        awayTeam,
        isFriendlyGame
      );

      setNotification({ open: true, message: "Buchung erfolgreich! Warte auf Bestätigung des Gegners.", severity: 'success' });
      setSelectedSlot(null);
      setAwayTeam('');
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      // Refresh data
      fetchData();
    } catch (error) {
      console.error("Fehler bei der Buchung:", error);
      setNotification({ open: true, message: error.message || "Buchung fehlgeschlagen.", severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const getPitchName = (pitchId) => {
    const pitch = data.pitches?.find(p => p.id === pitchId);
    return pitch ? pitch.name : 'Unbekannter Platz';
  };

  const getTeamName = (teamId) => {
    if (!teamId) return null;
    const team = data.teams?.[teamId];
    return team || 'Unbekannt';
  };
  const displayTeamName = (teamId) => getTeamName(teamId) || '-';

  // Nur zukünftige Buchungen anzeigen (Vergangenheit ausblenden)
  const now = new Date();
  const upcomingBookings = (data.bookings || []).filter((booking) => {
    try {
      const bookingDate = new Date(booking.date);
      return bookingDate >= now;
    } catch {
      // Falls das Datum nicht geparst werden kann, sicherheitshalber ausblenden
      return false;
    }
  });

  // Suchfelder für die Volltextsuche
  const searchableFields = [
    { key: 'date', accessor: (item) => formatDateForSearch(item.date) },
    { key: 'pitchId', accessor: (item) => getPitchName(item.pitchId) },
    { key: 'homeTeamId', accessor: (item) => getTeamName(item.homeTeamId) },
    { key: 'awayTeamId', accessor: (item) => getTeamName(item.awayTeamId) },
  ];

  // Filtere Buchungen basierend auf Suchbegriff
  const filteredBookings = filterData(upcomingBookings, searchTerm, searchableFields);

  // Gruppiere gefilterte Buchungen nach Platz
  const bookingsByPitch = filteredBookings.reduce((acc, booking) => {
    const pitchId = booking.pitchId;
    if (!acc[pitchId]) {
      acc[pitchId] = [];
    }
    acc[pitchId].push(booking);
    return acc;
  }, {});

  // Sortiere Buchungen innerhalb jedes Platzes nach Datum
  Object.keys(bookingsByPitch).forEach(pitchId => {
    bookingsByPitch[pitchId].sort((a, b) => new Date(a.date) - new Date(b.date));
  });

  // Sortiere Plätze alphabetisch
  const sortedPitchIds = Object.keys(bookingsByPitch).sort((a, b) => {
    const pitchA = getPitchName(a);
    const pitchB = getPitchName(b);
    return pitchA.localeCompare(pitchB);
  });

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress sx={{ color: theme.palette.primary.main }} /></Box>;
  }

  return (
    <Box sx={{ p: { sm: 3 } }}>
      <Snackbar open={notification.open} autoHideDuration={6000} onClose={() => setNotification({ ...notification, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setNotification({ ...notification, open: false })} severity={notification.severity} sx={{ width: '100%' }}>{notification.message}</Alert>
      </Snackbar>

      <Typography variant={isMobile ? 'h6' : 'h4'} sx={{ mb: 2, mt: 2, color: theme.palette.primary.main, fontWeight: 700, fontFamily: 'Comfortaa', textAlign: 'center', textTransform: 'uppercase' }}>
        Spielplan & Reservierung
      </Typography>

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
        <TextField 
          fullWidth 
          variant="outlined" 
          size="small" 
          placeholder="Suche nach Datum, Platz, Team..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          sx={{ 
            ...darkInputStyle, 
            maxWidth: '600px'
          }}
          InputProps={{ 
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: theme.palette.text.secondary }} />
              </InputAdornment>
            ), 
          }}
        />
      </Box>

      {sortedPitchIds.length === 0 ? (
        <Paper sx={{ backgroundColor: theme.palette.background.paper, borderRadius: 2, p: { xs: 3, sm: 5 }, textAlign: 'center', border: `1px solid ${theme.palette.divider}` }}>
          <Typography sx={{ color: theme.palette.text.secondary, fontFamily: 'Comfortaa' }}>
            {searchTerm ? 'Keine passenden Buchungen gefunden.' : 'Keine Zeitslots für die aktuelle Saison vorhanden.'}
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {sortedPitchIds.map(pitchId => {
            const pitchBookings = bookingsByPitch[pitchId];
            const pitchName = getPitchName(pitchId);

            return (
              <TableContainer key={pitchId} component={Paper} sx={{ backgroundColor: '#111', borderRadius: 2, border: '1px solid', borderColor: 'grey.800', maxWidth: '1200px', margin: '0 auto' }}>
                <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.grey[800]}` }}>
                  <Typography variant="h6" sx={{ color: '#00A99D', fontWeight: 700, fontFamily: 'comfortaa', textTransform: 'uppercase' }}>
                    {pitchName}
                  </Typography>
                </Box>
                <Table size="small">
                  <TableHead>
                    {isMobile ? (
                      <TableRow sx={{ borderBottom: `2px solid ${theme.palette.divider}` }}>
                        <TableCell align="center" colSpan={7} sx={{ color: theme.palette.text.primary }}>Verfügbare Termine</TableCell>
                      </TableRow>
                    ) : (
                      <TableRow sx={{ borderBottom: `2px solid ${theme.palette.divider}` }}>
                        <TableCell align="center" sx={{ width: '40px', color: theme.palette.text.primary }}>Status</TableCell>
                        <TableCell sx={{ color: theme.palette.text.primary }}>Datum</TableCell>
                        <TableCell sx={{ color: theme.palette.text.primary }}>Zeitraum</TableCell>
                        <TableCell sx={{ color: theme.palette.text.primary }}>Heim</TableCell>
                        <TableCell sx={{ color: theme.palette.text.primary }}>Auswärts</TableCell>
                        <TableCell align="center" sx={{ color: theme.palette.text.primary }}>Aktion</TableCell>
                      </TableRow>
                    )}
                  </TableHead>
                  <TableBody>
                    {pitchBookings.map(booking => {
                      const startTime = new Date(booking.date).toTimeString().slice(0, 5);
                      const endTime = booking.duration ? new Date(new Date(booking.date).getTime() + booking.duration * 60000).toTimeString().slice(0, 5) : '-';
                      const timeRange = `${startTime} - ${endTime}`;

                      // Eine Buchung ist verfügbar, wenn: status === 'available' ODER (isAvailable === true UND keine Teams zugewiesen)
                      const isAvailable = booking.status === 'available' ||
                        (booking.isAvailable === true && !booking.homeTeamId && !booking.awayTeamId);
                      const isBooked = !isAvailable && booking.homeTeamId && booking.awayTeamId;
                      const isMyBooking = (booking.homeTeamId === teamId || booking.awayTeamId === teamId) && booking.status === 'confirmed';

                      return isMobile ? (
                        <TableRow key={booking.id} sx={{ backgroundColor: theme.palette.background.default, cursor: 'pointer', '&:hover': { backgroundColor: theme.palette.action.hover } }}>
                          <TableCell colSpan={7} sx={{ p: 0, border: 'none', borderBottom: `1px solid ${theme.palette.divider}` }}>
                            <Box sx={{ display: 'flex', alignItems: 'stretch', minHeight: '70px' }}>
                              <Box sx={{ width: '4px', bgcolor: isAvailable ? theme.palette.success.main : theme.palette.error.main }} />
                              <Box sx={{ flexGrow: 1, p: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Box sx={{ textAlign: 'center', pr: 2 }}>
                                    <Typography sx={{ fontSize: '0.7rem', color: 'grey.300' }}>{new Date(booking.date).toLocaleDateString('de-DE')}</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'grey.100' }}>{timeRange}</Typography>
                                      {booking.friendly && <Typography sx={{ color: '#FFD700', fontWeight: 'bold', fontSize: '0.8rem' }}>F</Typography>}
                                    </Box>
                                  </Box>
                                  <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', pl: 2, borderLeft: `1px solid ${theme.palette.divider}` }}>
                                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: theme.palette.text.primary }}>{displayTeamName(booking.homeTeamId)}</Typography>
                                    <Typography sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem', my: 0.25 }}>vs.</Typography>
                                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: theme.palette.text.primary }}>{displayTeamName(booking.awayTeamId)}</Typography>
                                  </Box>
                                  <Box sx={{ pl: 2, borderLeft: `1px solid ${theme.palette.divider}` }}>
                                    {isAvailable ? (
                                      <Button size="small" variant="contained" color="success" onClick={() => handleBookNow(booking)}>
                                        Buchen
                                      </Button>
                                    ) : (
                                      <Button size="small" variant="contained" color="warning" disabled>
                                        Belegt
                                      </Button>
                                    )}
                                  </Box>
                                </Box>
                              </Box>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow key={booking.id} sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' } }}>
                          <StyledTableCell align="center">
                            <Box sx={{ width: '10px', height: '10px', bgcolor: isAvailable ? theme.palette.success.main : theme.palette.error.main, borderRadius: '50%', boxShadow: `0 0 8px ${isAvailable ? theme.palette.success.main : theme.palette.error.main}` }} />
                          </StyledTableCell>
                          <StyledTableCell>{new Date(booking.date).toLocaleDateString('de-DE')}</StyledTableCell>
                          <StyledTableCell>
                            {timeRange}
                            {booking.friendly && <Typography component="span" sx={{ ml: 1, color: '#FFD700', fontWeight: 'bold' }}>F</Typography>}
                          </StyledTableCell>
                          <StyledTableCell>{getPitchName(booking.pitchId)}</StyledTableCell>
                          <StyledTableCell>{displayTeamName(booking.homeTeamId)}</StyledTableCell>
                          <StyledTableCell>{displayTeamName(booking.awayTeamId)}</StyledTableCell>
                          <StyledTableCell align="center">
                            {isAvailable ? (
                              <Button size="small" variant="contained" color="success" onClick={() => handleBookNow(booking)}>
                                Platz buchen
                              </Button>
                            ) : (
                              <Button size="small" variant="contained" color="warning" disabled>
                                Belegt
                              </Button>
                            )}
                          </StyledTableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            );
          })}
        </Box>
      )}

      {/* Pop-up-Formular für die Buchung */}
      {selectedSlot && (
        <ReusableModal open={!!selectedSlot} onClose={() => setSelectedSlot(null)} title="Platz buchen">
          <Box component="form" onSubmit={submitBooking} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField size="small" label="Datum" type="date" fullWidth value={new Date(selectedSlot.date).toISOString().split('T')[0]} InputLabelProps={{ shrink: true }} sx={darkInputStyle} disabled />
              <TextField size="small" label="Uhrzeit" type="time" fullWidth value={selectedSlot.time} InputLabelProps={{ shrink: true }} sx={darkInputStyle} disabled />
            </Box>
            <TextField size="small" label="Dauer (Minuten)" type="number" fullWidth value={(data.bookings || []).find(b => b.id === selectedSlot.id)?.duration || 90} sx={darkInputStyle} disabled />
            <FormControl size="small" fullWidth sx={darkInputStyle} disabled>
              <InputLabel>Platz</InputLabel>
              <Select value={selectedSlot.pitchId} label="Platz" MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary } } }} sx={{ color: theme.palette.text.primary }}>
                {data.pitches.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>

            <Divider sx={{ my: 1, borderColor: theme.palette.divider }} />

            <Box>
              <Typography sx={{ color: theme.palette.text.primary, fontWeight: 'bold', mb: 0.5 }}>Heim-Mannschaft</Typography>
              <Typography sx={{ color: theme.palette.text.secondary }}>{data.teams[teamId] || 'Dein Team'}</Typography>
            </Box>

            <Box>
              <Typography sx={{ color: theme.palette.text.primary, fontWeight: 'bold', mb: 0.5 }}>Auswärts-Mannschaft</Typography>
              <FormControl fullWidth size="small" sx={{ borderColor: theme.palette.divider, bgcolor: theme.palette.background.paper }}>
                <Select sx={{ color: theme.palette.text.primary }}
                  label="Auswärts-Mannschaft"
                  value={awayTeam}
                  onChange={(e) => setAwayTeam(e.target.value)}
                  required
                  MenuProps={{ PaperProps: { sx: { bgcolor: theme.palette.background.paper, color: theme.palette.text.primary } } }}
                  disabled={isOpponentLoading}
                >
                  <MenuItem value=""><em>-</em></MenuItem>
                  {isOpponentLoading ? (
                    <MenuItem disabled><em>Lade Gegner...</em></MenuItem>
                  ) : (
                    potentialOpponents.map(opponent => (
                      <MenuItem key={opponent.id} value={opponent.id}>
                        {opponent.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Box>

            <FormControlLabel
              control={<Checkbox
                checked={isFriendlyGame}
                onChange={(e) => setIsFriendlyGame(e.target.checked)}
                sx={{ color: 'grey.100', '&.Mui-checked': { color: '#FFD700' }, '&.Mui-disabled': { color: 'grey.700' } }}
                disabled={!selectedSlot.friendly}
              />}
              label={
                <Box>
                  <Typography sx={{ color: !selectedSlot.friendly ? 'grey.600' : 'grey.100' }}>Freundschaftsspiel</Typography>
                  {!selectedSlot.friendly && <Typography variant="caption" sx={{ color: 'grey.600' }}>Nicht freigegeben</Typography>}
                </Box>
              }
            />

            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 1 }}>
              <Button variant="outlined" color="inherit" onClick={() => setSelectedSlot(null)} sx={{ color: theme.palette.text.secondary, borderColor: theme.palette.divider }}>Abbrechen</Button>
              <Button variant="contained" sx={{ bgcolor: theme.palette.primary.main }} type="submit" disabled={!awayTeam || submitting}>
                {submitting ? <CircularProgress size={20} /> : 'Jetzt buchen'}
              </Button>
            </Box>
          </Box>
        </ReusableModal>
      )}
    </Box>
  );
};

export default BookingOverview;