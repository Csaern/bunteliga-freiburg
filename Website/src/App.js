import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import { AuthProvider } from './context/AuthProvider';
import HomePage from './pages/HomePage';
import ResultsPage from './pages/ResultsPage';
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
import BookingOverview from './components/BookingOverview';
import LoginPage from './pages/LoginPage';
import AdminPage from './pages/AdminPage';
import UserBoard from './pages/UserBoard';
import DashboardPage from './pages/DashboardPage';
import ResultEntryPage from './pages/ResultEntryPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

function App() {
  return (
    <AuthProvider>
      <div className="app-container">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="*" element={<HomePage />} />
            <Route path="/ergebnisse" element={<ResultsPage />} />
            <Route path="/platzreservierung" element={<BookingOverview />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/ergebnis-melden" element={<ResultEntryPage />} />
            <Route path="/board" element={<UserBoard />} />
            <Route path="/historie" element={<HistoryPage />} />
            <Route path="/kontakt" element={<ContactPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/impressum" element={<ImpressumPage />} />
            <Route path="/datenschutz" element={<PrivacyPage />} />
            <Route path="/plaetze" element={<VenuesPage />} />
            <Route path="/regeln" element={<RulesPage />} />
            <Route path="/team" element={<TeamPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;