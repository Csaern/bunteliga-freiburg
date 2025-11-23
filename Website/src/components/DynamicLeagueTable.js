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
  Avatar,
  useTheme,
  Chip,
  Container,
  useMediaQuery,
} from '@mui/material';
import { db } from '../firebase';
import { API_BASE_URL } from '../services/apiClient';
import * as seasonApiService from '../services/seasonApiService';

const StyledTableCell = ({ children, sx, align, hideOnMobile, ...props }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  if (isMobile && hideOnMobile) {
    return null;
  }

  return (
    <TableCell
      align={align}
      sx={{
        color: theme.palette.grey[300],
        fontFamily: 'comfortaa',
        borderBottom: `1px solid ${theme.palette.grey[800]}`,
        py: isMobile ? 0.6 : 1,
        px: isMobile ? 0.5 : 1,
        fontSize: isMobile ? '0.7rem' : '0.8rem',
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
        return { ...baseStyle, backgroundColor: theme.palette.success.light, color: theme.palette.common.white };
      case 'U':
        return { ...baseStyle, backgroundColor: theme.palette.warning.light, color: theme.palette.common.black };
      case 'N':
        return { ...baseStyle, backgroundColor: theme.palette.error.light, color: theme.palette.common.white };
      default:
        return { ...baseStyle, backgroundColor: theme.palette.grey[700] };
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

const DynamicLeagueTable = ({ title, form, seasonId, userTeamId }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);

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
      const results = resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(result => result.status === 'confirmed' && result.isValid !== false); // Nur bestätigte und gültige Ergebnisse

      // Tabellendaten berechnen
      const teamStats = {};
      
      // Initialisiere nur die Teams, die für die Saison registriert sind
      teams.forEach(team => {
        teamStats[team.id] = {
          teamId: team.id,
          name: team.name,
          logoColor: team.logoColor || '#666666',
          logoUrl: team.logoUrl, // Logo-URL hinzufügen
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
          // Sortiere nach Punkten (absteigend)
          if (b.points !== a.points) {
            return b.points - a.points;
          }
          // Bei gleichen Punkten: Tordifferenz
          const aDiff = a.goalsFor - a.goalsAgainst;
          const bDiff = b.goalsFor - b.goalsAgainst;
          if (bDiff !== aDiff) {
            return bDiff - aDiff;
          }
          // Bei gleicher Tordifferenz: mehr Tore
          if (b.goalsFor !== a.goalsFor) {
            return b.goalsFor - a.goalsFor;
          }
          // Alphabetisch nach Namen
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
  }, [seasonId]);

  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ my: 4, px: isMobile ? 1 : 2 }}>
        <Typography
          variant={isMobile ? 'h5' : 'h4'}
          sx={{
            mb: 2,
            mt: 2,
            color: '#00A99D',
            fontWeight: 700,
            fontFamily: 'comfortaa',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {title}
        </Typography>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="grey.400">Lade Tabelle...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ my: 4, px: isMobile ? 1 : 2 }}>
      <Typography
        variant={isMobile ? 'h5' : 'h4'}
        sx={{
          mb: 2,
          mt: 2,
          color: '#00A99D',
          fontWeight: 700,
          fontFamily: 'comfortaa',
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
          backgroundColor: '#111',
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.grey[800]}`,
        }}
      >
        <Table aria-label="Fußballtabelle" size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.grey[100], width: isMobile ? '7%' : '3%' }}>#</StyledTableCell>
              <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.grey[100], width: isMobile ? '60%' : '25%' }}>Team</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.grey[100], width: isMobile ? '11%' : 'auto' }}>Sp.</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.grey[100] }} hideOnMobile>S</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.grey[100] }} hideOnMobile>U</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.grey[100] }} hideOnMobile>N</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.grey[100] }} hideOnMobile>Tore</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.grey[100], width: isMobile ? '11%' : 'auto' }}>Diff.</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.grey[100], width: isMobile ? '11%' : 'auto' }}>Pkt.</StyledTableCell>
              {form && !isMobile && <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.grey[100], width: '15%' }}>Form</StyledTableCell>}
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
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                  ...(userTeamId && row.teamId === userTeamId && { 
                    backgroundColor: 'rgba(0, 169, 157, 0.3)',
                    border: '2px solid #00A99D'
                  }),
                }}
              >
                <StyledTableCell component="th" scope="row" sx={{ fontWeight: 'bold', color: theme.palette.grey[100] }}>{row.rank}</StyledTableCell>
                <StyledTableCell>
                  {isMobile ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.3, width: '100%' }}>
                        <Avatar
                          alt={`${row.name} Logo`}
                          src={row.logoUrl ? (row.logoUrl.startsWith('http') ? row.logoUrl : `${API_BASE_URL}${row.logoUrl}`) : null}
                          sx={{
                            width: 20,
                            height: 20,
                            mr: 0.75,
                            fontSize: '0.55rem', 
                            color: theme.palette.getContrastText(row.logoColor || theme.palette.grey[700]),
                            backgroundColor: row.logoColor || theme.palette.grey[700],
                            border: row.logoUrl ? `1px solid ${row.logoColor || theme.palette.grey[700]}` : 'none'
                          }}
                        >
                          {!row.logoUrl && row.name.substring(0, 1).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[100], fontSize: '0.65rem', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', flexGrow: 1 }}>
                          {row.name}
                        </Typography>
                      </Box>
                      {form && <FormDisplay formArray={row.form} />}
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar
                        alt={`${row.name} Logo`}
                        src={row.logoUrl ? (row.logoUrl.startsWith('http') ? row.logoUrl : `${API_BASE_URL}${row.logoUrl}`) : null}
                        sx={{
                          width: 20,
                          height: 20,
                          mr: 1,
                          fontSize: '0.7rem',
                          color: theme.palette.getContrastText(row.logoColor || theme.palette.grey[700]),
                          backgroundColor: row.logoColor || theme.palette.grey[700],
                          border: row.logoUrl ? `1px solid ${row.logoColor || theme.palette.grey[700]}` : 'none'
                        }}
                      >
                        {!row.logoUrl && row.name.substring(0, 1).toUpperCase()}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[100], fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: row.goalDifference > 0 ? theme.palette.success.light : (row.goalDifference < 0 ? theme.palette.error.light : theme.palette.grey[300]) }}>
                  {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                </StyledTableCell>
                <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.grey[100] }}>{row.points}</StyledTableCell>
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
    </Container>
  );
};

export default DynamicLeagueTable;
