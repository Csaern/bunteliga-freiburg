const express = require('express');
const router = express.Router();
const teamService = require('../services/teamService');
const seasonService = require('../services/seasonService'); // NEU
const userService = require('../services/userService'); // userService importieren
const { checkAuth, checkAdmin } = require('../middleware/authMiddleware');
const { upload, uploadToFirebase } = require('../middleware/uploadMiddleware');

// NEU: Alle Teams abrufen (ÖFFENTLICH)
// GET /api/teams
router.get('/', async (req, res) => {
    try {
        const teams = await teamService.getAllTeams();
        res.status(200).json(teams);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// NEU: Alle Teams einer bestimmten Saison abrufen (ÖFFENTLICH)
// GET /api/teams/season/:seasonId
router.get('/season/:seasonId', async (req, res) => {
    try {
        const { seasonId } = req.params;
        const teams = await seasonService.getTeamsBySeason(seasonId);
        res.status(200).json(teams);
    } catch (error) {
        res.status(error.message === 'Saison nicht gefunden.' ? 404 : 500).json({ message: error.message });
    }
});

// NEU: Ein einzelnes Team anhand seiner ID abrufen (ÖFFENTLICH)
// GET /api/teams/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const team = await teamService.getTeamById(id);
        res.status(200).json(team);
    } catch (error) {
        res.status(error.message === 'Team nicht gefunden.' ? 404 : 500).json({ message: error.message });
    }
});

// --- Bestehende Routen ---
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
router.put('/:id', checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;
        const updateData = req.body;

        // Fall 1: Der Benutzer ist ein Admin
        // Admins dürfen alles bearbeiten, inklusive des Namens.
        if (user.admin) {
            const result = await teamService.updateTeam(id, updateData);
            return res.status(200).json(result);
        }

        // Fall 2: Der Benutzer ist ein Teamkapitän
        const team = await teamService.getTeamById(id);
        if (team.captainId === user.uid) {
            // WICHTIG: Kapitäne dürfen den Teamnamen ('name') nicht ändern.
            // Wir entfernen das Feld aus den Update-Daten, falls es gesendet wurde.
            if (updateData.name) {
                delete updateData.name;
            }
            const result = await teamService.updateTeam(id, updateData);
            return res.status(200).json(result);
        }

        // Fall 3: Keine Berechtigung
        return res.status(403).json({ message: 'Du hast keine Berechtigung, dieses Team zu bearbeiten.' });

    } catch (error) {
        res.status(error.message === 'Team nicht gefunden.' ? 404 : 400).json({ message: error.message });
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
  checkAdmin,
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

// NEU: Einen Kapitän zu einem Team hinzufügen (Admin)
router.post('/:teamId/captains', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { teamId } = req.params;
        const { userId } = req.body;
        const result = await userService.addCaptainToTeam(userId, teamId);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// NEU: Einen Kapitän von einem Team entfernen (Admin)
router.delete('/:teamId/captains/:userId', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { teamId, userId } = req.params;
        const result = await userService.removeCaptainFromTeam(userId, teamId);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;