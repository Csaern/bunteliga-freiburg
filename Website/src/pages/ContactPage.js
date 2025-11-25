import * as React from 'react';
import { Container, useTheme } from '@mui/material';
import ContactContent from '../components/ContactContent';

const ContactPage = () => {
  const theme = useTheme();

  return (
    <Container
      maxWidth="md"
      sx={{
        py: { xs: 3, sm: 4 },
        px: { xs: 2, sm: 3 },
        color: theme.palette.text.primary,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: { xs: 3, sm: 4 },
      }}
    >
      <ContactContent />
    </Container>
  );
};

export default ContactPage;
