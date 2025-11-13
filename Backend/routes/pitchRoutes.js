const express = require('express');
const router = express.Router();
const pitchService = require('../services/pitchService');
const { checkAuth, checkAdmin } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const pitchUploadDir = 'uploads/pitches';
fs.mkdirSync(pitchUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, pitchUploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.params.pitchId}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage: storage });

// --- ÖFFENTLICHE ROUTEN ---
// Alle Plätze abrufen (ÖFFENTLICH, ohne Authentifizierung)
router.get('/public', async (req, res) => {
    try {
        const pitches = await pitchService.getAllPitches();
        // Gib nur verifizierte und nicht archivierte Plätze zurück
        const verified = pitches.filter(p => p.isVerified && !p.isArchived);
        res.status(200).json(verified);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- AUTHENTIFIZIERTE ROUTEN ---
// Verifizierte Plätze für eingeloggte Nutzer
router.get('/verified', checkAuth, async (req, res) => {
    try {
        const pitches = await pitchService.getAllPitches();
        const verified = pitches.filter(p => p.isVerified && !p.isArchived);
        res.status(200).json(verified);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- ADMIN ROUTEN ---
router.get('/all-admin', checkAuth, checkAdmin, async (req, res) => {
    try {
        const pitches = await pitchService.getAllPitches();
        res.status(200).json(pitches);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/', checkAuth, checkAdmin, async (req, res) => {
    try {
        const newPitch = await pitchService.createPitch(req.body, req.user);
        res.status(201).json(newPitch);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.put('/:pitchId', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { pitchId } = req.params;
        const updatedPitch = await pitchService.updatePitch(pitchId, req.body);
        res.status(200).json(updatedPitch);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// KORREKTUR: Die DELETE-Route wird durch eine semantisch korrekte PUT-Route für die Archivierung ersetzt.
router.put('/:pitchId/archive', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { pitchId } = req.params;
        await pitchService.archivePitch(pitchId);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post(
  '/:pitchId/image',
  checkAuth,
  checkAdmin,
  upload.single('pitchImage'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Keine Datei hochgeladen.' });
      }
      const { pitchId } = req.params;
      const relativePath = `/${req.file.path.replace(/\\/g, '/')}`;
      const result = await pitchService.updatePitchImage(pitchId, relativePath);
      res.status(200).json(result);
      
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

module.exports = router;