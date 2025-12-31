import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  Paper,
  Container,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { db } from '../firebase';
import { API_BASE_URL } from '../services/apiClient';
import * as seasonApiService from '../services/seasonApiService';

// Helper für Farbe
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

// Interne Komponente für Logo Handling
const TeamLogoItem = ({ team, isMobile }) => {
  const theme = useTheme();
  const [imgError, setImgError] = useState(false);
  const isLightMode = theme.palette.mode === 'light';

  // Wähle das passende Logo: Light Mode Logo bevorzugen wenn im Light Mode und vorhanden
  const logoUrlToUse = (isLightMode && team.logoUrlLight) ? team.logoUrlLight : team.logoUrl;

  const logoSrc = logoUrlToUse
    ? (logoUrlToUse.startsWith('http') ? logoUrlToUse : `${API_BASE_URL}${logoUrlToUse}`)
    : null;

  if (imgError || !logoSrc) {
    return (
      <Box
        sx={{
          width: isMobile ? 26 : 40, // Größer als in Tabelle
          height: isMobile ? 32 : 46, // Schild-Format
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5',
          borderRadius: '0 0 50% 50%',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backgroundColor: getFallbackColor(team.name),
          }}
        />
        <Typography
          variant="h6"
          sx={{
            fontFamily: 'Comfortaa',
            fontWeight: 'bold',
            color: '#fff',
            zIndex: 1,
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
            fontSize: isMobile ? '0.7rem' : '1.0rem',
          }}
        >
          {team.name.substring(0, 1).toUpperCase()}
        </Typography>
      </Box>
    );
  }

  return (
    <Avatar
      variant="rounded"
      alt={`${team.name} Logo`}
      src={logoSrc}
      imgProps={{
        onError: () => setImgError(true)
      }}
      sx={{
        width: isMobile ? 30 : 45,
        height: isMobile ? 30 : 45,
        backgroundColor: 'transparent',
        '& img': { objectFit: 'contain' }
      }}
    />
  );
};

const DynamicTeamList = ({ title }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:850px)'); // Changed to 850px as requested // Changed to 1250px
  const navigate = useNavigate();
  const [allTeams, setAllTeams] = useState([]); // Alle Teams aus der DB
  const [displayedTeams, setDisplayedTeams] = useState([]); // Die aktuell angezeigten Teams
  const [loading, setLoading] = useState(true);
  const [activeSeason, setActiveSeason] = useState(null); // Aktive Saison Daten
  const [showAll, setShowAll] = useState(false); // Toggle Status

  useEffect(() => {
    loadTeams();
  }, []);

  // Effekt zum Aktualisieren der angezeigten Teams basierend auf Toggle und geladenen Daten
  useEffect(() => {
    if (loading) return;

    if (showAll) {
      setDisplayedTeams(allTeams);
    } else {
      // Wenn eine aktive Saison existiert, filtere danach. Sonst zeige alle (Fallback)
      if (activeSeason && activeSeason.teams) {
        const seasonTeamIds = activeSeason.teams.map(t => t.id || t.teamId).filter(Boolean);
        const filtered = allTeams.filter(team => seasonTeamIds.includes(team.id));
        setDisplayedTeams(filtered);
      } else {
        setDisplayedTeams(allTeams);
      }
    }
  }, [showAll, allTeams, activeSeason, loading]);

  const loadTeams = async () => {
    try {
      // 1. Lade aktive Saison
      let currentSeason = null;
      try {
        currentSeason = await seasonApiService.getActiveSeasonPublic();
        setActiveSeason(currentSeason);
      } catch (error) {
        console.log('Keine aktive Saison gefunden oder Fehler:', error);
      }

      // 2. Lade ALLE Teams
      const teamsSnap = await getDocs(collection(db, 'teams'));
      let teamsData = teamsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      teamsData.sort((a, b) => a.name.localeCompare(b.name)); // Alphabetisch sortieren
      setAllTeams(teamsData);

    } catch (error) {
      console.error('Fehler beim Laden der Teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleShowAll = () => {
    setShowAll(prev => !prev);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ my: 4, px: isMobile ? 1 : 2 }}>
        <Typography
          variant={isMobile ? 'h4' : 'h3'}
          sx={{
            mb: 2,
            mt: 2,
            color: theme.palette.primary.main,
            fontWeight: 700,
            fontFamily: 'Comfortaa',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {title}
        </Typography>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary">Lade Teams...</Typography>
        </Box>
      </Container>
    );
  }

  // Bestimme den Titel der Liste
  const listTitle = showAll
    ? "Alle Teams"
    : (activeSeason ? activeSeason.name : "Alle Teams");

  const toggleText = showAll
    ? (activeSeason ? `Zeige ${activeSeason.name}` : "Zeige Saison")
    : "Zeige alle Teams";

  return (
    <Container maxWidth="md" sx={{ my: 4, px: isMobile ? 1 : 2 }}>
      <Typography
        variant={isMobile ? 'h4' : 'h3'}
        sx={{
          mb: 2,
          mt: 2,
          color: theme.palette.primary.main,
          fontWeight: 700,
          fontFamily: 'Comfortaa',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {title}
      </Typography>

      <Paper
        sx={{
          backgroundColor: theme.palette.background.paper,
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{
          p: 1.5, // Reduziertes Padding
          borderBottom: `1px solid ${theme.palette.divider}`,
          position: 'relative', // Für absolute Positionierung des Toggles
          display: 'flex',
          justifyContent: isMobile ? 'space-between' : 'center', // Mobile: Space between, Desktop: Center
          alignItems: 'center',
          minHeight: '48px', // Mindesthöhe für Konsistenz
        }}>
          <Typography sx={{
            color: theme.palette.text.primary, // Schwarz/Weiß
            fontWeight: 'bold',
            fontSize: isMobile ? '0.9rem' : '1.1rem', // Schriftgröße verkleinert
            textAlign: isMobile ? 'left' : 'center', // Links auf Mobile
            width: isMobile ? 'auto' : '100%', // Auto width on mobile to allow space for toggle
            flex: isMobile ? 1 : 'unset',
            px: isMobile ? 0 : 4, // Kein Padding auf Mobile nötig da linksbündig
          }}>
            {listTitle}
          </Typography>

          <Typography
            onClick={handleToggleShowAll}
            sx={{
              position: 'absolute', // Behalte absolute Positionierung bei
              right: 16, // Rechtsbündig
              color: theme.palette.text.secondary, // Dezentere Farbe für den Toggle
              fontFamily: 'Comfortaa',
              fontWeight: 'bold',
              fontSize: isMobile ? '0.7rem' : '0.8rem',
              cursor: 'pointer',
              '&:hover': {
                color: theme.palette.primary.main,
                textDecoration: 'underline',
              }
            }}
          >
            {toggleText}
          </Typography>
        </Box>

        {displayedTeams.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">Keine Teams gefunden.</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {displayedTeams.map((team, index) => {
              return (
                <ListItem
                  key={team.id}
                  sx={{
                    py: isMobile ? 0.75 : 1, // Weiter reduziertes Padding
                    px: isMobile ? 1.5 : 2.5,
                    borderBottom: index === displayedTeams.length - 1 ? 'none' : `1px solid ${theme.palette.divider}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'background-color 0.2s ease',
                    '&:hover': {
                      backgroundColor: theme.palette.action.hover,
                      '& .team-name': {
                        color: theme.palette.primary.main,
                      }
                    },
                  }}
                  onClick={() => navigate(`/team/${team.id}`)}
                >
                  <ListItemAvatar sx={{
                    minWidth: isMobile ? 40 : 60,
                    mr: isMobile ? 1 : 2,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <TeamLogoItem team={team} isMobile={isMobile} />
                  </ListItemAvatar>

                  <Box sx={{ flexGrow: 1 }}>
                    <Typography
                      variant="body1"
                      component="div"
                      className="team-name" // Klasse für Hover-Effekt
                      sx={{
                        fontFamily: 'Comfortaa',
                        color: theme.palette.text.primary,
                        fontWeight: 500, // Reduziert von bold
                        fontSize: isMobile ? '0.8rem' : '1.1rem',
                        lineHeight: 1.3,
                        transition: 'color 0.2s ease',
                        // Unterstreichung entfernt
                      }}
                    >
                      {team.name}
                    </Typography>

                    {team.description && (
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'Comfortaa',
                          color: theme.palette.text.secondary,
                          fontSize: isMobile ? '0.7rem' : '0.9rem',
                          mt: 0.5,
                        }}
                      >
                        {team.description}
                      </Typography>
                    )}
                  </Box>

                  {/* Gegründet entfernt */}
                </ListItem >
              );
            })}
          </List >
        )}
      </Paper >
    </Container >
  );
};

export default DynamicTeamList;
