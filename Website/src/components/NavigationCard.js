import { Link as RouterLink } from 'react-router-dom';
import * as React from 'react';
import { Box, Card, CardContent, Typography, CardActionArea } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const NavigationCard = ({ icon, title, subtitle, link }) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.divider}`,
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
            <Box sx={{ color: theme.palette.primary.main, mb: 2 }}>
              {React.cloneElement(icon, { sx: { fontSize: 45 } })}
            </Box>
          )}

          {/* Titel */}
          <Typography
            variant="h5"
            component="div"
            gutterBottom
            sx={{
              fontFamily: 'Comfortaa',
              fontWeight: 700,
              color: theme.palette.text.primary,
            }}
          >
            {title}
          </Typography>

          {/* Subtitle */}
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontFamily: 'Comfortaa' }}>
            {subtitle}
          </Typography>

        </CardContent>
      </CardActionArea>
    </Card>
  );
};

export default NavigationCard;