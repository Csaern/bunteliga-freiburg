// src/components/DynamicLeagueTable.js
import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  useTheme,
  Chip,
  Container,
  useMediaQuery,
} from '@mui/material';
import { db } from '../firebase';
import { API_BASE_URL } from '../services/apiClient';
import * as seasonApiService from '../services/seasonApiService';
import * as bookingApiService from '../services/bookingApiService';

const TeamLogo = ({ team, isMobile }) => {
  const theme = useTheme();
  const [error, setError] = useState(false);
  const isLightMode = theme.palette.mode === 'light';
  const logoUrlToUse = (isLightMode && team.logoUrlLight) ? team.logoUrlLight : team.logoUrl;
  const logoUrl = logoUrlToUse ? (logoUrlToUse.startsWith('http') ? logoUrlToUse : `${API_BASE_URL}${logoUrlToUse}`) : null;

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

  if (error || !logoUrl) {
    return (
      <Box
        sx={{
          width: isMobile ? 20 : 28, // Klein für Tabelle
          height: isMobile ? 24 : 34, // Höher für Schild
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.palette.grey[200],
          borderRadius: '0 0 50% 50%',
          position: 'relative',
          overflow: 'hidden',
          mr: 1,
          flexShrink: 0,
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
          variant="caption"
          sx={{
            fontFamily: 'Comfortaa',
            fontWeight: 'bold',
            color: '#fff',
            zIndex: 1,
            fontSize: isMobile ? '0.55rem' : '0.75rem',
            lineHeight: 1,
          }}
        >
          {team.name.charAt(0).toUpperCase()}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
      <Box
        component="img"
        src={logoUrl}
        alt={`${team.name} Logo`}
        onError={() => setError(true)}
        sx={{
          width: isMobile ? 24 : 32,
          height: isMobile ? 24 : 32,
          objectFit: 'contain'
        }}
      />
    </Box>
  );
};

const StyledTableCell = ({ children, sx, align, hideOnMobile, ...props }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:1020px)'); // Switch to mobile layout below 1020px
  // const isMediumScreen = useMediaQuery('(max-width:1020px)'); // No longer needed as isMobile covers it

  if (isMobile && hideOnMobile) {
    return null;
  }

  return (
    <TableCell
      align={align}
      sx={{
        color: theme.palette.text.primary,
        fontFamily: 'Comfortaa',
        borderBottom: `1px solid ${theme.palette.divider}`,
        py: isMobile ? 0.6 : 1,
        px: isMobile ? 0.3 : 1, // Reduced padding for mobile
        fontSize: isMobile ? '0.75rem' : '0.9rem', // Larger font
        ...sx,
      }}
      {...props}
    >{children}</TableCell>
  );
};

const FormDisplay = ({ formArray }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const getFormStyle = (result, mobile = false) => {
    const baseStyle = {
      width: mobile ? '18%' : 25,
      height: mobile ? 1.5 : 25,
      fontSize: '0.7rem',
      margin: mobile ? '0 1%' : '0 2px',
      borderRadius: mobile ? '1px' : undefined
    };
    switch (result) {
      case 'S':
        return { ...baseStyle, backgroundColor: theme.palette.success.main, color: theme.palette.success.contrastText };
      case 'U':
        return { ...baseStyle, backgroundColor: theme.palette.warning.main, color: theme.palette.warning.contrastText };
      case 'N':
        return { ...baseStyle, backgroundColor: theme.palette.error.main, color: theme.palette.error.contrastText };
      default:
        return { ...baseStyle, backgroundColor: theme.palette.action.disabledBackground };
    }
  };

  if (isMobile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', width: '100%', mt: 0.5 }}>
        {formArray.slice(-5).map((result, index) => (
          <Box key={index} sx={getFormStyle(result, true)} />
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {formArray.slice(-5).map((result, index) => (
        <Chip key={index} label={result} size="small" sx={getFormStyle(result, false)} />
      ))}
    </Box>
  );
};

const DynamicLeagueTable = ({ title, form, seasonId, userTeamId, maxWidth, disableContainer = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:1020px)'); // Switch to mobile layout below 1020px
  const navigate = useNavigate();
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rankingCriteria, setRankingCriteria] = useState(['points', 'goalDifference', 'goalsScored']);

  const loadTableData = useCallback(async () => {
    try {
      // Wenn seasonId vorhanden ist, lade die Saison-Daten, um die registrierten Teams zu erhalten
      let seasonTeams = [];
      let activeTeamIds = [];
      if (seasonId) {
        try {
          // Versuche zuerst die aktive Saison zu laden (falls es die aktive ist)
          const activeSeason = await seasonApiService.getActiveSeasonPublic();
          if (activeSeason && activeSeason.id === seasonId && activeSeason.teams) {
            seasonTeams = activeSeason.teams;
            // Nur aktive Teams berücksichtigen
            activeTeamIds = seasonTeams
              .filter(t => t.status === 'active')
              .map(t => t.id || t.teamId)
              .filter(Boolean);
          } else {
            // Falls nicht die aktive Saison, lade die Saison direkt aus Firestore
            const seasonDoc = await getDoc(doc(db, 'seasons', seasonId));
            if (seasonDoc.exists()) {
              const seasonData = seasonDoc.data();
              if (seasonData.rankingCriteria && seasonData.rankingCriteria.length > 0) {
                setRankingCriteria(seasonData.rankingCriteria);
              }
              if (seasonData.teams && Array.isArray(seasonData.teams)) {
                seasonTeams = seasonData.teams;
                // Nur aktive Teams berücksichtigen
                activeTeamIds = seasonTeams
                  .filter(t => t.status === 'active')
                  .map(t => {
                    // Unterstütze sowohl {id, name} als auch {teamId, name} Format
                    return t.id || t.teamId;
                  })
                  .filter(Boolean);
              }
            }
          }
        } catch (error) {
          console.error('Fehler beim Laden der Saison-Daten:', error);
        }
      }

      // Teams laden
      const teamsSnap = await getDocs(collection(db, 'teams'));
      let teams = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Nur aktive Teams anzeigen, die für die Saison registriert sind
      if (seasonId && activeTeamIds.length > 0) {
        teams = teams.filter(team => activeTeamIds.includes(team.id));
      } else if (seasonId && seasonTeams.length > 0) {
        // Fallback: Falls keine Status-Informationen vorhanden, alle Teams der Saison anzeigen
        const allTeamIds = seasonTeams.map(t => t.id || t.teamId).filter(Boolean);
        teams = teams.filter(team => allTeamIds.includes(team.id));
      }

      // Ergebnisse für die aktuelle Saison laden
      let resultsQuery = collection(db, 'results');
      if (seasonId) {
        resultsQuery = query(collection(db, 'results'), where('seasonId', '==', seasonId));
      }
      const resultsSnap = await getDocs(resultsQuery);
      let results = resultsSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(result => result.status === 'confirmed' && result.isValid !== false); // Nur bestätigte und gültige Ergebnisse

      // Freundschaftsspiele nicht in die Wertung aufnehmen:
      // Wenn ein Ergebnis an eine Buchung gekoppelt ist und diese Buchung als "friendly" markiert ist,
      // wird dieses Ergebnis für die Tabelle ignoriert.
      if (seasonId) {
        try {
          const seasonBookings = await bookingApiService.getPublicBookingsForSeason(seasonId);
          const friendlyBookingIds = new Set(
            (seasonBookings || [])
              .filter(b => b.friendly)
              .map(b => b.id)
          );

          results = results.filter(result => {
            if (!result.bookingId) {
              // Freie Ergebnisse (ohne Buchung) zählen weiter für die Tabelle
              return true;
            }
            return !friendlyBookingIds.has(result.bookingId);
          });
        } catch (error) {
          console.error('Fehler beim Laden der Buchungen für Freundschaftsspiel-Filter:', error);
          // Fallback: Wenn die Buchungen nicht geladen werden können, lieber alle Ergebnisse zählen,
          // damit die Tabelle nicht leer ist.
        }
      }

      // Tabellendaten berechnen
      const teamStats = {};

      // Initialisiere nur die Teams, die für die Saison registriert sind
      teams.forEach(team => {
        teamStats[team.id] = {
          teamId: team.id,
          name: team.name,
          logoColor: team.logoColor || '#666666',
          logoUrl: team.logoUrl, // Logo-URL hinzufügen
          logoUrlLight: team.logoUrlLight,
          description: team.description,
          foundedYear: team.foundedYear,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0,
          form: []
        };
      });

      // Verarbeite Ergebnisse
      results.forEach(result => {
        const homeTeam = teamStats[result.homeTeamId];
        const awayTeam = teamStats[result.awayTeamId];

        if (homeTeam && awayTeam) {
          // Spiele erhöhen
          homeTeam.played++;
          awayTeam.played++;

          // Tore hinzufügen
          homeTeam.goalsFor += result.homeScore;
          homeTeam.goalsAgainst += result.awayScore;
          awayTeam.goalsFor += result.awayScore;
          awayTeam.goalsAgainst += result.homeScore;

          // Ergebnis bestimmen
          if (result.homeScore > result.awayScore) {
            // Heim-Sieg
            homeTeam.won++;
            homeTeam.points += 2; // 2 Punkte für Sieg
            homeTeam.form.push('S');
            awayTeam.lost++;
            awayTeam.form.push('N');
          } else if (result.homeScore < result.awayScore) {
            // Auswärts-Sieg
            awayTeam.won++;
            awayTeam.points += 2; // 2 Punkte für Sieg
            awayTeam.form.push('S');
            homeTeam.lost++;
            homeTeam.form.push('N');
          } else {
            // Unentschieden
            homeTeam.drawn++;
            homeTeam.points += 1; // 1 Punkt für Unentschieden
            homeTeam.form.push('U');
            awayTeam.drawn++;
            awayTeam.points += 1; // 1 Punkt für Unentschieden
            awayTeam.form.push('U');
          }
        }
      });

      // In Array umwandeln und sortieren
      const sortedTeams = Object.values(teamStats)
        .sort((a, b) => {
          for (const criteria of rankingCriteria) {
            let comparison = 0;
            switch (criteria) {
              case 'points':
                comparison = b.points - a.points;
                break;
              case 'goalDifference':
                comparison = (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
                break;
              case 'goalsScored':
                comparison = b.goalsFor - a.goalsFor;
                break;
              case 'headToHead':
                // H2H is complex, fallback to name for stability if other criteria are equal
                comparison = 0;
                break;
              default:
                comparison = 0;
            }
            if (comparison !== 0) return comparison;
          }
          // Alphabetisch nach Namen als letzter Fallback
          return a.name.localeCompare(b.name);
        })
        .map((team, index) => ({
          rank: index + 1,
          ...team,
          goalDifference: team.goalsFor - team.goalsAgainst
        }));

      setTableData(sortedTeams);
    } catch (error) {
      console.error('Fehler beim Laden der Tabellendaten:', error);
    } finally {
      setLoading(false);
    }
  }, [seasonId, rankingCriteria]);

  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  const Wrapper = disableContainer ? Box : Container;
  const wrapperProps = disableContainer ? { sx: { my: 4 } } : { maxWidth: maxWidth || "xl", sx: { my: 4, px: isMobile ? 1 : 2 } };

  if (loading) {
    return (
      <Wrapper {...wrapperProps}>
        <Typography
          variant={isMobile ? 'h5' : 'h4'}
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
          <Typography color="text.secondary">Lade Tabelle...</Typography>
        </Box>
      </Wrapper>
    );
  }

  return (
    <Wrapper {...wrapperProps}>
      <Typography
        variant={isMobile ? 'h5' : 'h3'}
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
      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: theme.palette.background.paper,
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.divider}`,
          overflowX: 'auto',
        }}
      >
        <Table aria-label="Fußballtabelle" size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: theme.palette.action.hover }}>
              <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.text.primary, width: isMobile ? '7%' : '3%' }}>#</StyledTableCell>
              <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.text.primary, width: isMobile ? '60%' : '25%' }}>Team</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.primary, width: isMobile ? '11%' : 'auto' }}>Sp.</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }} hideOnMobile>S</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }} hideOnMobile>U</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }} hideOnMobile>N</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }} hideOnMobile>Tore</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.primary, width: isMobile ? '11%' : 'auto' }}>Diff.</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.primary, width: isMobile ? '11%' : 'auto' }}>Pkt.</StyledTableCell>
              {form && !isMobile && <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.primary, width: '15%' }}>Form</StyledTableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {tableData.map((row) => (
              <TableRow
                key={row.teamId}
                onClick={() => navigate(`/team/${row.teamId}`)}
                sx={{
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                  '&:hover': { backgroundColor: theme.palette.action.hover },
                  ...(userTeamId && row.teamId === userTeamId && {
                    backgroundColor: theme.palette.action.selected,
                    border: `2px solid ${theme.palette.primary.main}`
                  }),
                }}
              >
                <StyledTableCell component="th" scope="row" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>{row.rank}</StyledTableCell>
                <StyledTableCell>



                  {isMobile ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.3, width: '100%' }}>
                        <TeamLogo team={row} isMobile={isMobile} />
                        <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.primary, fontSize: '0.75rem', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', flexGrow: 1 }}>
                          {row.name}
                        </Typography>
                      </Box>
                      {form && <FormDisplay formArray={row.form} />}
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TeamLogo team={row} isMobile={isMobile} />
                      <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.primary, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.name}
                      </Typography>
                    </Box>
                  )}
                </StyledTableCell>
                <StyledTableCell align="center">{row.played}</StyledTableCell>
                <StyledTableCell align="center" hideOnMobile>{row.won}</StyledTableCell>
                <StyledTableCell align="center" hideOnMobile>{row.drawn}</StyledTableCell>
                <StyledTableCell align="center" hideOnMobile>{row.lost}</StyledTableCell>
                <StyledTableCell align="center" hideOnMobile>{`${row.goalsFor}:${row.goalsAgainst}`}</StyledTableCell>
                <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: row.goalDifference > 0 ? theme.palette.success.main : (row.goalDifference < 0 ? theme.palette.error.main : theme.palette.text.secondary) }}>
                  {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                </StyledTableCell>
                <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>{row.points}</StyledTableCell>
                {form && !isMobile && (
                  <StyledTableCell align="center">
                    <FormDisplay formArray={row.form} />
                  </StyledTableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Wrapper>
  );
};

export default DynamicLeagueTable;
