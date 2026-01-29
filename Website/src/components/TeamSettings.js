import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthProvider';
import {
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  IconButton,
  Grid,
  InputAdornment,
  Tabs,
  Tab,
  Snackbar,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LanguageIcon from '@mui/icons-material/Language';
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';
import TwitterIcon from '@mui/icons-material/Twitter';
import InfoIcon from '@mui/icons-material/Info';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import ShareIcon from '@mui/icons-material/Share';
import LockIcon from '@mui/icons-material/Lock'; // Import Lock icon
import * as teamApi from '../services/teamApiService';
import * as userApi from '../services/userApiService'; // Import user api
import ChangePasswordModal from './Auth/ChangePasswordModal';

import AppModal from './Modals/AppModal';


const TeamSettings = ({ onClose }) => {
  const { teamId } = useAuth();
  const theme = useTheme();
  // fullScreen handled by AppModal

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // ... (rest of state)

  // ... (loadTeamData)

  // ... (useEffect, snackbar, save, tab handlers)



  // Feedback state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Data State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    foundedYear: '',
    contactEmail: '',
    contactPhone: '',
    contactPerson: '',
    website: '',
    socialMedia: {
      facebook: '',
      instagram: '',
      twitter: ''
    }
  });

  const loadTeamData = useCallback(async () => {
    try {
      setLoading(true);
      const teamData = await teamApi.getTeamByIdPublic(teamId).catch(async () => {
        const teamDoc = await getDoc(doc(db, 'teams', teamId));
        if (teamDoc.exists()) {
          return { id: teamDoc.id, ...teamDoc.data() };
        }
        return null;
      });

      if (teamData) {
        setTeam(teamData);
        setFormData({
          name: teamData.name || '',
          description: teamData.description || '',
          foundedYear: teamData.foundedYear || '',
          contactEmail: teamData.contactEmail || '',
          contactPhone: teamData.contactPhone || '',
          contactPerson: teamData.contactPerson || '',
          website: teamData.website || '',
          socialMedia: {
            facebook: teamData.socialMedia?.facebook || '',
            instagram: teamData.socialMedia?.instagram || '',
            twitter: teamData.socialMedia?.twitter || ''
          }
        });
      }
    } catch (error) {
      console.error('Fehler beim Laden der Team-Daten:', error);
      showSnackbar('Fehler beim Laden der Daten', 'error');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (teamId) {
      loadTeamData();
    }
  }, [teamId, loadTeamData]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await teamApi.updateTeam(teamId, formData);
      setTeam({ ...team, ...formData });

      showSnackbar('Einstellungen erfolgreich gespeichert!', 'success');

      // Close modal after short delay to let user see success message
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      showSnackbar('Fehler beim Speichern der Einstellungen.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Password Change State
  const [openChangePassword, setOpenChangePassword] = useState(false);


  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSocialChange = (platform, value) => {
    setFormData(prev => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: value
      }
    }));
  };

  const inputStyle = {
    '& .MuiOutlinedInput-root': {
      '&.Mui-focused fieldset': {
        borderColor: theme.palette.primary.main,
      },
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: theme.palette.primary.main,
    }
  };

  if (loading) {
    return (
      <AppModal open={true} onClose={onClose} title="Lade Einstellungen..." loading={true}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </AppModal>
    );
  }

  const actionButtons = (
    <>
      <Button onClick={onClose} color="inherit">
        Abbrechen
      </Button>
      <Box sx={{ flex: '1 1 auto' }} />
      <Button
        onClick={handleSave}
        variant="contained"
        disabled={saving}
        sx={{ fontWeight: 'bold', px: 4 }}
      >
        {saving ? 'Speichern...' : 'Speichern'}
      </Button>
    </>
  );

  return (
    <>
      <AppModal
        open={true}
        onClose={onClose}
        title="Team-Einstellungen"
        actions={actionButtons}
        minHeight="300px"
      >
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3, mx: -3, mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
            aria-label="settings tabs"
          >
            <Tab icon={<InfoIcon />} iconPosition="start" label="Allgemein" sx={{ fontFamily: 'Comfortaa', fontWeight: 600 }} />
            <Tab icon={<ContactMailIcon />} iconPosition="start" label="Kontakt" sx={{ fontFamily: 'Comfortaa', fontWeight: 600 }} />
            <Tab icon={<ShareIcon />} iconPosition="start" label="Social" sx={{ fontFamily: 'Comfortaa', fontWeight: 600 }} />
          </Tabs>

        </Box>

        <Box component="form" noValidate autoComplete="off">

          {/* Tab 0: Allgemeines */}
          <Box role="tabpanel" hidden={activeTab !== 0}>
            {activeTab === 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Hier kannst du die Basisdaten deines Teams bearbeiten.
                </Typography>

                {/* Name und Jahr in einer Zeile */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Team Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    sx={{ flex: 3, ...inputStyle }}
                  />
                  <TextField
                    label="Gründungsjahr"
                    type="number"
                    value={formData.foundedYear}
                    onChange={(e) => setFormData({ ...formData, foundedYear: e.target.value })}
                    sx={{ flex: 1, ...inputStyle }}
                  />
                </Box>

                {/* Beschreibung volle Breite */}
                <TextField
                  label="Beschreibung"
                  multiline
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  fullWidth
                  sx={inputStyle}
                  placeholder="Erzähl uns etwas über dein Team..."
                />

                <Button
                  onClick={() => setOpenChangePassword(true)}
                  variant="outlined"
                  startIcon={<LockIcon />}
                  sx={{ mt: 2, py: 1.5 }}
                >
                  Passwort ändern
                </Button>
              </Box>
            )}
          </Box>

          {/* Tab 1: Kontakt */}
          <Box role="tabpanel" hidden={activeTab !== 1}>
            {activeTab === 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Wie können andere Teams oder Interessierte euch erreichen?
                </Typography>

                {/* Ansprechpartner und Telefon in einer Zeile */}
                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <TextField
                    label="Ansprechpartner"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    fullWidth
                    sx={inputStyle}
                  />
                  <TextField
                    label="Telefon"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    fullWidth
                    sx={inputStyle}
                  />
                </Box>

                {/* Email und Website untereinander */}
                <TextField
                  label="E-Mail Kontaktadresse"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  fullWidth
                  sx={inputStyle}
                  helperText="Wird öffentlich angezeigt"
                />

                <TextField
                  label="Website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  fullWidth
                  sx={inputStyle}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LanguageIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  placeholder="https://..."
                />
              </Box>
            )}
          </Box>

          {/* Tab 2: Social Media */}
          <Box role="tabpanel" hidden={activeTab !== 2}>
            {activeTab === 2 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Verlinke dein Instagram Profil.
                  </Typography>
                </Box>
                <TextField
                  label="Instagram"
                  value={formData.socialMedia.instagram}
                  onChange={(e) => handleSocialChange('instagram', e.target.value)}
                  fullWidth
                  sx={inputStyle}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <InstagramIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  placeholder="Link zum Profil"
                />
              </Box>
            )}
          </Box>


        </Box>
      </AppModal>

      <ChangePasswordModal open={openChangePassword} onClose={() => setOpenChangePassword(false)} />


      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default TeamSettings;
