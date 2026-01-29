const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const { checkAuth } = require('../middleware/authMiddleware');

/**
 * GET /api/notifications
 * Holt alle (ungelesenen) Benachrichtigungen für das Team des Benutzers
 */
router.get('/', checkAuth, async (req, res) => {
    try {
        const teamId = req.user.teamId;
        if (!teamId) {
            return res.status(200).json([]);
        }
        const notifications = await notificationService.getUnreadNotificationsForTeam(teamId);
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * PUT /api/notifications/:id/read
 * Markiert eine Benachrichtigung als gelesen
 */
router.put('/:id/read', checkAuth, async (req, res) => {
    try {
        const { id } = req.params;
        await notificationService.markAsRead(id);
        res.status(200).json({ message: 'Benachrichtigung als gelesen markiert.' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * PUT /api/notifications/read-all
 * Markiert alle Benachrichtigungen des Teams als gelesen
 */
router.put('/read-all', checkAuth, async (req, res) => {
    try {
        const teamId = req.user.teamId;
        if (!teamId) {
            return res.status(400).json({ message: 'Kein Team zugeordnet.' });
        }
        await notificationService.markAllAsReadForTeam(teamId);
        res.status(200).json({ message: 'Alle Benachrichtigungen als gelesen markiert.' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
