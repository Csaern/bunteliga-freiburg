import React from 'react';
import { Box, Container, Typography, Link, Divider } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const Footer = () => {
  const theme = useTheme();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: 'rgb(15, 15, 15)',
        backdropFilter: 'blur(8px)',
        color: theme.palette.grey[500], 
        py: { xs: 3, md: 4 },
        mt: 'auto', 
        borderTop: `1px solid ${theme.palette.grey[900]}`,
        boxShadow: theme.shadows[3]
      }}
    >
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Box 
            sx={{ 
              display: 'flex', 
              gap: { xs: 2, md: 3 }, 
              mb: 2, 
              flexWrap: 'wrap', 
              justifyContent: 'center',
              fontFamily: 'comfortaa',
              fontWeight: 400,
              fontSize: {xs: 12, md: 15}
            }}
          >
            <Link href="/kontakt" color="inherit" underline="hover">Kontakt</Link>
            <Link href="/impressum" color="inherit" underline="hover">Impressum</Link>
            <Link href="/datenschutz" color="inherit" underline="hover">Datenschutz</Link>
          </Box>
          
          <Divider sx={{ width: '50%', maxWidth: '300px', borderColor: 'rgba(255, 255, 255, 0.1)', mb: 2}} />
          <Typography variant="body2" sx={{ fontFamily: 'comfortaa', color: theme.palette.grey[400], fontSize: {xs: 12, md: 15}, fontWeight: 600 }}>
            <Link href="https://rakete-freiburg.de/" color="inherit" underline="hover">© {new Date().getFullYear()} HFT Rakete Freiburg</Link>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;