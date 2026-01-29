import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    TextField,
    DialogActions,
    Button,
    CircularProgress,
    Alert,
    InputAdornment,
    IconButton,
    Box
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import * as userApiService from '../../services/userApiService';

const ChangePasswordModal = ({ open, onClose }) => {
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            setError('Bitte füllen Sie alle Felder aus.');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError('Die neuen Passwörter stimmen nicht überein.');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setError('Das neue Passwort muss mindestens 6 Zeichen lang sein.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await userApiService.changePassword(passwordData.oldPassword, passwordData.newPassword);
            setSuccess(true);
            setTimeout(() => {
                handleClose();
            }, 2000);
        } catch (err) {
            console.error(err);
            setError(err.message || 'Fehler beim Ändern des Passworts.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setSuccess(false);
        setError('');
        setShowPassword(false);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontFamily: 'Comfortaa', fontWeight: 'bold' }}>Passwort ändern</DialogTitle>
            <DialogContent>
                {success ? (
                    <Alert severity="success" sx={{ mt: 1 }}>
                        Passwort erfolgreich geändert!
                    </Alert>
                ) : (
                    <Box component="form" onSubmit={handleSubmit}>
                        <DialogContentText sx={{ mb: 2 }}>
                            Geben Sie Ihr aktuelles und Ihr neues Passwort ein.
                        </DialogContentText>
                        {/* Hidden username field to help password managers and avoid stealing the search bar */}
                        <input type="text" name="username" autoComplete="username" style={{ display: 'none' }} readOnly />

                        <TextField
                            margin="dense"
                            label="Aktuelles Passwort"
                            type={showPassword ? 'text' : 'password'}
                            fullWidth
                            variant="outlined"
                            name="current-password"
                            autoComplete="current-password"
                            value={passwordData.oldPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                            disabled={loading}
                            sx={{ mb: 1 }}
                        />
                        <TextField
                            margin="dense"
                            label="Neues Passwort"
                            type={showPassword ? 'text' : 'password'}
                            fullWidth
                            variant="outlined"
                            name="new-password"
                            autoComplete="new-password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            disabled={loading}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" tabIndex={-1}>
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            margin="dense"
                            label="Neues Passwort bestätigen"
                            type={showPassword ? 'text' : 'password'}
                            fullWidth
                            variant="outlined"
                            name="confirm-password"
                            autoComplete="new-password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            disabled={loading}
                        />
                        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                        {/* Submit button inside form but visually hidden to allow enter to submit */}
                        <button type="submit" style={{ display: 'none' }} aria-hidden="true" />
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} disabled={loading}>Abbrechen</Button>
                {!success && (
                    <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                        {loading ? <CircularProgress size={24} /> : 'Passwort aktualisieren'}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default ChangePasswordModal;
