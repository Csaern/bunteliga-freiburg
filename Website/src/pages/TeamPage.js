import * as React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import RecordsList from '../components/RecordsList';
import LeagueTable from '../components/LeagueTable';
import FixtureList from '../components/FixtureList';

const teamData = {
  id: 1,
  name: 'Rakete Freiburg',
  logoColor: '#D32F2F',
  contact: 'kontakt@rakete-freiburg.de',
  memberSince: '2010',
};

// Die Team-Komponente wurde überarbeitet.
const TeamCard = ({ team }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Daten für die Anzeige in einer strukturierten Form
  const details = [
      { label: 'Teamname', value: team.name },
      { label: 'Kontakt', value: team.contact },
      { label: 'Mitglied seit', value: team.memberSince },
  ];

  return (
    <Box>
      {/* Das Logo wird jetzt außerhalb der Paper-Komponente gerendert und ist immer zentriert */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <Avatar
          sx={{
            width: { xs: 120, sm: 160 },
            height: { xs: 120, sm: 160 },
            backgroundColor: team.logoColor,
            color: theme.palette.getContrastText(team.logoColor),
            fontSize: { xs: '3.5rem', sm: '5rem' },
            fontFamily: 'comfortaa',
            fontWeight: 'bold',
            border: `4px solid ${theme.palette.grey[800]}`,
          }}
        >
          {team.name.substring(0, 1).toUpperCase()}
        </Avatar>
      </Box>

      {/* Die Paper-Komponente enthält nur noch die Team-Details */}
      <Paper
        sx={{
          p: { xs: 2.5, sm: 4 },
          backgroundColor: '#1C1C1C',
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.grey[800]}`,
        }}
      >
        {isMobile ? (
          // Mobile Ansicht: Gestapelte Liste
          <Box>
            {details.map((detail) => (
              <Box key={detail.label} sx={{ mb: 2 }}>
                <Typography
                  component="div"
                  sx={{
                    fontFamily: 'comfortaa',
                    fontWeight: 600,
                    color: theme.palette.grey[200],
                    fontSize: '0.6rem',
                    mb: 0.25,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  {detail.label}
                </Typography>
                <Typography
                  component="div"
                  sx={{
                    fontFamily: 'comfortaa',
                    color: theme.palette.grey[300],
                    fontSize: '1rem',
                    wordBreak: 'break-all',
                  }}
                >
                  {detail.value}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : (
          // Desktop Ansicht: Tabelle
          <TableContainer>
            <Table aria-label={`Daten für ${team.name}`}>
              <TableBody>
                {details.map((detail) => (
                  <TableRow key={detail.label}>
                    <TableCell sx={{ fontFamily: 'comfortaa', fontWeight: 600, color: theme.palette.grey[200], border: 'none', p: 1.5, width: 150 }}>
                      {detail.label}:
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[300], border: 'none', p: 1.5, wordBreak: 'break-all' }}>
                      {detail.value}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};


const TeamPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <div>
    <Container maxWidth="sm" sx={{ my: 4, px: isMobile ? 2 : 3 }}>
      <Typography
        variant={isMobile ? 'h5' : 'h4'}
        component="h1"
        sx={{
          mb: 4,
          mt: 2,
          color: '#00A99D',
          fontWeight: 700,
          fontFamily: 'comfortaa',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {teamData.name}
      </Typography>
      
      <TeamCard team={teamData} />
    </Container>
    <Container>
        <FixtureList title={'Spiele'} />
        <LeagueTable title={'Tabelle'}/>
        <RecordsList />
    </Container>
    </div>
  );
};

export default TeamPage;
