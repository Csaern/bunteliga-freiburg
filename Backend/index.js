// 1. Benötigte Bibliotheken importieren
const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
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
const port = config.port;

app.use(cors({
  origin: config.corsOrigin
}));

app.use(express.json());

// Request Logger Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// NEU: Statische Dateien aus dem 'uploads'-Verzeichnis bereitstellen
// Jede Anfrage an /uploads/... wird nun auf den lokalen 'uploads'-Ordner abgebildet
// Caching hinzugefügt (7 Tage), da Team-Logos sich selten ändern
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  immutable: true
}));

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
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ["GET", "POST"]
  }
});

// Initialize Socket in NotificationService
const notificationService = require('./services/notificationService');
notificationService.initSocket(io);

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Clients (authenticated users) join their team room
  socket.on('join_team', (teamId) => {
    if (teamId) {
      socket.join(teamId);
      console.log(`✅ Socket ${socket.id} joined team room: ${teamId}`);
      console.log(`   -> Rooms for ${socket.id}:`, Array.from(socket.rooms));
    } else {
      console.warn(`⚠️ Socket ${socket.id} tried to join empty teamId!`);
    }
  });

  socket.on('leave_team', (teamId) => {
    if (teamId) {
      socket.leave(teamId);
      console.log(`Socket ${socket.id} left team room: ${teamId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(port, () => {
  console.log(`Bunte Liga Freiburg Backend läuft auf http://localhost:${port}`);
});

// Force restart trigger