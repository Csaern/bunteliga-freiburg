import React from 'react';
import { useLocation } from 'react-router-dom'; 
import NewsCarousel from '../components/News/News';
import LeagueTable from '../components/LeagueTable';
import FixtureList from '../components/FixtureList';

const HomePage = () => {
  const location = useLocation(); 

  React.useEffect(() => {
    const attemptScroll = () => {
      if (location.hash) {
        const id = location.hash.replace('#', '');
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };

    const timeoutId = setTimeout(attemptScroll, 50); 

    return () => clearTimeout(timeoutId);

  }, [location]); 

  return (
    <div className="homepage">
      <NewsCarousel />
      <LeagueTable title="Liga-Tabelle" form={true}/>

      <section id="Ergebnisse"> 
        <FixtureList />
      </section>
    </div>
  );
};

export default HomePage;

