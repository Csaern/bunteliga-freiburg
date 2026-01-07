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
import * as websiteApi from '../services/websiteApiService';

// Placeholder Replacer Function
const replacePlaceholders = (text, season) => {
  if (!text || !season) return text;

  let result = text;
  const placeholders = {
    '{{name}}': season.name || '',
    '{{startDate}}': season.startDate ? new Date(season.startDate).toLocaleDateString('de-DE') : '',
    '{{endDate}}': season.endDate ? new Date(season.endDate).toLocaleDateString('de-DE') : '',
    '{{playModeDescription}}': season.playMode === 'double_round_robin'
      ? 'Jedes Team spielt im Laufe einer Saison zweimal gegen jedes andere Team (Hin- und Rückrunde).'
      : 'Jedes Team spielt im Laufe einer Saison einmal gegen jedes andere Team der Liga.',
    '{{pointsForWin}}': season.pointsForWin || '0',
    '{{pointsForDraw}}': season.pointsForDraw || '0',
    '{{pointsForLoss}}': season.pointsForLoss || '0',
    '{{rankingCriteria}}': season.rankingCriteria
      ? season.rankingCriteria.map(c => {
        switch (c) {
          case 'points': return 'Punkte';
          case 'goalDifference': return 'Tordifferenz';
          case 'goalsScored': return 'erzielte Tore';
          case 'headToHead': return 'Direkter Vergleich';
          default: return c;
        }
      }).join(', ')
      : 'Punkte, Tordifferenz, erzielte Tore',
    '{{requestExpiryDays}}': season.requestExpiryDays || '3',
    '{{friendlyGamesReleaseHours}}': season.friendlyGamesReleaseHours || '48'
  };

  Object.keys(placeholders).forEach(key => {
    // Escape special characters in placeholder key for Regex
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escapedKey, 'g'), placeholders[key]);
  });

  return result;
};

// Sub-Komponente für eine einzelne Regel-Tabelle
const RulesTable = ({ title, icon, data, activeSeason }) => {
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
            {data.map((item, index) => (
              <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                {isMobile ? (
                  <TableCell sx={{ borderBottomColor: theme.palette.divider, p: 2 }}>
                    <Typography component="div" sx={{ fontFamily: 'Comfortaa', fontWeight: 600, color: theme.palette.text.primary, fontSize: '0.9rem', mb: 0.5 }}>
                      {item.rule}
                    </Typography>
                    <Typography component="div" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.secondary, fontSize: '0.8rem' }}>
                      {replacePlaceholders(item.description, activeSeason)}
                    </Typography>
                  </TableCell>
                ) : (
                  <>
                    <TableCell component="th" scope="row" sx={{ fontFamily: 'Comfortaa', fontWeight: 600, color: theme.palette.text.primary, borderBottomColor: theme.palette.divider, verticalAlign: 'top', fontSize: '0.9rem' }}>
                      {item.rule}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.secondary, borderBottomColor: theme.palette.divider, fontSize: '0.9rem' }}>
                      {replacePlaceholders(item.description, activeSeason)}
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
  const [rules, setRules] = React.useState({ leagueRules: [], gameRules: [] });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [season, rulesData] = await Promise.all([
          getActiveSeasonPublic(),
          websiteApi.getSettings('rules').catch(() => null)
        ]);

        setActiveSeason(season);

        if (rulesData && (rulesData.leagueRules || rulesData.gameRules)) {
          setRules({
            leagueRules: rulesData.leagueRules || [],
            gameRules: rulesData.gameRules || []
          });
        } else {
          // Fallback to defaults if no DB entry exists
          setRules({
            leagueRules: [
              { rule: 'Spielmodus', description: 'Jedes Team spielt im Laufe einer Saison einmal gegen jedes andere Team der Liga.' },
              { rule: 'Punktesystem', description: 'Für einen Sieg gibt es {{pointsForWin}} Punkte, für ein Unentschieden {{pointsForDraw}} Punkt(e).' },
              { rule: 'Tabellenplatzierung', description: 'Bei Punktgleichheit entscheiden folgende Kriterien in dieser Reihenfolge: {{rankingCriteria}}.' },
              { rule: 'Meisterschaftsentscheid', description: 'Bei Punktgleichheit auf dem ersten Platz am Saisonende ist ein Entscheidungsspiel oder -turnier zwischen den betroffenen Teams vorgesehen.' },
              { rule: 'Spielwertung', description: 'Teams, die nicht mindestens 50% ihrer Spiele absolviert haben, werden aus der Wertung genommen. Ihre bisherigen Ergebnisse werden annulliert.' },
              { rule: 'Spielabsagen', description: 'Spielabsagen müssen möglichst 48 Stunden vor dem geplanten Anpfiff erfolgen. Sagt ein Team zum dritten Mal ein Spiel ab, wird dieses mit 0:2 gegen das absagende Team gewertet.' }
            ],
            gameRules: [
              { rule: 'Schiedsrichter', description: 'Es wird grundsätzlich ohne Schiedsrichter gespielt. Fair Play ist das oberste Gebot.' },
              { rule: 'Foulspiel', description: 'Der gefoulte Spieler entscheidet selbst, ob ein Foul vorlag und ruft dieses aus.' },
              { rule: 'Abseits', description: 'Die Abseitsregel wird durch den jeweils letzten Abwehrspieler ("letzter Mann") angezeigt und entschieden.' },
              { rule: 'Wechsel', description: 'Es darf unbegrenzt und fliegend gewechselt werden. Bereits ausgewechselte Spieler dürfen wieder eingewechselt werden.' },
              { rule: 'Rückpass', description: 'Es gibt keine Rückpassregel. Ein Rückpass darf vom Torhüter aufgenommen werden.' }
            ]
          });
        }
      } catch (err) {
        console.error("Fehler beim Laden der Regeln:", err);
        setError("Regeln konnten nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

      {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

      {rules.leagueRules.length > 0 && (
        <RulesTable title="Ligaregeln" icon={<EmojiEventsIcon />} data={rules.leagueRules} activeSeason={activeSeason} />
      )}

      {rules.gameRules.length > 0 && (
        <RulesTable title="Spielregeln" icon={<GavelIcon />} data={rules.gameRules} activeSeason={activeSeason} />
      )}

    </Container>
  );
};

export default RulesPage;
