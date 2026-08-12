import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Grid, Card, CardContent, useTheme, CircularProgress, useMediaQuery, IconButton, Button } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useSwipeable } from 'react-swipeable';
import { useNavigate } from 'react-router-dom';
import LeagueTable from '../components/HistoryLeagueTable';
import * as historyApi from '../services/historyApiService';
import { API_BASE_URL } from '../services/apiClient';

// Hilfskomponente für konsistente Team-Logos (Kopie aus HistoryLeagueTable)
const TeamLogo = ({ logoUrl, logoUrlLight, logoColor, name, isMobile, size = 'medium' }) => {
  const theme = useTheme();
  const [error, setError] = useState(false);
  const isLightMode = theme.palette.mode === 'light';
  const logoUrlToUse = (isLightMode && logoUrlLight) ? logoUrlLight : logoUrl;
  const finalLogoUrl = logoUrlToUse ? (logoUrlToUse.startsWith('http') ? logoUrlToUse : `${API_BASE_URL}${logoUrlToUse}`) : null;

  const getFallbackColor = (teamName) => {
    const colors = ['#E91E63', '#FFC107', '#9C27B0', '#00BCD4'];
    let hash = 0;
    if (!teamName) return colors[0];
    for (let i = 0; i < teamName.length; i++) {
        hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const dimensions = {
    small: { w: isMobile ? 24 : 32, h: isMobile ? 24 : 32, shieldW: isMobile ? 20 : 28, shieldH: isMobile ? 24 : 34, font: isMobile ? '0.55rem' : '0.75rem' },
    medium: { w: isMobile ? 36 : 48, h: isMobile ? 36 : 48, shieldW: isMobile ? 32 : 40, shieldH: isMobile ? 36 : 48, font: isMobile ? '0.8rem' : '1.1rem' },
    large: { w: isMobile ? 48 : 64, h: isMobile ? 48 : 64, shieldW: isMobile ? 44 : 56, shieldH: isMobile ? 48 : 64, font: isMobile ? '1rem' : '1.5rem' },
  }[size];

  if (error || !finalLogoUrl) {
    return (
      <Box
        sx={{
          width: dimensions.shieldW,
          height: dimensions.shieldH,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.palette.grey[200],
          borderRadius: '0 0 50% 50%',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backgroundColor: getFallbackColor(name || ''),
          }}
        />
        <Typography
          variant="caption"
          sx={{
            fontFamily: 'Comfortaa',
            fontWeight: 'bold',
            color: '#fff',
            zIndex: 1,
            fontSize: dimensions.font,
            lineHeight: 1,
          }}
        >
          {name ? name.charAt(0).toUpperCase() : '?'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={finalLogoUrl}
      alt={`${name} Logo`}
      onError={() => setError(true)}
      sx={{
        width: dimensions.w,
        height: dimensions.h,
        objectFit: 'contain',
        flexShrink: 0
      }}
    />
  );
};

const SectionTitle = ({ children, subTitle }) => {
  const theme = useTheme();
  return (
    <Box sx={{ mb: 3, mt: 4, textAlign: 'center' }}>
      <Typography
        variant="h4"
        component="span"
        sx={{
          color: theme.palette.primary.main,
          fontWeight: 700,
          fontFamily: 'Comfortaa',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {children}
      </Typography>
      {subTitle && (
        <Typography
          variant="caption"
          component="span"
          sx={{
            ml: 1,
            color: theme.palette.text.secondary,
            fontFamily: 'Comfortaa',
            textTransform: 'none',
            letterSpacing: 'normal',
            whiteSpace: 'nowrap'
          }}
        >
          {subTitle}
        </Typography>
      )}
    </Box>
  );
};

const HistoryPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Mobile Carousel State
  const [activeChampIndex, setActiveChampIndex] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await historyApi.getHistoryStatsPublic();
      setStats(data);
    } catch (err) {
      console.error('Fehler beim Laden der Historien-Statistiken:', err);
      // Failsafe falls Backend noch nicht richtig antwortet, um App nicht zu crashen
    } finally {
      setLoading(false);
    }
  };

  const visibleCount = isMobile ? 1 : Math.min(5, stats?.champions?.length || 1);

  const handleChampNext = () => {
    if (stats && stats.champions && activeChampIndex < stats.champions.length - visibleCount) {
      setActiveChampIndex((prev) => prev + 1);
    }
  };

  const handleChampPrev = () => {
    if (activeChampIndex > 0) {
      setActiveChampIndex((prev) => prev - 1);
    }
  };

  const champHandlers = useSwipeable({
    onSwipedLeft: handleChampNext,
    onSwipedRight: handleChampPrev,
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  // --- Meilensteine Slider Logic ---
  const [activeMIndex, setActiveMIndex] = useState(0);

  const meilensteine = [];
  if (stats) {
    if (stats.highestWin) meilensteine.push({ id: 'hw', type: 'match', title: 'Rekord-Sieg', data: stats.highestWin, extra: `Tordifferenz: ${Math.abs(stats.highestWin.homeScore - stats.highestWin.awayScore)}` });
    if (stats.mostGoalsGame) meilensteine.push({ id: 'mgg', type: 'match', title: 'Torreichstes Spiel', data: stats.mostGoalsGame, extra: `Insgesamt ${stats.mostGoalsGame.homeScore + stats.mostGoalsGame.awayScore} Tore` });
    if (stats.bestOffense) meilensteine.push({ id: 'bo', type: 'stat', title: 'Torfabrik', data: stats.bestOffense, label: 'Tore pro Spiel', subText: `Insgesamt ${stats.bestOffense.total} Tore in ${stats.bestOffense.games} Spielen`});
    if (stats.bestDefense) meilensteine.push({ id: 'bd', type: 'stat', title: 'Defensiv-Bollwerk', data: stats.bestDefense, label: 'Gegentore pro Spiel', subText: `Nur ${stats.bestDefense.total} Gegentore in ${stats.bestDefense.games} Spielen`});
  }

  const mVisibleCount = isMobile ? 1 : Math.min(4, meilensteine.length || 1);

  const handleMNext = () => {
    if (meilensteine.length && activeMIndex < meilensteine.length - mVisibleCount) {
      setActiveMIndex((prev) => prev + 1);
    }
  };

  const handleMPrev = () => {
    if (activeMIndex > 0) {
      setActiveMIndex((prev) => prev - 1);
    }
  };

  const mHandlers = useSwipeable({
    onSwipedLeft: handleMNext,
    onSwipedRight: handleMPrev,
    preventScrollOnSwipe: true,
    trackMouse: true,
  });

  const renderMatchCard = (title, match, labelOverride) => {
    if (!match) return null;
    return (
      <Card sx={{ height: '100%', width: '100%', maxWidth: isMobile ? 280 : 'none', mx: 'auto', display: 'flex', flexDirection: 'column', backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 4, overflow: 'hidden' }}>
          <Box sx={{ p: 1, borderBottom: `1px solid ${theme.palette.divider}`, backgroundColor: theme.palette.action.hover, textAlign: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>
                  {title}
              </Typography>
          </Box>
          <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 1.5, '&:last-child': { pb: 1.5 }, width: '100%' }}>
              <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%' }}>
                  <Grid container spacing={0.5} alignItems="center" justifyContent="center" flexWrap="nowrap" sx={{ width: '100%' }}>
                      <Grid item xs={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minWidth: 0 }}>
                          <TeamLogo 
                              name={match.homeTeamName} logoUrl={match.homeTeamLogo} logoUrlLight={match.homeTeamLogoLight} logoColor={match.homeTeamColor} size="small" isMobile={isMobile}
                          />
                          <Typography variant="caption" sx={{ mt: 0.5, fontWeight: 'bold', fontFamily: 'Comfortaa', lineHeight: 1.2, fontSize: '0.65rem', whiteSpace: 'normal', wordBreak: 'break-word', hyphens: 'auto', width: '100%', overflowWrap: 'break-word' }}>{match.homeTeamName}</Typography>
                      </Grid>
                      <Grid item xs={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minWidth: 0 }}>
                          <Typography variant="h5" sx={{ fontWeight: 900, color: theme.palette.primary.main, fontFamily: 'Comfortaa', letterSpacing: '-0.05em' }}>
                              {match.homeScore}:{match.awayScore}
                          </Typography>
                          {labelOverride && (
                              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, mt: 0.25, display: 'block', fontSize: '0.6rem', lineHeight: 1.1, whiteSpace: 'normal' }}>
                                  {labelOverride}
                              </Typography>
                          )}
                      </Grid>
                      <Grid item xs={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minWidth: 0 }}>
                          <TeamLogo 
                              name={match.awayTeamName} logoUrl={match.awayTeamLogo} logoUrlLight={match.awayTeamLogoLight} logoColor={match.awayTeamColor} size="small" isMobile={isMobile}
                          />
                          <Typography variant="caption" sx={{ mt: 0.5, fontWeight: 'bold', fontFamily: 'Comfortaa', lineHeight: 1.2, fontSize: '0.65rem', whiteSpace: 'normal', wordBreak: 'break-word', hyphens: 'auto', width: '100%', overflowWrap: 'break-word' }}>{match.awayTeamName}</Typography>
                      </Grid>
                  </Grid>
              </Box>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 'bold', mt: 1, pt: 0.5, borderTop: `1px solid ${theme.palette.divider}`, width: '100%', textAlign: 'center', fontSize: '0.65rem', flexShrink: 0 }}>
                  {match.seasonName}
              </Typography>
          </CardContent>
      </Card>
    );
  };

  const renderStatCard = (title, statResult, valueLabel, subText) => {
    if (!statResult) return null;
    return (
      <Card sx={{ height: '100%', width: '100%', maxWidth: isMobile ? 280 : 'none', mx: 'auto', display: 'flex', flexDirection: 'column', backgroundColor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 4, overflow: 'hidden', textAlign: 'center' }}>
          <Box sx={{ p: 1, borderBottom: `1px solid ${theme.palette.divider}`, backgroundColor: theme.palette.action.hover }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>
                  {title}
              </Typography>
          </Box>
          <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 2 }}>
              <TeamLogo 
                  name={statResult.name} logoUrl={statResult.logoUrl} logoUrlLight={statResult.logoUrlLight} logoColor={statResult.logoColor} size={isMobile ? "large" : "medium"} 
              />
              <Typography variant={isMobile ? "h6" : "body1"} sx={{ mt: 1.5, fontWeight: 'bold', fontFamily: 'Comfortaa', lineHeight: 1.2 }}>
                  {statResult.name}
              </Typography>
              <Typography variant="h4" sx={{ mt: 1, fontWeight: 900, color: theme.palette.primary.main }}>
                  {statResult.ratio}
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, textTransform: 'uppercase' }}>
                  {valueLabel}
              </Typography>
              <Typography variant={isMobile ? "body2" : "caption"} sx={{ mt: 1, color: theme.palette.text.secondary }}>
                  {subText}
              </Typography>
          </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', pb: 6 }}>
      
      {/* OBERER BEREICH: Meister & Rekordspiel */}
      <Container maxWidth="xl" sx={{ pt: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
        <SectionTitle subTitle="seit 2020">Meister</SectionTitle>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        ) : (
          stats && stats.champions && stats.champions.length > 0 ? (
              <Box {...champHandlers} sx={{ position: 'relative', px: isMobile ? 4 : 6, mb: 4 }}>
                  <Box sx={{ position: 'absolute', left: isMobile ? -8 : 0, top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
                    <IconButton size={isMobile ? "small" : "large"} onClick={handleChampPrev} disabled={activeChampIndex === 0}>
                      <ChevronLeftIcon fontSize="inherit" />
                    </IconButton>
                  </Box>

                  {/* Unified Desktop & Mobile Carousel */}
                  <Box sx={{ overflow: 'hidden', mx: isMobile ? 0 : 1 }}>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)', 
                        transform: `translateX(-${activeChampIndex * (100 / visibleCount)}%)` 
                      }}
                    >
                      {stats.champions.map((champ, index) => (
                        <Box 
                          key={champ.seasonId} 
                          sx={{ 
                            width: `${100 / visibleCount}%`, 
                            flexShrink: 0, 
                            px: 1 // 16px gaps
                          }}
                        >
                           <Card 
                             onClick={() => navigate(`/team/${champ.teamId}?seasonId=${champ.seasonId}`)}
                             sx={{ cursor: 'pointer', height: '100%', width: '100%', maxWidth: isMobile ? 280 : 'none', mx: 'auto', textAlign: 'center', backgroundColor: theme.palette.background.paper, border: index === 0 ? `2px solid ${theme.palette.secondary.main}` : `1px solid ${theme.palette.divider}`, borderRadius: 4, overflow: 'hidden' }}
                           >
                               <Box sx={{ p: 1, backgroundColor: theme.palette.action.hover, borderBottom: `1px solid ${theme.palette.divider}` }}>
                                   <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: theme.palette.text.secondary }}>
                                       {champ.seasonName}
                                   </Typography>
                               </Box>
                               <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
                                   <TeamLogo 
                                       name={champ.teamName} logoUrl={champ.logoUrl} logoUrlLight={champ.logoUrlLight} logoColor={champ.logoColor} size={isMobile ? "large" : "medium"} 
                                   />
                                   <Typography variant={isMobile ? "h6" : "body1"} sx={{ mt: isMobile ? 2 : 1.5, fontWeight: 'bold', fontFamily: 'Comfortaa', lineHeight: 1.2, minHeight: isMobile ? 'auto' : 42, display: 'flex', alignItems: 'center' }}>
                                       {champ.teamName}
                                   </Typography>
                                   <Typography variant={isMobile ? "body2" : "caption"} color="text.secondary" sx={{ mt: 1 }}>
                                       {champ.points} Pkt | {champ.goalDifference > 0 ? `+${champ.goalDifference}` : champ.goalDifference} Tore
                                   </Typography>
                               </CardContent>
                           </Card>
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  <Box sx={{ position: 'absolute', right: isMobile ? -8 : 0, top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
                    <IconButton size={isMobile ? "small" : "large"} onClick={handleChampNext} disabled={activeChampIndex >= stats.champions.length - visibleCount}>
                      <ChevronRightIcon fontSize="inherit" />
                    </IconButton>
                  </Box>

                  {/* Dot Navigators */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 1, flexWrap: 'wrap' }}>
                     {Array.from({ length: Math.max(1, stats.champions.length - visibleCount + 1) }).map((_, i) => (
                        <Box 
                          key={i} 
                          onClick={() => setActiveChampIndex(i)}
                          sx={{ 
                            width: 8, 
                            height: 8, 
                            borderRadius: '50%', 
                            cursor: 'pointer',
                            bgcolor: i === activeChampIndex ? 'primary.main' : theme.palette.action.disabledBackground,
                            transition: 'background-color 0.3s ease'
                          }} 
                        />
                     ))}
                  </Box>
              </Box>
          ) : (
            <Typography sx={{ textAlign: 'center', color: 'text.secondary', mb: 4 }}>Noch keine Meisterdaten vorhanden.</Typography>
          )
        )}

        {/* Die Rekordspiele wurden in den unteren Bereich verschoben */}
      </Container>

      {/* MITTLERER BEREICH: Ewige Tabelle */}
      <LeagueTable title="Ewige Tabelle" subTitle="seit 2020" />

      {/* UNTERER BEREICH: Weitere Meilensteine */}
      {/* TEMPORARILY DISABLED: User requested to hide this section for now
      <Container maxWidth="xl" sx={{ px: { xs: 2, sm: 3 }, mt: 2 }}>
         <SectionTitle subTitle="seit 2020">Meilensteine</SectionTitle>
         {loading ? (
             <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
         ) : (
             meilensteine.length > 0 && (
               isMobile ? (
                  <Box {...mHandlers} sx={{ position: 'relative', px: 4, mb: 4 }}>
                      <Box sx={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
                        <IconButton size="small" onClick={handleMPrev} disabled={activeMIndex === 0}>
                          <ChevronLeftIcon fontSize="inherit" />
                        </IconButton>
                      </Box>
    
                      <Box sx={{ overflow: 'hidden', mx: 0 }}>
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)', 
                            transform: `translateX(-${activeMIndex * 100}%)` 
                          }}
                        >
                          {meilensteine.map((ms) => (
                            <Box 
                              key={ms.id} 
                              sx={{ 
                                width: '100%', 
                                flexShrink: 0, 
                                px: 1
                              }}
                            >
                               {ms.type === 'match' ? renderMatchCard(ms.title, ms.data, ms.extra) : renderStatCard(ms.title, ms.data, ms.label, ms.subText)}
                            </Box>
                          ))}
                        </Box>
                      </Box>
    
                      <Box sx={{ position: 'absolute', right: -8, top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
                        <IconButton size="small" onClick={handleMNext} disabled={activeMIndex >= meilensteine.length - 1}>
                          <ChevronRightIcon fontSize="inherit" />
                        </IconButton>
                      </Box>
    
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, gap: 1, flexWrap: 'wrap' }}>
                         {Array.from({ length: Math.max(1, meilensteine.length) }).map((_, i) => (
                            <Box 
                              key={i} 
                              onClick={() => setActiveMIndex(i)}
                              sx={{ 
                                width: 8, 
                                height: 8, 
                                borderRadius: '50%', 
                                cursor: 'pointer',
                                bgcolor: i === activeMIndex ? 'primary.main' : theme.palette.action.disabledBackground,
                                transition: 'background-color 0.3s ease'
                              }} 
                            />
                         ))}
                      </Box>
                  </Box>
               ) : (
                  <Grid container spacing={3} justifyContent="center" alignItems="stretch" sx={{ mb: 4 }}>
                     {meilensteine.map((ms) => (
                         <Grid item xs={12} sm={6} md={3} key={ms.id} sx={{ display: 'flex' }}>
                            {ms.type === 'match' ? renderMatchCard(ms.title, ms.data, ms.extra) : renderStatCard(ms.title, ms.data, ms.label, ms.subText)}
                         </Grid>
                     ))}
                  </Grid>
               )
             )
         )}
      </Container>
      */}

      {/* DOWNLOAD BEREICH: Komplette Ewige Tabelle als Excel */}
      <Container maxWidth="md" sx={{ px: { xs: 2, sm: 3 }, mt: 4, mb: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Typography variant="body1" sx={{ mb: 2, color: 'text.secondary', maxWidth: '600px' }}>
              Aufgrund der fehlenden Spieldaten wurden in dieser Übersicht nur die Saisons ab 2020 berücksichtigt. 
              Die vollständige Ewige Tabelle (aller Jahre bis 2026) kannst du hier als Excel-Datei herunterladen.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            size="large"
            startIcon={<DownloadIcon />}
            href={`${API_BASE_URL}/uploads/ewigeTabelle.xlsx`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ fontWeight: 'bold', py: 1.5, px: 4, borderRadius: 2 }}
          >
             Ewige Tabelle
          </Button>
      </Container>
    </Box>
  );
};

export default HistoryPage;