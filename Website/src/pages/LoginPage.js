import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Paper, Typography, TextField, Button, Alert } from '@mui/material';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();

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
          backgroundColor: 'rgba(20, 20, 20, 0.9)',
          backdropFilter: 'blur(5px)',
          borderRadius: 3,
        }}
      >
        <Typography
          component="h1"
          variant="h5"
          sx={{
            fontFamily: 'comfortaa',
            fontWeight: 700,
            color: '#00A99D',
            textTransform: 'uppercase',
            mb: 3,
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
              '& label.Mui-focused': { color: '#00A99D' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'grey.700' },
                '&:hover fieldset': { borderColor: 'grey.500' },
                '&.Mui-focused fieldset': { borderColor: '#00A99D' },
              },
              input: {
                color: 'grey.100',
                '&:-webkit-autofill': {
                  WebkitBoxShadow: '0 0 0 100px #141414 inset',
                  WebkitTextFillColor: '#e0e0e0',
                },
              },
              label: { color: 'grey.400' },
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
              '& label.Mui-focused': { color: '#00A99D' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'grey.700' },
                '&:hover fieldset': { borderColor: 'grey.500' },
                '&.Mui-focused fieldset': { borderColor: '#00A99D' },
              },
              input: {
                color: 'grey.100',
                '&:-webkit-autofill': {
                  WebkitBoxShadow: '0 0 0 100px #141414 inset',
                  WebkitTextFillColor: '#e0e0e0',
                },
              },
              label: { color: 'grey.400' },
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
              fontFamily: 'comfortaa',
              fontWeight: 'bold',
              backgroundColor: '#00A99D',
              '&:hover': {
                backgroundColor: '#00897B', // Etwas dunklerer Ton für den Hover-Effekt
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
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: 2,
            width: '100%'
          }}
        >
          <Typography variant="body2" sx={{ color: 'grey.400', fontFamily: 'comfortaa' }}>
            Bunteliga Freiburg<br />
            <Typography variant="caption" sx={{ color: 'grey.500' }}>
              Vereinsmanagement System
            </Typography>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;