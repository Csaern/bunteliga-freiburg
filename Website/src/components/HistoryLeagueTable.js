import React, { useEffect, useState } from 'react';
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
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import * as seasonApi from '../services/seasonApiService';

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
        color: theme.palette.text.secondary, // Was grey[300]
        fontFamily: 'comfortaa',
        borderBottom: `1px solid ${theme.palette.divider}`, // Was grey[800]
        py: isMobile ? 0.6 : 1,
        px: isMobile ? 0.5 : 1,
        fontSize: isMobile ? '0.7rem' : '0.8rem',
        ...sx,
      }}
      {...props}
    >{children}</TableCell>
  );
};


const LeagueTable = ({ title }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  useEffect(() => {
    const loadAllTimeTable = async () => {
      try {
        setError('');
        setLoading(true);

        // Lade aktive Saison parallel
        let activeTeamIdsSet = new Set();
        try {
          const activeSeason = await seasonApi.getActiveSeasonPublic();
          if (activeSeason && activeSeason.teams && Array.isArray(activeSeason.teams)) {
            // activeTeamIdsSet = new Set(activeSeason.teams.map(team => team.id).filter(id => id));
            // setActiveTeamIds(activeTeamIdsSet);
          }
        } catch (seasonErr) {
          console.warn('Aktive Saison konnte nicht geladen werden:', seasonErr);
          // Fehler ignorieren, da es keine aktive Saison geben muss
        }

        const snap = await getDocs(collection(db, 'teams'));
        const teams = snap.docs.map(doc => {
          const data = doc.data() || {};
          const goals = Number(data.allTimeGoals) || 0;
          const conceded = Number(data.allTimeConceded) || 0;
          const diff = typeof data.allTimeDiff === 'number' ? data.allTimeDiff : goals - conceded;

          return {
            id: doc.id,
            name: data.name || 'Unbekanntes Team',
            logoColor: data.logoColor || '#666666',
            logoUrl: data.logoUrl || null,
            logoUrlLight: data.logoUrlLight || null,
            years: Number(data.allTimeYears) || 0,
            games: Number(data.allTimeGames) || 0,
            goals,
            conceded,
            diff,
            points: Number(data.allTimePoints) || 0,
            isActive: activeTeamIdsSet.has(doc.id),
          };
        });

        teams.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.diff !== a.diff) return b.diff - a.diff;
          if (b.goals !== a.goals) return b.goals - a.goals;
          if (b.games !== a.games) return b.games - a.games;
          return a.name.localeCompare(b.name);
        });

        const ranked = teams.map((team, index) => ({ ...team, rank: index + 1 }));
        setTableData(ranked);
      } catch (err) {
        console.error('Fehler beim Laden der Ewigen Tabelle:', err);
        setError('Ewige Tabelle konnte nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };

    loadAllTimeTable();
  }, []);

  return (
    <Container maxWidth="xl" sx={{ my: 4, px: isMobile ? 1 : 2 }}>
      <Typography
        variant={isMobile ? 'h4' : 'h3'}
        sx={{
          mb: 2,
          mt: 2,
          color: theme.palette.primary.main, // Changed to primary
          fontWeight: 700,
          fontFamily: 'Comfortaa',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {title}
      </Typography>
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="grey.400">Lade Ewige Tabelle...</Typography>
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="error.main">{error}</Typography>
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            backgroundColor: theme.palette.background.paper, // Was #111
            borderRadius: theme.shape.borderRadius,
            border: `1px solid ${theme.palette.divider}`, // Was grey[800]
          }}
        >
          <Table aria-label="Fußballtabelle" size="small">
            <TableHead><TableRow sx={{ backgroundColor: theme.palette.action.hover }}> {/* Was rgba(255,255,255,0.05) */}
              <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.text.primary, width: isMobile ? '7%' : '3%' }}>#</StyledTableCell>
              <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.text.primary, width: isMobile ? '60%' : '25%' }}>Team</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.primary, width: '8%' }}>Jahre</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.primary, width: '8%' }}>Sp.</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }} hideOnMobile>Tore</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }} hideOnMobile>Gegentore</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.primary, width: '11%' }}>Diff.</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.primary, width: '11%' }}>Pkt.</StyledTableCell>
            </TableRow>
            </TableHead>
            <TableBody>
              {tableData.map((row) => (
                <TableRow
                  key={row.name}
                  sx={{
                    '&:hover': { backgroundColor: theme.palette.action.hover }, // Was rgba(255,255,255,0.08)
                    ...(row.rank === 1 && { backgroundColor: theme.palette.mode === 'dark' ? 'rgba(71, 163, 163, 0.27)' : 'rgba(71, 163, 163, 0.15)' }),
                  }}
                >
                  <StyledTableCell component="th" scope="row" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>{row.rank}</StyledTableCell>
                  <StyledTableCell>
                    {isMobile ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.3, width: '100%' }}>
                          <Avatar
                            alt={`${row.name} Logo`}
                            sx={{
                              width: 20,
                              height: 20,
                              mr: 0.75,
                              fontSize: '0.55rem',
                              color: theme.palette.getContrastText(row.logoColor || theme.palette.grey[700]),
                              backgroundColor: row.logoColor || theme.palette.grey[700]
                            }}
                          >{row.name.substring(0, 1).toUpperCase()}</Avatar>
                          <Typography variant="body2" sx={{ fontFamily: 'comfortaa', color: theme.palette.text.primary, fontSize: '0.65rem', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', flexGrow: 1 /* Erlaubt dem Namen, den verfügbaren Platz zu nehmen */ }}>
                            {row.name}
                          </Typography>
                          {row.isActive && (
                            <Chip
                              label="A"
                              size="small"
                              sx={{
                                ml: 0.5,
                                height: 16,
                                minWidth: 16,
                                fontSize: '0.6rem',
                                fontWeight: 'bold',
                                backgroundColor: theme.palette.success.main,
                                color: theme.palette.success.contrastText,
                                '& .MuiChip-label': {
                                  px: 0.5,
                                },
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          alt={`${row.name} Logo`}
                          src={(theme.palette.mode === 'light' && row.logoUrlLight) ? row.logoUrlLight : (row.logoUrl || undefined)}
                          sx={{
                            width: 20,
                            height: 20,
                            mr: 1,
                            fontSize: '0.7rem',
                            color: theme.palette.getContrastText(row.logoColor || theme.palette.grey[700]),
                            backgroundColor: row.logoColor || theme.palette.grey[700]
                          }}
                        >{row.name.substring(0, 1).toUpperCase()}</Avatar>
                        <Typography variant="body2" sx={{ fontFamily: 'comfortaa', color: theme.palette.text.primary, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {row.name}
                        </Typography>
                        {row.isActive && (
                          <Chip
                            label="A"
                            size="small"
                            sx={{
                              ml: 1,
                              height: 20,
                              minWidth: 20,
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              backgroundColor: theme.palette.success.main,
                              color: theme.palette.success.contrastText,
                              '& .MuiChip-label': {
                                px: 0.5,
                              },
                            }}
                          />
                        )}
                      </Box>
                    )}
                  </StyledTableCell>
                  <StyledTableCell align="center">{row.years}</StyledTableCell>
                  <StyledTableCell align="center">{row.games}</StyledTableCell>
                  <StyledTableCell align="center" hideOnMobile>{row.goals}</StyledTableCell>
                  <StyledTableCell align="center" hideOnMobile>{row.conceded}</StyledTableCell>
                  <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: row.diff > 0 ? theme.palette.success.main : (row.diff < 0 ? theme.palette.error.main : theme.palette.text.secondary) }}>
                    {row.diff > 0 ? `+${row.diff}` : row.diff}
                  </StyledTableCell>
                  <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>{row.points}</StyledTableCell>
                </TableRow>
              ))}
              {tableData.length === 0 && (
                <TableRow>
                  <StyledTableCell colSpan={7} align="center" sx={{ color: 'grey.400' }}>
                    Noch keine Daten für die Ewige Tabelle vorhanden.
                  </StyledTableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default LeagueTable;
