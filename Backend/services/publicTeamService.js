const admin = require('firebase-admin');
const db = admin.firestore();
const teamsCollection = db.collection('teams');
const seasonsCollection = db.collection('seasons');
const resultsCollection = db.collection('results');
const bookingsCollection = db.collection('bookings');
const pitchesCollection = db.collection('pitches');
const tableService = require('./tableService');

/**
 * Öffentlicher, rein LESENDER Service für die externe Team-API.
 *
 * WICHTIG: Hier werden bewusst keine BookingService-Methoden verwendet, da diese
 * beim Lesen einen "Lazy Sync" auslösen (Schreibzugriffe + Benachrichtigungen).
 * Eine öffentliche API darf keine Seiteneffekte haben.
 */

const FIRESTORE_IN_LIMIT = 30;

class PublicApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

// --- Hilfsfunktionen ---

/** Wandelt Firestore Timestamp / Date / String in Millisekunden um (0 bei ungültig). */
function toMillis(value) {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value._seconds === 'number') return value._seconds * 1000;
    if (value instanceof Date) return value.getTime();
    const d = new Date(value);
    return isNaN(d.valueOf()) ? 0 : d.getTime();
}

function toIso(value) {
    const ms = toMillis(value);
    return ms > 0 ? new Date(ms).toISOString() : null;
}

/** Firestore-Dokument-IDs dürfen keinen '/' enthalten – sonst würde doc() einen Pfad interpretieren. */
function isValidDocId(id) {
    return typeof id === 'string' && id.length > 0 && id.length <= 128 && !id.includes('/');
}

/** Macht relative Upload-Pfade (/uploads/...) zu absoluten URLs für externe Seiten. */
function absoluteUrl(path, baseUrl) {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** Lädt mehrere Dokumente per ID (in Blöcken wegen Firestore-'in'-Limit). */
async function getDocsByIds(collection, ids) {
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    const map = new Map();
    for (let i = 0; i < uniqueIds.length; i += FIRESTORE_IN_LIMIT) {
        const chunk = uniqueIds.slice(i, i + FIRESTORE_IN_LIMIT);
        const snapshot = await collection.where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
        snapshot.forEach(doc => map.set(doc.id, doc.data()));
    }
    return map;
}

function publicTeam(id, data, baseUrl, fallbackName = null) {
    return {
        id,
        name: data?.name || fallbackName || 'Unbekanntes Team',
        logoUrl: absoluteUrl(data?.logoUrl, baseUrl),
        logoUrlLight: absoluteUrl(data?.logoUrlLight, baseUrl),
        logoColor: data?.logoColor || null,
    };
}

function publicSeason(season) {
    return {
        id: season.id,
        name: season.name,
        status: season.status,
        playMode: season.playMode || null,
        startDate: toIso(season.startDate),
        endDate: toIso(season.endDate),
        pointsForWin: season.pointsForWin ?? 2,
        pointsForDraw: season.pointsForDraw ?? 1,
        pointsForLoss: season.pointsForLoss ?? 0,
    };
}

/**
 * Ermittelt die Saison: 'active' (oder leer) => aktive Saison, sonst Saison-ID.
 */
async function resolveSeason(seasonParam) {
    if (!seasonParam || seasonParam === 'active' || seasonParam === 'current') {
        const snapshot = await seasonsCollection.where('status', '==', 'active').limit(1).get();
        if (snapshot.empty) throw new PublicApiError(404, 'Keine aktive Saison gefunden.');
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    }
    if (!isValidDocId(String(seasonParam))) throw new PublicApiError(404, 'Saison nicht gefunden.');
    const doc = await seasonsCollection.doc(String(seasonParam)).get();
    if (!doc.exists) throw new PublicApiError(404, 'Saison nicht gefunden.');
    return { id: doc.id, ...doc.data() };
}

async function getTeamOrThrow(teamId) {
    if (!isValidDocId(String(teamId))) throw new PublicApiError(404, 'Team nicht gefunden.');
    const doc = await teamsCollection.doc(String(teamId)).get();
    if (!doc.exists) throw new PublicApiError(404, 'Team nicht gefunden.');
    return { id: doc.id, ...doc.data() };
}

function assertTeamInSeason(season, teamId) {
    const isParticipant = (season.teams || []).some(t => (t.id || t.teamId) === teamId);
    if (!isParticipant) {
        throw new PublicApiError(404, 'Das Team nimmt an dieser Saison nicht teil.');
    }
}

/**
 * Lädt Dokumente einer Collection, in denen das Team Heim- ODER Auswärtsteam ist.
 */
async function queryByTeam(collection, seasonId, teamId) {
    const base = collection.where('seasonId', '==', seasonId);
    const [homeSnap, awaySnap] = await Promise.all([
        base.where('homeTeamId', '==', teamId).get(),
        base.where('awayTeamId', '==', teamId).get(),
    ]);
    const map = new Map();
    homeSnap.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));
    awaySnap.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));
    return [...map.values()];
}

// --- Öffentliche Funktionen ---

/**
 * Liste aller Teams einer Saison (zum Herausfinden der eigenen Team-ID).
 */
async function getSeasonTeams(seasonParam, baseUrl) {
    const season = await resolveSeason(seasonParam);
    const seasonTeams = season.teams || [];
    const teamDocs = await getDocsByIds(teamsCollection, seasonTeams.map(t => t.id || t.teamId));

    const teams = seasonTeams
        .map(t => {
            const id = t.id || t.teamId;
            return { ...publicTeam(id, teamDocs.get(id), baseUrl, t.name), status: t.status || 'active' };
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'de'));

    return {
        season: publicSeason(season),
        teams,
        generatedAt: new Date().toISOString(),
    };
}

/**
 * Komplette Tabelle der Saison, das angefragte Team ist markiert (isCurrentTeam)
 * und zusätzlich separat als `teamEntry` enthalten.
 */
async function getTeamTable(teamId, seasonParam, baseUrl) {
    const [team, season] = await Promise.all([getTeamOrThrow(teamId), resolveSeason(seasonParam)]);
    assertTeamInSeason(season, team.id);

    const rawTable = await tableService.calculateTable(season.id, false);
    const teamDocs = await getDocsByIds(teamsCollection, rawTable.map(row => row.teamId));

    const table = rawTable.map(row => {
        const info = publicTeam(row.teamId, teamDocs.get(row.teamId), baseUrl, row.name);
        return {
            rank: row.rank,
            teamId: row.teamId,
            name: info.name,
            logoUrl: info.logoUrl,
            logoUrlLight: info.logoUrlLight,
            played: row.played,
            won: row.won,
            drawn: row.drawn,
            lost: row.lost,
            goalsFor: row.goalsFor,
            goalsAgainst: row.goalsAgainst,
            goalDifference: row.goalDifference,
            points: row.points,
            form: row.form, // letzte 5 Spiele: S = Sieg, U = Unentschieden, N = Niederlage
            isCurrentTeam: row.teamId === team.id,
        };
    });

    return {
        season: publicSeason(season),
        team: publicTeam(team.id, team, baseUrl),
        teamEntry: table.find(row => row.isCurrentTeam) || null,
        table,
        generatedAt: new Date().toISOString(),
    };
}

/**
 * Bestätigte Ergebnisse (vergangen) und bestätigte kommende Spiele eines Teams.
 * Freundschaftsspiele werden nicht berücksichtigt.
 *
 * @param {string} teamId
 * @param {string} seasonParam - Saison-ID oder 'active'
 * @param {object} options
 * @param {'all'|'results'|'upcoming'} [options.type='all']
 * @param {number|null} [options.limit=null] - max. Anzahl je Liste
 * @param {string} baseUrl - Basis-URL für absolute Logo-Links
 */
async function getTeamMatches(teamId, seasonParam, { type = 'all', limit = null } = {}, baseUrl) {
    const [team, season] = await Promise.all([getTeamOrThrow(teamId), resolveSeason(seasonParam)]);
    assertTeamInSeason(season, team.id);

    const includeResults = type === 'all' || type === 'results';
    const includeUpcoming = type === 'all' || type === 'upcoming';

    const [rawResults, rawBookings] = await Promise.all([
        includeResults ? queryByTeam(resultsCollection, season.id, team.id) : [],
        includeUpcoming ? queryByTeam(bookingsCollection, season.id, team.id) : [],
    ]);

    // 1. Ergebnisse: nur bestätigt, keine Freundschaftsspiele; neueste zuerst
    let results = rawResults
        .filter(r => r.status === 'confirmed' && !r.friendly)
        .sort((a, b) => (toMillis(b.date) || toMillis(b.confirmedAt)) - (toMillis(a.date) || toMillis(a.confirmedAt)));

    // 2. Kommende Spiele: bestätigte Buchungen ohne Ergebnis, Spielende liegt in der Zukunft; früheste zuerst
    const now = Date.now();
    let upcoming = rawBookings
        .filter(b => {
            if (b.status !== 'confirmed' || b.friendly) return false;
            if (!b.homeTeamId || !b.awayTeamId) return false;
            const start = toMillis(b.date);
            const durationMs = (Number(b.duration) || 0) * 60 * 1000;
            return start > 0 && start + durationMs >= now;
        })
        .sort((a, b) => toMillis(a.date) - toMillis(b.date));

    if (limit) {
        results = results.slice(0, limit);
        upcoming = upcoming.slice(0, limit);
    }

    // 3. Anreichern: Team-Infos (Name/Logo) und Platz-Infos
    const teamIds = [...results, ...upcoming].flatMap(m => [m.homeTeamId, m.awayTeamId]);
    const [teamDocs, pitchDocs] = await Promise.all([
        getDocsByIds(teamsCollection, teamIds),
        getDocsByIds(pitchesCollection, upcoming.map(b => b.pitchId)),
    ]);

    const buildSides = (match) => {
        const home = publicTeam(match.homeTeamId, teamDocs.get(match.homeTeamId), baseUrl, match.homeTeamName);
        const away = publicTeam(match.awayTeamId, teamDocs.get(match.awayTeamId), baseUrl, match.awayTeamName);
        const isHome = match.homeTeamId === team.id;
        return { home, away, isHome, opponent: isHome ? away : home };
    };

    const mappedResults = results.map(r => {
        const homeScore = Number(r.homeScore) || 0;
        const awayScore = Number(r.awayScore) || 0;
        const sides = buildSides(r);
        const ownScore = sides.isHome ? homeScore : awayScore;
        const oppScore = sides.isHome ? awayScore : homeScore;
        return {
            id: r.id,
            date: toIso(r.date),
            ...sides,
            score: { home: homeScore, away: awayScore },
            outcome: ownScore > oppScore ? 'S' : ownScore < oppScore ? 'N' : 'U',
            counted: r.isValid !== false, // false = Spiel wurde für die Wertung annulliert
            location: r.location ? { name: r.location, address: null } : null,
        };
    });

    const mappedUpcoming = upcoming.map(b => {
        const pitch = pitchDocs.get(b.pitchId);
        return {
            id: b.id,
            date: toIso(b.date),
            durationMinutes: Number(b.duration) || null,
            ...buildSides(b),
            location: pitch ? { name: pitch.name || null, address: pitch.address || null } : null,
        };
    });

    const response = {
        season: publicSeason(season),
        team: publicTeam(team.id, team, baseUrl),
    };
    if (includeResults) response.results = mappedResults;
    if (includeUpcoming) response.upcoming = mappedUpcoming;
    response.generatedAt = new Date().toISOString();
    return response;
}

module.exports = {
    PublicApiError,
    getSeasonTeams,
    getTeamTable,
    getTeamMatches,
};
