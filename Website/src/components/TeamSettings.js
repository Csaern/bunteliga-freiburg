import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthProvider';

const TeamSettings = ({ onClose }) => {
  const { teamId } = useAuth();
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
      const teamDoc = await getDoc(doc(db, 'teams', teamId));
      if (teamDoc.exists()) {
        const teamData = teamDoc.data();
        setTeam({ id: teamDoc.id, ...teamData });
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
      await updateDoc(doc(db, 'teams', teamId), formData);
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

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '40px',
          borderRadius: '12px',
          textAlign: 'center',
          fontFamily: 'comfortaa'
        }}>
          <div>Lade Team-Daten...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '64px',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      paddingTop: '40px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: 'calc(100vh - 120px)',
        overflowY: 'auto',
        fontFamily: 'comfortaa',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px'
        }}>
           <h2 style={{
             margin: 0,
             color: '#000000',
             fontFamily: 'comfortaa',
             fontSize: '1.8rem'
           }}>
            ⚙️ Team-Einstellungen
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          <div style={{ display: 'grid', gap: '20px', flex: 1, overflowY: 'auto', paddingRight: '10px', minHeight: 0 }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontFamily: 'comfortaa', color: '#000000' }}>
                Beschreibung:
              </label>
               <textarea
                 value={formData.description}
                 onChange={(e) => setFormData({...formData, description: e.target.value})}
                 rows="4"
                 style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontFamily: 'comfortaa', color: '#000000' }}
                 placeholder="Beschreiben Sie Ihr Team..."
               />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontFamily: 'comfortaa', color: '#000000' }}>
                Gründungsjahr:
              </label>
              <input
                type="number"
                value={formData.foundedYear}
                onChange={(e) => setFormData({...formData, foundedYear: e.target.value})}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontFamily: 'comfortaa' }}
                placeholder="z.B. 2020"
              />
            </div>

            <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
               <h3 style={{ fontFamily: 'comfortaa', marginBottom: '15px', color: '#000000' }}>📞 Kontaktinformationen</h3>
              
              <div style={{ display: 'grid', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontFamily: 'comfortaa', color: '#000000' }}>
                    Ansprechpartner:
                  </label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontFamily: 'comfortaa', color: '#000000' }}
                    placeholder="Name des Ansprechpartners"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontFamily: 'comfortaa', color: '#000000' }}>
                    E-Mail:
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({...formData, contactEmail: e.target.value})}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontFamily: 'comfortaa', color: '#000000' }}
                    placeholder="team@example.com"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontFamily: 'comfortaa', color: '#000000' }}>
                    Telefon:
                  </label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontFamily: 'comfortaa', color: '#000000' }}
                    placeholder="+49 123 456789"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontFamily: 'comfortaa', color: '#000000' }}>
                    Website:
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({...formData, website: e.target.value})}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontFamily: 'comfortaa', color: '#000000' }}
                    placeholder="https://www.team-website.com"
                  />
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
               <h3 style={{ fontFamily: 'comfortaa', marginBottom: '15px', color: '#000000' }}>🌐 Social Media</h3>
              <div style={{ display: 'grid', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontFamily: 'comfortaa', color: '#000000' }}>
                    Facebook:
                  </label>
                  <input
                    type="url"
                    value={formData.socialMedia.facebook}
                    onChange={(e) => setFormData({
                      ...formData, 
                      socialMedia: {...formData.socialMedia, facebook: e.target.value}
                    })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontFamily: 'comfortaa', color: '#000000' }}
                    placeholder="https://facebook.com/team"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontFamily: 'comfortaa', color: '#000000' }}>
                    Instagram:
                  </label>
                  <input
                    type="url"
                    value={formData.socialMedia.instagram}
                    onChange={(e) => setFormData({
                      ...formData, 
                      socialMedia: {...formData.socialMedia, instagram: e.target.value}
                    })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontFamily: 'comfortaa', color: '#000000' }}
                    placeholder="https://instagram.com/team"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontFamily: 'comfortaa', color: '#000000' }}>
                    Twitter:
                  </label>
                  <input
                    type="url"
                    value={formData.socialMedia.twitter}
                    onChange={(e) => setFormData({
                      ...formData, 
                      socialMedia: {...formData.socialMedia, twitter: e.target.value}
                    })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontFamily: 'comfortaa', color: '#000000' }}
                    placeholder="https://twitter.com/team"
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #eee', flexShrink: 0 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: 'comfortaa',
                  fontWeight: 'bold'
                }}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '12px 24px',
                  backgroundColor: saving ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'comfortaa',
                  fontWeight: 'bold'
                }}
              >
                {saving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamSettings;
