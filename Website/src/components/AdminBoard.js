// src/components/AdminBoard.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from "../firebase";
import { useAuth } from '../context/AuthProvider';

const AdminBoard = () => {
  const [pitches, setPitches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [results, setResults] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings', 'users', 'season', 'results'
  const { isAdmin, currentUser } = useAuth();

  // Formular-Daten
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    pitchId: '',
    homeTeamId: '',
    awayTeamId: '',
    isAvailable: true
  });

  // Bulk-Zeitslot-Erstellung
  const [bulkFormData, setBulkFormData] = useState({
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    timeInterval: 60, // Minuten
    pitchId: '',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0], // 0 = Sonntag, 1 = Montag, etc.
    isAvailable: true
  });
  const [showBulkForm, setShowBulkForm] = useState(false);

  // Benutzerverwaltung
  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    teamId: '',
    isAdmin: false
  });
  const [showUserForm, setShowUserForm] = useState(false);

  // Automatisches Passwort generieren
  const generatePassword = () => {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  // Saison-Management
  const [seasonFormData, setSeasonFormData] = useState({
    year: new Date().getFullYear(),
    name: `Saison ${new Date().getFullYear()}`
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pitchesSnap, teamsSnap, bookingsSnap, usersSnap, seasonSnap, resultsSnap] = await Promise.all([
        getDocs(collection(db, "pitches")),
        getDocs(collection(db, "teams")),
        getDocs(collection(db, "bookings")),
        getDocs(collection(db, "users")),
        getDocs(collection(db, "seasons")),
        getDocs(collection(db, "results"))
      ]);

      setPitches(pitchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setTeams(teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setBookings(bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setResults(resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      // Saisons laden
      const seasonsData = seasonSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSeasons(seasonsData);
      
      // Aktuelle Saison finden
      const current = seasonsData.find(s => s.isCurrent === true);
      setCurrentSeason(current);
      
      setLoading(false);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const bookingData = {
        ...formData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (editingBooking) {
        // Update existing booking
        await updateDoc(doc(db, "bookings", editingBooking.id), {
          ...bookingData,
          updatedAt: new Date()
        });
        setEditingBooking(null);
      } else {
        // Add new booking
        await addDoc(collection(db, "bookings"), bookingData);
      }

      // Reset form
      setFormData({
        date: '',
        time: '',
        pitchId: '',
        homeTeamId: '',
        awayTeamId: '',
        isAvailable: true
      });
      setShowAddForm(false);
      fetchData(); // Refresh data
      alert(editingBooking ? 'Buchung aktualisiert!' : 'Buchung hinzugefügt!');
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      alert('Fehler beim Speichern der Buchung!');
    }
  };

  const handleEdit = (booking) => {
    setEditingBooking(booking);
    setFormData({
      date: booking.date || '',
      time: booking.time || '',
      pitchId: booking.pitchId || '',
      homeTeamId: booking.homeTeamId || '',
      awayTeamId: booking.awayTeamId || '',
      isAvailable: booking.isAvailable !== false
    });
    setShowAddForm(true);
  };

  const handleDelete = async (bookingId) => {
    if (window.confirm('Sind Sie sicher, dass Sie diese Buchung löschen möchten?')) {
      try {
        await deleteDoc(doc(db, "bookings", bookingId));
        fetchData(); // Refresh data
        alert('Buchung gelöscht!');
      } catch (error) {
        console.error('Fehler beim Löschen:', error);
        alert('Fehler beim Löschen der Buchung!');
      }
    }
  };

  const handleBulkCreate = async (e) => {
    e.preventDefault();
    
    try {
      const startDate = new Date(bulkFormData.startDate);
      const endDate = new Date(bulkFormData.endDate);
      const startTime = bulkFormData.startTime;
      const endTime = bulkFormData.endTime;
      const interval = bulkFormData.timeInterval;
      
      const timeSlots = generateTimeSlots(startTime, endTime, interval);
      const dates = generateDateRange(startDate, endDate, bulkFormData.daysOfWeek);
      
      let createdCount = 0;
      
      for (const date of dates) {
        for (const time of timeSlots) {
          // Prüfe, ob bereits ein Slot für dieses Datum/Zeit/Platz existiert
          const existingBookings = bookings.filter(booking => 
            booking.date === date && 
            booking.time === time && 
            booking.pitchId === bulkFormData.pitchId
          );
          
          if (existingBookings.length === 0) {
            await addDoc(collection(db, "bookings"), {
              date: date,
              time: time,
              pitchId: bulkFormData.pitchId,
              isAvailable: bulkFormData.isAvailable,
              createdAt: new Date(),
            });
            createdCount++;
          }
        }
      }
      
      alert(`${createdCount} Zeitslots erfolgreich erstellt!`);
      setShowBulkForm(false);
      setBulkFormData({
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        timeInterval: 60,
        pitchId: '',
        daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
        isAvailable: true
      });
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Fehler beim Erstellen der Zeitslots:', error);
      alert('Fehler beim Erstellen der Zeitslots!');
    }
  };

  const generateTimeSlots = (startTime, endTime, interval) => {
    const slots = [];
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    let current = new Date(start);
    while (current < end) {
      slots.push(current.toTimeString().slice(0, 5)); // HH:MM Format
      current.setMinutes(current.getMinutes() + interval);
    }
    
    return slots;
  };

  const generateDateRange = (startDate, endDate, daysOfWeek) => {
    const dates = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      if (daysOfWeek.includes(current.getDay())) {
        dates.push(current.toISOString().split('T')[0]);
      }
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  };

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Unbekannt';
  };

  const getPitchName = (pitchId) => {
    const pitch = pitches.find(p => p.id === pitchId);
    return pitch ? pitch.name : 'Unbekannt';
  };

  // Benutzerverwaltung
  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    try {
      // Automatisches Passwort generieren, falls keines eingegeben wurde
      const password = userFormData.password || generatePassword();
      
      // Aktuelle Admin-Anmeldedaten speichern
      const adminEmail = currentUser.email;
      const adminPassword = prompt('Bitte geben Sie Ihr Admin-Passwort ein, um den Vorgang abzuschließen:');
      
      if (!adminPassword) {
        alert('Vorgang abgebrochen - Admin-Passwort erforderlich');
        return;
      }
      
      // Neuen Benutzer erstellen
      const userCredential = await createUserWithEmailAndPassword(auth, userFormData.email, password);
      
      // Benutzerdaten in Firestore speichern
      await addDoc(collection(db, 'users'), {
        uid: userCredential.user.uid,
        email: userFormData.email,
        teamId: userFormData.teamId || null,
        role: userFormData.isAdmin ? 'admin' : 'team',
        isAdmin: userFormData.isAdmin,
        displayName: userFormData.email,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });

      // Neuen Benutzer ausloggen
      await signOut(auth);
      
      // Administrator wieder anmelden
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

      alert(`Benutzer erfolgreich erstellt!\nEmail: ${userFormData.email}\nPasswort: ${password}`);
      setUserFormData({
        email: '',
        password: '',
        teamId: '',
        isAdmin: false
      });
      setShowUserForm(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Fehler beim Erstellen des Benutzers:', error);
      alert('Fehler beim Erstellen des Benutzers: ' + error.message);
      
      // Falls etwas schief geht, versuche den Admin wieder anzumelden
      try {
        if (currentUser?.email) {
          const adminPassword = prompt('Fehler aufgetreten. Bitte geben Sie Ihr Admin-Passwort ein, um sich wieder anzumelden:');
          if (adminPassword) {
            await signInWithEmailAndPassword(auth, currentUser.email, adminPassword);
          }
        }
      } catch (reAuthError) {
        console.error('Fehler bei der Wiederanmeldung:', reAuthError);
        alert('Bitte melden Sie sich erneut an.');
      }
    }
  };

  const handleUpdateUser = async (userId, updates) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      alert('Benutzer aktualisiert!');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Benutzers:', error);
      alert('Fehler beim Aktualisieren des Benutzers!');
    }
  };

  // Saison-Management
  const handleCreateSeason = async (e) => {
    e.preventDefault();
    
    try {
      // Alle anderen Saisons als nicht aktuell markieren
      const seasonsSnap = await getDocs(collection(db, "seasons"));
      const updatePromises = seasonsSnap.docs.map(doc => 
        updateDoc(doc.ref, { isCurrent: false })
      );
      await Promise.all(updatePromises);

      // Neue Saison erstellen
      await addDoc(collection(db, "seasons"), {
        ...seasonFormData,
        isCurrent: true,
        createdAt: serverTimestamp()
      });

      alert('Saison erfolgreich erstellt und als aktuell gesetzt!');
      setSeasonFormData({
        year: new Date().getFullYear(),
        name: `Saison ${new Date().getFullYear()}`
      });
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Fehler beim Erstellen der Saison:', error);
      alert('Fehler beim Erstellen der Saison!');
    }
  };

  const handleSetCurrentSeason = async (seasonId) => {
    try {
      // Alle anderen Saisons als nicht aktuell markieren
      const seasonsSnap = await getDocs(collection(db, "seasons"));
      const updatePromises = seasonsSnap.docs.map(doc => 
        updateDoc(doc.ref, { isCurrent: false })
      );
      await Promise.all(updatePromises);

      // Gewählte Saison als aktuell markieren
      await updateDoc(doc(db, "seasons", seasonId), {
        isCurrent: true,
        updatedAt: serverTimestamp()
      });

      alert('Aktuelle Saison aktualisiert!');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Saison:', error);
      alert('Fehler beim Aktualisieren der Saison!');
    }
  };

  // Ergebnis-Verwaltung
  const handleConfirmResult = async (resultId) => {
    try {
      await updateDoc(doc(db, "results", resultId), {
        status: 'confirmed',
        confirmedBy: currentUser.uid,
        confirmedAt: serverTimestamp()
      });
      alert('Ergebnis bestätigt!');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Fehler beim Bestätigen des Ergebnisses:', error);
      alert('Fehler beim Bestätigen des Ergebnisses!');
    }
  };

  const handleRejectResult = async (resultId) => {
    try {
      await updateDoc(doc(db, "results", resultId), {
        status: 'rejected',
        rejectedBy: currentUser.uid,
        rejectedAt: serverTimestamp()
      });
      alert('Ergebnis abgelehnt!');
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Fehler beim Ablehnen des Ergebnisses:', error);
      alert('Fehler beim Ablehnen des Ergebnisses!');
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Zugriff verweigert</h2>
        <p>Sie haben keine Berechtigung, auf das Adminboard zuzugreifen.</p>
      </div>
    );
  }

  if (loading) {
    return <div>Lade Adminboard...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Adminboard - Verwaltung</h1>
      
      {/* Tab Navigation */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setActiveTab('bookings')}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: activeTab === 'bookings' ? '#007bff' : '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Buchungsverwaltung
        </button>
        
        <button 
          onClick={() => setActiveTab('users')}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: activeTab === 'users' ? '#007bff' : '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Benutzerverwaltung
        </button>
        
        <button 
          onClick={() => setActiveTab('season')}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: activeTab === 'season' ? '#007bff' : '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Saison-Management
        </button>
        
        <button 
          onClick={() => setActiveTab('results')}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: activeTab === 'results' ? '#007bff' : '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Ergebnis-Verwaltung
        </button>
      </div>

      {/* Aktuelle Saison Anzeige */}
      {currentSeason && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '10px', 
          backgroundColor: '#d4edda', 
          border: '1px solid #c3e6cb',
          borderRadius: '5px'
        }}>
          <strong>Aktuelle Saison:</strong> {currentSeason.name} ({currentSeason.year})
        </div>
      )}

      {/* Buchungsverwaltung Tab */}
      {activeTab === 'bookings' && (
        <div>
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => {
            setShowAddForm(!showAddForm);
            setShowBulkForm(false);
            setEditingBooking(null);
            setFormData({
              date: '',
              time: '',
              pitchId: '',
              homeTeamId: '',
              awayTeamId: '',
              isAvailable: true
            });
          }}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          {showAddForm ? 'Formular schließen' : 'Einzelne Buchung hinzufügen'}
        </button>
        
        <button 
          onClick={() => {
            setShowBulkForm(!showBulkForm);
            setShowAddForm(false);
            setEditingBooking(null);
          }}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          {showBulkForm ? 'Bulk-Formular schließen' : 'Zeitslots in Bulk erstellen'}
        </button>
      </div>

      {/* Formular zum Hinzufügen/Bearbeiten */}
      {showAddForm && (
        <div style={{ 
          border: '1px solid #ccc', 
          padding: '20px', 
          marginBottom: '20px',
          borderRadius: '5px',
          backgroundColor: '#f9f9f9',
          color: '#000000'
        }}>
          <h3>{editingBooking ? 'Buchung bearbeiten' : 'Neue Buchung hinzufügen'}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '10px' }}>
              <label>Datum:</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required
                style={{ marginLeft: '10px', padding: '5px' }}
              />
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <label>Uhrzeit:</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({...formData, time: e.target.value})}
                required
                style={{ marginLeft: '10px', padding: '5px' }}
              />
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <label>Platz:</label>
              <select
                value={formData.pitchId}
                onChange={(e) => setFormData({...formData, pitchId: e.target.value})}
                required
                style={{ marginLeft: '10px', padding: '5px' }}
              >
                <option value="">Platz auswählen</option>
                {pitches.map(pitch => (
                  <option key={pitch.id} value={pitch.id}>{pitch.name}</option>
                ))}
              </select>
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <label>Heim-Mannschaft:</label>
              <select
                value={formData.homeTeamId}
                onChange={(e) => setFormData({...formData, homeTeamId: e.target.value})}
                style={{ marginLeft: '10px', padding: '5px' }}
              >
                <option value="">Keine Mannschaft</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <label>Auswärts-Mannschaft:</label>
              <select
                value={formData.awayTeamId}
                onChange={(e) => setFormData({...formData, awayTeamId: e.target.value})}
                style={{ marginLeft: '10px', padding: '5px' }}
              >
                <option value="">Keine Mannschaft</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
            
            <div style={{ marginBottom: '10px' }}>
              <label>
                <input
                  type="checkbox"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData({...formData, isAvailable: e.target.checked})}
                  style={{ marginRight: '5px' }}
                />
                Verfügbar
              </label>
            </div>
            
            <div>
              <button 
                type="submit"
                style={{ 
                  padding: '10px 20px', 
                  backgroundColor: '#28a745', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '5px',
                  cursor: 'pointer',
                  marginRight: '10px'
                }}
              >
                {editingBooking ? 'Aktualisieren' : 'Hinzufügen'}
              </button>
              <button 
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingBooking(null);
                }}
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
            </div>
          </form>
        </div>
      )}

      {/* Bulk-Zeitslot-Erstellungsformular */}
      {showBulkForm && (
        <div style={{ 
          border: '1px solid #ccc', 
          padding: '20px', 
          marginBottom: '20px',
          borderRadius: '5px',
          backgroundColor: '#f0f8ff',
          color: '#000000'
        }}>
          <h3>Zeitslots in Bulk erstellen</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Erstellen Sie mehrere verfügbare Zeitslots für einen bestimmten Zeitraum und Platz.
          </p>
          <form onSubmit={handleBulkCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label>Startdatum:</label>
                <input
                  type="date"
                  value={bulkFormData.startDate}
                  onChange={(e) => setBulkFormData({...bulkFormData, startDate: e.target.value})}
                  required
                  style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                />
              </div>
              
              <div>
                <label>Enddatum:</label>
                <input
                  type="date"
                  value={bulkFormData.endDate}
                  onChange={(e) => setBulkFormData({...bulkFormData, endDate: e.target.value})}
                  required
                  style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                />
              </div>
              
              <div>
                <label>Startzeit:</label>
                <input
                  type="time"
                  value={bulkFormData.startTime}
                  onChange={(e) => setBulkFormData({...bulkFormData, startTime: e.target.value})}
                  required
                  style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                />
              </div>
              
              <div>
                <label>Endzeit:</label>
                <input
                  type="time"
                  value={bulkFormData.endTime}
                  onChange={(e) => setBulkFormData({...bulkFormData, endTime: e.target.value})}
                  required
                  style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                />
              </div>
              
              <div>
                <label>Zeitintervall (Minuten):</label>
                <select
                  value={bulkFormData.timeInterval}
                  onChange={(e) => setBulkFormData({...bulkFormData, timeInterval: parseInt(e.target.value)})}
                  style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                >
                  <option value={30}>30 Minuten</option>
                  <option value={60}>60 Minuten</option>
                  <option value={90}>90 Minuten</option>
                  <option value={120}>120 Minuten</option>
                </select>
              </div>
              
              <div>
                <label>Platz:</label>
                <select
                  value={bulkFormData.pitchId}
                  onChange={(e) => setBulkFormData({...bulkFormData, pitchId: e.target.value})}
                  required
                  style={{ width: '100%', padding: '5px', marginTop: '5px' }}
                >
                  <option value="">Platz auswählen</option>
                  {pitches.map(pitch => (
                    <option key={pitch.id} value={pitch.id}>{pitch.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                Wochentage (wählen Sie die Tage aus, für die Zeitslots erstellt werden sollen):
              </label>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                {[
                  { value: 1, label: 'Montag' },
                  { value: 2, label: 'Dienstag' },
                  { value: 3, label: 'Mittwoch' },
                  { value: 4, label: 'Donnerstag' },
                  { value: 5, label: 'Freitag' },
                  { value: 6, label: 'Samstag' },
                  { value: 0, label: 'Sonntag' }
                ].map(day => (
                  <label key={day.value} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input
                      type="checkbox"
                      checked={bulkFormData.daysOfWeek.includes(day.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkFormData({
                            ...bulkFormData,
                            daysOfWeek: [...bulkFormData.daysOfWeek, day.value]
                          });
                        } else {
                          setBulkFormData({
                            ...bulkFormData,
                            daysOfWeek: bulkFormData.daysOfWeek.filter(d => d !== day.value)
                          });
                        }
                      }}
                    />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label>
                <input
                  type="checkbox"
                  checked={bulkFormData.isAvailable}
                  onChange={(e) => setBulkFormData({...bulkFormData, isAvailable: e.target.checked})}
                  style={{ marginRight: '5px' }}
                />
                Als verfügbar markieren
              </label>
            </div>
            
            <div>
              <button 
                type="submit"
                style={{ 
                  padding: '10px 20px', 
                  backgroundColor: '#28a745', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '5px',
                  cursor: 'pointer',
                  marginRight: '10px'
                }}
              >
                Zeitslots erstellen
              </button>
              <button 
                type="button"
                onClick={() => setShowBulkForm(false)}
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
            </div>
          </form>
        </div>
      )}

      {/* Liste aller Buchungen */}
      <div>
        <h3>Alle Buchungen</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Datum</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Uhrzeit</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Platz</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Heim-Mannschaft</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Auswärts-Mannschaft</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Kontakt</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Status</th>
                <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {bookings
                .sort((a, b) => {
                  // Sortiere nach Datum und Uhrzeit
                  const dateA = new Date(`${a.date} ${a.time}`);
                  const dateB = new Date(`${b.date} ${b.time}`);
                  return dateA - dateB;
                })
                .map(booking => (
                <tr key={booking.id}>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {booking.date}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {booking.time}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {getPitchName(booking.pitchId)}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {booking.homeTeamId ? getTeamName(booking.homeTeamId) : '-'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {booking.awayTeamId ? getTeamName(booking.awayTeamId) : '-'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {booking.contactName && (
                      <div style={{ fontSize: '0.9em' }}>
                        <div><strong>{booking.contactName}</strong></div>
                        {booking.contactEmail && <div>{booking.contactEmail}</div>}
                        {booking.contactPhone && <div>{booking.contactPhone}</div>}
                      </div>
                    )}
                    {!booking.contactName && booking.userId !== 'anonymous' && (
                      <span style={{ color: '#666', fontStyle: 'italic' }}>Angemeldeter Benutzer</span>
                    )}
                    {!booking.contactName && booking.userId === 'anonymous' && (
                      <span style={{ color: '#999', fontStyle: 'italic' }}>-</span>
                    )}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    <span style={{ 
                      color: booking.isAvailable ? '#28a745' : '#dc3545',
                      fontWeight: 'bold'
                    }}>
                      {booking.isAvailable ? 'Verfügbar' : 'Belegt'}
                    </span>
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    <button
                      onClick={() => handleEdit(booking)}
                      style={{ 
                        padding: '5px 10px', 
                        backgroundColor: '#ffc107', 
                        color: 'black', 
                        border: 'none', 
                        borderRadius: '3px',
                        cursor: 'pointer',
                        marginRight: '5px'
                      }}
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => handleDelete(booking.id)}
                      style={{ 
                        padding: '5px 10px', 
                        backgroundColor: '#dc3545', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </div>
      )}

      {/* Benutzerverwaltung Tab */}
      {activeTab === 'users' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <button 
              onClick={() => setShowUserForm(!showUserForm)}
              style={{ 
                padding: '10px 20px', 
                backgroundColor: '#28a745', 
                color: 'white', 
                border: 'none', 
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              {showUserForm ? 'Formular schließen' : 'Neuen Benutzer erstellen'}
            </button>
          </div>

          {/* Benutzer erstellen Formular */}
          {showUserForm && (
            <div style={{ 
              border: '1px solid #ccc', 
              padding: '20px', 
              marginBottom: '20px',
              borderRadius: '5px',
              backgroundColor: '#f9f9f9',
              color: '#000000'
            }}>
              <h3>Neuen Benutzer erstellen</h3>
              <form onSubmit={handleCreateUser}>
                <div style={{ marginBottom: '10px' }}>
                  <label>Email:</label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
                    required
                    style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
                  />
                </div>
                
                <div style={{ marginBottom: '10px' }}>
                  <label>Passwort (optional - wird automatisch generiert):</label>
                  <input
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({...userFormData, password: e.target.value})}
                    placeholder="Leer lassen für automatisches Passwort"
                    style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
                  />
                </div>
                
                <div style={{ marginBottom: '10px' }}>
                  <label>Team:</label>
                  <select
                    value={userFormData.teamId}
                    onChange={(e) => setUserFormData({...userFormData, teamId: e.target.value})}
                    style={{ marginLeft: '10px', padding: '5px' }}
                  >
                    <option value="">Kein Team</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
                
                <div style={{ marginBottom: '10px' }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={userFormData.isAdmin}
                      onChange={(e) => setUserFormData({...userFormData, isAdmin: e.target.checked})}
                      style={{ marginRight: '5px' }}
                    />
                    Administrator
                  </label>
                </div>
                
                <div>
                  <button 
                    type="submit"
                    style={{ 
                      padding: '10px 20px', 
                      backgroundColor: '#28a745', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '5px',
                      cursor: 'pointer',
                      marginRight: '10px'
                    }}
                  >
                    Benutzer erstellen
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowUserForm(false)}
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
                </div>
              </form>
            </div>
          )}

          {/* Benutzerliste */}
          <div>
            <h3>Alle Benutzer</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Email</th>
                    <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Team</th>
                    <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Rolle</th>
                    <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Admin</th>
                    <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                        {user.email}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                        {user.teamId ? getTeamName(user.teamId) : '-'}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                        {user.role || 'team'}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                        <span style={{ 
                          color: user.isAdmin ? '#28a745' : '#dc3545',
                          fontWeight: 'bold'
                        }}>
                          {user.isAdmin ? 'Ja' : 'Nein'}
                        </span>
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                        <button
                          onClick={() => handleUpdateUser(user.id, { isAdmin: !user.isAdmin })}
                          style={{ 
                            padding: '5px 10px', 
                            backgroundColor: user.isAdmin ? '#dc3545' : '#28a745', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '3px',
                            cursor: 'pointer',
                            marginRight: '5px'
                          }}
                        >
                          {user.isAdmin ? 'Admin entfernen' : 'Admin machen'}
                        </button>
                        <select
                          value={user.teamId || ''}
                          onChange={(e) => handleUpdateUser(user.id, { teamId: e.target.value || null })}
                          style={{ padding: '5px' }}
                        >
                          <option value="">Kein Team</option>
                          {teams.map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Saison-Management Tab */}
      {activeTab === 'season' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <h3>Neue Saison erstellen</h3>
            <form onSubmit={handleCreateSeason} style={{ 
              border: '1px solid #ccc', 
              padding: '20px', 
              marginBottom: '20px',
              borderRadius: '5px',
              backgroundColor: '#f9f9f9',
              color: '#000000'
            }}>
              <div style={{ marginBottom: '10px' }}>
                <label>Jahr:</label>
                <input
                  type="number"
                  value={seasonFormData.year}
                  onChange={(e) => setSeasonFormData({...seasonFormData, year: parseInt(e.target.value)})}
                  required
                  style={{ marginLeft: '10px', padding: '5px' }}
                />
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                <label>Saison Name:</label>
                <input
                  type="text"
                  value={seasonFormData.name}
                  onChange={(e) => setSeasonFormData({...seasonFormData, name: e.target.value})}
                  required
                  style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
                />
              </div>
              
              <div>
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
                  Saison erstellen
                </button>
              </div>
            </form>
          </div>

          <div>
            <h3>Alle Saisons</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Name</th>
                    <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Jahr</th>
                    <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Status</th>
                    <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {seasons.map(season => (
                    <tr key={season.id}>
                      <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                        {season.name}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                        {season.year}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                        <span style={{ 
                          color: season.isCurrent ? '#28a745' : '#6c757d',
                          fontWeight: 'bold'
                        }}>
                          {season.isCurrent ? 'Aktuell' : 'Inaktiv'}
                        </span>
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                        {!season.isCurrent && (
                          <button
                            onClick={() => handleSetCurrentSeason(season.id)}
                            style={{ 
                              padding: '5px 10px', 
                              backgroundColor: '#007bff', 
                              color: 'white', 
                              border: 'none', 
                              borderRadius: '3px',
                              cursor: 'pointer'
                            }}
                          >
                            Als aktuell setzen
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Ergebnis-Verwaltung Tab */}
      {activeTab === 'results' && (
        <div>
          <h3>Ergebnis-Verwaltung</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Hier können Sie gemeldete Ergebnisse bestätigen oder ablehnen.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Datum</th>
                  <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Uhrzeit</th>
                  <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Heim</th>
                  <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Auswärts</th>
                  <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Ergebnis</th>
                  <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Status</th>
                  <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Gemeldet von</th>
                  <th style={{ border: '1px solid #ccc', padding: '8px', color: '#000000' }}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {results
                  .sort((a, b) => {
                    // Sortiere nach Datum und Uhrzeit (neueste zuerst)
                    const dateA = new Date(`${a.date}T${a.time}`);
                    const dateB = new Date(`${b.date}T${b.time}`);
                    return dateB - dateA;
                  })
                  .map(result => (
                    <tr key={result.id}>
                      <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                        {result.date}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                        {result.time}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                        {getTeamName(result.homeTeamId)}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                        {getTeamName(result.awayTeamId)}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '8px', fontWeight: 'bold' }}>
                        {result.homeScore} : {result.awayScore}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                        <span style={{ 
                          color: result.status === 'confirmed' ? '#28a745' : 
                                 result.status === 'rejected' ? '#dc3545' : '#ffc107',
                          fontWeight: 'bold'
                        }}>
                          {result.status === 'confirmed' ? 'Bestätigt' : 
                           result.status === 'rejected' ? 'Abgelehnt' : 'Ausstehend'}
                        </span>
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                        {users.find(u => u.id === result.reportedBy)?.email || 'Unbekannt'}
                      </td>
                      <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                        {result.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleConfirmResult(result.id)}
                              style={{ 
                                padding: '5px 10px', 
                                backgroundColor: '#28a745', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '3px',
                                cursor: 'pointer',
                                marginRight: '5px'
                              }}
                            >
                              Bestätigen
                            </button>
                            <button
                              onClick={() => handleRejectResult(result.id)}
                              style={{ 
                                padding: '5px 10px', 
                                backgroundColor: '#dc3545', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '3px',
                                cursor: 'pointer'
                              }}
                            >
                              Ablehnen
                            </button>
                          </>
                        )}
                        {result.status !== 'pending' && (
                          <span style={{ color: '#666', fontStyle: 'italic' }}>
                            {result.status === 'confirmed' ? 'Bereits bestätigt' : 'Bereits abgelehnt'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBoard;
