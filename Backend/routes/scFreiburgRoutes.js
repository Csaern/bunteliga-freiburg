const express = require('express');
const router = express.Router();
const ScFreiburgService = require('../services/scFreiburgService');

// Hole gecachte Daten (fürs Frontend)
router.get('/home-games', (req, res) => {
    try {
        const dates = ScFreiburgService.getCachedHomeGameDates();
        res.status(200).json(dates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Admin-Route, um Sync manuell zu triggern (falls nötig)
const { checkAuth, checkAdmin } = require('../middleware/authMiddleware');
router.post('/sync', checkAuth, checkAdmin, async (req, res) => {
    try {
        const dates = await ScFreiburgService.syncMatchData();
        res.status(200).json({ message: 'Sync erfolgreich', dates });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
