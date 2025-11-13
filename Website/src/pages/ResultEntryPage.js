import React, { useState, useEffect } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { Container, Paper, Typography, Box, Button, Select, MenuItem, InputLabel, FormControl, TextField } from '@mui/material';
import * as seasonApi from '../services/seasonApiService';
import * as teamApi from '../services/teamApiService';
import * as bookingApi from '../services/bookingApiService';
import { useAuth } from '../context/AuthProvider';

const ResultEntryPage = () => {
  const { currentUser, teamId, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [availableGames, setAvailableGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [resultForm, setResultForm] = useState({
    gameId: '',
    homeScore: '',
    awayScore: '',
    seasonId: ''
  });

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    loadData();
  }, [currentUser, navigate]);

  const loadData = async () => {
    try {
      const teamsData = await teamApi.getTeamsForActiveSeason();
      setTeams(teamsData);

      const current = await seasonApi.getActiveSeason();
      setCurrentSeason(current);

      if (current && teamId) {
        setResultForm(prev => ({ ...prev, seasonId: current.id }));
        const bookings = await bookingApi.getBookingsForSeason(current.id);
        const normalized = bookings
          .map(b => {
            const dateObj = b.date?.toDate ? b.date.toDate() : new Date(b.date);
            const timeStr = isNaN(dateObj) ? '' : dateObj.toTimeString().slice(0,5);
            const dateKey = isNaN(dateObj) ? '' : dateObj.toISOString().split('T')[0];
            return { ...b, date: dateKey, time: timeStr };
          })
          .filter(b => b.homeTeamId && b.awayTeamId && (b.homeTeamId === teamId || b.awayTeamId === teamId));

        // Hinweis: Ergebnisprüfung könnte über Backend erfolgen; hier vereinfachte Clientprüfung
        const availableGames = normalized.map(booking => ({
          ...booking,
          homeTeamName: teamsData.find(t => t.id === booking.homeTeamId)?.name || 'Unbekannt',
          awayTeamName: teamsData.find(t => t.id === booking.awayTeamId)?.name || 'Unbekannt'
        }));

        setAvailableGames(availableGames);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentSeason) {
      alert('Keine aktuelle Saison gefunden!');
      return;
    }

    if (!resultForm.gameId) {
      alert('Bitte wählen Sie ein Spiel aus!');
      return;
    }

    if (!resultForm.homeScore || !resultForm.awayScore) {
      alert('Bitte geben Sie beide Ergebnisse ein!');
      return;
    }

    const selectedGame = availableGames.find(game => game.id === resultForm.gameId);
    if (!selectedGame) {
      alert('Ausgewähltes Spiel nicht gefunden!');
      return;
    }

    setSubmitting(true);

    try {
      await addDoc(collection(db, 'results'), {
        homeTeamId: selectedGame.homeTeamId,
        awayTeamId: selectedGame.awayTeamId,
        homeScore: parseInt(resultForm.homeScore),
        awayScore: parseInt(resultForm.awayScore),
        date: selectedGame.date,
        time: selectedGame.time,
        seasonId: resultForm.seasonId,
        reportedBy: currentUser.uid,
        reportedAt: new Date(),
        status: 'pending'
      });

      alert('Ergebnis erfolgreich gemeldet! Es wird vom Administrator überprüft.');
      
      setResultForm({
        gameId: '',
        homeScore: '',
        awayScore: '',
        seasonId: resultForm.seasonId
      });
      loadData();
    } catch (error) {
      console.error('Fehler beim Speichern des Ergebnisses:', error);
      alert('Fehler beim Speichern des Ergebnisses!');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div style={{ padding: '20px', textAlign: 'center' }}>Lade...</div>
      </div>
    );
  }

  if (!currentSeason) {
    return (
      <div>
        <main style={{ minHeight: '80vh', padding: '20px' }}>
          <h1>Ergebnis melden</h1>
          <p>Keine aktuelle Saison gefunden. Bitte wenden Sie sich an den Administrator.</p>
        </main>
      </div>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb:2, mt:1, color:'#00A99D', fontWeight:700, fontFamily:'comfortaa', textAlign:'center', textTransform:'uppercase' }}>Ergebnis melden</Typography>
      <Paper sx={{ p:3, backgroundColor:'#111', border:'1px solid', borderColor:'grey.800' }}>
        <Typography sx={{ color:'grey.400', mb:2, textAlign:'center', fontFamily:'comfortaa' }}>
          Aktuelle Saison: <strong style={{ color:'#00A99D' }}>{currentSeason?.name} {currentSeason?.year ? `(${currentSeason.year})` : ''}</strong>
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <FormControl fullWidth size="small" sx={{ mb:2 }}>
            <InputLabel>Verfügbares Spiel</InputLabel>
            <Select
              label="Verfügbares Spiel"
              value={resultForm.gameId}
              onChange={(e) => setResultForm({ ...resultForm, gameId: e.target.value })}
              required
              MenuProps={{ PaperProps: { sx: { bgcolor:'#333', color:'grey.200' } } }}
            >
              {availableGames.map(game => (
                <MenuItem key={game.id} value={game.id}>
                  {new Date(`${game.date}T00:00:00`).toLocaleDateString('de-DE')} {game.time} – {game.homeTeamName} vs. {game.awayTeamName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display:'flex', gap:2, mb:2, backgroundColor:'#333', border:'1px solid', borderColor:'grey.700', borderRadius:'8px', p:2 }}>
            <TextField
              type="number"
              size="small"
              label="Heim-Tore"
              value={resultForm.homeScore}
              onChange={(e) => setResultForm({ ...resultForm, homeScore: e.target.value })}
              fullWidth
              required
            />
            <TextField
              type="number"
              size="small"
              label="Auswärts-Tore"
              value={resultForm.awayScore}
              onChange={(e) => setResultForm({ ...resultForm, awayScore: e.target.value })}
              fullWidth
              required
            />
          </Box>

          <Box sx={{ display:'flex', gap:1, justifyContent:'center' }}>
            <Button type="submit" variant="contained" sx={{ backgroundColor:'#00A99D' }} disabled={submitting || availableGames.length === 0}>
              {submitting ? 'Wird gespeichert...' : 'Ergebnis melden'}
            </Button>
            <Button type="button" variant="outlined" onClick={() => navigate('/dashboard')} sx={{ color:'#00A99D', borderColor:'#00A99D' }}>
              Zurück zum Dashboard
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default ResultEntryPage;
