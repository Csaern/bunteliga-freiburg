const express = require('express');
const router = express.Router();
const seasonService = require('../services/seasonService');
const tableService = require('../services/tableService');
const { checkAuth, checkAdmin } = require('../middleware/authMiddleware');

// --- ADMIN ROUTEN ---
// Alle Saisons abrufen (für Adminboard)
router.get('/', checkAuth, checkAdmin, async (req, res) => {
    try {
        const seasons = await seasonService.getAllSeasons();
        res.status(200).json(seasons);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Route zum Erstellen einer neuen Saison
// POST /api/seasons
router.post('/', checkAuth, checkAdmin, async (req, res) => {
  try {
    const seasonData = {
      ...req.body,
      createdBy: req.user.uid, // Die UID des Admins aus dem Token holen
    };
    const newSeason = await seasonService.createSeason(seasonData);
    res.status(201).json(newSeason);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Route zum Ändern des Status eines Teams in einer Saison
// PUT /api/seasons/:seasonId/teams/:teamId
router.put('/:seasonId/teams/:teamId', checkAuth, checkAdmin, async (req, res) => {
  try {
    const { seasonId, teamId } = req.params;
    const { newStatus } = req.body; // z.B. { "newStatus": "inactive" }
    if (!newStatus) {
        return res.status(400).json({ message: 'newStatus is required.' });
    }
    const result = await seasonService.updateTeamStatusInSection(seasonId, teamId, newStatus);
    res.status(200).json(result);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

// --- TEAM & ÖFFENTLICHE ROUTEN ---
// Die aktuell aktive Saison abrufen
// WICHTIG: Diese Route muss VOR der allgemeinen '/:id' Route stehen.
router.get('/active', checkAuth, async (req, res) => {
    try {
        const activeSeason = await seasonService.getActiveSeason();
        if (!activeSeason) {
            // Wir senden 200 mit einem leeren Objekt, damit das Frontend das einfach handhaben kann.
            return res.status(200).json(null);
        }
        res.status(200).json(activeSeason);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Eine einzelne Saison abrufen (wird auch für Admins nützlich sein)
// GET /api/seasons/:id
router.get('/:id', checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const season = await seasonService.getSeasonById(id);
        res.status(200).json(season);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});

// Route für die LIVE-Tabelle (ohne finale Regeln)
// GET /api/seasons/:id/table
router.get('/:id/table', checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const liveTable = await tableService.calculateTable(id, false);
        res.status(200).json(liveTable);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// NEU: Route für die PROVISORISCHE ABSCHLUSS-Tabelle (mit finalen Regeln)
// GET /api/seasons/:id/provisional-table
router.get('/:id/provisional-table', checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const provisionalTable = await tableService.calculateTable(id, true);
        res.status(200).json(provisionalTable);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// NEU: Route zum finalen Beenden einer Saison (nur Admins)
// POST /api/seasons/:id/finish
router.post('/:id/finish', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await seasonService.finishSeason(id, req.user.uid);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;