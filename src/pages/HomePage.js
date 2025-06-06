import React from 'react';
import NewsCarousel from '../components/News/News';
import FixtureList from '../components/FixtureList';

const HomePage = () => {
  return (
    <div className="homepage">
      <NewsCarousel />
        <FixtureList title="Neueste Ergebnisse" details={false}/>
        <FixtureList title="Nächste Spiele"/>
    </div>
  );
};

export default HomePage;

