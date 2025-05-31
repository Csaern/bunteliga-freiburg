import React from 'react';
import NewsCarousel from '../components/News/News';
import LeagueTable from '../components/LeagueTable';
// import './HomePage.css'; // Erstelle HomePage.css für spezifische Styles

const HomePage = () => {

  return (
    <div className="homepage">
      <NewsCarousel />
      <LeagueTable />
    </div>
  );
};

export default HomePage;