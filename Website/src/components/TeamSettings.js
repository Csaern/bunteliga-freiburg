import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthProvider';
import { 
  TextField, 
  Button, 
  Box, 
  Typography, 
  CircularProgress,
  useTheme
} from '@mui/material';
import { ReusableModal } from './Helpers/modalUtils';
import * as teamApi from '../services/teamApiService';

const TeamSettings = ({ onClose }) => {
  const { teamId } = useAuth();
  const theme = useTheme();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    loadTeamData();
  }, [teamId]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const teamData = await teamApi.getTeamByIdPublic(teamId).catch(async () => {
        // Fallback zu Firestore
        const teamDoc = await getDoc(doc(db, 'teams', teamId));
        if (teamDoc.exists()) {
          return { id: teamDoc.id, ...teamDoc.data() };
        }
        return null;
      });
      
      if (teamData) {
        setTeam(teamData);
        setFormData({
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
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await teamApi.updateTeam(teamId, formData);
      setTeam({ ...team, ...formData });
      alert('Team-Einstellungen erfolgreich gespeichert!');
      onClose();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern der Einstellungen!');
    } finally {
      setSaving(false);
    }
  };

  const darkInputStyle = {
    '& label.Mui-focused': { color: '#00A99D' },
    '& .MuiOutlinedInput-root': {
      '& fieldset': { borderColor: 'grey.700' },
      '&:hover fieldset': { borderColor: 'grey.500' },
      '&.Mui-focused fieldset': { borderColor: '#00A99D' },
    },
    '& .MuiInputBase-input': { color: 'grey.100', colorScheme: 'dark' },
    '& label': { color: 'grey.400' },
  };

  if (loading) {
    return (
      <ReusableModal open={true} onClose={onClose} title="Team-Einstellungen">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#00A99D' }} />
        </Box>
      </ReusableModal>
    );
  }

  return (
    <ReusableModal open={true} onClose={onClose} title="Team-Einstellungen">
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: '70vh', overflowY: 'auto', pr: 1 }}>
          <TextField
            label="Beschreibung"
            multiline
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            fullWidth
            sx={darkInputStyle}
            placeholder="Beschreiben Sie Ihr Team..."
          />

          <TextField
            label="Gründungsjahr"
            type="number"
            value={formData.foundedYear}
            onChange={(e) => setFormData({...formData, foundedYear: e.target.value})}
            fullWidth
            sx={darkInputStyle}
            placeholder="z.B. 2020"
          />

          <Box sx={{ borderTop: '1px solid', borderColor: 'grey.800', pt: 2 }}>
            <Typography variant="subtitle1" sx={{ color: 'grey.300', mb: 2, fontFamily: 'comfortaa', fontWeight: 600 }}>
              Kontaktinformationen
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Ansprechpartner"
                value={formData.contactPerson}
                onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                fullWidth
                sx={darkInputStyle}
                placeholder="Name des Ansprechpartners"
              />

              <TextField
                label="E-Mail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                fullWidth
                sx={darkInputStyle}
                placeholder="team@example.com"
              />

              <TextField
                label="Telefon"
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                fullWidth
                sx={darkInputStyle}
                placeholder="+49 123 456789"
              />

              <TextField
                label="Website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({...formData, website: e.target.value})}
                fullWidth
                sx={darkInputStyle}
                placeholder="https://www.team-website.com"
              />
            </Box>
          </Box>

          <Box sx={{ borderTop: '1px solid', borderColor: 'grey.800', pt: 2 }}>
            <Typography variant="subtitle1" sx={{ color: 'grey.300', mb: 2, fontFamily: 'comfortaa', fontWeight: 600 }}>
              Social Media
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Facebook"
                type="url"
                value={formData.socialMedia.facebook}
                onChange={(e) => setFormData({
                  ...formData, 
                  socialMedia: {...formData.socialMedia, facebook: e.target.value}
                })}
                fullWidth
                sx={darkInputStyle}
                placeholder="https://facebook.com/team"
              />
              <TextField
                label="Instagram"
                type="url"
                value={formData.socialMedia.instagram}
                onChange={(e) => setFormData({
                  ...formData, 
                  socialMedia: {...formData.socialMedia, instagram: e.target.value}
                })}
                fullWidth
                sx={darkInputStyle}
                placeholder="https://instagram.com/team"
              />
              <TextField
                label="Twitter"
                type="url"
                value={formData.socialMedia.twitter}
                onChange={(e) => setFormData({
                  ...formData, 
                  socialMedia: {...formData.socialMedia, twitter: e.target.value}
                })}
                fullWidth
                sx={darkInputStyle}
                placeholder="https://twitter.com/team"
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', pt: 2, borderTop: '1px solid', borderColor: 'grey.800' }}>
            <Button
              type="button"
              onClick={onClose}
              variant="outlined"
              sx={{ 
                color: 'grey.400', 
                borderColor: 'grey.700',
                '&:hover': { borderColor: 'grey.500', backgroundColor: 'rgba(255,255,255,0.05)' }
              }}
            >
              Abbrechen
            </Button>
            <Button
              type="submit"
              disabled={saving}
              variant="contained"
              sx={{ 
                backgroundColor: saving ? '#6c757d' : '#00A99D',
                '&:hover': { backgroundColor: saving ? '#6c757d' : '#00897B' }
              }}
            >
              {saving ? 'Speichern...' : 'Speichern'}
            </Button>
          </Box>
        </Box>
      </form>
    </ReusableModal>
  );
};

export default TeamSettings;
