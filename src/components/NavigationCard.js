import { Link as RouterLink } from 'react-router-dom';
import * as React from 'react';
import { Box, Card, CardContent, Typography, CardActionArea } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const NavigationCard = ({ icon, title, subtitle, link }) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        backgroundColor: '#111',
        color: theme.palette.grey[300],
        border: `1px solid ${theme.palette.grey[800]}`,
        borderRadius: theme.shape.borderRadius,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <CardActionArea
        component={RouterLink}
        to={link}
        sx={{
          height: '100%', 
            flexGrow: 1, 
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            p: { xs: 2, md: 4 },
        }} 
      >
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          
          {/* Optionales Icon */}
          {icon && (
            <Box sx={{ color: theme.palette.error.main, mb: 2 }}>
              {React.cloneElement(icon, { sx: { fontSize: 45 } })}
            </Box>
          )}

          {/* Titel */}
          <Typography 
            variant="h5" 
            component="div" 
            gutterBottom
            sx={{ 
              fontFamily: 'comfortaa', 
              fontWeight: 700,
              color: '#fff',
            }}
          >
            {title}
          </Typography>
          
          {/* Subtitle */}
          <Typography variant="body2" sx={{ color: theme.palette.grey[400], fontFamily:'comfortaa' }}>
           {subtitle}
          </Typography>

        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default NavigationCard;