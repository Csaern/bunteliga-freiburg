import React from 'react';
import { Routes, Route, useParams } from 'react-router-dom'; // useParams importieren
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import { AuthProvider } from './context/AuthProvider';
import HomePage from './pages/HomePage';
import ResultsPage from './pages/ResultsPage';
import HistoryPage from './pages/HistoryPage';
import ContactPage from './pages/ContactPage';
import TeamsPage from './pages/TeamsPage';
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
import AdminDashboard from './components/Admin/AdminDashboard';
import DashboardPage from './pages/DashboardPage';
import TeamDetailPage from './pages/TeamDetailPage';
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <div className="app-container">
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/ergebnisse" element={<ResultsPage />} />
              <Route path="/platzreservierung" element={<BookingOverview />} />
              <Route path="/login" element={<LoginPage />} />

              {/* --- NEUE ADMIN ROUTEN --- */}
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/:tab" element={<AdminBoardWrapper />} />
              <Route path="/admin" element={<AdminDashboard />} />

              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/board" element={<UserBoard />} />
              <Route path="/historie" element={<HistoryPage />} />
              <Route path="/kontakt" element={<ContactPage />} />
              <Route path="/teams" element={<TeamsPage />} />
              <Route path="/impressum" element={<ImpressumPage />} />
              <Route path="/datenschutz" element={<PrivacyPage />} />
              <Route path="/ueberuns" element={<VenuesPage />} />
              <Route path="/regeln" element={<RulesPage />} />
              <Route path="/team" element={<TeamPage />} />
              <Route path="/team/:teamId" element={<TeamDetailPage />} />
              <Route path="/ergebnis-bestaetigen" element={<ResultConfirmationPage />} />
              <Route path="/spiel-verwaltung" element={<GameManagementPage />} />

              {/* Die Catch-all Route muss immer am Ende stehen */}
              <Route path="*" element={<HomePage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
