const crypto = require('crypto');
const admin = require('firebase-admin');
const config = require('../config');

const db = admin.firestore();
const usersCollection = db.collection('users');
const teamsCollection = db.collection('teams');

const API_KEY_PREFIX = 'blf_';
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const rateBuckets = new Map(); // key -> { count, windowStart }

// Cleanup expired rate-limit buckets every minute
setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of rateBuckets.entries()) {
        if (now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
            rateBuckets.delete(key);
        }
    }
}, RATE_LIMIT_WINDOW_MS).unref();

class ApiError extends Error {
    constructor(status, code, message, details = null) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }

    static badRequest(message, details = null) {
        return new ApiError(400, 'BAD_REQUEST', message, details);
    }

    static unauthorized(message = 'Authentifizierung erforderlich. Bitte gültigen Bearer-Token oder X-API-Key senden.') {
        return new ApiError(401, 'UNAUTHORIZED', message);
    }

    static forbidden(message = 'Keine Berechtigung für diese Team-Aktion.') {
        return new ApiError(403, 'FORBIDDEN', message);
    }

    static notFound(message = 'Ressource nicht gefunden.') {
        return new ApiError(404, 'NOT_FOUND', message);
    }

    static conflict(message, details = null) {
        return new ApiError(409, 'CONFLICT', message, details);
    }

    static unprocessable(message, details = null) {
        return new ApiError(422, 'UNPROCESSABLE_ENTITY', message, details);
    }
}

/**
 * Übersetzt Service-Fehler (auch aus bestehenden Services) in konsistente HTTP-Statuscodes & Fehlercodes.
 */
function classifyError(error) {
    if (error instanceof ApiError) {
        return error;
    }
    const msg = error?.message || 'Interner Serverfehler.';

    if (/nicht gefunden/i.test(msg)) {
        return ApiError.notFound(msg);
    }
    if (/keine berechtigung|kein kapitän|nicht deinem team|nur das auswärtsteam|nur eigene|nicht bestätigen|nur buchungen absagen/i.test(msg)) {
        return ApiError.forbidden(msg);
    }
    if (/nicht mehr verfügbar|bereits belegt|regelverletzung|spiellimit|existieren bereits|kollidiert|abgelaufen/i.test(msg)) {
        return ApiError.conflict(msg);
    }
    if (/erforderlich|ungültig|außerhalb der saison|noch nicht für freundschaftsspiele|nicht möglich|keine offene anfrage|nur bestätigte|nur ausstehende/i.test(msg)) {
        return ApiError.badRequest(msg);
    }
    if (typeof error?.status === 'number' && error.status >= 400 && error.status < 500) {
        return new ApiError(error.status, 'REQUEST_ERROR', msg);
    }
    return null;
}

function sendApiError(res, error) {
    const classified = classifyError(error);
    if (classified) {
        const payload = {
            message: classified.message,
            error: {
                code: classified.code,
                message: classified.message,
            },
        };
        if (classified.details) {
            payload.error.details = classified.details;
        }
        return res.status(classified.status).json(payload);
    }

    console.error('[API v1] Unerwarteter Fehler:', error);
    return res.status(500).json({
        message: 'Interner Serverfehler.',
        error: {
            code: 'INTERNAL_ERROR',
            message: 'Interner Serverfehler.',
        },
    });
}

function hashApiKey(rawKey) {
    return crypto.createHash('sha256').update(String(rawKey).trim()).digest('hex');
}

function generateRawApiKey() {
    return `${API_KEY_PREFIX}${crypto.randomBytes(24).toString('hex')}`;
}

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return String(forwarded).split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Rate-Limiter für /api/v1.
 * Öffentliche Anfragen: standardmäßig 120 req/min pro IP.
 * Schreibende / authentifizierte Anfragen nutzen dasselbe Fenster mit bis zu 180 req/min.
 */
function v1RateLimit(req, res, next) {
    const baseLimit = config.publicApi?.rateLimitPerMinute ?? 120;
    if (!baseLimit || baseLimit <= 0) return next();

    const hasAuthHeader = Boolean(req.headers['x-api-key'] || req.headers.authorization);
    const limit = hasAuthHeader ? Math.max(baseLimit, 180) : baseLimit;
    const ip = getClientIp(req);
    const bucketKey = `${ip}:${hasAuthHeader ? 'auth' : 'pub'}`;

    const now = Date.now();
    let bucket = rateBuckets.get(bucketKey);

    if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
        bucket = { count: 0, windowStart: now };
        rateBuckets.set(bucketKey, bucket);
    }

    bucket.count++;
    const remaining = Math.max(0, limit - bucket.count);
    const resetSeconds = Math.ceil((bucket.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000);

    res.set('X-RateLimit-Limit', String(limit));
    res.set('X-RateLimit-Remaining', String(remaining));
    res.set('X-RateLimit-Reset', String(resetSeconds));

    if (bucket.count > limit) {
        res.set('Retry-After', String(resetSeconds));
        return sendApiError(
            res,
            new ApiError(429, 'RATE_LIMITED', 'Zu viele Anfragen. Bitte später erneut versuchen.')
        );
    }
    next();
}

/**
 * Extrahiert Token oder API-Key aus dem Request:
 * - Header `X-API-Key: blf_...`
 * - Header `Authorization: ApiKey blf_...`
 * - Header `Authorization: Bearer blf_...` (automatisch als Team-API-Key erkannt)
 * - Header `Authorization: Bearer <firebase-id-token>`
 */
function extractCredentials(req) {
    const headerApiKey = req.headers['x-api-key'];
    if (headerApiKey && String(headerApiKey).trim()) {
        return { type: 'api_key', token: String(headerApiKey).trim() };
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string') {
        return null;
    }

    const trimmed = authHeader.trim();
    if (/^ApiKey\s+/i.test(trimmed)) {
        return { type: 'api_key', token: trimmed.replace(/^ApiKey\s+/i, '').trim() };
    }

    if (/^Bearer\s+/i.test(trimmed)) {
        const token = trimmed.replace(/^Bearer\s+/i, '').trim();
        if (!token) return null;
        if (token.startsWith(API_KEY_PREFIX)) {
            return { type: 'api_key', token };
        }
        return { type: 'firebase', token };
    }

    return null;
}

/**
 * Löst die Authentifizierung auf (Firebase Bearer Token ODER Team API Key).
 */
async function resolveAuth(req) {
    const creds = extractCredentials(req);
    if (!creds) return null;

    if (creds.type === 'api_key') {
        if (!creds.token.startsWith(API_KEY_PREFIX) || creds.token.length < 20) {
            throw ApiError.unauthorized('Ungültiges API-Key-Format.');
        }

        const keyHash = hashApiKey(creds.token);
        const snapshot = await teamsCollection.where('apiKeyHash', '==', keyHash).limit(1).get();
        if (snapshot.empty) {
            throw ApiError.unauthorized('Ungültiger oder widerrufener Team-API-Key.');
        }

        const teamDoc = snapshot.docs[0];
        const teamData = teamDoc.data();
        const uid = `apikey:${teamDoc.id}`;

        return {
            method: 'api_key',
            uid,
            email: teamData.contactEmail || null,
            teamId: teamDoc.id,
            teamName: teamData.name || null,
            user: {
                uid,
                teamId: teamDoc.id,
                email: teamData.contactEmail || null,
                displayName: teamData.name || 'Team API',
                admin: false, // /api/v1 erlaubt bewusst niemals Admin-Operationen
            },
        };
    }

    // Firebase ID Token
    let decodedToken;
    try {
        decodedToken = await admin.auth().verifyIdToken(creds.token);
    } catch (err) {
        throw ApiError.unauthorized('Ungültiger oder abgelaufener Firebase Bearer-Token.');
    }

    const userDoc = await usersCollection.doc(decodedToken.uid).get();
    const userProfile = userDoc.exists ? userDoc.data() : {};

    let teamId = decodedToken.teamId || userProfile.teamId || null;

    // Fallback: Prüfen, ob der User als Kapitän in einem Team eingetragen ist
    if (!teamId) {
        const capSnap = await teamsCollection.where('captainIds', 'array-contains', decodedToken.uid).limit(1).get();
        if (!capSnap.empty) {
            teamId = capSnap.docs[0].id;
        }
    }

    return {
        method: 'firebase',
        uid: decodedToken.uid,
        email: decodedToken.email || userProfile.email || null,
        teamId,
        user: {
            ...userProfile,
            ...decodedToken,
            teamId,
            admin: false, // /api/v1 führt alle Aktionen strikt im Team-Kontext aus
        },
    };
}

/**
 * Pflicht-Authentifizierung für Team-Endpunkte.
 * Stellt sicher, dass sowohl gültige Credentials als auch eine zugeordnete `teamId` vorliegen.
 */
async function authenticateTeam(req, res, next) {
    try {
        const authContext = await resolveAuth(req);
        if (!authContext) {
            throw ApiError.unauthorized();
        }
        if (!authContext.teamId) {
            throw ApiError.forbidden('Deinem Account ist aktuell kein Team zugeordnet.');
        }

        req.auth = authContext;
        req.user = authContext.user;
        next();
    } catch (error) {
        sendApiError(res, error);
    }
}

/**
 * Optionale Authentifizierung für lesende Endpunkte:
 * Wenn ein Token / API-Key mitgesendet wird, werden `req.auth` und `req.user` gesetzt
 * (z.B. für `isHome`, `canConfirm` etc.), ansonsten läuft der Request öffentlich weiter.
 */
async function optionalTeamAuth(req, res, next) {
    try {
        const creds = extractCredentials(req);
        if (!creds) return next();

        const authContext = await resolveAuth(req);
        if (authContext) {
            req.auth = authContext;
            req.user = authContext.user;
        }
        next();
    } catch (error) {
        // Wenn explizit Credentials mitgeschickt wurden, diese aber ungültig sind, 401 melden
        sendApiError(res, error);
    }
}

module.exports = {
    ApiError,
    sendApiError,
    hashApiKey,
    generateRawApiKey,
    v1RateLimit,
    authenticateTeam,
    optionalTeamAuth,
};

