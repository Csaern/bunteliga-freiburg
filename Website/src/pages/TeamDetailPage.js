import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Avatar,
  Button,
  CircularProgress,
  Grid,
  Chip,
  useTheme,
  useMediaQuery,
  Link as MuiLink,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SecurityIcon from '@mui/icons-material/Security';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PublicIcon from '@mui/icons-material/Public';
import EventIcon from '@mui/icons-material/Event';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import { API_BASE_URL } from '../services/apiClient';
import * as teamApi from '../services/teamApiService';
import * as seasonApi from '../services/seasonApiService';
import DynamicFixtureList from '../components/DynamicFixtureList';
import DynamicLeagueTable from '../components/DynamicLeagueTable';

const TeamDetailPage = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const targetSeasonId = queryParams.get('seasonId');
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:850px)'); // Changed to 850px as requested
  const [team, setTeam] = useState(null);
  const [logoError, setLogoError] = useState(false);

  const [allSeasons, setAllSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  const [showTeamInfo, setShowTeamInfo] = useState(false);

  // Helper zum Generieren einer "zufälligen" aber consistenten Farbe basierend auf dem Namen
  const getFallbackColor = (name) => {
    const colors = [
      '#E91E63', // Pink
      '#FFC107', // Amber
      '#9C27B0', // Purple
      '#00BCD4', // Cyan
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  useEffect(() => {
    const fetchStats = async () => {
      if (teamId && selectedSeasonId) {
        try {
          const statsData = await teamApi.getTeamStats(teamId, selectedSeasonId);
          setStats(statsData);
        } catch (error) {
          console.error("Failed to load stats", error);
        }
      }
    };
    fetchStats();
  }, [teamId, selectedSeasonId]);

  useEffect(() => {
    loadTeamData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const [teamData] = await Promise.all([
        teamApi.getTeamByIdPublic(teamId).catch(() => null),
        seasonApi.getActiveSeasonPublic().catch(() => null)
      ]);

      if (teamData) {
        setTeam(teamData);
      } else {
        navigate('/teams');
      }

      // Lade alle Saisons über den öffentlichen Service
      try {
        const allSeasonsData = await seasonApi.getAllSeasonsPublic().catch(() => []);

        // Filtere nur relevante Saisons (nicht planning)
        // UND nur Saisons, in denen das Team auch wirklich dabei war
        const availableSeasons = allSeasonsData.filter(s =>
          (s.status === 'finished' || s.status === 'active' || s.status === 'inactive') &&
          s.teams && s.teams.some(t => (t.id === teamId || t.teamId === teamId))
        );

        // Sortiere nach Name (Jahr) absteigend
        availableSeasons.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        setAllSeasons(availableSeasons);

        // Setze die Saison, in der das Team zuletzt gespielt hat (die erste in der sortierten Liste),
        // es sei denn, es wurde explizit eine via URL (?seasonId=) angefordert.
        let seasonToSelect = null;

        if (targetSeasonId && availableSeasons.some(s => s.id === targetSeasonId)) {
          seasonToSelect = availableSeasons.find(s => s.id === targetSeasonId);
        } else if (availableSeasons.length > 0) {
          seasonToSelect = availableSeasons[0];
        }

        if (seasonToSelect) {
          setSelectedSeasonId(seasonToSelect.id);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Saisons:', error);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Team-Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeasonChange = (event) => {
    const newSeasonId = event.target.value;
    setSelectedSeasonId(newSeasonId);
  };

  const sectionCardSx = {
    borderRadius: 3, // Etwas weniger rund
    border: '1px solid',
    borderColor: theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.12)', // Dezent
    background: theme.palette.background.paper, // Kein Gradient mehr
    boxShadow: 'none', // Flat design
    p: { xs: 2, sm: 3 },
    display: 'flex',
    flexDirection: 'column',
    gap: 1.5,
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress sx={{ color: theme.palette.primary.main }} />
        </Box>
      </Container>
    );
  }

  if (!team) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h5" sx={{ color: theme.palette.text.secondary, mb: 2, fontFamily: 'Comfortaa' }}>
            Team nicht gefunden.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate('/teams')}
            sx={{ backgroundColor: theme.palette.primary.main, '&:hover': { backgroundColor: theme.palette.primary.dark } }}
          >
            Zurück zu den Teams
          </Button>
        </Box>
      </Container>
    );
  }


  const isLightMode = theme.palette.mode === 'light';
  const logoUrlToUse = (isLightMode && team.logoUrlLight) ? team.logoUrlLight : team.logoUrl;
  const logoUrl = logoUrlToUse ? (logoUrlToUse.startsWith('http') ? logoUrlToUse : `${API_BASE_URL}${logoUrlToUse}`) : null;

  return (
    <Container maxWidth="lg" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
      <Grid container spacing={3} direction="column">
        {/* Back Button */}
        <Grid item sx={{ pb: '0 !important', pt: '0 !important' }}>
          <Box sx={{ display: 'flex' }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(-1)}
              sx={{
                color: theme.palette.text.secondary,
                mt: 0,
                mb: 0,
                py: 0.5,
                '&:hover': { color: theme.palette.primary.main, backgroundColor: theme.palette.action.hover }
              }}
            >
              Zurück
            </Button>
          </Box>
        </Grid>

        {/* Header - Minimal & Centered */}
        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', mb: 1, pt: { xs: '4px !important', sm: '8px !important' } }}>
          <Box 
            onClick={() => setShowTeamInfo(prev => !prev)} 
            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, textAlign: 'center', cursor: 'pointer' }}
          >
            {(logoError || !logoUrl) ? (
              <Box
                sx={{
                  width: 80,
                  minHeight: 90,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.palette.grey[200],
                  borderRadius: '0 0 50% 50%',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    backgroundColor: getFallbackColor(team.name),
                    opacity: 1,
                  }}
                />
                <Typography
                  variant="h3"
                  sx={{
                    fontFamily: 'Comfortaa',
                    fontWeight: 'bold',
                    color: '#fff',
                    zIndex: 1,
                    textShadow: 'none',
                  }}
                >
                  {team.name.charAt(0).toUpperCase()}
                </Typography>
              </Box>
            ) : (
              <Box
                component="img"
                src={logoUrl}
                alt={`${team.name} Logo`}
                onError={() => setLogoError(true)}
                sx={{
                  width: 100,
                  height: 100,
                  objectFit: 'contain',
                }}
              />
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Typography
                variant="h5"
                component="h1"
                sx={{
                  color: theme.palette.text.primary,
                  fontFamily: 'Comfortaa',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  mt: 0.5
                }}
              >
                {team.name}
              </Typography>
              {(team.description || team.contactPerson || team.contactEmail || team.contactPhone || team.website || team.socialMedia || team.foundedYear) && (
                <IconButton 
                  sx={{ mt: 0.5, color: showTeamInfo ? theme.palette.primary.main : theme.palette.text.secondary }}
                  size="small"
                >
                  <InfoOutlinedIcon />
                </IconButton>
              )}
            </Box>
          </Box>
        </Grid>

        {/* Expanded Team Information Container */}
        {showTeamInfo && (team.description || team.contactPerson || team.contactEmail || team.contactPhone || team.website || team.socialMedia || team.foundedYear) && (
          <Grid item xs={12} sx={{ mb: 1, pt: '0 !important' }}>
            <Paper
              elevation={0}
              sx={{
                ...sectionCardSx,
                p: { xs: 2.5, sm: 3 },
                position: 'relative',
                backgroundColor: theme.palette.action.hover,
                border: `1px solid ${theme.palette.divider}`
              }}
            >
              <IconButton 
                onClick={() => setShowTeamInfo(false)} 
                sx={{ position: 'absolute', top: 8, right: 8, color: theme.palette.text.secondary }}
                size="small"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
              
              <Typography
                variant="subtitle2"
                sx={{
                  color: theme.palette.text.secondary,
                  fontFamily: 'Comfortaa',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  mb: 1
                }}
              >
                Team-Informationen
              </Typography>
              
              <Grid container spacing={3}>
                {team.description && (
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ color: theme.palette.text.primary, fontFamily: 'Comfortaa', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {team.description}
                    </Typography>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Grid container spacing={2}>
                    {(team.contactPerson || team.contactEmail || team.contactPhone || team.website) && (
                      <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {team.contactPerson && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, width: 28, height: 28 }}>
                                <Typography variant="caption" sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>
                                  {team.contactPerson.charAt(0)}
                                </Typography>
                              </Avatar>
                              <Box>
                                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', lineHeight: 1.1 }}>Ansprechpartner</Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'Comfortaa' }}>{team.contactPerson}</Typography>
                              </Box>
                            </Box>
                          )}
                          {team.contactEmail && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, width: 28, height: 28 }}><EmailIcon sx={{ fontSize: 16, color: theme.palette.text.primary }} /></Avatar>
                              <Box>
                                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', lineHeight: 1.1 }}>E-Mail</Typography>
                                <MuiLink href={`mailto:${team.contactEmail}`} underline="hover" sx={{ color: theme.palette.primary.main, fontFamily: 'Comfortaa', fontSize: '0.875rem' }}>
                                  {team.contactEmail}
                                </MuiLink>
                              </Box>
                            </Box>
                          )}
                          {team.contactPhone && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, width: 28, height: 28 }}><PhoneIcon sx={{ fontSize: 16, color: theme.palette.text.primary }} /></Avatar>
                              <Box>
                                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', lineHeight: 1.1 }}>Telefon</Typography>
                                <MuiLink href={`tel:${team.contactPhone}`} underline="hover" sx={{ color: theme.palette.primary.main, fontFamily: 'Comfortaa', fontSize: '0.875rem' }}>
                                  {team.contactPhone}
                                </MuiLink>
                              </Box>
                            </Box>
                          )}
                          {team.website && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, width: 28, height: 28 }}><PublicIcon sx={{ fontSize: 16, color: theme.palette.text.primary }} /></Avatar>
                              <Box>
                                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', lineHeight: 1.1 }}>Website</Typography>
                                <MuiLink href={team.website} target="_blank" rel="noopener" underline="hover" sx={{ color: theme.palette.primary.main, fontFamily: 'Comfortaa', fontSize: '0.875rem' }}>
                                  {team.website}
                                </MuiLink>
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </Grid>
                    )}

                    {/* Social Media & Founded */}
                    {(team.socialMedia?.facebook || team.socialMedia?.instagram || team.socialMedia?.twitter || team.foundedYear) && (
                      <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {team.foundedYear && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, width: 28, height: 28 }}><EventIcon sx={{ fontSize: 16, color: theme.palette.text.primary }} /></Avatar>
                              <Box>
                                <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', lineHeight: 1.1 }}>Gegründet</Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'Comfortaa' }}>{team.foundedYear}</Typography>
                              </Box>
                            </Box>
                          )}

                          {(team.socialMedia?.facebook || team.socialMedia?.instagram || team.socialMedia?.twitter) && (
                            <Box sx={{ mt: 0.5 }}>
                              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block', mb: 1 }}>Social Media</Typography>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                {team.socialMedia.facebook && (
                                  <Chip icon={<FacebookIcon fontSize="small" />} label="Facebook" component="a" href={team.socialMedia.facebook} target="_blank" clickable size="small" sx={{ fontFamily: 'Comfortaa', bgcolor: '#1877f2', color: '#fff', '& .MuiChip-icon': { color: '#fff' } }} />
                                )}
                                {team.socialMedia.instagram && (
                                  <Chip icon={<InstagramIcon fontSize="small" />} label="Instagram" component="a" href={team.socialMedia.instagram} target="_blank" clickable size="small" sx={{ fontFamily: 'Comfortaa', bgcolor: '#e4405f', color: '#fff', '& .MuiChip-icon': { color: '#fff' } }} />
                                )}
                                {team.socialMedia.twitter && (
                                  <Chip icon={<TwitterIcon fontSize="small" />} label="Twitter" component="a" href={team.socialMedia.twitter} target="_blank" clickable size="small" sx={{ fontFamily: 'Comfortaa', bgcolor: '#1da1f2', color: '#fff', '& .MuiChip-icon': { color: '#fff' } }} />
                                )}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Season Selector und Header */}
        {selectedSeasonId && (
          <Grid item xs={12} sx={{ mt: { xs: 2, sm: 4 }, mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'nowrap', gap: 2 }}>
              <Typography
                variant={isMobile ? 'subtitle1' : 'h5'}
                sx={{
                  color: theme.palette.text.primary,
                  fontFamily: 'Comfortaa',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Saison-Statistik
              </Typography>

              {allSeasons.length > 0 && (
                <FormControl size="small" variant="outlined" sx={{ minWidth: 120 }}>
                  <Select
                    value={selectedSeasonId || ''}
                    onChange={handleSeasonChange}
                    displayEmpty
                    sx={{
                      height: 32,
                      fontSize: '0.85rem',
                      fontFamily: 'Comfortaa',
                      fontWeight: 'bold',
                      borderRadius: 1.5,
                      backgroundColor: theme.palette.background.paper
                    }}
                  >
                    {allSeasons.map((season) => (
                      <MenuItem 
                        key={season.id} 
                        value={season.id} 
                        sx={{ 
                          fontFamily: 'Comfortaa', 
                          fontSize: '0.85rem',
                          color: season.status === 'active' ? '#FFD700' : 'inherit'
                        }}
                      >
                        {season.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          </Grid>
        )}

        {/* Combined Content Section */}
        {selectedSeasonId && (
          <Grid item xs={12} sx={{ mb: 4 }}>
            <Paper sx={{
                 p: { xs: 1, sm: 2, md: 3 }, // Minimaler Rand im Mobile-Modus
                 borderRadius: { xs: 2, sm: 3 },
                 boxShadow: theme.palette.mode === 'dark'
                  ? '0 4px 20px rgba(0,0,0,0.3)'
                  : '0 4px 20px rgba(0,0,0,0.05)',
                 backgroundColor: theme.palette.mode === 'dark' ? 'rgba(30, 30, 30, 0.6)' : '#ffffff',
                 backdropFilter: 'blur(10px)',
                 border: `1px solid ${theme.palette.divider}`,
              }}
            >
              {/* Statistics Section Content */}
              {stats && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', gap: { xs: 1, md: 4 }, width: '100%', py: { xs: 1, md: 2 }, mb: 2 }}>
                  {/* Goals Scored */}
                  <Box sx={{ textAlign: 'center', flex: 1 }}>
                    <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontFamily: 'Comfortaa', fontWeight: 700, color: theme.palette.primary.main, lineHeight: 1 }}>
                      {stats.goalsScoredPerGame}
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary, textTransform: 'uppercase', mt: 1, letterSpacing: '0.05em', fontSize: { xs: '0.65rem', sm: '0.8rem' } }}>
                      {isMobile ? 'Tore/Sp.' : 'Tore / Spiel'}
                    </Typography>
                  </Box>

                  <Box sx={{ width: '1px', height: 40, bgcolor: theme.palette.divider }} />

                  {/* Goals Conceded */}
                  <Box sx={{ textAlign: 'center', flex: 1 }}>
                    <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontFamily: 'Comfortaa', fontWeight: 700, color: theme.palette.info.main, lineHeight: 1 }}>
                      {stats.goalsConcededPerGame}
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary, textTransform: 'uppercase', mt: 1, letterSpacing: '0.05em', fontSize: { xs: '0.65rem', sm: '0.8rem' } }}>
                      {isMobile ? 'Gegentore/Sp.' : 'Gegentore / Spiel'}
                    </Typography>
                  </Box>

                  <Box sx={{ width: '1px', height: 40, bgcolor: theme.palette.divider }} />

                  {/* Points */}
                  <Box sx={{ textAlign: 'center', flex: 1 }}>
                    <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontFamily: 'Comfortaa', fontWeight: 700, color: theme.palette.secondary.main, lineHeight: 1 }}>
                      {stats.pointsPerGame}
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary, textTransform: 'uppercase', mt: 1, letterSpacing: '0.05em', fontSize: { xs: '0.65rem', sm: '0.8rem' } }}>
                      {isMobile ? 'Pkt./Sp.' : 'Punkte / Spiel'}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* League Table Mini */}
              <Box sx={{ mt: 2, mb: 1 }}>
                <DynamicLeagueTable
                  title="TABELLE"
                  form={false}
                  seasonId={selectedSeasonId}
                  userTeamId={teamId}
                  miniTable={true}
                  disableContainer={true}
                />
              </Box>

              {/* Fixtures */}
              <Box sx={{ mt: 3, mb: 1 }}>
                <DynamicFixtureList
                  title="ALLE SPIELE"
                  details={true}
                  seasonId={selectedSeasonId}
                  showType="all"
                  userTeamId={teamId}
                  disableContainer={true}
                />
              </Box>
            </Paper>
          </Grid>
        )}



        {/* Recent Results */}

      </Grid>
    </Container >
  );
};

export default TeamDetailPage;
