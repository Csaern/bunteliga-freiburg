import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ResultsPage from './pages/ResultsPage';
import ReservePage from './pages/ReservePage'; 
import HistoryPage from './pages/HistoryPage'; 
import ContactPage from './pages/ContactPage'; 
import TeamsPage from './pages/TeamsPage';
import TeamPage from './pages/TeamPage';       
import ImpressumPage from './pages/ImpressumPage'; 
import PrivacyPage from './pages/PrivacyPage'; 
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@fontsource/comfortaa';
import VenuesPage from './pages/VenuesPage';
import RulesPage from './pages/RulesPage';

function App() {
  return (

    <div className="app-container">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="*" element={<HomePage />} />
          <Route path="/ergebnisse" element={<ResultsPage />} />
          <Route path="/platzreservierung" element={<ReservePage />} />
          <Route path="/historie" element={<HistoryPage />} />
          <Route path="/kontakt" element={<ContactPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/impressum" element={<ImpressumPage />} />
          <Route path="/datenschutz" element={<PrivacyPage />} />
          <Route path="/plaetze" element={<VenuesPage />}/>
          <Route path="/regeln" element={<RulesPage />}/>
          <Route path="/team" element={<TeamPage />}/>
        </Routes>
      </main>
      <Footer />
    </div>

  );
}

export default App;