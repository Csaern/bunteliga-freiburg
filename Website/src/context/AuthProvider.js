// src/context/AuthProvider.js

import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

// 1. Context erstellen
const AuthContext = createContext();

// Hook zur Verwendung des Context
export const useAuth = () => {
  return useContext(AuthContext);
};

// 2. Provider-Komponente
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [teamId, setTeamId] = useState(null);
  const [role, setRole] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  // onAuthStateChanged lauscht auf An- und Abmeldungen
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // Prüfe Admin-Status in Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setIsAdmin(data.isAdmin || false);
            setTeamId(data.teamId || null);
            setRole(data.role || (data.isAdmin ? 'admin' : 'team'));
            setSettings(data.settings || {});
          } else {
            setIsAdmin(false);
            setTeamId(null);
            setRole(null);
            setSettings({});
          }
        } catch (error) {
          console.error('Fehler beim Laden des Benutzer-Status:', error);
          setIsAdmin(false);
          setTeamId(null);
          setRole(null);
        }
      } else {
        setIsAdmin(false);
        setTeamId(null);
        setRole(null);
        setSettings({});
      }

      setLoading(false);
    });

    // Aufräumfunktion beim Entfernen der Komponente
    return unsubscribe;
  }, []);

  // Der Wert, der im gesamten Projekt bereitgestellt wird
  const value = {
    currentUser,
    isAdmin,
    teamId,
    role,
    settings,
    setSettings, // NEU: Damit wir sie nach Updates direkt im Context aktualisieren können
    // Hier können später Login/Logout-Funktionen hinzugefügt werden
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Zeige die Kinder nur, wenn der Auth-Status geladen ist */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

