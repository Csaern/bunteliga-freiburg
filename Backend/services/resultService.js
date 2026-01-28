const admin = require('firebase-admin');
const Result = require('../models/result');
const db = admin.firestore();
const resultsCollection = db.collection('results');
const teamsCollection = db.collection('teams');
const seasonsCollection = db.collection('seasons');
const bookingsCollection = db.collection('bookings');
const pitchesCollection = db.collection('pitches');
const { checkCaptainOfActingTeam } = require('../middleware/permissionMiddleware');


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

    let locationName = null;
    if (bookingData.pitchId) {
      const pitchDoc = await pitchesCollection.doc(bookingData.pitchId).get();
      if (pitchDoc.exists) {
        locationName = pitchDoc.data().name;
      }
    }

    const newResult = new Result({
      ...resultData,
      homeTeamId: bookingData.homeTeamId,
      homeTeamName: homeTeamDoc.data().name,
      awayTeamId: bookingData.awayTeamId,
      awayTeamName: awayTeamDoc.data().name,
      seasonId: bookingData.seasonId,
      bookingId: bookingId,
      friendly: bookingData.friendly || false,
      date: bookingData.date, // Übernehme Datum aus Buchung
      location: locationName, // Übernehme Ort aus Pitch
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

  // Wenn das meldende Team agiert (nur 'reject' erlaubt, um zu stornieren/löschen)
  if (resultDoc.data().reportedByTeamId === actingTeamId) {
    if (action === 'reject') {
      // Wenn abgelehnt wird (hier als Stornierung interpretiert), löschen wir das Ergebnis und setzen die Buchung zurück.
      return db.runTransaction(async (transaction) => {
        let bookingRef = null;
        if (resultDoc.data().bookingId) {
          bookingRef = bookingsCollection.doc(resultDoc.data().bookingId);
          await transaction.get(bookingRef); // Read before write
        }

        transaction.delete(resultRef);

        if (bookingRef) {
          // We already read it, but to be safe and clean in logic we can rely on the fact we have the ref
          // But inside transaction we need to use transaction methods.
          // Since we read it, we can update it.
          // Note: We don't need to re-read if we don't use the data, but we need to check status.
          // The first read gave us the doc snapshot implicitly if we assigned it, but here we just awaited.
          // Let's do it properly:
          // We already did the read. Now we update.
          transaction.update(bookingRef, { status: 'confirmed' });
        }
        return { message: 'Ergebnis zurückgezogen. Es kann nun neu gemeldet werden.' };
      });
    }
    throw new Error('Du kannst dein eigenes Ergebnis nicht bestätigen.');
  }

  // Wenn das gegnerische Team agiert
  if (action === 'reject') {
    // Ablehnung durch Gegner -> Ergebnis löschen, Buchung resetten
    return db.runTransaction(async (transaction) => {
      let bookingRef = null;
      if (resultDoc.data().bookingId) {
        bookingRef = bookingsCollection.doc(resultDoc.data().bookingId);
        await transaction.get(bookingRef); // Read before write
      }

      transaction.delete(resultRef);

      if (bookingRef) {
        transaction.update(bookingRef, { status: 'confirmed' });
      }
      return { message: 'Ergebnis abgelehnt. Es kann nun neu gemeldet werden.' };
    });
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

  if (action === 'dispute') {
    await resultRef.update({
      status: 'disputed',
      disputedReason: reason,
      disputedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { message: 'Ergebnis angefochten. Ein Admin wird benachrichtigt.' };
  }

  throw new Error('Ungültige Aktion.');
}

/**
 * Ein Team zieht eine Ergebnismeldung zurück (Stornierung).
 */
async function cancelReport(resultId, actingTeamId) {
  const resultRef = resultsCollection.doc(resultId);

  return db.runTransaction(async (transaction) => {
    const resultDoc = await transaction.get(resultRef);
    if (!resultDoc.exists) {
      throw new Error('Ergebnis nicht gefunden.');
    }
    const resultData = resultDoc.data();

    if (resultData.status !== 'pending') {
      throw new Error('Nur ausstehende Ergebnisse können storniert werden.');
    }
    if (resultData.reportedByTeamId !== actingTeamId) {
      throw new Error('Du kannst nur eigene Ergebnismeldungen stornieren.');
    }

    // Read booking before deleting result
    let bookingRef = null;
    if (resultData.bookingId) {
      bookingRef = bookingsCollection.doc(resultData.bookingId);
      await transaction.get(bookingRef);
    }

    // 1. Ergebnis löschen
    transaction.delete(resultRef);

    // 2. Buchung zurücksetzen (falls vorhanden)
    if (bookingRef) {
      transaction.update(bookingRef, { status: 'confirmed' });
    }

    return { message: 'Ergebnismeldung erfolgreich zurückgezogen.' };
  });
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
  homeSnapshot.forEach(doc => {
    const data = doc.data();
    if (!data.friendly) results.push({ id: doc.id, ...data });
  });
  awaySnapshot.forEach(doc => {
    const data = doc.data();
    if (!data.friendly) results.push({ id: doc.id, ...data });
  });

  return results;
}

/**
 * Ruft die 5 zuletzt bestätigten Ergebnisse ab.
 */
async function getRecentResults(limitNum = 5) {
  const snapshot = await resultsCollection
    .where('status', '==', 'confirmed')
    .orderBy('confirmedAt', 'desc')
    .where('status', '==', 'confirmed')
    .orderBy('confirmedAt', 'desc')
    .limit(limitNum * 3) // Fetch more to allow for filtering friendly games
    .get();

  if (snapshot.empty) {
    return [];
  }
  return snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(r => !r.friendly)
    .slice(0, limitNum);
}

/**
 * Holt alle Ergebnisse für eine bestimmte Saison.
 */
async function getResultsForSeason(seasonId) {
  const snapshot = await resultsCollection
    .where('seasonId', '==', seasonId)
    .get();

  if (snapshot.empty) {
    return [];
  }

  const results = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(r => !r.friendly);

  results.sort((a, b) => {
    const dateA = a.reportedAt?.toDate ? a.reportedAt.toDate() : new Date(0);
    const dateB = b.reportedAt?.toDate ? b.reportedAt.toDate() : new Date(0);
    return dateB - dateA;
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

  const payload = {
    homeScore: parseInt(homeScore),
    awayScore: parseInt(awayScore),
    status: 'pending',
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
  const snapshot = await resultsCollection
    .where('status', '==', status)
    .get();

  if (snapshot.empty) return [];

  const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  return results.filter(result => {
    const isHomeTeam = result.homeTeamId === teamId;
    const isAwayTeam = result.awayTeamId === teamId;

    if (!isHomeTeam && !isAwayTeam) {
      return false;
    }
    return true;
  });
}

/**
 * NEU: Admin erstellt ein Ergebnis, das sofort bestätigt wird.
 */
async function adminCreateResult(resultData, adminUid) {
  const { homeTeamId, awayTeamId, homeScore, awayScore, seasonId, bookingId, date, location } = resultData;

  if (!homeTeamId || !awayTeamId || homeScore === undefined || awayScore === undefined || !seasonId) {
    throw new Error('Unvollständige Daten. Teams, Ergebnis und Saison sind erforderlich.');
  }

  // VALIDIERUNG: Prüfen, ob das Spiel laut Saison-Regeln erlaubt ist (nur wenn keine Buchung verknüpft ist, da Buchungen bereits geprüft sein sollten)
  if (!bookingId) {
    const seasonDoc = await seasonsCollection.doc(seasonId).get();
    if (seasonDoc.exists) {
      const seasonData = seasonDoc.data();
      const playMode = seasonData.playMode || 'double_round_robin';

      let maxMatches = 100; // Default fallback
      if (playMode === 'single_round_robin') maxMatches = 1;
      else if (playMode === 'double_round_robin') maxMatches = 2;

      // Suche nach existierenden Spielen zwischen diesen beiden Teams in dieser Saison
      // Achtung: Wir müssen beide Richtungen prüfen (A vs B und B vs A)
      const resultsSnapshot = await resultsCollection
        .where('seasonId', '==', seasonId)
        .where('status', '==', 'confirmed') // Nur bestätigte zählen? Oder alle? Pending auch? Besser alle validen.
        .get();

      // Client-seitiges Filtern (Firestore OR queries sind limitiert)
      let matchesCount = 0;
      resultsSnapshot.forEach(doc => {
        const d = doc.data();
        if ((d.homeTeamId === homeTeamId && d.awayTeamId === awayTeamId) ||
          (d.homeTeamId === awayTeamId && d.awayTeamId === homeTeamId)) {
          matchesCount++;
        }
      });

      if (matchesCount >= maxMatches) {
        throw new Error(`In dieser Saison (${playMode}) dürfen diese Teams nur ${maxMatches} Mal gegeneinander spielen. Es existieren bereits ${matchesCount} Spiele.`);
      }
    }
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
    status: 'confirmed',
    reportedBy: 'admin',
    reportedByUserId: adminUid,
    reportedAt: admin.firestore.FieldValue.serverTimestamp(),
    confirmedBy: 'admin',
    confirmedByUserId: adminUid,
    confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
    // confirmedAt dupliziert entfernt
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    date: date || null,
    location: location || null,
  };

  return db.runTransaction(async (transaction) => {
    let friendly = false;
    let finalDate = date;
    let finalLocation = location;

    if (bookingId) {
      const bookingRef = bookingsCollection.doc(bookingId);
      const bookingDoc = await transaction.get(bookingRef);
      if (bookingDoc.exists) {
        const bookingData = bookingDoc.data();
        friendly = bookingData.friendly || false;

        // Auto-Fill Date/Location from Booking if not provided (or overwrite to ensure consistency?)
        // User requested: "muss ... mit rausgezogen werden". Implies Booking is the source of truth.
        finalDate = bookingData.date; // Enforce booking date

        if (bookingData.pitchId) {
          const pitchRef = pitchesCollection.doc(bookingData.pitchId);
          const pitchDoc = await transaction.get(pitchRef);
          if (pitchDoc.exists) {
            finalLocation = pitchDoc.data().name;
          }
        }
        transaction.update(bookingRef, { status: 'played' });
      }
    }

    const finalResultData = {
      ...newResultData,
      friendly,
      date: finalDate,
      location: finalLocation
    };
    const newResultRef = resultsCollection.doc();
    transaction.set(newResultRef, finalResultData);

    return { id: newResultRef.id, ...finalResultData };
  });
}

/**
 * NEU: Admin aktualisiert ein beliebiges Ergebnis.
 */
async function adminUpdateResult(resultId, updateData, adminUid) {
  const { homeTeamId, awayTeamId, homeScore, awayScore, status, isValid, date, location } = updateData;
  const resultRef = resultsCollection.doc(resultId);

  const payload = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: adminUid,
  };

  if (homeScore !== undefined) payload.homeScore = parseInt(homeScore);
  if (awayScore !== undefined) payload.awayScore = parseInt(awayScore);
  if (homeTeamId) payload.homeTeamId = homeTeamId;
  if (awayTeamId) payload.awayTeamId = awayTeamId;
  if (isValid !== undefined) payload.isValid = isValid;
  if (date !== undefined) payload.date = date;
  if (location !== undefined) payload.location = location;

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

/**
 * Ruft die direkten Begegnungen (Head-to-Head) zweier Teams ab.
 * Öffentlich verfügbar.
 */
async function getHeadToHeadResults(teamAId, teamBId, excludeId = null, limitNum = 5) {
  if (!teamAId || !teamBId) return [];

  const query1 = resultsCollection
    .where('homeTeamId', '==', teamAId)
    .where('awayTeamId', '==', teamBId)
    .where('status', '==', 'confirmed')
    .get();

  const query2 = resultsCollection
    .where('homeTeamId', '==', teamBId)
    .where('awayTeamId', '==', teamAId)
    .where('status', '==', 'confirmed')
    .get();

  const [snap1, snap2] = await Promise.all([query1, query2]);

  let results = [];
  snap1.forEach(doc => {
    const data = doc.data();
    if (!data.friendly) results.push({ id: doc.id, ...data });
  });
  snap2.forEach(doc => {
    const data = doc.data();
    if (!data.friendly) results.push({ id: doc.id, ...data });
  });

  // Filter out the excluded ID if provided
  if (excludeId) {
    results = results.filter(r => String(r.id) !== String(excludeId));
  }

  // Sort by date descending (newest first)
  results.sort((a, b) => {
    const getDate = (r) => {
      if (r.date) {
        // Handle Firestore Timestamp or Date or String
        if (typeof r.date.toDate === 'function') return r.date.toDate();
        return new Date(r.date);
      }
      if (r.confirmedAt && typeof r.confirmedAt.toDate === 'function') return r.confirmedAt.toDate();
      if (r.reportedAt && typeof r.reportedAt.toDate === 'function') return r.reportedAt.toDate();
      return new Date(0);
    };
    return getDate(b) - getDate(a);
  });

  return results.slice(0, limitNum);
}

module.exports = {
  reportResult,
  handleResultAction,
  cancelReport,
  getDisputedResults,
  getResultsForTeam,
  getRecentResults,
  getResultsForSeason,
  updateResult,
  adminOverrideResult,
  getResultsByStatusForTeam,
  adminCreateResult,
  adminUpdateResult,
  adminDeleteResult,
  getHeadToHeadResults,
};