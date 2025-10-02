// src/components/BookingForm.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const BookingForm = () => {
  const [teams, setTeams] = useState([]);
  const [pitches, setPitches] = useState([]);
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [selectedPitch, setSelectedPitch] = useState('');

  useEffect(() => {
    // Teams laden
    const fetchTeams = async () => {
      const querySnapshot = await getDocs(collection(db, "teams"));
      const teamList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeams(teamList);
    };

    // Plätze laden
    const fetchPitches = async () => {
      const querySnapshot = await getDocs(collection(db, "pitches"));
      const pitchList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPitches(pitchList);
    };

    fetchTeams();
    fetchPitches();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Hier kommt die Logik zum Speichern der Buchung
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Home-Mannschaft Dropdown */}
      <select value={homeTeam} onChange={e => setHomeTeam(e.target.value)}>
        <option value="">Heim-Mannschaft auswählen</option>
        {teams.map(team => (
          <option key={team.id} value={team.id}>{team.name}</option>
        ))}
      </select>
      {/* ... weitere Dropdowns und Formularelemente ... */}
      <button type="submit">Reservieren</button>
    </form>
  );
};

export default BookingForm;