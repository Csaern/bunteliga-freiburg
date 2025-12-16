import * as React from 'react';
import { Box, Container, IconButton, Typography, useTheme, useMediaQuery, CircularProgress } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import NewsCard from './NewsCard.js';
import { useSwipeable } from 'react-swipeable';
import * as newsApi from '../../services/newsApiService';

const NewsCarousel = () => {
  const theme = useTheme();
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [newsData, setNewsData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Helper function to normalize Firestore timestamps
  const normalizeToDate = (maybeDate) => {
    if (!maybeDate) return null;

    // Firestore Timestamp object (has toDate() method)
    if (typeof maybeDate.toDate === 'function') {
      return maybeDate.toDate();
    }

    // Serialized Firestore Timestamp format {_seconds, _nanoseconds}
    if (typeof maybeDate === 'object' && typeof maybeDate._seconds === 'number') {
      const milliseconds = maybeDate._seconds * 1000;
      if (typeof maybeDate._nanoseconds === 'number') {
        return new Date(milliseconds + (maybeDate._nanoseconds / 1000000));
      }
      return new Date(milliseconds);
    }

    // JavaScript Date object or ISO string
    const d = new Date(maybeDate);
    return isNaN(d.getTime()) ? null : d;
  };

  React.useEffect(() => {
    const loadNews = async () => {
      try {
        console.log('Lade News...');
        const news = await newsApi.getPublishedNews();
        console.log('News geladen:', news);

        if (!news || !Array.isArray(news)) {
          console.warn('News ist kein Array:', news);
          setNewsData([]);
          setLoading(false);
          return;
        }

        // Format news data for NewsCard component
        const formattedNews = news.map(item => {
          // Format date from Firestore timestamp
          let dateStr = '';
          if (item.publishedAt) {
            const date = normalizeToDate(item.publishedAt);
            if (date) {
              dateStr = date.toLocaleDateString('de-DE', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              });
            }
          } else if (item.createdAt) {
            // Fallback: Verwende createdAt wenn publishedAt nicht vorhanden ist
            const date = normalizeToDate(item.createdAt);
            if (date) {
              dateStr = date.toLocaleDateString('de-DE', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              });
            }
          }

          return {
            id: item.id,
            title: item.title || '',
            subtitle: item.subtitle || '',
            content: item.content || '',
            date: dateStr,
          };
        });

        console.log('Formatierte News:', formattedNews);
        setNewsData(formattedNews);
        setActiveIndex(0);
      } catch (error) {
        console.error('Fehler beim Laden der News:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
        });
        setNewsData([]);
      } finally {
        setLoading(false);
      }
    };
    loadNews();
  }, []);

  const handlePreviousCallback = React.useCallback(() => {
    if (newsData && newsData.length > 0) {
      setActiveIndex((prevIndex) => Math.max(0, prevIndex - 1));
    }
  }, [newsData]);

  const handleNextCallback = React.useCallback(() => {
    if (newsData && newsData.length > 0) {
      setActiveIndex((prevIndex) => Math.min(newsData.length - 1, prevIndex + 1));
    }
  }, [newsData]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleNextCallback(),
    onSwipedRight: () => handlePreviousCallback(),
    preventScrollOnSwipe: true,
    trackMouse: true
  });

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ my: 4, textAlign: 'center' }}>
        <CircularProgress sx={{ color: theme.palette.primary.main }} />
        <Typography variant="body2" sx={{ mt: 2, fontFamily: 'comfortaa', color: 'text.secondary' }}>
          Lade News...
        </Typography>
      </Container>
    );
  }

  if (!newsData || newsData.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ my: 4, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ fontFamily: 'comfortaa', color: 'grey.400', mb: 1 }}>
          Keine Nachrichten verfügbar.
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: 'comfortaa', color: 'grey.500' }}>
          Es wurden noch keine News veröffentlicht.
        </Typography>
      </Container>
    );
  }

  const currentNews = newsData[activeIndex];

  if (!currentNews) {
    return (
      <Container maxWidth="xl" sx={{ my: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="error" sx={{ fontFamily: 'comfortaa' }}>Fehler beim Laden der Nachricht.</Typography>
      </Container>
    );
  }

  const isFirstNews = activeIndex === 0;
  const isLastNews = activeIndex === newsData.length - 1;

  return (
    <Container maxWidth="xl" sx={{ my: 2, px: { xs: 1, sm: 2 } }}>
      <Typography
        variant={isMobile ? 'h4' : 'h3'}
        sx={{
          mb: 2,
          color: theme.palette.primary.main,
          fontWeight: 700,
          fontFamily: 'Comfortaa',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        NEWS
      </Typography>
      <Box
        {...swipeHandlers}
        sx={{
          width: '100%',
          maxWidth: '900px',
          mx: 'auto',

          cursor: 'grab',
          '&:active': {
            cursor: 'grabbing',
          },

          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'center',
          minHeight: '220px',
        }}
      >
        <NewsCard
          key={activeIndex}
          title={currentNews.title}
          subtitle={currentNews.subtitle}
          date={currentNews.date}
          content={currentNews.content}
        />
      </Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          mt: 2,
          width: '100%',
          maxWidth: '900px',
          mx: 'auto',
          gap: 2,
        }}
      >
        <IconButton
          onClick={handlePreviousCallback}
          aria-label="vorherige nachricht"
          disabled={isFirstNews}
          sx={{
            color: isFirstNews ? 'grey.700' : 'grey.400',
            backgroundColor: 'rgba(255,255,255,0.05)',
            '&:hover': {
              backgroundColor: isFirstNews ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'
            }
          }}
        >
          <ArrowBackIosNewIcon />
        </IconButton>
        <IconButton
          onClick={handleNextCallback}
          aria-label="nächste nachricht"
          disabled={isLastNews}
          sx={{
            color: isLastNews ? 'grey.700' : 'grey.400',
            backgroundColor: 'rgba(255,255,255,0.05)',
            '&:hover': {
              backgroundColor: isLastNews ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'
            }
          }}
        >
          <ArrowForwardIosIcon />
        </IconButton>
      </Box>
    </Container>
  );
};

export default NewsCarousel;
