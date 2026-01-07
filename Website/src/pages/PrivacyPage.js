import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  useTheme,
  useMediaQuery,
  CircularProgress
} from '@mui/material';
import * as websiteApi from '../services/websiteApiService';

const Section = ({ title, children }) => {
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
  const [clubInfo, setClubInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await websiteApi.getSettings('club-info');
        if (data) {
          setClubInfo(data);
        } else {
          // Fallback to prevent crash
          setClubInfo({ dataProtection: {} });
        }
      } catch (error) {
        console.error('Failed to load privacy info', error);
        setClubInfo({ dataProtection: {} });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  // Fallback for responsible body if not set
  const responsibleBodyContent = clubInfo?.dataProtection?.name ? (
    <>
      {clubInfo.dataProtection.name}<br />
      {clubInfo.dataProtection.street}<br />
      {clubInfo.dataProtection.city}<br />
      {clubInfo.dataProtection.email && <>E-Mail: <a href={`mailto:${clubInfo.dataProtection.email}`}>{clubInfo.dataProtection.email}</a><br /></>}
      {clubInfo.dataProtection.phone && <>Telefon: {clubInfo.dataProtection.phone}</>}
    </>
  ) : (
    <>
      Bitte kontaktieren Sie den Vorstand (siehe Impressum).
    </>
  );

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
          letterSpacing: '0.1em',
          wordBreak: 'break-word',
        }}
      >
        Datenschutzerklärung
      </Typography>

      <Paper
        sx={{
          backgroundColor: theme.palette.background.paper,
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.divider}`,
          p: { xs: 2.5, sm: 4 },
        }}
      >



        <Section title="Verantwortliche Stelle">
          <Typography variant="body1" paragraph>
            Verantwortliche Stelle im Sinne der Datenschutzgesetze, insbesondere der EU-Datenschutzgrundverordnung (DSGVO), ist:
          </Typography>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
            {responsibleBodyContent}
          </Box>
        </Section>

        <Section title="Ihre Betroffenenrechte">
          <Typography variant="body1" paragraph>
            Unter den angegebenen Kontaktdaten unseres Datenschutzbeauftragten können Sie jederzeit folgende Rechte ausüben:
          </Typography>
          <ul>
            <li>Auskunft über Ihre bei uns gespeicherten Daten und deren Verarbeitung,</li>
            <li>Berichtigung unrichtiger personenbezogener Daten,</li>
            <li>Löschung Ihrer bei uns gespeicherten Daten,</li>
            <li>Einschränkung der Datenverarbeitung, sofern wir Ihre Daten aufgrund gesetzlicher Pflichten noch nicht löschen dürfen,</li>
            <li>Widerspruch gegen die Verarbeitung Ihrer Daten bei uns und</li>
            <li>Datenübertragbarkeit, sofern Sie in die Datenverarbeitung eingewilligt haben oder einen Vertrag mit uns abgeschlossen haben.</li>
          </ul>
          <Typography variant="body1" paragraph>
            Sofern Sie uns eine Einwilligung erteilt haben, können Sie diese jederzeit mit Wirkung für die Zukunft widerrufen.
          </Typography>
          <Typography variant="body1" paragraph>
            Sie können sich jederzeit mit einer Beschwerde an die für Sie zuständige Aufsichtsbehörde wenden. Eine Liste der Aufsichtsbehörden (für den nichtöffentlichen Bereich) mit Anschrift finden Sie unter: <a href="https://www.bfdi.bund.de" target="_blank" rel="noopener noreferrer" style={{ color: theme.palette.primary.main }}>https://www.bfdi.bund.de</a>.
          </Typography>
        </Section>

        <Section title="Zwecke der Datenverarbeitung durch die verantwortliche Stelle und Dritte">
          <Typography variant="body1" paragraph>
            Wir verarbeiten Ihre personenbezogenen Daten nur zu den in dieser Datenschutzerklärung genannten Zwecken. Eine Übermittlung Ihrer persönlichen Daten an Dritte zu anderen als den genannten Zwecken findet nicht statt. Wir geben Ihre persönlichen Daten nur an Dritte weiter, wenn:
          </Typography>
          <ul>
            <li>Sie Ihre ausdrückliche Einwilligung dazu erteilt haben,</li>
            <li>die Verarbeitung zur Abwicklung eines Vertrags mit Ihnen erforderlich ist,</li>
            <li>die Verarbeitung zur Erfüllung einer rechtlichen Verpflichtung erforderlich ist,</li>
            <li>die Verarbeitung zur Wahrung berechtigter Interessen erforderlich ist und kein Grund zur Annahme besteht, dass Sie ein überwiegendes schutzwürdiges Interesse an der Nichtweitergabe Ihrer Daten haben.</li>
          </ul>
        </Section>

        <Section title="Löschung bzw. Sperrung der Daten">
          <Typography variant="body1" paragraph>
            Wir halten uns an die Grundsätze der Datenvermeidung und Datensparsamkeit. Wir speichern Ihre personenbezogenen Daten daher nur so lange, wie dies zur Erreichung der hier genannten Zwecke erforderlich ist oder wie es die vom Gesetzgeber vorgesehenen vielfältigen Speicherfristen vorsehen. Nach Fortfall des jeweiligen Zweckes bzw. Ablauf dieser Fristen werden die entsprechenden Daten routinemäßig und entsprechend den gesetzlichen Vorschriften gesperrt oder gelöscht.
          </Typography>
        </Section>

        <Section title="Erfassung allgemeiner Informationen beim Besuch unserer Website">
          <Typography variant="body1" paragraph>
            Wenn Sie auf unsere Website zugreifen, werden automatisch mittels eines Cookies Informationen allgemeiner Natur erfasst. Diese Informationen (Server-Logfiles) beinhalten etwa die Art des Webbrowsers, das verwendete Betriebssystem, den Domainnamen Ihres Internet-Service-Providers und ähnliches. Hierbei handelt es sich ausschließlich um Informationen, welche keine Rückschlüsse auf Ihre Person zulassen.
          </Typography>
        </Section>

        <Section title="Cookies">
          <Typography variant="body1" paragraph>
            Wie viele andere Webseiten verwenden wir auch so genannte „Cookies“. Cookies sind kleine Textdateien, die von einem Websiteserver auf Ihre Festplatte übertragen werden. Hierdurch erhalten wir automatisch bestimmte Daten wie z. B. IP-Adresse, verwendeter Browser, Betriebssystem und Ihre Verbindung zum Internet. Cookies können nicht verwendet werden, um Programme zu starten oder Viren auf einen Computer zu übertragen.
          </Typography>
        </Section>

        <Section title="Kontaktformular">
          <Typography variant="body1" paragraph>
            Treten Sie bzgl. Fragen jeglicher Art per E-Mail oder Kontaktformular mit uns in Kontakt, erteilen Sie uns zum Zwecke der Kontaktaufnahme Ihre freiwillige Einwilligung. Die von Ihnen gemachten Angaben werden zum Zwecke der Bearbeitung der Anfrage sowie für mögliche Anschlussfragen gespeichert. Nach Erledigung der von Ihnen gestellten Anfrage werden personenbezogene Daten automatisch gelöscht.
          </Typography>
        </Section>

        <Section title="Änderung unserer Datenschutzbestimmungen">
          <Typography variant="body1" paragraph>
            Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen in der Datenschutzerklärung umzusetzen, z.B. bei der Einführung neuer Services. Für Ihren erneuten Besuch gilt dann die neue Datenschutzerklärung.
          </Typography>
        </Section>

        <Section title="Fragen an den Datenschutzbeauftragten">
          <Typography variant="body1" paragraph>
            Wenn Sie Fragen zum Datenschutz haben, schreiben Sie uns bitte eine E-Mail oder wenden Sie sich direkt an die für den Datenschutz verantwortliche Person in unserer Organisation:
            <br /><br />
            <a href={`mailto:${clubInfo?.dataProtection?.email || 'bunteligafreiburg@freenet.de'}`} style={{ color: theme.palette.primary.main, textDecoration: 'none' }}>
              {clubInfo?.dataProtection?.email || 'bunteligafreiburg@freenet.de'}
            </a>
          </Typography>
        </Section>
      </Paper>
    </Container>
  );
};

export default PrivacyPage;
