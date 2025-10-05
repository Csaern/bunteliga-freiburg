// src/pages/GameManagementPage.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../context/AuthProvider';

const GameManagementPage = () => {
  const { currentUser, teamId, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [confirmedGames, setConfirmedGames] = useState([]);
  const [teams, setTeams] = useState({});
  const [currentSeason, setCurrentSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingGame, setEditingGame] = useState(null);
  const [editForm, setEditForm] = useState({
    date: '',
    time: '',
    homeTeamId: '',
    awayTeamId: ''
  });

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Nur Teams können Spiele bearbeiten
    if (isAdmin) {
      navigate('/dashboard');
      return;
    }

    loadData();
  }, [currentUser, navigate, isAdmin]);

  const loadData = async () => {
    try {
      // Teams laden
      const teamsSnap = await getDocs(collection(db, 'teams'));
      const teamsData = {};
      teamsSnap.docs.forEach(doc => {
        teamsData[doc.id] = { id: doc.id, ...doc.data() };
      });
      setTeams(teamsData);

      // Aktuelle Saison laden
      const seasonsSnap = await getDocs(collection(db, 'seasons'));
      const seasons = seasonsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const current = seasons.find(s => s.isCurrent === true);
      setCurrentSeason(current);

      if (current && teamId) {
        // Bestätigte Buchungen laden, bei denen das aktuelle Team beteiligt ist
        const bookingsQuery = query(collection(db, 'bookings'), where('seasonId', '==', current.id));
        const bookingsSnap = await getDocs(bookingsQuery);
        const bookings = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(booking => 
            booking.homeTeamId && booking.awayTeamId && 
            !booking.isAvailable &&
            (booking.homeTeamId === teamId || booking.awayTeamId === teamId) &&
            booking.status === 'confirmed'
          );

        setConfirmedGames(bookings);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditGame = (game) => {
    setEditingGame(game);
    setEditForm({
      date: game.date,
      time: game.time,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId
    });
  };

  const handleSaveEdit = async () => {
    if (!editingGame) return;

    try {
      await updateDoc(doc(db, 'bookings', editingGame.id), {
        date: editForm.date,
        time: editForm.time,
        homeTeamId: editForm.homeTeamId,
        awayTeamId: editForm.awayTeamId,
        updatedAt: new Date(),
        lastEditedBy: currentUser.uid
      });
      
      alert('Spiel erfolgreich bearbeitet!');
      setEditingGame(null);
      loadData(); // Daten neu laden
    } catch (error) {
      console.error('Fehler beim Bearbeiten des Spiels:', error);
      alert('Fehler beim Bearbeiten des Spiels!');
    }
  };

  const handleCancelGame = async (gameId) => {
    if (window.confirm('Sind Sie sicher, dass Sie dieses Spiel absagen möchten? Die Buchung wird gelöscht.')) {
      try {
        await updateDoc(doc(db, 'bookings', gameId), {
          homeTeamId: null,
          awayTeamId: null,
          isAvailable: true,
          status: 'cancelled',
          cancelledBy: currentUser.uid,
          cancelledAt: new Date()
        });
        
        alert('Spiel erfolgreich abgesagt!');
        loadData(); // Daten neu laden
      } catch (error) {
        console.error('Fehler beim Absagen des Spiels:', error);
        alert('Fehler beim Absagen des Spiels!');
      }
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Lade Daten...</div>
      </div>
    );
  }

  if (!currentSeason) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Spiel-Verwaltung</h1>
        <p>Keine aktuelle Saison gefunden. Bitte wenden Sie sich an den Administrator.</p>
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
        <h1 style={{ 
          margin: '0 0 10px 0',
          color: '#00A99D',
          fontFamily: 'comfortaa',
          fontSize: '2.5rem',
          fontWeight: 'bold'
        }}>
          ⚽ Spiel-Verwaltung
        </h1>
        <p style={{ 
          margin: 0,
          color: '#666',
          fontFamily: 'comfortaa',
          fontSize: '1.1rem'
        }}>
          Aktuelle Saison: <strong style={{ color: '#00A99D' }}>{currentSeason.name} ({currentSeason.year})</strong>
        </p>
      </div>

      {/* Confirmed Games */}
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.95)',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ 
          color: '#00A99D',
          fontFamily: 'comfortaa',
          fontSize: '1.8rem',
          marginBottom: '20px'
        }}>
          🏆 Bestätigte Spiele
        </h2>

        {confirmedGames.length === 0 ? (
          <div style={{ 
            textAlign: 'center',
            padding: '40px',
            color: '#666',
            fontFamily: 'comfortaa'
          }}>
            <p>Keine bestätigten Spiele gefunden.</p>
            <p>Alle Ihre Spiele sind noch nicht bestätigt oder es gibt keine anstehenden Spiele.</p>
          </div>
        ) : (
          <div>
            {confirmedGames.map(game => (
              <div key={game.id} style={{
                border: '2px solid #e9ecef',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '20px',
                backgroundColor: '#f8f9fa'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '15px'
                }}>
                  <div>
                    <h3 style={{ 
                      margin: '0 0 5px 0',
                      color: '#333',
                      fontFamily: 'comfortaa',
                      fontSize: '1.3rem'
                    }}>
                      {teams[game.homeTeamId]?.name || 'Unbekannt'} vs. {teams[game.awayTeamId]?.name || 'Unbekannt'}
                    </h3>
                    <p style={{ 
                      margin: 0,
                      color: '#666',
                      fontFamily: 'comfortaa',
                      fontSize: '14px'
                    }}>
                      {new Date(game.date).toLocaleDateString('de-DE')} um {game.time}
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
                      fontSize: '14px',
                      color: '#00A99D',
                      fontFamily: 'comfortaa',
                      fontWeight: 'bold'
                    }}>
                      {game.homeTeamId === teamId ? '🏠 Heim' : '✈️ Auswärts'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleCancelGame(game.id)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontFamily: 'comfortaa',
                      fontWeight: 'bold'
                    }}
                  >
                    ❌ Spiel absagen
                  </button>
                  <button
                    onClick={() => handleEditGame(game)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontFamily: 'comfortaa',
                      fontWeight: 'bold'
                    }}
                  >
                    ✏️ Spiel bearbeiten
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingGame && (
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
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            width: '90%',
            maxWidth: '500px'
          }}>
            <h3 style={{ 
              margin: '0 0 20px 0',
              color: '#00A99D',
              fontFamily: 'comfortaa',
              fontSize: '1.5rem'
            }}>
              Spiel bearbeiten
            </h3>

            <div style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontFamily: 'comfortaa' }}>
                  Datum:
                </label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({...editForm, date: e.target.value})}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontFamily: 'comfortaa' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontFamily: 'comfortaa' }}>
                  Uhrzeit:
                </label>
                <input
                  type="time"
                  value={editForm.time}
                  onChange={(e) => setEditForm({...editForm, time: e.target.value})}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontFamily: 'comfortaa' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontFamily: 'comfortaa' }}>
                  Heim-Mannschaft:
                </label>
                <select
                  value={editForm.homeTeamId}
                  onChange={(e) => setEditForm({...editForm, homeTeamId: e.target.value})}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontFamily: 'comfortaa' }}
                >
                  {Object.values(teams).map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold', fontFamily: 'comfortaa' }}>
                  Auswärts-Mannschaft:
                </label>
                <select
                  value={editForm.awayTeamId}
                  onChange={(e) => setEditForm({...editForm, awayTeamId: e.target.value})}
                  style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontFamily: 'comfortaa' }}
                >
                  {Object.values(teams).map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingGame(null)}
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
                onClick={handleSaveEdit}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: 'comfortaa',
                  fontWeight: 'bold'
                }}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back Button */}
      <div style={{ textAlign: 'center', marginTop: '30px' }}>
        <button
          onClick={() => navigate('/dashboard')}
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
          ← Zurück zum Dashboard
        </button>
      </div>
    </div>
  );
};

export default GameManagementPage;
