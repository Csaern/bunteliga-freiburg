const express = require('express');
const router = express.Router();
const BookingService = require('../services/bookingService');
const BookingController = require('../controllers/bookingController');
const { checkAuth, checkAdmin, checkCaptainOfActingTeam } = require('../middleware/authMiddleware');

// --- ÖFFENTLICHE ROUTEN ---

// Holt alle verfügbaren Buchungen für eine Saison (OHNE Authentifizierung erforderlich)
router.get('/public/available/:seasonId', async (req, res) => {
    try {
        const bookings = await BookingService.getBookingsForSeason(req.params.seasonId);
        // Filtere nur verfügbare Buchungen: status === 'available' ODER (isAvailable === true UND keine Teams)
        const availableBookings = bookings.filter(booking => {
            return booking.status === 'available' ||
                (booking.isAvailable === true && !booking.homeTeamId && !booking.awayTeamId);
        });
        res.status(200).json(availableBookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Holt ALLE Buchungen (inkl. belegter) für eine Saison (OHNE Authentifizierung erforderlich)
router.get('/public/season/:seasonId', async (req, res) => {
    try {
        const bookings = await BookingService.getBookingsForSeason(req.params.seasonId);
        res.status(200).json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- ADMIN ROUTEN ---

// Holt alle Buchungen für eine Saison (eingeloggt ausreichend)
router.get('/season/:seasonId', checkAuth, async (req, res) => {
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

// --- TEAM ROUTEN ---
// Ein Team fordert einen verfügbaren Spieltermin an
router.post('/:bookingId/request', checkAuth, async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { homeTeamId, awayTeamId, friendly } = req.body; // NEU: friendly
        const result = await BookingService.requestBookingSlot(bookingId, homeTeamId, awayTeamId, req.user.uid, friendly);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Ein Team reagiert auf eine Spielanfrage (annehmen/ablehnen)
router.post('/:bookingId/action', checkAuth, async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { action, reason } = req.body;
        const actingTeamId = req.user.teamId;

        if (!actingTeamId) {
            return res.status(400).json({ message: 'Kein Team dem Benutzer zugeordnet.' });
        }

        const result = await BookingService.handleBookingAction(bookingId, actingTeamId, action, reason);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Buchungen, für die mein Team ein Ergebnis melden muss (vergangene, bestätigte Spiele ohne Ergebnis)
router.get('/needs-result/my-team', checkAuth, async (req, res) => {
    try {
        const { seasonId } = req.query;
        const teamId = req.user.teamId;
        if (!seasonId) return res.status(400).json({ message: 'seasonId ist erforderlich.' });
        if (!teamId) return res.status(200).json([]);
        const bookings = await BookingService.getBookingsNeedingResultForTeam(seasonId, teamId);
        res.status(200).json(bookings);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Bevorstehende Spiele (kommende Buchungen) für mein Team
router.get('/upcoming/my-team', checkAuth, async (req, res) => {
    try {
        const { seasonId } = req.query;
        const teamId = req.user.teamId;
        if (!seasonId) return res.status(400).json({ message: 'seasonId ist erforderlich.' });
        if (!teamId) return res.status(200).json([]);

        // Verwende die neue Service-Methode, die direkt aus der Datenbank filtert
        const upcoming = await BookingService.getUpcomingBookingsForTeam(seasonId, teamId);

        res.status(200).json(upcoming);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Bevorstehende Spiele (kommende Buchungen) für ein angegebenes Team (per teamId)
router.get('/upcoming/team/:teamId', checkAuth, async (req, res) => {
    try {
        const { seasonId } = req.query;
        const { teamId } = req.params;
        if (!seasonId) return res.status(400).json({ message: 'seasonId ist erforderlich.' });
        if (!teamId) return res.status(400).json({ message: 'teamId ist erforderlich.' });

        // Verwende die neue Service-Methode, die direkt aus der Datenbank filtert
        const upcoming = await BookingService.getUpcomingBookingsForTeam(seasonId, teamId);

        res.status(200).json(upcoming);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Team: Buchung absagen
router.post('/:bookingId/cancel', checkAuth, async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { reason } = req.body;
        const cancellingTeamId = req.user.teamId;

        if (!cancellingTeamId) {
            return res.status(400).json({ message: 'Kein Team dem Benutzer zugeordnet.' });
        }

        const result = await BookingService.initiateCancellation(bookingId, cancellingTeamId, reason);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;