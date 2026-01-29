import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Paper, Typography, TextField, Button, Alert, useTheme, CircularProgress } from '@mui/material';
import * as userApiService from '../services/userApiService';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isResetView, setIsResetView] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const udoc = await getDoc(doc(db, 'users', cred.user.uid));

      if (!udoc.exists()) {
        setError('Benutzer-Dokument nicht gefunden. Bitte wenden Sie sich an den Administrator.');
        await signOut(auth);
        return;
      }

      await setDoc(doc(db, 'users', cred.user.uid), {
        lastLogin: serverTimestamp(),
      }, { merge: true });

      const userData = udoc.data();
      if (userData.isAdmin) {
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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Bitte geben Sie Ihre E-Mail-Adresse ein.');
      return;
    }

    setResetLoading(true);
    setError('');
    setResetSuccess(false);

    try {
      await userApiService.requestPasswordReset(email);
      setResetSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Fehler beim Senden der Anfrage.');
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
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

  const inputStyle = {
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
  };

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
          variant="h4"
          sx={{
            fontFamily: 'Comfortaa',
            fontWeight: 700,
            color: theme.palette.primary.main,
            textTransform: 'uppercase',
            mb: 3,
            textAlign: 'center'
          }}
        >
          {isResetView ? 'Passwort vergessen' : 'Anmeldung'}
        </Typography>

        {isResetView ? (
          <Box component="form" onSubmit={handleForgotPassword} noValidate sx={{ width: '100%' }}>
            {resetSuccess ? (
              <Alert severity="success" sx={{ mb: 2, fontFamily: 'Comfortaa' }}>
                E-Mail gesendet! Prüfe deinen Posteingang für weitere Anweisungen.
              </Alert>
            ) : (
              <Typography variant="body2" sx={{ mb: 2, color: theme.palette.text.secondary, textAlign: 'center' }}>
                Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen deines Passworts.
              </Typography>
            )}

            <TextField
              margin="normal"
              required
              fullWidth
              id="reset-email"
              label="E-Mail-Adresse"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={resetLoading || resetSuccess}
              sx={inputStyle}
            />

            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

            {!resetSuccess && (
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={resetLoading}
                sx={{ mt: 3, mb: 2, py: 1.5, fontFamily: 'Comfortaa', fontWeight: 'bold' }}
              >
                {resetLoading ? <CircularProgress size={24} color="inherit" /> : 'Link senden'}
              </Button>
            )}

            <Button
              fullWidth
              onClick={() => {
                setIsResetView(false);
                setError('');
                setResetSuccess(false);
              }}
              sx={{ textTransform: 'none', color: theme.palette.text.secondary }}
            >
              Zurück zur Anmeldung
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleLogin} noValidate sx={{ width: '100%' }}>
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
              sx={inputStyle}
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
              sx={inputStyle}
            />
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5, fontFamily: 'Comfortaa', fontWeight: 'bold' }}
            >
              Anmelden
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Button
                onClick={() => {
                  setIsResetView(true);
                  setError('');
                }}
                sx={{ textTransform: 'none', color: theme.palette.text.secondary }}
              >
                Passwort vergessen?
              </Button>
            </Box>
          </Box>
        )}

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
