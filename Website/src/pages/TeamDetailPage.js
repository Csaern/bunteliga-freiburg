import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  AccordionDetails
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
import SportsScoreIcon from '@mui/icons-material/SportsScore'; // Using SportsScore as "Goal/Tor" replacement if explicit Net icon isn't ideal
import { API_BASE_URL } from '../services/apiClient';
import * as teamApi from '../services/teamApiService';
import * as seasonApi from '../services/seasonApiService';
import DynamicFixtureList from '../components/DynamicFixtureList';
import DynamicLeagueTable from '../components/DynamicLeagueTable';

const TeamDetailPage = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:850px)'); // Changed to 850px as requested
  const [team, setTeam] = useState(null);
  const [logoError, setLogoError] = useState(false);

  const [allSeasons, setAllSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

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

        // Setze die Saison, in der das Team zuletzt gespielt hat (die erste in der sortierten Liste)
        let seasonToSelect = null;

        if (availableSeasons.length > 0) {
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
        <Grid item>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{
              color: theme.palette.text.secondary,
              mb: isMobile ? 0.5 : 2, // Reduced margin on mobile
              '&:hover': { color: theme.palette.primary.main, backgroundColor: theme.palette.action.hover }
            }}
          >
            Zurück
          </Button>
        </Grid>

        {/* Header - Minimal & Centered */}
        <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, textAlign: 'center' }}>
            {(logoError || !logoUrl) ? (
              <Box
                sx={{
                  width: 120,
                  minHeight: 140, // Leicht höher für Schild-Proportion
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.palette.grey[200],
                  borderRadius: '0 0 50% 50%', // Schild-Form beibehalten
                  position: 'relative',
                  overflow: 'hidden',
                  // boxShadow removed
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
                  variant="h2"
                  sx={{
                    fontFamily: 'Comfortaa',
                    fontWeight: 'bold',
                    color: '#fff',
                    zIndex: 1,
                    textShadow: 'none', // Removed text shadow as well for consistency
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
                  width: 180, // Etwas größer für gute Sichtbarkeit da alleinstehend
                  height: 180,
                  objectFit: 'contain',
                  // filter removed
                }}
              />
            )}

            <Typography
              variant="h4"
              component="h1"
              sx={{
                color: theme.palette.text.primary,
                fontFamily: 'Comfortaa',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                mt: 1
              }}
            >
              {team.name}
            </Typography>
          </Box>
        </Grid>

        {/* Team Information - Collapsible Accordion Integrated into Card */}
        {(team.description || team.contactPerson || team.contactEmail || team.contactPhone || team.website || team.socialMedia || team.foundedYear) && (
          <Grid item xs={12} sx={{ mb: 2 }}>
            {/* Die Accordion selbst ist jetzt der Border-Container */}
            <Accordion
              defaultExpanded={false}
              sx={{
                ...sectionCardSx,
                p: 0, // Reset padding for accordion root
                '&.Mui-expanded': { margin: 0 }, // Prevent margin jump
                '&:before': { display: 'none' } // Remove default divider
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: theme.palette.text.secondary }} />}
                sx={{
                  px: { xs: 2, sm: 3 },
                  py: 0, // Reduced vertical padding
                  minHeight: 40, // Reduced minHeight
                  '& .MuiAccordionSummary-content': { margin: '8px 0' } // Reduced margin for content
                }}
              >
                <Typography
                  variant="h6"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontFamily: 'Comfortaa',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Team-Informationen
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 }, pt: 0 }}>
                <Grid container spacing={3}>
                  {team.description && (
                    <Grid item xs={12}>
                      <Typography variant="body1" sx={{ color: theme.palette.text.primary, fontFamily: 'Comfortaa', lineHeight: 1.8 }}>
                        {team.description}
                      </Typography>
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <Grid container spacing={2}>
                      {(team.contactPerson || team.contactEmail || team.contactPhone || team.website) && (
                        <Grid item xs={12} md={6}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {team.contactPerson && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: theme.palette.action.selected, width: 32, height: 32 }}>
                                  <Typography variant="caption" sx={{ color: theme.palette.text.primary, fontWeight: 'bold' }}>
                                    {team.contactPerson.charAt(0)}
                                  </Typography>
                                </Avatar>
                                <Box>
                                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>Ansprechpartner</Typography>
                                  <Typography variant="body2" sx={{ fontFamily: 'Comfortaa' }}>{team.contactPerson}</Typography>
                                </Box>
                              </Box>
                            )}
                            {team.contactEmail && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: theme.palette.action.selected, width: 32, height: 32 }}><EmailIcon sx={{ fontSize: 18, color: theme.palette.text.primary }} /></Avatar>
                                <Box>
                                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>E-Mail</Typography>
                                  <MuiLink href={`mailto:${team.contactEmail}`} underline="hover" sx={{ color: theme.palette.primary.main, fontFamily: 'Comfortaa', fontSize: '0.875rem' }}>
                                    {team.contactEmail}
                                  </MuiLink>
                                </Box>
                              </Box>
                            )}
                            {team.contactPhone && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: theme.palette.action.selected, width: 32, height: 32 }}><PhoneIcon sx={{ fontSize: 18, color: theme.palette.text.primary }} /></Avatar>
                                <Box>
                                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>Telefon</Typography>
                                  <MuiLink href={`tel:${team.contactPhone}`} underline="hover" sx={{ color: theme.palette.primary.main, fontFamily: 'Comfortaa', fontSize: '0.875rem' }}>
                                    {team.contactPhone}
                                  </MuiLink>
                                </Box>
                              </Box>
                            )}
                            {team.website && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: theme.palette.action.selected, width: 32, height: 32 }}><PublicIcon sx={{ fontSize: 18, color: theme.palette.text.primary }} /></Avatar>
                                <Box>
                                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>Website</Typography>
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
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {team.foundedYear && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar sx={{ bgcolor: theme.palette.action.selected, width: 32, height: 32 }}><EventIcon sx={{ fontSize: 18, color: theme.palette.text.primary }} /></Avatar>
                                <Box>
                                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: 'block' }}>Gegründet</Typography>
                                  <Typography variant="body2" sx={{ fontFamily: 'Comfortaa' }}>{team.foundedYear}</Typography>
                                </Box>
                              </Box>
                            )}

                            {(team.socialMedia?.facebook || team.socialMedia?.instagram || team.socialMedia?.twitter) && (
                              <Box sx={{ mt: 1 }}>
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
              </AccordionDetails>
            </Accordion>
          </Grid>
        )}

        {/* Statistics Section */}
        {stats && (
          <Grid item sx={{ mt: 2, mb: 4 }}>
            <Paper sx={sectionCardSx}>
              <Typography
                variant="h5"
                sx={{
                  color: theme.palette.text.primary,
                  fontFamily: 'Comfortaa',
                  fontWeight: 700,
                  mb: 3,
                  textTransform: 'uppercase',
                  textAlign: 'left' // Linksbündig
                }}
              >
                Saison-Statistik
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: { xs: 1, md: 4 }, width: '100%' }}>
                {/* Goals Scored */}
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <SportsSoccerIcon sx={{ fontSize: isMobile ? 28 : 36, mb: 1, color: theme.palette.primary.main }} />
                  <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontFamily: 'Comfortaa', fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1 }}>
                    {stats.goalsScoredPerGame}
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, textTransform: 'uppercase', display: 'block', mt: 0.5, fontSize: '0.7rem' }}>
                    Tore / Spiel
                  </Typography>
                </Box>

                {/* Divider */}
                <Box sx={{ width: '1px', height: 40, bgcolor: theme.palette.divider }} />

                {/* Goals Conceded - Back to Shield (SecurityIcon) and Blue */}
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <SecurityIcon sx={{ fontSize: isMobile ? 28 : 36, mb: 1, color: theme.palette.info.main }} />
                  <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontFamily: 'Comfortaa', fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1 }}>
                    {stats.goalsConcededPerGame}
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, textTransform: 'uppercase', display: 'block', mt: 0.5, fontSize: '0.7rem' }}>
                    Gegentore
                  </Typography>
                </Box>

                {/* Divider */}
                <Box sx={{ width: '1px', height: 40, bgcolor: theme.palette.divider }} />

                {/* Points */}
                <Box sx={{ textAlign: 'center', flex: 1 }}>
                  <EmojiEventsIcon sx={{ fontSize: isMobile ? 28 : 36, mb: 1, color: theme.palette.secondary.main }} />
                  <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontFamily: 'Comfortaa', fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1 }}>
                    {stats.pointsPerGame}
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, textTransform: 'uppercase', display: 'block', mt: 0.5, fontSize: '0.7rem' }}>
                    Punkte / Spiel
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        )}

        {selectedSeasonId && (
          <Grid item>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              {/* Season Selector - jetzt hier platziert */}
              {allSeasons.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel sx={{ color: theme.palette.text.secondary, fontSize: '0.875rem' }}>Saison</InputLabel>
                  <Select
                    value={selectedSeasonId || ''}
                    onChange={handleSeasonChange}
                    label="Saison"
                    sx={{
                      color: theme.palette.text.primary,
                      fontSize: '0.875rem',
                      height: '40px', // Etwas höher
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.divider,
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.text.secondary,
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.primary.main,
                      },
                      '& .MuiSelect-icon': {
                        color: theme.palette.text.secondary,
                      },
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          bgcolor: theme.palette.background.paper,
                          color: theme.palette.text.primary,
                        },
                      },
                    }}
                  >
                    {allSeasons.map((season) => (
                      <MenuItem key={season.id} value={season.id}>
                        {season.name} {season.status === 'active' ? '(Aktiv)' : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
            <DynamicFixtureList
              title="ERGEBNISSE"
              details={false}
              seasonId={selectedSeasonId}
              showType="results"
              userTeamId={teamId}
            />
          </Grid>
        )}

        {/* League Table */}
        {selectedSeasonId && (
          <Grid>
            <DynamicLeagueTable
              title="TABELLE"
              form={true}
              seasonId={selectedSeasonId}
              userTeamId={teamId}
            />
          </Grid>
        )}

        {/* Recent Results */}

      </Grid>
    </Container >
  );
};

export default TeamDetailPage;
