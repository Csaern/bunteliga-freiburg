import * as React from 'react';
import { Box, Container, IconButton, Typography, useTheme } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import NewsCard from './NewsCard.js'; 
import { useSwipeable } from 'react-swipeable'; 

// Beispieldaten für die News
const newsData = [
  {
    date: '31. Mai 2025',
    title: 'Meister!',
    subtitle: 'Wir gratulieren dem 1. FC Ferdi Weiß zum Meistertitel der Saison 2024/2025',
    content: 'Eine überragende Saisonleistung krönt den 1. FC Ferdi Weiß! Mit beeindruckender Konstanz und tollem Teamgeist sicherte sich die Mannschaft verdient den Meistertitel. Herzlichen Glückwunsch an alle Spieler, Trainer und Fans!',
  },
  {
    date: '28. Mai 2025',
    title: 'Testtitel 1',
    subtitle: 'Untertitel 1',
    content: 'Das Liga-Komitee hat in Zusammenarbeit mit den Team-Vertretern ein überarbeitetes Fair-Play-Regelwerk verabschiedet. Die wichtigste Änderung betrifft die Handhabung von Zeitstrafen, die nun konsequenter geahndet werden. Zudem wird die Fair-Play-Wertung am Ende der Saison ein höheres Gewicht haben. Alle Details zu den neuen Regeln findet ihr im Download-Bereich auf der Webseite. Fairness und Respekt auf und neben dem Platz sind die Grundpfeiler unserer Liga.',
  },
  {
    date: '25. Mai 2025',
    title: 'Csaern!',
    subtitle: 'Bester Spieler',
    content: '',
  },
];

const NewsCarousel = () => {
  const theme = useTheme(); 
  const [activeIndex, setActiveIndex] = React.useState(0);

  const handlePreviousCallback = React.useCallback(() => {
    if (newsData && newsData.length > 0) {
        setActiveIndex((prevIndex) => Math.max(0, prevIndex - 1));
    }
  }, []); 

  const handleNextCallback = React.useCallback(() => {
    if (newsData && newsData.length > 0) {
        setActiveIndex((prevIndex) => Math.min(newsData.length - 1, prevIndex + 1));
    }
  }, []); 

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => handleNextCallback(),
    onSwipedRight: () => handlePreviousCallback(),
    preventScrollOnSwipe: true, 
    trackMouse: true 
  });

  if (!newsData || newsData.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ my: 4, textAlign: 'center' }}>
        <Typography variant="h6" sx={{fontFamily:'comfortaa'}}>Keine Nachrichten verfügbar.</Typography>
      </Container>
    );
  }

  const currentNews = newsData[activeIndex];

  if (!currentNews) {
    return (
        <Container maxWidth="xl" sx={{ my: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="error" sx={{fontFamily:'comfortaa'}}>Fehler beim Laden der Nachricht.</Typography>
        </Container>
    );
  }

  const isFirstNews = activeIndex === 0;
  const isLastNews = activeIndex === newsData.length - 1;

  return (
    <Container maxWidth="xl" sx={{ my: 2, px: { xs: 1, sm: 2 } }}>
      <Typography 
        variant='h4'
        sx={{ 
            mb: 3, 
            mt: 2, 
            color: theme.palette.error.main, 
            fontWeight: 700, 
            fontFamily: 'comfortaa',
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
