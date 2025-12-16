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
import DynamicLeagueTable from '../components/DynamicLeagueTable';
import FixtureList from '../components/FixtureList';

const teamData = {
  id: 1,
  name: 'Rakete Freiburg',
  logoColor: '#D32F2F',
  contact: 'kontakt@rakete-freiburg.de',
  memberSince: '2010',
};

const TeamCard = ({ team }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const details = [
    { label: 'Teamname', value: team.name },
    { label: 'Kontakt', value: team.contact },
    { label: 'Mitglied seit', value: team.memberSince },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <Avatar
          sx={{
            width: { xs: 120, sm: 160 },
            height: { xs: 120, sm: 160 },
            backgroundColor: team.logoColor,
            color: theme.palette.getContrastText(team.logoColor),
            fontSize: { xs: '3.5rem', sm: '5rem' },
            fontFamily: 'Comfortaa',
            fontWeight: 'bold',
            border: `4px solid ${theme.palette.divider}`,
          }}
        >
          {team.name.substring(0, 1).toUpperCase()}
        </Avatar>
      </Box>

      <Paper
        sx={{
          p: { xs: 2.5, sm: 4 },
          backgroundColor: theme.palette.background.paper,
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        {isMobile ? (
          <Box>
            {details.map((detail) => (
              <Box key={detail.label} sx={{ mb: 2 }}>
                <Typography
                  component="div"
                  sx={{
                    fontFamily: 'Comfortaa',
                    fontWeight: 600,
                    color: theme.palette.text.secondary,
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
                    fontFamily: 'Comfortaa',
                    color: theme.palette.text.primary,
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
          <TableContainer>
            <Table aria-label={`Daten für ${team.name}`}>
              <TableBody>
                {details.map((detail) => (
                  <TableRow key={detail.label}>
                    <TableCell sx={{ fontFamily: 'Comfortaa', fontWeight: 600, color: theme.palette.text.secondary, border: 'none', p: 1.5, width: 150 }}>
                      {detail.label}:
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.primary, border: 'none', p: 1.5, wordBreak: 'break-all' }}>
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
          variant={isMobile ? 'h4' : 'h3'}
          component="h1"
          sx={{
            mb: 4,
            mt: 2,
            color: theme.palette.primary.main,
            fontWeight: 700,
            fontFamily: 'Comfortaa',
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
        <DynamicLeagueTable title={'Tabelle'} userTeamId={teamData.id} />
        <RecordsList />
      </Container>
    </div>
  );
};

export default TeamPage;
