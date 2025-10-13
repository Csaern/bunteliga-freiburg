const express = require('express');
const router = express.Router();
const pitchService = require('../services/pitchService');
const { checkAuth, checkAdmin } = require('../middleware/authMiddleware');
const { checkPitchOwnership } = require('../middleware/permissionMiddleware');
const { upload, uploadToFirebase } = require('../middleware/uploadMiddleware');

// =================================================================
// DATEN-LADE ROUTEN (GET)
// =================================================================

// ROUTE 1: Für die ÖFFENTLICHE Ansicht (z.B. "Alle Plätze"-Seite)
// GET /api/pitches/verified
router.get('/verified', async (req, res) => {
    try {
        // Holt nur die offiziellen, von der Liga verifizierten Plätze
        const pitches = await pitchService.getVerifiedPitches();
        res.status(200).json(pitches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ROUTE 2: Für das TEAMBOARD (Kapitäne & Admins in ihrer Kapitänsrolle)
// GET /api/pitches/my-team
router.get('/my-team', checkAuth, async (req, res) => {
    try {
        // Holt nur die Plätze, die zum Team des eingeloggten Benutzers gehören
        const teamId = req.user.teamId;
        const pitches = await pitchService.getPitchesForTeam(teamId);
        res.status(200).json(pitches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ROUTE 3: Für das ADMINBOARD
// GET /api/pitches/all-admin
router.get('/all-admin', checkAuth, checkAdmin, async (req, res) => {
    try {
        // Holt absolut ALLE Plätze aus der Datenbank
        const pitches = await pitchService.getAllPitches();
        res.status(200).json(pitches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


// =================================================================
// AKTIONEN (POST, PUT, DELETE)
// =================================================================

// Einen neuen Platz für das eigene Team erstellen
router.post('/', checkAuth, async (req, res) => {
    try {
        const newPitch = await pitchService.createPitch(req.body, req.user);
        res.status(201).json(newPitch);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Einen Platz aktualisieren (NUR Besitzer oder Admin)
router.put('/:pitchId', checkAuth, checkPitchOwnership, async (req, res) => {
    try {
        const { pitchId } = req.params;
        const result = await pitchService.updatePitch(pitchId, req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(error.message === 'Platz nicht gefunden.' ? 404 : 400).json({ message: error.message });
    }
});

// Einen Platz löschen (NUR Besitzer oder Admin)
router.delete('/:pitchId', checkAuth, checkPitchOwnership, async (req, res) => {
    try {
        const { pitchId } = req.params;
        await pitchService.deletePitch(pitchId);
        res.status(200).json({ message: 'Platz erfolgreich gelöscht.' });
    } catch (error) {
        res.status(error.message === 'Platz nicht gefunden.' ? 404 : 500).json({ message: error.message });
    }
});

// Bild für einen Platz hochladen (NUR Admin)
router.post(
  '/:pitchId/image',
  checkAuth,
  checkAdmin,
  upload.single('pitchImage'),
  uploadToFirebase,
  async (req, res) => {
    try {
      const { pitchId } = req.params;
      const imageUrl = req.file.firebaseUrl;
      const result = await pitchService.updatePitchImage(pitchId, imageUrl);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

module.exports = router;