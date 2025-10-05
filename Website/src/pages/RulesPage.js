import * as React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

const gameRulesData = [
  {
    id: 1,
    rule: 'Schiedsrichter',
    description: 'Es wird grundsätzlich ohne Schiedsrichter gespielt. Fair Play ist das oberste Gebot.',
  },
  {
    id: 2,
    rule: 'Foulspiel',
    description: 'Der gefoulte Spieler entscheidet selbst, ob ein Foul vorlag und ruft dieses aus.',
  },
  {
    id: 3,
    rule: 'Abseits',
    description: 'Die Abseitsregel wird durch den jeweils letzten Abwehrspieler ("letzter Mann") angezeigt und entschieden.',
  },
  {
    id: 4,
    rule: 'Wechsel',
    description: 'Es darf unbegrenzt und fliegend gewechselt werden. Bereits ausgewechselte Spieler dürfen wieder eingewechselt werden.',
  },
  {
    id: 5,
    rule: 'Rückpass',
    description: 'Es gibt keine Rückpassregel. Ein Rückpass darf vom Torhüter aufgenommen werden.',
  },
];

// Daten für die Ligaregeln
const leagueRulesData = [
    {
        id: 1,
        rule: 'Spielmodus',
        description: 'Jedes Team spielt im Laufe einer Saison einmal gegen jedes andere Team der Liga.',
    },
    {
        id: 2,
        rule: 'Punktesystem',
        description: 'Für einen Sieg gibt es 2 Punkte, für ein Unentschieden 1 Punkt.',
    },
    {
        id: 3,
        rule: 'Tabellenplatzierung',
        description: 'Bei Punktgleichheit entscheiden folgende Kriterien in dieser Reihenfolge: 1. Anzahl der ausgetragenen Spiele, 2. Tordifferenz, 3. Anzahl der erzielten Tore.',
    },
    {
        id: 4,
        rule: 'Meisterschaftsentscheid',
        description: 'Bei Punktgleichheit auf dem ersten Platz am Saisonende ist ein Entscheidungsspiel oder -turnier zwischen den betroffenen Teams vorgesehen.',
    },
    {
        id: 5,
        rule: 'Spielwertung',
        description: 'Teams, die nicht mindestens 50% ihrer Spiele absolviert haben, werden aus der Wertung genommen. Ihre bisherigen Ergebnisse werden annulliert.',
    },
    {
        id: 6,
        rule: 'Spielabsagen',
        description: 'Spielabsagen müssen möglichst 48 Stunden vor dem geplanten Anpfiff erfolgen. Sagt ein Team zum dritten Mal ein Spiel ab, wird dieses mit 0:2 gegen das absagende Team gewertet.',
    },
];

// Sub-Komponente für eine einzelne Regel-Tabelle
const RulesTable = ({ title, icon, data }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
    return (
      <Box sx={{ mb: 5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {icon && React.cloneElement(icon, { sx: { color: '#00A99D', mr: 1.5, fontSize: isMobile ? '1.8rem' : '2.2rem' } })}
            <Typography variant={isMobile ? 'h5' : 'h4'} component="h2" sx={{ fontFamily: 'comfortaa', fontWeight: 'bold', color: theme.palette.common.white }}>
                {title}
            </Typography>
        </Box>
        <TableContainer component={Paper} sx={{ backgroundColor: '#1C1C1C', borderRadius: theme.shape.borderRadius, border: `1px solid ${theme.palette.grey[800]}` }}>
          <Table aria-label={`${title} Tabelle`}>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                {isMobile ? (
                  <TableCell sx={{ fontFamily: 'comfortaa', fontWeight: 'bold', color: theme.palette.grey[100], borderBottomColor: 'grey.700' }}>Regel</TableCell>
                ) : (
                  <>
                    <TableCell sx={{ width: '30%', fontFamily: 'comfortaa', fontWeight: 'bold', color: theme.palette.grey[100], borderBottomColor: 'grey.700' }}>Regel</TableCell>
                    <TableCell sx={{ fontFamily: 'comfortaa', fontWeight: 'bold', color: theme.palette.grey[100], borderBottomColor: 'grey.700' }}>Beschreibung</TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  {isMobile ? (
                    <TableCell sx={{ borderBottomColor: 'grey.800', p: 2 }}>
                      <Typography component="div" sx={{ fontFamily: 'comfortaa', fontWeight: 600, color: theme.palette.grey[200], fontSize: '0.9rem', mb: 0.5 }}>
                        {item.rule}
                      </Typography>
                      <Typography component="div" sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[300], fontSize: '0.8rem' }}>
                        {item.description}
                      </Typography>
                    </TableCell>
                  ) : (
                    <>
                      <TableCell component="th" scope="row" sx={{ fontFamily: 'comfortaa', fontWeight: 600, color: theme.palette.grey[200], borderBottomColor: 'grey.800', verticalAlign: 'top', fontSize: '0.9rem' }}>
                        {item.rule}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[300], borderBottomColor: 'grey.800', fontSize: '0.9rem' }}>
                        {item.description}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
};


const RulesPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Container maxWidth="lg" sx={{ my: 4, px: isMobile ? 2 : 3 }}>
      <Typography
        variant={isMobile ? 'h4' : 'h3'}
        component="h1"
        sx={{
          mb: 2, // Abstand nach unten reduziert
          mt: 2,
          color: '#00A99D',
          fontWeight: 700,
          fontFamily: 'comfortaa',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        Regelwerk
      </Typography>
      
      <Typography
        variant="body1"
        sx={{
          fontFamily: 'comfortaa',
          textAlign: 'center',
          color: theme.palette.grey[400],
          fontSize: isMobile ? '0.85rem' : '1rem',
          mb: 5, // Abstand nach unten hinzugefügt
          px: 2,
        }}
      >
        Prinzipiell gelten die Regeln des SBFV, ausgenommen der folgenden Besonderheiten.
      </Typography>
      
      <RulesTable title="Ligaregeln" icon={<EmojiEventsIcon />} data={leagueRulesData} />
      <RulesTable title="Spielregeln" icon={<GavelIcon />} data={gameRulesData} />
      
    </Container>
  );
};

export default RulesPage;
