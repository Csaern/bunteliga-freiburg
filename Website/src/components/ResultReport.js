import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, CircularProgress, Container, MenuItem, Select, TextField, Typography } from '@mui/material';
import { useAuth } from '../context/AuthProvider';
import * as seasonApi from '../services/seasonApiService';
import { ReusableModal } from './Helpers/modalUtils';
import * as resultApi from '../services/resultApiService';
import * as bookingApi from '../services/bookingApiService';

const ResultReport = () => {
  const { currentUser, teamId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [results, setResults] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const season = await seasonApi.getActiveSeasonPublic();
        if (!season) { setLoading(false); return; }
        setCurrentSeason(season);
        // Hole vergangene, bestätigte Spiele ohne Ergebnis für mein Team über Backend
        const needing = await bookingApi.getBookingsNeedingResultForMyTeam(season.id);
        setBookings(needing);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser && teamId) load();
  }, [currentUser, teamId]);

  const gamesNeedingResult = useMemo(() => {
    const copy = [...bookings];
    return copy.sort((a, b) => (a.date?.toMillis?.() || new Date(a.date).getTime()) - (b.date?.toMillis?.() || new Date(b.date).getTime()));
  }, [bookings, results]);

  const handleOpen = (booking) => {
    setSelectedBooking(booking);
    setHomeScore('');
    setAwayScore('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBooking || !currentSeason) return;
    setSubmitting(true);
    try {
      await resultApi.reportResult(selectedBooking.id, {
        homeScore: parseInt(homeScore, 10),
        awayScore: parseInt(awayScore, 10),
        seasonId: currentSeason.id,
      });
      setSelectedBooking(null);
      // Einfach neu laden
      window.location.reload();
    } catch (err) {
      alert(err.message || 'Fehler beim Melden des Ergebnisses');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Ergebnis melden</Typography>
      {gamesNeedingResult.length === 0 ? (
        <Typography sx={{ color: 'grey.500' }}>Keine Spiele ohne Ergebnis.</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {gamesNeedingResult.map(g => {
            const dateObj = g.date?.toDate ? g.date.toDate() : new Date(g.date);
            const label = `${dateObj.toLocaleDateString('de-DE')} ${dateObj.toTimeString().slice(0,5)}`;
            return (
              <Box key={g.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #333', borderRadius: 1, p: 1 }}>
                <Typography sx={{ color: 'grey.200' }}>{label} – Spiel #{g.id.slice(0,6)}</Typography>
                <Button variant="contained" size="small" onClick={() => handleOpen(g)}>Ergebnis melden</Button>
              </Box>
            );
          })}
        </Box>
      )}

      {!!selectedBooking && (
        <ReusableModal open={!!selectedBooking} onClose={() => setSelectedBooking(null)} title="Ergebnis melden">
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography sx={{ color: 'grey.200' }}>Buchung: {selectedBooking.id}</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Heimtore" type="number" size="small" value={homeScore} onChange={(e) => setHomeScore(e.target.value)} required sx={{ input: { color: 'grey.100' } }} />
              <TextField label="Auswärtstore" type="number" size="small" value={awayScore} onChange={(e) => setAwayScore(e.target.value)} required sx={{ input: { color: 'grey.100' } }} />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button variant="outlined" color="inherit" onClick={() => setSelectedBooking(null)}>Abbrechen</Button>
              <Button disabled={submitting} variant="contained" color="success" type="submit">Senden</Button>
            </Box>
          </Box>
        </ReusableModal>
      )}
    </Container>
  );
};

export default ResultReport;


