// src/pages/DashboardPage.js
import React, { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../context/AuthProvider';

const DashboardPage = () => {
  const { currentUser, teamId, role, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState('');
  const [upcoming, setUpcoming] = useState([]);
  const [teamsMap, setTeamsMap] = useState({});
  const [loading, setLoading] = useState(true);

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
        teamsSnap.docs.forEach(d => { map[d.id] = d.data().name; });
        setTeamsMap(map);

        // Teamname
        if (teamId) {
          const thisName = map[teamId];
          if (thisName) {
            setTeamName(thisName);
          }
        }

        // Spiele (pending/confirmed, zukünftig) für dieses Team
        const today = new Date();
        const bookingsSnap = await getDocs(collection(db, 'bookings'));
        const list = bookingsSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(b => (b.homeTeamId === teamId || b.awayTeamId === teamId))
          .filter(b => ['pending_away_confirm', 'confirmed'].includes(b.status || (b.isAvailable === false ? 'confirmed' : 'pending_away_confirm')))
          .filter(b => new Date(`${b.date}T${b.time}`) >= today)
          .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
        setUpcoming(list);
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

  if (loading) return (
    <div>
      <div style={{ padding: '20px', textAlign: 'center' }}>Lade Dashboard...</div>
    </div>
  );

  return (
    <div>
      <main style={{ minHeight: '80vh', padding: '20px' }}>
        <h1>Dashboard</h1>
        <h2 style={{ marginTop: 0 }}>{teamName || (role === 'admin' ? 'Administrator' : 'Ohne Team')}</h2>

        {/* Admin-Verwaltung Button */}
        {isAdmin && (
          <div style={{ marginBottom: '20px' }}>
            <Link to="/admin" style={{
              padding: '10px 16px', 
              backgroundColor: '#9C27B0', 
              color: '#fff', 
              borderRadius: 6, 
              textDecoration: 'none',
              display: 'inline-block'
            }}>
              Verwaltung
            </Link>
          </div>
        )}

        {/* Team-spezifische Buttons */}
        {role !== 'admin' && (
          <div style={{ display: 'flex', gap: 10, margin: '10px 0 20px', flexWrap: 'wrap' }}>
            <Link to="/platzreservierung" style={{
              padding: '10px 16px', 
              backgroundColor: '#4caf50', 
              color: '#fff', 
              borderRadius: 6, 
              textDecoration: 'none'
            }}>
              Platz buchen
            </Link>
            <Link to="/ergebnis-melden" style={{
              padding: '10px 16px', 
              backgroundColor: '#2196f3', 
              color: '#fff', 
              borderRadius: 6, 
              textDecoration: 'none'
            }}>
              Ergebnis melden
            </Link>
          </div>
        )}

        <h3>Bevorstehende Spiele</h3>
        {upcoming.length === 0 ? (
          <p style={{ color: '#666' }}>Keine anstehenden Spiele.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {upcoming.map(b => (
              <li key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <span style={{ color: '#666' }}>{new Date(b.date).toLocaleDateString('de-DE')} {b.time}</span>
                <span style={{ flex: 1, marginLeft: 12 }}>
                  {b.homeTeamId === teamId ? <strong>Heim</strong> : <strong>Auswärts</strong>} – {teamsMap[b.homeTeamId] || b.homeTeamId} vs. {teamsMap[b.awayTeamId] || b.awayTeamId}
                </span>
                {b.status === 'pending_away_confirm' && b.awayTeamId === teamId && (
                  <span style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleConfirm(b.id)} style={{ padding: '6px 10px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Bestätigen</button>
                    <button onClick={() => handleDecline(b.id)} style={{ padding: '6px 10px', background: '#e53935', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Ablehnen</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
