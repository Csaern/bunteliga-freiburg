const admin = require('firebase-admin');
const Booking = require('../models/booking');
const db = admin.firestore();
const bookingsCollection = db.collection('bookings');
const resultsCollection = db.collection('results');
const seasonsCollection = db.collection('seasons');
const pitchesCollection = db.collection('pitches');
const teamsCollection = db.collection('teams');
const resultService = require('./resultService');

// Hilfsfunktion, um alte und neue Datumsformate zu behandeln
const getMillisFromDate = (date) => {
    if (!date) return 0;
    if (date.toMillis) return date.toMillis(); // Korrekter Firestore Timestamp
    if (date._seconds) return date._seconds * 1000; // Altes, fehlerhaftes Objekt
    return new Date(date).getTime(); // Fallback für ISO-Strings etc.
};

class BookingService {

    /**
     * KORRIGIERT: Ruft alle Buchungen für eine Saison ab und behandelt alte/neue Datumsformate.
     */
    static async getBookingsForSeason(seasonId, teamId = null) {
        if (!seasonId) throw new Error("Eine Saison-ID ist erforderlich.");

        let query = bookingsCollection.where('seasonId', '==', seasonId);
        if (teamId) {
            // Diese Logik ist für Team-spezifische Abfragen, die wir hier vereinfachen
            const homeGamesPromise = query.where('homeTeamId', '==', teamId).get();
            const awayGamesPromise = query.where('awayTeamId', '==', teamId).get();
            const [homeSnapshot, awaySnapshot] = await Promise.all([homeGamesPromise, awayGamesPromise]);
            
            const bookings = [];
            homeSnapshot.forEach(doc => bookings.push({ id: doc.id, ...doc.data() }));
            awaySnapshot.forEach(doc => {
                if (!bookings.some(b => b.id === doc.id)) {
                    bookings.push({ id: doc.id, ...doc.data() });
                }
            });
            
            bookings.sort((a, b) => getMillisFromDate(a.date) - getMillisFromDate(b.date));
            return bookings;

        } else {
            const snapshot = await query.get();
            if (snapshot.empty) return [];
            
            const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // KORREKTUR: Verwendet die robuste Hilfsfunktion, um den Absturz zu verhindern.
            bookings.sort((a, b) => getMillisFromDate(a.date) - getMillisFromDate(b.date));
            return bookings;
        }
    }
    
    /**
     * Admin-Funktion zum harten Löschen einer Buchung.
     */
    static async adminDeleteBooking(bookingId) {
        const resultSnapshot = await resultsCollection.where('bookingId', '==', bookingId).limit(1).get();
        if (!resultSnapshot.empty) {
            throw new Error('Kann nicht gelöscht werden, da bereits ein Ergebnis eingetragen ist.');
        }
        await bookingsCollection.doc(bookingId).delete();
        return { message: 'Buchung erfolgreich gelöscht.' };
    }

    /**
     * NEU: Prüft, ob ein einzelner Zeitslot auf einem Platz verfügbar ist.
     * Berücksichtigt die Dauer und kann eine existierende Buchung ignorieren (für Updates).
     */
    // KORREKTUR: Das fehlende 'static'-Schlüsselwort wurde hinzugefügt.
    static async checkSingleSlot(slotData) {
        const { pitchId, date, duration, bookingIdToIgnore = null } = slotData;

        const newBookingStart = new Date(date);
        const newBookingEnd = new Date(newBookingStart.getTime() + duration * 60000);

        // Wir suchen nach allen Buchungen auf dem Platz, um sie manuell zu prüfen.
        // Eine reine Datums-Abfrage ist bei Zeit-Überlappungen zu ungenau.
        const querySnapshot = await bookingsCollection.where('pitchId', '==', pitchId).get();

        if (querySnapshot.empty) {
            return { isAvailable: true };
        }

        let collidingBookingInfo = null;

        for (const doc of querySnapshot.docs) {
            // Beim Bearbeiten einer Buchung darf sie nicht mit sich selbst kollidieren
            if (bookingIdToIgnore && doc.id === bookingIdToIgnore) {
                continue;
            }

            const existingBooking = doc.data();
            // KORREKTUR: Verwende die robuste Hilfsfunktion, um das Datum sicher zu konvertieren.
            // Dies behebt den ".toDate is not a function" Absturz.
            const existingBookingStart = new Date(getMillisFromDate(existingBooking.date));
            const existingBookingDuration = existingBooking.duration || 90; // Fallback
            const existingBookingEnd = new Date(existingBookingStart.getTime() + existingBookingDuration * 60000);

            // Die Kernlogik der Überlappungsprüfung: (StartA < EndeB) UND (EndeA > StartB)
            if (newBookingStart < existingBookingEnd && newBookingEnd > existingBookingStart) {
                collidingBookingInfo = {
                    homeTeamId: existingBooking.homeTeamId || null,
                    awayTeamId: existingBooking.awayTeamId || null,
                };
                break; // Eine Kollision gefunden, die Schleife kann beendet werden.
            }
        }

        if (collidingBookingInfo) {
            return { isAvailable: false, collidingBooking: collidingBookingInfo };
        }

        return { isAvailable: true };
    }

    /**
     * Admin erstellt eine einzelne, spezifische Buchung.
     */
    static async adminCreateBooking(bookingData, user) {
        // KORREKTUR: Status wird jetzt automatisch basierend auf den Team-IDs bestimmt.
        const hasBothTeams = bookingData.homeTeamId && bookingData.awayTeamId;
        const status = hasBothTeams ? 'confirmed' : 'available';

        const newBooking = {
            ...bookingData,
            date: admin.firestore.Timestamp.fromDate(new Date(bookingData.date)),
            duration: bookingData.duration || 90, // Standardwert
            status: status, // Automatischer Status
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: user.uid,
        };
        const docRef = await bookingsCollection.add(newBooking);
        return { id: docRef.id, ...newBooking };
    }

    /**
     * Admin aktualisiert eine einzelne Buchung.
     */
    static async adminUpdateBooking(bookingId, updateData) {
        const bookingRef = bookingsCollection.doc(bookingId);
        const doc = await bookingRef.get();
        if (!doc.exists) {
            throw new Error('Buchung nicht gefunden.');
        }

        // KORREKTUR: Status wird auch beim Update automatisch angepasst.
        const hasBothTeams = updateData.homeTeamId && updateData.awayTeamId;
        const status = hasBothTeams ? 'confirmed' : 'available';

        const dataToUpdate = {
            ...updateData,
            date: admin.firestore.Timestamp.fromDate(new Date(updateData.date)),
            status: status, // Automatischer Status
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await bookingRef.update(dataToUpdate);
        const updatedDoc = await bookingRef.get();
        return { id: bookingId, ...updatedDoc.data() };
    }

    /**
     * KORRIGIERT: Ruft die nächsten 5 anstehenden, bestätigten Spiele ab, ohne einen Index zu benötigen.
     */
    static async getUpcomingBookings() {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Setzt die Zeit auf den Anfang des Tages
    
        const snapshot = await bookingsCollection
            .where('status', '==', 'confirmed')
            .where('date', '>=', admin.firestore.Timestamp.fromDate(today))
            .get();
    
        if (snapshot.empty) {
            return [];
        }
        
        const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Sortierung im Code
        bookings.sort((a, b) => a.date.toMillis() - b.date.toMillis());

        // Begrenzung auf 5 Ergebnisse
        return bookings.slice(0, 5);
    }
  
    /**
     * KORRIGIERT: Führt eine "Trockenübung" für die Bulk-Erstellung durch, ohne einen Index zu benötigen.
     */
    static async bulkCheckSlots(data) {
        const { seasonId, pitchIds, startDate, endDate, days, times, timeInterval } = data;
        
        const potentialSlots = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            if (days[d.getDay()]) {
                for (const pitchId of pitchIds) {
                    for (const time of times) {
                        const [hour, minute] = time.split(':');
                        const bookingDate = new Date(d);
                        bookingDate.setHours(hour, minute, 0, 0);
                        potentialSlots.push({
                            pitchId,
                            date: admin.firestore.Timestamp.fromDate(bookingDate),
                            duration: timeInterval, // NEU: Dauer hinzufügen
                            readableDate: bookingDate.toLocaleDateString('de-DE'),
                            readableTime: time
                        });
                    }
                }
            }
        }

        if (potentialSlots.length === 0) return { totalSlots: 0, validSlots: [], collidingSlots: [] };

        const allBookingsSnapshot = await bookingsCollection.where('seasonId', '==', seasonId).get();
        const existingSlots = new Set();
        allBookingsSnapshot.forEach(doc => {
            const booking = doc.data();
            if (pitchIds.includes(booking.pitchId)) {
                existingSlots.add(`${booking.pitchId}_${getMillisFromDate(booking.date)}`);
            }
        });

        const validSlots = [];
        const collidingSlots = [];
        const pitchDataMap = new Map();

        for (const slot of potentialSlots) {
            const slotKey = `${slot.pitchId}_${slot.date.toMillis()}`;
            if (existingSlots.has(slotKey)) {
                if (!pitchDataMap.has(slot.pitchId)) {
                    const pitchDoc = await pitchesCollection.doc(slot.pitchId).get();
                    pitchDataMap.set(slot.pitchId, pitchDoc.data()?.name || 'Unbekannter Platz');
                }
                slot.pitchName = pitchDataMap.get(slot.pitchId);
                collidingSlots.push(slot);
            } else {
                validSlots.push(slot);
            }
        }

        return {
            totalSlots: potentialSlots.length,
            validSlots: validSlots.map(slot => ({
                pitchId: slot.pitchId,
                date: slot.date,
                duration: slot.duration // NEU: Dauer übergeben
            })),
            collidingSlots: collidingSlots,
        };
    }

    /**
     * KORRIGIERT: Erstellt Buchungen basierend auf dem neuen, korrekten Datenmodell.
     */
    static async bulkCreateAvailableSlots(data, user) {
        const { seasonId, slotsToCreate } = data;
        const batch = db.batch();
        
        for (const slot of slotsToCreate) {
            const newBooking = {
                seasonId,
                pitchId: slot.pitchId,
                date: slot.date, // Ist bereits ein Timestamp aus dem Check-Schritt
                duration: slot.duration, // NEU
                status: 'available',
                homeTeamId: null,
                awayTeamId: null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: user.uid,
            };
            const docRef = bookingsCollection.doc();
            batch.set(docRef, newBooking);
        }

        await batch.commit();
        return { message: `${slotsToCreate.length} Spieltermine erfolgreich erstellt.` };
    }

    /**
     * Ein Team fordert einen verfügbaren Spieltermin an.
     */
    static async requestBookingSlot(bookingId, homeTeamId, awayTeamId, requestingUserId) {
      const bookingRef = bookingsCollection.doc(bookingId);
      const bookingDoc = await bookingRef.get();
  
      if (!bookingDoc.exists || bookingDoc.data().status !== 'available') {
        throw new Error('Dieser Spieltermin ist nicht verfügbar.');
      }
  
      const activeSeasonQuery = await seasonsCollection.where('status', '==', 'active').limit(1).get();
      if (activeSeasonQuery.empty) {
        throw new Error('Derzeit gibt es keine aktive Saison.');
      }
      const activeSeason = activeSeasonQuery.docs[0].data();
      const activeSeasonId = activeSeasonQuery.docs[0].id;
  
      if (!activeSeason.teams.some(team => team.id === homeTeamId)) {
        throw new Error('Dein Team ist nicht Teil der aktiven Saison.');
      }
  
      const existingGameQuery = await bookingsCollection
        .where('seasonId', '==', activeSeasonId)
        .where('homeTeamId', 'in', [homeTeamId, awayTeamId])
        .where('awayTeamId', 'in', [homeTeamId, awayTeamId])
        .where('status', 'in', ['pending_away_confirm', 'confirmed'])
        .get();
  
      if (!existingGameQuery.empty) {
        throw new Error('Du hast bereits ein Spiel gegen dieses Team angefragt oder bestätigt.');
      }
  
      await bookingRef.update({
        homeTeamId: homeTeamId,
        awayTeamId: awayTeamId,
        status: 'pending_away_confirm',
        isAvailable: false,
        createdBy: requestingUserId,
        requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  
      return { message: 'Spieltermin erfolgreich angefragt. Warte auf Bestätigung des Gegners.' };
    }
  
    /**
     * Verarbeitet die Aktion eines Teams auf eine Anfrage (Annehmen / Ablehnen).
     */
    static async handleBookingAction(bookingId, actingTeamId, action, reason = '') {
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
        
        const denialLimit = seasonDoc.data().maxDenials || 0;
  
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
     */
    static async initiateCancellation(bookingId, cancellingTeamId, reason = '') {
        const bookingRef = bookingsCollection.doc(bookingId);
        const bookingDoc = await bookingRef.get();
        if (!bookingDoc.exists || bookingDoc.data().status !== 'confirmed') {
            throw new Error('Nur bestätigte Spiele können storniert werden.');
        }
        const bookingData = bookingDoc.data();
  
        const seasonDoc = await seasonsCollection.doc(bookingData.seasonId).get();
        if (!seasonDoc.exists) throw new Error('Saison nicht gefunden.');
        const deadlineDays = seasonDoc.data().cancellationDeadlineDays || 0;
  
        const gameDate = bookingData.date.toDate();
        const now = new Date();
        const deadlineDate = new Date(gameDate.getTime() - deadlineDays * 24 * 60 * 60 * 1000);
  
        if (deadlineDays === 0 || now < deadlineDate) {
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
    static async respondToCancellationRequest(bookingId, respondingTeamId, response, reason = '') {
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
                transaction.update(bookingRef, {
                    status: 'cancelled',
                    cancelledByTeamId: bookingData.cancellationRequestedByTeamId,
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
     */
    static async createCustomBooking(bookingData, user) {
      const { pitchId, homeTeamId, awayTeamId, seasonId, date, time } = bookingData;
      if (!pitchId || !homeTeamId || !seasonId || !date || !time) {
        throw new Error('Platz, Heimteam, Saison, Datum und Zeit sind erforderlich.');
      }
  
      const pitchDoc = await pitchesCollection.doc(pitchId).get();
      if (!pitchDoc.exists) throw new Error('Der angegebene Platz wurde nicht gefunden.');
      const pitch = pitchDoc.data();
  
      if (!user.admin) {
        const teamDoc = await teamsCollection.doc(homeTeamId).get();
        if (!teamDoc.exists || !teamDoc.data().captainIds.includes(user.uid)) {
            throw new Error('Du bist kein Kapitän des angegebenen Heimteams.');
        }
        if (pitch.isVerified || pitch.teamId !== homeTeamId) {
          throw new Error('Du kannst individuelle Buchungen nur auf dem eigenen, inoffiziellen Team-Platz erstellen.');
        }
      }
  
      const seasonDoc = await seasonsCollection.doc(seasonId).get();
      if (!seasonDoc.exists || seasonDoc.data().status !== 'active') {
          throw new Error('Buchungen sind in dieser Saison nicht (mehr) möglich.');
      }
  
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
    static async adminCancelBooking(bookingId, reason, adminUid) {
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
     * KORRIGIERT: Ruft Buchungen für ein bestimmtes Team mit einem bestimmten Status ab, ohne einen Index zu benötigen.
     */
    static async getBookingsByStatusForTeam(teamId, status) {
      const snapshot = await bookingsCollection
        .where('awayTeamId', '==', teamId)
        .where('status', '==', status)
        .get();
      
      if (snapshot.empty) return [];
      
      const bookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Sortierung im Code
      bookings.sort((a, b) => a.date.toMillis() - b.date.toMillis());

      return bookings;
    }

    /**
     * NEU: Ruft alle zukünftigen, bestätigten Buchungen für eine Saison ab.
     */
    static async getFutureBookingsForSeason(seasonId) {
        const now = new Date();
        const snapshot = await bookingsCollection
            .where('seasonId', '==', seasonId)
            .where('date', '>', now)
            .get();
        
        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    /**
     * NEU: Erstellt eine neue Buchung und führt eine Aktion für eine alte,
     * kollidierende Buchung aus (löschen oder freigeben).
     * Läuft in einer Transaktion, um Datenkonsistenz zu sichern.
     */
    static async createBookingWithOverwrite(data, user) {
        const { newBookingData, overwriteAction, oldBookingId } = data;

        if (!overwriteAction || !oldBookingId) {
            throw new Error('Aktion für die alte Buchung fehlt.');
        }

        const hasBothTeams = newBookingData.homeTeamId && newBookingData.awayTeamId;
        const status = hasBothTeams ? 'confirmed' : 'available';

        const newBookingRef = bookingsCollection.doc();
        const oldBookingRef = bookingsCollection.doc(oldBookingId);

        await db.runTransaction(async (transaction) => {
            const oldDoc = await transaction.get(oldBookingRef);
            if (!oldDoc.exists) throw new Error("Die zu überschreibende Buchung wurde nicht gefunden.");

            if (overwriteAction === 'delete') {
                transaction.delete(oldBookingRef);
            } else if (overwriteAction === 'free') {
                transaction.update(oldBookingRef, {
                    homeTeamId: null,
                    awayTeamId: null,
                    status: 'available'
                });
            }

            transaction.set(newBookingRef, {
                ...newBookingData,
                date: admin.firestore.Timestamp.fromDate(new Date(newBookingData.date)),
                status: status,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: user.uid,
            });
        });

        return { id: newBookingRef.id, ...newBookingData };
    }
}

module.exports = BookingService;