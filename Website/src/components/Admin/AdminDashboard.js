import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider';
import DynamicLeagueTable from '../DynamicLeagueTable';
import DynamicFixtureList from '../DynamicFixtureList';
import { Box, Typography, Container, CircularProgress, Grid, Paper, IconButton, Tooltip, useTheme, useMediaQuery, Alert, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import * as seasonApi from '../../services/seasonApiService';
import * as teamApi from '../../services/teamApiService';
import * as bookingApi from '../../services/bookingApiService';
import * as resultApi from '../../services/resultApiService';
import * as userApiService from '../../services/userApiService';

// Icons

import EventIcon from '@mui/icons-material/Event';
import GroupIcon from '@mui/icons-material/Group';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import InsightsIcon from '@mui/icons-material/Insights';
import StyleIcon from '@mui/icons-material/Style';
import StadiumIcon from '@mui/icons-material/Stadium';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import LanguageIcon from '@mui/icons-material/Language';
import * as pitchApi from '../../services/pitchApiService'; // New import
import AdminResultForm from './Forms/AdminResultForm';
import AdminBookingForm from './Forms/AdminBookingForm';
import { ReusableModal } from '../Helpers/modalUtils';
import { formatGermanDate, getRequestExpiryInfo } from '../Helpers/dateUtils';
import { StyledTableCell } from '../Helpers/tableUtils';
import { Table, TableBody, TableContainer, TableHead, TableRow } from '@mui/material';

// ... (existing code for icons)

const AdminDashboard = () => {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);


  const [currentSeason, setCurrentSeason] = useState(null);
  const [loading, setLoading] = useState(true);

  // New State for Actions List
  const [pendingActions, setPendingActions] = useState([]);
  const [allTeams, setAllTeams] = useState([]); // Needed for forms
  const [allPitches, setAllPitches] = useState([]); // Needed for forms
  const [allResults, setAllResults] = useState([]); // Needed for form validation
  const [allBookings, setAllBookings] = useState([]); // Needed for booking linking

  // Modal State
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null); // { type: 'result'|'booking', data: ... }
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });



  const fetchData = useCallback(async () => {
    if (!currentUser || !isAdmin) return;
    setLoading(true);
    try {
      const activeSeason = await seasonApi.getActiveSeason();
      setCurrentSeason(activeSeason);

      // Lade Statistiken und Daten für Aktionen
      const [teamsArr, bookingsArr, resultsArr, usersArr, pitchesArr, pendingResultsBookings] = await Promise.all([
        teamApi.getAllTeams().catch(() => []),
        activeSeason?.id ? bookingApi.getBookingsForSeason(activeSeason.id).catch(() => []) : Promise.resolve([]),
        activeSeason?.id ? resultApi.getResultsForSeason(activeSeason.id).catch(() => []) : Promise.resolve([]),
        userApiService.getAllUsers().catch(() => []),
        pitchApi.getAllPitches().catch(() => []),
        activeSeason?.id ? bookingApi.getBookingsNeedingResult(activeSeason.id).catch(() => []) : Promise.resolve([]),
      ]);

      setAllTeams(teamsArr);
      setAllPitches(pitchesArr);

      // Stelle sicher, dass wirklich nur Daten der aktiven Saison berücksichtigt werden
      const seasonBookings = activeSeason?.id
        ? bookingsArr.filter(b => b.seasonId === activeSeason.id)
        : bookingsArr;

      setAllBookings(seasonBookings);

      const seasonResults = activeSeason?.id
        ? resultsArr.filter(r => r.seasonId === activeSeason.id)
        : resultsArr;

      setAllResults(seasonResults);

      // --- Build Actions List ---
      const actions = [];

      const getSafeDate = (d) => {
        if (!d) return new Date();
        if (d instanceof Date) return d;
        if (typeof d?.toDate === 'function') return d.toDate();
        if (d?._seconds) return new Date(d._seconds * 1000);
        return new Date(d);
      };

      // 1. Bookings needing results (Games played but no result)
      // pendingResultsBookings are bookings that are confirmed, past date, and have NO result entry.
      pendingResultsBookings.forEach(booking => {
        actions.push({
          id: `result-${booking.id}`,
          type: 'result',
          date: getSafeDate(booking.date),
          data: booking,
          title: 'Ergebnis eintragen',
          description: `${getTeamName(booking.homeTeamId, teamsArr)} vs ${getTeamName(booking.awayTeamId, teamsArr)}`
        });
      });

      // 2. Pending Booking Requests (e.g. status 'pending_away_confirm')
      // Assuming 'pending_away_confirm' or any other future 'request' status needs admin attention/override?
      // Or simply show them so admin can expedite? The user asked for "Open Bookings".
      // Let's filter for non-final states that might need attention.
      const pendingBookings = seasonBookings.filter(b => b.status === 'pending_away_confirm');
      pendingBookings.forEach(booking => {
        const expiryInfo = getRequestExpiryInfo(booking, activeSeason?.requestExpiryDays);
        actions.push({
          id: `booking-${booking.id}`,
          type: 'booking',
          date: getSafeDate(booking.date),
          data: booking,
          expiryInfo: expiryInfo,
          title: booking.status === 'pending_away_confirm' ? 'Bestätigung ausstehend' : 'Gesperrt/Bearbeiten',
          description: `${booking.homeTeamId ? getTeamName(booking.homeTeamId, teamsArr) : '?'} vs ${booking.awayTeamId ? getTeamName(booking.awayTeamId, teamsArr) : '?'}`
        });
      });

      // Sort by date (oldest first? or newest?) - "To Do" usually prioritizes oldest.
      actions.sort((a, b) => a.date - b.date);
      setPendingActions(actions);

    } catch (error) {
      console.error("Fehler beim Laden der Admin-Dashboard-Daten:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
    } else if (!isAdmin) {
      navigate('/dashboard');
    } else {
      fetchData();
    }
  }, [currentUser, isAdmin, navigate, fetchData]);

  const getTeamName = (id, teams) => {
    const t = teams.find(team => String(team.id) === String(id));
    return t ? t.name : 'Unbekannt';
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleActionClick = (action) => {
    setSelectedAction(action);
    setIsActionModalOpen(true);
  };

  const handleModalClose = () => {
    setIsActionModalOpen(false);
    setSelectedAction(null);
  };

  const handleFormSubmit = async (data) => {
    try {
      if (selectedAction.type === 'result') {
        const resultData = { ...data, homeScore: parseInt(data.homeScore), awayScore: parseInt(data.awayScore), seasonId: currentSeason?.id };
        await resultApi.adminCreateResult(resultData);
        setNotification({ open: true, message: 'Ergebnis erfolgreich erstellt.', severity: 'success' });
      } else if (selectedAction.type === 'booking') {
        // Construct booking object
        const combinedDate = new Date(`${data.date}T${data.time}`);
        const bookingData = {
          seasonId: currentSeason.id,
          pitchId: data.pitchId,
          homeTeamId: data.homeTeamId || null,
          awayTeamId: data.awayTeamId || null,
          date: combinedDate.toISOString(),
          duration: data.duration,
          friendly: data.friendly,
          status: data.status
        };
        await bookingApi.adminUpdateBooking(selectedAction.data.id, bookingData); // Update existing
        setNotification({ open: true, message: 'Buchung aktualisiert.', severity: 'success' });
      }
      handleModalClose();
      fetchData();
    } catch (error) {
      setNotification({ open: true, message: error.message || 'Fehler beim Speichern.', severity: 'error' });
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress sx={{ color: '#00A99D' }} /></Box>;
  }

  const adminActions = [
    { title: 'Buchungen', icon: <EventIcon />, link: '/admin/bookings', color: '#FFB74D' }, // Orange
    { title: 'Benutzer', icon: <GroupIcon />, link: '/admin/users', color: '#2196F3' },  // Blue
    { title: 'Ergebnisse', icon: <InsightsIcon />, link: '/admin/results', color: '#9C27B0' }, // Purple
    { title: 'Saisons', icon: <EmojiEventsIcon />, link: '/admin/season', color: '#00A99D' }, // Teal
    { title: 'Teams', icon: <StyleIcon />, link: '/admin/teams', color: '#E91E63' }, // Pink
    { title: 'Plätze', icon: <StadiumIcon />, link: '/admin/pitches', color: '#4CAF50' }, // Green
    { title: 'Website', icon: <LanguageIcon />, link: '/admin/website', color: '#607D8B' }, // Blue Grey
  ];

  const visibleActions = isDesktop
    ? adminActions
    : adminActions.filter(a => !['Saisons', 'Teams', 'Plätze'].includes(a.title));

  const menuActions = isDesktop
    ? []
    : adminActions.filter(a => ['Saisons', 'Teams', 'Plätze'].includes(a.title));

  const renderIconButton = (title, icon, link, color, onClick = null) => (
    <Grid item xs={3} sm={3} key={title}>
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
              '&:hover': {
                backgroundColor: `${color || theme.palette.primary.main}1A`,
                borderColor: color || theme.palette.primary.main,
                color: color || theme.palette.primary.main,
              },
            }}
          >
            {icon}
          </IconButton>
          {isDesktop && (
            <Typography variant="caption" sx={{ mt: 0.5, color: theme.palette.text.secondary, fontFamily: 'comfortaa' }}>
              {title}
            </Typography>
          )}
        </Box>
      </Tooltip>
    </Grid>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
      {/* Helper Notification */}
      <Box sx={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999 }}>
        {notification.open && <Alert severity={notification.severity} onClose={() => setNotification({ ...notification, open: false })}>{notification.message}</Alert>}
      </Box>

      {/* Modal handling */}
      <ReusableModal open={isActionModalOpen} onClose={handleModalClose} title={selectedAction?.type === 'result' ? 'Ergebnis eintragen' : 'Buchung bearbeiten'}>
        {selectedAction?.type === 'result' && (
          <AdminResultForm
            initialData={{
              ...selectedAction.data,
              bookingId: selectedAction.data.id,
              date: selectedAction.data.date, // Ensure date matches expected format
              pitchId: selectedAction.data.pitchId
            }}
            teams={allTeams}
            pitches={allPitches}
            season={currentSeason}
            results={allResults}
            bookings={allBookings}
            onSubmit={handleFormSubmit}
            onCancel={handleModalClose}
          />
        )}
        {selectedAction?.type === 'booking' && (
          <AdminBookingForm
            initialData={selectedAction.data}
            currentSeason={currentSeason}
            allPitches={allPitches}
            allTeams={allTeams}
            mode={selectedAction.mode || 'view'}
            onSubmit={handleFormSubmit}
            onCancel={handleModalClose}
            onEdit={() => setSelectedAction({ ...selectedAction, mode: 'edit' })}
          />
        )}
      </ReusableModal>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* Header */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h4" component="h1" sx={{ color: theme.palette.primary.main, fontFamily: 'comfortaa', fontWeight: 700, mb: 2, textTransform: 'uppercase' }}>
            Admin Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Typography
              variant="h6"
              component="h2"
              sx={{
                fontFamily: 'comfortaa',
                color: theme.palette.text.primary,
                fontSize: { xs: '1rem', sm: '1.25rem' },
                wordBreak: 'break-word',
                textAlign: 'center'
              }}
            >
              {currentUser?.email || 'Administrator'}
            </Typography>
          </Box>
        </Box>

        {/* Action Icon Bar */}
        <Box>
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
            <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              {visibleActions.map(action => renderIconButton(action.title, action.icon, action.link, action.color))}

              {!isDesktop && (
                <>
                  {renderIconButton('Mehr', <MoreVertIcon />, null, theme.palette.text.primary, handleMenuClick)}
                  <Menu
                    anchorEl={anchorEl}
                    open={menuOpen}
                    onClose={handleMenuClose}
                    PaperProps={{
                      sx: {
                        bgcolor: theme.palette.background.paper,
                        color: theme.palette.text.primary,
                        border: '1px solid',
                        borderColor: theme.palette.divider,
                      }
                    }}
                  >
                    {menuActions.map((action) => (
                      <MenuItem
                        key={action.title}
                        component={Link}
                        to={action.link}
                        onClick={handleMenuClose}
                        sx={{ '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)' } }}
                      >
                        <ListItemIcon sx={{ color: action.color || 'inherit' }}>
                          {action.icon}
                        </ListItemIcon>
                        <ListItemText primary={action.title} primaryTypographyProps={{ fontFamily: 'comfortaa' }} />
                      </MenuItem>
                    ))}
                  </Menu>
                </>
              )}
            </Box>
          </Paper>
        </Box>

        {/* --- PENDING ACTIONS LIST --- */}
        {pendingActions.length > 0 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant={isMobile ? 'h6' : 'h5'} sx={{ color: theme.palette.text.primary, fontFamily: 'comfortaa', fontWeight: 700, textTransform: 'uppercase' }}>
                Aktionen
              </Typography>
              {currentSeason && (
                <Typography variant={isMobile ? 'body1' : 'h6'} sx={{ color: theme.palette.text.secondary, fontFamily: 'comfortaa' }}>
                  {currentSeason.name}
                </Typography>
              )}
            </Box>
            <TableContainer component={Paper} sx={{ backgroundColor: theme.palette.background.paper, borderRadius: 2, border: '1px solid', borderColor: theme.palette.divider }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: theme.palette.action.hover }}>
                    <StyledTableCell sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>Typ</StyledTableCell>
                    {!isMobile && <StyledTableCell sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>Datum</StyledTableCell>}
                    <StyledTableCell sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>Details</StyledTableCell>

                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingActions.map((action) => (
                    <TableRow
                      key={action.id}
                      hover
                      onClick={() => handleActionClick(action)}
                      sx={{
                        cursor: 'pointer',
                        height: isMobile ? 'auto' : 72
                      }}
                    >
                      <StyledTableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {action.type === 'result' ? <InsightsIcon sx={{ color: '#9C27B0' }} /> : <EventIcon sx={{ color: '#FFB74D' }} />}
                          {!isMobile && <Typography variant="body2">{action.title}</Typography>}
                        </Box>
                      </StyledTableCell>
                      {!isMobile && (
                        <StyledTableCell>
                          <Typography variant="body2">{formatGermanDate(action.date)}</Typography>
                        </StyledTableCell>
                      )}
                      <StyledTableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {action.description}
                          </Typography>
                          {action.data?.friendly && (
                            <Typography
                              component="span"
                              sx={{
                                color: theme.palette.mode === 'light' ? theme.palette.warning.dark : '#FFD700',
                                fontWeight: 'bold',
                                fontSize: '0.85rem'
                              }}
                            >
                              (F)
                            </Typography>
                          )}
                        </Box>
                        {action.expiryInfo && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            <AccessTimeIcon sx={{ fontSize: '0.875rem', color: theme.palette.text.secondary }} />
                            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', fontWeight: 600 }}>
                              {action.expiryInfo}
                            </Typography>
                          </Box>
                        )}
                        {isMobile && <Typography variant="caption" color="textSecondary">{formatGermanDate(action.date)}</Typography>}
                      </StyledTableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}



        {/* League Table */}
        {currentSeason && (
          <Box>
            <DynamicLeagueTable
              title="AKTUELLE TABELLE"
              form={true}
              seasonId={currentSeason.id}
              disableContainer={true}
            />
          </Box>
        )}

        {/* Upcoming Games */}
        {currentSeason && (
          <Box>
            <DynamicFixtureList
              title="BEVORSTEHENDE SPIELE"
              details={true}
              seasonId={currentSeason.id}
              showType="upcoming"
              disableContainer={true}
            />
          </Box>
        )}

        {/* Recent Results */}
        {currentSeason && (
          <Box>
            <DynamicFixtureList
              title="NEUESTE ERGEBNISSE"
              details={true}
              seasonId={currentSeason.id}
              showType="results"
              disableContainer={true}
            />
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default AdminDashboard;

