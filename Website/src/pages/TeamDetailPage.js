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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
        const availableSeasons = allSeasonsData.filter(s => s.status === 'finished' || s.status === 'active');
        // Sortiere nach Name (Jahr) absteigend
        availableSeasons.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        setAllSeasons(availableSeasons);
        
        // Setze die aktive Saison als Standard, falls vorhanden
        if (seasonData) {
          setCurrentSeason(seasonData);
          setSelectedSeasonId(seasonData.id);
        } else if (availableSeasons.length > 0) {
          // Falls keine aktive Saison, nimm die erste verfügbare
          setSelectedSeasonId(availableSeasons[0].id);
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
    borderColor: 'grey.800',
    background: 'linear-gradient(135deg, rgba(0, 169, 157, 0.12) 0%, rgba(17, 17, 17, 0.92) 100%)',
    boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
    p: { xs: 2, sm: 3 },
    display: 'flex',
    flexDirection: 'column',
    gap: 1.5,
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress sx={{ color: '#00A99D' }} />
        </Box>
      </Container>
    );
  }

  if (!team) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h5" sx={{ color: 'grey.300', mb: 2, fontFamily: 'comfortaa' }}>
            Team nicht gefunden.
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/teams')}
            sx={{ backgroundColor: '#00A99D', '&:hover': { backgroundColor: '#00897B' } }}
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
        <Grid item>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/teams')}
            sx={{
              color: 'grey.400',
              mb: 2,
              '&:hover': { color: '#00A99D', backgroundColor: 'rgba(0, 169, 157, 0.1)' }
            }}
          >
            Zurück zu den Teams
          </Button>
        </Grid>

        {/* Header */}
        <Grid item>
          <Paper sx={sectionCardSx}>
            <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: 3, textAlign: isMobile ? 'center' : 'left' }}>
              <Avatar
                src={logoUrl}
                sx={{
                  width: isMobile ? 100 : 120,
                  height: isMobile ? 100 : 120,
                  fontSize: isMobile ? '3rem' : '4rem',
                  color: theme.palette.getContrastText(team.logoColor || theme.palette.grey[700]),
                  backgroundColor: team.logoColor || '#00A99D',
                  border: logoUrl ? `3px solid ${team.logoColor || '#00A99D'}` : 'none',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                }}
              >
                {!logoUrl && team.name.charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography 
                  variant={isMobile ? 'h4' : 'h3'} 
                  component="h1" 
                  sx={{ 
                    color: '#00A99D', 
                    fontFamily: 'comfortaa', 
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
                      backgroundColor: 'rgba(0, 169, 157, 0.2)',
                      color: '#00A99D',
                      fontFamily: 'comfortaa',
                      fontWeight: 600,
                      mb: 1
                    }}
                  />
                )}
                {/* Season Selector - direkt unter dem Team-Namen */}
                {allSeasons.length > 0 && (
                  <FormControl size="small" sx={{ minWidth: 200, mt: 1 }}>
                    <InputLabel sx={{ color: 'grey.400', fontSize: '0.875rem' }}>Saison</InputLabel>
                    <Select
                      value={selectedSeasonId || ''}
                      onChange={handleSeasonChange}
                      label="Saison"
                      sx={{
                        color: 'grey.100',
                        fontSize: '0.875rem',
                        height: '36px',
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'grey.700',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'grey.500',
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#00A99D',
                        },
                        '& .MuiSelect-icon': {
                          color: 'grey.400',
                        },
                      }}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            bgcolor: '#333',
                            color: 'grey.200',
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
          <Grid item>
            <Paper sx={sectionCardSx}>
              <Typography 
                variant="h5" 
                sx={{ 
                  color: '#00A99D', 
                  fontFamily: 'comfortaa', 
                  fontWeight: 700, 
                  mb: 3,
                  textTransform: 'uppercase'
                }}
              >
                Team-Informationen
              </Typography>

              <Grid container spacing={3}>
                {team.description && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ color: 'grey.400', mb: 1, fontFamily: 'comfortaa' }}>
                      Über das Team
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'grey.200', fontFamily: 'comfortaa', lineHeight: 1.8 }}>
                      {team.description}
                    </Typography>
                  </Grid>
                )}

                {(team.contactPerson || team.contactEmail || team.contactPhone || team.website) && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ color: 'grey.400', mb: 2, fontFamily: 'comfortaa' }}>
                      Kontakt
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {team.contactPerson && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ color: 'grey.500', minWidth: 120, fontFamily: 'comfortaa' }}>
                            Ansprechpartner:
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'grey.200', fontFamily: 'comfortaa' }}>
                            {team.contactPerson}
                          </Typography>
                        </Box>
                      )}
                      {team.contactEmail && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ color: 'grey.500', minWidth: 120, fontFamily: 'comfortaa' }}>
                            E-Mail:
                          </Typography>
                          <MuiLink 
                            href={`mailto:${team.contactEmail}`} 
                            sx={{ color: '#00A99D', fontFamily: 'comfortaa', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {team.contactEmail}
                          </MuiLink>
                        </Box>
                      )}
                      {team.contactPhone && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ color: 'grey.500', minWidth: 120, fontFamily: 'comfortaa' }}>
                            Telefon:
                          </Typography>
                          <MuiLink 
                            href={`tel:${team.contactPhone}`} 
                            sx={{ color: '#00A99D', fontFamily: 'comfortaa', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {team.contactPhone}
                          </MuiLink>
                        </Box>
                      )}
                      {team.website && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" sx={{ color: 'grey.500', minWidth: 120, fontFamily: 'comfortaa' }}>
                            Website:
                          </Typography>
                          <MuiLink 
                            href={team.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            sx={{ color: '#00A99D', fontFamily: 'comfortaa', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                          >
                            {team.website}
                          </MuiLink>
                        </Box>
                      )}
                    </Box>
                  </Grid>
                )}

                {(team.socialMedia?.facebook || team.socialMedia?.instagram || team.socialMedia?.twitter) && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" sx={{ color: 'grey.400', mb: 2, fontFamily: 'comfortaa' }}>
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
                            fontFamily: 'comfortaa',
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
                            fontFamily: 'comfortaa',
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
                            fontFamily: 'comfortaa',
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
          <Grid item>
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
          <Grid item>
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
