// src/pages/ResultConfirmationPage.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../context/AuthProvider';

const ResultConfirmationPage = () => {
  const { currentUser, teamId, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [pendingResults, setPendingResults] = useState([]);
  const [teams, setTeams] = useState({});
  const [currentSeason, setCurrentSeason] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Nur Teams können Ergebnisse bestätigen
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
        // Pending Ergebnisse laden, bei denen das aktuelle Team der Gegner ist
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
      }
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmResult = async (resultId) => {
    try {
      await updateDoc(doc(db, 'results', resultId), {
        status: 'confirmed',
        confirmedBy: currentUser.uid,
        confirmedAt: new Date()
      });
      
      alert('Ergebnis erfolgreich bestätigt!');
      loadData(); // Daten neu laden
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
        loadData(); // Daten neu laden
      } catch (error) {
        console.error('Fehler beim Ablehnen des Ergebnisses:', error);
        alert('Fehler beim Ablehnen des Ergebnisses!');
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
        <h1>Ergebnis-Bestätigung</h1>
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
          📊 Ergebnis-Bestätigung
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

      {/* Pending Results */}
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
          ⏳ Ausstehende Bestätigungen
        </h2>

        {pendingResults.length === 0 ? (
          <div style={{ 
            textAlign: 'center',
            padding: '40px',
            color: '#666',
            fontFamily: 'comfortaa'
          }}>
            <p>Keine ausstehenden Ergebnis-Bestätigungen.</p>
            <p>Alle gemeldeten Ergebnisse wurden bereits bestätigt.</p>
          </div>
        ) : (
          <div>
            {pendingResults.map(result => (
              <div key={result.id} style={{
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
                      {teams[result.homeTeamId]?.name || 'Unbekannt'} vs. {teams[result.awayTeamId]?.name || 'Unbekannt'}
                    </h3>
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
                      color: '#00A99D',
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
                    <strong>Gemeldet von:</strong> {teams[result.homeTeamId === teamId ? result.awayTeamId : result.homeTeamId]?.name || 'Unbekannt'}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleRejectResult(result.id)}
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
                    ❌ Ablehnen
                  </button>
                  <button
                    onClick={() => handleConfirmResult(result.id)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontFamily: 'comfortaa',
                      fontWeight: 'bold'
                    }}
                  >
                    ✅ Bestätigen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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

export default ResultConfirmationPage;
