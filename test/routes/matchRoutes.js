const express = require('express');
const router = express.Router();
const BookingService = require('../services/bookingService');
const { checkAuth } = require('../middleware/authMiddleware');

// Ein Team fordert einen verfügbaren offiziellen Spieltermin an (Neues Spiel Assistent)
router.post('/request-official', checkAuth, async (req, res) => {
    try {
        const { slotId, homeTeamId, awayTeamId, friendly } = req.body;
        
        if (!slotId) return res.status(400).json({ message: 'slotId fehlt.' });
        if (!homeTeamId || !awayTeamId) return res.status(400).json({ message: 'homeTeamId und awayTeamId werden benötigt.' });

        // Wir nutzen den bestehenden BookingService, um die Stabilität des Systems zu gewährleisten,
        // haben aber eine dedizierte Route für die Zukunft geschaffen.
        const result = await BookingService.requestBookingSlot(
            slotId, 
            homeTeamId, 
            awayTeamId, 
            req.user.uid, 
            friendly
        );
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Team erstellt eine individuelle Spielanfrage auf eigenem Platz (Neues Spiel Assistent)
router.post('/create-custom', checkAuth, async (req, res) => {
    try {
        // req.body enthält: pitchId, homeTeamId, awayTeamId, seasonId, date, time, duration, friendly
        const result = await BookingService.createCustomBooking(req.body, req.user);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
