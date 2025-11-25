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
  CircularProgress,
  Alert,
} from '@mui/material';
import GavelIcon from '@mui/icons-material/Gavel';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { getActiveSeasonPublic } from '../services/seasonApiService';

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

// Sub-Komponente für eine einzelne Regel-Tabelle
const RulesTable = ({ title, icon, data }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ mb: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {icon && React.cloneElement(icon, { sx: { color: theme.palette.primary.main, mr: 1.5, fontSize: isMobile ? '1.8rem' : '2.2rem' } })}
        <Typography variant={isMobile ? 'h5' : 'h4'} component="h2" sx={{ fontFamily: 'Comfortaa', fontWeight: 'bold', color: theme.palette.text.primary }}>
          {title}
        </Typography>
      </Box>
      <TableContainer component={Paper} sx={{ backgroundColor: theme.palette.background.paper, borderRadius: theme.shape.borderRadius, border: `1px solid ${theme.palette.divider}` }}>
        <Table aria-label={`${title} Tabelle`}>
          <TableHead>
            <TableRow sx={{ backgroundColor: theme.palette.action.hover }}>
              {isMobile ? (
                <TableCell sx={{ fontFamily: 'Comfortaa', fontWeight: 'bold', color: theme.palette.text.primary, borderBottomColor: theme.palette.divider }}>Regel</TableCell>
              ) : (
                <>
                  <TableCell sx={{ width: '30%', fontFamily: 'Comfortaa', fontWeight: 'bold', color: theme.palette.text.primary, borderBottomColor: theme.palette.divider }}>Regel</TableCell>
                  <TableCell sx={{ fontFamily: 'Comfortaa', fontWeight: 'bold', color: theme.palette.text.primary, borderBottomColor: theme.palette.divider }}>Beschreibung</TableCell>
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                {isMobile ? (
                  <TableCell sx={{ borderBottomColor: theme.palette.divider, p: 2 }}>
                    <Typography component="div" sx={{ fontFamily: 'Comfortaa', fontWeight: 600, color: theme.palette.text.primary, fontSize: '0.9rem', mb: 0.5 }}>
                      {item.rule}
                    </Typography>
                    <Typography component="div" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.secondary, fontSize: '0.8rem' }}>
                      {item.description}
                    </Typography>
                  </TableCell>
                ) : (
                  <>
                    <TableCell component="th" scope="row" sx={{ fontFamily: 'Comfortaa', fontWeight: 600, color: theme.palette.text.primary, borderBottomColor: theme.palette.divider, verticalAlign: 'top', fontSize: '0.9rem' }}>
                      {item.rule}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.secondary, borderBottomColor: theme.palette.divider, fontSize: '0.9rem' }}>
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
  const [activeSeason, setActiveSeason] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const fetchSeason = async () => {
      try {
        const season = await getActiveSeasonPublic();
        setActiveSeason(season);
      } catch (err) {
        console.error("Fehler beim Laden der Saisonregeln:", err);
        setError("Regeln konnten nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    };
    fetchSeason();
  }, []);

  // Dynamische Generierung der Ligaregeln basierend auf der aktiven Saison
  const leagueRulesData = React.useMemo(() => {
    if (!activeSeason) return [];

    const rules = [
      {
        id: 1,
        rule: 'Spielmodus',
        description: activeSeason.playMode === 'double_round_robin'
          ? 'Jedes Team spielt im Laufe einer Saison zweimal gegen jedes andere Team (Hin- und Rückrunde).'
          : 'Jedes Team spielt im Laufe einer Saison einmal gegen jedes andere Team der Liga.',
      },
      {
        id: 2,
        rule: 'Punktesystem',
        description: `Für einen Sieg gibt es ${activeSeason.pointsForWin} Punkte, für ein Unentschieden ${activeSeason.pointsForDraw} Punkt(e).`,
      },
      {
        id: 3,
        rule: 'Tabellenplatzierung',
        description: `Bei Punktgleichheit entscheiden folgende Kriterien in dieser Reihenfolge: ${activeSeason.rankingCriteria
            ? activeSeason.rankingCriteria.map(c => {
              switch (c) {
                case 'points': return 'Punkte';
                case 'goalDifference': return 'Tordifferenz';
                case 'goalsScored': return 'erzielte Tore';
                case 'headToHead': return 'Direkter Vergleich';
                default: return c;
              }
            }).join(', ')
            : 'Punkte, Tordifferenz, erzielte Tore'
          }.`,
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
    return rules;
  }, [activeSeason]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ my: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress color="secondary" />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ my: 4, px: isMobile ? 2 : 3 }}>
      <Typography
        variant={isMobile ? 'h4' : 'h3'}
        component="h1"
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
        Regelwerk
      </Typography>

      <Typography
        variant="body1"
        sx={{
          fontFamily: 'Comfortaa',
          textAlign: 'center',
          color: theme.palette.text.secondary,
          fontSize: isMobile ? '0.85rem' : '1rem',
          mb: 5,
          px: 2,
        }}
      >
        {activeSeason
          ? `Hier findest du die Regeln für die aktuelle Saison "${activeSeason.name}".`
          : 'Momentan ist keine Saison aktiv. Es gelten die allgemeinen Regeln.'}
      </Typography>

      {activeSeason && (
        <RulesTable title="Ligaregeln" icon={<EmojiEventsIcon />} data={leagueRulesData} />
      )}

      <RulesTable title="Spielregeln" icon={<GavelIcon />} data={gameRulesData} />

    </Container>
  );
};

export default RulesPage;
