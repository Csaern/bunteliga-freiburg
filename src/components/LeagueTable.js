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
  Chip,
  Container,
  useMediaQuery,
} from '@mui/material';

const createTeamData = (
  rank,
  logoColor,
  name,
  formString,
  played,
  won,
  drawn,
  lost,
  goalsFor,
  goalsAgainst,
  points
) => {
  const goalDifference = goalsFor - goalsAgainst;
  return {
    rank,
    logoColor,
    name,
    form: formString.split(''), 
    played,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    goalDifference,
    points,
  };
};

const tableData = [
  createTeamData(1, '#D32F2F', 'Rakete Freiburg', 'SSUSS', 5, 4, 1, 0, 27, 6, 9),
  createTeamData(2, '#757575', 'Die 2. Wahl', 'SSSS', 4, 4, 0, 0, 18, 7, 8),
  createTeamData(3, '#5D4037', 'Lokomotive Littenweiler', 'USNSN', 6, 3, 1, 2, 29, 11, 7),
  createTeamData(4, '#C2185B', 'Red Sea', 'SSS', 3, 3, 0, 0, 15, 8, 6),
  createTeamData(5, '#00796B', 'Wurschtwecklebombers', 'SSS', 3, 3, 0, 0, 14, 7, 6),
  createTeamData(6, '#FBC02D', 'Latinos Freiburg', 'UUSSN', 5, 2, 2, 1, 16, 16, 6),
  createTeamData(7, '#388E3C', 'Soccerfield Rockers', 'USNS', 4, 2, 1, 1, 13, 6, 5),
  createTeamData(8, '#1976D2', 'Dynamo Tresen', 'USNS', 4, 2, 1, 1, 10, 7, 5),
  createTeamData(9, '#E91E63', 'Kante Freiburg', 'SUNSN', 5, 2, 1, 2, 10, 12, 5),
  createTeamData(10, '#00BCD4', 'Union Eisenwaden', 'NSSN', 4, 2, 0, 2, 15, 7, 4),
  createTeamData(11, '#B71C1C', 'Haxe des Bösen', 'UNS', 3, 1, 1, 1, 12, 6, 3),
  createTeamData(12, '#424242', 'SEK', 'NNUS', 4, 1, 1, 2, 8, 10, 3),
  createTeamData(13, '#64B5F6', 'Chimichurri Auriazul', 'NUNNS', 5, 1, 1, 3, 10, 34, 3),
  createTeamData(14, '#F5F5F5', 'Kämpfende Herzen', 'SNNN', 4, 1, 0, 3, 16, 17, 2),
  createTeamData(15, '#81D4FA', '1. FC Ferdi Weiss', 'N', 1, 0, 0, 1, 0, 3, 0),
  createTeamData(16, '#795548', 'Dampflokomotive Littenweiler', 'NNN', 3, 0, 0, 3, 2, 9, 0),
  createTeamData(17, '#FFEB3B', 'Zeugen Yeboahs', 'NN', 2, 0, 0, 2, 6, 17, 0),
  createTeamData(18, '#D7CCC8', 'Dübel-Lattenkreuz', 'NNNN', 4, 0, 0, 4, 2, 18, 0),
  createTeamData(19, '#212121', 'CC Freiburg', 'NNN', 3, 0, 0, 3, 8, 30, 0),
];

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


const LeagueTable = ({ title, form }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
          <TableHead><TableRow sx={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
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
                key={row.name}
                sx={{
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
                  ...(row.rank === 1 && { backgroundColor: 'rgba(71, 163, 163, 0.27)' }),
                }}
              ><StyledTableCell component="th" scope="row" sx={{ fontWeight: 'bold', color: theme.palette.grey[100] }}>{row.rank}</StyledTableCell>
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
                        <Typography variant="body2" sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[100], fontSize: '0.65rem', whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', flexGrow: 1 /* Erlaubt dem Namen, den verfügbaren Platz zu nehmen */ }}>
                          {row.name}
                        </Typography>
                      </Box>
                      {form && <FormDisplay formArray={row.form} />}
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar
                        alt={`${row.name} Logo`}
                        sx={{
                          width: 20,
                          height: 20,
                          mr: 1,
                          fontSize: '0.7rem',
                          color: theme.palette.getContrastText(row.logoColor || theme.palette.grey[700]),
                          backgroundColor: row.logoColor || theme.palette.grey[700]
                        }}
                      >{row.name.substring(0, 1).toUpperCase()}</Avatar>
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

export default LeagueTable;
