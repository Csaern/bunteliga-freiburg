// src/components/Admin/AdminDashboard.js
import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider';
import DynamicLeagueTable from '../DynamicLeagueTable';
import DynamicFixtureList from '../DynamicFixtureList';
import { Box, Typography, Button, Container, CircularProgress, Avatar, Grid, Paper, IconButton, Tooltip, useTheme, useMediaQuery, Chip, Alert } from '@mui/material';
import * as seasonApi from '../../services/seasonApiService';
import * as teamApi from '../../services/teamApiService';
import * as bookingApi from '../../services/bookingApiService';
import * as resultApi from '../../services/resultApiService';
import * as userApiService from '../../services/userApiService';
import NewsManagement from './NewsManagement';

// Icons
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import EventIcon from '@mui/icons-material/Event';
import GroupIcon from '@mui/icons-material/Group';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import InsightsIcon from '@mui/icons-material/Insights';
import StyleIcon from '@mui/icons-material/Style';
import StadiumIcon from '@mui/icons-material/Stadium';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const AdminDashboard = () => {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTeams: 0,
    pendingResults: 0,
    totalBookings: 0,
    openMatches: 0,
  });
  const [currentSeason, setCurrentSeason] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const fetchData = useCallback(async () => {
    if (!currentUser || !isAdmin) return;
    setLoading(true);
    try {
      const activeSeason = await seasonApi.getActiveSeason();
      setCurrentSeason(activeSeason);

      // Lade Statistiken
      const [teamsArr, bookingsArr, resultsArr, usersArr] = await Promise.all([
        teamApi.getAllTeams().catch(() => []),
        activeSeason?.id ? bookingApi.getBookingsForSeason(activeSeason.id).catch(() => []) : Promise.resolve([]),
        activeSeason?.id ? resultApi.getResultsForSeason(activeSeason.id).catch(() => []) : Promise.resolve([]),
        userApiService.getAllUsers().catch(() => []),
      ]);

      // Berechne Statistiken
      const totalTeams = teamsArr.length;
      const totalUsers = usersArr.length;
      const totalBookings = bookingsArr.length;
      const confirmedResults = resultsArr.filter(r => r.status === 'confirmed');
      const pendingResults = resultsArr.filter(r => r.status === 'pending');

      // Offene Partien: Buchungen mit beiden Teams, aber ohne Ergebnis
      const scheduledMatches = bookingsArr.filter(b => b.homeTeamId && b.awayTeamId && b.status === 'confirmed');
      const resultBookingIds = new Set(confirmedResults.map(r => r.bookingId));
      const openMatches = scheduledMatches.filter(match => !resultBookingIds.has(match.id));

      setStats({
        totalUsers,
        totalTeams,
        pendingResults: pendingResults.length,
        totalBookings,
        openMatches: openMatches.length,
      });
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

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress sx={{ color: '#00A99D' }} /></Box>;
  }

  const renderIconButton = (title, icon, link) => (
    <Grid xs={6} sm={3}>
      <Tooltip title={title} placement="bottom">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <IconButton
            component={Link}
            to={link}
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
            <Typography variant="caption" sx={{ mt: 0.5, color: 'grey.400', fontFamily: 'comfortaa' }}>
              {title}
            </Typography>
          )}
        </Box>
      </Tooltip>
    </Grid>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
      <Grid container spacing={3} direction="column">

        {/* Header */}
        <Grid sx={{ textAlign: 'center' }}>
          <Typography variant="h4" component="h1" sx={{ color: '#00A99D', fontFamily: 'comfortaa', fontWeight: 700, mb: 2, textTransform: 'uppercase' }}>
            Admin Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: '#00A99D',
              }}
            >
              <AdminPanelSettingsIcon />
            </Avatar>
            <Typography variant="h6" component="h2" sx={{ fontFamily: 'comfortaa', color: 'common.white' }}>
              {currentUser?.email || 'Administrator'}
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
              {renderIconButton('Buchungen', <EventIcon />, '/admin/bookings')}
              {renderIconButton('Benutzer', <GroupIcon />, '/admin/users')}
              {renderIconButton('Saisons', <EmojiEventsIcon />, '/admin/season')}
              {renderIconButton('Ergebnisse', <InsightsIcon />, '/admin/results')}
              {renderIconButton('Teams', <StyleIcon />, '/admin/teams')}
              {renderIconButton('Plätze', <StadiumIcon />, '/admin/pitches')}
            </Grid>
          </Paper>
        </Grid>

        {/* News Management Section */}
        <Grid>
          <NewsManagement onDataChange={fetchData} />
        </Grid>

        {/* Statistics Cards */}
        <Grid>
          <Grid container spacing={2} sx={{ width: '100%', display: 'flex' }}>
            <Grid xs={12} sm={6} md={3} sx={{ display: 'flex', flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 calc(25% - 12px)' }, minWidth: 0 }}>
              <Paper sx={{ ...sectionCardSx, width: '100%', flex: 1 }}>
                <Typography variant="h6" sx={{ fontFamily: 'comfortaa', color: 'grey.400', mb: 1 }}>
                  Aktuelle Saison
                </Typography>
                <Typography variant="h4" sx={{ fontFamily: 'comfortaa', color: '#00A99D', fontWeight: 700 }}>
                  {currentSeason?.name || '-'}
                </Typography>
              </Paper>
            </Grid>
            <Grid xs={12} sm={6} md={3} sx={{ display: 'flex', flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 calc(25% - 12px)' }, minWidth: 0 }}>
              <Paper sx={{ ...sectionCardSx, width: '100%', flex: 1 }}>
                <Typography variant="h6" sx={{ fontFamily: 'comfortaa', color: 'grey.400', mb: 1 }}>
                  Teams
                </Typography>
                <Typography variant="h4" sx={{ fontFamily: 'comfortaa', color: '#00A99D', fontWeight: 700 }}>
                  {currentSeason?.teams?.length || 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid xs={12} sm={6} md={3} sx={{ display: 'flex', flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 calc(25% - 12px)' }, minWidth: 0 }}>
              <Paper sx={{ ...sectionCardSx, width: '100%', flex: 1 }}>
                <Typography variant="h6" sx={{ fontFamily: 'comfortaa', color: 'grey.400', mb: 1 }}>
                  Offene Partien
                </Typography>
                <Typography variant="h4" sx={{ fontFamily: 'comfortaa', color: stats.openMatches > 0 ? '#FFBF00' : '#00A99D', fontWeight: 700 }}>
                  {currentSeason?.openMatchesCount || 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid xs={12} sm={6} md={3} sx={{ display: 'flex', flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '1 1 calc(25% - 12px)' }, minWidth: 0 }}>
              <Paper sx={{ ...sectionCardSx, width: '100%', flex: 1 }}>
                <Typography variant="h6" sx={{ fontFamily: 'comfortaa', color: 'grey.400', mb: 1 }}>
                  Ausstehende Ergebnisse
                </Typography>
                <Typography variant="h4" sx={{ fontFamily: 'comfortaa', color: stats.pendingResults > 0 ? '#FFBF00' : '#00A99D', fontWeight: 700 }}>
                  {currentSeason?.pendingResults?.length || 0}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Grid>

        {/* League Table */}
        {currentSeason && (
          <Grid>
            <DynamicLeagueTable
              title="AKTUELLE TABELLE"
              form={true}
              seasonId={currentSeason.id}
            />
          </Grid>
        )}

        {/* Upcoming Games */}
        {currentSeason && (
          <Grid>
            <DynamicFixtureList
              title="BEVORSTEHENDE SPIELE"
              details={true}
              seasonId={currentSeason.id}
              showType="upcoming"
            />
          </Grid>
        )}

        {/* Recent Results */}
        {currentSeason && (
          <Grid>
            <DynamicFixtureList
              title="NEUESTE ERGEBNISSE"
              details={true}
              seasonId={currentSeason.id}
              showType="results"
            />
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default AdminDashboard;

