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
// Die aktuell aktive Saison abrufen (ÖFFENTLICH, ohne Authentifizierung)
router.get('/public/active', async (req, res) => {
    try {
        const activeSeason = await seasonService.getActiveSeason();
        res.status(200).json(activeSeason || null);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Alle Saisons abrufen (ÖFFENTLICH)
router.get('/public/list', async (req, res) => {
    try {
        const seasons = await seasonService.getAllSeasons();
        res.status(200).json(seasons);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Einzelne Saison abrufen (ÖFFENTLICH)
router.get('/public/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const season = await seasonService.getSeasonById(id);
        res.status(200).json(season);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});

// Tabelle abrufen (ÖFFENTLICH)
router.get('/public/:id/table', async (req, res) => {
    try {
        const { id } = req.params;
        const simulated = req.query.simulated === 'true';
        const table = await tableService.calculateTable(id, simulated);
        res.status(200).json(table);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Die aktuell aktive Saison abrufen (authentifiziert)
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

// NEU: Route zum Aktualisieren einer Saison
router.put('/:id', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await seasonService.updateSeason(id, req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
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

// NEU: Eine Saison beenden
router.put('/:id/finish', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const adminUid = req.user.uid; // UID aus dem Token holen
        const result = await seasonService.finishSeason(id, adminUid);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// NEU: Eine Saison als die aktuell aktive festlegen
router.post('/:id/set-current', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await seasonService.setCurrentSeason(id);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Fehler beim Festlegen der aktiven Saison.', error: error.message });
    }
});

// NEU: Eine Saison archivieren
router.put('/:id/archive', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await seasonService.archiveSeason(id);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// NEU: Eine Saison abrechnen (setzt evaluated = true, Status bleibt active)
router.put('/:id/evaluate', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const adminUid = req.user.uid;
        const result = await seasonService.evaluateSeason(id, adminUid);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// NEU: Eine Saison und alle zugehörigen Daten löschen
router.delete('/:id', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const adminUid = req.user.uid;
        const result = await seasonService.deleteSeasonWithAllData(id, adminUid);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;