// filepath: c:\Users\hansj\OneDrive\Dokumente\Bunte Liga HP\bunteliga-freiburg\Backend\services\seasonService.js
const admin = require('firebase-admin');
const Season = require('../models/season');

const db = admin.firestore();
const seasonsCollection = db.collection('seasons');
const teamsCollection = db.collection('teams');
const resultsCollection = db.collection('results');
const bookingsCollection = db.collection('bookings');
const tableService = require('./tableService');

/**
 * Wandelt einen Datums-String (YYYY-MM-DD) sicher in ein Firestore Timestamp-Objekt um.
 */
const safeCreateTimestampFromString = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return null;
    const parts = dateString.split('T')[0].split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    const utcDate = new Date(Date.UTC(year, month, day));
    return admin.firestore.Timestamp.fromDate(utcDate);
};

async function getAllSeasons() {
    const snapshot = await seasonsCollection.orderBy('name', 'desc').get();
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => {
        const data = doc.data();

        // FINALE KORREKTUR: Robuste Prüfung, um den ".toDate is not a function"-Fehler zu beheben.
        // Diese Funktion prüft, ob das Feld ein gültiger Timestamp ist, bevor es konvertiert wird.
        const formattedData = {
            ...data,
            startDate: (data.startDate && typeof data.startDate.toDate === 'function')
                ? data.startDate.toDate().toISOString().split('T')[0]
                : null,
            endDate: (data.endDate && typeof data.endDate.toDate === 'function')
                ? data.endDate.toDate().toISOString().split('T')[0]
                : null,
            createdAt: (data.createdAt && typeof data.createdAt.toDate === 'function')
                ? data.createdAt.toDate().toISOString()
                : null,
            updatedAt: (data.updatedAt && typeof data.updatedAt.toDate === 'function')
                ? data.updatedAt.toDate().toISOString()
                : null,
        };
        return { id: doc.id, ...formattedData };
    });
}

async function createSeason(seasonData) {
    if (seasonData.teams && seasonData.teams.length > 0) {
        const teamPromises = seasonData.teams.map(team => teamsCollection.doc(team.id).get());
        const teamSnapshots = await Promise.all(teamPromises);
        const missingTeams = teamSnapshots.map((doc, i) => !doc.exists ? seasonData.teams[i].id : null).filter(Boolean);
        if (missingTeams.length > 0) {
            throw new Error(`Folgende Teams wurden nicht gefunden: ${missingTeams.join(', ')}`);
        }
    }

    const processedData = {
        ...seasonData,
        startDate: safeCreateTimestampFromString(seasonData.startDate),
        endDate: safeCreateTimestampFromString(seasonData.endDate),
    };

    const newSeason = new Season(processedData);
    const firestoreObject = newSeason.toFirestoreObject();

    firestoreObject.createdAt = admin.firestore.FieldValue.serverTimestamp();
    firestoreObject.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    const docRef = await seasonsCollection.add(firestoreObject);
    return { id: docRef.id, ...firestoreObject };
}

async function updateSeason(seasonId, updateData) {
    const seasonRef = seasonsCollection.doc(seasonId);
    const allowedUpdates = { ...updateData };
    delete allowedUpdates.id;
    delete allowedUpdates.createdBy;

    if (allowedUpdates.hasOwnProperty('startDate')) {
        allowedUpdates.startDate = safeCreateTimestampFromString(allowedUpdates.startDate);
    }
    if (allowedUpdates.hasOwnProperty('endDate')) {
        allowedUpdates.endDate = safeCreateTimestampFromString(allowedUpdates.endDate);
    }

    allowedUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await seasonRef.update(allowedUpdates);
    return { message: 'Saison erfolgreich aktualisiert.' };
}

/**
 * Ruft eine einzelne Saison anhand ihrer ID ab.
 */
async function getSeasonById(seasonId) {
    const doc = await seasonsCollection.doc(seasonId).get();
    if (!doc.exists) throw new Error('Saison nicht gefunden.');
    return { id: doc.id, ...doc.data() };
}

/**
 * NEU: Sucht die aktuell als "active" markierte Saison.
 * Wirft einen Fehler, wenn keine gefunden wird.
 */
async function getActiveSeason() {
    const snapshot = await seasonsCollection.where('status', '==', 'active').limit(1).get();
    if (snapshot.empty) {
        throw new Error('Keine aktive Saison gefunden.');
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
}

/**
 * NEU: Implementierung der fehlenden deleteSeason-Funktion.
 * Löscht ein Saison-Dokument aus der Firestore-Datenbank.
 */
async function deleteSeason(seasonId) {
    const seasonRef = seasonsCollection.doc(seasonId);
    const doc = await seasonRef.get();
    if (!doc.exists) {
        throw new Error('Saison nicht gefunden.');
    }
    await seasonRef.delete();
    return { message: 'Saison erfolgreich gelöscht.' };
}

/**
 * NEU: Beendet eine Saison (setzt Status auf 'finished').
 */
async function finishSeason(seasonId, adminUid) {
    const seasonRef = seasonsCollection.doc(seasonId);
    const doc = await seasonRef.get();
    if (!doc.exists) {
        throw new Error('Saison nicht gefunden.');
    }
    const seasonData = doc.data();
    if (seasonData.status !== 'active' && seasonData.status !== 'inactive') {
        throw new Error('Nur aktive oder inaktive Saisons können beendet werden.');
    }

    await seasonRef.update({
        status: 'finished',
        isFinished: true,
        finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        finishedBy: adminUid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { message: 'Saison erfolgreich beendet.' };
}

/**
 * NEU: Setzt eine Saison als die aktuell aktive fest.
 * Setzt alle anderen Saisons auf 'planning' zurück.
 */
async function setCurrentSeason(seasonId) {
    const seasonRef = seasonsCollection.doc(seasonId);
    const doc = await seasonRef.get();
    if (!doc.exists) {
        throw new Error('Saison nicht gefunden.');
    }
    const seasonData = doc.data();
    if (seasonData.status !== 'planning' && seasonData.status !== 'inactive') {
        throw new Error('Nur Saisons in Planung oder inaktive Saisons können aktiviert werden.');
    }

    // Setze alle anderen aktiven Saisons auf 'inactive'
    const activeSeasons = await seasonsCollection.where('status', '==', 'active').get();
    const batch = db.batch();

    activeSeasons.docs.forEach(activeDoc => {
        batch.update(activeDoc.ref, {
            status: 'inactive',
            isCurrent: false,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    });

    // Setze die neue Saison auf 'active'
    batch.update(seasonRef, {
        status: 'active',
        isCurrent: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();
    return { message: 'Saison erfolgreich aktiviert.' };
}

/**
 * NEU: Archiviert eine Saison (setzt Status auf 'archived').
 */
async function archiveSeason(seasonId) {
    const seasonRef = seasonsCollection.doc(seasonId);
    const doc = await seasonRef.get();
    if (!doc.exists) {
        throw new Error('Saison nicht gefunden.');
    }
    const seasonData = doc.data();
    if (seasonData.status !== 'finished' && seasonData.status !== 'planning' && seasonData.status !== 'inactive') {
        throw new Error('Nur beendete, geplante oder inaktive Saisons können archiviert werden.');
    }

    await seasonRef.update({
        status: 'archived',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { message: 'Saison erfolgreich archiviert.' };
}

/**
 * NEU: Rechnet eine Saison ab (setzt evaluated = true, Status bleibt 'active').
 */
async function evaluateSeason(seasonId, adminUid) {
    const seasonRef = seasonsCollection.doc(seasonId);
    const doc = await seasonRef.get();
    if (!doc.exists) {
        throw new Error('Saison nicht gefunden.');
    }
    const seasonData = doc.data();
    if (seasonData.status !== 'active' && seasonData.status !== 'inactive') {
        throw new Error('Nur aktive oder inaktive Saisons können abgerechnet werden.');
    }
    if (seasonData.evaluated === true) {
        throw new Error('Saison wurde bereits abgerechnet.');
    }

    const seasonTeams = (seasonData.teams || []).filter(team => team.status !== 'inactive');

    if (seasonTeams.length > 0) {
        const eligibleTeams = await determineEligibleTeams(seasonId, seasonTeams, seasonData);
        if (eligibleTeams.length > 0) {
            await applySeasonStatsToAllTimeTable(seasonId, seasonData, seasonTeams);
        }
    }

    await seasonRef.update({
        evaluated: true,
        evaluatedAt: admin.firestore.FieldValue.serverTimestamp(),
        evaluatedBy: adminUid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return { message: 'Saison erfolgreich abgerechnet.' };
}

async function determineEligibleTeams(seasonId, activeTeams, seasonData) {
    // Berechnung der Hälfte der Spiele (abgerundet)
    // 20 Teams -> 19 Spiele (Hinrunde) -> 9.5 -> 9 Spiele nötig
    // 19 Teams -> 18 Spiele (Hinrunde) -> 9 Spiele nötig
    const isDoubleRound = seasonData.playMode === 'double_round_robin';
    const multiplier = isDoubleRound ? 2 : 1;
    const maxGamesPerTeam = Math.max(0, (activeTeams.length - 1) * multiplier);
    const minGames = Math.floor(maxGamesPerTeam / 2);

    console.log(`[DetermineEligible] Teams: ${activeTeams.length}, Mode: ${seasonData.playMode}, MaxGames: ${maxGamesPerTeam}, MinGames: ${minGames}`);
    const validGameCount = {};
    activeTeams.forEach(team => { validGameCount[team.id] = 0; });

    const resultsSnapshot = await resultsCollection
        .where('seasonId', '==', seasonId)
        .where('status', '==', 'confirmed')
        .get();

    resultsSnapshot.forEach(doc => {
        const result = doc.data();
        if (result.isValid === false) return;

        if (validGameCount[result.homeTeamId] !== undefined) validGameCount[result.homeTeamId] += 1;
        if (validGameCount[result.awayTeamId] !== undefined) validGameCount[result.awayTeamId] += 1;
    });

    return activeTeams.filter(team => (validGameCount[team.id] || 0) >= minGames);
}

async function applySeasonStatsToAllTimeTable(seasonId, seasonData, eligibleTeams) {
    const pointsConfig = {
        win: typeof seasonData.pointsForWin === 'number' ? seasonData.pointsForWin : 2,
        draw: typeof seasonData.pointsForDraw === 'number' ? seasonData.pointsForDraw : 1,
        loss: typeof seasonData.pointsForLoss === 'number' ? seasonData.pointsForLoss : 0,
    };

    const teamStats = {};
    eligibleTeams.forEach(team => {
        teamStats[team.id] = {
            games: 0,
            goals: 0,
            conceded: 0,
            points: 0,
        };
    });

    const resultsSnapshot = await resultsCollection
        .where('seasonId', '==', seasonId)
        .where('status', '==', 'confirmed')
        .get();

    resultsSnapshot.forEach(doc => {
        const result = doc.data();

        const homeStats = teamStats[result.homeTeamId];
        const awayStats = teamStats[result.awayTeamId];
        if (!homeStats && !awayStats) return;

        const homeScore = Number(result.homeScore) || 0;
        const awayScore = Number(result.awayScore) || 0;

        if (homeStats) {
            homeStats.games += 1;
            homeStats.goals += homeScore;
            homeStats.conceded += awayScore;
        }
        if (awayStats) {
            awayStats.games += 1;
            awayStats.goals += awayScore;
            awayStats.conceded += homeScore;
        }

        if (homeScore > awayScore) {
            if (homeStats) homeStats.points += pointsConfig.win;
            if (awayStats) awayStats.points += pointsConfig.loss;
        } else if (homeScore < awayScore) {
            if (awayStats) awayStats.points += pointsConfig.win;
            if (homeStats) homeStats.points += pointsConfig.loss;
        } else {
            if (homeStats) homeStats.points += pointsConfig.draw;
            if (awayStats) awayStats.points += pointsConfig.draw;
        }
    });

    const batch = db.batch();
    eligibleTeams.forEach(team => {
        const stats = teamStats[team.id] || { games: 0, goals: 0, conceded: 0, points: 0 };
        const goalDiff = stats.goals - stats.conceded;
        const teamRef = teamsCollection.doc(team.id);

        batch.set(teamRef, {
            allTimeYears: admin.firestore.FieldValue.increment(1),
            allTimeGames: admin.firestore.FieldValue.increment(stats.games),
            allTimeGoals: admin.firestore.FieldValue.increment(stats.goals),
            allTimeConceded: admin.firestore.FieldValue.increment(stats.conceded),
            allTimeDiff: admin.firestore.FieldValue.increment(goalDiff),
            allTimePoints: admin.firestore.FieldValue.increment(stats.points),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    });

    await batch.commit();
}

/**
 * NEU: Löscht eine Saison und alle zugehörigen Daten (Ergebnisse, Buchungen).
 */
async function deleteSeasonWithAllData(seasonId, adminUid) {
    const seasonRef = seasonsCollection.doc(seasonId);
    const doc = await seasonRef.get();
    if (!doc.exists) {
        throw new Error('Saison nicht gefunden.');
    }

    // Verwende eine Batch-Operation für atomare Löschung
    const batch = db.batch();

    // 1. Lösche alle Ergebnisse dieser Saison
    const resultsSnapshot = await resultsCollection.where('seasonId', '==', seasonId).get();
    resultsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    // 2. Lösche alle Buchungen dieser Saison
    const bookingsSnapshot = await bookingsCollection.where('seasonId', '==', seasonId).get();
    bookingsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });

    // 3. Lösche die Saison selbst
    batch.delete(seasonRef);

    // Führe alle Löschungen in einer Transaktion aus
    await batch.commit();

    return {
        message: 'Saison und alle zugehörigen Daten erfolgreich gelöscht.',
        deletedResults: resultsSnapshot.size,
        deletedBookings: bookingsSnapshot.size
    };
}

module.exports = {
    createSeason,
    getAllSeasons,
    getSeasonById,
    updateSeason,
    getActiveSeason,
    deleteSeason,
    finishSeason,
    setCurrentSeason,
    archiveSeason,
    evaluateSeason,
    deleteSeasonWithAllData
};