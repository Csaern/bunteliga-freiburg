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
import { API_BASE_URL, publicApiClient } from '../services/apiClient';

const TeamLogo = ({ team, isMobile }) => {
  const theme = useTheme();
  const [error, setError] = useState(false);
  const isLightMode = theme.palette.mode === 'light';
  const logoUrlToUse = (isLightMode && team.logoUrlLight) ? team.logoUrlLight : team.logoUrl;
  const logoUrl = logoUrlToUse ? (logoUrlToUse.startsWith('http') ? logoUrlToUse : `${API_BASE_URL}${logoUrlToUse}`) : null;

  const getFallbackColor = (name) => {
    const colors = [
      '#E91E63', '#FFC107', '#9C27B0', '#00BCD4',
    ];
    let hash = 0;
    if (!name) return colors[0];
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (error || !logoUrl) {
    return (
      <Box
        sx={{
          width: isMobile ? 20 : 28,
          height: isMobile ? 24 : 34,
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
            backgroundColor: getFallbackColor(team.name || ''),
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
          {team.name ? team.name.charAt(0).toUpperCase() : '?'}
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


const LeagueTable = ({ title, subTitle }) => {
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

        // Lade aktive Saison und Ewige Tabelle parallel
        const activeSeasonPromise = seasonApi.getActiveSeasonPublic().catch(err => {
          console.warn('Aktive Saison konnte nicht geladen werden:', err);
          return null;
        });
        
        const ewigeTabellePromise = publicApiClient('/api/history/ewige-tabelle');

        const [activeSeason, backendTable] = await Promise.all([activeSeasonPromise, ewigeTabellePromise]);

        let activeTeamIdsSet = new Set();
        if (activeSeason && activeSeason.teams && Array.isArray(activeSeason.teams)) {
            activeTeamIdsSet = new Set(activeSeason.teams.map(team => team.id).filter(id => id));
        }

        if (!Array.isArray(backendTable)) {
          throw new Error('Ewige Tabelle Daten sind ungültig.');
        }

        const enrichedTable = backendTable.map((team, index) => ({
            ...team,
            isActive: activeTeamIdsSet.has(team.teamId)
        }));

        setTableData(enrichedTable);
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
      <Box sx={{ mb: 2, mt: 2, textAlign: 'center' }}>
        <Typography
          variant={isMobile ? 'h4' : 'h3'}
          component="span"
          sx={{
            color: theme.palette.primary.main,
            fontWeight: 700,
            fontFamily: 'Comfortaa',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {title}
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
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }} hideOnMobile>S</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }} hideOnMobile>U</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.text.primary }} hideOnMobile>N</StyledTableCell>
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
                          <TeamLogo team={row} isMobile={true} />
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
                        <TeamLogo team={row} isMobile={false} />
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
                  <StyledTableCell align="center" hideOnMobile>{row.wins}</StyledTableCell>
                  <StyledTableCell align="center" hideOnMobile>{row.draws}</StyledTableCell>
                  <StyledTableCell align="center" hideOnMobile>{row.losses}</StyledTableCell>
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
