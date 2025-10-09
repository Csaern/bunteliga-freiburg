import React from 'react';
import { Routes, Route, useParams } from 'react-router-dom'; // useParams importieren
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
// AdminPage und AdminDashboardPage werden nicht mehr direkt benötigt,
// stattdessen verwenden wir AdminBoard
import AdminBoard from './pages/AdminBoard';
import UserBoard from './pages/UserBoard';
import DashboardPage from './pages/DashboardPage';
import ResultEntryPage from './pages/ResultEntryPage';
import TeamDetailPage from './pages/TeamDetailPage';
import ResultConfirmationPage from './pages/ResultConfirmationPage';
import GameManagementPage from './pages/GameManagementPage';

// Eine kleine Helfer-Komponente, um den URL-Parameter an das AdminBoard zu übergeben
function AdminBoardWrapper() {
  // Holt den 'tab'-Teil aus der URL (z.B. 'bookings', 'users')
  const { tab } = useParams();
  // Übergibt den Tab an das AdminBoard. Wenn kein Tab da ist, wird 'bookings' als Standard verwendet.
  return <AdminBoard initialTab={tab || 'bookings'} />;
}


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
            
            {/* --- NEUE ADMIN ROUTEN --- */}
            {/* Diese Route fängt alles ab, was mit /admin/ beginnt */}
            <Route path="/admin/:tab" element={<AdminBoardWrapper />} />
            {/* Dies ist ein Fallback, falls jemand nur /admin aufruft */}
            <Route path="/admin" element={<AdminBoardWrapper />} />

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
            <Route path="/team/:teamId" element={<TeamDetailPage />} />
            <Route path="/ergebnis-bestaetigen" element={<ResultConfirmationPage />} />
            <Route path="/spiel-verwaltung" element={<GameManagementPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
