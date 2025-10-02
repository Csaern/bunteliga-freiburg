import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import DynamicFixtureList from '../components/DynamicFixtureList';
import DynamicLeagueTable from '../components/DynamicLeagueTable';
import { db } from '../firebase';

const ResultsPage = () => {
  const [currentSeason, setCurrentSeason] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentSeason();
  }, []);

  const loadCurrentSeason = async () => {
    try {
      const seasonsSnap = await getDocs(collection(db, 'seasons'));
      const seasons = seasonsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const current = seasons.find(s => s.isCurrent === true);
      setCurrentSeason(current);
    } catch (error) {
      console.error('Fehler beim Laden der aktuellen Saison:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="grey.400">Lade Ergebnisse...</Typography>
        </Box>
      </div>
    );
  }

  return (
    <div>
      {currentSeason && (
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="h6" color="primary">
            {currentSeason.name} ({currentSeason.year})
          </Typography>
        </Box>
      )}
      <DynamicLeagueTable 
        title="Liga-Tabelle" 
        form={true} 
        seasonId={currentSeason?.id}
      />
      <DynamicFixtureList 
        title="Alle Spiele" 
        details={true} 
        seasonId={currentSeason?.id}
        showType="all"
      />
    </div>
  );
};

export default ResultsPage;