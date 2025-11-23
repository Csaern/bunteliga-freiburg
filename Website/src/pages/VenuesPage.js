import * as React from 'react';
import mrp from '../img/mrp.jpg';
import psv from '../img/psv.jpg';
import seepark from '../img/seepark.jpg';

import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  useTheme,
  useMediaQuery,
  Grid,
} from '@mui/material';
import MapIcon from '@mui/icons-material/Map';

// Daten für die Sportplätze
const venuesData = [
  {
    id: 1,
    name: 'Marian-Rutka-Platz',
    address: '79108 Freiburg',
    imageUrl: mrp,
    mapUrl: 'https://www.google.com/maps/place/Marian+Rutka+Platz/@48.0393479,7.8515957,386m/data=!3m1!1e3!4m15!1m8!3m7!1s0x47911ce06e6287d5:0x31c5180a88570c8!2sSportplatz+Post+Jahn,+Schwarzwaldstra%C3%9Fe+189,+79117+Freiburg+im+Breisgau!3b1!8m2!3d47.9892117!4d7.8894597!16s%2Fg%2F11x2h4k2mr!3m5!1s0x47911bf76e7fc355:0xc81e0a93bf9a4df1!8m2!3d48.0398962!4d7.8524517!16s%2Fg%2F11g8v1x3ys?entry=ttu&g_ep=EgoyMDI1MDYwMy4wIKXMDSoASAFQAw%3D%3D',
  },
  {
    id: 2,
    name: 'Seeparkstadion',
    address: 'Siedlerweg, 79110 Freiburg',
    imageUrl: seepark,
    mapUrl: 'https://www.google.com/maps/place/Seepark+Stadion/@48.0122702,7.8187205,234m/data=!3m1!1e3!4m15!1m8!3m7!1s0x47911bfa652f0e5d:0xe46f50aea5dfaa3d!2sL%C3%B6rracher+Str.+12,+79115+Freiburg+im+Breisgau!3b1!8m2!3d47.9808942!4d7.8230486!16s%2Fg%2F11y1c2rjh1!3m5!1s0x47911b0a1b9a1c37:0x35d267d40616702d!8m2!3d48.0124077!4d7.8186686!16s%2Fg%2F11bxc5k38v?entry=ttu&g_ep=EgoyMDI1MDYwMy4wIKXMDSoASAFQAw%3D%3D',
  },
  {
    id: 3,
    name: 'Kunstrasen PSV Freiburg',
    address: 'Lörracher Str. 20, 79115 Freiburg',
    imageUrl: psv,
    mapUrl: 'https://www.google.com/maps/place/Polizei-Sportverein+Freiburg+e.V./@47.980813,7.817535,1014m/data=!3m1!1e3!4m12!1m5!3m4!2zNDfCsDU4JzUwLjkiTiA3wrA0OScwMy4xIkU!8m2!3d47.980813!4d7.817535!3m5!1s0x47911b4854640211:0x57dfeef1f77fe0a0!8m2!3d47.9795719!4d7.8176925!16s%2Fg%2F1trtt73g?entry=ttu&g_ep=EgoyMDI1MDYwMy4wIKXMDSoASAFQAw%3D%3D',
  },
];

// Sub-Komponente für eine einzelne Platz-Karte
const VenueCard = ({ venue }) => {
  const theme = useTheme();
  return (
    <Paper
      sx={{
        backgroundColor: '#1C1C1C',
        borderRadius: theme.shape.borderRadius,
        border: `1px solid ${theme.palette.grey[800]}`,
        overflow: 'hidden',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        component="img"
        src={venue.imageUrl}
        alt={`Bild von ${venue.name}`}
        sx={{
          width: '100%',
          height: { xs: 'auto', sm: '200px' }, // Mobile: auto, Desktop: feste Höhe
          aspectRatio: { xs: '4 / 3', sm: 'auto' }, // Mobile: 4:3, Desktop: auto
          objectFit: 'cover',   // Füllt den Bereich, schneidet bei Bedarf ab
          display: 'block',     // Verhindert unerwünschten Leerraum unter dem Bild
        }}
      />
      <Box sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Typography 
          variant="h6" 
          component="h3"
          sx={{ fontFamily: 'comfortaa', color: theme.palette.common.white, fontWeight: 'bold' }}
        >
          {venue.name}
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[400], my: 1.5 }}
        >
          {venue.address}
        </Typography>
        <Button
          variant="contained"
          href={venue.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          startIcon={<MapIcon />}
          sx={{
            mt: 1,
            fontFamily: 'comfortaa',
            fontWeight: 'bold',
            backgroundColor: '#00A99D',
            color: theme.palette.common.white,
            transition: 'background-color 0.3s ease',
            '&:hover': {
              backgroundColor: '#00877D',
            },
          }}
        >
          Auf Karte anzeigen
        </Button>
      </Box>
    </Paper>
  );
};


const VenuesPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
      <Typography
        variant={isMobile ? 'h4' : 'h3'}
        component="h1"
        sx={{
          mb: 3,
          mt: 2,
          color: '#00A99D',
          fontWeight: 700,
          fontFamily: 'comfortaa',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        Über uns
      </Typography>
      
      {/* Beschreibung über die Bunte Liga */}
      <Paper
        sx={{
          backgroundColor: '#1C1C1C',
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.grey[800]}`,
          p: { xs: 2, sm: 3 },
          mb: 4,
        }}
      >
        <Typography
          variant="h5"
          sx={{
            color: '#00A99D',
            fontFamily: 'comfortaa',
            fontWeight: 700,
            mb: 2,
            textAlign: 'center',
          }}
        >
          Die Bunte Liga Freiburg
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: theme.palette.grey[300],
            fontFamily: 'comfortaa',
            lineHeight: 1.8,
            textAlign: 'justify',
          }}
        >
          Die Bunte Liga Freiburg ist eine inklusive Hans Fußballliga, die Menschen aller Hintergründe zusammenbringt. 
          Wir fördern Fairplay, Gemeinschaft und den Spaß am Fußball. Unsere Liga steht für Vielfalt, Respekt und 
          sportliche Begeisterung. Egal ob Anfänger oder erfahrener Spieler – bei uns ist jeder willkommen, der 
          die Leidenschaft für den Fußball teilt.

          Dumm wer nicht mitmacht!
        </Typography>
      </Paper>

      {/* Plätze in Grid (max 2 nebeneinander) */}
      <Typography
        variant="h5"
        sx={{
          mb: 3,
          mt: 4,
          color: '#00A99D',
          fontWeight: 700,
          fontFamily: 'comfortaa',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        Unsere Plätze
      </Typography>
      
      <Box 
        sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 3,
          justifyContent: 'center',
        }}
      >
        {venuesData.map((venue) => (
          <Box
            key={venue.id}
            sx={{
              width: { 
                xs: '100%', // Mobile: volle Breite
                sm: venuesData.length === 1 ? '100%' : 
                    venuesData.length === 2 ? 'calc(50% - 12px)' : 
                    venuesData.length === 3 ? 'calc(33.333% - 16px)' : 
                    'calc(25% - 18px)' // Maximal 4 pro Zeile
              },
              minWidth: { sm: venuesData.length > 4 ? 'calc(25% - 18px)' : 'auto' },
              maxWidth: { sm: venuesData.length > 4 ? 'calc(25% - 18px)' : 'none' },
              display: 'flex',
            }}
          >
            <VenueCard venue={venue} />
          </Box>
        ))}
      </Box>
    </Container>
  );
};

export default VenuesPage;

