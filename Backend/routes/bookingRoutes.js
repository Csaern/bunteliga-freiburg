const express = require('express');
const router = express.Router();
const BookingService = require('../services/bookingService');
const BookingController = require('../controllers/bookingController');
const { checkAuth, checkAdmin, checkCaptainOfActingTeam } = require('../middleware/authMiddleware');

// --- ADMIN ROUTEN ---

// Holt alle Buchungen für eine Saison
router.get('/season/:seasonId', checkAuth, checkAdmin, async (req, res) => {
    try {
        const bookings = await BookingService.getBookingsForSeason(req.params.seasonId);
        res.status(200).json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// NEU: Prüft Termine für die Bulk-Erstellung auf Kollisionen
router.post('/bulk-check', checkAuth, checkAdmin, async (req, res) => {
    try {
        const checkResult = await BookingService.bulkCheckSlots(req.body);
        res.status(200).json(checkResult);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Erstellt massenhaft verfügbare Slots
router.post('/bulk-create', checkAuth, checkAdmin, async (req, res) => {
    try {
        const createdBookings = await BookingService.bulkCreateAvailableSlots(req.body, req.user);
        res.status(201).json(createdBookings);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Admin löscht eine Buchung
router.delete('/admin/:bookingId', checkAuth, checkAdmin, async (req, res) => {
    try {
        await BookingService.adminDeleteBooking(req.params.bookingId);
        res.status(204).send();
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// NEU: Holt Buchungen, für die ein Ergebnis eingetragen werden muss
router.get('/needs-result/:seasonId', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { seasonId } = req.params;
        // KORREKTUR: Der aufgerufene Service muss mit dem Import übereinstimmen (BookingService statt bookingService).
        const bookings = await BookingService.getBookingsNeedingResult(seasonId);
        res.status(200).json(bookings);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Admin erstellt eine einzelne, spezifische Buchung.
router.post('/admin/create', checkAuth, checkAdmin, async (req, res) => {
    try {
        const newBooking = await BookingService.adminCreateBooking(req.body, req.user);
        res.status(201).json(newBooking);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Admin aktualisiert eine einzelne Buchung
router.put('/admin/:bookingId', checkAuth, checkAdmin, async (req, res) => {
    try {
        const updatedBooking = await BookingService.adminUpdateBooking(req.params.bookingId, req.body);
        res.status(200).json(updatedBooking);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Einzelnen Zeitslot auf Kollision prüfen (ADMIN)
router.post('/check-single', checkAuth, checkAdmin, async (req, res) => {
    try {
        const result = await BookingService.checkSingleSlot(req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// NEU: Buchung erstellen und dabei eine alte überschreiben (ADMIN)
router.post('/create-with-overwrite', checkAuth, checkAdmin, BookingController.createBookingWithOverwrite);

// Eine einzelne Buchung aktualisieren (ADMIN)
router.put('/:id', checkAuth, checkAdmin, async (req, res) => {
    try {
        const result = await BookingService.updateBooking(req.params.id, req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;