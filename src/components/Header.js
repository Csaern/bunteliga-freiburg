import React from 'react';
import { Link } from 'react-router-dom';
// import './Header.css'; // Erstelle Header.css für spezifische Styles

const Header = () => {
  // Das Menü-Handling (Öffnen/Schließen) ist hier noch nicht implementiert
  return (
    <header className="app-header">
      <h1>Bunte Liga Freiburg</h1>
      {/* Das "Navigator" Menü-Icon und Modal ist hier noch nicht umgesetzt */}
      {/* Vereinfachte Navigation für den Anfang */}
      <nav>
        <ul className="nav-menu">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/ergebnisse">Ergebnisse</Link></li>
          <li><Link to="/platzreservierung">Platz reservieren</Link></li>
          <li><Link to="/historie">Historiker-Ecke</Link></li>
          <li><Link to="/kontakt">Kontakte</Link></li>
          <li><Link to="/teams">Teams</Link></li>
          {/* Füge hier weitere Links hinzu, wie "Plätze" */}
        </ul>
      </nav>
    </header>
  );
};

export default Header;