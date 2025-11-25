import * as React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert,
} from '@mui/material';
import MapIcon from '@mui/icons-material/Map';
import { getPublicPitches } from '../services/pitchApiService';
import { API_BASE_URL } from '../services/apiClient';
import ContactContent from '../components/ContactContent';
import mrp from '../img/mrp.jpg'; // Fallback image

// Sub-Komponente für eine einzelne Platz-Karte
const VenueCard = ({ venue }) => {
  const theme = useTheme();

  // Konstruiere die Bild-URL
  // Wenn venue.imageUrl existiert, hänge die Basis-URL an (falls es ein relativer Pfad ist)
  // Ansonsten verwende das Fallback-Bild
  const imageUrl = venue.imageUrl
    ? (venue.imageUrl.startsWith('http') ? venue.imageUrl : `${API_BASE_URL}${venue.imageUrl}`)
    : mrp;

  return (
    <Paper
      sx={{
        backgroundColor: theme.palette.background.paper,
        borderRadius: theme.shape.borderRadius,
        border: `1px solid ${theme.palette.divider}`,
        overflow: 'hidden',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        height: '100%', // Ensure cards are same height
      }}
    >
      <Box
        component="img"
        src={imageUrl}
        alt={`Bild von ${venue.name}`}
        sx={{
          width: '100%',
          height: { xs: 'auto', sm: '200px' }, // Mobile: auto, Desktop: feste Höhe
          aspectRatio: { xs: '4 / 3', sm: 'auto' }, // Mobile: 4:3, Desktop: auto
          objectFit: 'cover',   // Füllt den Bereich, schneidet bei Bedarf ab
          display: 'block',     // Verhindert unerwünschten Leerraum unter dem Bild
        }}
      />
      <Box sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', flexGrow: 1 }}>
        <Typography
          variant="h6"
          component="h3"
          sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.primary, fontWeight: 'bold' }}
        >
          {venue.name}
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.secondary, my: 1.5 }}
        >
          {venue.address}
        </Typography>

        {/* Optional: Notizen anzeigen */}
        {venue.notes && (
          <Typography
            variant="body2"
            sx={{ fontFamily: 'Comfortaa', color: theme.palette.text.secondary, mb: 1.5, fontStyle: 'italic' }}
          >
            {venue.notes}
          </Typography>
        )}

        <Box sx={{ mt: 'auto' }}>
          <Button
            variant="contained"
            href={venue.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`} // Fallback zu Google Maps Suche
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<MapIcon />}
            sx={{
              mt: 1,
              fontFamily: 'Comfortaa',
              fontWeight: 'bold',
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.common.black,
              transition: 'background-color 0.3s ease',
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              },
            }}
          >
            Auf Karte anzeigen
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};


const VenuesPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [venues, setVenues] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const fetchPitches = async () => {
      try {
        const data = await getPublicPitches();
        setVenues(data);
      } catch (err) {
        console.error("Fehler beim Laden der Plätze:", err);
        setError("Die Plätze konnten nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    };

    fetchPitches();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ my: 4, px: isMobile ? 2 : 3 }}>
      <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
        <Typography
          variant={isMobile ? 'h4' : 'h3'}
          component="h1"
          sx={{
            mb: 3,
            mt: 2,
            color: theme.palette.primary.main,
            fontWeight: 700,
            fontFamily: 'Comfortaa',
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
            backgroundColor: theme.palette.background.paper,
            borderRadius: theme.shape.borderRadius,
            border: `1px solid ${theme.palette.divider}`,
            p: { xs: 2, sm: 3 },
            mb: 4,
          }}
        >
          <Typography
            variant="h5"
            sx={{
              color: theme.palette.primary.main,
              fontFamily: 'Comfortaa',
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
              color: theme.palette.text.secondary,
              fontFamily: 'Comfortaa',
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
            mt: 2,
            color: theme.palette.primary.main,
            mt: 4,
            color: '#00A99D',
            fontWeight: 700,
            fontFamily: 'Comfortaa',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Unsere Plätze
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress color="secondary" />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        ) : venues.length === 0 ? (
          <Alert severity="info" sx={{ mb: 2 }}>Keine Plätze gefunden.</Alert>
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 3,
            }}
          >
            {venues.map((venue) => (
              <Box key={venue.id} sx={{ display: 'flex', width: { xs: '100%', md: '350px' } }}>
                <VenueCard venue={venue} />
              </Box>
            ))}
          </Box>
        )}

        <Box sx={{ mt: 8 }}>
          <ContactContent />
        </Box>

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
