import React from 'react';
import NavigationCard from '../components/NavigationCard';
import NewsCarousel from '../components/News/News';
// import './HomePage.css'; // Erstelle HomePage.css für spezifische Styles

const HomePage = () => {
  const navItems = [
    {
      title: "Ergebnisse und Tabellen",
      subtitle: "Immer dran denken: Dabei sein ist alles!",
      link: "/ergebnisse" // Entspricht den Pfaden in App.js
    },
    {
      title: "Platz reservieren",
      subtitle: "Aktueller Spielplan & Platzvergabe",
      link: "/platzreservierung"
    },
    {
      title: "Historiker-Ecke",
      subtitle: "Die ewige Tabelle und alles Weitere für Statistik-Nerds",
      link: "/historie"
    },
    {
      title: "Kontakte",
      subtitle: "Für Fanpost, Fragen, Fakenews",
      link: "/kontakt"
    },
    {
      title: "Teams",
      subtitle: "Ja, es sind viele!",
      link: "/teams"
    }
  ];

  return (
    <div className="homepage">
      <NewsCarousel />
    </div>
  );
};

export default HomePage;