import * as React from 'react';
import { Container, useTheme } from '@mui/material';
import ContactContent from '../components/ContactContent';

const ContactPage = () => {
  const theme = useTheme();

  return (
    <Container
      maxWidth="lg"
      sx={{
        my: 4,
        px: { xs: 1, sm: 3 },
        color: theme.palette.text.primary,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <ContactContent />
    </Container>
  );
};

export default ContactPage;
