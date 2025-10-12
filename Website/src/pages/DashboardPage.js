// src/pages/DashboardPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, updateDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../context/AuthProvider';
import DynamicLeagueTable from '../components/DynamicLeagueTable';
import DynamicFixtureList from '../components/DynamicFixtureList';
import TeamSettings from '../components/TeamSettings';
import { Box, Typography, Button, Container, CircularProgress, Avatar, Grid, Alert, AlertTitle, TextField, Paper, IconButton, Tooltip, useTheme, useMediaQuery } from '@mui/material';
import { ReusableModal } from '../components/Helpers/modalUtils';

// Icons for Alerts and the new Icon Bar
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import PostAddIcon from '@mui/icons-material/PostAdd';
import SettingsIcon from '@mui/icons-material/Settings';

const DashboardPage = () => {
  const { currentUser, teamId, isAdmin } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const [team, setTeam] = useState(null);
  const [pendingGameRequests, setPendingGameRequests] = useState([]);
  const [pendingResults, setPendingResults] = useState([]);
  const [teamsMap, setTeamsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [showTeamSettings, setShowTeamSettings] = useState(false);

  // State for Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [editFormData, setEditFormData] = useState({ homeScore: '', awayScore: '' });

  const darkInputStyle = {
    '& label.Mui-focused': { color: '#00A99D' },
    '& .MuiOutlinedInput-root': {
        '& fieldset': { borderColor: 'grey.700' },
        '&:hover fieldset': { borderColor: 'grey.500' },
        '&.Mui-focused fieldset': { borderColor: '#00A99D' },
    },
    '& .MuiInputBase-input': { color: 'grey.100', colorScheme: 'dark' },
    '& label': { color: 'grey.400' },
  };

  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const teamsSnap = await getDocs(collection(db, 'teams'));
      const map = {};
      let currentTeam = null;
      teamsSnap.docs.forEach(d => {
        const teamData = d.data();
        map[d.id] = teamData;
        if (d.id === teamId) {
          currentTeam = { id: d.id, ...teamData };
        }
      });
      setTeamsMap(map);
      setTeam(currentTeam);

      const seasonsSnap = await getDocs(query(collection(db, 'seasons'), where('isCurrent', '==', true)));
      const current = seasonsSnap.docs.length > 0 ? { id: seasonsSnap.docs[0].id, ...seasonsSnap.docs[0].data() } : null;
      setCurrentSeason(current);

      if (current && teamId) {
        const bookingsQuery = query(collection(db, 'bookings'), where('seasonId', '==', current.id), where('status', '==', 'pending_away_confirm'), where('awayTeamId', '==', teamId));
        const bookingsSnap = await getDocs(bookingsQuery);
        const gameRequests = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPendingGameRequests(gameRequests);

        const resultsQuery = query(collection(db, 'results'), where('seasonId', '==', current.id), where('status', '==', 'pending'));
        const resultsSnap = await getDocs(resultsQuery);
        const results = resultsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(result => (result.homeTeamId === teamId || result.awayTeamId === teamId) && result.reportedBy !== currentUser.uid);
        setPendingResults(results);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Dashboard-Daten:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, teamId]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    } else {
      fetchData();
    }
  }, [currentUser, navigate, fetchData]);

  const handleAction = async (collectionName, docId, data) => {
    try {
      await updateDoc(doc(db, collectionName, docId), { ...data, updatedAt: serverTimestamp() });
      fetchData();
    } catch (error) {
      console.error(`Fehler bei Aktion für ${collectionName}/${docId}:`, error);
    }
  };

  const handleOpenEditModal = (result) => {
    setSelectedResult(result);
    setEditFormData({ homeScore: result.homeScore, awayScore: result.awayScore });
    setIsEditModalOpen(true);
  };

  const handleUpdateResult = async (e) => {
    e.preventDefault();
    if (!selectedResult) return;
    await handleAction('results', selectedResult.id, {
      homeScore: parseInt(editFormData.homeScore),
      awayScore: parseInt(editFormData.awayScore),
      status: 'pending',
      editedBy: currentUser.uid,
    });
    setIsEditModalOpen(false);
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  }

  const renderIconButton = (title, icon, link, onClick) => (
    <Grid xs={isAdmin && teamId ? 3 : 4} sm>
      <Tooltip title={title} placement="bottom">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <IconButton
            component={link ? Link : 'button'}
            to={link}
            onClick={onClick}
            sx={{
              border: '1px solid',
              borderColor: 'grey.700',
              color: 'grey.300',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                borderColor: '#FFBF00',
                color: '#FFBF00',
              },
            }}
          >
            {icon}
          </IconButton>
          {isDesktop && (
            <Typography variant="caption" sx={{ mt: 0.5, color: 'grey.400' }}>
              {title}
            </Typography>
          )}
        </Box>
      </Tooltip>
    </Grid>
  );

  return (
    <Container maxWidth="md" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
      <Grid container spacing={3} direction="column">
        
        {/* Header */}
        <Grid sx={{ textAlign: 'center' }}>
          <Typography variant="h4" component="h1" sx={{ color: '#00A99D', fontFamily: 'comfortaa', fontWeight: 700, mb: 2, textTransform: 'uppercase' }}>
            Teamboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Avatar src={team?.logoUrl} sx={{ width: 48, height: 48, bgcolor: team?.logoColor || '#00A99D' }}>
              {!team?.logoUrl && team?.name ? team.name.charAt(0).toUpperCase() : null}
            </Avatar>
            <Typography variant="h6" component="h2" sx={{ fontFamily: 'comfortaa', color: 'common.white' }}>
              {team?.name || (isAdmin ? 'Administrator' : 'Ohne Team')}
            </Typography>
          </Box>
        </Grid>

        {/* Action Icon Bar */}
        <Grid>
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              border: '1px solid',
              borderColor: 'grey.700',
              borderRadius: '16px',
              backgroundColor: 'transparent',
            }}
          >
            <Grid container spacing={1} justifyContent="space-around" alignItems="center">
              {isAdmin && renderIconButton('Verwaltung', <AdminPanelSettingsIcon />, '/admin')}
              {renderIconButton('Platz buchen', <AddCircleOutlineIcon />, '/platzreservierung')}
              {renderIconButton('Ergebnis melden', <PostAddIcon />, '/ergebnis-melden')}
              {teamId && renderIconButton('Team-Einstellungen', <SettingsIcon />, null, () => setShowTeamSettings(true))}
            </Grid>
          </Paper>
        </Grid>

        {/* Pending Requests */}
        {(pendingResults.length > 0 || pendingGameRequests.length > 0) && (
          <Grid>
            <Typography variant="h5" sx={{ fontFamily: 'comfortaa', color: 'warning.main', textAlign: 'center', mb: 2, textTransform: 'uppercase' }}>Ausstehende Anfragen</Typography>
            {pendingResults.map(result => (
              <Alert severity="warning" key={result.id} sx={{ mb: 2, bgcolor: 'rgba(255, 152, 0, 0.1)' }}>
                <AlertTitle>Ergebnisbestätigung ausstehend</AlertTitle>
                {teamsMap[result.homeTeamId]?.name} vs. {teamsMap[result.awayTeamId]?.name} - <strong>{result.homeScore}:{result.awayScore}</strong>
                <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button size="small" variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => handleAction('results', result.id, { status: 'confirmed', confirmedBy: currentUser.uid, confirmedAt: serverTimestamp() })}>Bestätigen</Button>
                  <Button size="small" variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => handleAction('results', result.id, { status: 'rejected', rejectedBy: currentUser.uid, rejectedAt: serverTimestamp() })}>Ablehnen</Button>
                  <Button size="small" variant="outlined" color="info" startIcon={<EditIcon />} onClick={() => handleOpenEditModal(result)}>Korrigieren</Button>
                </Box>
              </Alert>
            ))}
            {pendingGameRequests.map(booking => (
              <Alert severity="info" key={booking.id} sx={{ mb: 2, bgcolor: 'rgba(3, 169, 244, 0.1)' }}>
                <AlertTitle>Spielanfrage</AlertTitle>
                {teamsMap[booking.homeTeamId]?.name} vs. {teamsMap[booking.awayTeamId]?.name} am {new Date(booking.date).toLocaleDateString('de-DE')} um {booking.time}
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Button size="small" variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => handleAction('bookings', booking.id, { status: 'confirmed', confirmedByUserId: currentUser.uid })}>Annehmen</Button>
                  <Button size="small" variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => handleAction('bookings', booking.id, { status: 'cancelled' })}>Ablehnen</Button>
                </Box>
              </Alert>
            ))}
          </Grid>
        )}

        {/* Upcoming Games using DynamicFixtureList */}
        <Grid>
          <DynamicFixtureList title="BEVORSTEHENDE SPIELE" details={true} seasonId={currentSeason?.id} showType="upcoming" userTeamId={teamId} />
        </Grid>

        {/* League Table */}
        <Grid>
          <DynamicLeagueTable title="AKTUELLE TABELLE" form={false} seasonId={currentSeason?.id} userTeamId={teamId} />
        </Grid>

        {/* Past Games */}
        <Grid>
          <DynamicFixtureList title="VERGANGENE SPIELE" details={false} seasonId={currentSeason?.id} showType="results" userTeamId={teamId} />
        </Grid>
      </Grid>

      {showTeamSettings && <TeamSettings onClose={() => setShowTeamSettings(false)} />}
      
      <ReusableModal open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Ergebnis korrigieren">
        <form onSubmit={handleUpdateResult}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography>Passe das Ergebnis an. Dein Gegner muss die Änderung erneut bestätigen.</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TextField size="small" label="Tore Heim" type="number" fullWidth required value={editFormData.homeScore} onChange={(e) => setEditFormData({ ...editFormData, homeScore: e.target.value })} sx={darkInputStyle} />
              <Typography sx={{ color: 'grey.400' }}>:</Typography>
              <TextField size="small" label="Tore Auswärts" type="number" fullWidth required value={editFormData.awayScore} onChange={(e) => setEditFormData({ ...editFormData, awayScore: e.target.value })} sx={darkInputStyle} />
            </Box>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button variant="outlined" onClick={() => setIsEditModalOpen(false)} sx={{ color: 'grey.400', borderColor: 'grey.700' }}>Abbrechen</Button>
              <Button type="submit" variant="contained" sx={{ backgroundColor: '#00A99D' }}>Korrektur senden</Button>
            </Box>
          </Box>
        </form>
      </ReusableModal>
    </Container>
  );
};

export default DashboardPage;
