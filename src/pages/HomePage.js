import React from 'react';
import NavigationCard from '../components/NavigationCard';
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
      <section className="hero-section">
        <h2>NEWS</h2>
        <p>Wir gratulieren dem 1. FC Ferdi Weiß zum Meistertitel der Saison 2024/25!!!</p>
        <h1>Hans ist der beste !!!</h1>
      </section>

      <section className="navigation-cards-container">
        {navItems.map((item, index) => (
          <NavigationCard
            key={index}
            title={item.title}
            subtitle={item.subtitle}
            link={item.link}
          />
        ))}
      </section>
    </div>
  );
};

export default HomePage;