import * as React from 'react';
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
  Container,
  useMediaQuery,
  Chip,
} from '@mui/material';

const createFixtureData = (
  id,
  date,
  time,
  homeTeam,
  homeLogoColor,
  awayTeam,
  awayLogoColor,
  homeScore,
  awayScore,
  location,
  isPast
) => {
  return {
    id,
    date,
    time,
    homeTeam,
    homeLogoColor,
    awayTeam,
    awayLogoColor,
    homeScore,
    awayScore,
    location,
    isPast,
  };
};

const initialFixtureData = [
  createFixtureData(1, '01.06.2025', '14:00', 'Rakete Freiburg', '#D32F2F', 'Die 2. Wahl', '#757575', 3, 1, 'Sportplatz Mitte', true),
  createFixtureData(2, '01.06.2025', '16:00', 'Lokomotive Littenweiler', '#5D4037', 'Red Sea', '#C2185B', 2, 2, 'Bolzplatz West', true),
  createFixtureData(3, '08.06.2025', '15:00', 'Wurschtwecklebombers', '#00796B', 'Latinos Freiburg', '#FBC02D', null, null, 'Stadion Rote Erde', false),
  createFixtureData(4, '08.06.2025', '17:00', 'Soccerfield Rockers', '#388E3C', 'Dynamo Tresen', '#1976D2', 1, 0, 'Kunstrasen Nord', true),
  createFixtureData(5, '15.06.2025', '14:00', 'Kante Freiburg', '#E91E63', 'Union Eisenwaden', '#00BCD4', null, null, 'Sportplatz Ost', false),
  createFixtureData(6, '15.06.2025', '16:00', 'Haxe des Bösen', '#B71C1C', 'SEK', '#424242', 0, 4, 'Ascheplatz Süd', true),
  createFixtureData(7, '22.06.2025', '13:00', 'Chimichurri Auriazul', '#64B5F6', 'Kämpfende Herzen', '#F5F5F5', null, null, 'Sportplatz Mitte', false),
  createFixtureData(8, '22.06.2025', '15:00', '1. FC Ferdi Weiss', '#81D4FA', 'Dampflokomotive Littenweiler', '#795548', 5, 0, 'Bolzplatz West', true),
  createFixtureData(9, '29.06.2025', '14:00', 'Zeugen Yeboahs', '#FFEB3B', 'Dübel-Lattenkreuz', '#D7CCC8', null, null, 'Stadion Rote Erde', false),
  createFixtureData(10, '29.06.2025', '16:00', 'CC Freiburg', '#212121', 'Rakete Freiburg', '#D32F2F', 1, 1, 'Kunstrasen Nord', true),
];

// Die StyledTableCell-Komponente bleibt unverändert, hideOnMobile wird durch die neue Logik ergänzt
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
        py: isMobile ? 0.5 : 1,
        px: isMobile ? 0.3 : 1,
        fontSize: isMobile ? '0.6rem' : '0.85rem',
        verticalAlign: 'middle',
        ...sx,
      }}
      {...props}
    >
      {children}
    </TableCell>
  );
};

// Die Komponente akzeptiert nun 'details' als Prop mit dem Standardwert 'true'
const FixtureList = ({ title, details = true }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const parseDate = (dateString) => {
    const [day, month, year] = dateString.split('.');
    return new Date(`${year}-${month}-${day}`);
  };

  const sortedFixtureData = React.useMemo(() => {
    return [...initialFixtureData].sort((a, b) => parseDate(b.date) - parseDate(a.date));
  }, []);

  const rowHeight = isMobile ? 55 : 60;

  return (
    <Container maxWidth={details ? "xl" : "md"} sx={{ my: 4, px: isMobile ? 0.25 : 2 }}>
      <Typography
        variant={isMobile ? 'h6' : 'h4'}
        sx={{
          mb: isMobile ? 1.5 : 3,
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
        <Table aria-label="Spielplan Tabelle" size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'rgba(255,255,255,0.05)', height: rowHeight / 1.5 }}>
              {/* Die folgenden Spalten werden nur angezeigt, wenn details=true ist */}
              {details && (
                <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.grey[100], width: isMobile ? '25%' : '15%' }}>
                  {isMobile ? 'Datum/Zeit' : 'Datum'}
                </StyledTableCell>
              )}
              {details && (
                <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.grey[100], width: '10%' }} hideOnMobile={true}>
                  Uhrzeit
                </StyledTableCell>
              )}

              {/* Die Breiten der verbleibenden Spalten passen sich an */}
              <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.grey[100], width: details ? (isMobile ? '30%' : '25%') : '42.5%', textAlign: 'center' }}>Heim</StyledTableCell>
              <StyledTableCell align="center" sx={{ fontWeight: 'bold', color: theme.palette.grey[100], width: '15%' }}>Erg.</StyledTableCell>
              <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.grey[100], width: details ? (isMobile ? '30%' : '25%') : '42.5%', textAlign: 'center' }}>Auswärts</StyledTableCell>

              {details && (
                <StyledTableCell sx={{ fontWeight: 'bold', color: theme.palette.grey[100], width: '15%' }} hideOnMobile={true}>
                  Ort
                </StyledTableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedFixtureData.map((row) => (
              <TableRow
                key={row.id}
                sx={{
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                  opacity: row.isPast ? 0.7 : 1,
                  height: rowHeight,
                }}
              >
                {/* Die folgenden Zellen werden nur angezeigt, wenn details=true ist */}
                {details && (
                  <StyledTableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'flex-start', textAlign: isMobile ? 'center' : 'left' }}>
                      {!isMobile && (
                        <Typography variant="caption" sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[400], fontSize: '0.7rem', lineHeight: 1.2 }}>
                          {new Date(row.date.split('.').reverse().join('-')).toLocaleDateString('de-DE', { weekday: 'short' })}
                        </Typography>
                      )}
                      <Typography variant="body2" sx={{ fontFamily: 'comfortaa', fontSize: isMobile ? '0.6rem' : '0.8rem', lineHeight: 1.2 }}>
                        {row.date}
                      </Typography>
                      {isMobile && (
                        <Typography variant="caption" sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[400], fontSize: '0.55rem', mt: 0.25, lineHeight: 1.2 }}>
                          {row.time} Uhr
                        </Typography>
                      )}
                    </Box>
                  </StyledTableCell>
                )}
                {details && (
                  <StyledTableCell align="center" hideOnMobile={true}>{row.time}</StyledTableCell>
                )}

                {/* Diese Zellen sind immer sichtbar */}
                <StyledTableCell>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '100%' }}>
                    <Avatar alt={`${row.homeTeam} Logo`} sx={{ width: isMobile ? 22 : 20, height: isMobile ? 22 : 20, mb: 0.5, fontSize: isMobile ? '0.7rem' : '0.7rem', color: theme.palette.getContrastText(row.homeLogoColor || theme.palette.grey[700]), backgroundColor: row.homeLogoColor || theme.palette.grey[700] }}>
                      {row.homeTeam.substring(0, 1).toUpperCase()}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[100], fontSize: isMobile ? '0.6rem' : '0.8rem', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.1, width: '100%' }}>
                      {row.homeTeam}
                    </Typography>
                  </Box>
                </StyledTableCell>
                <StyledTableCell align="center" sx={{ fontWeight: 'bold' }}>
                  {row.isPast ? (
                    <Chip label={`${row.homeScore} : ${row.awayScore}`} size="small" sx={{ fontFamily: 'comfortaa', fontWeight: 'bold', backgroundColor: theme.palette.grey[700], color: theme.palette.grey[100], fontSize: isMobile ? '0.6rem' : '0.8rem', height: isMobile ? '16px' : '22px', lineHeight: isMobile ? '16px' : '22px', px: isMobile ? 0.5 : 1 }} />
                  ) : (
                    <Typography variant="caption" sx={{ color: theme.palette.grey[500], fontSize: isMobile ? '0.65rem' : 'inherit' }}>vs.</Typography>
                  )}
                </StyledTableCell>
                <StyledTableCell>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '100%' }}>
                    <Avatar alt={`${row.awayTeam} Logo`} sx={{ width: isMobile ? 22 : 20, height: isMobile ? 22 : 20, mb: 0.5, fontSize: isMobile ? '0.7rem' : '0.7rem', color: theme.palette.getContrastText(row.awayLogoColor || theme.palette.grey[700]), backgroundColor: row.awayLogoColor || theme.palette.grey[700] }}>
                      {row.awayTeam.substring(0, 1).toUpperCase()}
                    </Avatar>
                    <Typography variant="body2" sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[100], fontSize: isMobile ? '0.6rem' : '0.8rem', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.1, width: '100%' }}>
                      {row.awayTeam}
                    </Typography>
                  </Box>
                </StyledTableCell>

                {details && (
                  <StyledTableCell hideOnMobile={true}>{row.location}</StyledTableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default FixtureList;
