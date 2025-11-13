const express = require('express');
const router = express.Router();
const resultService = require('../services/resultService');
const { checkAuth, checkAdmin } = require('../middleware/authMiddleware');
const { checkCaptainOfActingTeam } = require('../middleware/permissionMiddleware');

// --- ÖFFENTLICHE ROUTEN ---

// Neueste bestätigte Ergebnisse einer Saison (öffentlich)
router.get('/public/season/:seasonId', async (req, res) => {
    try {
        const { seasonId } = req.params;
        if (!seasonId) {
            return res.status(400).json({ message: 'seasonId ist erforderlich.' });
        }
        const results = await resultService.getResultsForSeason(seasonId);
        const confirmedResults = results.filter(result => result.status === 'confirmed');
        res.status(200).json(confirmedResults);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- ADMIN ROUTEN ---

// NEU: Admin erstellt ein neues, bestätigtes Ergebnis
router.post('/admin/create', checkAuth, checkAdmin, async (req, res) => {
    try {
        const newResult = await resultService.adminCreateResult(req.body, req.user.uid);
        res.status(201).json(newResult);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// NEU: Admin aktualisiert ein Ergebnis
router.put('/admin/:id', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updatedResult = await resultService.adminUpdateResult(id, req.body, req.user.uid);
        res.status(200).json(updatedResult);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// NEU: Admin löscht ein Ergebnis
router.delete('/admin/:id', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await resultService.adminDeleteResult(id);
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});


// Ein Team meldet ein Ergebnis für ein Spiel
// POST /api/results/report/:bookingId
router.post('/report/:bookingId', checkAuth, async (req, res) => {
    try {
        const { bookingId } = req.params;
        const resultData = {
            ...req.body,
            reportedByUserId: req.user.uid,
        };
        const result = await resultService.reportResult(bookingId, resultData);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Ein Team reagiert auf ein gemeldetes Ergebnis
// POST /api/results/:resultId/action
router.post('/:resultId/action', checkAuth, async (req, res) => {
    try {
        const { resultId } = req.params;
        const { actingTeamId, action, reason } = req.body;
        const result = await resultService.handleResultAction(resultId, actingTeamId, req.user.uid, action, reason);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Alle strittigen Ergebnisse abrufen
router.get('/disputed', checkAuth, checkAdmin, async (req, res) => {
    try {
        const results = await resultService.getDisputedResults();
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// NEU: Alle Ergebnisse einer Saison abrufen (für das Adminboard)
// GET /api/results/season/:seasonId
router.get('/season/:seasonId', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { seasonId } = req.params;
        const results = await resultService.getResultsForSeason(seasonId);
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Ein Ergebnis durch einen Admin final entscheiden
router.post('/:id/admin-override', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { homeScore, awayScore } = req.body;
        const result = await resultService.adminOverrideResult(id, { homeScore, awayScore }, req.user.uid);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// --- TEAM ROUTEN ---

// NEU: Alle ausstehenden Ergebnisbestätigungen für mein Team abrufen
// GET /api/results/team/pending
router.get('/team/pending', checkAuth, async (req, res) => {
    try {
        const teamId = req.user.teamId;
        if (!teamId) return res.status(200).json([]);

        const pendingResults = await resultService.getResultsByStatusForTeam(teamId, 'pending');
        res.status(200).json(pendingResults);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Alle Ergebnisse des eigenen Teams abrufen (für das Teamboard)
router.get('/team/:teamId', checkAuth, async (req, res) => {
    try {
        const { teamId } = req.params;
        const results = await resultService.getResultsForTeam(teamId);
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// NEU: Ein Ergebnis korrigieren/aktualisieren
// PUT /api/results/:resultId
router.put('/:resultId', checkAuth, async (req, res) => {
    try {
        const { resultId } = req.params;
        const updatedResult = await resultService.updateResult(resultId, req.body, req.user);
        res.status(200).json(updatedResult);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;