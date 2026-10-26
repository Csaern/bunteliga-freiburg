const config = require('../config');

/**
 * Middleware für die öffentliche (externe) API:
 *  - einfaches Rate-Limit pro IP (Fixed Window, In-Memory)
 *  - Response-Cache pro URL (In-Memory, TTL)
 *
 * Bewusst ohne zusätzliche Abhängigkeiten. Bei mehreren Server-Instanzen
 * gelten Limit und Cache jeweils pro Instanz – für dieses Projekt ausreichend.
 */

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

const rateBuckets = new Map(); // ip -> { count, windowStart }
const responseCache = new Map(); // url -> { expires, status, body }

/**
 * Ermittelt die Client-IP. Hinter Plesk/Reverse-Proxy steht die echte IP in X-Forwarded-For.
 */
function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return String(forwarded).split(',')[0].trim();
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
}

function publicRateLimit(req, res, next) {
    const limit = config.publicApi.rateLimitPerMinute;
    if (!limit || limit <= 0) return next();

    const ip = getClientIp(req);
    const now = Date.now();
    let bucket = rateBuckets.get(ip);

    if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
        bucket = { count: 0, windowStart: now };
        rateBuckets.set(ip, bucket);
    }

    bucket.count++;
    const remaining = Math.max(0, limit - bucket.count);
    const resetSeconds = Math.ceil((bucket.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000);

    res.set('X-RateLimit-Limit', String(limit));
    res.set('X-RateLimit-Remaining', String(remaining));
    res.set('X-RateLimit-Reset', String(resetSeconds));

    if (bucket.count > limit) {
        res.set('Retry-After', String(resetSeconds));
        return res.status(429).json({ message: 'Zu viele Anfragen. Bitte später erneut versuchen.' });
    }
    next();
}

// Abgelaufene Rate-Limit-Buckets regelmäßig entfernen, damit die Map nicht wächst.
setInterval(() => {
    const now = Date.now();
    for (const [ip, bucket] of rateBuckets.entries()) {
        if (now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) rateBuckets.delete(ip);
    }
}, RATE_LIMIT_WINDOW_MS).unref();

/**
 * Cacht erfolgreiche JSON-Antworten (2xx) für `cacheSeconds` Sekunden.
 * Cache-Key ist die vollständige URL inkl. Query-String.
 */
function publicCache(req, res, next) {
    const ttlSeconds = config.publicApi.cacheSeconds;
    if (req.method !== 'GET' || !ttlSeconds || ttlSeconds <= 0) return next();

    const key = req.originalUrl;
    const now = Date.now();
    const cached = responseCache.get(key);

    res.set('Cache-Control', `public, max-age=${ttlSeconds}`);

    if (cached && cached.expires > now) {
        res.set('X-Cache', 'HIT');
        return res.status(cached.status).json(cached.body);
    }

    res.set('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);
    res.json = (body) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            if (responseCache.size >= MAX_CACHE_ENTRIES) {
                // Ältesten Eintrag entfernen (Map behält Einfügereihenfolge bei)
                responseCache.delete(responseCache.keys().next().value);
            }
            responseCache.set(key, { expires: now + ttlSeconds * 1000, status: res.statusCode, body });
        } else {
            // Fehlerantworten nicht im Browser/Proxy cachen
            res.set('Cache-Control', 'no-store');
        }
        return originalJson(body);
    };
    next();
}

/**
 * Leert den Cache der öffentlichen API (z.B. nach Ergebnis-Änderungen).
 */
function clearPublicCache() {
    responseCache.clear();
}

module.exports = {
    publicRateLimit,
    publicCache,
    clearPublicCache,
};
