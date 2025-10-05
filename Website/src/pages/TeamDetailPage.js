import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthProvider';

const TeamDetailPage = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamData();
  }, [teamId]);

  const loadTeamData = async () => {
    try {
      const teamDoc = await getDoc(doc(db, 'teams', teamId));
      if (teamDoc.exists()) {
        const teamData = teamDoc.data();
        setTeam({ id: teamDoc.id, ...teamData });
      } else {
        navigate('/teams');
      }
    } catch (error) {
      console.error('Fehler beim Laden der Team-Daten:', error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Lade Team-Daten...</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Team nicht gefunden.</div>
        <button onClick={() => navigate('/teams')}>Zurück zu den Teams</button>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '80vh', 
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.95)',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        marginBottom: '30px',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          marginBottom: '20px'
        }}>
          {/* Team Logo */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: team.logoUrl ? 'transparent' : (team.logoColor || '#00A99D'),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            border: `3px solid ${team.logoColor || '#00A99D'}`
          }}>
            {team.logoUrl ? (
              <img 
                src={team.logoUrl} 
                alt={`${team.name} Logo`}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover' 
                }}
              />
            ) : (
              <span style={{
                color: 'white',
                fontSize: '32px',
                fontWeight: 'bold',
                fontFamily: 'comfortaa'
              }}>
                {team.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div>
            <h1 style={{ 
              margin: 0,
              color: '#00A99D',
              fontFamily: 'comfortaa',
              fontSize: '2.5rem',
              fontWeight: 'bold'
            }}>
              {team.name}
            </h1>
            {team.foundedYear && (
              <p style={{ 
                margin: '5px 0 0 0',
                color: '#666',
                fontFamily: 'comfortaa',
                fontSize: '1.1rem'
              }}>
                Gegründet {team.foundedYear}
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Team Information */}
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.95)',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        marginBottom: '30px'
      }}>
        <h2 style={{ 
          color: '#00A99D',
          fontFamily: 'comfortaa',
          fontSize: '1.8rem',
          marginBottom: '20px'
        }}>
          📋 Team-Informationen
        </h2>

        <div style={{ display: 'grid', gap: '20px' }}>
            {team.description && (
              <div>
                <h3 style={{ fontFamily: 'comfortaa', marginBottom: '10px' }}>Über das Team</h3>
                <p style={{ fontFamily: 'comfortaa', lineHeight: '1.6', color: '#333' }}>
                  {team.description}
                </p>
              </div>
            )}

            <div>
              <h3 style={{ fontFamily: 'comfortaa', marginBottom: '15px' }}>📞 Kontakt</h3>
              <div style={{ display: 'grid', gap: '10px' }}>
                {team.contactPerson && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 'bold', fontFamily: 'comfortaa', minWidth: '120px' }}>Ansprechpartner:</span>
                    <span style={{ fontFamily: 'comfortaa' }}>{team.contactPerson}</span>
                  </div>
                )}
                {team.contactEmail && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 'bold', fontFamily: 'comfortaa', minWidth: '120px' }}>E-Mail:</span>
                    <a href={`mailto:${team.contactEmail}`} style={{ fontFamily: 'comfortaa', color: '#00A99D', textDecoration: 'none' }}>
                      {team.contactEmail}
                    </a>
                  </div>
                )}
                {team.contactPhone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 'bold', fontFamily: 'comfortaa', minWidth: '120px' }}>Telefon:</span>
                    <a href={`tel:${team.contactPhone}`} style={{ fontFamily: 'comfortaa', color: '#00A99D', textDecoration: 'none' }}>
                      {team.contactPhone}
                    </a>
                  </div>
                )}
                {team.website && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 'bold', fontFamily: 'comfortaa', minWidth: '120px' }}>Website:</span>
                    <a href={team.website} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'comfortaa', color: '#00A99D', textDecoration: 'none' }}>
                      {team.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {(team.socialMedia?.facebook || team.socialMedia?.instagram || team.socialMedia?.twitter) && (
              <div>
                <h3 style={{ fontFamily: 'comfortaa', marginBottom: '15px' }}>🌐 Social Media</h3>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  {team.socialMedia.facebook && (
                    <a 
                      href={team.socialMedia.facebook} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        padding: '8px 16px', 
                        backgroundColor: '#1877f2', 
                        color: 'white', 
                        textDecoration: 'none', 
                        borderRadius: '5px',
                        fontFamily: 'comfortaa',
                        fontWeight: 'bold'
                      }}
                    >
                      📘 Facebook
                    </a>
                  )}
                  {team.socialMedia.instagram && (
                    <a 
                      href={team.socialMedia.instagram} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        padding: '8px 16px', 
                        backgroundColor: '#e4405f', 
                        color: 'white', 
                        textDecoration: 'none', 
                        borderRadius: '5px',
                        fontFamily: 'comfortaa',
                        fontWeight: 'bold'
                      }}
                    >
                      📷 Instagram
                    </a>
                  )}
                  {team.socialMedia.twitter && (
                    <a 
                      href={team.socialMedia.twitter} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        padding: '8px 16px', 
                        backgroundColor: '#1da1f2', 
                        color: 'white', 
                        textDecoration: 'none', 
                        borderRadius: '5px',
                        fontFamily: 'comfortaa',
                        fontWeight: 'bold'
                      }}
                    >
                      🐦 Twitter
                    </a>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Back Button */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => navigate('/teams')}
          style={{
            padding: '12px 24px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'comfortaa',
            fontWeight: 'bold',
            fontSize: '16px'
          }}
        >
          ← Zurück zu den Teams
        </button>
      </div>
    </div>
  );
};

export default TeamDetailPage;
