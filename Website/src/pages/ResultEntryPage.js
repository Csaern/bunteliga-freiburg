// src/pages/ResultEntryPage.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../context/AuthProvider';

const ResultEntryPage = () => {
  const { currentUser, teamId, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [resultForm, setResultForm] = useState({
    homeTeamId: '',
    awayTeamId: '',
    homeScore: '',
    awayScore: '',
    date: '',
    time: '',
    seasonId: ''
  });

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Nur Teams können Ergebnisse melden
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
      setTeams(teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Aktuelle Saison laden
      const seasonsSnap = await getDocs(collection(db, 'seasons'));
      const seasons = seasonsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const current = seasons.find(s => s.isCurrent === true);
      setCurrentSeason(current);

      if (current) {
        setResultForm(prev => ({ ...prev, seasonId: current.id }));
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

    if (resultForm.homeTeamId === resultForm.awayTeamId) {
      alert('Heim- und Auswärtsmannschaft müssen unterschiedlich sein!');
      return;
    }

    if (!resultForm.homeScore || !resultForm.awayScore) {
      alert('Bitte geben Sie beide Ergebnisse ein!');
      return;
    }

    // Prüfen, ob das Team an dem Spiel beteiligt ist
    if (resultForm.homeTeamId !== teamId && resultForm.awayTeamId !== teamId) {
      alert('Sie können nur Ergebnisse für Spiele Ihres Teams melden!');
      return;
    }

    setSubmitting(true);

    try {
      // Ergebnis in die Datenbank speichern
      await addDoc(collection(db, 'results'), {
        homeTeamId: resultForm.homeTeamId,
        awayTeamId: resultForm.awayTeamId,
        homeScore: parseInt(resultForm.homeScore),
        awayScore: parseInt(resultForm.awayScore),
        date: resultForm.date,
        time: resultForm.time,
        seasonId: resultForm.seasonId,
        reportedBy: currentUser.uid,
        reportedAt: new Date(),
        status: 'pending' // Wird vom Admin bestätigt
      });

      alert('Ergebnis erfolgreich gemeldet! Es wird vom Administrator überprüft.');
      
      // Formular zurücksetzen
      setResultForm({
        homeTeamId: '',
        awayTeamId: '',
        homeScore: '',
        awayScore: '',
        date: '',
        time: '',
        seasonId: resultForm.seasonId
      });
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
    <div>
      <main style={{ minHeight: '80vh', padding: '20px' }}>
        <h1>Ergebnis melden</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Aktuelle Saison: <strong>{currentSeason.name} ({currentSeason.year})</strong>
        </p>

        <div style={{ 
          border: '1px solid #ccc', 
          padding: '20px', 
          borderRadius: '5px',
          backgroundColor: '#f9f9f9',
          maxWidth: '600px',
          color: '#000000'
        }}>
          <h3>Spielergebnis eintragen</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Heim-Mannschaft:
              </label>
              <select
                value={resultForm.homeTeamId}
                onChange={(e) => setResultForm({...resultForm, homeTeamId: e.target.value})}
                required
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="">Mannschaft auswählen</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Auswärts-Mannschaft:
              </label>
              <select
                value={resultForm.awayTeamId}
                onChange={(e) => setResultForm({...resultForm, awayTeamId: e.target.value})}
                required
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              >
                <option value="">Mannschaft auswählen</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Heim-Tore:
                </label>
                <input
                  type="number"
                  min="0"
                  value={resultForm.homeScore}
                  onChange={(e) => setResultForm({...resultForm, homeScore: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Auswärts-Tore:
                </label>
                <input
                  type="number"
                  min="0"
                  value={resultForm.awayScore}
                  onChange={(e) => setResultForm({...resultForm, awayScore: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Datum:
                </label>
                <input
                  type="date"
                  value={resultForm.date}
                  onChange={(e) => setResultForm({...resultForm, date: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                  Uhrzeit:
                </label>
                <input
                  type="time"
                  value={resultForm.time}
                  onChange={(e) => setResultForm({...resultForm, time: e.target.value})}
                  required
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px' }}>
              <strong>Hinweis:</strong> Sie können nur Ergebnisse für Spiele Ihres Teams melden. 
              Das Ergebnis wird vom Administrator überprüft, bevor es in der Tabelle angezeigt wird.
            </div>

            <div>
              <button 
                type="submit"
                disabled={submitting}
                style={{ 
                  padding: '10px 20px', 
                  backgroundColor: submitting ? '#6c757d' : '#28a745', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '5px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
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
      </main>
    </div>
  );
};

export default ResultEntryPage;
