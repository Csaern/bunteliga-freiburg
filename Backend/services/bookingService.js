const admin = require('firebase-admin');
const Booking = require('../models/booking');
const db = admin.firestore();
const bookingsCollection = db.collection('bookings');
const seasonsCollection = db.collection('seasons');
const pitchesCollection = db.collection('pitches');
// Wir benötigen den resultService für die Straf-Logik
const resultService = require('./resultService'); 

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
async function handleBookingAction(bookingId, actingTeamId, action) {
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
    // 1. Buchung als abgelehnt markieren
    await bookingRef.update({
      status: 'denied',
      deniedByTeamId: actingTeamId,
      deniedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Straf-Logik: Lese die Regel aus der Saison aus
    const seasonDoc = await seasonsCollection.doc(bookingData.seasonId).get();
    if (!seasonDoc.exists) {
        throw new Error(`Zugehörige Saison ${bookingData.seasonId} nicht gefunden.`);
    }
    // Hole das Limit aus der Saison, mit einem Fallback auf 3, falls das Feld nicht existiert
    const denialLimit = seasonDoc.data().maxDenials || 3;

    const denialsQuery = await bookingsCollection
      .where('seasonId', '==', bookingData.seasonId)
      .where('deniedByTeamId', '==', actingTeamId)
      .get();
    
    // Verwende das dynamische Limit aus der Saison
    if (denialsQuery.size >= denialLimit) {
      await resultService.createForfeitResult({
          seasonId: bookingData.seasonId,
          winningTeamId: bookingData.homeTeamId,
          losingTeamId: actingTeamId,
          bookingId: bookingId,
      });
      // Gib eine dynamische Nachricht zurück
      return { message: `Anfrage abgelehnt. ACHTUNG: Dies war die ${denialLimit}. Ablehnung, ein Straf-Ergebnis wurde erstellt.` };
    }
    
    return { message: 'Anfrage abgelehnt.' };
  }

  throw new Error('Ungültige Aktion.');
}

/**
 * Ein Team storniert ein bereits bestätigtes Spiel.
 * Wenn der Platz offiziell ist, wird ein neuer, leerer Slot erstellt.
 */
async function cancelConfirmedBooking(bookingId, cancellingTeamId) {
    const bookingRef = bookingsCollection.doc(bookingId);

    return db.runTransaction(async (transaction) => {
        const bookingDoc = await transaction.get(bookingRef);
        if (!bookingDoc.exists || bookingDoc.data().status !== 'confirmed') {
            throw new Error('Nur bestätigte Spiele können storniert werden.');
        }
        const bookingData = bookingDoc.data();

        // 1. Original-Buchung als storniert markieren
        transaction.update(bookingRef, {
            status: 'cancelled',
            cancelledByTeamId: cancellingTeamId,
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 2. Prüfen, ob der Platz offiziell ist, um einen neuen Slot zu erstellen
        const pitchRef = pitchesCollection.doc(bookingData.pitchId);
        const pitchDoc = await transaction.get(pitchRef);
        if (pitchDoc.exists && pitchDoc.data().isVerified) {
            const newBooking = new Booking({
                ...bookingData, // Übernimmt date, time, pitchId, seasonId
                createdBy: 'system_cancelled_recreate', // System-User
                homeTeamId: null,
                awayTeamId: null,
            });
            const firestoreObject = newBooking.toFirestoreObject();
            firestoreObject.createdAt = admin.firestore.FieldValue.serverTimestamp();
            
            const newBookingRef = bookingsCollection.doc();
            transaction.set(newBookingRef, firestoreObject);
        }
        return { message: 'Spiel storniert. Falls es ein offizieller Platz war, wurde der Termin wieder freigegeben.' };
    });
}

/**
 * Aktualisiert die Daten einer bestehenden Saison.
 * Kritische Felder wie id und createdBy können nicht geändert werden.
 */
async function updateSeason(seasonId, updateData) {
    const seasonRef = db.collection('seasons').doc(seasonId);
    // Verhindere, dass kritische Felder geändert werden
    const allowedUpdates = { ...updateData };
    delete allowedUpdates.id;
    delete allowedUpdates.createdBy;
    
    allowedUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await seasonRef.update(allowedUpdates);
    return { message: 'Saison erfolgreich aktualisiert.' };
}

module.exports = {
  bulkCreateAvailableSlots,
  requestBookingSlot,
  handleBookingAction,
  cancelConfirmedBooking,
  updateSeason,
};