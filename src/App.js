import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css'; // Importiere deine CSS-Datei
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
// Importiere hier später deine anderen Seitenkomponenten
// import ResultsPage from './pages/ResultsPage';
// import ReservePage from './pages/ReservePage';
// import HistoryPage from './pages/HistoryPage';
// import ContactPage from './pages/ContactPage';
// import TeamsPage from './pages/TeamsPage';

function App() {
  return (
    <div className="app-container">
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* 
          Definiere hier Routen für deine anderen Seiten, sobald du sie erstellst:
          <Route path="/ergebnisse" element={<ResultsPage />} />
          <Route path="/platzreservierung" element={<ReservePage />} />
          <Route path="/historie" element={<HistoryPage />} />
          <Route path="/kontakt" element={<ContactPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          */}
          {/* Fallback-Route für nicht gefundene Seiten */}
          <Route path="*" element={<div>Seite nicht gefunden</div>} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;