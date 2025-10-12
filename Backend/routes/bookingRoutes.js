const express = require('express');
const router = express.Router();
const bookingService = require('../services/bookingService');
const { checkAuth, checkAdmin } = require('../middleware/authMiddleware');

// Route zur Bulk-Erstellung von leeren Spielterminen (nur für Admins)
// POST /api/bookings/bulk-create
router.post('/bulk-create', checkAuth, checkAdmin, async (req, res) => {
  try {
    const adminUid = req.user.uid;
    const result = await bookingService.bulkCreateAvailableSlots(req.body, adminUid);
    res.status(201).json(result);
  } catch (error) {
    console.error('Fehler bei der Bulk-Erstellung von Buchungen:', error);
    res.status(400).json({ message: error.message });
  }
});

// Route für ein Team, um einen verfügbaren Slot anzufragen
// POST /api/bookings/:bookingId/request
router.post('/:bookingId/request', checkAuth, async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { homeTeamId, awayTeamId } = req.body;
        const requestingUserId = req.user.uid;
        const result = await bookingService.requestBookingSlot(bookingId, homeTeamId, awayTeamId, requestingUserId);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Route für ein Team, um eine Anfrage anzunehmen oder abzulehnen
// POST /api/bookings/:bookingId/action
router.post('/:bookingId/action', checkAuth, async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { actingTeamId, action } = req.body; // action: 'confirm' or 'deny'
        const result = await bookingService.handleBookingAction(bookingId, actingTeamId, action);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Route für ein Team, um ein bestätigtes Spiel zu stornieren
// POST /api/bookings/:bookingId/cancel
router.post('/:bookingId/cancel', checkAuth, async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { cancellingTeamId } = req.body;
        const result = await bookingService.cancelConfirmedBooking(bookingId, cancellingTeamId);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;