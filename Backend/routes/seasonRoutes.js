const express = require('express');
const router = express.Router();
const seasonService = require('../services/seasonService');
const { checkAuth, checkAdmin } = require('../middleware/authMiddleware');

// Alle Routen in dieser Datei sind jetzt automatisch unter dem Pfad '/api/seasons' erreichbar.

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

// Route zum Beenden einer Saison
// POST /api/seasons/:seasonId/finish
router.post('/:seasonId/finish', checkAuth, checkAdmin, async (req, res) => {
  try {
    const { seasonId } = req.params;
    const adminUid = req.user.uid;
    const result = await seasonService.finishSeason(seasonId, adminUid);
    res.status(200).json(result);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

module.exports = router;