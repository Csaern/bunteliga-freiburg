// src/pages/DashboardPage.js
import React, { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../context/AuthProvider';
import DynamicLeagueTable from '../components/DynamicLeagueTable';
import DynamicFixtureList from '../components/DynamicFixtureList';
import TeamSettings from '../components/TeamSettings';

const DashboardPage = () => {
  const { currentUser, teamId, role, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState('');
  const [upcoming, setUpcoming] = useState([]);
  const [pendingResults, setPendingResults] = useState([]);
  const [teamsMap, setTeamsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [userLogo, setUserLogo] = useState(null);
  const [showLogoEdit, setShowLogoEdit] = useState(false);
  const [showTeamSettings, setShowTeamSettings] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    // Administratoren automatisch zum Admin-Dashboard weiterleiten
    if (isAdmin) {
      navigate('/admin-dashboard');
      return;
    }
  }, [currentUser, isAdmin, navigate]);

  useEffect(() => {
      const load = async () => {
        try {
          // Teams laden (Map für Name-Auflösung)
          const teamsSnap = await getDocs(collection(db, 'teams'));
          const map = {};
          teamsSnap.docs.forEach(d => { 
            const teamData = d.data();
            map[d.id] = {
              name: teamData.name,
              logoColor: teamData.logoColor || '#666666',
              logoUrl: teamData.logoUrl,
              description: teamData.description,
              foundedYear: teamData.foundedYear
            };
          });
          setTeamsMap(map);

          // Aktuelle Saison laden
          const seasonsSnap = await getDocs(collection(db, 'seasons'));
          const seasons = seasonsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const current = seasons.find(s => s.isCurrent === true);
          setCurrentSeason(current);

        // Teamname
        if (teamId) {
          const thisTeam = map[teamId];
          console.log('Team gefunden:', thisTeam, 'für teamId:', teamId);
          if (thisTeam) {
            setTeamName(thisTeam.name || thisTeam); // Fallback für alte Datenstruktur
          } else {
            console.log('Kein Team gefunden für teamId:', teamId);
            setTeamName('Team nicht gefunden');
          }
        } else {
          console.log('Keine teamId vorhanden');
          setTeamName('Ohne Team');
        }

        // Spiele (pending/confirmed, zukünftig) für dieses Team - nur aktuelle Saison
        const today = new Date();
        let bookingsQuery = collection(db, 'bookings');
        if (current) {
          bookingsQuery = query(collection(db, 'bookings'), where('seasonId', '==', current.id));
        }
        const bookingsSnap = await getDocs(bookingsQuery);
        const list = bookingsSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(b => (b.homeTeamId === teamId || b.awayTeamId === teamId))
          .filter(b => ['pending_away_confirm', 'confirmed'].includes(b.status || (b.isAvailable === false ? 'confirmed' : 'pending_away_confirm')))
          .filter(b => new Date(`${b.date}T${b.time}`) >= today)
          .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
        setUpcoming(list);
        console.log('Upcoming Games gefunden:', list.length, 'für Team:', teamId);

        // Pending Ergebnisse laden, bei denen das aktuelle Team der Gegner ist
        if (current && teamId) {
          const resultsQuery = query(collection(db, 'results'), where('seasonId', '==', current.id));
          const resultsSnap = await getDocs(resultsQuery);
          const results = resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(result => result.status === 'pending')
            .filter(result => {
              // Das aktuelle Team muss der Gegner sein (nicht der, der das Ergebnis gemeldet hat)
              return (result.homeTeamId === teamId || result.awayTeamId === teamId) && 
                     result.reportedBy !== currentUser.uid;
            });
          setPendingResults(results);
          console.log('Pending Results gefunden:', results.length, 'für Team:', teamId);
        }
      } finally {
        setLoading(false);
      }
    };
    if (currentUser) load();
  }, [currentUser, teamId]);

  const handleConfirm = async (bookingId) => {
    await updateDoc(doc(db, 'bookings', bookingId), {
      status: 'confirmed',
      confirmedByUserId: currentUser.uid,
      updatedAt: new Date(),
    });
    window.location.reload();
  };

  const handleDecline = async (bookingId) => {
    await updateDoc(doc(db, 'bookings', bookingId), {
      status: 'cancelled',
      updatedAt: new Date(),
    });
    window.location.reload();
  };

  // Ergebnis-Bestätigung Handler
  const handleConfirmResult = async (resultId) => {
    try {
      await updateDoc(doc(db, 'results', resultId), {
        status: 'confirmed',
        confirmedBy: currentUser.uid,
        confirmedAt: new Date()
      });
      alert('Ergebnis erfolgreich bestätigt!');
      window.location.reload();
    } catch (error) {
      console.error('Fehler beim Bestätigen des Ergebnisses:', error);
      alert('Fehler beim Bestätigen des Ergebnisses!');
    }
  };

  const handleRejectResult = async (resultId) => {
    if (window.confirm('Sind Sie sicher, dass Sie dieses Ergebnis ablehnen möchten? Das Ergebnis wird gelöscht.')) {
      try {
        await updateDoc(doc(db, 'results', resultId), {
          status: 'rejected',
          rejectedBy: currentUser.uid,
          rejectedAt: new Date()
        });
        alert('Ergebnis abgelehnt!');
        window.location.reload();
      } catch (error) {
        console.error('Fehler beim Ablehnen des Ergebnisses:', error);
        alert('Fehler beim Ablehnen des Ergebnisses!');
      }
    }
  };

  const handleEditResult = async (result) => {
    const newHomeScore = prompt('Heim-Tore bearbeiten:', result.homeScore);
    const newAwayScore = prompt('Auswärts-Tore bearbeiten:', result.awayScore);
    
    if (newHomeScore !== null && newAwayScore !== null) {
      try {
        await updateDoc(doc(db, 'results', result.id), {
          homeScore: parseInt(newHomeScore),
          awayScore: parseInt(newAwayScore),
          editedBy: currentUser.uid,
          editedAt: new Date()
        });
        alert('Ergebnis erfolgreich bearbeitet!');
        window.location.reload();
      } catch (error) {
        console.error('Fehler beim Bearbeiten des Ergebnisses:', error);
        alert('Fehler beim Bearbeiten des Ergebnisses!');
      }
    }
  };

  if (loading) return (
    <div>
      <div style={{ padding: '20px', textAlign: 'center' }}>Lade Dashboard...</div>
    </div>
  );

  return (
    <div style={{ 
      minHeight: '80vh', 
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      {/* Header Container */}
      <div style={{
        textAlign: 'center',
        marginBottom: '40px',
        padding: '30px',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        color: '#000000'
      }}>
        <h1 style={{ 
          margin: '0 0 20px 0',
          color: '#00A99D',
          fontFamily: 'comfortaa',
          fontSize: '2.5rem',
          fontWeight: 'bold'
        }}>
          Teamboard
        </h1>
        
        {/* Benutzer-Info mit Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '15px'
        }}>
          {/* Benutzer-Logo */}
          <div 
            style={{
              position: 'relative',
              cursor: 'pointer'
            }}
            onMouseEnter={() => setShowLogoEdit(true)}
            onMouseLeave={() => setShowLogoEdit(false)}
          >
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: userLogo ? 'transparent' : '#00A99D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: '3px solid #00A99D',
              transition: 'transform 0.2s ease'
            }}>
              {userLogo ? (
                <img 
                  src={userLogo} 
                  alt="User Logo" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover' 
                  }} 
                />
              ) : (
                <span style={{
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  fontFamily: 'comfortaa'
                }}>
                  {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </div>
            
            {/* Hover-Bearbeitung */}
            {showLogoEdit && (
              <div style={{
                position: 'absolute',
                bottom: '-5px',
                right: '-5px',
                backgroundColor: '#007bff',
                color: 'white',
                borderRadius: '50%',
                width: '25px',
                height: '25px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}>
                ✏️
              </div>
            )}
            
            {/* Versteckter File Input */}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    setUserLogo(event.target.result);
                  };
                  reader.readAsDataURL(file);
                }
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer'
              }}
            />
          </div>

          <h2 style={{ 
            margin: 0,
            color: '#333',
            fontFamily: 'comfortaa',
            fontSize: '1.5rem',
            fontWeight: 'normal'
          }}>
            {teamName || (role === 'admin' ? 'Administrator' : 'Ohne Team')}
          </h2>
          
          {/* Debug Info */}
          <div style={{ 
            fontSize: '12px', 
            color: '#666', 
            marginTop: '10px',
            fontFamily: 'comfortaa'
          }}>
          </div>
        </div>
      </div>

      {/* Action Buttons Container */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        marginBottom: '40px',
        flexWrap: 'wrap'
      }}>
        {/* Admin-Verwaltung Button */}
        {isAdmin && (
          <Link to="/admin" style={{
            padding: '15px 30px',
            backgroundColor: '#9C27B0',
            color: '#fff',
            borderRadius: '10px',
            textDecoration: 'none',
            fontFamily: 'comfortaa',
            fontWeight: 'bold',
            fontSize: '16px',
            boxShadow: '0 4px 15px rgba(156,39,176,0.3)',
            transition: 'transform 0.2s ease'
          }}>
            🔧 Verwaltung
          </Link>
        )}

        {role !== 'admin' && (
          <>
            <Link to="/platzreservierung" style={{
              padding: '15px 30px',
              backgroundColor: '#4caf50',
              color: '#fff',
              borderRadius: '10px',
              textDecoration: 'none',
              fontFamily: 'comfortaa',
              fontWeight: 'bold',
              fontSize: '16px',
              boxShadow: '0 4px 15px rgba(76,175,80,0.3)',
              transition: 'transform 0.2s ease'
            }}>
              ⚽ Platz buchen
            </Link>
            <Link to="/ergebnis-melden" style={{
              padding: '15px 30px',
              backgroundColor: '#2196f3',
              color: '#fff',
              borderRadius: '10px',
              textDecoration: 'none',
              fontFamily: 'comfortaa',
              fontWeight: 'bold',
              fontSize: '16px',
              boxShadow: '0 4px 15px rgba(33,150,243,0.3)',
              transition: 'transform 0.2s ease'
            }}>
              📊 Ergebnis melden
            </Link>
          </>
        )}

        {/* Team-Einstellungen Button */}
        {teamId && (
          <button
            onClick={() => setShowTeamSettings(true)}
            style={{
              padding: '15px 30px',
              backgroundColor: '#00A99D',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontFamily: 'comfortaa',
              fontWeight: 'bold',
              fontSize: '16px',
              boxShadow: '0 4px 15px rgba(0,169,157,0.3)',
              transition: 'transform 0.2s ease',
              cursor: 'pointer'
            }}
          >
            ⚙️ Team-Einstellungen
          </button>
        )}

      </div>

      {/* Anfragen Container - Kombiniert Spiel- und Ergebnisbestätigungen */}
      {(pendingResults.length > 0 || upcoming.some(b => b.status === 'pending_away_confirm' && b.awayTeamId === teamId)) && (
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.95)',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          marginBottom: '30px',
          color: '#000000'
        }}>
          <h3 style={{ 
            textAlign: 'center',
            marginBottom: '20px',
            color: '#ff9800',
            fontFamily: 'comfortaa',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}>
            📋 Ausstehende Anfragen
          </h3>
          
          <div>
            {/* Ergebnis-Bestätigungen */}
            {pendingResults.map(result => (
              <div key={`result-${result.id}`} style={{
                border: '2px solid #ff9800',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '15px',
                backgroundColor: '#fff8e1'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '15px'
                }}>
                  <div>
                    <h4 style={{ 
                      margin: '0 0 5px 0',
                      color: '#333',
                      fontFamily: 'comfortaa',
                      fontSize: '1.2rem'
                    }}>
                      🏆 {teamsMap[result.homeTeamId]?.name || 'Unbekannt'} vs. {teamsMap[result.awayTeamId]?.name || 'Unbekannt'}
                    </h4>
                    <p style={{ 
                      margin: 0,
                      color: '#666',
                      fontFamily: 'comfortaa',
                      fontSize: '14px'
                    }}>
                      {new Date(result.date).toLocaleDateString('de-DE')} um {result.time}
                    </p>
                  </div>
                  <div style={{
                    textAlign: 'center',
                    backgroundColor: '#fff',
                    padding: '10px 15px',
                    borderRadius: '8px',
                    border: '1px solid #ddd'
                  }}>
                    <div style={{ 
                      fontSize: '24px',
                      fontWeight: 'bold',
                      color: '#ff9800',
                      fontFamily: 'comfortaa'
                    }}>
                      {result.homeScore} : {result.awayScore}
                    </div>
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffeaa7',
                  borderRadius: '5px',
                  padding: '10px',
                  marginBottom: '15px'
                }}>
                  <p style={{ 
                    margin: 0,
                    fontSize: '14px',
                    color: '#856404',
                    fontFamily: 'comfortaa'
                  }}>
                    <strong>Ergebnis gemeldet von:</strong> {teamsMap[result.homeTeamId === teamId ? result.awayTeamId : result.homeTeamId]?.name || 'Unbekannt'}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleEditResult(result)}
                    style={{
                      padding: '8px 15px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontFamily: 'comfortaa',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}
                  >
                    ✏️ Korrigieren
                  </button>
                  <button
                    onClick={() => handleRejectResult(result.id)}
                    style={{
                      padding: '8px 15px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontFamily: 'comfortaa',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}
                  >
                    ❌ Ablehnen
                  </button>
                  <button
                    onClick={() => handleConfirmResult(result.id)}
                    style={{
                      padding: '8px 15px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontFamily: 'comfortaa',
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}
                  >
                    ✅ Bestätigen
                  </button>
                </div>
              </div>
            ))}

            {/* Spiel-Bestätigungen */}
            {upcoming
              .filter(b => b.status === 'pending_away_confirm' && b.awayTeamId === teamId)
              .map(booking => (
                <div key={`booking-${booking.id}`} style={{
                  border: '2px solid #007bff',
                  borderRadius: '10px',
                  padding: '20px',
                  marginBottom: '15px',
                  backgroundColor: '#e3f2fd'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '15px'
                  }}>
                    <div>
                      <h4 style={{ 
                        margin: '0 0 5px 0',
                        color: '#333',
                        fontFamily: 'comfortaa',
                        fontSize: '1.2rem'
                      }}>
                        ⚽ {teamsMap[booking.homeTeamId]?.name || 'Unbekannt'} vs. {teamsMap[booking.awayTeamId]?.name || 'Unbekannt'}
                      </h4>
                      <p style={{ 
                        margin: 0,
                        color: '#666',
                        fontFamily: 'comfortaa',
                        fontSize: '14px'
                      }}>
                        {new Date(booking.date).toLocaleDateString('de-DE')} um {booking.time}
                      </p>
                    </div>
                    <div style={{
                      textAlign: 'center',
                      backgroundColor: '#fff',
                      padding: '10px 15px',
                      borderRadius: '8px',
                      border: '1px solid #ddd'
                    }}>
                      <div style={{ 
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: '#007bff',
                        fontFamily: 'comfortaa'
                      }}>
                        Spielanfrage
                      </div>
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#e1f5fe',
                    border: '1px solid #81d4fa',
                    borderRadius: '5px',
                    padding: '10px',
                    marginBottom: '15px'
                  }}>
                    <p style={{ 
                      margin: 0,
                      fontSize: '14px',
                      color: '#01579b',
                      fontFamily: 'comfortaa'
                    }}>
                      <strong>Spielanfrage von:</strong> {teamsMap[booking.homeTeamId]?.name || 'Unbekannt'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleDecline(booking.id)}
                      style={{
                        padding: '8px 15px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontFamily: 'comfortaa',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}
                    >
                      ❌ Ablehnen
                    </button>
                    <button
                      onClick={() => handleConfirm(booking.id)}
                      style={{
                        padding: '8px 15px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontFamily: 'comfortaa',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}
                    >
                      ✅ Bestätigen
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}


        {/* Bevorstehende Spiele Container */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.95)',
          padding: '30px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          marginBottom: '30px',
          color: '#000000'
        }}>
          <h3 style={{ 
            textAlign: 'center',
            marginBottom: '20px',
            color: '#00A99D',
            fontFamily: 'comfortaa',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}>
            🏆 Bevorstehende Spiele
          </h3>
          
          {upcoming.length === 0 ? (
            <p style={{ 
              textAlign: 'center',
              color: '#666',
              fontFamily: 'comfortaa',
              fontSize: '16px'
            }}>
              Keine anstehenden Spiele.
            </p>
          ) : (
            <div>
              {upcoming.map(b => (
                <div key={b.id} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '15px', 
                  borderBottom: b === upcoming[upcoming.length - 1] ? 'none' : '1px solid #eee',
                  borderRadius: '8px',
                  marginBottom: '10px',
                  backgroundColor: '#f8f9fa'
                }}>
                  <div style={{ 
                    color: '#00A99D',
                    fontWeight: 'bold',
                    fontFamily: 'comfortaa',
                    minWidth: '140px'
                  }}>
                    {new Date(b.date).toLocaleDateString('de-DE')} {b.time}
                  </div>
                  <div style={{ 
                    flex: 1, 
                    marginLeft: 15,
                    fontFamily: 'comfortaa'
                  }}>
                    {b.homeTeamId === teamId ? <strong>🏠 Heim</strong> : <strong>✈️ Auswärts</strong>} – {teamsMap[b.homeTeamId]?.name || teamsMap[b.homeTeamId] || b.homeTeamId} vs. {teamsMap[b.awayTeamId]?.name || teamsMap[b.awayTeamId] || b.awayTeamId}
                  </div>
                  {b.status === 'pending_away_confirm' && b.awayTeamId === teamId && (
                    <div style={{ 
                      padding: '5px 10px',
                      backgroundColor: '#ff9800',
                      color: 'white',
                      borderRadius: '5px',
                      fontSize: '12px',
                      fontFamily: 'comfortaa',
                      fontWeight: 'bold'
                    }}>
                      ⏳ Wartet auf Bestätigung
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Aktuelle Tabelle Container */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.95)',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <DynamicLeagueTable 
            title="📊 Aktuelle Tabelle" 
            form={false} 
            seasonId={currentSeason?.id}
            userTeamId={teamId}
          />
        </div>

        {/* Vergangene Spiele Container */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.95)',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
          <DynamicFixtureList 
            title="📈 Vergangene Spiele" 
            details={false}
            seasonId={currentSeason?.id}
            showType="results"
            userTeamId={teamId}
          />
        </div>

        {/* Team Settings Modal */}
        {showTeamSettings && (
          <TeamSettings onClose={() => setShowTeamSettings(false)} />
        )}
    </div>
  );
};

export default DashboardPage;
