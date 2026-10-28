const admin = require('firebase-admin');
const db = admin.firestore();

const teamsCollection = db.collection('teams');
const seasonsCollection = db.collection('seasons');
const resultsCollection = db.collection('results');
const bookingsCollection = db.collection('bookings');
const pitchesCollection = db.collection('pitches');
const notificationsCollection = db.collection('notifications');

const BookingService = require('./bookingService');
const resultService = require('./resultService');
const teamService = require('./teamService');
const pitchService = require('./pitchService');
const tableService = require('./tableService');
const notificationService = require('./notificationService');
const { clearPublicCache } = require('../middleware/publicApiMiddleware');
const { ApiError, hashApiKey, generateRawApiKey } = require('../middleware/v1ApiMiddleware');

const FIRESTORE_IN_LIMIT = 30;

// --- Hilfsfunktionen ---

function toMillis(value) {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') {
        const d = value.toDate();
        return d instanceof Date && !isNaN(d.valueOf()) ? d.getTime() : 0;
    }
    if (typeof value._seconds === 'number') return value._seconds * 1000;
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    if (value instanceof Date) return isNaN(value.valueOf()) ? 0 : value.getTime();
    const d = new Date(value);
    return isNaN(d.valueOf()) ? 0 : d.getTime();
}

function toIso(value) {
    const ms = toMillis(value);
    return ms > 0 ? new Date(ms).toISOString() : null;
}

function isValidDocId(id) {
    return typeof id === 'string' && id.length > 0 && id.length <= 128 && !id.includes('/');
}

function absoluteUrl(path, baseUrl) {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    return `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}

async function getDocsByIds(collection, ids) {
    const uniqueIds = [...new Set(ids.filter(id => isValidDocId(String(id))))];
    const map = new Map();
    for (let i = 0; i < uniqueIds.length; i += FIRESTORE_IN_LIMIT) {
        const chunk = uniqueIds.slice(i, i + FIRESTORE_IN_LIMIT);
        const snapshot = await collection.where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
        snapshot.forEach(doc => map.set(doc.id, doc.data()));
    }
    return map;
}

async function resolveSeason(seasonParam) {
    if (!seasonParam || seasonParam === 'active' || seasonParam === 'current') {
        const snapshot = await seasonsCollection.where('status', '==', 'active').limit(1).get();
        if (snapshot.empty) throw ApiError.notFound('Keine aktive Saison gefunden.');
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
    }
    if (!isValidDocId(String(seasonParam))) {
        throw ApiError.notFound('Saison nicht gefunden.');
    }
    const doc = await seasonsCollection.doc(String(seasonParam)).get();
    if (!doc.exists) throw ApiError.notFound('Saison nicht gefunden.');
    return { id: doc.id, ...doc.data() };
}

async function getTeamOrThrow(teamId) {
    if (!isValidDocId(String(teamId))) throw ApiError.notFound('Team nicht gefunden.');
    const doc = await teamsCollection.doc(String(teamId)).get();
    if (!doc.exists) throw ApiError.notFound('Team nicht gefunden.');
    return { id: doc.id, ...doc.data() };
}

function isTeamInSeason(season, teamId) {
    return (season.teams || []).some(t => (t.id || t.teamId) === teamId);
}

// --- Formatierer (Normalisierte JSON-Modelle) ---

function formatSeason(season) {
    if (!season) return null;
    return {
        id: season.id,
        name: season.name,
        status: season.status,
        playMode: season.playMode || 'double_round_robin',
        startDate: toIso(season.startDate),
        endDate: toIso(season.endDate),
        pointsForWin: season.pointsForWin ?? 2,
        pointsForDraw: season.pointsForDraw ?? 1,
        pointsForLoss: season.pointsForLoss ?? 0,
        requestExpiryDays: season.requestExpiryDays ?? 3,
        friendlyGamesReleaseHours: season.friendlyGamesReleaseHours ?? 48,
        evaluated: Boolean(season.evaluated),
    };
}

function formatTeamSummary(id, data, baseUrl, fallbackName = null) {
    if (!id) return null;
    return {
        id,
        name: data?.name || fallbackName || 'Unbekanntes Team',
        logoUrl: absoluteUrl(data?.logoUrl, baseUrl),
        logoUrlLight: absoluteUrl(data?.logoUrlLight, baseUrl),
        logoColor: data?.logoColor || null,
    };
}

function formatTeamProfile(team, baseUrl, { includePrivate = false } = {}) {
    const profile = {
        id: team.id,
        name: team.name || 'Unbekanntes Team',
        logoUrl: absoluteUrl(team.logoUrl, baseUrl),
        logoUrlLight: absoluteUrl(team.logoUrlLight, baseUrl),
        logoColor: team.logoColor || '#666666',
        foundedYear: team.foundedYear || null,
        description: team.description || '',
        contactPerson: team.contactPerson || '',
        contactEmail: team.contactEmail || '',
        contactPhone: team.contactPhone || '',
        website: team.website || '',
        socialMedia: {
            instagram: team.socialMedia?.instagram || '',
            facebook: team.socialMedia?.facebook || '',
            twitter: team.socialMedia?.twitter || '',
        },
        updatedAt: toIso(team.updatedAt),
    };

    if (includePrivate) {
        profile.apiKey = {
            configured: Boolean(team.apiKeyHash),
            prefix: team.apiKeyPrefix || null,
            createdAt: toIso(team.apiKeyCreatedAt),
        };
    }

    return profile;
}

function formatPitch(id, data, baseUrl) {
    if (!id || !data) return null;
    return {
        id,
        name: data.name || 'Unbekannter Platz',
        address: data.address || null,
        type: data.type || null,
        notes: data.notes || null,
        isVerified: Boolean(data.isVerified),
        teamId: data.teamId || null,
        weeklyLimit: data.weeklyLimit ?? null,
        imageUrl: absoluteUrl(data.imageUrl, baseUrl),
    };
}

function formatMatch(booking, { teamDocs = new Map(), pitchDocs = new Map(), resultByBookingId = new Map(), authTeamId = null, baseUrl = '' } = {}) {
    const homeTeam = booking.homeTeamId
        ? formatTeamSummary(booking.homeTeamId, teamDocs.get(booking.homeTeamId), baseUrl, booking.homeTeamName)
        : null;
    const awayTeam = booking.awayTeamId
        ? formatTeamSummary(booking.awayTeamId, teamDocs.get(booking.awayTeamId), baseUrl, booking.awayTeamName)
        : null;
    const pitch = booking.pitchId
        ? formatPitch(booking.pitchId, pitchDocs.get(booking.pitchId), baseUrl)
        : null;

    const linkedResult = resultByBookingId.get(booking.id) || null;
    const startMillis = toMillis(booking.date);
    const durationMinutes = Number(booking.duration) || 90;
    const isPast = startMillis > 0 && startMillis < Date.now();

    const formatted = {
        id: booking.id,
        seasonId: booking.seasonId || null,
        date: toIso(booking.date),
        durationMinutes,
        status: booking.status || 'available',
        friendly: Boolean(booking.friendly),
        isCustom: Boolean(booking.isCustom),
        homeTeam,
        awayTeam,
        pitch,
        requestedAt: toIso(booking.requestedAt),
        confirmedAt: toIso(booking.confirmedAt),
        denialReason: booking.denialReason || null,
        cancellationReason: booking.cancellationReason || null,
        result: linkedResult
            ? {
                id: linkedResult.id,
                status: linkedResult.status,
                homeScore: Number(linkedResult.homeScore) || 0,
                awayScore: Number(linkedResult.awayScore) || 0,
                reportedByTeamId: linkedResult.reportedByTeamId || null,
                confirmedAt: toIso(linkedResult.confirmedAt),
            }
            : null,
    };

    if (authTeamId && (booking.homeTeamId === authTeamId || booking.awayTeamId === authTeamId)) {
        const isHome = booking.homeTeamId === authTeamId;
        formatted.isHome = isHome;
        formatted.opponent = isHome ? awayTeam : homeTeam;
        formatted.permissions = {
            canConfirmRequest: booking.status === 'pending_away_confirm' && booking.awayTeamId === authTeamId,
            canRejectRequest: booking.status === 'pending_away_confirm' && booking.awayTeamId === authTeamId,
            canCancel: ['confirmed', 'pending_away_confirm'].includes(booking.status),
            canReportResult: booking.status === 'confirmed' && !linkedResult && isPast,
        };
    }

    return formatted;
}

function formatResult(result, { teamDocs = new Map(), authTeamId = null, baseUrl = '' } = {}) {
    const homeScore = Number(result.homeScore) || 0;
    const awayScore = Number(result.awayScore) || 0;
    const homeTeam = formatTeamSummary(result.homeTeamId, teamDocs.get(result.homeTeamId), baseUrl, result.homeTeamName);
    const awayTeam = formatTeamSummary(result.awayTeamId, teamDocs.get(result.awayTeamId), baseUrl, result.awayTeamName);

    const formatted = {
        id: result.id,
        matchId: result.bookingId || null,
        seasonId: result.seasonId || null,
        date: toIso(result.date) || toIso(result.confirmedAt) || toIso(result.reportedAt),
        status: result.status || 'pending',
        friendly: Boolean(result.friendly),
        counted: result.isValid !== false,
        score: {
            home: homeScore,
            away: awayScore,
        },
        homeScore,
        awayScore,
        homeTeam,
        awayTeam,
        location: result.location ? { name: result.location } : null,
        reportedByTeamId: result.reportedByTeamId || null,
        reportedAt: toIso(result.reportedAt),
        confirmedByTeamId: result.confirmedByTeamId || null,
        confirmedAt: toIso(result.confirmedAt),
        disputedReason: result.disputedReason || null,
    };

    if (authTeamId && (result.homeTeamId === authTeamId || result.awayTeamId === authTeamId)) {
        const isHome = result.homeTeamId === authTeamId;
        const ownScore = isHome ? homeScore : awayScore;
        const oppScore = isHome ? awayScore : homeScore;
        const isPending = result.status === 'pending';
        const isReporter = result.reportedByTeamId === authTeamId;

        formatted.isHome = isHome;
        formatted.opponent = isHome ? awayTeam : homeTeam;
        formatted.outcome = ownScore > oppScore ? 'S' : ownScore < oppScore ? 'N' : 'U';
        formatted.permissions = {
            canConfirm: isPending && !isReporter,
            canReject: isPending && !isReporter,
            canDispute: isPending && !isReporter,
            canWithdraw: isPending && isReporter,
            canUpdate: isPending,
        };
    }

    return formatted;
}

function formatNotification(n) {
    return {
        id: n.id,
        teamId: n.teamId,
        type: n.type,
        title: n.title,
        message: n.message,
        read: Boolean(n.read),
        createdAt: toIso(n.createdAt),
        readAt: toIso(n.readAt),
        relatedData: n.relatedData
            ? {
                ...n.relatedData,
                date: n.relatedData.date ? toIso(n.relatedData.date) || n.relatedData.date : undefined,
                bookingDate: n.relatedData.bookingDate ? toIso(n.relatedData.bookingDate) || n.relatedData.bookingDate : undefined,
            }
            : {},
    };
}

// --- 1. Saisons & Tabellen ---

async function listSeasons({ status = null } = {}) {
    let query = seasonsCollection;
    if (status) {
        query = query.where('status', '==', status);
    }
    const snapshot = await query.get();
    const seasons = snapshot.docs
        .map(doc => formatSeason({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
    return { seasons };
}

async function getSeasonDetails(seasonParam) {
    const season = await resolveSeason(seasonParam);
    return { season: formatSeason(season) };
}

async function getSeasonTable(seasonParam, { highlightTeamId = null } = {}, baseUrl) {
    const season = await resolveSeason(seasonParam);
    const rawTable = await tableService.calculateTable(season.id, false);
    const teamDocs = await getDocsByIds(teamsCollection, rawTable.map(row => row.teamId));

    const table = rawTable.map(row => {
        const info = formatTeamSummary(row.teamId, teamDocs.get(row.teamId), baseUrl, row.name);
        return {
            rank: row.rank,
            teamId: row.teamId,
            name: info.name,
            logoUrl: info.logoUrl,
            logoUrlLight: info.logoUrlLight,
            logoColor: info.logoColor,
            played: row.played,
            won: row.won,
            drawn: row.drawn,
            lost: row.lost,
            goalsFor: row.goalsFor,
            goalsAgainst: row.goalsAgainst,
            goalDifference: row.goalDifference,
            points: row.points,
            form: row.form || [],
            isCurrentTeam: highlightTeamId ? row.teamId === highlightTeamId : false,
        };
    });

    const response = {
        season: formatSeason(season),
        table,
        generatedAt: new Date().toISOString(),
    };

    if (highlightTeamId) {
        response.teamEntry = table.find(r => r.teamId === highlightTeamId) || null;
    }

    return response;
}

async function getSeasonTeams(seasonParam, baseUrl) {
    const season = await resolveSeason(seasonParam);
    const seasonTeams = season.teams || [];
    const teamDocs = await getDocsByIds(teamsCollection, seasonTeams.map(t => t.id || t.teamId));

    const teams = seasonTeams
        .map(t => {
            const id = t.id || t.teamId;
            return {
                ...formatTeamSummary(id, teamDocs.get(id), baseUrl, t.name),
                status: t.status || 'active',
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'de'));

    return {
        season: formatSeason(season),
        teams,
    };
}

// --- 2. Teams, Statistiken & Head-to-Head ---

async function getTeamDetails(teamId, baseUrl) {
    const team = await getTeamOrThrow(teamId);
    return {
        team: formatTeamProfile(team, baseUrl, { includePrivate: false }),
    };
}

async function getTeamStats(teamId, seasonParam, baseUrl) {
    const [team, season] = await Promise.all([getTeamOrThrow(teamId), resolveSeason(seasonParam)]);

    const snapshot = await resultsCollection
        .where('seasonId', '==', season.id)
        .where('status', '==', 'confirmed')
        .get();

    const pointsWin = season.pointsForWin ?? 2;
    const pointsDraw = season.pointsForDraw ?? 1;
    const pointsLoss = season.pointsForLoss ?? 0;

    let played = 0;
    let won = 0;
    let drawn = 0;
    let lost = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    let points = 0;

    snapshot.forEach(doc => {
        const r = doc.data();
        if (r.friendly || r.isValid === false) return;
        if (r.homeTeamId !== team.id && r.awayTeamId !== team.id) return;

        played++;
        const isHome = r.homeTeamId === team.id;
        const myGoals = Number(isHome ? r.homeScore : r.awayScore) || 0;
        const oppGoals = Number(isHome ? r.awayScore : r.homeScore) || 0;

        goalsFor += myGoals;
        goalsAgainst += oppGoals;

        if (myGoals > oppGoals) {
            won++;
            points += pointsWin;
        } else if (myGoals === oppGoals) {
            drawn++;
            points += pointsDraw;
        } else {
            lost++;
            points += pointsLoss;
        }
    });

    return {
        season: formatSeason(season),
        team: formatTeamSummary(team.id, team, baseUrl),
        stats: {
            played,
            won,
            drawn,
            lost,
            goalsFor,
            goalsAgainst,
            goalDifference: goalsFor - goalsAgainst,
            points,
            goalsScoredPerGame: played > 0 ? Number((goalsFor / played).toFixed(2)) : 0,
            goalsConcededPerGame: played > 0 ? Number((goalsAgainst / played).toFixed(2)) : 0,
            pointsPerGame: played > 0 ? Number((points / played).toFixed(2)) : 0,
        },
    };
}

async function getHeadToHead(teamAId, teamBId, { limit = 10, includeFriendly = false } = {}, baseUrl) {
    if (teamAId === teamBId) {
        throw ApiError.badRequest('Bitte zwei unterschiedliche Team-IDs angeben.');
    }

    const [teamA, teamB] = await Promise.all([getTeamOrThrow(teamAId), getTeamOrThrow(teamBId)]);

    const [snap1, snap2] = await Promise.all([
        resultsCollection
            .where('homeTeamId', '==', teamA.id)
            .where('awayTeamId', '==', teamB.id)
            .where('status', '==', 'confirmed')
            .get(),
        resultsCollection
            .where('homeTeamId', '==', teamB.id)
            .where('awayTeamId', '==', teamA.id)
            .where('status', '==', 'confirmed')
            .get(),
    ]);

    let allMatches = [...snap1.docs, ...snap2.docs].map(doc => ({ id: doc.id, ...doc.data() }));
    if (!includeFriendly) {
        allMatches = allMatches.filter(r => !r.friendly);
    }

    allMatches.sort((a, b) => (toMillis(b.date) || toMillis(b.confirmedAt)) - (toMillis(a.date) || toMillis(a.confirmedAt)));

    let teamAWins = 0;
    let teamBWins = 0;
    let draws = 0;
    let teamAGoals = 0;
    let teamBGoals = 0;

    allMatches.forEach(r => {
        const aIsHome = r.homeTeamId === teamA.id;
        const aScore = Number(aIsHome ? r.homeScore : r.awayScore) || 0;
        const bScore = Number(aIsHome ? r.awayScore : r.homeScore) || 0;
        teamAGoals += aScore;
        teamBGoals += bScore;
        if (aScore > bScore) teamAWins++;
        else if (bScore > aScore) teamBWins++;
        else draws++;
    });

    const teamDocs = new Map([
        [teamA.id, teamA],
        [teamB.id, teamB],
    ]);

    const matches = (limit ? allMatches.slice(0, limit) : allMatches).map(r =>
        formatResult(r, { teamDocs, authTeamId: teamA.id, baseUrl })
    );

    return {
        teamA: formatTeamSummary(teamA.id, teamA, baseUrl),
        teamB: formatTeamSummary(teamB.id, teamB, baseUrl),
        summary: {
            totalMatches: allMatches.length,
            teamAWins,
            teamBWins,
            draws,
            teamAGoals,
            teamBGoals,
        },
        matches,
    };
}

// --- 3. Eigenes Team & Action-Center ---

async function getMyTeamOverview(teamId, seasonParam, baseUrl) {
    const team = await getTeamOrThrow(teamId);
    let season = null;
    try {
        season = await resolveSeason(seasonParam);
    } catch (_) {
        season = null;
    }

    return {
        team: formatTeamProfile(team, baseUrl, { includePrivate: true }),
        currentSeason: season ? formatSeason(season) : null,
        participatesInSeason: season ? isTeamInSeason(season, team.id) : false,
    };
}

async function updateMyTeamProfile(teamId, patchData, baseUrl) {
    await getTeamOrThrow(teamId);

    const allowedFields = [
        'name',
        'description',
        'foundedYear',
        'contactPerson',
        'contactEmail',
        'contactPhone',
        'website',
        'logoColor',
        'socialMedia',
    ];

    const updates = {};
    for (const key of allowedFields) {
        if (patchData[key] !== undefined) {
            updates[key] = patchData[key];
        }
    }

    if (updates.name !== undefined && (!String(updates.name).trim() || String(updates.name).trim().length < 2)) {
        throw ApiError.badRequest('Der Teamname muss mindestens 2 Zeichen lang sein.');
    }

    if (Object.keys(updates).length === 0) {
        throw ApiError.badRequest('Keine gültigen Felder zum Aktualisieren übergeben.');
    }

    const updatedTeam = await teamService.updateTeam(teamId, updates);
    clearPublicCache();

    return {
        message: 'Team-Profil erfolgreich aktualisiert.',
        team: formatTeamProfile(updatedTeam, baseUrl, { includePrivate: true }),
    };
}

async function generateTeamApiKey(teamId, userUid) {
    await getTeamOrThrow(teamId);
    const rawKey = generateRawApiKey();
    const keyHash = hashApiKey(rawKey);
    const prefix = `${rawKey.slice(0, 10)}...${rawKey.slice(-4)}`;
    const now = new Date();

    await teamsCollection.doc(teamId).update({
        apiKeyHash: keyHash,
        apiKeyPrefix: prefix,
        apiKeyCreatedAt: admin.firestore.Timestamp.fromDate(now),
        apiKeyCreatedBy: userUid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
        message: 'Neuer Team-API-Key wurde generiert. Bitte sicher speichern – er wird nur einmalig im Klartext angezeigt.',
        apiKey: rawKey,
        prefix,
        createdAt: now.toISOString(),
    };
}

async function revokeTeamApiKey(teamId) {
    await getTeamOrThrow(teamId);
    await teamsCollection.doc(teamId).update({
        apiKeyHash: admin.firestore.FieldValue.delete(),
        apiKeyPrefix: admin.firestore.FieldValue.delete(),
        apiKeyCreatedAt: admin.firestore.FieldValue.delete(),
        apiKeyCreatedBy: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
        message: 'Team-API-Key wurde widerrufen.',
    };
}

/**
 * Liefert alle potenziellen Gegner für das eigene Team inklusive detaillierter Paarungs-Infos.
 */
async function getPotentialOpponentsForTeam(teamId, { seasonParam = 'active', friendly = false } = {}, baseUrl) {
    const [team, season] = await Promise.all([getTeamOrThrow(teamId), resolveSeason(seasonParam)]);
    if (!isTeamInSeason(season, team.id)) {
        throw ApiError.badRequest('Dein Team nimmt an dieser Saison nicht teil.');
    }

    const activeSeasonTeams = (season.teams || [])
        .filter(t => (t.status || 'active') === 'active')
        .map(t => t.id || t.teamId)
        .filter(id => id && id !== team.id);

    const [teamDocs, resultsSnap, bookingsSnap] = await Promise.all([
        getDocsByIds(teamsCollection, activeSeasonTeams),
        resultsCollection.where('seasonId', '==', season.id).get(),
        bookingsCollection.where('seasonId', '==', season.id).get(),
    ]);

    const allBookings = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const bookingMap = new Map(allBookings.map(b => [b.id, b]));
    const bookingsWithResults = new Set();

    const leagueResults = [];
    resultsSnap.forEach(doc => {
        const r = doc.data();
        if (r.bookingId) bookingsWithResults.add(r.bookingId);
        if (r.friendly) return;
        if (r.bookingId && bookingMap.get(r.bookingId)?.friendly) return;
        leagueResults.push(r);
    });

    const plannedLeagueBookings = allBookings.filter(
        b =>
            !b.friendly &&
            ['confirmed', 'pending_away_confirm', 'pending_home_confirm'].includes(b.status) &&
            !bookingsWithResults.has(b.id)
    );

    const playMode = season.playMode || 'double_round_robin';
    const maxAllowedGames = friendly
        ? null
        : playMode === 'single_round_robin'
        ? 1
        : playMode === 'double_round_robin'
        ? 2
        : null;

    const opponents = activeSeasonTeams
        .map(oppId => {
            const oppSummary = formatTeamSummary(oppId, teamDocs.get(oppId), baseUrl);
            const gamesPlayed = leagueResults.filter(
                r =>
                    (r.homeTeamId === team.id && r.awayTeamId === oppId) ||
                    (r.homeTeamId === oppId && r.awayTeamId === team.id)
            ).length;
            const gamesPlanned = plannedLeagueBookings.filter(
                b =>
                    (b.homeTeamId === team.id && b.awayTeamId === oppId) ||
                    (b.homeTeamId === oppId && b.awayTeamId === team.id)
            ).length;
            const totalEncounters = gamesPlayed + gamesPlanned;
            const isEligible = friendly || maxAllowedGames === null || totalEncounters < maxAllowedGames;

            return {
                ...oppSummary,
                gamesPlayed,
                gamesPlanned,
                maxAllowedGames,
                remainingGames: maxAllowedGames !== null ? Math.max(0, maxAllowedGames - totalEncounters) : null,
                isEligible,
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'de'));

    return {
        season: formatSeason(season),
        friendly: Boolean(friendly),
        opponents: opponents.filter(o => o.isEligible),
        allOpponents: opponents,
    };
}

/**
 * Action-Center für das eigene Team:
 * Bündelt alle offenen Aufgaben (eingehende/ausgehende Spielanfragen, zu bestätigende Ergebnisse,
 * vergangene Spiele ohne Ergebnis, kommende Spiele, ungelesene Benachrichtigungen).
 */
async function getMyTeamActionCenter(teamId, seasonParam, baseUrl) {
    const [team, season] = await Promise.all([getTeamOrThrow(teamId), resolveSeason(seasonParam)]);

    await BookingService._runLazySync(season.id);

    const [homeBookingsSnap, awayBookingsSnap, homeResultsSnap, awayResultsSnap, unreadNotifications] = await Promise.all([
        bookingsCollection.where('seasonId', '==', season.id).where('homeTeamId', '==', team.id).get(),
        bookingsCollection.where('seasonId', '==', season.id).where('awayTeamId', '==', team.id).get(),
        resultsCollection.where('seasonId', '==', season.id).where('homeTeamId', '==', team.id).get(),
        resultsCollection.where('seasonId', '==', season.id).where('awayTeamId', '==', team.id).get(),
        notificationService.getUnreadNotificationsForTeam(team.id),
    ]);

    const bookingsMap = new Map();
    [...homeBookingsSnap.docs, ...awayBookingsSnap.docs].forEach(doc => {
        bookingsMap.set(doc.id, { id: doc.id, ...doc.data() });
    });
    const teamBookings = [...bookingsMap.values()];

    const resultsMap = new Map();
    [...homeResultsSnap.docs, ...awayResultsSnap.docs].forEach(doc => {
        resultsMap.set(doc.id, { id: doc.id, ...doc.data() });
    });
    const teamResults = [...resultsMap.values()];

    const resultByBookingId = new Map();
    teamResults.forEach(r => {
        if (r.bookingId) resultByBookingId.set(r.bookingId, r);
    });

    // Alle beteiligten Team- und Platz-Dokumente in einem Rutsch laden
    const allTeamIds = [
        team.id,
        ...teamBookings.flatMap(b => [b.homeTeamId, b.awayTeamId]),
        ...teamResults.flatMap(r => [r.homeTeamId, r.awayTeamId]),
    ];
    const allPitchIds = teamBookings.map(b => b.pitchId);

    const [teamDocs, pitchDocs] = await Promise.all([
        getDocsByIds(teamsCollection, allTeamIds),
        getDocsByIds(pitchesCollection, allPitchIds),
    ]);

    const now = Date.now();
    const matchCtx = { teamDocs, pitchDocs, resultByBookingId, authTeamId: team.id, baseUrl };
    const resultCtx = { teamDocs, authTeamId: team.id, baseUrl };

    // 1. Eingehende Spielanfragen (mein Team ist Auswärtsteam und muss bestätigen/ablehnen)
    const incomingMatchRequests = teamBookings
        .filter(b => b.status === 'pending_away_confirm' && b.awayTeamId === team.id && toMillis(b.date) >= now)
        .sort((a, b) => toMillis(a.date) - toMillis(b.date))
        .map(b => formatMatch(b, matchCtx));

    // 2. Ausgehende Spielanfragen (mein Team hat angefragt und wartet auf Antwort)
    const outgoingMatchRequests = teamBookings
        .filter(b => b.status === 'pending_away_confirm' && b.homeTeamId === team.id && toMillis(b.date) >= now)
        .sort((a, b) => toMillis(a.date) - toMillis(b.date))
        .map(b => formatMatch(b, matchCtx));

    // 3. Vom Gegner gemeldete Ergebnisse, die mein Team bestätigen/ablehnen muss
    const pendingResultConfirmations = teamResults
        .filter(r => r.status === 'pending' && r.reportedByTeamId !== team.id)
        .sort((a, b) => toMillis(b.reportedAt) - toMillis(a.reportedAt))
        .map(r => formatResult(r, resultCtx));

    // 4. Von meinem Team gemeldete Ergebnisse, die noch auf Bestätigung des Gegners warten
    const ownPendingResults = teamResults
        .filter(r => r.status === 'pending' && r.reportedByTeamId === team.id)
        .sort((a, b) => toMillis(b.reportedAt) - toMillis(a.reportedAt))
        .map(r => formatResult(r, resultCtx));

    // 5. Vergangene bestätigte Spiele ohne eingetragenes Ergebnis
    const matchesNeedingResult = teamBookings
        .filter(b => {
            const start = toMillis(b.date);
            return (
                b.status === 'confirmed' &&
                b.homeTeamId &&
                b.awayTeamId &&
                start > 0 &&
                start < now &&
                !resultByBookingId.has(b.id)
            );
        })
        .sort((a, b) => toMillis(a.date) - toMillis(b.date))
        .map(b => formatMatch(b, matchCtx));

    // 6. Kommende bestätigte Spiele meines Teams
    const upcomingMatches = teamBookings
        .filter(b => {
            const start = toMillis(b.date);
            const durationMs = (Number(b.duration) || 90) * 60 * 1000;
            return b.status === 'confirmed' && b.homeTeamId && b.awayTeamId && start + durationMs >= now;
        })
        .sort((a, b) => toMillis(a.date) - toMillis(b.date))
        .map(b => formatMatch(b, matchCtx));

    return {
        season: formatSeason(season),
        team: formatTeamSummary(team.id, team, baseUrl),
        counts: {
            actionRequiredTotal:
                incomingMatchRequests.length +
                pendingResultConfirmations.length +
                matchesNeedingResult.length,
            incomingMatchRequests: incomingMatchRequests.length,
            outgoingMatchRequests: outgoingMatchRequests.length,
            pendingResultConfirmations: pendingResultConfirmations.length,
            ownPendingResults: ownPendingResults.length,
            matchesNeedingResult: matchesNeedingResult.length,
            upcomingMatches: upcomingMatches.length,
            unreadNotifications: unreadNotifications.length,
        },
        incomingMatchRequests,
        outgoingMatchRequests,
        pendingResultConfirmations,
        ownPendingResults,
        matchesNeedingResult,
        upcomingMatches,
    };
}

// --- 4. Plätze & Freie Zeitslots ---

async function listPitches({ verifiedOnly = false, teamId = null } = {}, baseUrl) {
    const pitches = await pitchService.getAllPitches();
    const filtered = pitches
        .filter(p => {
            if (p.isArchived) return false;
            if (verifiedOnly && !p.isVerified) return false;
            if (teamId && p.teamId !== teamId) return false;
            return true;
        })
        .map(p => formatPitch(p.id, p, baseUrl))
        .sort((a, b) => a.name.localeCompare(b.name, 'de'));

    return { pitches: filtered };
}

async function createTeamPitch(teamId, user, pitchData, baseUrl) {
    if (!pitchData?.name || !String(pitchData.name).trim()) {
        throw ApiError.badRequest('Der Name des Platzes ist erforderlich.');
    }

    const created = await pitchService.createPitch(
        {
            name: String(pitchData.name).trim(),
            address: pitchData.address ? String(pitchData.address).trim() : '',
            type: pitchData.type ? String(pitchData.type).trim() : '',
            notes: pitchData.notes ? String(pitchData.notes).trim() : '',
            weeklyLimit: pitchData.weeklyLimit ?? null,
            teamId,
            isVerified: false, // Team-Plätze sind immer inoffiziell
        },
        user
    );

    clearPublicCache();
    return {
        message: 'Team-Platz erfolgreich erstellt.',
        pitch: formatPitch(created.id, created, baseUrl),
    };
}

async function updateTeamPitch(teamId, pitchId, patchData, baseUrl) {
    if (!isValidDocId(String(pitchId))) throw ApiError.notFound('Platz nicht gefunden.');
    const existing = await pitchService.getPitchById(pitchId);
    if (!existing || existing.isArchived) {
        throw ApiError.notFound('Platz nicht gefunden.');
    }
    if (existing.teamId !== teamId || existing.isVerified) {
        throw ApiError.forbidden('Du kannst nur eigene, inoffizielle Team-Plätze bearbeiten.');
    }

    const allowed = ['name', 'address', 'type', 'notes', 'weeklyLimit'];
    const updates = {};
    for (const k of allowed) {
        if (patchData[k] !== undefined) updates[k] = patchData[k];
    }

    if (Object.keys(updates).length === 0) {
        throw ApiError.badRequest('Keine gültigen Felder zum Aktualisieren übergeben.');
    }

    const updated = await pitchService.updatePitch(pitchId, updates);
    clearPublicCache();

    return {
        message: 'Team-Platz erfolgreich aktualisiert.',
        pitch: formatPitch(updated.id, updated, baseUrl),
    };
}

async function listAvailableSlots({ seasonParam = 'active', pitchId = null, from = null, to = null, friendly = null } = {}, baseUrl) {
    const season = await resolveSeason(seasonParam);
    const allBookings = await BookingService.getBookingsForSeason(season.id);

    const now = Date.now();
    const fromMs = from ? toMillis(from) : now;
    const toMs = to ? toMillis(to) + (String(to).includes('T') ? 0 : 24 * 60 * 60 * 1000 - 1) : null;
    const releaseHours = season.friendlyGamesReleaseHours ?? 48;
    const releaseMs = releaseHours * 60 * 60 * 1000;

    let available = allBookings.filter(b => {
        const isFree = b.status === 'available' && !b.homeTeamId && !b.awayTeamId;
        if (!isFree) return false;
        const slotMs = toMillis(b.date);
        if (slotMs < fromMs) return false;
        if (toMs !== null && slotMs > toMs) return false;
        if (pitchId && b.pitchId !== pitchId) return false;
        if (friendly === true) {
            const isFriendlyOpen = Boolean(b.friendly) || slotMs - now <= releaseMs;
            if (!isFriendlyOpen) return false;
        }
        return true;
    });

    const pitchDocs = await getDocsByIds(pitchesCollection, available.map(b => b.pitchId));

    const slots = available.map(b => {
        const slotMs = toMillis(b.date);
        const pitch = b.pitchId ? formatPitch(b.pitchId, pitchDocs.get(b.pitchId), baseUrl) : null;
        return {
            id: b.id,
            seasonId: b.seasonId,
            date: toIso(b.date),
            durationMinutes: Number(b.duration) || 90,
            status: 'available',
            friendly: Boolean(b.friendly),
            friendlyAvailable: Boolean(b.friendly) || slotMs - now <= releaseMs,
            pitch,
        };
    });

    return {
        season: formatSeason(season),
        slots,
    };
}

// --- 5. Spiele / Buchungen (Matches) ---

async function listMatches(
    { seasonParam = 'active', teamId = null, pitchId = null, status = null, from = null, to = null, friendly = null, limit = null } = {},
    authTeamId,
    baseUrl
) {
    const season = await resolveSeason(seasonParam);
    const rawBookings = await BookingService.getBookingsForSeason(season.id, teamId || null);

    const fromMs = from ? toMillis(from) : null;
    const toMs = to ? toMillis(to) + (String(to).includes('T') ? 0 : 24 * 60 * 60 * 1000 - 1) : null;
    const statusFilter = status
        ? String(status)
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
        : null;

    let filtered = rawBookings.filter(b => {
        if (pitchId && b.pitchId !== pitchId) return false;
        if (statusFilter && !statusFilter.includes(b.status)) return false;
        if (friendly !== null && friendly !== undefined && Boolean(b.friendly) !== Boolean(friendly)) return false;
        const dMs = toMillis(b.date);
        if (fromMs !== null && dMs < fromMs) return false;
        if (toMs !== null && dMs > toMs) return false;
        return true;
    });

    if (limit) {
        filtered = filtered.slice(0, limit);
    }

    const teamIds = filtered.flatMap(b => [b.homeTeamId, b.awayTeamId]);
    const pitchIds = filtered.map(b => b.pitchId);

    const [teamDocs, pitchDocs, seasonResultsSnap] = await Promise.all([
        getDocsByIds(teamsCollection, teamIds),
        getDocsByIds(pitchesCollection, pitchIds),
        resultsCollection.where('seasonId', '==', season.id).get(),
    ]);

    const resultByBookingId = new Map();
    seasonResultsSnap.forEach(doc => {
        const data = doc.data();
        if (data.bookingId) {
            resultByBookingId.set(data.bookingId, { id: doc.id, ...data });
        }
    });

    const matches = filtered.map(b =>
        formatMatch(b, { teamDocs, pitchDocs, resultByBookingId, authTeamId, baseUrl })
    );

    return {
        season: formatSeason(season),
        matches,
    };
}

async function getMatchById(matchId, authTeamId, baseUrl) {
    if (!isValidDocId(String(matchId))) throw ApiError.notFound('Spieltermin nicht gefunden.');
    const doc = await bookingsCollection.doc(String(matchId)).get();
    if (!doc.exists) throw ApiError.notFound('Spieltermin nicht gefunden.');
    const booking = { id: doc.id, ...doc.data() };

    const [teamDocs, pitchDocs, resultSnap] = await Promise.all([
        getDocsByIds(teamsCollection, [booking.homeTeamId, booking.awayTeamId]),
        getDocsByIds(pitchesCollection, [booking.pitchId]),
        resultsCollection.where('bookingId', '==', booking.id).limit(1).get(),
    ]);

    const resultByBookingId = new Map();
    if (!resultSnap.empty) {
        const rDoc = resultSnap.docs[0];
        resultByBookingId.set(booking.id, { id: rDoc.id, ...rDoc.data() });
    }

    return {
        match: formatMatch(booking, { teamDocs, pitchDocs, resultByBookingId, authTeamId, baseUrl }),
    };
}

/**
 * Spiel auf einem freien offiziellen Platz-Slot ausmachen / anfragen.
 * Unterstützt sowohl `{ slotId, opponentTeamId, isHome }` als auch `{ slotId, homeTeamId, awayTeamId }`.
 */
async function requestOfficialSlot(authTeamId, userUid, body, baseUrl) {
    const slotId = body.slotId || body.bookingId || body.matchId;
    if (!slotId || !isValidDocId(String(slotId))) {
        throw ApiError.badRequest('Eine gültige slotId ist erforderlich.');
    }

    let homeTeamId = body.homeTeamId;
    let awayTeamId = body.awayTeamId;

    if (body.opponentTeamId) {
        const isHome = body.isHome !== false;
        homeTeamId = isHome ? authTeamId : body.opponentTeamId;
        awayTeamId = isHome ? body.opponentTeamId : authTeamId;
    }

    if (!homeTeamId || !awayTeamId) {
        throw ApiError.badRequest('Bitte opponentTeamId (oder homeTeamId und awayTeamId) angeben.');
    }
    if (homeTeamId === awayTeamId) {
        throw ApiError.badRequest('Heim- und Auswärtsteam dürfen nicht identisch sein.');
    }
    if (homeTeamId !== authTeamId && awayTeamId !== authTeamId) {
        throw ApiError.forbidden('Dein Team muss selbst als Heim- oder Auswärtsteam an der Spielanfrage beteiligt sein.');
    }
    if (homeTeamId !== authTeamId) {
        throw ApiError.forbidden('Bei einer neuen Spielanfrage muss das anfragende Team als Heimteam (Anfragesteller) auftreten, damit der Gegner bestätigen kann.');
    }

    await getTeamOrThrow(awayTeamId);

    const friendly = Boolean(body.friendly);
    const serviceRes = await BookingService.requestBookingSlot(
        String(slotId),
        homeTeamId,
        awayTeamId,
        userUid,
        friendly
    );

    clearPublicCache();
    const { match } = await getMatchById(String(slotId), authTeamId, baseUrl);

    return {
        message: serviceRes.message || 'Spielanfrage erfolgreich gesendet.',
        match,
    };
}

/**
 * Individuelles Spiel auf eigenem Team-Platz anlegen / anfragen.
 */
async function createCustomMatch(authTeamId, user, body, baseUrl) {
    const pitchId = body.pitchId;
    const awayTeamId = body.opponentTeamId || body.awayTeamId;
    const homeTeamId = body.homeTeamId || authTeamId;

    if (homeTeamId !== authTeamId) {
        throw ApiError.forbidden('Individuelle Spiele auf eigenem Platz können nur für das eigene Team als Heimteam erstellt werden.');
    }
    if (!pitchId) {
        throw ApiError.badRequest('pitchId ist erforderlich.');
    }
    if (!awayTeamId) {
        throw ApiError.badRequest('opponentTeamId (oder awayTeamId) ist erforderlich.');
    }
    if (homeTeamId === awayTeamId) {
        throw ApiError.badRequest('Heim- und Auswärtsteam dürfen nicht identisch sein.');
    }

    await getTeamOrThrow(awayTeamId);
    const season = await resolveSeason(body.seasonId || body.season || 'active');

    let dateStr = body.date;
    let timeStr = body.time;
    if (dateStr && typeof dateStr === 'string' && dateStr.includes('T') && !timeStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            timeStr = d.toTimeString().slice(0, 5);
        }
    }

    if (!dateStr || !timeStr) {
        throw ApiError.badRequest('date (YYYY-MM-DD) und time (HH:mm) sind erforderlich.');
    }

    const created = await BookingService.createCustomBooking(
        {
            pitchId: String(pitchId),
            homeTeamId,
            awayTeamId: String(awayTeamId),
            seasonId: season.id,
            date: dateStr,
            time: timeStr,
            duration: Number(body.duration || body.durationMinutes) || 105,
            friendly: Boolean(body.friendly),
        },
        user
    );

    clearPublicCache();
    const { match } = await getMatchById(created.id, authTeamId, baseUrl);

    return {
        message: 'Individuelle Spielanfrage erfolgreich erstellt.',
        match,
    };
}

/**
 * Offene Spielanfrage als angefragtes Team annehmen / bestätigen.
 */
async function confirmMatchRequest(authTeamId, matchId, baseUrl) {
    if (!isValidDocId(String(matchId))) throw ApiError.notFound('Spieltermin nicht gefunden.');
    const res = await BookingService.respondToBookingRequest(String(matchId), 'confirm', '', authTeamId);
    clearPublicCache();
    const { match } = await getMatchById(String(matchId), authTeamId, baseUrl);
    return {
        message: res.message || 'Spielanfrage erfolgreich bestätigt.',
        match,
    };
}

/**
 * Offene Spielanfrage als angefragtes Team ablehnen.
 */
async function rejectMatchRequest(authTeamId, matchId, { reason = '' } = {}, baseUrl) {
    if (!isValidDocId(String(matchId))) throw ApiError.notFound('Spieltermin nicht gefunden.');
    const res = await BookingService.respondToBookingRequest(String(matchId), 'deny', reason || '', authTeamId);
    clearPublicCache();

    // Bei individuellen Buchungen wird das Dokument beim Ablehnen gelöscht
    let match = null;
    try {
        const fetched = await getMatchById(String(matchId), authTeamId, baseUrl);
        match = fetched.match;
    } catch (_) {
        match = null;
    }

    return {
        message: res.message || 'Spielanfrage abgelehnt.',
        match,
    };
}

/**
 * Vereinbartes Spiel absagen oder eigene offene Anfrage zurückziehen.
 */
async function cancelMatch(authTeamId, matchId, { reason = '' } = {}, baseUrl) {
    if (!isValidDocId(String(matchId))) throw ApiError.notFound('Spieltermin nicht gefunden.');
    const res = await BookingService.initiateCancellation(String(matchId), authTeamId, reason || '');
    clearPublicCache();

    let match = null;
    try {
        const fetched = await getMatchById(String(matchId), authTeamId, baseUrl);
        match = fetched.match;
    } catch (_) {
        match = null;
    }

    return {
        message: res.message || 'Spiel wurde abgesagt.',
        match,
    };
}

// --- 6. Ergebnisse (Results) ---

async function listResults(
    { seasonParam = 'active', teamId = null, status = null, includeFriendly = false, limit = null } = {},
    authTeamId,
    baseUrl
) {
    const season = await resolveSeason(seasonParam);
    const snapshot = await resultsCollection.where('seasonId', '==', season.id).get();

    const statusFilter = status
        ? String(status)
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
        : null;

    let rawResults = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    rawResults = rawResults.filter(r => {
        if (!includeFriendly && r.friendly) return false;
        if (teamId && r.homeTeamId !== teamId && r.awayTeamId !== teamId) return false;
        if (statusFilter && !statusFilter.includes(r.status)) return false;
        return true;
    });

    rawResults.sort(
        (a, b) =>
            (toMillis(b.date) || toMillis(b.confirmedAt) || toMillis(b.reportedAt)) -
            (toMillis(a.date) || toMillis(a.confirmedAt) || toMillis(a.reportedAt))
    );

    if (limit) {
        rawResults = rawResults.slice(0, limit);
    }

    const teamDocs = await getDocsByIds(
        teamsCollection,
        rawResults.flatMap(r => [r.homeTeamId, r.awayTeamId])
    );

    return {
        season: formatSeason(season),
        results: rawResults.map(r => formatResult(r, { teamDocs, authTeamId, baseUrl })),
    };
}

async function getResultById(resultId, authTeamId, baseUrl) {
    if (!isValidDocId(String(resultId))) throw ApiError.notFound('Ergebnis nicht gefunden.');
    const doc = await resultsCollection.doc(String(resultId)).get();
    if (!doc.exists) throw ApiError.notFound('Ergebnis nicht gefunden.');
    const data = { id: doc.id, ...doc.data() };

    const teamDocs = await getDocsByIds(teamsCollection, [data.homeTeamId, data.awayTeamId]);
    return {
        result: formatResult(data, { teamDocs, authTeamId, baseUrl }),
    };
}

function validateScoreValue(value, fieldName) {
    const parsed = Number(value);
    if (value === undefined || value === null || value === '' || !Number.isInteger(parsed) || parsed < 0 || parsed > 99) {
        throw ApiError.badRequest(`Ungültiger Spielstand für '${fieldName}'. Erlaubt sind ganze Zahlen von 0 bis 99.`);
    }
    return parsed;
}

/**
 * Ergebnis für ein bestätigtes Spiel eintragen / melden.
 */
async function reportMatchResult(authTeamId, userUid, matchId, { homeScore, awayScore } = {}, baseUrl) {
    if (!isValidDocId(String(matchId))) throw ApiError.badRequest('Eine gültige matchId (bookingId) ist erforderlich.');
    const cleanHomeScore = validateScoreValue(homeScore, 'homeScore');
    const cleanAwayScore = validateScoreValue(awayScore, 'awayScore');

    const bookingDoc = await bookingsCollection.doc(String(matchId)).get();
    if (!bookingDoc.exists) {
        throw ApiError.notFound('Das zugehörige Spiel wurde nicht gefunden.');
    }
    const bookingData = bookingDoc.data();

    if (bookingData.homeTeamId !== authTeamId && bookingData.awayTeamId !== authTeamId) {
        throw ApiError.forbidden('Du kannst nur Ergebnisse für Spiele melden, an denen dein Team beteiligt ist.');
    }

    const created = await resultService.reportResult(String(matchId), {
        homeScore: cleanHomeScore,
        awayScore: cleanAwayScore,
        reportedByTeamId: authTeamId,
        reportedByUserId: userUid,
    });

    clearPublicCache();
    const { result } = await getResultById(created.id, authTeamId, baseUrl);

    return {
        message: 'Ergebnis erfolgreich eingetragen. Der Gegner wurde zur Bestätigung benachrichtigt.',
        result,
    };
}

/**
 * Gemeldetes Ergebnis als gegnerisches Team bestätigen.
 */
async function confirmResult(authTeamId, userUid, resultId, baseUrl) {
    if (!isValidDocId(String(resultId))) throw ApiError.notFound('Ergebnis nicht gefunden.');
    const doc = await resultsCollection.doc(String(resultId)).get();
    if (!doc.exists) throw ApiError.notFound('Ergebnis nicht gefunden.');
    const data = doc.data();

    if (data.homeTeamId !== authTeamId && data.awayTeamId !== authTeamId) {
        throw ApiError.forbidden('Dein Team ist an diesem Spiel nicht beteiligt.');
    }

    const res = await resultService.handleResultAction(String(resultId), authTeamId, userUid, 'confirm');
    clearPublicCache();
    const { result } = await getResultById(String(resultId), authTeamId, baseUrl);

    return {
        message: res.message || 'Ergebnis erfolgreich bestätigt.',
        result,
    };
}

/**
 * Gemeldetes Ergebnis als gegnerisches Team ablehnen (setzt Spiel zurück auf 'confirmed', sodass neu gemeldet werden kann).
 */
async function rejectResult(authTeamId, userUid, resultId, { reason = '' } = {}) {
    if (!isValidDocId(String(resultId))) throw ApiError.notFound('Ergebnis nicht gefunden.');
    const doc = await resultsCollection.doc(String(resultId)).get();
    if (!doc.exists) throw ApiError.notFound('Ergebnis nicht gefunden.');
    const data = doc.data();

    if (data.homeTeamId !== authTeamId && data.awayTeamId !== authTeamId) {
        throw ApiError.forbidden('Dein Team ist an diesem Spiel nicht beteiligt.');
    }

    const res = await resultService.handleResultAction(String(resultId), authTeamId, userUid, 'reject', reason || '');
    clearPublicCache();

    return {
        message: res.message || 'Ergebnis abgelehnt. Es kann nun neu eingetragen werden.',
        matchId: data.bookingId || null,
    };
}

/**
 * Gemeldetes Ergebnis anfechten (Status 'disputed' für Ligaleitung).
 */
async function disputeResult(authTeamId, userUid, resultId, { reason = '' } = {}, baseUrl) {
    if (!isValidDocId(String(resultId))) throw ApiError.notFound('Ergebnis nicht gefunden.');
    const doc = await resultsCollection.doc(String(resultId)).get();
    if (!doc.exists) throw ApiError.notFound('Ergebnis nicht gefunden.');
    const data = doc.data();

    if (data.homeTeamId !== authTeamId && data.awayTeamId !== authTeamId) {
        throw ApiError.forbidden('Dein Team ist an diesem Spiel nicht beteiligt.');
    }

    const res = await resultService.handleResultAction(String(resultId), authTeamId, userUid, 'dispute', reason || '');
    clearPublicCache();
    const { result } = await getResultById(String(resultId), authTeamId, baseUrl);

    return {
        message: res.message || 'Ergebnis wurde als strittig markiert.',
        result,
    };
}

/**
 * Eigene noch ausstehende Ergebnismeldung zurückziehen.
 */
async function withdrawResultReport(authTeamId, resultId) {
    if (!isValidDocId(String(resultId))) throw ApiError.notFound('Ergebnis nicht gefunden.');
    const doc = await resultsCollection.doc(String(resultId)).get();
    if (!doc.exists) throw ApiError.notFound('Ergebnis nicht gefunden.');
    const data = doc.data();

    const res = await resultService.cancelReport(String(resultId), authTeamId);
    clearPublicCache();

    return {
        message: res.message || 'Ergebnismeldung erfolgreich zurückgezogen.',
        matchId: data.bookingId || null,
    };
}

/**
 * Noch nicht bestätigtes Ergebnis korrigieren.
 */
async function updatePendingResult(authTeamId, user, resultId, { homeScore, awayScore } = {}, baseUrl) {
    if (!isValidDocId(String(resultId))) throw ApiError.notFound('Ergebnis nicht gefunden.');
    const cleanHomeScore = validateScoreValue(homeScore, 'homeScore');
    const cleanAwayScore = validateScoreValue(awayScore, 'awayScore');

    const doc = await resultsCollection.doc(String(resultId)).get();
    if (!doc.exists) throw ApiError.notFound('Ergebnis nicht gefunden.');
    const data = doc.data();

    if (data.homeTeamId !== authTeamId && data.awayTeamId !== authTeamId) {
        throw ApiError.forbidden('Dein Team ist an diesem Spiel nicht beteiligt.');
    }
    if (data.status !== 'pending') {
        throw ApiError.conflict('Bereits bestätigte Ergebnisse können durch Teams nicht mehr geändert werden.');
    }

    await resultsCollection.doc(String(resultId)).update({
        homeScore: cleanHomeScore,
        awayScore: cleanAwayScore,
        reportedByTeamId: authTeamId,
        reportedByUserId: user.uid,
        editedBy: user.uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    clearPublicCache();
    const { result } = await getResultById(String(resultId), authTeamId, baseUrl);

    return {
        message: 'Ergebnismeldung wurde aktualisiert.',
        result,
    };
}

// --- 7. Benachrichtigungen ---

async function listTeamNotifications(teamId, { unreadOnly = true, limit = 50 } = {}) {
    let query = notificationsCollection.where('teamId', '==', teamId);
    if (unreadOnly) {
        query = query.where('read', '==', false);
    }

    const snapshot = await query.get();
    let notifications = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

    if (limit) {
        notifications = notifications.slice(0, limit);
    }

    return {
        unreadCount: notifications.filter(n => !n.read).length,
        notifications: notifications.map(formatNotification),
    };
}

async function markNotificationRead(teamId, notificationId) {
    if (!isValidDocId(String(notificationId))) throw ApiError.notFound('Benachrichtigung nicht gefunden.');
    const doc = await notificationsCollection.doc(String(notificationId)).get();
    if (!doc.exists) throw ApiError.notFound('Benachrichtigung nicht gefunden.');
    if (doc.data().teamId !== teamId) {
        throw ApiError.forbidden('Diese Benachrichtigung gehört nicht deinem Team.');
    }

    await notificationService.markAsRead(String(notificationId));
    return { message: 'Benachrichtigung als gelesen markiert.' };
}

async function markAllNotificationsRead(teamId) {
    await notificationService.markAllAsReadForTeam(teamId);
    return { message: 'Alle Benachrichtigungen als gelesen markiert.' };
}

module.exports = {
    listSeasons,
    getSeasonDetails,
    getSeasonTable,
    getSeasonTeams,
    getTeamDetails,
    getTeamStats,
    getHeadToHead,
    getMyTeamOverview,
    updateMyTeamProfile,
    generateTeamApiKey,
    revokeTeamApiKey,
    getPotentialOpponentsForTeam,
    getMyTeamActionCenter,
    listPitches,
    createTeamPitch,
    updateTeamPitch,
    listAvailableSlots,
    listMatches,
    getMatchById,
    requestOfficialSlot,
    createCustomMatch,
    confirmMatchRequest,
    rejectMatchRequest,
    cancelMatch,
    listResults,
    getResultById,
    reportMatchResult,
    confirmResult,
    rejectResult,
    disputeResult,
    withdrawResultReport,
    updatePendingResult,
    listTeamNotifications,
    markNotificationRead,
    markAllNotificationsRead,
};

