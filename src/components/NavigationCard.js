import React from 'react';
import { Link } from 'react-router-dom';
// import './NavigationCard.css'; // Erstelle NavigationCard.css für spezifische Styles

const NavigationCard = ({ title, subtitle, link }) => {
  return (
    <div className="navigation-card">
      <Link to={link}>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </Link>
    </div>
  );
};

export default NavigationCard;