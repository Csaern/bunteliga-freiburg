// 1. Benötigte Bibliotheken importieren
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

// --- WICHTIG: Firebase Admin SDK Initialisierung ---
const serviceAccount = require('./firebase.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
// ----------------------------------------------------

// --- Middleware importieren (NACH der Initialisierung) ---
const { checkAuth, checkCaptain, checkAdmin } = require('./middleware/authMiddleware'); // checkAdmin hier importieren

// --- Routen importieren ---
const seasonRoutes = require('./routes/seasonRoutes'); // Die neue Routen-Datei importieren
const teamRoutes = require('./routes/teamRoutes'); // NEU
const pitchRoutes = require('./routes/pitchRoutes'); // <-- DIESE ZEILE AUSKOMMENTIEREN
const bookingRoutes = require('./routes/bookingRoutes'); // NEU
const resultRoutes = require('./routes/resultRoutes'); // NEU
const userService = require('./services/userService'); // Falls du User-Routen hier hast

const db = getFirestore();

// 2. Eine Express-Anwendung erstellen
const app = express();

// 3. Den Port definieren
const port = 3001;

// --- Middleware hinzufügen ---
app.use(cors());
app.use(express.json());
// ---------------------------


// --- Routen-Definitionen ---

// Öffentliche Routen
app.get('/', (req, res) => {
  res.send('Dein Node.js Server läuft!');
});

// Geschützte Routen hier einbinden
// Alle Anfragen an '/api/seasons' werden an unseren neuen, sicheren Router weitergeleitet.
app.use('/api/seasons', seasonRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/pitches', pitchRoutes);
app.use('/api/bookings', bookingRoutes); // NEU
app.use('/api/results', resultRoutes); // NEU


// 5. Den Server starten
app.listen(port, () => {
  console.log(`Server erfolgreich gestartet und lauscht auf http://localhost:${port}`);
});