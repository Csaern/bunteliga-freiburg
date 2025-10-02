// src/pages/LoginPage.js
import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthProvider'; // Wir verwenden unseren Hook
import BookingOverview from '../components/BookingOverview';
import { Navigate } from 'react-router-dom';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { currentUser } = useAuth(); // Lese den aktuellen User-Status

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Lege ein users-Dokument an (teamId zunächst null, role team)
      await setDoc(doc(db, 'users', cred.user.uid), {
        email,
        teamId: null,
        role: 'team',
        isAdmin: false,
        displayName: cred.user.email,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });
      alert("Registrierung erfolgreich!");
    } catch (error) {
      alert("Fehler bei der Registrierung: " + error.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const udoc = await getDoc(doc(db, 'users', cred.user.uid));
      if (!udoc.exists()) {
        // Fallback: anlegen, wenn fehlt
        await setDoc(doc(db, 'users', cred.user.uid), {
          email: cred.user.email,
          teamId: null,
          role: 'team',
          isAdmin: false,
          displayName: cred.user.email,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
        });
      }
    } catch (error) {
      alert("Fehler beim Login: " + error.message);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  if (currentUser) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div>
      <h2>Anmelden oder Registrieren</h2>
      <form onSubmit={handleLogin}>
        <input type="email" placeholder="E-Mail" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Passwort" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit">Anmelden</button>
      </form>
    </div>
  );
};

export default LoginPage;