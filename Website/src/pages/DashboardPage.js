import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import DynamicLeagueTable from '../components/DynamicLeagueTable';
import DynamicFixtureList from '../components/DynamicFixtureList';
import TeamSettings from '../components/TeamSettings';
import { Box, Typography, Button, Container, CircularProgress, Avatar, Grid, TextField, Paper, IconButton, Tooltip, useTheme, useMediaQuery, Chip, FormControl, InputLabel, Select, MenuItem, List, ListItem, ListItemIcon, ListItemText, Card, Divider, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { API_BASE_URL } from '../services/apiClient';
import { ReusableModal } from '../components/Helpers/modalUtils';
import * as seasonApi from '../services/seasonApiService';
import * as teamApi from '../services/teamApiService';
import * as bookingApi from '../services/bookingApiService';
import * as resultApi from '../services/resultApiService';

// Icons
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import PostAddIcon from '@mui/icons-material/PostAdd';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import GroupIcon from '@mui/icons-material/Group';
import EventIcon from '@mui/icons-material/Event';

const DashboardPage = () => {
  const { currentUser, teamId, isAdmin } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const [team, setTeam] = useState(null);
  const [pendingGameRequests, setPendingGameRequests] = useState([]);
  const [pendingMyRequests, setPendingMyRequests] = useState([]);
  const [pendingResults, setPendingResults] = useState([]);
  const [pendingMyResults, setPendingMyResults] = useState([]);
  const [teamsMap, setTeamsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [showTeamSettings, setShowTeamSettings] = useState(false);

  // State for Edit Modal
  const [selectedResult, setSelectedResult] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportForm, setReportForm] = useState({ bookingId: '', homeScore: '', awayScore: '' });
  const [reportOptions, setReportOptions] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // UI State for Notifications and Dialogs
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });
  const [promptDialog, setPromptDialog] = useState({ open: false, title: '', label: '', value: '', onConfirm: null });

  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const openConfirmDialog = (title, message, onConfirm) => {
    setConfirmDialog({ open: true, title, message, onConfirm });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog((prev) => ({ ...prev, open: false, onConfirm: null }));
  };

  const openPromptDialog = (title, label, onConfirm) => {
    setPromptDialog({ open: true, title, label, value: '', onConfirm });
  };

  const closePromptDialog = () => {
    setPromptDialog((prev) => ({ ...prev, open: false, onConfirm: null }));
  };

  const sectionCardSx = {
    borderRadius: 4,
    border: '1px solid',
    borderColor: theme.palette.divider,
    background: `linear-gradient(135deg, ${theme.palette.primary.main}1F 0%, ${theme.palette.background.paper} 100%)`,
    boxShadow: theme.shadows[4],
    p: { xs: 2, sm: 3 },
    display: 'flex',
    flexDirection: 'column',
    gap: 1.5,
  };

  const darkInputStyle = {
    '& label.Mui-focused': { color: theme.palette.primary.main },
    '& .MuiOutlinedInput-root': {
      '& fieldset': { borderColor: theme.palette.grey[700] },
      '&:hover fieldset': { borderColor: theme.palette.grey[500] },
      '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
    },
    '& .MuiInputBase-input': { color: theme.palette.text.primary },
    '& label': { color: theme.palette.text.secondary },
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
        // Pending game requests
        const upcoming = await bookingApi.getUpcomingBookingsForTeam(activeSeason.id, teamId).catch(() => []);
        const pendingRequests = upcoming.filter(b => b.status === 'pending_away_confirm' && b.awayTeamId === teamId);
        setPendingGameRequests(pendingRequests);

        // Pending my requests
        const myRequests = upcoming.filter(b => b.status === 'pending_away_confirm' && b.homeTeamId === teamId);
        setPendingMyRequests(myRequests);

        // Pending results
        const pendingRes = await resultApi.getPendingResultsForMyTeam().catch(() => []);
        const filteredPendingRes = pendingRes.filter(r => r.seasonId === activeSeason.id && (r.homeTeamId === teamId || r.awayTeamId === teamId));

        const toConfirm = filteredPendingRes.filter(r => r.reportedByTeamId !== teamId);
        const myReports = filteredPendingRes.filter(r => r.reportedByTeamId === teamId);

        setPendingResults(toConfirm);
        setPendingMyResults(myReports);
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
      return;
    }

    if (isAdmin && !teamId) {
      navigate('/admin/dashboard');
      return;
    }

    fetchData();
  }, [currentUser, isAdmin, teamId, navigate, fetchData]);

  const handleAcceptBookingRequest = async (bookingId) => {
    try {
      const response = await bookingApi.respondToBookingRequest(bookingId, 'confirm');
      showSnackbar(response.message || 'Spiel bestätigt!', 'success');
      setPendingGameRequests((prev) => prev.filter((booking) => booking.id !== bookingId));
      fetchData();
    } catch (error) {
      showSnackbar(error.message || 'Fehler beim Bestätigen der Spielanfrage.', 'error');
    }
  };

  const handleDeclineBookingRequest = async (bookingId) => {
    try {
      openPromptDialog('Spielanfrage ablehnen', 'Grund für die Ablehnung (optional)', async (reason) => {
        try {
          const response = await bookingApi.respondToBookingRequest(bookingId, 'deny', reason);
          showSnackbar(response.message || 'Anfrage abgelehnt.', 'success');
          setPendingGameRequests((prev) => prev.filter((booking) => booking.id !== bookingId));
          fetchData();
        } catch (error) {
          showSnackbar(error.message || 'Fehler beim Ablehnen der Spielanfrage.', 'error');
        }
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleCancelMyRequest = async (bookingId) => {
    openConfirmDialog('Stornierung bestätigen', 'Möchten Sie diese Spielanfrage wirklich stornieren?', async () => {
      try {
        await bookingApi.cancelBooking(bookingId);
        showSnackbar('Spielanfrage erfolgreich storniert.', 'success');
        setPendingMyRequests((prev) => prev.filter((booking) => booking.id !== bookingId));
        fetchData();
      } catch (error) {
        showSnackbar(error.message || 'Fehler beim Stornieren der Spielanfrage.', 'error');
      }
    });
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
      showSnackbar(error.message || 'Fehler beim Laden der Spiele für die Ergebnismeldung.', 'error');
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
      showSnackbar('Bitte wähle ein Spiel aus.', 'warning');
      return;
    }
    if (reportForm.homeScore === '' || reportForm.awayScore === '') {
      showSnackbar('Bitte gib beide Ergebnisse ein.', 'warning');
      return;
    }
    if (!teamId) {
      showSnackbar('Keinem Team zugeordnet.', 'error');
      return;
    }

    setReportSubmitting(true);
    try {
      await resultApi.reportResult(reportForm.bookingId, {
        homeScore: parseInt(reportForm.homeScore, 10),
        awayScore: parseInt(reportForm.awayScore, 10),
        reportedByTeamId: teamId,
      });
      showSnackbar('Ergebnis erfolgreich gemeldet!', 'success');
      handleCloseReportModal();
      fetchData();
    } catch (error) {
      console.error('Fehler beim Melden des Ergebnisses:', error);
      showSnackbar(error.message || 'Fehler beim Melden des Ergebnisses.', 'error');
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleConfirmPendingResult = async (result) => {
    if (!teamId) {
      showSnackbar('Keinem Team zugeordnet.', 'error');
      return;
    }
    try {
      const response = await resultApi.respondToResultAction(result.id, teamId, 'confirm');
      showSnackbar(response.message || 'Ergebnis bestätigt.', 'success');
      setPendingResults(prev => prev.filter(r => r.id !== result.id));
      fetchData();
    } catch (error) {
      console.error('Fehler beim Bestätigen des Ergebnisses:', error);
      showSnackbar(error.message || 'Fehler beim Bestätigen des Ergebnisses.', 'error');
    }
  };

  const handleRejectPendingResult = async (result) => {
    if (!teamId) {
      showSnackbar('Keinem Team zugeordnet.', 'error');
      return;
    }
    openPromptDialog('Ergebnis ablehnen', 'Grund für die Ablehnung (optional)', async (reason) => {
      try {
        const response = await resultApi.respondToResultAction(result.id, teamId, 'reject', reason);
        showSnackbar(response.message || 'Ergebnis wurde abgelehnt.', 'success');
        setPendingResults(prev => prev.filter(r => r.id !== result.id));
        fetchData();
      } catch (error) {
        console.error('Fehler beim Ablehnen des Ergebnisses:', error);
        showSnackbar(error.message || 'Fehler beim Ablehnen des Ergebnisses.', 'error');
      }
    });
  };

  const handleCancelReport = async (resultId) => {
    openConfirmDialog('Meldung zurückziehen', 'Möchtest du diese Ergebnismeldung wirklich zurückziehen?', async () => {
      try {
        await resultApi.cancelReport(resultId, teamId);
        showSnackbar('Ergebnismeldung zurückgezogen.', 'success');
        setPendingMyResults(prev => prev.filter(r => r.id !== resultId));
        fetchData();
      } catch (error) {
        console.error('Fehler beim Zurückziehen:', error);
        showSnackbar(error.message || 'Fehler beim Zurückziehen.', 'error');
      }
    });
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
              borderColor: theme.palette.divider,
              color: theme.palette.text.secondary,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: `${theme.palette.secondary.main}1A`,
                borderColor: theme.palette.secondary.main,
                color: theme.palette.secondary.main,
              },
            }}
          >
            {icon}
          </IconButton>
          {isDesktop && (
            <Typography variant="caption" sx={{ mt: 0.5, color: theme.palette.text.secondary }}>
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
          <Typography variant="h4" component="h1" sx={{ color: theme.palette.primary.main, fontFamily: 'Comfortaa', fontWeight: 700, mb: 2, textTransform: 'uppercase' }}>
            Teamboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Avatar
              src={team?.logoUrl ? (team.logoUrl.startsWith('http') ? team.logoUrl : `${API_BASE_URL}${team.logoUrl}`) : null}
              sx={{
                width: 48,
                height: 48,
                bgcolor: team?.logoColor || theme.palette.primary.main,
                border: team?.logoUrl ? `1px solid ${team?.logoColor || theme.palette.primary.main}` : 'none'
              }}
            >
              {!team?.logoUrl && team?.name ? team.name.charAt(0).toUpperCase() : null}
            </Avatar>
            <Typography variant="h6" component="h2" sx={{ fontFamily: 'Comfortaa', color: theme.palette.common.white }}>
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
              borderColor: theme.palette.divider,
              borderRadius: '16px',
              backgroundColor: 'transparent',
            }}
          >
            <Grid container spacing={1} justifyContent="space-around" alignItems="center">
              {renderIconButton('Platz buchen', <AddCircleOutlineIcon />, '/platzreservierung')}
              {renderIconButton('Ergebnis melden', <PostAddIcon />, null, handleOpenReportModal)}
              {teamId && renderIconButton('Team-Einstellungen', <SettingsIcon />, null, () => setShowTeamSettings(true))}
            </Grid>
          </Paper>
        </Grid>

        {/* Pending Requests */}
        {(pendingResults.length > 0 || pendingGameRequests.length > 0 || pendingMyRequests.length > 0 || pendingMyResults.length > 0) && (
          <Grid>
            <Typography
              variant="h5"
              sx={{
                fontFamily: 'Comfortaa',
                color: theme.palette.secondary.main,
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
                    <Typography variant="subtitle1" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.primary, textTransform: 'uppercase' }}>
                      Ergebnisbestätigung
                    </Typography>
                    <Chip
                      label="Bestätigung ausstehend"
                      color="warning"
                      size="small"
                      sx={{
                        fontFamily: 'Comfortaa',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        backgroundColor: `${theme.palette.secondary.main}33`,
                        color: theme.palette.secondary.main,
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
                    <Typography variant="body1" sx={{ color: theme.palette.text.secondary, fontFamily: 'Comfortaa', fontSize: '0.9rem' }}>
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
                  <Typography variant="h6" sx={{ color: theme.palette.text.primary, fontFamily: 'Comfortaa', fontWeight: 700 }}>
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
              {pendingMyResults.map(result => (
                <Paper key={result.id} sx={sectionCardSx}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.primary, textTransform: 'uppercase' }}>
                      Ergebnis gemeldet
                    </Typography>
                    <Chip
                      label="Warte auf Bestätigung"
                      size="small"
                      sx={{
                        fontFamily: 'Comfortaa',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        backgroundColor: `${theme.palette.info.main}33`,
                        color: theme.palette.info.main,
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
                    <Typography variant="body1" sx={{ color: theme.palette.text.secondary, fontFamily: 'Comfortaa', fontSize: '0.9rem' }}>
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
                  <Typography variant="h6" sx={{ color: theme.palette.text.primary, fontFamily: 'Comfortaa', fontWeight: 700 }}>
                    {result.homeScore} : {result.awayScore}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Button size="small" variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => handleCancelReport(result.id)}>
                      Stornieren
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
                      <Typography variant="subtitle1" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.primary, textTransform: 'uppercase' }}>
                        Spielanfrage
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {booking.friendly && (
                          <Chip
                            label="Freundschaftsspiel"
                            size="small"
                            sx={{
                              fontFamily: 'Comfortaa',
                              fontWeight: 600,
                              letterSpacing: '0.04em',
                              backgroundColor: `${theme.palette.warning.main}2E`,
                              color: theme.palette.warning.main,
                            }}
                          />
                        )}
                        <Chip
                          label="Antwort erforderlich"
                          size="small"
                          sx={{
                            fontFamily: 'Comfortaa',
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            backgroundColor: `${theme.palette.primary.main}2E`,
                            color: theme.palette.primary.main,
                          }}
                        />
                      </Box>
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
                      <Typography variant="body1" sx={{ color: theme.palette.text.secondary, fontFamily: 'Comfortaa', fontSize: '0.9rem' }}>
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
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontFamily: 'Comfortaa' }}>
                      {dateStr} • {timeStr} Uhr • {booking.pitchName || 'Unbekannter Platz'}
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
                      <Typography variant="subtitle1" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.primary, textTransform: 'uppercase' }}>
                        Spielanfrage
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {booking.friendly && (
                          <Chip
                            label="Freundschaftsspiel"
                            size="small"
                            sx={{
                              fontFamily: 'Comfortaa',
                              fontWeight: 600,
                              letterSpacing: '0.04em',
                              backgroundColor: `${theme.palette.warning.main}2E`,
                              color: theme.palette.warning.main,
                            }}
                          />
                        )}
                        <Chip
                          label="Anfrage ausstehend"
                          size="small"
                          sx={{
                            fontFamily: 'Comfortaa',
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            backgroundColor: `${theme.palette.secondary.main}2E`,
                            color: theme.palette.secondary.main,
                          }}
                        />
                      </Box>
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
                      <Typography variant="body1" sx={{ color: theme.palette.text.secondary, fontFamily: 'Comfortaa', fontSize: '0.9rem' }}>
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
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontFamily: 'Comfortaa' }}>
                      {dateStr} • {timeStr} Uhr • {booking.pitchName || 'Unbekannter Platz'}
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

      <ReusableModal open={isReportModalOpen} onClose={handleCloseReportModal} title="Ergebnis melden">
        <Box component="form" onSubmit={handleReportSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {reportLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={32} sx={{ color: theme.palette.primary.main }} />
            </Box>
          ) : reportOptions.length === 0 ? (
            <Typography sx={{ color: theme.palette.text.primary, fontFamily: 'Comfortaa', textAlign: 'center' }}>
              Kein Spiel verfügbar. Sobald ein bestätigtes Spiel ohne Ergebnis vorliegt, kannst du es hier melden.
            </Typography>
          ) : (
            <>
              <Typography sx={{ color: theme.palette.text.primary, fontFamily: 'Comfortaa', textAlign: 'center' }}>
                Wähle das Spiel aus und trage die erzielten Tore ein.
              </Typography>
              <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                <InputLabel sx={{ color: theme.palette.text.secondary, fontFamily: 'Comfortaa', '&.Mui-focused': { color: theme.palette.primary.main } }}>
                  Spiel auswählen
                </InputLabel>
                <Select
                  label="Spiel auswählen"
                  value={reportForm.bookingId}
                  onChange={(e) => setReportForm(prev => ({ ...prev, bookingId: e.target.value }))}
                  sx={{
                    backgroundColor: theme.palette.background.paper,
                    borderRadius: 2,
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.divider },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                    '& .MuiSelect-select': { color: theme.palette.text.primary, fontFamily: 'Comfortaa', fontWeight: 600 },
                    '& .MuiSvgIcon-root': { color: theme.palette.text.primary },
                  }}
                  MenuProps={{ PaperProps: { sx: { backgroundColor: theme.palette.background.paper, color: theme.palette.text.primary, fontFamily: 'Comfortaa' } } }}
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
                    '& label': { color: theme.palette.text.secondary, fontFamily: 'Comfortaa' },
                    '& label.Mui-focused': { color: theme.palette.primary.main },
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      color: theme.palette.text.primary,
                      fontFamily: 'Comfortaa',
                      '& fieldset': { borderColor: theme.palette.divider },
                      '&:hover fieldset': { borderColor: theme.palette.primary.main },
                      '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
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
                    '& label': { color: theme.palette.text.secondary, fontFamily: 'Comfortaa' },
                    '& label.Mui-focused': { color: theme.palette.primary.main },
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      color: theme.palette.text.primary,
                      fontFamily: 'Comfortaa',
                      '& fieldset': { borderColor: theme.palette.divider },
                      '&:hover fieldset': { borderColor: theme.palette.primary.main },
                      '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
                    },
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
                <Button variant="outlined" onClick={handleCloseReportModal} sx={{ borderColor: theme.palette.primary.main, color: theme.palette.primary.main }}>
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  sx={{ backgroundColor: theme.palette.primary.main }}
                  disabled={reportSubmitting}
                >
                  {reportSubmitting ? 'Sende...' : 'Ergebnis melden'}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </ReusableModal>
      {/* Snackbar for Notifications */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%', fontFamily: 'Comfortaa' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={closeConfirmDialog}
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
            border: `1px solid ${theme.palette.divider}`,
          }
        }}
      >
        <DialogTitle sx={{ fontFamily: 'Comfortaa', fontWeight: 700, color: theme.palette.text.primary }}>
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.secondary }}>
            {confirmDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeConfirmDialog} sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.secondary }}>
            Abbrechen
          </Button>
          <Button
            onClick={() => {
              if (confirmDialog.onConfirm) confirmDialog.onConfirm();
              closeConfirmDialog();
            }}
            variant="contained"
            color="primary"
            sx={{ fontFamily: 'Comfortaa', borderRadius: 2 }}
          >
            Bestätigen
          </Button>
        </DialogActions>
      </Dialog>

      {/* Prompt Dialog */}
      <Dialog
        open={promptDialog.open}
        onClose={closePromptDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
            border: `1px solid ${theme.palette.divider}`,
          }
        }}
      >
        <DialogTitle sx={{ fontFamily: 'Comfortaa', fontWeight: 700, color: theme.palette.text.primary }}>
          {promptDialog.title}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={promptDialog.label}
            type="text"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={promptDialog.value}
            onChange={(e) => setPromptDialog(prev => ({ ...prev, value: e.target.value }))}
            sx={{
              mt: 1,
              '& label': { color: theme.palette.text.secondary, fontFamily: 'Comfortaa' },
              '& label.Mui-focused': { color: theme.palette.primary.main },
              '& .MuiOutlinedInput-root': {
                fontFamily: 'Comfortaa',
                '& fieldset': { borderColor: theme.palette.divider },
                '&:hover fieldset': { borderColor: theme.palette.primary.main },
                '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closePromptDialog} sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.secondary }}>
            Abbrechen
          </Button>
          <Button
            onClick={() => {
              if (promptDialog.onConfirm) promptDialog.onConfirm(promptDialog.value);
              closePromptDialog();
            }}
            variant="contained"
            color="primary"
            sx={{ fontFamily: 'Comfortaa', borderRadius: 2 }}
          >
            Bestätigen
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DashboardPage;
