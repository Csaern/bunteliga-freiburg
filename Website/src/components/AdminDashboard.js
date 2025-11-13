// src/components/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../context/AuthProvider';
import TeamManager from './TeamManager'; // Importiere den TeamManager
import teamApiService from '../services/teamApiService'; // Importiere den API-Service für Teams
import { Box } from '@mui/material';

const AdminDashboard = () => {
  const { currentUser, isAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTeams: 0,
    pendingResults: 0,
    totalBookings: 0,
    currentSeason: null
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0); // Zustand für den aktiven Tab
  const [teams, setTeams] = useState([]); // Zustand für die Teams

  useEffect(() => {
    if (isAdmin) {
      loadStats();
      fetchData(); // Daten beim Laden des Dashboards abrufen
    }
  }, [isAdmin]);

  const loadStats = async () => {
    try {
      // Parallel laden für bessere Performance
      const [usersSnap, teamsSnap, resultsSnap, bookingsSnap, seasonsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'teams')),
        getDocs(collection(db, 'results')),
        getDocs(collection(db, 'bookings')),
        getDocs(collection(db, 'seasons'))
      ]);

      // Statistiken berechnen
      const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const teams = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const results = resultsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const bookings = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const seasons = seasonsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const pendingResults = results.filter(r => r.status === 'pending').length;
      const currentSeason = seasons.find(s => s.isCurrent === true);

      setStats({
        totalUsers: users.length,
        totalTeams: teams.length,
        pendingResults,
        totalBookings: bookings.length,
        currentSeason
      });
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
    } finally {
      setLoading(false);
    }
  };

  // Annahme: Du hast hier eine fetchData-Funktion, die Teams und andere Daten lädt
  const fetchData = async () => {
    try {
      const teamsData = await teamApiService.getAllTeams();
      setTeams(teamsData);
    } catch (error) {
      console.error('Fehler beim Laden der Teams:', error);
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Zugriff verweigert</h2>
        <p>Sie haben keine Berechtigung, auf das Admin-Dashboard zuzugreifen.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Admin Dashboard</h1>
        <p>Lade Statistiken...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Admin Dashboard</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Willkommen zurück, {currentUser?.email}! Hier ist eine Übersicht über das System.
      </p>

      {/* Aktuelle Saison */}
      {stats.currentSeason && (
        <div style={{ 
          marginBottom: '30px', 
          padding: '15px', 
          backgroundColor: '#d4edda', 
          border: '1px solid #c3e6cb',
          borderRadius: '5px',
          color: '#000000'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Aktuelle Saison</h3>
          <p style={{ margin: 0 }}><strong>{stats.currentSeason.name}</strong></p>
        </div>
      )}

      {/* Statistik-Karten */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px', 
        marginBottom: '30px' 
      }}>
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#000000'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#007bff' }}>Benutzer</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0' }}>{stats.totalUsers}</p>
          <p style={{ margin: 0, color: '#666' }}>Registrierte Benutzer</p>
        </div>

        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#000000'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#28a745' }}>Teams</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0' }}>{stats.totalTeams}</p>
          <p style={{ margin: 0, color: '#666' }}>Aktive Teams</p>
        </div>

        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#000000'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#17a2b8' }}>Buchungen</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0' }}>{stats.totalBookings}</p>
          <p style={{ margin: 0, color: '#666' }}>Gesamt Buchungen</p>
        </div>
      </div>

      {/* Schnellzugriff-Buttons */}
      <div style={{ marginBottom: '30px' }}>
        <h3>Schnellzugriff</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <Link to="/admin" style={{
            padding: '12px 20px',
            backgroundColor: '#007bff',
            color: '#fff',
            borderRadius: '6px',
            textDecoration: 'none',
            display: 'inline-block'
          }}>
            Vollständige Verwaltung
          </Link>
        </div>
      </div>

      {/* Warnung bei fehlender aktueller Saison */}
      {!stats.currentSeason && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8d7da', 
          border: '1px solid #f5c6cb',
          borderRadius: '5px',
          color: '#721c24'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>⚠️ Keine aktuelle Saison</h4>
          <p style={{ margin: '0 0 10px 0' }}>
            Es ist keine aktuelle Saison festgelegt. Bitte erstellen Sie eine neue Saison oder setzen Sie eine bestehende als aktuell.
          </p>
          <Link to="/admin" style={{
            padding: '8px 16px',
            backgroundColor: '#721c24',
            color: '#fff',
            borderRadius: '4px',
            textDecoration: 'none',
            display: 'inline-block'
          }}>
            Saison verwalten
          </Link>
        </div>
      )}

      {/* TeamManager-Komponente für die Verwaltung von Teams */}
      {activeTab === 1 && (
        <TeamManager 
          teams={teams} 
          fetchData={fetchData} // KORREKTUR: Die fetchData-Funktion als Prop übergeben
        />
      )}
    </div>
  );
};

export default AdminDashboard;
