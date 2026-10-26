const express = require('express');
const router = express.Router();
const publicTeamService = require('../services/publicTeamService');
const { publicRateLimit, publicCache } = require('../middleware/publicApiMiddleware');

/**
 * ÖFFENTLICHE TEAM-API (für externe Vereins-Websites)
 * Basis-Pfad: /api/public
 *
 * - kein Login erforderlich, CORS offen (siehe index.js)
 * - nur lesend, Antworten werden kurz gecacht
 * - Query-Parameter `season`: Saison-ID oder 'active' (Standard)
 *
 *   GET /api/public/teams?season=active
 *   GET /api/public/teams/:teamId/table?season=active
 *   GET /api/public/teams/:teamId/matches?season=active&type=all|results|upcoming&limit=10
 */

router.use(publicRateLimit);
router.use(publicCache);

/** Basis-URL für absolute Logo-Links (konfigurierbar, sonst aus dem Request abgeleitet). */
function getBaseUrl(req) {
    if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL;
    if (process.env.API_URL) return process.env.API_URL;
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol).split(',')[0].trim();
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${proto}://${host}`;
}

function handleError(res, error) {
    const status = error instanceof publicTeamService.PublicApiError ? error.status : 500;
    if (status === 500) console.error('[PublicAPI] Fehler:', error);
    res.status(status).json({ message: status === 500 ? 'Interner Serverfehler.' : error.message });
}

// Liste der Teams einer Saison (um die eigene Team-ID herauszufinden)
router.get('/teams', async (req, res) => {
    try {
        const data = await publicTeamService.getSeasonTeams(req.query.season, getBaseUrl(req));
        res.status(200).json(data);
    } catch (error) {
        handleError(res, error);
    }
});

// Tabelle aus Sicht eines Teams
router.get('/teams/:teamId/table', async (req, res) => {
    try {
        const data = await publicTeamService.getTeamTable(req.params.teamId, req.query.season, getBaseUrl(req));
        res.status(200).json(data);
    } catch (error) {
        handleError(res, error);
    }
});

// Spiele eines Teams (Ergebnisse und/oder kommende Spiele)
router.get('/teams/:teamId/matches', async (req, res) => {
    try {
        const type = req.query.type || 'all';
        if (!['all', 'results', 'upcoming'].includes(type)) {
            return res.status(400).json({ message: "Ungültiger Parameter 'type'. Erlaubt: all, results, upcoming." });
        }

        let limit = null;
        if (req.query.limit !== undefined) {
            limit = parseInt(req.query.limit, 10);
            if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
                return res.status(400).json({ message: "Ungültiger Parameter 'limit'. Erlaubt: 1-100." });
            }
        }

        const data = await publicTeamService.getTeamMatches(
            req.params.teamId,
            req.query.season,
            { type, limit },
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        handleError(res, error);
    }
});

// Unbekannte Pfade unter /api/public nicht an das React-Catch-All weiterreichen
router.use((req, res) => {
    res.status(404).json({ message: 'Endpoint nicht gefunden.' });
});

module.exports = router;
