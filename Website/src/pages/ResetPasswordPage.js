import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../firebase';
import { Container, Box, Paper, Typography, TextField, Button, Alert, useTheme, CircularProgress } from '@mui/material';

const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const theme = useTheme();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [email, setEmail] = useState('');

    const oobCode = searchParams.get('oobCode');

    useEffect(() => {
        const verifyCode = async () => {
            if (!oobCode) {
                setError('Kein gültiger Wiederherstellungscode gefunden.');
                setVerifying(false);
                return;
            }

            try {
                const userEmail = await verifyPasswordResetCode(auth, oobCode);
                setEmail(userEmail);
            } catch (err) {
                console.error(err);
                setError('Der Link ist ungültig oder abgelaufen.');
            } finally {
                setVerifying(false);
            }
        };

        verifyCode();
    }, [oobCode]);

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Die Passwörter stimmen nicht überein.');
            return;
        }
        if (password.length < 6) {
            setError('Das Passwort muss mindestens 6 Zeichen lang sein.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await confirmPasswordReset(auth, oobCode, password);
            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            console.error(err);
            setError('Fehler beim Zurücksetzen des Passworts. Bitte versuchen Sie es erneut.');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        '& label.Mui-focused': { color: theme.palette.primary.main },
        '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: theme.palette.divider },
            '&:hover fieldset': { borderColor: theme.palette.text.secondary },
            '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
        },
        input: { color: theme.palette.text.primary },
        label: { color: theme.palette.text.secondary },
    };

    if (verifying) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container component="main" maxWidth="xs" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <Paper elevation={8} sx={{ p: { xs: 3, md: 4 }, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', backgroundColor: theme.palette.background.paper, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <Typography component="h1" variant="h4" sx={{ fontFamily: 'Comfortaa', fontWeight: 700, color: theme.palette.primary.main, textTransform: 'uppercase', mb: 3, textAlign: 'center' }}>
                    Neues Passwort
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2, width: '100%' }}>{error}</Alert>}
                {success && (
                    <Alert severity="success" sx={{ mb: 2, width: '100%' }}>
                        Passwort erfolgreich zurückgesetzt! Sie werden in Kürze zur Anmeldung weitergeleitet.
                    </Alert>
                )}

                {email && !success && (
                    <Box sx={{ width: '100%', mb: 2 }}>
                        <TextField
                            label="Email"
                            value={email}
                            fullWidth
                            disabled
                            variant="outlined"
                            size="small"
                            sx={{ mb: 2, ...inputStyle }}
                        />
                        <TextField
                            label="Name"
                            value={searchParams.get('name') || 'Benutzer'}
                            fullWidth
                            disabled
                            variant="outlined"
                            size="small"
                            sx={{ ...inputStyle }}
                        />
                    </Box>
                )}

                {!success && !error && (
                    <Box component="form" onSubmit={handleResetPassword} noValidate sx={{ width: '100%' }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Neues Passwort"
                            type="password"
                            id="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            sx={inputStyle}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="confirmPassword"
                            label="Passwort bestätigen"
                            type="password"
                            id="confirmPassword"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            sx={inputStyle}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading}
                            sx={{ mt: 3, mb: 2, py: 1.5, fontFamily: 'Comfortaa', fontWeight: 'bold' }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Passwort speichern'}
                        </Button>
                    </Box>
                )}

                {(error || success) && (
                    <Button fullWidth component={Link} to="/login" sx={{ textTransform: 'none', color: theme.palette.text.secondary, mt: 2 }}>
                        Zurück zur Anmeldung
                    </Button>
                )}

                <Box sx={{ textAlign: 'center', mt: 3, p: 2, backgroundColor: theme.palette.action.hover, borderRadius: 2, width: '100%' }}>
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontFamily: 'Comfortaa' }}>
                        Bunteliga Freiburg<br />
                        <Typography variant="caption" sx={{ color: theme.palette.text.disabled }}>Vereinsmanagement System</Typography>
                    </Typography>
                </Box>
            </Paper>
        </Container>
    );
};

export default ResetPasswordPage;
