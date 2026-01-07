const express = require('express');
const router = express.Router();
const WebsiteService = require('../services/websiteService');
const { checkAuth, checkAdmin } = require('../middleware/authMiddleware');

// Get specific settings (e.g., 'rules') - Public
router.get('/settings/:key', async (req, res) => {
    try {
        const settings = await WebsiteService.getSettings(req.params.key);
        if (!settings) {
            // Return null instead of 404 to allow frontend to handle "not set" state gracefully
            return res.json(null);
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update specific settings - Admin only
router.put('/settings/:key', checkAuth, checkAdmin, async (req, res) => {
    try {
        const settings = await WebsiteService.updateSettings(req.params.key, req.body);
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
