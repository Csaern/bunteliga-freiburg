import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const PleskLogoManager = ({ team, onLogoUpdated }) => {
  const [logoUrl, setLogoUrl] = useState(team.logoUrl || '');
  const [updating, setUpdating] = useState(false);

  const handleSaveLogo = async () => {
    if (!logoUrl.trim()) {
      alert('Bitte geben Sie eine Logo-URL ein.');
      return;
    }

    try {
      new URL(logoUrl);
    } catch (error) {
      alert('Bitte geben Sie eine gültige URL ein.');
      return;
    }

    setUpdating(true);

    try {
      await updateDoc(doc(db, 'teams', team.id), {
        logoUrl: logoUrl.trim(),
        logoUpdatedAt: new Date(),
        logoSource: 'plesk'
      });

      alert('Logo erfolgreich gespeichert!');
      
      if (onLogoUpdated) {
        onLogoUpdated(team.id, logoUrl.trim());
      }

    } catch (error) {
      console.error('Fehler beim Speichern des Logos:', error);
      alert('Fehler beim Speichern: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm('Sind Sie sicher, dass Sie das Logo entfernen möchten?')) {
      return;
    }

    setUpdating(true);

    try {
      await updateDoc(doc(db, 'teams', team.id), {
        logoUrl: null,
        logoUpdatedAt: new Date(),
        logoSource: null
      });

      setLogoUrl('');
      alert('Logo erfolgreich entfernt!');
      
      if (onLogoUpdated) {
        onLogoUpdated(team.id, null);
      }

    } catch (error) {
      console.error('Fehler beim Entfernen des Logos:', error);
      alert('Fehler beim Entfernen: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <h4 style={{ 
        color: '#333', 
        fontFamily: 'comfortaa',
        marginBottom: '10px'
      }}>
        Logo für {team.name}
      </h4>
      
      {/* Aktuelles Logo anzeigen */}
      {logoUrl && (
        <div style={{ marginBottom: '15px', textAlign: 'center' }}>
          <img 
            src={logoUrl} 
            alt={`${team.name} Logo`}
            style={{
              width: '80px',
              height: '80px',
              objectFit: 'cover',
              borderRadius: '8px',
              border: `3px solid ${team.logoColor || '#00A99D'}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <div style={{ 
            display: 'none',
            width: '80px',
            height: '80px',
            backgroundColor: '#f0f0f0',
            borderRadius: '8px',
            border: '2px dashed #ccc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            color: '#666',
            fontSize: '12px',
            fontFamily: 'comfortaa'
          }}>
            Logo nicht verfügbar
          </div>
          <p style={{ 
            margin: '5px 0 0 0', 
            fontSize: '12px', 
            color: '#666',
            fontFamily: 'comfortaa'
          }}>
            Aktuelles Logo
          </p>
        </div>
      )}

      {/* Logo-URL Eingabe */}
      <div style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '15px',
        backgroundColor: '#f9f9f9'
      }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontFamily: 'comfortaa',
          fontWeight: 'bold',
          color: '#333'
        }}>
          Logo-URL:
        </label>
        
        <input
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://ihre-domain.de/logos/team-logo.png"
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px',
            fontFamily: 'comfortaa',
            marginBottom: '10px',
            boxSizing: 'border-box'
          }}
        />

        <div style={{
          fontSize: '12px',
          color: '#666',
          marginBottom: '15px',
          fontFamily: 'comfortaa'
        }}>
          <strong>Anleitung:</strong><br />
          1. Laden Sie das Logo über Plesk in den Ordner <code>/logos/</code> hoch<br />
          2. Kopieren Sie die URL des hochgeladenen Logos<br />
          3. Fügen Sie die URL hier ein und klicken Sie auf "Speichern"
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleSaveLogo}
            disabled={updating || !logoUrl.trim()}
            style={{
              padding: '8px 16px',
              backgroundColor: updating ? '#ccc' : '#00A99D',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: updating ? 'not-allowed' : 'pointer',
              fontFamily: 'comfortaa',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            {updating ? 'Speichern...' : 'Speichern'}
          </button>

          {logoUrl && (
            <button
              onClick={handleRemoveLogo}
              disabled={updating}
              style={{
                padding: '8px 16px',
                backgroundColor: updating ? '#ccc' : '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: updating ? 'not-allowed' : 'pointer',
                fontFamily: 'comfortaa',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              {updating ? 'Entfernen...' : 'Entfernen'}
            </button>
          )}
        </div>
      </div>

      {/* Beispiel-URLs */}
      <div style={{
        marginTop: '15px',
        padding: '10px',
        backgroundColor: '#e3f2fd',
        borderRadius: '4px',
        border: '1px solid #bbdefb'
      }}>
        <p style={{
          margin: '0 0 8px 0',
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#1976d2',
          fontFamily: 'comfortaa'
        }}>
          Beispiel-URLs:
        </p>
        <div style={{ fontSize: '11px', color: '#666', fontFamily: 'comfortaa' }}>
          <div>• https://ihre-domain.de/logos/{team.name.toLowerCase().replace(/\s+/g, '-')}.png</div>
          <div>• https://ihre-domain.de/logos/team-{team.id}.jpg</div>
          <div>• https://ihre-domain.de/logos/{team.name}.gif</div>
        </div>
      </div>
    </div>
  );
};

export default PleskLogoManager;
