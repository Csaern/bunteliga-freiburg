const express = require('express');
const router = express.Router();
const teamService = require('../services/teamService');
const { checkAuth, checkAdmin, checkCaptain } = require('../middleware/authMiddleware');
const { upload, uploadToFirebase } = require('../middleware/uploadMiddleware');

// Hilfs-Middleware: Erlaube Admins ODER den Kapitänen des Teams den Zugriff
const checkAdminOrCaptain = async (req, res, next) => {
  if (req.user && req.user.admin === true) {
    return next(); // Wenn Admin, immer erlauben
  }
  // Wenn kein Admin, führe die checkCaptain-Logik aus
  return checkCaptain(req, res, next);
};

// Route zum Erstellen eines neuen Teams (Jeder angemeldete Benutzer)
// POST /api/teams
router.post('/', checkAuth, async (req, res) => {
    try {
        const teamData = {
            ...req.body,
            createdBy: req.user.uid, // Der Ersteller ist der angemeldete Benutzer
        };
        const newTeam = await teamService.createTeam(teamData);
        res.status(201).json(newTeam);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Route zum Aktualisieren von Team-Details (Admin oder Kapitän)
// PUT /api/teams/:teamId
router.put('/:teamId', checkAuth, checkAdminOrCaptain, async (req, res) => {
    try {
        const { teamId } = req.params;
        const updates = req.body;
        // Rufe die neue, erweiterte Service-Funktion auf
        const result = teamService.updateTeamAndPropagateNameChange(teamId, updates);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Route zum Löschen eines Teams (Nur Admins)
// DELETE /api/teams/:teamId
router.delete('/:teamId', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { teamId } = req.params;
        const result = await teamService.deleteTeam(teamId);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Route zum Hochladen eines Team-Logos (Admin oder Kapitän)
// POST /api/teams/:teamId/logo
router.post(
  '/:teamId/logo',
  checkAuth,
  checkAdminOrCaptain,
  upload.single('teamLogo'),
  uploadToFirebase('team-logos'),
  async (req, res) => {
    try {
      if (!req.file || !req.file.firebaseUrl) {
        return res.status(400).json({ message: 'Keine Datei hochgeladen oder Upload fehlgeschlagen.' });
      }
      
      const { teamId } = req.params;
      const logoUrl = req.file.firebaseUrl;

      const result = await teamService.updateTeamLogo(teamId, logoUrl);
      res.status(200).json(result);

    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;