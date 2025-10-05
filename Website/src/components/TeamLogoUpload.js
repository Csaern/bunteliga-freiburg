import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '../firebase';

const TeamLogoUpload = ({ team, onLogoUpdated }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Bitte wählen Sie eine Bilddatei aus.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Die Datei ist zu groß. Maximale Größe: 5MB');
      return;
    }

    setUploading(true);

    try {
      const timestamp = Date.now();
      const fileName = `${team.id}_${timestamp}.${file.name.split('.').pop()}`;
      const storageRef = ref(storage, `team-logos/${fileName}`);

      console.log('Uploading file:', fileName);
      const snapshot = await uploadBytes(storageRef, file);
      
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('File uploaded successfully. URL:', downloadURL);

      await updateDoc(doc(db, 'teams', team.id), {
        logoUrl: downloadURL,
        logoUpdatedAt: new Date()
      });

      alert('Logo erfolgreich hochgeladen!');
      
      if (onLogoUpdated) {
        onLogoUpdated(team.id, downloadURL);
      }

    } catch (error) {
      console.error('Fehler beim Upload:', error);
      alert('Fehler beim Hochladen: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
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
      {team.logoUrl && (
        <div style={{ marginBottom: '15px', textAlign: 'center' }}>
          <img 
            src={team.logoUrl} 
            alt={`${team.name} Logo`}
            style={{
              width: '80px',
              height: '80px',
              objectFit: 'cover',
              borderRadius: '8px',
              border: `3px solid ${team.logoColor || '#00A99D'}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          />
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

      {/* Upload-Bereich */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{
          border: `2px dashed ${dragOver ? '#00A99D' : '#ddd'}`,
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: dragOver ? 'rgba(0,169,157,0.1)' : '#f9f9f9',
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          position: 'relative'
        }}
      >
        {uploading ? (
          <div>
            <div style={{
              width: '30px',
              height: '30px',
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #00A99D',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 10px'
            }}></div>
            <p style={{ 
              margin: 0, 
              color: '#00A99D',
              fontFamily: 'comfortaa',
              fontWeight: 'bold'
            }}>
              Wird hochgeladen...
            </p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📁</div>
            <p style={{ 
              margin: '0 0 10px 0', 
              fontFamily: 'comfortaa',
              fontWeight: 'bold',
              color: '#333'
            }}>
              Logo hier ablegen oder klicken zum Auswählen
            </p>
            <p style={{ 
              margin: 0, 
              fontSize: '12px', 
              color: '#666',
              fontFamily: 'comfortaa'
            }}>
              Unterstützte Formate: JPG, PNG, GIF (max. 5MB)
            </p>
          </div>
        )}

        {/* Versteckter File Input */}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={uploading}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: uploading ? 'not-allowed' : 'pointer'
          }}
        />
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TeamLogoUpload;
