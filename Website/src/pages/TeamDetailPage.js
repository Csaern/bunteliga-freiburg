import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
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
  MenuItem
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';
import { API_BASE_URL } from '../services/apiClient';
import { db } from '../firebase';
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
  const [currentSeason, setCurrentSeason] = useState(null);
  const [allSeasons, setAllSeasons] = useState([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamData();
  }, [teamId]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const [teamData, seasonData] = await Promise.all([
        teamApi.getTeamByIdPublic(teamId).catch(() => null),
        seasonApi.getActiveSeasonPublic().catch(() => null)
      ]);

      if (teamData) {
        setTeam(teamData);
      } else {
        navigate('/teams');
      }

      // Lade alle Saisons direkt aus Firestore (öffentlich zugänglich)
      try {
        const seasonsSnap = await getDocs(collection(db, 'seasons'));
        const allSeasonsData = seasonsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filtere nur finished und active Saisons (nicht planning)
        // UND nur Saisons, in denen das Team auch wirklich dabei war
        const availableSeasons = allSeasonsData.filter(s =>
          (s.status === 'finished' || s.status === 'active') &&
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
          setCurrentSeason(seasonToSelect);
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
    const selectedSeason = allSeasons.find(s => s.id === newSeasonId);
    setCurrentSeason(selectedSeason || null);
  };

  const sectionCardSx = {
    borderRadius: 4,
    border: '1px solid',
    borderColor: theme.palette.divider,
    background: `linear-gradient(135deg, ${theme.palette.action.hover} 0%, ${theme.palette.background.paper} 100%)`,
    boxShadow: theme.shadows[4],
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

  const logoUrl = team.logoUrl ? (team.logoUrl.startsWith('http') ? team.logoUrl : `${API_BASE_URL}${team.logoUrl}`) : null;

  return (
    <Container maxWidth="lg" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
      <Grid container spacing={3} direction="column">
        {/* Back Button */}
        <Grid>
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

        {/* Header */}
        <Grid>
          <Paper sx={sectionCardSx}>
            <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: 3, textAlign: isMobile ? 'center' : 'left' }}>
              <Avatar
                src={logoUrl}
                sx={{
                  width: isMobile ? 100 : 120,
                  height: isMobile ? 100 : 120,
                  fontSize: isMobile ? '3rem' : '4rem',
                  color: theme.palette.getContrastText(team.logoColor || theme.palette.grey[700]),
                  backgroundColor: team.logoColor || theme.palette.primary.main,
                  border: logoUrl ? `3px solid ${team.logoColor || theme.palette.primary.main}` : 'none',
                  boxShadow: theme.shadows[3]
                }}
              >
                {!logoUrl && team.name.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant={isMobile ? 'h4' : 'h3'}
                  component="h1"
                  sx={{
                    color: theme.palette.primary.main,
                    fontFamily: 'Comfortaa',
                    fontWeight: 700,
                    mb: 1,
                    textTransform: 'uppercase'
                  }}
                >
                  {team.name}
                </Typography>
                {team.foundedYear && (
                  <Chip
                    label={`Gegründet ${team.foundedYear}`}
                    sx={{
                      backgroundColor: theme.palette.action.selected,
                      color: theme.palette.primary.main,
                      fontFamily: 'Comfortaa',
                      fontWeight: 600,
                      mb: 1
                    }}
                  />
                )}
                {/* Season Selector - direkt unter dem Team-Namen */}
                {allSeasons.length > 0 && (
                  <FormControl size="small" sx={{ minWidth: 200, mt: 1 }}>
                    <InputLabel sx={{ color: theme.palette.text.secondary, fontSize: '0.875rem' }}>Saison</InputLabel>
                    <Select
                      value={selectedSeasonId || ''}
                      onChange={handleSeasonChange}
                      label="Saison"
                      sx={{
                        color: theme.palette.text.primary,
                        fontSize: '0.875rem',
                        height: '36px',
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
            </Box>
          </Paper>
        </Grid>

        {/* Team Information */}
        {(team.description || team.contactPerson || team.contactEmail || team.contactPhone || team.website || team.socialMedia) && (
          <Grid>
            <Paper sx={sectionCardSx}>
              <Typography
                variant="h5"
                sx={{
                  color: theme.palette.primary.main,
                  fontFamily: 'Comfortaa',
                  fontWeight: 700,
                  mb: 3,
                  textTransform: 'uppercase'
                }}
              >
                Team-Informationen
              </Typography>

              <Grid container spacing={3}>
                {team.description && (
                  <Grid xs={12}>
                    <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, mb: 1, fontFamily: 'Comfortaa' }}>
                      Über das Team
                    </Typography>
                    <Typography variant="body1" sx={{ color: theme.palette.text.primary, fontFamily: 'Comfortaa', lineHeight: 1.8 }}>
                      {team.description}
                    </Typography>
                  </Grid>
                )}

                {(team.contactPerson || team.contactEmail || team.contactPhone || team.website) && (
                  <Grid xs={12}>
                    <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, mb: 2, fontFamily: 'Comfortaa' }}>
                      Kontakt
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {team.contactPerson && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ color: theme.palette.text.disabled, minWidth: 120, fontFamily: 'Comfortaa' }}>
                            Ansprechpartner:
                          </Typography>
                          <Typography variant="body2" sx={{ color: theme.palette.text.primary, fontFamily: 'Comfortaa' }}>
                            {team.contactPerson}
                          </Typography>
                        </Box>
                      )}
                      {team.contactEmail && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ color: theme.palette.text.disabled, minWidth: 120, fontFamily: 'Comfortaa' }}>
                            E-Mail:
                          </Typography>
                          <MuiLink
                            href={`mailto:${team.contactEmail}`}
                            sx={{ color: theme.palette.primary.main, fontFamily: 'Comfortaa', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {team.contactEmail}
                          </MuiLink>
                        </Box>
                      )}
                      {team.contactPhone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ color: theme.palette.text.disabled, minWidth: 120, fontFamily: 'Comfortaa' }}>
                            Telefon:
                          </Typography>
                          <MuiLink
                            href={`tel:${team.contactPhone}`}
                            sx={{ color: theme.palette.primary.main, fontFamily: 'Comfortaa', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {team.contactPhone}
                          </MuiLink>
                        </Box>
                      )}
                      {team.website && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ color: theme.palette.text.disabled, minWidth: 120, fontFamily: 'Comfortaa' }}>
                            Website:
                          </Typography>
                          <MuiLink
                            href={team.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ color: theme.palette.primary.main, fontFamily: 'Comfortaa', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {team.website}
                          </MuiLink>
                        </Box>
                      )}
                    </Box>
                  </Grid>
                )}

                {(team.socialMedia?.facebook || team.socialMedia?.instagram || team.socialMedia?.twitter) && (
                  <Grid xs={12}>
                    <Typography variant="subtitle2" sx={{ color: theme.palette.text.secondary, mb: 2, fontFamily: 'Comfortaa' }}>
                      Social Media
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                      {team.socialMedia.facebook && (
                        <Chip
                          icon={<FacebookIcon />}
                          label="Facebook"
                          component="a"
                          href={team.socialMedia.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          clickable
                          sx={{
                            backgroundColor: 'rgba(24, 119, 242, 0.2)',
                            color: '#1877f2',
                            fontFamily: 'Comfortaa',
                            fontWeight: 600,
                            '&:hover': { backgroundColor: 'rgba(24, 119, 242, 0.3)' }
                          }}
                        />
                      )}
                      {team.socialMedia.instagram && (
                        <Chip
                          icon={<InstagramIcon />}
                          label="Instagram"
                          component="a"
                          href={team.socialMedia.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          clickable
                          sx={{
                            backgroundColor: 'rgba(228, 64, 95, 0.2)',
                            color: '#e4405f',
                            fontFamily: 'Comfortaa',
                            fontWeight: 600,
                            '&:hover': { backgroundColor: 'rgba(228, 64, 95, 0.3)' }
                          }}
                        />
                      )}
                      {team.socialMedia.twitter && (
                        <Chip
                          icon={<TwitterIcon />}
                          label="Twitter"
                          component="a"
                          href={team.socialMedia.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          clickable
                          sx={{
                            backgroundColor: 'rgba(29, 161, 242, 0.2)',
                            color: '#1da1f2',
                            fontFamily: 'Comfortaa',
                            fontWeight: 600,
                            '&:hover': { backgroundColor: 'rgba(29, 161, 242, 0.3)' }
                          }}
                        />
                      )}
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>
        )}


        {selectedSeasonId && (
          <Grid>
            <DynamicFixtureList
              title="ERGEBNISSE"
              details={true}
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
    </Container>
  );
};

export default TeamDetailPage;
