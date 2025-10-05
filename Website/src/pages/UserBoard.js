import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../context/AuthProvider';

const UserBoard = () => {
  const { currentUser, teamId, role } = useAuth();
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
  }, [currentUser, navigate]);

  useEffect(() => {
    const load = async () => {
      try {
        const teamsSnap = await getDocs(collection(db, 'teams'));
        const map = {};
        teamsSnap.docs.forEach(d => { map[d.id] = d.data().name; });
        setTeamsMap(map);

        if (teamId) {
          const thisName = map[teamId];
          if (thisName) {
            setTeamName(thisName);
          }
        }

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

  if (loading) return <div>Lade Benutzerboard...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Dein Team</h1>
      <h2 style={{ marginTop: 0 }}>{teamName || (role === 'admin' ? 'Administrator' : 'Ohne Team')}</h2>

      {role !== 'admin' && (
        <div style={{ display: 'flex', gap: 10, margin: '10px 0 20px' }}>
          <Link to="/platzreservierung" style={{
            padding: '10px 16px', backgroundColor: '#4caf50', color: '#fff', borderRadius: 6, textDecoration: 'none'
          }}>Platz buchen</Link>
          <Link to="/ergebnisse" style={{
            padding: '10px 16px', backgroundColor: '#2196f3', color: '#fff', borderRadius: 6, textDecoration: 'none'
          }}>Ergebnisdienst</Link>
        </div>
      )}

      <h3>Bevorstehende Spiele</h3>
      {upcoming.length === 0 ? (
        <p style={{ color: '#666' }}>Keine anstehenden Spiele.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {upcoming.map(b => (
            <li key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <span style={{ color: '#000' }}>{new Date(b.date).toLocaleDateString('de-DE')} {b.time}</span>
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
    </div>
  );
};

export default UserBoard;



