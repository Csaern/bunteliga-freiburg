const express = require('express');
const router = express.Router();
const bookingService = require('../services/bookingService');
const resultService = require('../services/resultService');
const { checkAuth, checkAdmin } = require('../middleware/authMiddleware');
const { checkCaptainOfActingTeam } = require('../middleware/permissionMiddleware');

// --- ÖFFENTLICHE ROUTEN ---

// Die nächsten 5 anstehenden Spiele abrufen
router.get('/upcoming', async (req, res) => {
    try {
        const upcomingBookings = await bookingService.getUpcomingBookings();
        res.status(200).json(upcomingBookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Die 5 letzten Spielergebnisse abrufen
router.get('/recent', async (req, res) => {
    try {
        const recentResults = await resultService.getRecentResults();
        res.status(200).json(recentResults);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Alle Spiele einer Saison abrufen, optional nach Team gefiltert
router.get('/season/:seasonId', async (req, res) => {
    try {
        const { seasonId } = req.params;
        const { teamId } = req.query;
        const bookings = await bookingService.getBookingsForSeason(seasonId, teamId);
        res.status(200).json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- ADMIN ROUTEN ---

// Leere Spieltermine für eine Saison erstellen
router.post('/bulk-create', checkAuth, checkAdmin, async (req, res) => {
    try {
        const result = await bookingService.bulkCreateAvailableSlots(req.body, req.user.uid);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// --- TEAM/KAPITÄN ROUTEN ---

// Eine individuelle Buchung erstellen
router.post('/custom', checkAuth, async (req, res) => {
    try {
        const newBooking = await bookingService.createCustomBooking(req.body, req.user);
        res.status(201).json(newBooking);
    } catch (error) {
        if (error.message.includes('Du kannst') || error.message.includes('Du bist kein Kapitän')) {
            return res.status(403).json({ message: error.message });
        }
        res.status(400).json({ message: error.message });
    }
});

// Einen verfügbaren Spieltermin anfragen
router.post('/:id/request', checkAuth, checkCaptainOfActingTeam, async (req, res) => {
    try {
        const { id } = req.params;
        const { homeTeamId, awayTeamId } = req.body;
        const result = await bookingService.requestBookingSlot(id, homeTeamId, awayTeamId, req.user.uid);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Auf eine Spielanfrage reagieren (annehmen/ablehnen)
router.post('/:id/action', checkAuth, checkCaptainOfActingTeam, async (req, res) => {
    try {
        const { id } = req.params;
        const { actingTeamId, action, reason } = req.body;
        const result = await bookingService.handleBookingAction(id, actingTeamId, action, reason);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Eine Stornierung einleiten
router.post('/:id/initiate-cancellation', checkAuth, checkCaptainOfActingTeam, async (req, res) => {
    try {
        const { id } = req.params;
        const { actingTeamId, reason } = req.body;
        const result = await bookingService.initiateCancellation(id, actingTeamId, reason);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Auf einen Stornierungsantrag antworten
router.post('/:id/respond-cancellation', checkAuth, checkCaptainOfActingTeam, async (req, res) => {
    try {
        const { id } = req.params;
        const { actingTeamId, response, reason } = req.body;
        const result = await bookingService.respondToCancellationRequest(id, actingTeamId, response, reason);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Ein Spiel durch einen Admin final stornieren
router.post('/:id/admin-cancel', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const result = await bookingService.adminCancelBooking(id, reason, req.user.uid);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;