import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import * as websiteApi from '../services/websiteApiService';

// Hardcoded legal texts
const LEGAL_TEXTS = {
  liability: `Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.`,
  copyright: `Das Copyright für veröffentlichte, vom Autor selbst erstellte Objekte bleibt allein beim Autor der Seiten. Eine Vervielfältigung oder Verwendung solcher Grafiken, Tondokumente, Videosequenzen und Texte in anderen elektronischen oder gedruckten Publikationen ist ohne ausdrückliche Zustimmung des Autors nicht gestattet.`,
  euDispute: `Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr.\nUnsere E-Mail-Adresse finden Sie oben im Impressum.`,
  consumerDispute: `Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.`
};

const ImpressumPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [clubInfo, setClubInfo] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await websiteApi.getSettings('club-info');
        // If data is missing (not yet saved), use an empty structure or defaults
        if (data) {
          setClubInfo(data);
        } else {
          // Fallback to minimal structure to allow page to render
          setClubInfo({
            address: {}, bankDetails: {}, contact: {}, register: {}, dataProtection: {}
          });
        }
      } catch (error) {
        console.error('Failed to load impressum data', error);
        // Stop loading even on error
        setClubInfo({ address: {}, bankDetails: {}, contact: {}, register: {}, dataProtection: {} });
      }
    };
    loadData();
  }, []);

  const Section = ({ title, children }) => (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" component="h2" sx={{ fontFamily: 'Comfortaa', fontWeight: 'bold', color: theme.palette.primary.main, mb: 1.5 }}>
        {title}
      </Typography>
      <Typography variant="body1" component="div" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.secondary, lineHeight: 1.7, whiteSpace: 'pre-line' }}>
        {children}
      </Typography>
    </Box>
  );

  if (!clubInfo) {
    return <Container sx={{ py: 4 }}><Typography textAlign="center">Lade Daten...</Typography></Container>;
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
      <Box textAlign="center" sx={{ mb: 6 }}>
        <Typography variant={isMobile ? 'h4' : 'h3'} component="h1" sx={{ fontFamily: 'Comfortaa', fontWeight: 700, color: theme.palette.primary.main, mb: 1 }}>
          IMPRESSUM
        </Typography>
        <Typography variant="subtitle1" sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.secondary }}>
          Angaben gemäß § 5 TMG
        </Typography>
      </Box>

      <Paper sx={{ p: { xs: 3, sm: 5 }, borderRadius: 2 }}>
        <Section title="Herausgeber & Kontakt">
          {clubInfo?.address?.name}<br />
          {clubInfo?.address?.person && <>{clubInfo.address.person}<br /></>}
          {clubInfo?.address?.street}<br />
          {clubInfo?.address?.city}<br />
          <br />
          {clubInfo?.contact?.phone && <>Telefon: {clubInfo.contact.phone}<br /></>}
          {clubInfo?.contact?.fax && <>Fax: {clubInfo.contact.fax}<br /></>}
          {clubInfo?.contact?.email && <>E-Mail: {clubInfo.contact.email}<br /></>}
        </Section>

        <Divider sx={{ my: 3 }} />

        <Section title="Vertretungsberechtigter Vorstand">
          {clubInfo?.representatives || "Vorstandsinformationen folgen."}
        </Section>

        <Section title="Registereintrag & Steuernummer">
          Eintragung im Vereinsregister.<br />
          Registergericht: {clubInfo?.register?.court}<br />
          Registernummer: {clubInfo?.register?.number}<br />
          {clubInfo?.taxId && <>Steuernummer: {clubInfo.taxId}</>}
        </Section>

        <Divider sx={{ my: 3 }} />

        <Section title="Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV">
          {clubInfo?.contentResponsibility || "Vorstand"}
        </Section>

        <Section title="Haftung für Inhalte & Links">
          {LEGAL_TEXTS.liability}
        </Section>

        <Section title="Urheberrecht">
          {LEGAL_TEXTS.copyright}
        </Section>

        <Section title="EU-Streitschlichtung">
          {LEGAL_TEXTS.euDispute}
        </Section>

        <Section title="Verbraucherstreitbeilegung/Universalschlichtungsstelle">
          {LEGAL_TEXTS.consumerDispute}
        </Section>
      </Paper>
    </Container>
  );
};

export default ImpressumPage;
