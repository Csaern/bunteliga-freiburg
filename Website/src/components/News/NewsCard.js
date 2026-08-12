import * as React from 'react';
import { useTheme } from '@mui/material/styles';
import { Card, CardContent, Typography, Box, Divider } from '@mui/material';

const NewsCard = ({ title, subtitle, date, content }) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        width: '100%',
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        borderRadius: theme.shape.borderRadius,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: theme.shadows[2],
        mb: 2
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="caption"
            sx={{
              fontFamily: 'comfortaa',
              color: theme.palette.primary.main,
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            {date}
          </Typography>
          <Typography
            variant="h5"
            sx={{
              fontFamily: 'comfortaa',
              fontWeight: 700,
              mt: 1,
              color: theme.palette.text.primary,
              lineHeight: 1.2
            }}
          >
            {title}
          </Typography>
        </Box>

        {subtitle && (
          <Typography 
            variant="subtitle1" 
            sx={{
              fontFamily: 'comfortaa',
              fontWeight: 'bold',
              mb: 2,
              color: theme.palette.text.secondary,
            }}
          >
            {subtitle}
          </Typography>
        )}

        {subtitle && content && <Divider sx={{ my: 2 }} />}

        {content && (
          <Typography 
            variant="body1" 
            sx={{ 
              fontFamily: 'comfortaa', 
              lineHeight: 1.7, 
              color: theme.palette.text.primary,
              whiteSpace: 'pre-wrap'
            }}
          >
            {content}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default NewsCard;
