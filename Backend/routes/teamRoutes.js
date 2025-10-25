const express = require('express');
const router = express.Router();
const teamService = require('../services/teamService');
const userService = require('../services/userService');
const { checkAuth, checkAdmin } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');
const sharp = require('sharp'); // NEU: Bildverarbeitung importieren
const path = require('path');   // NEU: Für die Pfad-Verarbeitung
const fs = require('fs');       // NEU: Für das Dateisystem

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

// NEU: Ruft automatisch die Teams der AKTIVEN Saison ab.
// GET /api/teams/active-season
router.get('/active-season', async (req, res) => {
    try {
        const teams = await teamService.getTeamsForActiveSeason();
        res.status(200).json(teams);
    } catch (error) {
        // Wenn keine aktive Saison gefunden wird, ist das ein valider Fehler
        res.status(error.message === 'Keine aktive Saison gefunden.' ? 404 : 500).json({ message: error.message });
    }
});

// NEU: Alle Teams einer bestimmten Saison abrufen (ÖFFENTLICH)
// GET /api/teams/season/:seasonId
router.get('/season/:seasonId', async (req, res) => {
    try {
        const { seasonId } = req.params;
        // KORREKTUR: Ruft jetzt die korrekte Funktion aus dem teamService auf.
        // Dies behebt den "seasonService is not defined" Fehler endgültig.
        const teams = await teamService.getTeamsForSeason(seasonId);
        res.status(200).json(teams);
    } catch (error) {
        console.error('Fehler in GET /api/teams/season/:seasonId:', error);
        res.status(error.message === 'Saison nicht gefunden.' ? 404 : 500).json({ message: error.message });
    }
});

// NEU: Ruft die potenziellen Gegner für ein bestimmtes Team ab.
// GET /api/teams/:teamId/potential-opponents
router.get('/:teamId/potential-opponents', async (req, res) => {
    try {
        const { teamId } = req.params;
        const opponents = await teamService.getPotentialOpponents(teamId);
        res.status(200).json(opponents);
    } catch (error) {
        res.status(500).json({ message: error.message });
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

// Ein Team aktualisieren (Admin oder Kapitän)
// PUT /api/teams/:teamId
router.put('/:teamId', checkAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    // KORREKTUR: Ruft jetzt die korrekte Service-Funktion auf, die alles propagiert.
    const result = await teamService.updateTeam(teamId, req.body);
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

// KORREKTUR: Route zum Hochladen und Verarbeiten eines Team-Logos
router.post(
  '/:teamId/logo',
  checkAuth,
  upload.single('teamLogo'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Keine Datei hochgeladen.' });
      }
      
      const { teamId } = req.params;
      const outputFilename = `${teamId}-${Date.now()}.webp`;
      const outputPath = path.join(__dirname, '..', 'uploads', 'team-logos', outputFilename);

      // Bildverarbeitung: Skalieren, in WebP konvertieren und speichern
      await sharp(req.file.buffer)
        .resize({ width: 128, height: 128, fit: 'inside' }) // Skaliert auf max. 128px, behält Seitenverhältnis
        .webp({ quality: 80 }) // Konvertiert zu WebP mit 80% Qualität
        .toFile(outputPath);

      // Relativen Pfad für die Datenbank und das Frontend erstellen
      const relativePath = `/uploads/team-logos/${outputFilename}`;

      const updatedTeam = await teamService.updateTeamLogo(teamId, relativePath);
      res.status(200).json(updatedTeam);

    } catch (error) {
      console.error('Fehler beim Logo-Upload:', error);
      res.status(500).json({ message: 'Fehler bei der Bildverarbeitung.' });
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