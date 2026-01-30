import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import DynamicLeagueTable from '../components/DynamicLeagueTable';
import DynamicFixtureList from '../components/DynamicFixtureList';
import TeamSettings from '../components/TeamSettings';
import CreateGameModal from '../components/Modals/CreateGameModal';
import ReportResultModal from '../components/Modals/ReportResultModal';
import { Box, Typography, Button, Container, CircularProgress, Avatar, Grid, TextField, Paper, IconButton, Tooltip, useTheme, useMediaQuery, Chip, Snackbar, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Alert, Table, TableBody, TableContainer, TableHead, TableRow } from '@mui/material';
import { API_BASE_URL } from '../services/apiClient';
import * as seasonApi from '../services/seasonApiService';
import * as teamApi from '../services/teamApiService';
import * as bookingApi from '../services/bookingApiService';
import * as resultApi from '../services/resultApiService';
import * as pitchApi from '../services/pitchApiService';
import { getRequestExpiryInfo } from '../components/Helpers/dateUtils';
import { StyledTableCell } from '../components/Helpers/tableUtils';

// Icons
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import PostAddIcon from '@mui/icons-material/PostAdd';
import SettingsIcon from '@mui/icons-material/Settings';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import InsightsIcon from '@mui/icons-material/Insights'; // Added for result icon
import HandshakeIcon from '@mui/icons-material/Handshake'; // Added for friendly match
// Removed CheckIcon/CloseIcon -> Standardized on CheckCircleIcon/CancelIcon as per request

const DashboardPage = () => {
  const { currentUser, teamId, isAdmin } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // Added isMobile check

  const [team, setTeam] = useState(null);
  const [pendingGameRequests, setPendingGameRequests] = useState([]);
  const [pendingMyRequests, setPendingMyRequests] = useState([]);
  const [pendingResults, setPendingResults] = useState([]);
  const [pendingMyResults, setPendingMyResults] = useState([]);
  const [notificationBookings, setNotificationBookings] = useState([]); // NEU: Fehlende Ergebnisse
  const [teamsMap, setTeamsMap] = useState({});
  const [pitchesMap, setPitchesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [showTeamSettings, setShowTeamSettings] = useState(false);
  const [isCreateGameModalOpen, setIsCreateGameModalOpen] = useState(false);


  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportBookingId, setSelectedReportBookingId] = useState(null); // Added state for pre-selection

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

      // NEU: Plätze laden für die Anzeige in "Ausstehende Aktionen"
      const pitchesArr = await pitchApi.getAllPitchesPublic().catch(() => []);
      const pMap = pitchesArr.reduce((acc, p) => { acc[p.id] = p.name; return acc; }, {});
      setPitchesMap(pMap);

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

  const handleAcceptBookingRequest = async (bookingId, e) => {
    if (e) e.stopPropagation();
    try {
      const response = await bookingApi.respondToBookingRequest(bookingId, 'confirm');
      showSnackbar(response.message || 'Spiel bestätigt!', 'success');
      setPendingGameRequests((prev) => prev.filter((booking) => booking.id !== bookingId));
      fetchData();
    } catch (error) {
      showSnackbar(error.message || 'Fehler beim Bestätigen der Spielanfrage.', 'error');
    }
  };

  const handleDeclineBookingRequest = async (bookingId, e) => {
    if (e) e.stopPropagation();
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

  const handleCancelMyRequest = async (bookingId, e) => {
    if (e) e.stopPropagation();
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

  const handleOpenReportModal = (bookingId = null) => { // Updated to accept ID
    if (bookingId) {
      setSelectedReportBookingId(bookingId);
    }
    setIsReportModalOpen(true);
  };

  const handleCloseReportModal = () => {
    setIsReportModalOpen(false);
    setSelectedReportBookingId(null); // Reset
  };

  const handleConfirmPendingResult = async (result, e) => {
    if (e) e.stopPropagation();
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

  const handleRejectPendingResult = async (result, e) => {
    if (e) e.stopPropagation();
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

  const handleCancelReport = async (resultId, e) => {
    if (e) e.stopPropagation();
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

  // --- Unified Pending Actions Logic ---
  const allPendingActions = React.useMemo(() => {
    const actions = [];

    // Helper to determine win/loss color
    const getResultColor = (homeScore, awayScore, isHome) => {
      if (homeScore === awayScore) return 'default'; // Draw (or orange/grey)
      if (isHome) {
        return homeScore > awayScore ? 'success' : 'error';
      } else {
        return awayScore > homeScore ? 'success' : 'error';
      }
    };

    // 1. Notification Bookings (Past games needing results)
    notificationBookings.forEach(booking => {
      const isHome = booking.homeTeamId === teamId;
      actions.push({
        id: `notify-${booking.id}`,
        type: 'report_needed',
        date: normalizeDate(booking.date),
        data: booking,
        priority: 1, // Highest priority
        opponentId: isHome ? booking.awayTeamId : booking.homeTeamId,
        isHome: isHome,
        label: 'Ergebnis melden',
        icon: <PostAddIcon sx={{ color: theme.palette.warning.main }} />,
        friendly: booking.friendly
      });
    });

    // 2. Pending Game Requests (Incoming)
    pendingGameRequests.forEach(booking => {
      const isHome = booking.homeTeamId === teamId;
      actions.push({
        id: `req-in-${booking.id}`,
        type: 'booking_request',
        date: normalizeDate(booking.date),
        data: booking,
        priority: 2,
        opponentId: isHome ? booking.awayTeamId : booking.homeTeamId,
        isHome: isHome,
        label: 'Spielanfrage',
        icon: <EventIcon sx={{ color: theme.palette.primary.main }} />,
        isHome: isHome,
        label: 'Spielanfrage',
        icon: <EventIcon sx={{ color: theme.palette.primary.main }} />,
        expiry: getRequestExpiryInfo(booking, currentSeason?.requestExpiryDays),
        friendly: booking.friendly,
        pitchName: pitchesMap[booking.pitchId] || 'Unbekannter Platz' // NEU
      });
    });

    // 3. Pending Results (To be confirmed by me)
    pendingResults.forEach(result => {
      const isHome = result.homeTeamId === teamId;
      actions.push({
        id: `res-confirm-${result.id}`,
        type: 'confirm_result',
        date: normalizeDate(result.date) || new Date(),
        data: result,
        priority: 3,
        opponentId: isHome ? result.awayTeamId : result.homeTeamId,
        isHome: isHome,
        label: 'Ergebnis bestätigen',
        icon: <InsightsIcon sx={{ color: theme.palette.secondary.main }} />,
        score: `${result.homeScore} : ${result.awayScore}`,
        resultColor: getResultColor(result.homeScore, result.awayScore, isHome) // Win/Loss color
      });
    });

    // 4. Pending My Requests (Sent by me)
    pendingMyRequests.forEach(booking => {
      const isHome = booking.homeTeamId === teamId;
      actions.push({
        id: `req-out-${booking.id}`,
        type: 'my_request',
        date: normalizeDate(booking.date),
        data: booking,
        priority: 4,
        opponentId: isHome ? booking.awayTeamId : booking.homeTeamId,
        isHome: isHome,
        label: 'Gesendet',
        icon: <AccessTimeIcon sx={{ color: theme.palette.text.secondary }} />,
        isHome: isHome,
        label: 'Gesendet',
        icon: <AccessTimeIcon sx={{ color: theme.palette.text.secondary }} />,
        expiry: getRequestExpiryInfo(booking, currentSeason?.requestExpiryDays),
        friendly: booking.friendly,
        pitchName: pitchesMap[booking.pitchId] || 'Unbekannter Platz' // NEU
      });
    });

    // 5. Pending My Results (Reported by me, waiting for confirmation)
    pendingMyResults.forEach(result => {
      const isHome = result.homeTeamId === teamId;
      actions.push({
        id: `res-wait-${result.id}`,
        type: 'waiting_result',
        date: normalizeDate(result.date) || new Date(),
        data: result,
        priority: 5,
        opponentId: isHome ? result.awayTeamId : result.homeTeamId,
        isHome: isHome,
        label: 'Wartend',
        icon: <AccessTimeIcon sx={{ color: theme.palette.info.main }} />,
        score: `${result.homeScore} : ${result.awayScore}`,
        resultColor: getResultColor(result.homeScore, result.awayScore, isHome)
      });
    });

    // Sort by Priority then Date
    return actions.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return (a.date || 0) - (b.date || 0);
    });

  }, [notificationBookings, pendingGameRequests, pendingResults, pendingMyRequests, pendingMyResults, currentSeason, theme, teamsMap, teamId, pitchesMap]);

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

        {/* Pending Actions Table */}
        {allPendingActions.length > 0 && (
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

            <TableContainer component={Paper} sx={{ borderRadius: 4, border: '1px solid', borderColor: theme.palette.divider, boxShadow: 'none' }}>
              <Table size={isMobile ? 'small' : 'medium'}>
                {/* Table Header - Simplified/Hidden on Mobile if preferred, but usually nice to have. */}
                <TableHead>
                  <TableRow sx={{ backgroundColor: theme.palette.action.hover }}>
                    <StyledTableCell width="10%" sx={{ color: theme.palette.text.primary, fontWeight: 'bold', textAlign: 'center' }}>{/* Icon */}</StyledTableCell>
                    <StyledTableCell width="60%" sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>Gegner</StyledTableCell>
                    {/* Score Column REMOVED */}
                    <StyledTableCell width="30%" align="right" sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>Aktion</StyledTableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allPendingActions.map((action) => (
                    <TableRow
                      key={action.id}
                      hover
                      sx={{
                        '& td': { py: 1.5 },
                        cursor: action.type === 'report_needed' ? 'pointer' : 'default',
                        '&:hover': action.type === 'report_needed' ? { backgroundColor: theme.palette.action.selected } : {}
                      }}
                      onClick={() => action.type === 'report_needed' ? handleOpenReportModal(action.data.id) : null}
                    >
                      {/* Type Column - Compact Icon Only */}
                      <StyledTableCell align="center">
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          <Tooltip title={action.label} placement="right">
                            {action.icon}
                          </Tooltip>
                          {/* Priority/Friendly Icon Badge */}
                          {action.friendly && (
                            <Tooltip title="Freundschaftsspiel">
                              <HandshakeIcon sx={{ fontSize: '1rem', color: theme.palette.warning.main, mt: 0.5 }} />
                            </Tooltip>
                          )}
                        </Box>
                      </StyledTableCell>

                      {/* Opponent & Match Details Column (Mobile Optimized) */}
                      <StyledTableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {/* Opponent Line: Link Logo + Name */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {renderTeamLogo(action.opponentId)}
                            <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', fontWeight: 600, fontSize: isMobile ? '0.75rem' : '1rem' }}>
                              {teamsMap[action.opponentId]?.name || 'Unbekannt'}
                              <Box component="span" sx={{ color: theme.palette.text.secondary, ml: 0.5, fontSize: '0.7rem' }}>
                                {action.isHome ? '(A)' : '(H)'} {/* Opponent status: If I am Home, they are Away */}
                              </Box>
                            </Typography>
                          </Box>

                          {/* Info Line: Date & Time - AND SCORE IF AVAILABLE */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: '0.7rem' }}>
                              {action.date ? action.date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '-'}
                              {action.date && ` ${action.date.toTimeString().slice(0, 5)}`}
                              {/* NEU: Platz anzeigen bei Requests */}
                              {action.pitchName && (
                                <Box component="span" sx={{ color: theme.palette.text.secondary, ml: 1, fontStyle: 'italic' }}>
                                  @ {action.pitchName}
                                </Box>
                              )}
                            </Typography>

                            {action.score && (
                              <>
                                <Typography variant="caption" sx={{ color: theme.palette.text.disabled }}>•</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: action.resultColor === 'default' ? theme.palette.text.primary : theme.palette[action.resultColor].main }}>
                                  {action.score}
                                </Typography>
                              </>
                            )}
                          </Box>
                        </Box>
                      </StyledTableCell>

                      {/* Score Column REMOVED */}

                      {/* Actions Column (Right Aligned, Icons Only) */}
                      <StyledTableCell align="right">
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          {action.type === 'report_needed' && (
                            // No Button, Row Click handles it. Maybe a chevron or small icon to indicate clickability?
                            // For now leaving empty as per "no button" request
                            null
                          )}

                          {action.type === 'booking_request' && (
                            <>
                              <IconButton size="medium" color="success" onClick={(e) => handleAcceptBookingRequest(action.data.id, e)} title="Annehmen">
                                <CheckCircleIcon fontSize="inherit" />
                              </IconButton>
                              <IconButton size="medium" color="error" onClick={(e) => handleDeclineBookingRequest(action.data.id, e)} title="Ablehnen">
                                <CancelIcon fontSize="inherit" />
                              </IconButton>
                            </>
                          )}

                          {action.type === 'confirm_result' && (
                            <>
                              <IconButton size="medium" color="success" onClick={(e) => handleConfirmPendingResult(action.data, e)} title="Bestätigen">
                                <CheckCircleIcon fontSize="inherit" />
                              </IconButton>
                              <IconButton size="medium" color="error" onClick={(e) => handleRejectPendingResult(action.data, e)} title="Ablehnen">
                                <CancelIcon fontSize="inherit" />
                              </IconButton>
                            </>
                          )}

                          {(action.type === 'my_request' || action.type === 'waiting_result') && (
                            <IconButton size="medium" color="error" onClick={(e) => action.type === 'my_request' ? handleCancelMyRequest(action.data.id, e) : handleCancelReport(action.data.id, e)}>
                              <CancelIcon fontSize="inherit" />
                            </IconButton>
                          )}
                        </Box>
                      </StyledTableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        )}

        {/* Upcoming Games using DynamicFixtureList */}
        <Grid>
          <DynamicFixtureList title="BEVORSTEHENDE SPIELE" details={true} seasonId={currentSeason?.id} showType="upcoming" userTeamId={teamId} disableContainer={true} />
        </Grid>

        {/* League Table */}
        <Grid>
          <DynamicLeagueTable title="AKTUELLE TABELLE" form={false} seasonId={currentSeason?.id} userTeamId={teamId} disableContainer={true} enableSimulation={true} />
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

      <ReportResultModal
        open={isReportModalOpen}
        onClose={handleCloseReportModal}
        seasonId={currentSeason?.id}
        teamId={teamId}
        onReportSuccess={fetchData}
        initialBookingId={selectedReportBookingId}
      />
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
