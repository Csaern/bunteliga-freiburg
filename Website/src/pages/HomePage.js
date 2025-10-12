import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import NewsCarousel from '../components/News/News';
import DynamicFixtureList from '../components/DynamicFixtureList';
import DynamicLeagueTable from '../components/DynamicLeagueTable';
import { db } from '../firebase';

const HomePage = () => {
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

