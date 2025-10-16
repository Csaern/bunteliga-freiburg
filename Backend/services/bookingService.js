const admin = require('firebase-admin');
const Booking = require('../models/booking');
const db = admin.firestore();
const bookingsCollection = db.collection('bookings');
const seasonsCollection = db.collection('seasons'); // Fügen Sie dies am Anfang hinzu
const pitchesCollection = db.collection('pitches');
const teamsCollection = db.collection('teams'); // Stellen Sie sicher, dass diese Zeile vorhanden ist
const resultService = require('./resultService');

/**
 * Ruft die nächsten 5 anstehenden, bestätigten Spiele ab.
 */
async function getUpcomingBookings() {
  const today = new Date().toISOString().split('T')[0]; // Heutiges Datum im Format YYYY-MM-DD

  const snapshot = await bookingsCollection
    .where('status', '==', 'confirmed')
    .where('date', '>=', today)
    .orderBy('date', 'asc')
    .orderBy('time', 'asc')
    .limit(5)
    .get();

  if (snapshot.empty) {
    return [];
  }
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Ruft alle Buchungen für eine Saison ab. Kann optional nach einem Team filtern.
 * @param {string} seasonId - Die ID der Saison.
 * @param {string|null} [teamId=null] - Die optionale ID des Teams, nach dem gefiltert werden soll.
 * @returns {Promise<Array<object>>} Eine Liste der Buchungen, sortiert nach Datum und Zeit.
 */
async function getBookingsForSeason(seasonId, teamId = null) {
  if (!teamId) {
    // Fall 1: Alle Spiele der Saison abrufen
    const snapshot = await bookingsCollection
      .where('seasonId', '==', seasonId)
      .orderBy('date', 'asc')
      .orderBy('time', 'asc')
      .get();
    
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } else {
    // Fall 2: Spiele eines bestimmten Teams in der Saison abrufen
    const homeGamesQuery = bookingsCollection
      .where('seasonId', '==', seasonId)
      .where('homeTeamId', '==', teamId)
      .get();
      
    const awayGamesQuery = bookingsCollection
      .where('seasonId', '==', seasonId)
      .where('awayTeamId', '==', teamId)
      .get();

    const [homeSnapshot, awaySnapshot] = await Promise.all([homeGamesQuery, awayGamesQuery]);

    const bookings = [];
    homeSnapshot.forEach(doc => bookings.push({ id: doc.id, ...doc.data() }));
    awaySnapshot.forEach(doc => bookings.push({ id: doc.id, ...doc.data() }));

    // Sortiere die zusammengeführten Ergebnisse nach Datum und Zeit
    bookings.sort((a, b) => {
      if (a.date < b.date) return -1;
      if (a.date > b.date) return 1;
      if (a.time < b.time) return -1;
      if (a.time > b.time) return 1;
      return 0;
    });

    return bookings;
  }
}

/**
 * Erstellt in einer Bulk-Operation leere, verfügbare Spieltermine.
 * @param {object} bulkData - Die Daten aus der Admin-Maske.
 * @param {string} bulkData.seasonId - Die ID der Saison.
 * @param {string[]} bulkData.pitchIds - Ein Array von Platz-IDs.
 * @param {string} bulkData.startDate - Startdatum (z.B. "2025-10-20").
 * @param {string} bulkData.endDate - Enddatum (z.B. "2025-12-20").
 * @param {number[]} bulkData.daysOfWeek - Array der Wochentage (0=So, 1=Mo, ..., 6=Sa).
 * @param {string[]} bulkData.times - Array von Uhrzeiten (z.B. ["10:00", "12:00"]).
 * @param {string} adminUid - Die UID des Admins, der die Aktion ausführt.
 * @returns {object} Eine Erfolgsnachricht mit der Anzahl der erstellten Termine.
 */
async function bulkCreateAvailableSlots(bulkData, adminUid) {
  const { seasonId, pitchIds, startDate, endDate, daysOfWeek, times } = bulkData;

  if (!seasonId || !pitchIds || !startDate || !endDate || !daysOfWeek || !times) {
    throw new Error('Alle Felder für die Bulk-Erstellung sind erforderlich.');
  }

  const batch = db.batch();
  let createdCount = 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Iteriere durch jeden Tag im Datumsbereich
  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    // Prüfe, ob der aktuelle Wochentag in der Auswahl des Admins ist
    if (daysOfWeek.includes(day.getDay())) {
      const dateString = day.toISOString().split('T')[0]; // Format YYYY-MM-DD

      // Iteriere durch alle ausgewählten Plätze und Uhrzeiten
      for (const pitchId of pitchIds) {
        for (const time of times) {
          const newBooking = new Booking({
            date: dateString,
            time: time,
            pitchId: pitchId,
            seasonId: seasonId,
            createdBy: adminUid,
          });

          const firestoreObject = newBooking.toFirestoreObject();
          firestoreObject.createdAt = admin.firestore.FieldValue.serverTimestamp();
          
          const newBookingRef = bookingsCollection.doc(); // Firestore generiert eine neue ID
          batch.set(newBookingRef, firestoreObject);
          createdCount++;
        }
      }
    }
  }

  if (createdCount === 0) {
    throw new Error('Keine passenden Termine im angegebenen Zeitraum gefunden. Bitte Auswahl prüfen.');
  }

  await batch.commit();

  return { message: `${createdCount} Spieltermine erfolgreich erstellt.` };
}

/**
 * Ein Team fordert einen verfügbaren Spieltermin an.
 * Validiert, ob das Team in der aktiven Saison ist und noch nicht gegen den Gegner gespielt hat.
 */
async function requestBookingSlot(bookingId, homeTeamId, awayTeamId, requestingUserId) {
  const bookingRef = bookingsCollection.doc(bookingId);
  const bookingDoc = await bookingRef.get();

  if (!bookingDoc.exists || bookingDoc.data().status !== 'available') {
    throw new Error('Dieser Spieltermin ist nicht verfügbar.');
  }

  // 1. Finde die aktive Saison
  const activeSeasonQuery = await seasonsCollection.where('status', '==', 'active').limit(1).get();
  if (activeSeasonQuery.empty) {
    throw new Error('Derzeit gibt es keine aktive Saison.');
  }
  const activeSeason = activeSeasonQuery.docs[0].data();
  const activeSeasonId = activeSeasonQuery.docs[0].id;

  // 2. Prüfe, ob das anfragende Team Teil der aktiven Saison ist
  if (!activeSeason.teams.some(team => team.id === homeTeamId)) {
    throw new Error('Dein Team ist nicht Teil der aktiven Saison.');
  }

  // 3. Prüfe, ob es bereits ein Spiel zwischen diesen beiden Teams gibt
  const existingGameQuery = await bookingsCollection
    .where('seasonId', '==', activeSeasonId)
    .where('homeTeamId', 'in', [homeTeamId, awayTeamId])
    .where('awayTeamId', 'in', [homeTeamId, awayTeamId])
    .where('status', 'in', ['pending_away_confirm', 'confirmed'])
    .get();

  if (!existingGameQuery.empty) {
    throw new Error('Du hast bereits ein Spiel gegen dieses Team angefragt oder bestätigt.');
  }

  // Alle Prüfungen bestanden, Buchung aktualisieren
  await bookingRef.update({
    homeTeamId: homeTeamId,
    awayTeamId: awayTeamId,
    status: 'pending_away_confirm',
    isAvailable: false,
    createdBy: requestingUserId, // Überschreibt den Admin mit dem anfragenden User
    requestedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { message: 'Spieltermin erfolgreich angefragt. Warte auf Bestätigung des Gegners.' };
}

/**
 * Verarbeitet die Aktion eines Teams auf eine Anfrage (Annehmen / Ablehnen).
 */
async function handleBookingAction(bookingId, actingTeamId, action, reason = '') {
  const bookingRef = bookingsCollection.doc(bookingId);
  const bookingDoc = await bookingRef.get();
  const bookingData = bookingDoc.data();

  if (!bookingDoc.exists || bookingData.status !== 'pending_away_confirm' || bookingData.awayTeamId !== actingTeamId) {
    throw new Error('Diese Aktion kann nicht ausgeführt werden.');
  }

  if (action === 'confirm') {
    await bookingRef.update({
      status: 'confirmed',
      confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { message: 'Spiel bestätigt!' };
  }

  if (action === 'deny') {
    await bookingRef.update({
      status: 'denied',
      deniedByTeamId: actingTeamId,
      deniedAt: admin.firestore.FieldValue.serverTimestamp(),
      denialReason: reason,
    });

    const seasonDoc = await seasonsCollection.doc(bookingData.seasonId).get();
    if (!seasonDoc.exists) throw new Error(`Saison nicht gefunden.`);
    
    // 1. Regel aus der Saison auslesen (mit Fallback)
    const denialLimit = seasonDoc.data().maxDenials || 0;

    // 2. Prüfen, ob die Regel aktiviert ist (Wert > 0)
    if (denialLimit > 0) {
      const denialsQuery = await bookingsCollection
        .where('seasonId', '==', bookingData.seasonId)
        .where('deniedByTeamId', '==', actingTeamId)
        .get();
      
      if (denialsQuery.size >= denialLimit) {
        await resultService.createForfeitResult({
          seasonId: bookingData.seasonId,
          winningTeamId: bookingData.homeTeamId,
          losingTeamId: actingTeamId,
          bookingId: bookingId,
        });
        return { message: `Anfrage abgelehnt. ACHTUNG: Dies war die ${denialLimit}. Ablehnung, ein Straf-Ergebnis wurde erstellt.` };
      }
    }
    
    return { message: 'Anfrage abgelehnt.' };
  }

  throw new Error('Ungültige Aktion.');
}

/**
 * Leitet den Stornierungsprozess für ein bestätigtes Spiel ein.
 * > 3 Tage vorher: Direkte Stornierung.
 * <= 3 Tage vorher: Stellt einen Antrag an den Gegner.
 */
async function initiateCancellation(bookingId, cancellingTeamId, reason = '') {
    const bookingRef = bookingsCollection.doc(bookingId);
    const bookingDoc = await bookingRef.get();
    if (!bookingDoc.exists || bookingDoc.data().status !== 'confirmed') {
        throw new Error('Nur bestätigte Spiele können storniert werden.');
    }
    const bookingData = bookingDoc.data();

    // 1. Regel aus der Saison auslesen
    const seasonDoc = await seasonsCollection.doc(bookingData.seasonId).get();
    if (!seasonDoc.exists) throw new Error('Saison nicht gefunden.');
    const deadlineDays = seasonDoc.data().cancellationDeadlineDays || 0;

    const gameDate = new Date(bookingData.date);
    const now = new Date();
    const deadlineDate = new Date(gameDate.getTime() - deadlineDays * 24 * 60 * 60 * 1000);

    // 2. Prüfen, ob die Regel deaktiviert ist (Wert ist 0) ODER die Frist eingehalten wurde
    if (deadlineDays === 0 || now < deadlineDate) {
        // Direkte Stornierung
        return db.runTransaction(async (transaction) => {
            transaction.update(bookingRef, {
                status: 'cancelled',
                cancelledByTeamId: cancellingTeamId,
                cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            
            const pitchRef = pitchesCollection.doc(bookingData.pitchId);
            const pitchDoc = await transaction.get(pitchRef);
            if (pitchDoc.exists && pitchDoc.data().isVerified) {
                const newBooking = new Booking({
                    ...bookingData,
                    createdBy: 'system_cancelled_recreate',
                    homeTeamId: null,
                    awayTeamId: null,
                });
                const firestoreObject = newBooking.toFirestoreObject();
                firestoreObject.createdAt = admin.firestore.FieldValue.serverTimestamp();
                const newBookingRef = bookingsCollection.doc();
                transaction.set(newBookingRef, firestoreObject);
            }
            return { message: 'Spiel fristgerecht storniert. Der Termin wurde ggf. wieder freigegeben.' };
        });
    } else {
        // Antrag stellen, da Frist überschritten
        await bookingRef.update({
            status: 'cancellation_pending',
            cancellationRequestedByTeamId: cancellingTeamId,
            cancellationRequestedAt: admin.firestore.FieldValue.serverTimestamp(),
            cancellationRequestReason: reason,
        });
        return { message: 'Stornierung beantragt. Der Gegner muss dem Antrag zustimmen.' };
    }
}

/**
 * Verarbeitet die Antwort des Gegners auf einen Stornierungs-Antrag.
 */
async function respondToCancellationRequest(bookingId, respondingTeamId, response, reason = '') {
    const bookingRef = bookingsCollection.doc(bookingId);
    
    return db.runTransaction(async (transaction) => {
        const bookingDoc = await transaction.get(bookingRef);
        if (!bookingDoc.exists || bookingDoc.data().status !== 'cancellation_pending') {
            throw new Error('Es liegt kein Stornierungs-Antrag für dieses Spiel vor.');
        }
        const bookingData = bookingDoc.data();

        if (bookingData.cancellationRequestedByTeamId === respondingTeamId) {
            throw new Error('Du kannst nicht auf deinen eigenen Antrag antworten.');
        }

        if (response === 'accept') {
            // KORRIGIERTE LOGIK: Direkte Stornierung, anstatt initiateCancellation erneut aufzurufen.
            transaction.update(bookingRef, {
                status: 'cancelled',
                cancelledByTeamId: bookingData.cancellationRequestedByTeamId, // Das antragstellende Team
                cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            const pitchRef = pitchesCollection.doc(bookingData.pitchId);
            const pitchDoc = await transaction.get(pitchRef);
            if (pitchDoc.exists && pitchDoc.data().isVerified) {
                const newBooking = new Booking({ ...bookingData, createdBy: 'system_recreate', homeTeamId: null, awayTeamId: null });
                const firestoreObject = newBooking.toFirestoreObject();
                firestoreObject.createdAt = admin.firestore.FieldValue.serverTimestamp();
                const newBookingRef = bookingsCollection.doc();
                transaction.set(newBookingRef, firestoreObject);
            }
            return { message: 'Stornierung angenommen. Das Spiel wurde abgesagt.' };

        } else if (response === 'reject') {
            transaction.update(bookingRef, {
                status: 'confirmed',
                cancellationRequestedByTeamId: null,
                cancellationRequestedAt: null,
                cancellationRequestReason: null,
                cancellationRejectionReason: reason,
            });
            return { message: 'Stornierungs-Antrag abgelehnt. Das Spiel findet wie geplant statt.' };
        } else {
            throw new Error('Ungültige Antwort.');
        }
    });
}

/**
 * Erstellt eine komplett neue, individuelle Buchung.
 * Admins können dies auf jedem Platz tun.
 * Kapitäne können dies nur auf den Plätzen ihres eigenen Teams tun.
 * @param {object} bookingData - Die Daten für die neue Buchung.
 * @param {object} user - Das authentifizierte Benutzerobjekt (req.user).
 */
async function createCustomBooking(bookingData, user) {
  const { pitchId, homeTeamId, awayTeamId, seasonId, date, time } = bookingData;
  if (!pitchId || !homeTeamId || !seasonId || !date || !time) {
    throw new Error('Platz, Heimteam, Saison, Datum und Zeit sind erforderlich.');
  }

  // 1. Lade die Daten des Platzes für die Berechtigungsprüfung
  const pitchDoc = await pitchesCollection.doc(pitchId).get();
  if (!pitchDoc.exists) throw new Error('Der angegebene Platz wurde nicht gefunden.');
  const pitch = pitchDoc.data();

  // 2. Führe die Berechtigungsprüfung durch
  if (!user.admin) {
    // Kapitäne müssen einer der Kapitäne des Heimteams sein
    const teamDoc = await teamsCollection.doc(homeTeamId).get();
    if (!teamDoc.exists || !teamDoc.data().captainIds.includes(user.uid)) {
        throw new Error('Du bist kein Kapitän des angegebenen Heimteams.');
    }
    // Kapitäne dürfen nur auf ihren eigenen, inoffiziellen Plätzen buchen
    if (pitch.isVerified || pitch.teamId !== homeTeamId) {
      throw new Error('Du kannst individuelle Buchungen nur auf dem eigenen, inoffiziellen Team-Platz erstellen.');
    }
  }

  // NEUE SICHERHEITSPRÜFUNG
  const seasonDoc = await seasonsCollection.doc(seasonId).get();
  if (!seasonDoc.exists || seasonDoc.data().status !== 'active') {
      throw new Error('Buchungen sind in dieser Saison nicht (mehr) möglich.');
  }
  // ENDE SICHERHEITSPRÜFUNG

  // 3. Erstelle das neue Booking-Objekt mit dem korrekten initialen Status
  const newBookingData = {
    ...bookingData,
    createdBy: user.uid,
    status: awayTeamId ? 'pending_away_confirm' : 'confirmed',
  };

  const newBooking = new Booking(newBookingData);
  const firestoreObject = newBooking.toFirestoreObject();
  firestoreObject.createdAt = admin.firestore.FieldValue.serverTimestamp();

  const docRef = await bookingsCollection.add(firestoreObject);
  return { id: docRef.id, ...firestoreObject };
}

/**
 * Storniert ein Spiel final durch einen Admin.
 */
async function adminCancelBooking(bookingId, reason, adminUid) {
  const bookingRef = bookingsCollection.doc(bookingId);
  await bookingRef.update({
    status: 'cancelled_admin',
    cancellationReason: reason,
    cancelledBy: adminUid,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { message: 'Spiel wurde durch Admin erfolgreich storniert.' };
}

/**
 * Ruft Buchungen für ein bestimmtes Team mit einem bestimmten Status ab.
 */
async function getBookingsByStatusForTeam(teamId, status) {
  const snapshot = await bookingsCollection
    .where('awayTeamId', '==', teamId) // Wichtig: Man reagiert auf Anfragen als Auswärtsteam
    .where('status', '==', status)
    .orderBy('date', 'asc')
    .get();
  
  if (snapshot.empty) return [];
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

module.exports = {
  bulkCreateAvailableSlots,
  requestBookingSlot,
  handleBookingAction,
  initiateCancellation,
  respondToCancellationRequest,
  getUpcomingBookings,
  getBookingsForSeason,
  createCustomBooking, // NEU
  adminCancelBooking, // NEU
  getBookingsByStatusForTeam, // NEU
};