const express = require('express');
const path = require('path');
const sharp = require('sharp');
const router = express.Router();

const v1ApiService = require('../services/v1ApiService');
const publicTeamService = require('../services/publicTeamService');
const teamService = require('../services/teamService');
const { upload } = require('../middleware/uploadMiddleware');
const { clearPublicCache } = require('../middleware/publicApiMiddleware');
const {
    ApiError,
    sendApiError,
    v1RateLimit,
    authenticateTeam,
    optionalTeamAuth,
} = require('../middleware/v1ApiMiddleware');

router.use(v1RateLimit);

function getBaseUrl(req) {
    if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL;
    if (process.env.API_URL) return process.env.API_URL;
    const proto = String(req.headers['x-forwarded-proto'] || req.protocol).split(',')[0].trim();
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${proto}://${host}`;
}

function parseLimit(rawLimit, defaultVal = null, maxVal = 200) {
    if (rawLimit === undefined || rawLimit === null || rawLimit === '') return defaultVal;
    const n = parseInt(rawLimit, 10);
    if (!Number.isInteger(n) || n < 1 || n > maxVal) {
        throw ApiError.badRequest(`Ungültiger Parameter 'limit'. Erlaubt ist eine Zahl zwischen 1 und ${maxVal}.`);
    }
    return n;
}

function parseBool(val, defaultVal = null) {
    if (val === undefined || val === null || val === '') return defaultVal;
    if (typeof val === 'boolean') return val;
    const s = String(val).toLowerCase().trim();
    if (s === 'true' || s === '1') return true;
    if (s === 'false' || s === '0') return false;
    throw ApiError.badRequest(`Ungültiger Boolean-Parameter '${val}'. Erlaubt: true oder false.`);
}

// ============================================================================
// 1. SAISONS & TABELLEN (Öffentlich lesbar)
// ============================================================================

router.get('/seasons', async (req, res) => {
    try {
        const data = await v1ApiService.listSeasons({ status: req.query.status || null });
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

router.get('/seasons/:seasonId', async (req, res) => {
    try {
        const data = await v1ApiService.getSeasonDetails(req.params.seasonId);
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

router.get('/seasons/:seasonId/table', optionalTeamAuth, async (req, res) => {
    try {
        const highlightTeamId = req.query.teamId || req.auth?.teamId || null;
        const data = await v1ApiService.getSeasonTable(req.params.seasonId, { highlightTeamId }, getBaseUrl(req));
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

router.get('/seasons/:seasonId/teams', async (req, res) => {
    try {
        const data = await v1ApiService.getSeasonTeams(req.params.seasonId, getBaseUrl(req));
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

// ============================================================================
// 2. TEAMS, STATISTIKEN & HEAD-TO-HEAD (Öffentlich lesbar)
// ============================================================================

router.get('/teams', async (req, res) => {
    try {
        const data = await v1ApiService.getSeasonTeams(req.query.season || 'active', getBaseUrl(req));
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

router.get('/teams/:teamId', async (req, res) => {
    try {
        const data = await v1ApiService.getTeamDetails(req.params.teamId, getBaseUrl(req));
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

router.get('/teams/:teamId/table', async (req, res) => {
    try {
        const data = await publicTeamService.getTeamTable(
            req.params.teamId,
            req.query.season || 'active',
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

router.get('/teams/:teamId/matches', async (req, res) => {
    try {
        const type = req.query.type || 'all';
        if (!['all', 'results', 'upcoming'].includes(type)) {
            throw ApiError.badRequest("Ungültiger Parameter 'type'. Erlaubt: all, results, upcoming.");
        }
        const limit = parseLimit(req.query.limit, null, 100);
        const data = await publicTeamService.getTeamMatches(
            req.params.teamId,
            req.query.season || 'active',
            { type, limit },
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

router.get('/teams/:teamId/stats', async (req, res) => {
    try {
        const data = await v1ApiService.getTeamStats(
            req.params.teamId,
            req.query.season || 'active',
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

router.get('/teams/:teamId/h2h/:opponentId', async (req, res) => {
    try {
        const limit = parseLimit(req.query.limit, 10, 100);
        const includeFriendly = parseBool(req.query.includeFriendly, false);
        const data = await v1ApiService.getHeadToHead(
            req.params.teamId,
            req.params.opponentId,
            { limit, includeFriendly },
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

// ============================================================================
// 3. EIGENES TEAM & ACTION-CENTER (Authentifiziert)
// ============================================================================

router.get('/my-team', authenticateTeam, async (req, res) => {
    try {
        const data = await v1ApiService.getMyTeamOverview(
            req.auth.teamId,
            req.query.season || 'active',
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

const handleUpdateMyTeam = async (req, res) => {
    try {
        const data = await v1ApiService.updateMyTeamProfile(req.auth.teamId, req.body || {}, getBaseUrl(req));
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
};
router.patch('/my-team', authenticateTeam, handleUpdateMyTeam);
router.put('/my-team', authenticateTeam, handleUpdateMyTeam);

router.post(
    '/my-team/logo',
    authenticateTeam,
    (req, res, next) => {
        // Unterstützt Feldname 'logo' oder 'teamLogo'
        const singleUpload = upload.fields([
            { name: 'logo', maxCount: 1 },
            { name: 'teamLogo', maxCount: 1 },
        ]);
        singleUpload(req, res, err => {
            if (err) return sendApiError(res, ApiError.badRequest(err.message));
            next();
        });
    },
    async (req, res) => {
        try {
            const file = req.files?.logo?.[0] || req.files?.teamLogo?.[0] || req.file;
            if (!file) {
                throw ApiError.badRequest("Keine Bilddatei hochgeladen (Feld 'logo' oder 'teamLogo' erwartet).");
            }
            const teamId = req.auth.teamId;
            const logoType = req.query.type === 'light' ? 'light' : 'dark';
            const outputFilename = `${teamId}-${logoType}-${Date.now()}.webp`;
            const outputPath = path.join(__dirname, '..', 'uploads', 'team-logos', outputFilename);

            await sharp(file.buffer)
                .resize({ width: 128, height: 128, fit: 'inside' })
                .webp({ quality: 80 })
                .toFile(outputPath);

            const relativePath = `/uploads/team-logos/${outputFilename}`;
            await teamService.updateTeamLogo(teamId, relativePath, logoType);
            clearPublicCache();

            const data = await v1ApiService.getMyTeamOverview(teamId, 'active', getBaseUrl(req));
            res.status(200).json({
                message: 'Team-Logo erfolgreich aktualisiert.',
                team: data.team,
            });
        } catch (error) {
            sendApiError(res, error);
        }
    }
);

const handleActionCenter = async (req, res) => {
    try {
        const data = await v1ApiService.getMyTeamActionCenter(
            req.auth.teamId,
            req.query.season || 'active',
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
};
router.get('/my-team/action-center', authenticateTeam, handleActionCenter);
router.get('/my-team/dashboard', authenticateTeam, handleActionCenter);

router.get('/my-team/potential-opponents', authenticateTeam, async (req, res) => {
    try {
        const friendly = parseBool(req.query.friendly ?? req.query.isFriendly, false);
        const data = await v1ApiService.getPotentialOpponentsForTeam(
            req.auth.teamId,
            { seasonParam: req.query.season || 'active', friendly },
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

router.get('/my-team/matches', authenticateTeam, async (req, res) => {
    try {
        const limit = parseLimit(req.query.limit, null, 200);
        const friendly = parseBool(req.query.friendly, null);
        const data = await v1ApiService.listMatches(
            {
                seasonParam: req.query.season || 'active',
                teamId: req.auth.teamId,
                status: req.query.status || null,
                from: req.query.from || null,
                to: req.query.to || null,
                friendly,
                limit,
            },
            req.auth.teamId,
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

router.get('/my-team/pitches', authenticateTeam, async (req, res) => {
    try {
        const data = await v1ApiService.listPitches({ teamId: req.auth.teamId }, getBaseUrl(req));
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

router.post('/my-team/pitches', authenticateTeam, async (req, res) => {
    try {
        const data = await v1ApiService.createTeamPitch(
            req.auth.teamId,
            req.user,
            req.body || {},
            getBaseUrl(req)
        );
        res.status(201).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

const handleUpdateTeamPitch = async (req, res) => {
    try {
        const data = await v1ApiService.updateTeamPitch(
            req.auth.teamId,
            req.params.pitchId,
            req.body || {},
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
};
router.patch('/my-team/pitches/:pitchId', authenticateTeam, handleUpdateTeamPitch);
router.put('/my-team/pitches/:pitchId', authenticateTeam, handleUpdateTeamPitch);

router.post('/my-team/api-key', authenticateTeam, async (req, res) => {
    try {
        const data = await v1ApiService.generateTeamApiKey(req.auth.teamId, req.auth.uid);
        res.status(201).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

router.delete('/my-team/api-key', authenticateTeam, async (req, res) => {
    try {
        const data = await v1ApiService.revokeTeamApiKey(req.auth.teamId);
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

// ============================================================================
// 4. PLÄTZE & FREIE ZEITSLOTS
// ============================================================================

router.get('/pitches', async (req, res) => {
    try {
        const verifiedOnly = parseBool(req.query.verifiedOnly, false);
        const data = await v1ApiService.listPitches(
            { verifiedOnly, teamId: req.query.teamId || null },
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

router.get('/slots', async (req, res) => {
    try {
        const friendly = parseBool(req.query.friendly, null);
        const data = await v1ApiService.listAvailableSlots(
            {
                seasonParam: req.query.season || 'active',
                pitchId: req.query.pitchId || null,
                from: req.query.from || null,
                to: req.query.to || null,
                friendly,
            },
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

// Alias: Direkt auf einem Slot ein Spiel anfragen
router.post('/slots/:slotId/request', authenticateTeam, async (req, res) => {
    try {
        const data = await v1ApiService.requestOfficialSlot(
            req.auth.teamId,
            req.auth.uid,
            { ...(req.body || {}), slotId: req.params.slotId },
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

// ============================================================================
// 5. SPIELE / BUCHUNGEN (Ausmachen, Bestätigen, Ablehnen, Absagen)
// ============================================================================

router.get('/matches', optionalTeamAuth, async (req, res) => {
    try {
        const limit = parseLimit(req.query.limit, null, 200);
        const friendly = parseBool(req.query.friendly, null);
        const data = await v1ApiService.listMatches(
            {
                seasonParam: req.query.season || 'active',
                teamId: req.query.teamId || null,
                pitchId: req.query.pitchId || null,
                status: req.query.status || null,
                from: req.query.from || null,
                to: req.query.to || null,
                friendly,
                limit,
            },
            req.auth?.teamId || null,
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

// Spiel auf freiem offiziellen Platz-Slot vereinbaren / anfragen
router.post('/matches/request-slot', authenticateTeam, async (req, res) => {
    try {
        const data = await v1ApiService.requestOfficialSlot(
            req.auth.teamId,
            req.auth.uid,
            req.body || {},
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

// Individuelles Spiel auf eigenem Team-Platz vereinbaren / anfragen
router.post('/matches/custom', authenticateTeam, async (req, res) => {
    try {
        const data = await v1ApiService.createCustomMatch(
            req.auth.teamId,
            req.user,
            req.body || {},
            getBaseUrl(req)
        );
        res.status(201).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

router.get('/matches/:matchId', optionalTeamAuth, async (req, res) => {
    try {
        const data = await v1ApiService.getMatchById(
            req.params.matchId,
            req.auth?.teamId || null,
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

// Spielanfrage bestätigen (annehmen)
router.post('/matches/:matchId/confirm', authenticateTeam, async (req, res) => {
    try {
        const data = await v1ApiService.confirmMatchRequest(
            req.auth.teamId,
            req.params.matchId,
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

// Spielanfrage ablehnen
const handleRejectMatch = async (req, res) => {
    try {
        const data = await v1ApiService.rejectMatchRequest(
            req.auth.teamId,
            req.params.matchId,
            { reason: req.body?.reason || '' },
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
};
router.post('/matches/:matchId/reject', authenticateTeam, handleRejectMatch);
router.post('/matches/:matchId/deny', authenticateTeam, handleRejectMatch);

// Spiel absagen oder offene Anfrage zurückziehen
router.post('/matches/:matchId/cancel', authenticateTeam, async (req, res) => {
    try {
        const data = await v1ApiService.cancelMatch(
            req.auth.teamId,
            req.params.matchId,
            { reason: req.body?.reason || '' },
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

// Ergebnis direkt für dieses Spiel melden
router.post('/matches/:matchId/result', authenticateTeam, async (req, res) => {
    try {
        const data = await v1ApiService.reportMatchResult(
            req.auth.teamId,
            req.auth.uid,
            req.params.matchId,
            req.body || {},
            getBaseUrl(req)
        );
        res.status(201).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

// ============================================================================
// 6. ERGEBNISSE (Eintragen, Bestätigen, Ablehnen, Anfechten, Korrigieren)
// ============================================================================

router.get('/results', optionalTeamAuth, async (req, res) => {
    try {
        const limit = parseLimit(req.query.limit, null, 200);
        const includeFriendly = parseBool(req.query.includeFriendly, false);
        const data = await v1ApiService.listResults(
            {
                seasonParam: req.query.season || 'active',
                teamId: req.query.teamId || null,
                status: req.query.status || null,
                includeFriendly,
                limit,
            },
            req.auth?.teamId || null,
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

// Ergebnis für ein Spiel eintragen (Body: { matchId/bookingId, homeScore, awayScore })
router.post('/results', authenticateTeam, async (req, res) => {
    try {
        const matchId = req.body?.matchId || req.body?.bookingId;
        const data = await v1ApiService.reportMatchResult(
            req.auth.teamId,
            req.auth.uid,
            matchId,
            req.body || {},
            getBaseUrl(req)
        );
        res.status(201).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

router.get('/results/:resultId', optionalTeamAuth, async (req, res) => {
    try {
        const data = await v1ApiService.getResultById(
            req.params.resultId,
            req.auth?.teamId || null,
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

// Gemeldetes Ergebnis des Gegners bestätigen
router.post('/results/:resultId/confirm', authenticateTeam, async (req, res) => {
    try {
        const data = await v1ApiService.confirmResult(
            req.auth.teamId,
            req.auth.uid,
            req.params.resultId,
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

// Gemeldetes Ergebnis des Gegners ablehnen (Spiel kann danach neu gemeldet werden)
router.post('/results/:resultId/reject', authenticateTeam, async (req, res) => {
    try {
        const data = await v1ApiService.rejectResult(
            req.auth.teamId,
            req.auth.uid,
            req.params.resultId,
            { reason: req.body?.reason || '' }
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

// Ergebnis anfechten (Status 'disputed' für Ligaleitung)
router.post('/results/:resultId/dispute', authenticateTeam, async (req, res) => {
    try {
        const data = await v1ApiService.disputeResult(
            req.auth.teamId,
            req.auth.uid,
            req.params.resultId,
            { reason: req.body?.reason || '' },
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

// Eigene noch unbestätigte Ergebnismeldung zurückziehen
const handleWithdrawResult = async (req, res) => {
    try {
        const data = await v1ApiService.withdrawResultReport(req.auth.teamId, req.params.resultId);
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
};
router.post('/results/:resultId/withdraw', authenticateTeam, handleWithdrawResult);
router.post('/results/:resultId/cancel', authenticateTeam, handleWithdrawResult);

// Noch unbestätigtes Ergebnis korrigieren
const handleUpdateResult = async (req, res) => {
    try {
        const data = await v1ApiService.updatePendingResult(
            req.auth.teamId,
            req.user,
            req.params.resultId,
            req.body || {},
            getBaseUrl(req)
        );
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
};
router.patch('/results/:resultId', authenticateTeam, handleUpdateResult);
router.put('/results/:resultId', authenticateTeam, handleUpdateResult);

// ============================================================================
// 7. TEAM-BENACHRICHTIGUNGEN (Authentifiziert)
// ============================================================================

router.get('/notifications', authenticateTeam, async (req, res) => {
    try {
        const unreadOnly = parseBool(req.query.unreadOnly, true);
        const limit = parseLimit(req.query.limit, 50, 200);
        const data = await v1ApiService.listTeamNotifications(req.auth.teamId, { unreadOnly, limit });
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
});

const handleMarkAllRead = async (req, res) => {
    try {
        const data = await v1ApiService.markAllNotificationsRead(req.auth.teamId);
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
};
router.post('/notifications/read-all', authenticateTeam, handleMarkAllRead);
router.put('/notifications/read-all', authenticateTeam, handleMarkAllRead);

const handleMarkOneRead = async (req, res) => {
    try {
        const data = await v1ApiService.markNotificationRead(req.auth.teamId, req.params.notificationId);
        res.status(200).json(data);
    } catch (error) {
        sendApiError(res, error);
    }
};
router.post('/notifications/:notificationId/read', authenticateTeam, handleMarkOneRead);
router.patch('/notifications/:notificationId/read', authenticateTeam, handleMarkOneRead);
router.put('/notifications/:notificationId/read', authenticateTeam, handleMarkOneRead);

// 404-Handler für unbekannte /api/v1-Pfade
router.use((req, res) => {
    sendApiError(res, ApiError.notFound(`Endpoint '${req.method} ${req.originalUrl}' nicht gefunden.`));
});

module.exports = router;

