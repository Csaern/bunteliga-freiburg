import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthProvider';
import { Box, Tabs, Tab, CircularProgress, Typography } from '@mui/material';

// NEU: Importiere die spezialisierten Manager-Komponenten
import BookingManager from './Admin/BookingManager';
import TeamManager from './Admin/TeamManager';
// import PitchManager from './Admin/PitchManager'; // (Annahme, dass diese Komponente existiert oder erstellt wird)
// import UserManager from './Admin/UserManager'; // (Annahme)
// import SeasonManager from './Admin/SeasonManager'; // (Annahme)
// import ResultManager from './Admin/ResultManager'; // (Annahme)

// NEU: Importiere die API-Services, anstatt Firebase direkt zu verwenden
import * as teamApiService from '../services/teamApiService';
import * as seasonApiService from '../services/seasonApiService';

const AdminBoard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { isAdmin } = useAuth();

  // KORREKTUR: Nur noch Ladezustand und Daten, die von MEHREREN Managern benötigt werden.
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [currentSeason, setCurrentSeason] = useState(null);

  // KORREKTUR: Lädt nur noch die Basis-Daten. Jeder Manager lädt seine eigenen Daten selbst.
  const fetchData = async () => {
    setLoading(true);
    try {
      const teamsData = await teamApiService.getAllTeams();
      const seasonsData = await seasonApiService.getAllSeasons();
      
      setTeams(teamsData);
      const activeSeason = seasonsData.find(s => s.status === 'active');
      setCurrentSeason(activeSeason || null);

    } catch (error)      {
      console.error('Fehler beim Laden der Basis-Admin-Daten:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  // Diese Funktion wird als Prop an Manager weitergegeben, die sie benötigen.
  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : '-';
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  if (!isAdmin) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h5">Zugriff verweigert</Typography>
        <Typography>Sie haben keine Berechtigung, auf das Adminboard zuzugreifen.</Typography>
      </Box>
    );
  }

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress sx={{ color: '#00A99D' }} /></Box>;
  }

  return (
    <Box sx={{ width: '100%', typography: 'body1' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#1e1e1e' }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          aria-label="Admin Tabs"
          sx={{
            "& .MuiTabs-indicator": { backgroundColor: '#00A99D' },
            "& .MuiTab-root": { color: 'grey.500' },
            "& .Mui-selected": { color: '#00A99D !important' },
          }}
        >
          <Tab label="Buchungen" />
          <Tab label="Teams" />
          <Tab label="Plätze" />
          <Tab label="Benutzer" />
          <Tab label="Saisons" />
          <Tab label="Ergebnisse" />
        </Tabs>
      </Box>

      {/* Aktuelle Saison Anzeige */}
      {currentSeason ? (
        <Box sx={{ p: 2, bgcolor: 'rgba(0, 169, 157, 0.1)', color: '#00A99D', textAlign: 'center', fontFamily: 'comfortaa' }}>
          Aktive Saison: {currentSeason.name}
        </Box>
      ) : (
        <Box sx={{ p: 2, bgcolor: 'rgba(255, 171, 0, 0.1)', color: '#ffab00', textAlign: 'center', fontFamily: 'comfortaa' }}>
          Warnung: Keine aktive Saison gefunden!
        </Box>
      )}

      {/* KORREKTUR: Hier werden jetzt die spezialisierten Komponenten geladen */}
      <Box sx={{ pt: 2 }}>
        {activeTab === 0 && (
          <BookingManager 
            teams={teams} 
            currentSeason={currentSeason} 
            getTeamName={getTeamName} 
          />
        )}
        {activeTab === 1 && (
          <TeamManager 
            teams={teams} 
            onTeamsUpdate={fetchData} // Damit das Board die Teamliste neu lädt, wenn sich was ändert
          />
        )}
        {activeTab === 2 && (
          // <PitchManager /> 
          <Typography sx={{p:3, textAlign: 'center', color: 'grey.500'}}>Platzhalter für PitchManager</Typography>
        )}
        {activeTab === 3 && (
          // <UserManager teams={teams} />
          <Typography sx={{p:3, textAlign: 'center', color: 'grey.500'}}>Platzhalter für UserManager</Typography>
        )}
        {activeTab === 4 && (
          // <SeasonManager />
          <Typography sx={{p:3, textAlign: 'center', color: 'grey.500'}}>Platzhalter für SeasonManager</Typography>
        )}
        {activeTab === 5 && (
          // <ResultManager teams={teams} currentSeason={currentSeason} />
          <Typography sx={{p:3, textAlign: 'center', color: 'grey.500'}}>Platzhalter für ResultManager</Typography>
        )}
      </Box>
    </Box>
  );
};

export default AdminBoard;
