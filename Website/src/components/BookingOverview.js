// src/components/BookingOverview.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useAuth } from '../context/AuthProvider';

const BookingOverview = () => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const { currentUser, teamId, role } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
      // Abrufen aller Daten
        const [pitchesSnap, teamsSnap, bookingsSnap] = await Promise.all([
        getDocs(collection(db, "pitches")),
        getDocs(collection(db, "teams")),
        getDocs(collection(db, "bookings")),
      ]);

        const pitches = pitchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const teams = teamsSnap.docs.reduce((acc, doc) => ({ ...acc, [doc.id]: doc.data().name }), {});
      const bookings = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Gruppieren der Buchungen nach Datum und dann nach Platz
      const groupedBookings = {};
      bookings.forEach(booking => {
          if (!groupedBookings[booking.date]) {
            groupedBookings[booking.date] = {};
        }
          if (!groupedBookings[booking.date][booking.pitchId]) {
            groupedBookings[booking.date][booking.pitchId] = [];
        }
          groupedBookings[booking.date][booking.pitchId].push(booking);
      });
      
        setData({ pitches, teams, groupedBookings });
        setLoading(false);
      } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
      setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleBookNow = (date, pitchId, time) => {
    setSelectedSlot({ date, pitchId, time });
  };
  
  const submitBooking = async (e) => {
    e.preventDefault();
    // Nur eingeloggte Team-User dürfen buchen
    if (!currentUser || !teamId) {
      alert("Bitte melden Sie sich mit einem Team-Account an, um zu buchen.");
      return;
    }
    
    try {
      // Prüfe, ob bereits eine Buchung für diesen Slot existiert
      const existingBookings = data.groupedBookings[selectedSlot.date]?.[selectedSlot.pitchId] || [];
      const existingBooking = existingBookings.find(booking => booking.time === selectedSlot.time);
      
      if (existingBooking) {
        // Update existing booking
        await updateDoc(doc(db, "bookings", existingBooking.id), {
          homeTeamId: teamId,
          awayTeamId: awayTeam,
          isAvailable: false,
          status: 'pending_away_confirm',
          userId: currentUser?.uid || 'anonymous',
          updatedAt: new Date(),
        });
      } else {
        // Create new booking
      await addDoc(collection(db, "bookings"), {
          date: selectedSlot.date,
          time: selectedSlot.time,
          pitchId: selectedSlot.pitchId,
          homeTeamId: teamId,
        awayTeamId: awayTeam,
          isAvailable: false,
          status: 'pending_away_confirm',
          userId: currentUser?.uid || 'anonymous',
          contactName: contactName || (currentUser?.displayName || ''),
          contactEmail: contactEmail || (currentUser?.email || ''),
          contactPhone: contactPhone || '',
        createdAt: new Date(),
      });
      }
      
      alert("Buchung erfolgreich!");
      setSelectedSlot(null);
      setHomeTeam('');
      setAwayTeam('');
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      // Refresh data
      window.location.reload(); 
    } catch (error) {
      console.error("Fehler bei der Buchung:", error);
      alert("Buchung fehlgeschlagen.");
    }
  };

  // Generate date options for the next 365 days
  const generateDateOptions = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const getAvailableBookingsForDate = (date) => {
    return data.groupedBookings[date] || {};
  };

  if (loading) {
    return <div>Lade Spielplan...</div>;
  }
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Spielplan & Reservierung</h1>

      {/* Kompakte, nach Platz gruppierte Liste aller Termine */}
      {data.pitches.map(pitch => {
        // Sammle alle Buchungen für diesen Platz über alle Daten
        const bookingsForPitch = [];
        Object.keys(data.groupedBookings).forEach(dateKey => {
          const list = data.groupedBookings[dateKey]?.[pitch.id] || [];
          list.forEach(b => bookingsForPitch.push({ ...b, date: dateKey }));
        });

        // Sortiere nach Datum und Uhrzeit
        bookingsForPitch.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

                    return (
          <div key={pitch.id} style={{
            border: '1px solid #ccc',
            margin: '12px 0',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: 8, color: '#000' }}>{pitch.name}</h3>

            {bookingsForPitch.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic', margin: 0 }}>
                Keine Zeitslots verfügbar. <span>Kontaktieren Sie einen Administrator, um Zeitslots hinzuzufügen.</span>
              </p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {bookingsForPitch.map(booking => {
                  const isBooked = !booking.isAvailable && booking.homeTeamId && booking.awayTeamId;
                  const homeTeamName = data.teams[booking.homeTeamId] || '';
                  const awayTeamName = data.teams[booking.awayTeamId] || '';
                  const labelDate = new Date(booking.date).toLocaleDateString('de-DE');
                    return (
                    <li key={booking.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 0',
                      borderBottom: '1px solid #e5e5e5'
                    }}>
                      <span style={{ marginRight: 8, whiteSpace: 'nowrap', color: '#000' }}>
                        {labelDate} {booking.time}
                      </span>
                      <span style={{ flex: 1, marginLeft: 8, color: isBooked ? '#d32f2f' : '#2e7d32' }}>
                        {isBooked ? (
                          <strong>Belegt</strong>
                        ) : (
                          <strong>Verfügbar</strong>
                        )}
                        {isBooked && `: ${homeTeamName} vs. ${awayTeamName}`}
                      </span>
                      {!isBooked && (
                        <button
                          onClick={() => handleBookNow(booking.date, pitch.id, booking.time)}
                          style={{
                            padding: '5px 10px',
                            backgroundColor: '#4caf50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer'
                          }}
                        >
                          Buchen
                        </button>
                      )}
                      </li>
                    );
                })}
              </ul>
            )}
            </div>
        );
      })}

      {/* Pop-up-Formular für die Buchung */}
      {selectedSlot && (
        <div style={{ 
          position: 'fixed', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)', 
          backgroundColor: 'white', 
          padding: '30px', 
          border: '2px solid #333', 
          borderRadius: '10px',
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          minWidth: '400px'
        }}>
          <h3 style={{ marginTop: 0, color: '#333' }}>Platz buchen</h3>
          <div style={{ marginBottom: '15px' }}>
            <strong>Datum:</strong> {new Date(selectedSlot.date).toLocaleDateString('de-DE')}
          </div>
          <div style={{ marginBottom: '15px' }}>
            <strong>Platz:</strong> {data.pitches.find(p => p.id === selectedSlot.pitchId)?.name}
          </div>
          <div style={{ marginBottom: '20px' }}>
            <strong>Uhrzeit:</strong> {selectedSlot.time}
          </div>

          <form onSubmit={submitBooking}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Heim-Mannschaft:
              </label>
              <div style={{ padding: '8px 0', fontSize: '16px', color: '#000' }}>
                {data.teams[teamId] || 'Dein Team'}
              </div>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Auswärts-Mannschaft:
              </label>
              <select 
                value={awayTeam} 
                onChange={e => setAwayTeam(e.target.value)} 
                required
                style={{ width: '100%', padding: '8px', fontSize: '16px' }}
              >
                <option value="">Team auswählen</option>
                {Object.keys(data.teams).map(teamId => (
                    <option key={teamId} value={teamId}>{data.teams[teamId]}</option>
                ))}
            </select>
            </div>

            {/* Kontaktdaten - nur für nicht-angemeldete Benutzer (falls nötig) */}
            {!currentUser && (
              <>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Ihr Name: *
                  </label>
                  <input 
                    type="text" 
                    value={contactName} 
                    onChange={e => setContactName(e.target.value)} 
                    required
                    style={{ width: '100%', padding: '8px', fontSize: '16px', boxSizing: 'border-box' }}
                    placeholder="Ihr vollständiger Name"
                  />
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    E-Mail-Adresse: *
                  </label>
                  <input 
                    type="email" 
                    value={contactEmail} 
                    onChange={e => setContactEmail(e.target.value)} 
                    required
                    style={{ width: '100%', padding: '8px', fontSize: '16px', boxSizing: 'border-box' }}
                    placeholder="ihre.email@beispiel.de"
                  />
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    Telefonnummer:
                  </label>
                  <input 
                    type="tel" 
                    value={contactPhone} 
                    onChange={e => setContactPhone(e.target.value)} 
                    style={{ width: '100%', padding: '8px', fontSize: '16px', boxSizing: 'border-box' }}
                    placeholder="+49 123 456789"
                  />
                </div>
              </>
            )}
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={() => setSelectedSlot(null)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
              <button 
                type="submit"
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Jetzt buchen
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default BookingOverview;