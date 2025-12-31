const express = require('express');
const router = express.Router();
const teamService = require('../services/teamService');
const userService = require('../services/userService');
const { checkAuth, checkAdmin } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// GET /api/teams
router.get('/', async (req, res) => {
    try {
        const teams = await teamService.getAllTeams();
        res.status(200).json(teams);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/teams/active-season
router.get('/active-season', async (req, res) => {
    try {
        const teams = await teamService.getTeamsForActiveSeason();
        res.status(200).json(teams);
    } catch (error) {
        res.status(error.message === 'Keine aktive Saison gefunden.' ? 404 : 500).json({ message: error.message });
    }
});

// GET /api/teams/season/:seasonId
router.get('/season/:seasonId', async (req, res) => {
    try {
        const { seasonId } = req.params;
        const teams = await teamService.getTeamsForSeason(seasonId);
        res.status(200).json(teams);
    } catch (error) {
        console.error('Fehler in GET /api/teams/season/:seasonId:', error);
        res.status(error.message === 'Saison nicht gefunden.' ? 404 : 500).json({ message: error.message });
    }
});

// GET /api/teams/:teamId/potential-opponents
router.get('/:teamId/potential-opponents', async (req, res) => {
    try {
        const { teamId } = req.params;
        const isFriendly = req.query.isFriendly === 'true'; // NEU
        const opponents = await teamService.getPotentialOpponents(teamId, isFriendly);
        res.status(200).json(opponents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/teams/:teamId/stats/:seasonId
router.get('/:teamId/stats/:seasonId', async (req, res) => {
    try {
        const { teamId, seasonId } = req.params;
        const stats = await teamService.getTeamStats(teamId, seasonId);
        res.status(200).json(stats);
    } catch (error) {
        console.error('Fehler beim Abrufen der Team-Statistiken:', error);
        res.status(500).json({ message: error.message });
    }
});

// GET /api/teams/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const team = await teamService.getTeamById(id);
        res.status(200).json(team);
    } catch (error) {
        res.status(error.message === 'Team nicht gefunden.' ? 404 : 500).json({ message: error.message });
    }
});

// POST /api/teams
router.post('/', checkAuth, async (req, res) => {
    try {
        const teamData = {
            ...req.body,
            createdBy: req.user.uid,
        };
        const newTeam = await teamService.createTeam(teamData);
        res.status(201).json(newTeam);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// PUT /api/teams/:teamId
router.put('/:teamId', checkAuth, async (req, res) => {
    try {
        const { teamId } = req.params;
        const result = await teamService.updateTeam(teamId, req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE /api/teams/:teamId
router.delete('/:teamId', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { teamId } = req.params;
        const result = await teamService.deleteTeam(teamId);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/teams/:teamId/logo
router.post(
    '/:teamId/logo',
    checkAuth,
    upload.single('teamLogo'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'Keine Datei hochgeladen.' });
            }

            const { teamId } = req.params;
            const logoType = req.query.type || 'dark'; // NEU: 'light' oder 'dark' (default)
            const outputFilename = `${teamId}-${logoType}-${Date.now()}.webp`; // NEU: Typ im Dateinamen
            const outputPath = path.join(__dirname, '..', 'uploads', 'team-logos', outputFilename);

            await sharp(req.file.buffer)
                .resize({ width: 128, height: 128, fit: 'inside' })
                .webp({ quality: 80 })
                .toFile(outputPath);

            const relativePath = `/uploads/team-logos/${outputFilename}`;

            const updatedTeam = await teamService.updateTeamLogo(teamId, relativePath, logoType); // NEU: Typ übergeben
            res.status(200).json(updatedTeam);

        } catch (error) {
            console.error('Fehler beim Logo-Upload:', error);
            res.status(500).json({ message: 'Fehler bei der Bildverarbeitung.' });
        }
    }
);

// POST /api/teams/:teamId/captains
router.post('/:teamId/captains', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { teamId } = req.params;
        const { userId } = req.body;
        const result = await userService.addCaptainToTeam(userId, teamId);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE /api/teams/:teamId/captains/:userId
router.delete('/:teamId/captains/:userId', checkAuth, checkAdmin, async (req, res) => {
    try {
        const { teamId, userId } = req.params;
        const result = await userService.removeCaptainFromTeam(userId, teamId);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;