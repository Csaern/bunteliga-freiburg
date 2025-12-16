import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Paper, Typography, TextField, Button, Alert, useTheme } from '@mui/material';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); // Reset error on new attempt
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);

      const udoc = await getDoc(doc(db, 'users', cred.user.uid));

      if (!udoc.exists()) {
        console.error('Benutzer-Dokument nicht gefunden für UID:', cred.user.uid);
        setError('Benutzer-Dokument nicht gefunden. Bitte wenden Sie sich an den Administrator.');
        await signOut(auth);
        return;
      }

      const userData = udoc.data();
      const isUserAdmin = userData.isAdmin || false;

      await setDoc(doc(db, 'users', cred.user.uid), {
        lastLogin: serverTimestamp(),
      }, { merge: true });

      // Direkte Weiterleitung basierend auf Admin-Status
      if (isUserAdmin) {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }

    } catch (error) {
      console.error('Login-Fehler:', error);
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Ungültige E-Mail-Adresse oder falsches Passwort.');
          break;
        default:
          setError('Fehler beim Login: ' + error.message);
          break;
      }
    }
  };

  // Fallback-Weiterleitung wenn bereits eingeloggt
  useEffect(() => {
    if (currentUser) {
      // Warte kurz, damit isAdmin geladen werden kann
      const timer = setTimeout(() => {
        if (isAdmin === true) {
          navigate('/admin/dashboard');
        } else if (isAdmin === false) {
          navigate('/dashboard');
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [currentUser, isAdmin, navigate]);

  return (
    <Container
      component="main"
      maxWidth="xs"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
      }}
    >
      <Paper
        elevation={8}
        sx={{
          p: { xs: 3, md: 4 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          backgroundColor: theme.palette.background.paper,
          backgroundImage: 'none',
          borderRadius: 3,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography
          component="h1"
          variant="h3"
          sx={{
            fontFamily: 'Comfortaa',
            fontWeight: 700,
            color: theme.palette.primary.main,
            textTransform: 'uppercase',
            mb: 3,
            fontSize: { xs: '1.5rem', sm: '3rem' } // Manual override to match h4/h3 roughly if needed, or just use variant
          }}
        >
          Anmeldung
        </Typography>

        <Box component="form" onSubmit={handleLogin} noValidate sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="E-Mail-Adresse"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{
              '& label.Mui-focused': { color: theme.palette.primary.main },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: theme.palette.divider },
                '&:hover fieldset': { borderColor: theme.palette.text.secondary },
                '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
              },
              input: {
                color: theme.palette.text.primary,
                '&:-webkit-autofill': {
                  WebkitBoxShadow: `0 0 0 100px ${theme.palette.background.paper} inset`,
                  WebkitTextFillColor: theme.palette.text.primary,
                },
              },
              label: { color: theme.palette.text.secondary },
            }}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Passwort"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{
              '& label.Mui-focused': { color: theme.palette.primary.main },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: theme.palette.divider },
                '&:hover fieldset': { borderColor: theme.palette.text.secondary },
                '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
              },
              input: {
                color: theme.palette.text.primary,
                '&:-webkit-autofill': {
                  WebkitBoxShadow: `0 0 0 100px ${theme.palette.background.paper} inset`,
                  WebkitTextFillColor: theme.palette.text.primary,
                },
              },
              label: { color: theme.palette.text.secondary },
            }}
          />
          {error && (
            <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
              {error}
            </Alert>
          )}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              mt: 3,
              mb: 2,
              py: 1.5,
              fontFamily: 'Comfortaa',
              fontWeight: 'bold',
              backgroundColor: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              },
            }}
          >
            Anmelden
          </Button>
        </Box>

        <Box
          sx={{
            textAlign: 'center',
            mt: 3,
            p: 2,
            backgroundColor: theme.palette.action.hover,
            borderRadius: 2,
            width: '100%'
          }}
        >
          <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontFamily: 'Comfortaa' }}>
            Bunteliga Freiburg<br />
            <Typography variant="caption" sx={{ color: theme.palette.text.disabled }}>
              Vereinsmanagement System
            </Typography>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;