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
  Switch,
  FormControlLabel,
} from '@mui/material';
import { db } from '../firebase';
import { API_BASE_URL } from '../services/apiClient';
import * as seasonApiService from '../services/seasonApiService';
import * as bookingApiService from '../services/bookingApiService';
import { useNotifications } from '../context/NotificationContext';

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

const DynamicLeagueTable = ({ title, form, seasonId, userTeamId, maxWidth, disableContainer = false, enableSimulation = false }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:1020px)'); // Switch to mobile layout below 1020px
  const navigate = useNavigate();
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSimulated, setIsSimulated] = useState(false);
  const [rankingCriteria, setRankingCriteria] = useState(['points', 'goalDifference', 'goalsScored']);
  const [seasonMetadata, setSeasonMetadata] = useState(null);
  const { lastGlobalUpdate } = useNotifications();

  const loadTableData = useCallback(async () => {
    if (!seasonId) return;

    try {
      setLoading(true);

      // 0. Saison-Metadaten laden (für What-If Button Sichtbarkeit)
      const seasonMeta = await seasonApiService.getSeasonByIdPublic(seasonId);
      setSeasonMetadata(seasonMeta);

      // 1. Berechnete und sortierte Tabelle vom Backend laden
      const fetchedTable = await seasonApiService.getTablePublic(seasonId, isSimulated);

      // 2. Teams laden, um Logos und Details zu ergänzen
      const teamsSnap = await getDocs(collection(db, 'teams'));
      const teamsMap = {};
      teamsSnap.docs.forEach(doc => {
        teamsMap[doc.id] = doc.data();
      });

      // 3. Daten mergen
      const enrichedTable = fetchedTable.map(row => {
        const teamInfo = teamsMap[row.teamId] || {};
        return {
          ...row,
          logoUrl: teamInfo.logoUrl,
          logoUrlLight: teamInfo.logoUrlLight,
          logoColor: teamInfo.logoColor || '#666666',
        };
      });

      setTableData(enrichedTable);
    } catch (error) {
      console.error('Fehler beim Laden der Tabellendaten:', error);
    } finally {
      setLoading(false);
    }
  }, [seasonId, isSimulated]);

  useEffect(() => {
    loadTableData();
  }, [loadTableData]);

  // Global Update Listener
  useEffect(() => {
    if (lastGlobalUpdate && lastGlobalUpdate.type === 'results_updated') {
      console.log('🔄 [DynamicLeagueTable] Global results update detected. Refreshing...');
      loadTableData();
    }
  }, [lastGlobalUpdate, loadTableData]);

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

  // Check ob Button angezeigt werden soll: Saison muss aktiv sein und noch nicht abgerechnet UND Simulation explizit erlaubt
  const showWhatIf = enableSimulation && seasonMetadata && seasonMetadata.status === 'active' && !seasonMetadata.evaluated;

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

      {showWhatIf && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={isSimulated}
                onChange={(e) => setIsSimulated(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="body2" sx={{ fontFamily: 'Comfortaa', fontWeight: 'bold' }}>
                What if?
              </Typography>
            }
          />
        </Box>
      )}

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
