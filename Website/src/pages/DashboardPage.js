import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import DynamicLeagueTable from '../components/DynamicLeagueTable';
import DynamicFixtureList from '../components/DynamicFixtureList';
import TeamSettings from '../components/TeamSettings';
import CreateGameModal from '../components/Modals/CreateGameModal';
import { Box, Typography, Button, Container, CircularProgress, Avatar, Grid, TextField, Paper, IconButton, Tooltip, useTheme, useMediaQuery, Chip, Snackbar, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Alert } from '@mui/material';
import { API_BASE_URL } from '../services/apiClient';
import { ReusableModal } from '../components/Helpers/modalUtils';
import * as seasonApi from '../services/seasonApiService';
import * as teamApi from '../services/teamApiService';
import * as bookingApi from '../services/bookingApiService';
import * as resultApi from '../services/resultApiService';
import { getRequestExpiryInfo } from '../components/Helpers/dateUtils';

// Icons
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import PostAddIcon from '@mui/icons-material/PostAdd';
import SettingsIcon from '@mui/icons-material/Settings';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

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
  const [notificationBookings, setNotificationBookings] = useState([]); // NEU: Fehlende Ergebnisse
  const [teamsMap, setTeamsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [showTeamSettings, setShowTeamSettings] = useState(false);
  const [isCreateGameModalOpen, setIsCreateGameModalOpen] = useState(false);


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
    background: theme.palette.background.paper,
    boxShadow: 'none', // Cleaner look matches other tables
    p: { xs: 2, sm: 3 },
    display: 'flex',
    flexDirection: 'column',
    gap: 1.5,
  };



  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const activeSeason = await seasonApi.getActiveSeason();
      setCurrentSeason(activeSeason);

      const teamsArr = await teamApi.getTeamsForActiveSeason().catch(() => []);
      const map = teamsArr.reduce((acc, t) => { acc[t.id] = { name: t.name, logoUrl: t.logoUrl, logoUrlLight: t.logoUrlLight, logoColor: t.logoColor }; return acc; }, {});
      setTeamsMap(map);
      if (teamId && map[teamId]) {
        setTeam({ id: teamId, name: map[teamId].name, logoUrl: map[teamId].logoUrl, logoUrlLight: map[teamId].logoUrlLight, logoColor: map[teamId].logoColor });
      } else if (teamId) {
        try {
          const fallbackTeam = await teamApi.getTeamByIdPublic(teamId);
          if (fallbackTeam) {
            setTeamsMap(prev => ({
              ...prev,
              [teamId]: { name: fallbackTeam.name, logoUrl: fallbackTeam.logoUrl, logoUrlLight: fallbackTeam.logoUrlLight, logoColor: fallbackTeam.logoColor }
            }));
            setTeam({
              id: teamId,
              name: fallbackTeam.name,
              logoUrl: fallbackTeam.logoUrl,
              logoUrlLight: fallbackTeam.logoUrlLight,
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

        // Pending results (confirmed by me vs reported by me)
        const pendingRes = await resultApi.getPendingResultsForMyTeam().catch(() => []);
        const filteredPendingRes = pendingRes.filter(r => r.seasonId === activeSeason.id && (r.homeTeamId === teamId || r.awayTeamId === teamId));

        const toConfirm = filteredPendingRes.filter(r => r.reportedByTeamId !== teamId);
        const myReports = filteredPendingRes.filter(r => r.reportedByTeamId === teamId);

        setPendingResults(toConfirm);
        setPendingMyResults(myReports);

        // NEU: Spiele, für die noch kein Ergebnis gemeldet wurde (Vergangene, bestätigte Spiele)
        const needingResult = await bookingApi.getBookingsNeedingResultForMyTeam(activeSeason.id).catch(() => []);
        setNotificationBookings(needingResult);
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

  // Check for action query param
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'createGame') {
      setIsCreateGameModalOpen(true);
    }
  }, [location]);

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

  const loadReportOptions = useCallback(async (preSelectedBookingId = null) => {
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

      // Select logic: Pre-selection > existing selection > first option
      let initialId = '';
      if (preSelectedBookingId && uniqueById.has(preSelectedBookingId)) {
        initialId = preSelectedBookingId;
      } else if (normalized.length > 0) {
        initialId = normalized[0].id;
      }

      setReportForm(prev => ({
        ...prev,
        bookingId: initialId,
      }));
    } catch (error) {
      console.error('Fehler beim Laden der Spiele für die Ergebnismeldung:', error);
      showSnackbar(error.message || 'Fehler beim Laden der Spiele für die Ergebnismeldung.', 'error');
    } finally {
      setReportLoading(false);
    }
  }, [currentSeason, teamId]);

  const handleOpenReportModal = (preSelectedBookingId = null) => {
    setIsReportModalOpen(true);
    // Wir laden die Optionen und setzen DANN die ID
    loadReportOptions(preSelectedBookingId);
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

  const renderIconButton = (title, icon, link, color, onClick) => (
    <Grid xs={teamId ? 3 : 4} sm>
      <Tooltip title={title} placement="bottom">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <IconButton
            component={link ? Link : 'button'}
            to={link}
            onClick={onClick}
            sx={{
              border: '1px solid',
              borderColor: theme.palette.divider,
              color: color || theme.palette.primary.main,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: `${color || theme.palette.secondary.main}1A`,
                borderColor: color || theme.palette.secondary.main,
                color: color || theme.palette.secondary.main,
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

  const renderTeamLogo = (teamId) => {
    const teamData = teamsMap[teamId];
    if (!teamData) return <Avatar sx={{ width: 30, height: 30, fontSize: '0.75rem', bgcolor: theme.palette.grey[500] }}>?</Avatar>;

    // NEU: Light Mode Check
    const isLightMode = theme.palette.mode === 'light';
    const logoToUse = (isLightMode && teamData.logoUrlLight) ? teamData.logoUrlLight : teamData.logoUrl;

    if (logoToUse) {
      return (
        <Box
          component="img"
          src={logoToUse.startsWith('http') ? logoToUse : `${API_BASE_URL}${logoToUse}`}
          alt={teamData.name}
          sx={{
            width: 30,
            height: 30,
            objectFit: 'contain',
          }}
        />
      );
    }

    return (
      <Avatar
        sx={{
          width: 30,
          height: 30,
          fontSize: '0.75rem',
          color: theme.palette.getContrastText(teamData.logoColor || theme.palette.grey[700]),
          backgroundColor: teamData.logoColor || theme.palette.grey[700],
        }}
      >
        {(teamData.name || '?').substring(0, 1).toUpperCase()}
      </Avatar>
    );
  };

  return (
    <Container maxWidth="md" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
      <Grid container spacing={3} direction="column">

        {/* Header */}
        <Grid sx={{ textAlign: 'center' }}>
          <Typography variant={isDesktop ? 'h3' : 'h4'} component="h1" sx={{ color: theme.palette.primary.main, fontFamily: 'Comfortaa', fontWeight: 700, mb: 2, textTransform: 'uppercase' }}>
            Teamboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            {(() => {
              const isLightMode = theme.palette.mode === 'light';
              const logoToUse = (isLightMode && team?.logoUrlLight) ? team.logoUrlLight : team?.logoUrl;

              if (logoToUse) {
                return (
                  <Box
                    component="img"
                    src={logoToUse.startsWith('http') ? logoToUse : `${API_BASE_URL}${logoToUse}`}
                    alt={team.name}
                    sx={{
                      width: 64, // Slightly larger to look good without circle crop
                      height: 64,
                      objectFit: 'contain',
                    }}
                  />
                );
              } else {
                return (
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: team?.logoColor || theme.palette.primary.main,
                    }}
                  >
                    {team?.name ? team.name.charAt(0).toUpperCase() : null}
                  </Avatar>
                );
              }
            })()}
            <Typography variant="h6" component="h2" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.primary }}>
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
              {renderIconButton('Platz buchen', <EventIcon />, '/platzreservierung', '#4CAF50', null)}
              {renderIconButton('Neues Spiel', <AddCircleOutlineIcon />, null, '#2196F3', () => setIsCreateGameModalOpen(true))}
              {renderIconButton('Ergebnis melden', <PostAddIcon />, null, '#FFB74D', () => handleOpenReportModal())}
              {teamId && renderIconButton('Team-Einstellungen', <SettingsIcon />, null, '#9C27B0', () => setShowTeamSettings(true))}
            </Grid>
          </Paper>
        </Grid>

        {/* Pending Requests */}
        {(notificationBookings.length > 0 || pendingResults.length > 0 || pendingGameRequests.length > 0 || pendingMyRequests.length > 0 || pendingMyResults.length > 0) && (
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
              {/* NEU: Wichtigste Notification zuerst - Ergebnis melden */}
              {notificationBookings.map(booking => (
                <Paper key={booking.id} sx={{ ...sectionCardSx, borderColor: theme.palette.warning.main, borderWidth: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.primary, textTransform: 'uppercase' }}>
                      Ergebnis melden
                    </Typography>
                    <Chip
                      label="Ergebnis"
                      color="warning"
                      size="small"
                      sx={{
                        fontFamily: 'Comfortaa',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, my: 2, width: '100%' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flex: 1, textAlign: 'center' }}>
                      {renderTeamLogo(booking.homeTeamId)}
                      <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', fontWeight: 600, lineHeight: 1.2 }}>
                        {teamsMap[booking.homeTeamId]?.name}
                      </Typography>
                    </Box>

                    <Box sx={{ minWidth: '60px', display: 'flex', justifyContent: 'center' }}>
                      <Typography variant="body1" sx={{ fontFamily: 'Comfortaa', fontWeight: 700, color: theme.palette.text.secondary }}>
                        vs.
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flex: 1, textAlign: 'center' }}>
                      {renderTeamLogo(booking.awayTeamId)}
                      <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', fontWeight: 600, lineHeight: 1.2 }}>
                        {teamsMap[booking.awayTeamId]?.name}
                      </Typography>
                    </Box>
                  </Box>

                  <Typography variant="body2" sx={{ color: theme.palette.text.primary, fontFamily: 'Comfortaa', mb: 1 }}>
                    Das Spiel fand am {normalizeDate(booking.date)?.toLocaleDateString('de-DE') || '-'} statt.
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Button
                      size="small"
                      variant="contained"
                      color="warning" // Changed to warning to match the icon
                      startIcon={<PostAddIcon />}
                      onClick={() => handleOpenReportModal(booking.id)}
                    >
                      Melden
                    </Button>
                  </Box>
                </Paper>
              ))}

              {pendingResults.map(result => (
                <Paper key={result.id} sx={sectionCardSx}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.primary, textTransform: 'uppercase' }}>
                      Ergebnisbestätigung
                    </Typography>
                    <Chip
                      label="Warten"
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

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, my: 2, width: '100%' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flex: 1, textAlign: 'center' }}>
                      {renderTeamLogo(result.homeTeamId)}
                      <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', fontWeight: 600, lineHeight: 1.2 }}>
                        {teamsMap[result.homeTeamId]?.name}
                      </Typography>
                    </Box>

                    <Box sx={{ minWidth: '80px', display: 'flex', justifyContent: 'center' }}>
                      <Chip
                        label={`${result.homeScore} : ${result.awayScore}`}
                        sx={{
                          fontFamily: 'Comfortaa',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          height: 'auto',
                          py: 0.5,
                          backgroundColor: theme.palette.action.selected
                        }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flex: 1, textAlign: 'center' }}>
                      {renderTeamLogo(result.awayTeamId)}
                      <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', fontWeight: 600, lineHeight: 1.2 }}>
                        {teamsMap[result.awayTeamId]?.name}
                      </Typography>
                    </Box>
                  </Box>

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
                      label="Warten"
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

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, my: 2, width: '100%' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flex: 1, textAlign: 'center' }}>
                      {renderTeamLogo(result.homeTeamId)}
                      <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', fontWeight: 600, lineHeight: 1.2 }}>
                        {teamsMap[result.homeTeamId]?.name}
                      </Typography>
                    </Box>

                    <Box sx={{ minWidth: '80px', display: 'flex', justifyContent: 'center' }}>
                      <Chip
                        label={`${result.homeScore} : ${result.awayScore}`}
                        sx={{
                          fontFamily: 'Comfortaa',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          height: 'auto',
                          py: 0.5,
                          backgroundColor: theme.palette.action.selected
                        }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flex: 1, textAlign: 'center' }}>
                      {renderTeamLogo(result.awayTeamId)}
                      <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', fontWeight: 600, lineHeight: 1.2 }}>
                        {teamsMap[result.awayTeamId]?.name}
                      </Typography>
                    </Box>
                  </Box>

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
                          label="Antworten"
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

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, my: 2, width: '100%' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flex: 1, textAlign: 'center' }}>
                        {renderTeamLogo(booking.homeTeamId)}
                        <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', fontWeight: 600, lineHeight: 1.2 }}>
                          {teamsMap[booking.homeTeamId]?.name}
                        </Typography>
                      </Box>

                      <Box sx={{ minWidth: '60px', display: 'flex', justifyContent: 'center' }}>
                        <Typography variant="body1" sx={{ fontFamily: 'Comfortaa', fontWeight: 700, color: theme.palette.text.secondary }}>
                          vs.
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flex: 1, textAlign: 'center' }}>
                        {renderTeamLogo(booking.awayTeamId)}
                        <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', fontWeight: 600, lineHeight: 1.2 }}>
                          {teamsMap[booking.awayTeamId]?.name}
                        </Typography>
                      </Box>
                    </Box>

                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontFamily: 'Comfortaa', mb: 1 }}>
                      {dateStr} • {timeStr} Uhr • {booking.pitchName || 'Unbekannter Platz'}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 1 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <Button size="small" variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => handleAcceptBookingRequest(booking.id)}>
                          Annehmen
                        </Button>
                        <Button size="small" variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => handleDeclineBookingRequest(booking.id)}>
                          Ablehnen
                        </Button>
                      </Box>
                      {getRequestExpiryInfo(booking, currentSeason?.requestExpiryDays) && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
                          <AccessTimeIcon sx={{ fontSize: '1rem', color: theme.palette.text.secondary }} />
                          <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 600, display: 'block', lineHeight: 1 }}>
                            {getRequestExpiryInfo(booking, currentSeason?.requestExpiryDays)}
                          </Typography>
                        </Box>
                      )}
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
                          label="Anfrage"
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

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, my: 2, width: '100%' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flex: 1, textAlign: 'center' }}>
                        {renderTeamLogo(booking.homeTeamId)}
                        <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', fontWeight: 600, lineHeight: 1.2 }}>
                          {teamsMap[booking.homeTeamId]?.name}
                        </Typography>
                      </Box>

                      <Box sx={{ minWidth: '60px', display: 'flex', justifyContent: 'center' }}>
                        <Typography variant="body1" sx={{ fontFamily: 'Comfortaa', fontWeight: 700, color: theme.palette.text.secondary }}>
                          vs.
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flex: 1, textAlign: 'center' }}>
                        {renderTeamLogo(booking.awayTeamId)}
                        <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', fontWeight: 600, lineHeight: 1.2 }}>
                          {teamsMap[booking.awayTeamId]?.name}
                        </Typography>
                      </Box>
                    </Box>

                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontFamily: 'Comfortaa', mb: 1 }}>
                      {dateStr} • {timeStr} Uhr • {booking.pitchName || 'Unbekannter Platz'}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 1 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <Button size="small" variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => handleCancelMyRequest(booking.id)}>
                          Stornieren
                        </Button>
                      </Box>
                      {getRequestExpiryInfo(booking, currentSeason?.requestExpiryDays) && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
                          <AccessTimeIcon sx={{ fontSize: '1rem', color: theme.palette.error.main }} />
                          <Typography variant="caption" sx={{ color: theme.palette.error.main, fontWeight: 700, display: 'block', lineHeight: 1 }}>
                            {getRequestExpiryInfo(booking, currentSeason?.requestExpiryDays)}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          </Grid>
        )}

        {/* Upcoming Games using DynamicFixtureList */}
        <Grid>
          <DynamicFixtureList title="BEVORSTEHENDE SPIELE" details={true} seasonId={currentSeason?.id} showType="upcoming" userTeamId={teamId} disableContainer={true} />
        </Grid>

        {/* League Table */}
        <Grid>
          <DynamicLeagueTable title="AKTUELLE TABELLE" form={false} seasonId={currentSeason?.id} userTeamId={teamId} disableContainer={true} />
        </Grid>

        {/* Past Games */}
        <Grid>
          <DynamicFixtureList title="VERGANGENE SPIELE" details={false} seasonId={currentSeason?.id} showType="results" userTeamId={teamId} disableContainer={true} />
        </Grid>
      </Grid>

      {showTeamSettings && <TeamSettings onClose={() => setShowTeamSettings(false)} />}

      <CreateGameModal
        open={isCreateGameModalOpen}
        onClose={() => setIsCreateGameModalOpen(false)}
        onGameCreated={fetchData}
      />

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
