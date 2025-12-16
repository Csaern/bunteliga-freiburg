import * as React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material';

// Wiederverwendbare Sektion (bekannt aus Impressum)
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
          fontSize: { xs: '0.85rem', sm: '1rem' },
          '& a': {
            color: theme.palette.secondary.main,
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline',
            }
          },
          '& p, & ul': {
            mt: 0,
            mb: 1.5,
          },
          '& li': {
            mb: 0.5,
          }
        }}
      >
        {children}
      </Typography>
    </Box>
  );
};

const PrivacyPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Container maxWidth="md" sx={{ my: 4, px: isMobile ? 2 : 3 }}>
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
          letterSpacing: '0.1em', // Standardized letter spacing
          wordBreak: 'break-word', // Erzwingt den Umbruch, um Überlaufen zu verhindern
        }}
      >
        Datenschutz-erklärung
      </Typography>

      <Paper
        sx={{
          backgroundColor: theme.palette.background.paper,
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.divider}`,
          p: { xs: 2.5, sm: 4 },
        }}
      >
        <LegalSection title="Verantwortliche Stelle">
          <p>
            Verantwortliche Stelle im Sinne der Datenschutzgesetze, insbesondere der EU-Datenschutzgrundverordnung (DSGVO), ist:
          </p>
          <p>
            Bunte Liga Freiburg e.V.<br />
            c/o Dr. Stefan Schultheis<br />
            Annaplatz 14<br />
            79100 Freiburg
          </p>
        </LegalSection>

        <LegalSection title="Ihre Betroffenenrechte">
          <p>
            Unter den angegebenen Kontaktdaten unseres Datenschutzbeauftragten können Sie jederzeit folgende Rechte ausüben:
          </p>
          <ul>
            <li>Auskunft über Ihre bei uns gespeicherten Daten und deren Verarbeitung,</li>
            <li>Berichtigung unrichtiger personenbezogener Daten,</li>
            <li>Löschung Ihrer bei uns gespeicherten Daten,</li>
            <li>Einschränkung der Datenverarbeitung, sofern wir Ihre Daten aufgrund gesetzlicher Pflichten noch nicht löschen dürfen,</li>
            <li>Widerspruch gegen die Verarbeitung Ihrer Daten bei uns und</li>
            <li>Datenübertragbarkeit, sofern Sie in die Datenverarbeitung eingewilligt haben oder einen Vertrag mit uns abgeschlossen haben.</li>
          </ul>
          <p>Sofern Sie uns eine Einwilligung erteilt haben, können Sie diese jederzeit mit Wirkung für die Zukunft widerrufen.</p>
          <p>
            Sie können sich jederzeit mit einer Beschwerde an die für Sie zuständige Aufsichtsbehörde wenden. Eine Liste der Aufsichtsbehörden (für den nichtöffentlichen Bereich) mit Anschrift finden Sie unter: <a href="https://www.bfdi.bund.de/DE/Infothek/Anschriften_Links/anschriften_links-node.html" target="_blank" rel="noopener noreferrer">https://www.bfdi.bund.de</a>.
          </p>
        </LegalSection>

        <LegalSection title="Zwecke der Datenverarbeitung">
          <p>
            Wir verarbeiten Ihre personenbezogenen Daten nur zu den in dieser Datenschutzerklärung genannten Zwecken. Eine Übermittlung Ihrer persönlichen Daten an Dritte zu anderen als den genannten Zwecken findet nicht statt. Wir geben Ihre persönlichen Daten nur an Dritte weiter, wenn:
          </p>
          <ul>
            <li>Sie Ihre ausdrückliche Einwilligung dazu erteilt haben,</li>
            <li>die Verarbeitung zur Abwicklung eines Vertrags mit Ihnen erforderlich ist,</li>
            <li>die Verarbeitung zur Erfüllung einer rechtlichen Verpflichtung erforderlich ist,</li>
            <li>die Verarbeitung zur Wahrung berechtigter Interessen erforderlich ist und kein Grund zur Annahme besteht, dass Sie ein überwiegendes schutzwürdiges Interesse an der Nichtweitergabe Ihrer Daten haben.</li>
          </ul>
        </LegalSection>

        <LegalSection title="Löschung bzw. Sperrung der Daten">
          <p>
            Wir halten uns an die Grundsätze der Datenvermeidung und Datensparsamkeit. Wir speichern Ihre personenbezogenen Daten daher nur so lange, wie dies zur Erreichung der hier genannten Zwecke erforderlich ist oder wie es die vom Gesetzgeber vorgesehenen vielfältigen Speicherfristen vorsehen. Nach Fortfall des jeweiligen Zweckes bzw. Ablauf dieser Fristen werden die entsprechenden Daten routinemäßig und entsprechend den gesetzlichen Vorschriften gesperrt oder gelöscht.
          </p>
        </LegalSection>

        <LegalSection title="Erfassung allgemeiner Informationen beim Besuch unserer Website">
          <p>
            Wenn Sie auf unsere Website zugreifen, werden automatisch mittels eines Cookies Informationen allgemeiner Natur erfasst. Diese Informationen (Server-Logfiles) beinhalten etwa die Art des Webbrowsers, das verwendete Betriebssystem, den Domainnamen Ihres Internet-Service-Providers und ähnliches. Hierbei handelt es sich ausschließlich um Informationen, welche keine Rückschlüsse auf Ihre Person zulassen.
          </p>
        </LegalSection>

        <LegalSection title="Cookies">
          <p>
            Wie viele andere Webseiten verwenden wir auch so genannte „Cookies“. Cookies sind kleine Textdateien, die von einem Websiteserver auf Ihre Festplatte übertragen werden. Hierdurch erhalten wir automatisch bestimmte Daten wie z. B. IP-Adresse, verwendeter Browser, Betriebssystem und Ihre Verbindung zum Internet. Cookies können nicht verwendet werden, um Programme zu starten oder Viren auf einen Computer zu übertragen.
          </p>
        </LegalSection>

        <LegalSection title="Kontaktformular">
          <p>
            Treten Sie bzgl. Fragen jeglicher Art per E-Mail oder Kontaktformular mit uns in Kontakt, erteilen Sie uns zum Zwecke der Kontaktaufnahme Ihre freiwillige Einwilligung. Die von Ihnen gemachten Angaben werden zum Zwecke der Bearbeitung der Anfrage sowie für mögliche Anschlussfragen gespeichert. Nach Erledigung der von Ihnen gestellten Anfrage werden personenbezogene Daten automatisch gelöscht.
          </p>
        </LegalSection>

        <LegalSection title="Verwendung von Open Street Maps">
          <p>
            Diese Webseite verwendet Open Street Maps API, um geographische Informationen visuell darzustellen. Bei der Nutzung von Open Street Maps werden von Openstreetmap.org auch Daten über die Nutzung der Kartenfunktionen durch Besucher erhoben, verarbeitet und genutzt. Nähere Informationen über die Datenverarbeitung durch Open Street Maps können Sie den Open Street Maps-Datenschutzhinweisen entnehmen.
          </p>
        </LegalSection>

        <LegalSection title="Änderung unserer Datenschutzbestimmungen">
          <p>
            Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen in der Datenschutzerklärung umzusetzen, z.B. bei der Einführung neuer Services. Für Ihren erneuten Besuch gilt dann die neue Datenschutzerklärung.
          </p>
        </LegalSection>

        <LegalSection title="Fragen an den Datenschutzbeauftragten">
          <p>
            Wenn Sie Fragen zum Datenschutz haben, schreiben Sie uns bitte eine E-Mail oder wenden Sie sich direkt an die für den Datenschutz verantwortliche Person in unserer Organisation: <a href="mailto:bunteligafreiburg@freenet.de">bunteligafreiburg@freenet.de</a>
          </p>
        </LegalSection>

        <Typography variant="caption" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.disabled, mt: 4, display: 'block' }}>
          Quelle: Erstellt mit dem Datenschutzerklärungs-Generator der activeMind AG.
        </Typography>

      </Paper>
    </Container>
  );
};

export default PrivacyPage;
