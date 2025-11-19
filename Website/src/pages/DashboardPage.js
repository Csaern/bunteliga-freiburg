// src/pages/DashboardPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import DynamicLeagueTable from '../components/DynamicLeagueTable';
import DynamicFixtureList from '../components/DynamicFixtureList';
import TeamSettings from '../components/TeamSettings';
import { Box, Typography, Button, Container, CircularProgress, Avatar, Grid, TextField, Paper, IconButton, Tooltip, useTheme, useMediaQuery, Chip, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { API_BASE_URL } from '../services/apiClient';
import { ReusableModal } from '../components/Helpers/modalUtils';
import * as seasonApi from '../services/seasonApiService';
import * as teamApi from '../services/teamApiService';
import * as bookingApi from '../services/bookingApiService';
import * as resultApi from '../services/resultApiService';

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
  const [pendingMyRequests, setPendingMyRequests] = useState([]);
  const [pendingResults, setPendingResults] = useState([]);
  const [teamsMap, setTeamsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [showTeamSettings, setShowTeamSettings] = useState(false);

  // State for Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [editFormData, setEditFormData] = useState({ homeScore: '', awayScore: '' });
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportForm, setReportForm] = useState({ bookingId: '', homeScore: '', awayScore: '' });
  const [reportOptions, setReportOptions] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  const sectionCardSx = {
    borderRadius: 4,
    border: '1px solid',
    borderColor: 'grey.800',
    background: 'linear-gradient(135deg, rgba(0, 169, 157, 0.12) 0%, rgba(17, 17, 17, 0.92) 100%)',
    boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
    p: { xs: 2, sm: 3 },
    display: 'flex',
    flexDirection: 'column',
    gap: 1.5,
  };

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
      const activeSeason = await seasonApi.getActiveSeason();
      setCurrentSeason(activeSeason);

      const teamsArr = await teamApi.getTeamsForActiveSeason().catch(() => []);
      const map = teamsArr.reduce((acc, t) => { acc[t.id] = { name: t.name, logoUrl: t.logoUrl, logoColor: t.logoColor }; return acc; }, {});
      setTeamsMap(map);
      if (teamId && map[teamId]) {
        setTeam({ id: teamId, name: map[teamId].name, logoUrl: map[teamId].logoUrl, logoColor: map[teamId].logoColor });
      } else if (teamId) {
        try {
          const fallbackTeam = await teamApi.getTeamByIdPublic(teamId);
          if (fallbackTeam) {
            setTeamsMap(prev => ({
              ...prev,
              [teamId]: { name: fallbackTeam.name, logoUrl: fallbackTeam.logoUrl, logoColor: fallbackTeam.logoColor }
            }));
            setTeam({
              id: teamId,
              name: fallbackTeam.name,
              logoUrl: fallbackTeam.logoUrl,
              logoColor: fallbackTeam.logoColor
            });
          }
        } catch (fallbackError) {
          console.warn('Team konnte nicht geladen werden:', fallbackError);
        }
      }

      if (activeSeason?.id && teamId) {
        // Pending game requests: zukünftige Spiele für mein Team, Status pending_away_confirm und ich bin Auswärtsteam
        const upcoming = await bookingApi.getUpcomingBookingsForTeam(activeSeason.id, teamId).catch(() => []);
        const pendingRequests = upcoming.filter(b => b.status === 'pending_away_confirm' && b.awayTeamId === teamId);
        setPendingGameRequests(pendingRequests);

        // Pending my requests: Spiele, die von meinem Team angefragt wurden (ich bin Heimteam)
        const myRequests = upcoming.filter(b => b.status === 'pending_away_confirm' && b.homeTeamId === teamId);
        setPendingMyRequests(myRequests);

        // Pending results for my team
        const pendingRes = await resultApi.getPendingResultsForMyTeam().catch(() => []);
        // Filter sicherstellen (Backend sollte bereits filtern)
        const filteredPendingRes = pendingRes.filter(r => r.seasonId === activeSeason.id && (r.homeTeamId === teamId || r.awayTeamId === teamId));
        setPendingResults(filteredPendingRes);
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

  const handleAcceptBookingRequest = async (bookingId) => {
    try {
      const response = await bookingApi.respondToBookingRequest(bookingId, 'confirm');
      alert(response.message || 'Spiel bestätigt!');
      setPendingGameRequests((prev) => prev.filter((booking) => booking.id !== bookingId));
      fetchData();
    } catch (error) {
      alert(error.message || 'Fehler beim Bestätigen der Spielanfrage.');
    }
  };

  const handleDeclineBookingRequest = async (bookingId) => {
    try {
      const reason = window.prompt('Optional: Grund für die Ablehnung angeben', '') || '';
      const response = await bookingApi.respondToBookingRequest(bookingId, 'deny', reason);
      alert(response.message || 'Anfrage abgelehnt.');
      setPendingGameRequests((prev) => prev.filter((booking) => booking.id !== bookingId));
      fetchData();
    } catch (error) {
      alert(error.message || 'Fehler beim Ablehnen der Spielanfrage.');
    }
  };

  const handleCancelMyRequest = async (bookingId) => {
    try {
      const confirmed = window.confirm('Möchten Sie diese Spielanfrage wirklich stornieren?');
      if (!confirmed) return;
      
      await bookingApi.cancelBooking(bookingId);
      alert('Spielanfrage erfolgreich storniert.');
      setPendingMyRequests((prev) => prev.filter((booking) => booking.id !== bookingId));
      fetchData();
    } catch (error) {
      alert(error.message || 'Fehler beim Stornieren der Spielanfrage.');
    }
  };

  const loadReportOptions = useCallback(async () => {
    if (!currentSeason?.id || !teamId) {
      setReportOptions([]);
      setReportForm(prev => ({ ...prev, bookingId: '' }));
      return;
    }
    setReportLoading(true);
    try {
      const [pastNeedingResult, upcomingBookings] = await Promise.all([
        bookingApi.getBookingsNeedingResultForMyTeam(currentSeason.id),
        bookingApi.getUpcomingBookingsForTeam(currentSeason.id, teamId).catch(() => []),
      ]);

      const confirmedUpcoming = Array.isArray(upcomingBookings)
        ? upcomingBookings.filter(booking => booking.status === 'confirmed')
        : [];

      const combined = [...pastNeedingResult, ...confirmedUpcoming];

      const uniqueById = new Map();
      combined.forEach(booking => {
        if (!booking || !booking.id) return;
        uniqueById.set(booking.id, booking);
      });

      const normalized = Array.from(uniqueById.values())
        .map(booking => {
          const dateObj = normalizeDate(booking.date);
          return {
            ...booking,
            _dateObj: dateObj,
            formattedDate: dateObj ? dateObj.toLocaleDateString('de-DE') : '-',
            formattedTime: dateObj ? dateObj.toTimeString().slice(0, 5) : '',
          };
        })
        .sort((a, b) => {
          const timeA = a._dateObj ? a._dateObj.getTime() : 0;
          const timeB = b._dateObj ? b._dateObj.getTime() : 0;
          return timeB - timeA;
        });

      setReportOptions(normalized);
      setReportForm(prev => ({
        ...prev,
        bookingId: normalized.length > 0 ? normalized[0].id : '',
      }));
    } catch (error) {
      console.error('Fehler beim Laden der Spiele für die Ergebnismeldung:', error);
      alert(error.message || 'Fehler beim Laden der Spiele für die Ergebnismeldung.');
    } finally {
      setReportLoading(false);
    }
  }, [currentSeason, teamId]);

  const handleOpenReportModal = () => {
    setIsReportModalOpen(true);
    loadReportOptions();
  };

  const handleCloseReportModal = () => {
    setIsReportModalOpen(false);
    setReportForm({ bookingId: '', homeScore: '', awayScore: '' });
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportForm.bookingId) {
      alert('Bitte wähle ein Spiel aus.');
      return;
    }
    if (reportForm.homeScore === '' || reportForm.awayScore === '') {
      alert('Bitte gib beide Ergebnisse ein.');
      return;
    }
    if (!teamId) {
      alert('Keinem Team zugeordnet.');
      return;
    }

    setReportSubmitting(true);
    try {
      await resultApi.reportResult(reportForm.bookingId, {
        homeScore: parseInt(reportForm.homeScore, 10),
        awayScore: parseInt(reportForm.awayScore, 10),
        reportedByTeamId: teamId,
      });
      alert('Ergebnis erfolgreich gemeldet!');
      handleCloseReportModal();
      fetchData();
    } catch (error) {
      console.error('Fehler beim Melden des Ergebnisses:', error);
      alert(error.message || 'Fehler beim Melden des Ergebnisses.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleConfirmPendingResult = async (result) => {
    if (!teamId) {
      alert('Keinem Team zugeordnet.');
      return;
    }
    try {
      const response = await resultApi.respondToResultAction(result.id, teamId, 'confirm');
      alert(response.message || 'Ergebnis bestätigt.');
      setPendingResults(prev => prev.filter(r => r.id !== result.id));
      fetchData();
    } catch (error) {
      console.error('Fehler beim Bestätigen des Ergebnisses:', error);
      alert(error.message || 'Fehler beim Bestätigen des Ergebnisses.');
    }
  };

  const handleRejectPendingResult = async (result) => {
    if (!teamId) {
      alert('Keinem Team zugeordnet.');
      return;
    }
    const reason = window.prompt('Optional: Grund für die Ablehnung angeben', '') || '';
    try {
      const response = await resultApi.respondToResultAction(result.id, teamId, 'reject', reason);
      alert(response.message || 'Ergebnis wurde abgelehnt.');
      setPendingResults(prev => prev.filter(r => r.id !== result.id));
      fetchData();
    } catch (error) {
      console.error('Fehler beim Ablehnen des Ergebnisses:', error);
      alert(error.message || 'Fehler beim Ablehnen des Ergebnisses.');
    }
  };

  const normalizeDate = (maybeDate) => {
    if (!maybeDate) return null;
    if (typeof maybeDate.toDate === 'function') return maybeDate.toDate();
    if (typeof maybeDate === 'object' && typeof maybeDate._seconds === 'number') {
      const milliseconds = maybeDate._seconds * 1000;
      if (typeof maybeDate._nanoseconds === 'number') {
        return new Date(milliseconds + (maybeDate._nanoseconds / 1000000));
      }
      return new Date(milliseconds);
    }
    const d = new Date(maybeDate);
    return isNaN(d.getTime()) ? null : d;
  };

  const handleOpenEditModal = (result) => {
    setSelectedResult(result);
    setEditFormData({ homeScore: result.homeScore, awayScore: result.awayScore });
    setIsEditModalOpen(true);
  };

  const handleUpdateResult = async (e) => {
    e.preventDefault();
    if (!selectedResult) return;
    // Platzhalter: Ergebnis-Korrektur über Backend-API folgt separat
    alert('Ergebniskorrektur folgt über Backend-API in einem nächsten Schritt.');
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
            <Avatar 
              src={team?.logoUrl ? (team.logoUrl.startsWith('http') ? team.logoUrl : `${API_BASE_URL}${team.logoUrl}`) : null} 
              sx={{ 
                width: 48, 
                height: 48, 
                bgcolor: team?.logoColor || '#00A99D',
                border: team?.logoUrl ? `1px solid ${team?.logoColor || '#00A99D'}` : 'none'
              }}
            >
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
              {renderIconButton('Ergebnis melden', <PostAddIcon />, null, handleOpenReportModal)}
              {teamId && renderIconButton('Team-Einstellungen', <SettingsIcon />, null, () => setShowTeamSettings(true))}
            </Grid>
          </Paper>
        </Grid>

        {/* Pending Requests */}
        {(pendingResults.length > 0 || pendingGameRequests.length > 0 || pendingMyRequests.length > 0) && (
          <Grid>
            <Typography
              variant="h5"
              sx={{
                fontFamily: 'comfortaa',
                color: '#FFBF00',
                textAlign: 'center',
                mb: 3,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Ausstehende Aktionen
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {pendingResults.map(result => (
                <Paper key={result.id} sx={sectionCardSx}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontFamily: 'comfortaa', color: 'grey.100', textTransform: 'uppercase' }}>
                      Ergebnisbestätigung
                    </Typography>
                    <Chip
                      label="Bestätigung ausstehend"
                      color="warning"
                      size="small"
                      sx={{
                        fontFamily: 'comfortaa',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        backgroundColor: 'rgba(255,191,0,0.2)',
                        color: '#FFBF00',
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Avatar
                      src={teamsMap[result.homeTeamId]?.logoUrl ? (teamsMap[result.homeTeamId].logoUrl.startsWith('http') ? teamsMap[result.homeTeamId].logoUrl : `${API_BASE_URL}${teamsMap[result.homeTeamId].logoUrl}`) : null}
                      sx={{
                        width: 24,
                        height: 24,
                        fontSize: '0.7rem',
                        color: theme.palette.getContrastText(teamsMap[result.homeTeamId]?.logoColor || theme.palette.grey[700]),
                        backgroundColor: teamsMap[result.homeTeamId]?.logoColor || theme.palette.grey[700],
                        border: teamsMap[result.homeTeamId]?.logoUrl ? `1px solid ${teamsMap[result.homeTeamId]?.logoColor || theme.palette.grey[700]}` : 'none'
                      }}
                    >
                      {!teamsMap[result.homeTeamId]?.logoUrl && (teamsMap[result.homeTeamId]?.name || 'H').substring(0, 1).toUpperCase()}
                    </Avatar>
                    <Typography variant="body1" sx={{ color: 'grey.200', fontFamily: 'comfortaa', fontSize: '0.9rem' }}>
                      {teamsMap[result.homeTeamId]?.name} vs. {teamsMap[result.awayTeamId]?.name}
                    </Typography>
                    <Avatar
                      src={teamsMap[result.awayTeamId]?.logoUrl ? (teamsMap[result.awayTeamId].logoUrl.startsWith('http') ? teamsMap[result.awayTeamId].logoUrl : `${API_BASE_URL}${teamsMap[result.awayTeamId].logoUrl}`) : null}
                      sx={{
                        width: 24,
                        height: 24,
                        fontSize: '0.7rem',
                        color: theme.palette.getContrastText(teamsMap[result.awayTeamId]?.logoColor || theme.palette.grey[700]),
                        backgroundColor: teamsMap[result.awayTeamId]?.logoColor || theme.palette.grey[700],
                        border: teamsMap[result.awayTeamId]?.logoUrl ? `1px solid ${teamsMap[result.awayTeamId]?.logoColor || theme.palette.grey[700]}` : 'none'
                      }}
                    >
                      {!teamsMap[result.awayTeamId]?.logoUrl && (teamsMap[result.awayTeamId]?.name || 'A').substring(0, 1).toUpperCase()}
                    </Avatar>
                  </Box>
                  <Typography variant="h6" sx={{ color: 'grey.100', fontFamily: 'comfortaa', fontWeight: 700 }}>
                    {result.homeScore} : {result.awayScore}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Button size="small" variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => handleConfirmPendingResult(result)}>
                      Bestätigen
                    </Button>
                    <Button size="small" variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => handleRejectPendingResult(result)}>
                      Ablehnen
                    </Button>
                  </Box>
                </Paper>
              ))}
              {pendingGameRequests.map(booking => {
                const d = normalizeDate(booking.date);
                const dateStr = d ? d.toLocaleDateString('de-DE') : '-';
                const timeStr = d ? d.toTimeString().slice(0, 5) : '-';

                return (
                  <Paper key={booking.id} sx={sectionCardSx}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontFamily: 'comfortaa', color: 'grey.100', textTransform: 'uppercase' }}>
                        Spielanfrage
                      </Typography>
                      <Chip
                        label="Antwort erforderlich"
                        size="small"
                        sx={{
                          fontFamily: 'comfortaa',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          backgroundColor: 'rgba(0,169,157,0.18)',
                          color: '#00A99D',
                        }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Avatar
                        src={teamsMap[booking.homeTeamId]?.logoUrl ? (teamsMap[booking.homeTeamId].logoUrl.startsWith('http') ? teamsMap[booking.homeTeamId].logoUrl : `${API_BASE_URL}${teamsMap[booking.homeTeamId].logoUrl}`) : null}
                        sx={{
                          width: 24,
                          height: 24,
                          fontSize: '0.7rem',
                          color: theme.palette.getContrastText(teamsMap[booking.homeTeamId]?.logoColor || theme.palette.grey[700]),
                          backgroundColor: teamsMap[booking.homeTeamId]?.logoColor || theme.palette.grey[700],
                          border: teamsMap[booking.homeTeamId]?.logoUrl ? `1px solid ${teamsMap[booking.homeTeamId]?.logoColor || theme.palette.grey[700]}` : 'none'
                        }}
                      >
                        {!teamsMap[booking.homeTeamId]?.logoUrl && (teamsMap[booking.homeTeamId]?.name || 'H').substring(0, 1).toUpperCase()}
                      </Avatar>
                      <Typography variant="body1" sx={{ color: 'grey.200', fontFamily: 'comfortaa', fontSize: '0.9rem' }}>
                        {teamsMap[booking.homeTeamId]?.name} vs. {teamsMap[booking.awayTeamId]?.name}
                      </Typography>
                      <Avatar
                        src={teamsMap[booking.awayTeamId]?.logoUrl ? (teamsMap[booking.awayTeamId].logoUrl.startsWith('http') ? teamsMap[booking.awayTeamId].logoUrl : `${API_BASE_URL}${teamsMap[booking.awayTeamId].logoUrl}`) : null}
                        sx={{
                          width: 24,
                          height: 24,
                          fontSize: '0.7rem',
                          color: theme.palette.getContrastText(teamsMap[booking.awayTeamId]?.logoColor || theme.palette.grey[700]),
                          backgroundColor: teamsMap[booking.awayTeamId]?.logoColor || theme.palette.grey[700],
                          border: teamsMap[booking.awayTeamId]?.logoUrl ? `1px solid ${teamsMap[booking.awayTeamId]?.logoColor || theme.palette.grey[700]}` : 'none'
                        }}
                      >
                        {!teamsMap[booking.awayTeamId]?.logoUrl && (teamsMap[booking.awayTeamId]?.name || 'A').substring(0, 1).toUpperCase()}
                      </Avatar>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'grey.400', fontFamily: 'comfortaa' }}>
                      {dateStr} • {timeStr} Uhr
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      <Button size="small" variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => handleAcceptBookingRequest(booking.id)}>
                        Annehmen
                      </Button>
                      <Button size="small" variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => handleDeclineBookingRequest(booking.id)}>
                        Ablehnen
                      </Button>
                    </Box>
                  </Paper>
                );
              })}
              {pendingMyRequests.map(booking => {
                const d = normalizeDate(booking.date);
                const dateStr = d ? d.toLocaleDateString('de-DE') : '-';
                const timeStr = d ? d.toTimeString().slice(0, 5) : '-';

                return (
                  <Paper key={booking.id} sx={sectionCardSx}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontFamily: 'comfortaa', color: 'grey.100', textTransform: 'uppercase' }}>
                        Spielanfrage
                      </Typography>
                      <Chip
                        label="Anfrage ausstehend"
                        size="small"
                        sx={{
                          fontFamily: 'comfortaa',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          backgroundColor: 'rgba(255,191,0,0.18)',
                          color: '#FFBF00',
                        }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Avatar
                        src={teamsMap[booking.homeTeamId]?.logoUrl ? (teamsMap[booking.homeTeamId].logoUrl.startsWith('http') ? teamsMap[booking.homeTeamId].logoUrl : `${API_BASE_URL}${teamsMap[booking.homeTeamId].logoUrl}`) : null}
                        sx={{
                          width: 24,
                          height: 24,
                          fontSize: '0.7rem',
                          color: theme.palette.getContrastText(teamsMap[booking.homeTeamId]?.logoColor || theme.palette.grey[700]),
                          backgroundColor: teamsMap[booking.homeTeamId]?.logoColor || theme.palette.grey[700],
                          border: teamsMap[booking.homeTeamId]?.logoUrl ? `1px solid ${teamsMap[booking.homeTeamId]?.logoColor || theme.palette.grey[700]}` : 'none'
                        }}
                      >
                        {!teamsMap[booking.homeTeamId]?.logoUrl && (teamsMap[booking.homeTeamId]?.name || 'H').substring(0, 1).toUpperCase()}
                      </Avatar>
                      <Typography variant="body1" sx={{ color: 'grey.200', fontFamily: 'comfortaa', fontSize: '0.9rem' }}>
                        {teamsMap[booking.homeTeamId]?.name} vs. {teamsMap[booking.awayTeamId]?.name}
                      </Typography>
                      <Avatar
                        src={teamsMap[booking.awayTeamId]?.logoUrl ? (teamsMap[booking.awayTeamId].logoUrl.startsWith('http') ? teamsMap[booking.awayTeamId].logoUrl : `${API_BASE_URL}${teamsMap[booking.awayTeamId].logoUrl}`) : null}
                        sx={{
                          width: 24,
                          height: 24,
                          fontSize: '0.7rem',
                          color: theme.palette.getContrastText(teamsMap[booking.awayTeamId]?.logoColor || theme.palette.grey[700]),
                          backgroundColor: teamsMap[booking.awayTeamId]?.logoColor || theme.palette.grey[700],
                          border: teamsMap[booking.awayTeamId]?.logoUrl ? `1px solid ${teamsMap[booking.awayTeamId]?.logoColor || theme.palette.grey[700]}` : 'none'
                        }}
                      >
                        {!teamsMap[booking.awayTeamId]?.logoUrl && (teamsMap[booking.awayTeamId]?.name || 'A').substring(0, 1).toUpperCase()}
                      </Avatar>
                    </Box>
                    <Typography variant="body2" sx={{ color: 'grey.400', fontFamily: 'comfortaa' }}>
                      {dateStr} • {timeStr} Uhr
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      <Button size="small" variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => handleCancelMyRequest(booking.id)}>
                        Stornieren
                      </Button>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
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

      <ReusableModal open={isReportModalOpen} onClose={handleCloseReportModal} title="Ergebnis melden">
        <Box component="form" onSubmit={handleReportSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {reportLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={32} sx={{ color: '#00A99D' }} />
            </Box>
          ) : reportOptions.length === 0 ? (
            <Typography sx={{ color: 'grey.100', fontFamily: 'comfortaa', textAlign: 'center' }}>
              Kein Spiel verfügbar. Sobald ein bestätigtes Spiel ohne Ergebnis vorliegt, kannst du es hier melden.
            </Typography>
          ) : (
            <>
              <Typography sx={{ color: 'grey.100', fontFamily: 'comfortaa', textAlign: 'center' }}>
                Wähle das Spiel aus und trage die erzielten Tore ein.
              </Typography>
              <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                <InputLabel sx={{ color: 'grey.200', fontFamily: 'comfortaa', '&.Mui-focused': { color: '#00A99D' } }}>
                  Spiel auswählen
                </InputLabel>
                <Select
                  label="Spiel auswählen"
                  value={reportForm.bookingId}
                  onChange={(e) => setReportForm(prev => ({ ...prev, bookingId: e.target.value }))}
                  sx={{
                    backgroundColor: '#fff',
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'grey.700' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00A99D' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00A99D' },
                    '& .MuiSelect-select': { color: '#000', fontFamily: 'comfortaa', fontWeight: 600 },
                    '& .MuiSvgIcon-root': { color: '#000' },
                  }}
                  MenuProps={{ PaperProps: { sx: { backgroundColor: '#fff', color: '#000', fontFamily: 'comfortaa' } } }}
                >
                  {reportOptions.map(option => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.formattedDate} {option.formattedTime} – {teamsMap[option.homeTeamId]?.name || 'Unbekannt'} vs. {teamsMap[option.awayTeamId]?.name || 'Unbekannt'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <TextField
                  type="number"
                  size="small"
                  label="Heim-Tore"
                  value={reportForm.homeScore}
                  onChange={(e) => setReportForm(prev => ({ ...prev, homeScore: e.target.value }))}
                  fullWidth
                  InputProps={{ inputProps: { min: 0 } }}
                  sx={{
                    flex: 1,
                    '& label': { color: 'grey.300', fontFamily: 'comfortaa' },
                    '& label.Mui-focused': { color: '#00A99D' },
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      color: '#fff',
                      fontFamily: 'comfortaa',
                      '& fieldset': { borderColor: 'grey.700' },
                      '&:hover fieldset': { borderColor: '#00A99D' },
                      '&.Mui-focused fieldset': { borderColor: '#00A99D' },
                    },
                  }}
                />
                <TextField
                  type="number"
                  size="small"
                  label="Auswärts-Tore"
                  value={reportForm.awayScore}
                  onChange={(e) => setReportForm(prev => ({ ...prev, awayScore: e.target.value }))}
                  fullWidth
                  InputProps={{ inputProps: { min: 0 } }}
                  sx={{
                    flex: 1,
                    '& label': { color: 'grey.300', fontFamily: 'comfortaa' },
                    '& label.Mui-focused': { color: '#00A99D' },
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      color: '#fff',
                      fontFamily: 'comfortaa',
                      '& fieldset': { borderColor: 'grey.700' },
                      '&:hover fieldset': { borderColor: '#00A99D' },
                      '&.Mui-focused fieldset': { borderColor: '#00A99D' },
                    },
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                <Button variant="outlined" onClick={handleCloseReportModal} sx={{ borderColor: '#00A99D', color: '#00A99D' }}>
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  sx={{ backgroundColor: '#00A99D' }}
                  disabled={reportSubmitting}
                >
                  {reportSubmitting ? 'Sende...' : 'Ergebnis melden'}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </ReusableModal>
    </Container>
  );
};

export default DashboardPage;
