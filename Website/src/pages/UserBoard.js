import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { Box, Button, Paper, Typography, Container, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useTheme } from '@mui/material';
import * as seasonApi from '../services/seasonApiService';
import * as bookingApi from '../services/bookingApiService';
import * as teamApi from '../services/teamApiService';

const UserBoard = () => {
  const { currentUser, teamId, role } = useAuth();
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState('');
  const [upcoming, setUpcoming] = useState([]);
  const [teamsMap, setTeamsMap] = useState({});
  const [currentSeason, setCurrentSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const load = async () => {
      try {
        const activeSeason = await seasonApi.getActiveSeason();
        setCurrentSeason(activeSeason);

        const [teamsArr, upcomingFromApi] = await Promise.all([
          teamApi.getTeamsForActiveSeason().catch(() => []),
          bookingApi.getUpcomingBookingsForMyTeam(activeSeason.id).catch(() => [])
        ]);

        const map = teamsArr.reduce((acc, t) => { acc[t.id] = t.name; return acc; }, {});
        setTeamsMap(map);
        if (teamId && map[teamId]) setTeamName(map[teamId]);

        const list = upcomingFromApi
          .map(b => {
            const dateObj = b.date?.toDate ? b.date.toDate() : new Date(b.date);
            const timeStr = dateObj.toTimeString().slice(0, 5);
            const dateKey = dateObj.toISOString().split('T')[0];
            return { ...b, date: dateKey, time: timeStr, _dateObj: dateObj };
          })
          .sort((a, b) => a._dateObj - b._dateObj);

        setUpcoming(list);
      } finally {
        setLoading(false);
      }
    };
    if (currentUser) load();
  }, [currentUser, teamId]);

  // Platzhalter: Team-Aktion könnte über Backend-Routen erfolgen (nicht Teil dieses Schritts)
  const handleConfirm = async () => { alert('Bestätigen: folgt in einem nächsten Schritt über Backend-Aktion.'); };
  const handleDecline = async () => { alert('Ablehnen: folgt in einem nächsten Schritt über Backend-Aktion.'); };

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', p:4 }}><Typography color="grey.400">Lade Benutzerboard...</Typography></Box>;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" sx={{ mb:2, mt:1, color:'#00A99D', fontWeight:700, fontFamily:'comfortaa', textAlign:'center', textTransform:'uppercase' }}>Team-Board</Typography>

      <Paper sx={{ p:2, mb:3, backgroundColor:'#111', border:'1px solid', borderColor:'grey.800' }}>
        <Typography variant="h6" sx={{ color: 'grey.100', mb: 1, fontFamily:'comfortaa' }}>Dein Team</Typography>
        <Typography sx={{ color: 'grey.300' }}>{teamName || (role === 'admin' ? 'Administrator' : 'Ohne Team')}</Typography>
        {role !== 'admin' && (
          <Box sx={{ display:'flex', gap:1, mt:2 }}>
            <Button component={Link} to="/platzreservierung" variant="contained" sx={{ backgroundColor:'#00A99D' }}>Platz buchen</Button>
            <Button component={Link} to="/ergebnis-melden" variant="outlined" sx={{ color:'#00A99D', borderColor:'#00A99D' }}>Ergebnis melden</Button>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p:2, backgroundColor:'#111', border:'1px solid', borderColor:'grey.800' }}>
        <Typography variant="h6" sx={{ color:'grey.100', mb:2, fontFamily:'comfortaa' }}>Bevorstehende Spiele</Typography>
        {upcoming.length === 0 ? (
          <Typography sx={{ color:'grey.500', fontFamily:'comfortaa' }}>Keine anstehenden Spiele.</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor:'rgba(255,255,255,0.05)' }}>
                  <TableCell sx={{ color:'grey.100' }}>Datum</TableCell>
                  <TableCell sx={{ color:'grey.100' }}>Zeit</TableCell>
                  <TableCell sx={{ color:'grey.100' }}>Paarung</TableCell>
                  <TableCell sx={{ color:'grey.100' }}>Aktionen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {upcoming.map(b => (
                  <TableRow key={b.id}>
                    <TableCell sx={{ color:'grey.200' }}>{new Date(`${b.date}T00:00:00`).toLocaleDateString('de-DE')}</TableCell>
                    <TableCell sx={{ color:'grey.200' }}>{b.time}</TableCell>
                    <TableCell sx={{ color:'grey.200' }}>{teamsMap[b.homeTeamId]} vs. {teamsMap[b.awayTeamId]}</TableCell>
                    <TableCell>
                      {b.status === 'pending_away_confirm' && b.awayTeamId === teamId && (
                        <Box sx={{ display:'flex', gap:1 }}>
                          <Button size="small" variant="contained" sx={{ backgroundColor:'#00A99D' }} onClick={() => handleConfirm(b.id)}>Bestätigen</Button>
                          <Button size="small" variant="outlined" color="error" onClick={() => handleDecline(b.id)}>Ablehnen</Button>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
};

export default UserBoard;



