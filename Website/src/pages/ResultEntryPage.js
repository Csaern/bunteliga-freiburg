import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../context/AuthProvider';

const ResultEntryPage = () => {
  const { currentUser, teamId, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [availableGames, setAvailableGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [resultForm, setResultForm] = useState({
    gameId: '',
    homeScore: '',
    awayScore: '',
    seasonId: ''
  });

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (isAdmin) {
      navigate('/dashboard');
      return;
    }

    loadData();
  }, [currentUser, navigate, isAdmin]);

  const loadData = async () => {
    try {
      const teamsSnap = await getDocs(collection(db, 'teams'));
      const teamsData = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeams(teamsData);

      const seasonsSnap = await getDocs(collection(db, 'seasons'));
      const seasons = seasonsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const current = seasons.find(s => s.isCurrent === true);
      setCurrentSeason(current);

      if (current && teamId) {
        setResultForm(prev => ({ ...prev, seasonId: current.id }));
        
        const bookingsQuery = query(collection(db, 'bookings'), where('seasonId', '==', current.id));
        const bookingsSnap = await getDocs(bookingsQuery);
        const bookings = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(booking => 
            booking.homeTeamId && booking.awayTeamId && 
            !booking.isAvailable &&
            (booking.homeTeamId === teamId || booking.awayTeamId === teamId)
          );

        const resultsSnap = await getDocs(collection(db, 'results'));
        const results = resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const availableGames = bookings.filter(booking => {

          return !results.some(result => 
            result.homeTeamId === booking.homeTeamId &&
            result.awayTeamId === booking.awayTeamId &&
            result.date === booking.date &&
            result.time === booking.time
          );
        }).map(booking => ({
          ...booking,
          homeTeamName: teamsData.find(t => t.id === booking.homeTeamId)?.name || 'Unbekannt',
          awayTeamName: teamsData.find(t => t.id === booking.awayTeamId)?.name || 'Unbekannt'
        }));

        setAvailableGames(availableGames);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentSeason) {
      alert('Keine aktuelle Saison gefunden!');
      return;
    }

    if (!resultForm.gameId) {
      alert('Bitte wählen Sie ein Spiel aus!');
      return;
    }

    if (!resultForm.homeScore || !resultForm.awayScore) {
      alert('Bitte geben Sie beide Ergebnisse ein!');
      return;
    }

    const selectedGame = availableGames.find(game => game.id === resultForm.gameId);
    if (!selectedGame) {
      alert('Ausgewähltes Spiel nicht gefunden!');
      return;
    }

    setSubmitting(true);

    try {
      await addDoc(collection(db, 'results'), {
        homeTeamId: selectedGame.homeTeamId,
        awayTeamId: selectedGame.awayTeamId,
        homeScore: parseInt(resultForm.homeScore),
        awayScore: parseInt(resultForm.awayScore),
        date: selectedGame.date,
        time: selectedGame.time,
        seasonId: resultForm.seasonId,
        reportedBy: currentUser.uid,
        reportedAt: new Date(),
        status: 'pending'
      });

      alert('Ergebnis erfolgreich gemeldet! Es wird vom Administrator überprüft.');
      
      setResultForm({
        gameId: '',
        homeScore: '',
        awayScore: '',
        seasonId: resultForm.seasonId
      });
      loadData();
    } catch (error) {
      console.error('Fehler beim Speichern des Ergebnisses:', error);
      alert('Fehler beim Speichern des Ergebnisses!');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div style={{ padding: '20px', textAlign: 'center' }}>Lade...</div>
      </div>
    );
  }

  if (!currentSeason) {
    return (
      <div>
        <main style={{ minHeight: '80vh', padding: '20px' }}>
          <h1>Ergebnis melden</h1>
          <p>Keine aktuelle Saison gefunden. Bitte wenden Sie sich an den Administrator.</p>
        </main>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '80vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '20px',
      background: 'linear-gradient(135deg, rgba(0,169,157,0.1) 0%, rgba(0,0,0,0.8) 100%)'
    }}>
      <div style={{
        backgroundColor: 'rgba(255,255,255,0.95)',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        width: '100%',
        maxWidth: '600px',
        color: '#000000'
      }}>
        <h1 style={{ 
          textAlign: 'center', 
          marginBottom: '10px',
          color: '#00A99D',
          fontFamily: 'comfortaa',
          fontSize: '2rem',
          fontWeight: 'bold'
        }}>
          Ergebnis melden
        </h1>
        
        <p style={{ 
          textAlign: 'center',
          color: '#666', 
          marginBottom: '30px',
          fontFamily: 'comfortaa',
          fontSize: '16px'
        }}>
          Aktuelle Saison: <strong style={{ color: '#00A99D' }}>{currentSeason.name} ({currentSeason.year})</strong>
        </p>

        <div style={{ 
          border: '2px solid #e9ecef', 
          padding: '30px', 
          borderRadius: '10px',
          backgroundColor: '#f8f9fa',
          color: '#000000'
        }}>
          <h3 style={{ 
            textAlign: 'center',
            marginBottom: '25px',
            color: '#333',
            fontFamily: 'comfortaa',
            fontSize: '1.3rem'
          }}>
            Spielergebnis eintragen
          </h3>
          
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: 'bold',
                color: '#333',
                fontFamily: 'comfortaa'
              }}>
                Verfügbares Spiel auswählen:
              </label>
              <select
                value={resultForm.gameId}
                onChange={(e) => setResultForm({...resultForm, gameId: e.target.value})}
                required
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: 'comfortaa',
                  backgroundColor: '#fff'
                }}
              >
                <option value="">Spiel auswählen</option>
                {availableGames.map(game => (
                  <option key={game.id} value={game.id}>
                    {new Date(game.date).toLocaleDateString('de-DE')} {game.time} - {game.homeTeamName} vs. {game.awayTeamName}
                  </option>
                ))}
              </select>
            </div>

            {resultForm.gameId && (
              <div style={{ 
                marginBottom: '20px', 
                padding: '15px', 
                backgroundColor: '#e9ecef', 
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#333', fontFamily: 'comfortaa' }}>
                  Spiel-Details:
                </h4>
                {(() => {
                  const selectedGame = availableGames.find(game => game.id === resultForm.gameId);
                  return selectedGame ? (
                    <div style={{ color: '#666', fontFamily: 'comfortaa' }}>
                      <p><strong>Datum:</strong> {new Date(selectedGame.date).toLocaleDateString('de-DE')}</p>
                      <p><strong>Uhrzeit:</strong> {selectedGame.time}</p>
                      <p><strong>Heim:</strong> {selectedGame.homeTeamName}</p>
                      <p><strong>Auswärts:</strong> {selectedGame.awayTeamName}</p>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold',
                  color: '#333',
                  fontFamily: 'comfortaa'
                }}>
                  Heim-Tore:
                </label>
                <input
                  type="number"
                  min="0"
                  value={resultForm.homeScore}
                  onChange={(e) => setResultForm({...resultForm, homeScore: e.target.value})}
                  required
                  style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: 'comfortaa',
                  backgroundColor: '#fff'
                }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: 'bold',
                  color: '#333',
                  fontFamily: 'comfortaa'
                }}>
                  Auswärts-Tore:
                </label>
                <input
                  type="number"
                  min="0"
                  value={resultForm.awayScore}
                  onChange={(e) => setResultForm({...resultForm, awayScore: e.target.value})}
                  required
                  style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: 'comfortaa',
                  backgroundColor: '#fff'
                }}
                />
              </div>
            </div>


            {availableGames.length === 0 ? (
              <div style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '4px' }}>
                <strong>Keine Spiele verfügbar:</strong> Es gibt derzeit keine Spiele, für die Sie ein Ergebnis melden können. 
                Alle Spiele Ihres Teams haben bereits ein Ergebnis oder sind noch nicht bestätigt.
              </div>
            ) : (
              <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px' }}>
                <strong>Hinweis:</strong> Sie können nur Ergebnisse für Spiele Ihres Teams melden. 
                Das Ergebnis wird vom Administrator überprüft, bevor es in der Tabelle angezeigt wird.
              </div>
            )}

            <div>
              <button 
                type="submit"
                disabled={submitting || availableGames.length === 0}
                style={{ 
                  padding: '10px 20px', 
                  backgroundColor: (submitting || availableGames.length === 0) ? '#6c757d' : '#28a745', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '5px',
                  cursor: (submitting || availableGames.length === 0) ? 'not-allowed' : 'pointer',
                  marginRight: '10px'
                }}
              >
                {submitting ? 'Wird gespeichert...' : 'Ergebnis melden'}
              </button>
              <button 
                type="button"
                onClick={() => navigate('/dashboard')}
                style={{ 
                  padding: '10px 20px', 
                  backgroundColor: '#6c757d', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Zurück zum Dashboard
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResultEntryPage;
