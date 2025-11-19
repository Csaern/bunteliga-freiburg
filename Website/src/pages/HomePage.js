import React, { useState, useEffect } from 'react';
import NewsCarousel from '../components/News/News';
import DynamicFixtureList from '../components/DynamicFixtureList';
import DynamicLeagueTable from '../components/DynamicLeagueTable';
import * as seasonApi from '../services/seasonApiService';

const HomePage = () => {
  const [currentSeason, setCurrentSeason] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentSeason();
  }, []);

  const loadCurrentSeason = async () => {
    try {
      // Lade die aktive Saison über die API (nur active Saisons werden zurückgegeben)
      const activeSeason = await seasonApi.getActiveSeasonPublic();
      setCurrentSeason(activeSeason);
    } catch (error) {
      console.error('Fehler beim Laden der aktuellen Saison:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="homepage">
        <NewsCarousel />
        <div style={{ textAlign: 'center', padding: '20px' }}>
          Lade Spiele...
        </div>
      </div>
    );
  }

  return (
    <div className="homepage">
      <NewsCarousel />
       <DynamicFixtureList 
        title="Neueste Ergebnisse" 
        details={false}
        seasonId={currentSeason?.id}
        showType="results"
      />
      <DynamicLeagueTable 
        title="Aktuelle Tabelle" 
        form={false} 
        seasonId={currentSeason?.id}
      />
     
      <DynamicFixtureList 
        title="Nächste Spiele"
        details={true}
        seasonId={currentSeason?.id}
        showType="upcoming"
      />
    </div>
  );
};

export default HomePage;

