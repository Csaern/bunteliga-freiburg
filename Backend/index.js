// 1. Benötigte Bibliotheken importieren
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// --- WICHTIG: Firebase Admin SDK Initialisierung ---
const serviceAccount = require('./firebase.json');

initializeApp({
  credential: cert(serviceAccount)
});
// ----------------------------------------------------

// --- Middleware importieren (NACH der Initialisierung) ---
const { checkAuth, checkCaptain, checkAdmin } = require('./middleware/authMiddleware'); // checkAdmin hier importieren

// --- Routen importieren ---
const seasonRoutes = require('./routes/seasonRoutes');
const teamRoutes = require('./routes/teamRoutes');
const pitchRoutes = require('./routes/pitchRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const resultRoutes = require('./routes/resultRoutes');
const userRoutes = require('./routes/userRoutes');
const newsRoutes = require('./routes/newsRoutes');
const websiteRoutes = require('./routes/websiteRoutes');
const systemRoutes = require('./routes/systemRoutes');
const notificationRoutes = require('./routes/notificationRoutes');


const db = getFirestore();

// 2. Eine Express-Anwendung erstellen
const app = express();
const port = process.env.PORT || 3001; // KORREKTUR: Diese Zeile fehlte.

app.use(cors({
  origin: 'http://localhost:3000'
}));

app.use(express.json());

// Request Logger Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// NEU: Statische Dateien aus dem 'uploads'-Verzeichnis bereitstellen
// Jede Anfrage an /uploads/... wird nun auf den lokalen 'uploads'-Ordner abgebildet
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Routen-Definitionen ---

// Öffentliche Routen
app.get('/', (req, res) => {
  res.send('Dein Node.js Server läuft!');
});

// Geschützte Routen hier einbinden
// Alle Anfragen an '/api/seasons' werden an unseren neuen, sicheren Router weitergeleitet.
app.use('/api/seasons', seasonRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/pitches', pitchRoutes); // KORREKTUR: Sicherstellen, dass diese Zeile aktiv ist
app.use('/api/bookings', bookingRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/users', userRoutes); // NEU: Benutzer-Routen registrieren
app.use('/api/news', newsRoutes); // NEU: News-Routen registrieren
app.use('/api/website', websiteRoutes); // NEU: Website-Routen registrieren
app.use('/api/system', systemRoutes); // NEU: System-Routen registrieren
app.use('/api/notifications', notificationRoutes); // NEU: Benachrichtigungen registrieren


// 5. Den Server starten
app.listen(port, () => {
  console.log(`Bunte Liga Freiburg Backend läuft auf http://localhost:${port}`);
});

// Force restart trigger