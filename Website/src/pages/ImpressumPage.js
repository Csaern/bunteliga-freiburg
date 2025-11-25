import * as React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';

// Wiederverwendbare Sektion für das Impressum
const LegalSection = ({ title, children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant={isMobile ? 'h6' : 'h5'}
        component="h2"
        sx={{
          fontFamily: 'Comfortaa',
          fontWeight: 600,
          color: theme.palette.primary.main,
          mb: 1.5,
          borderBottom: `2px solid ${theme.palette.divider}`,
          pb: 0.5,
          fontSize: isMobile ? '1.1rem' : '1.5rem',
        }}
      >
        {title}
      </Typography>
      <Typography
        variant="body1"
        component="div"
        sx={{
          fontFamily: 'Comfortaa',
          lineHeight: 1.7,
          color: theme.palette.text.secondary,
          fontSize: { xs: '0.85rem', sm: '1rem' }, // Kleinere Schriftgröße für Mobile
          '& a': { // Link-Styling
            color: theme.palette.secondary.main,
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline',
            }
          },
          // Stellt sicher, dass <p> Tags den richtigen Abstand haben
          '& p': {
            mt: 0,
            mb: 1,
          }
        }}
      >
        {children}
      </Typography>
    </Box>
  );
};

const LegalNoticePage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Container maxWidth="md" sx={{ my: 4, px: isMobile ? 2 : 3 }}>
      <Typography
        variant={isMobile ? 'h5' : 'h3'} // Kleinere Hauptüberschrift für Mobile
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
        Impressum
      </Typography>

      <Paper
        sx={{
          backgroundColor: theme.palette.background.paper,
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.divider}`,
          p: { xs: 2.5, sm: 4 },
        }}
      >
        <LegalSection title="Herausgeber">
          <p>
            Bunte-Liga-Freiburg e.V.<br />
            c/o Jonas Krause<br />
            Ferdinand-Weiß-Str. 92<br />
            79106 Freiburg
          </p>
        </LegalSection>

        <LegalSection title="Vertretungsberechtigte">
          <p>
            Uwe Schmitt, Jens Karsten, Peter Deutschmann
          </p>
        </LegalSection>

        <LegalSection title="Kontakt">
          <p>
            Tel.: 0761-809312<br />
            Fax: 0761-1377804<br />
            E-Mail: <a href="mailto:vorstand@bunteligafreiburg.de">vorstand@bunteligafreiburg.de</a><br />
            Internet: <a href="https://www.bunteligafreiburg.de" target="_blank" rel="noopener noreferrer">www.bunteligafreiburg.de</a>
          </p>
          <p>
            Bei Fragen zur Webseite:<br />
            <a href="mailto:webmaster@bunteligafreiburg.de">webmaster@bunteligafreiburg.de</a>
          </p>
        </LegalSection>

        <LegalSection title="Registereintrag & Steuer">
          <p>
            Eintragung im Vereinsregister.<br />
            Registergericht: Amtsgericht Freiburg im Breisgau<br />
            Vereinsregister-Nr.: 3364
          </p>
          <p>
            Steuer-Nr.: 06469/42621 beim Finanzamt Freiburg-Stadt
          </p>
        </LegalSection>

        <LegalSection title="Verantwortlich für den Inhalt">
          <p>
            Stefan Schultheis, Jens Karsten, Thorsten Wrobel
          </p>
        </LegalSection>

        <LegalSection title="Haftungshinweis">
          <p>
            Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
          </p>
        </LegalSection>

        <LegalSection title="Copyright">
          <p>
            Das Copyright für Inhalt und Gestaltung liegt bei der Bunte-Liga-Freiburg e.V.
          </p>
        </LegalSection>

        <LegalSection title="EU-Streitschlichtung">
          <p>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr</a>.<br />
            Unsere E-Mail-Adresse finden Sie oben im Impressum.
          </p>
        </LegalSection>

        <LegalSection title="Verbraucher­streit­beilegung">
          <p>
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </LegalSection>
      </Paper>
    </Container>
  );
};

export default LegalNoticePage;
