const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const { checkAuth, checkAdmin } = require('../middleware/authMiddleware');

// Alle Benutzer auflisten (NUR ADMINS)
// GET /api/users
router.get('/', checkAuth, checkAdmin, async (req, res) => {
    try {
        const users = await userService.getAllUsers();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Die Rolle eines Benutzers ändern (NUR ADMINS)
// PUT /api/users/:uid/role
router.put('/:uid/role', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { uid } = req.params;
        const { roles } = req.body; // z.B. { "admin": true }
        const result = await userService.updateUserRole(uid, roles);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Einen Benutzer deaktivieren/reaktivieren (NUR ADMINS)
// PUT /api/users/:uid/disable
router.put('/:uid/disable', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { uid } = req.params;
        // Body sollte { disabled: true } oder { disabled: false } enthalten
        const { disabled } = req.body; 
        const result = await userService.setUserDisabledStatus(uid, disabled);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;