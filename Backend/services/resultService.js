const admin = require('firebase-admin');
const Result = require('../models/result');
const db = admin.firestore();
const resultsCollection = db.collection('results');
const teamsCollection = db.collection('teams');
const seasonsCollection = db.collection('seasons'); // Referenz zu Saisons hinzufügen
const bookingsCollection = db.collection('bookings');
const { checkCaptainOfActingTeam } = require('../middleware/permissionMiddleware');

/**
 * Erstellt ein Forfeit-Ergebnis basierend auf den Regeln der jeweiligen Saison.
 */
async function createForfeitResult({ seasonId, winningTeamId, losingTeamId, bookingId }) {
  // 1. Lese die Regeln aus der Saison aus
  const seasonDoc = await seasonsCollection.doc(seasonId).get();
  if (!seasonDoc.exists) {
    throw new Error('Saison für das Straf-Ergebnis nicht gefunden.');
  }
  const seasonData = seasonDoc.data();
  const winScore = seasonData.forfeitWinScore !== undefined ? seasonData.forfeitWinScore : 3;
  const lossScore = seasonData.forfeitLossScore !== undefined ? seasonData.forfeitLossScore : 0;

  // 2. Team-Namen für die Denormalisierung abrufen
  const winningTeamDoc = await teamsCollection.doc(winningTeamId).get();
  const losingTeamDoc = await teamsCollection.doc(losingTeamId).get();
  if (!winningTeamDoc.exists || !losingTeamDoc.exists) {
    throw new Error('Eines der Teams für das Straf-Ergebnis konnte nicht gefunden werden.');
  }
  const winningTeamName = winningTeamDoc.data().name;
  const losingTeamName = losingTeamDoc.data().name;

  // 3. Das Result-Objekt mit dynamischer Wertung erstellen
  const resultData = {
    homeTeamId: winningTeamId,
    homeTeamName: winningTeamName,
    awayTeamId: losingTeamId,
    awayTeamName: losingTeamName,
    homeScore: winScore, // Dynamischer Wert
    awayScore: lossScore, // Dynamischer Wert
    seasonId: seasonId,
    reportedByTeamId: 'system_forfeit',
    reportedByUserId: 'system',
    bookingId: bookingId,
  };

  const newResult = new Result(resultData);
  const firestoreObject = newResult.toFirestoreObject();

  // 4. Ein Forfeit-Ergebnis ist immer sofort bestätigt
  firestoreObject.status = 'confirmed';
  firestoreObject.confirmedByTeamId = 'system_forfeit';
  firestoreObject.confirmedAt = admin.firestore.FieldValue.serverTimestamp();
  firestoreObject.createdAt = admin.firestore.FieldValue.serverTimestamp();

  const docRef = await resultsCollection.add(firestoreObject);
  return { id: docRef.id, ...firestoreObject };
}

/**
 * Ein Team meldet ein Ergebnis für ein bestätigtes Spiel.
 * Erstellt ein 'pending' Ergebnis und markiert die Buchung als 'played'.
 */
async function reportResult(bookingId, resultData) {
  const bookingRef = bookingsCollection.doc(bookingId);
  const newResultRef = resultsCollection.doc();

  return db.runTransaction(async (transaction) => {
    const bookingDoc = await transaction.get(bookingRef);
    if (!bookingDoc.exists || bookingDoc.data().status !== 'confirmed') {
      throw new Error('Ergebnisse können nur für bestätigte Spiele gemeldet werden.');
    }
    const bookingData = bookingDoc.data();

    const homeTeamDoc = await teamsCollection.doc(bookingData.homeTeamId).get();
    const awayTeamDoc = await teamsCollection.doc(bookingData.awayTeamId).get();
    if (!homeTeamDoc.exists || !awayTeamDoc.exists) throw new Error('Team nicht gefunden.');

    const newResult = new Result({
      ...resultData,
      homeTeamId: bookingData.homeTeamId,
      homeTeamName: homeTeamDoc.data().name,
      awayTeamId: bookingData.awayTeamId,
      awayTeamName: awayTeamDoc.data().name,
      seasonId: bookingData.seasonId,
      bookingId: bookingId,
    });

    const firestoreObject = newResult.toFirestoreObject();
    firestoreObject.reportedAt = admin.firestore.FieldValue.serverTimestamp();
    
    transaction.set(newResultRef, firestoreObject);
    transaction.update(bookingRef, { status: 'played' });

    return { id: newResultRef.id, ...firestoreObject };
  });
}

/**
 * Das gegnerische Team bestätigt oder lehnt ein gemeldetes Ergebnis ab.
 */
async function handleResultAction(resultId, actingTeamId, actingUserId, action, reason = '') {
  const resultRef = resultsCollection.doc(resultId);
  const resultDoc = await resultRef.get();
  if (!resultDoc.exists || resultDoc.data().status !== 'pending') {
    throw new Error('Diese Aktion ist für dieses Ergebnis nicht möglich.');
  }
  if (resultDoc.data().reportedByTeamId === actingTeamId) {
    throw new Error('Du kannst dein eigenes Ergebnis nicht bestätigen oder ablehnen.');
  }

  if (action === 'confirm') {
    await resultRef.update({
      status: 'confirmed',
      confirmedByTeamId: actingTeamId,
      confirmedByUserId: actingUserId,
      confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { message: 'Ergebnis erfolgreich bestätigt.' };
  }

  if (action === 'reject') {
    await resultRef.update({
      status: 'disputed',
      rejectedByTeamId: actingTeamId,
      rejectedByUserId: actingUserId,
      rejectionReason: reason,
      rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { message: 'Ergebnis abgelehnt und zur Prüfung an den Admin weitergeleitet.' };
  }
  throw new Error('Ungültige Aktion.');
}

/**
 * Holt alle Ergebnisse, die von Admins geprüft werden müssen.
 */
async function getDisputedResults() {
    const snapshot = await resultsCollection.where('status', '==', 'disputed').get();
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Holt alle relevanten Ergebnisse für ein bestimmtes Team.
 */
async function getResultsForTeam(teamId) {
    const homeGamesQuery = resultsCollection.where('homeTeamId', '==', teamId).get();
    const awayGamesQuery = resultsCollection.where('awayTeamId', '==', teamId).get();
    const [homeSnapshot, awaySnapshot] = await Promise.all([homeGamesQuery, awayGamesQuery]);
    
    const results = [];
    homeSnapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
    awaySnapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
    
    return results;
}

/**
 * Ruft die 5 zuletzt bestätigten Ergebnisse ab.
 */
async function getRecentResults(limitNum = 5) {
  const snapshot = await resultsCollection
    .where('status', '==', 'confirmed')
    .orderBy('confirmedAt', 'desc') // Sortiert nach dem Bestätigungsdatum
    .limit(limitNum)
    .get();

  if (snapshot.empty) {
    return [];
  }
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Holt alle Ergebnisse für eine bestimmte Saison.
 */
async function getResultsForSeason(seasonId) {
  // KORREKTUR: Wir entfernen die .orderBy()-Klausel, um den Index-Zwang zu umgehen.
  const snapshot = await resultsCollection
    .where('seasonId', '==', seasonId)
    .get();
    
  if (snapshot.empty) {
    return [];
  }

  const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // KORREKTUR: Die Sortierung der Ergebnisse erfolgt jetzt hier im Backend-Code.
  // Wir sortieren absteigend nach dem Meldedatum (neueste zuerst).
  results.sort((a, b) => {
    const dateA = a.reportedAt?.toDate ? a.reportedAt.toDate() : new Date(0);
    const dateB = b.reportedAt?.toDate ? b.reportedAt.toDate() : new Date(0);
    return dateB - dateA; // Neuestes Datum zuerst
  });

  return results;
}

/**
 * Aktualisiert ein bestehendes Ergebnis.
 * Setzt den Status zurück auf 'pending'.
 */
async function updateResult(resultId, updateData, user) {
  const { homeScore, awayScore } = updateData;
  if (homeScore === undefined || awayScore === undefined) {
    throw new Error('Beide Spielstände (homeScore, awayScore) sind erforderlich.');
  }

  const resultRef = resultsCollection.doc(resultId);
  const resultDoc = await resultRef.get();
  if (!resultDoc.exists) throw new Error('Ergebnis nicht gefunden.');

  // TODO: Hier könnte eine zusätzliche Berechtigungsprüfung stattfinden,
  // ob der 'user' überhaupt Teil dieses Spiels war.

  const payload = {
    homeScore: parseInt(homeScore),
    awayScore: parseInt(awayScore),
    status: 'pending', // Wichtig: Status wird zurückgesetzt
    editedBy: user.uid,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await resultRef.update(payload);
  return { id: resultId, ...resultDoc.data(), ...payload };
}

/**
 * Überschreibt ein Ergebnis final durch einen Admin.
 */
async function adminOverrideResult(resultId, scores, adminUid) {
  const { homeScore, awayScore } = scores;
  const resultRef = resultsCollection.doc(resultId);
  await resultRef.update({
    homeScore: parseInt(homeScore),
    awayScore: parseInt(awayScore),
    status: 'confirmed',
    confirmedBy: adminUid,
    confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { message: 'Ergebnis wurde durch Admin final festgelegt.' };
}

/**
 * Ruft Ergebnisse für ein bestimmtes Team mit einem bestimmten Status ab.
 */
async function getResultsByStatusForTeam(teamId, status) {
  // Ein Team muss auf ein Ergebnis reagieren, wenn es nicht der Melder war.
  const snapshot = await resultsCollection
    .where('status', '==', status)
    // Firestore kann leider nicht auf "ungleich" filtern.
    // Wir holen alle 'pending' und filtern im Code.
    .get();

  if (snapshot.empty) return [];
  
  const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Filtere serverseitig, um nur die Ergebnisse zu liefern, bei denen das Team reagieren muss.
  return results.filter(result => {
    const reportedByTeamId = result.reportedByTeamId || result.reportedBy;
    const isHomeTeam = result.homeTeamId === teamId;
    const isAwayTeam = result.awayTeamId === teamId;
    const wasReportedByThisTeam = reportedByTeamId === teamId;

    if (!isHomeTeam && !isAwayTeam) {
      return false;
    }

    return !wasReportedByThisTeam;
  });
}

/**
 * NEU: Admin erstellt ein Ergebnis, das sofort bestätigt wird.
 * Optional wird eine zugehörige Buchung als 'gespielt' markiert.
 */
async function adminCreateResult(resultData, adminUid) {
  const { homeTeamId, awayTeamId, homeScore, awayScore, seasonId, bookingId } = resultData;

  if (!homeTeamId || !awayTeamId || homeScore === undefined || awayScore === undefined || !seasonId) {
    throw new Error('Unvollständige Daten. Teams, Ergebnis und Saison sind erforderlich.');
  }

  const homeTeamDoc = await teamsCollection.doc(homeTeamId).get();
  const awayTeamDoc = await teamsCollection.doc(awayTeamId).get();
  if (!homeTeamDoc.exists || !awayTeamDoc.exists) throw new Error('Team nicht gefunden.');

  const newResultData = {
    homeTeamId,
    homeTeamName: homeTeamDoc.data().name,
    awayTeamId,
    awayTeamName: awayTeamDoc.data().name,
    homeScore: parseInt(homeScore),
    awayScore: parseInt(awayScore),
    seasonId,
    bookingId: bookingId || null,
    status: 'confirmed', // Admin-Erstellung ist sofort bestätigt
    reportedBy: 'admin',
    reportedByUserId: adminUid,
    reportedAt: admin.firestore.FieldValue.serverTimestamp(),
    confirmedBy: 'admin',
    confirmedByUserId: adminUid,
    confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  return db.runTransaction(async (transaction) => {
    const newResultRef = resultsCollection.doc();
    transaction.set(newResultRef, newResultData);

    if (bookingId) {
      const bookingRef = bookingsCollection.doc(bookingId);
      const bookingDoc = await transaction.get(bookingRef);
      if (bookingDoc.exists) {
        transaction.update(bookingRef, { status: 'played' });
      }
    }
    return { id: newResultRef.id, ...newResultData };
  });
}

/**
 * NEU: Admin aktualisiert ein beliebiges Ergebnis.
 */
async function adminUpdateResult(resultId, updateData, adminUid) {
  const { homeTeamId, awayTeamId, homeScore, awayScore, status, isValid } = updateData;
  const resultRef = resultsCollection.doc(resultId);

  const payload = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: adminUid,
  };

  // Nur Felder hinzufügen, die tatsächlich übergeben wurden
  if (homeScore !== undefined) payload.homeScore = parseInt(homeScore);
  if (awayScore !== undefined) payload.awayScore = parseInt(awayScore);
  if (homeTeamId) payload.homeTeamId = homeTeamId;
  if (awayTeamId) payload.awayTeamId = awayTeamId;
  if (isValid !== undefined) payload.isValid = isValid;

  if (status) {
    payload.status = status;
    if (status === 'confirmed') {
      payload.confirmedBy = 'admin';
      payload.confirmedByUserId = adminUid;
      payload.confirmedAt = admin.firestore.FieldValue.serverTimestamp();
    }
  }

  await resultRef.update(payload);
  const updatedDoc = await resultRef.get();
  return { id: updatedDoc.id, ...updatedDoc.data() };
}

/**
 * NEU: Admin löscht ein Ergebnis.
 */
async function adminDeleteResult(resultId) {
  const resultRef = resultsCollection.doc(resultId);
  const resultDoc = await resultRef.get();
  if (!resultDoc.exists) {
    throw new Error('Ergebnis nicht gefunden.');
  }
  const bookingId = resultDoc.data().bookingId;

  return db.runTransaction(async (transaction) => {
    if (bookingId) {
      const bookingRef = bookingsCollection.doc(bookingId);
      const bookingDoc = await transaction.get(bookingRef);
      if (bookingDoc.exists && bookingDoc.data().status === 'played') {
        transaction.update(bookingRef, { status: 'confirmed' });
      }
    }
    transaction.delete(resultRef);
  });
}


module.exports = {
  createForfeitResult,
  reportResult,
  handleResultAction,
  getDisputedResults,
  getResultsForTeam,
  getRecentResults,
  getResultsForSeason,
  updateResult,
  adminOverrideResult,
  getResultsByStatusForTeam,
  // NEU
  adminCreateResult,
  adminUpdateResult,
  adminDeleteResult,
};