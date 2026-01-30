const admin = require('firebase-admin');
const Booking = require('../models/booking');
const db = admin.firestore();
const bookingsCollection = db.collection('bookings');
const resultsCollection = db.collection('results');
const seasonsCollection = db.collection('seasons');
const pitchesCollection = db.collection('pitches');
const teamsCollection = db.collection('teams');
const resultService = require('./resultService');
const notificationService = require('./notificationService');

// Hilfsfunktion, um alte und neue Datumsformate zu behandeln
const getMillisFromDate = (date) => {
    if (!date) return 0;
    try {
        // Firestore Timestamp mit toMillis() Methode
        if (typeof date.toMillis === 'function') {
            return date.toMillis();
        }
        // Firestore Timestamp mit toDate() Methode
        if (typeof date.toDate === 'function') {
            const dateObj = date.toDate();
            if (dateObj instanceof Date && !isNaN(dateObj.valueOf())) {
                return dateObj.getTime();
            }
        }
        // Serialisiertes Firestore Timestamp Format
        if (typeof date._seconds === 'number') {
            return date._seconds * 1000;
        }
        // JavaScript Date Objekt
        if (date instanceof Date && !isNaN(date.valueOf())) {
            return date.getTime();
        }
        // Fallback für ISO-Strings etc.
        const d = new Date(date);
        if (!isNaN(d.valueOf())) {
            return d.getTime();
        }
    } catch (e) {
        console.error('Fehler bei getMillisFromDate:', e, date);
    }
    return 0;
};

class BookingService {

    /**
     * NEU: Interne Hilfsfunktion zur Prüfung der Saisonregeln für eine Spielpaarung.
     * Zählt existierende Ergebnisse und geplante Buchungen.
     * @private
     */
    static async _checkSeasonRulesForPairing(homeTeamId, awayTeamId, seasonId, bookingIdToIgnore = null) {
        // Wenn kein Gegnerteam vorhanden ist, gibt es nichts zu prüfen.
        if (!homeTeamId || !awayTeamId || !seasonId) {
            return;
        }

        const seasonDoc = await seasonsCollection.doc(seasonId).get();
        if (!seasonDoc.exists) {
            throw new Error('Die angegebene Saison wurde nicht gefunden.');
        }
        // Annahme basierend auf deinem season.js Modell: 'single_round_robin' oder 'double_round_robin'
        const playMode = seasonDoc.data().playMode || 'double_round_robin';

        let allowedGames;
        if (playMode === 'single_round_robin') { // Jedes Team spielt einmal gegen jedes andere
            allowedGames = 1;
        } else if (playMode === 'double_round_robin') { // Jedes Team spielt zweimal gegen jedes andere (Hin- & Rückspiel)
            allowedGames = 2;
        } else {
            return; // Für andere Modi wird keine Prüfung durchgeführt
        }

        // 1. Zähle bereits eingetragene Ergebnisse
        const resultsQuery1 = resultsCollection.where('seasonId', '==', seasonId).where('homeTeamId', '==', homeTeamId).where('awayTeamId', '==', awayTeamId).get();
        const resultsQuery2 = resultsCollection.where('seasonId', '==', seasonId).where('homeTeamId', '==', awayTeamId).where('awayTeamId', '==', homeTeamId).get();

        // 2. Hole ALLE Buchungen für diese Paarung (Status & Friendly klären wir im Code)
        const bookingsQuery1 = bookingsCollection.where('seasonId', '==', seasonId).where('homeTeamId', '==', homeTeamId).where('awayTeamId', '==', awayTeamId).get();
        const bookingsQuery2 = bookingsCollection.where('seasonId', '==', seasonId).where('homeTeamId', '==', awayTeamId).where('awayTeamId', '==', homeTeamId).get();

        const [results1, results2, bookings1, bookings2] = await Promise.all([resultsQuery1, resultsQuery2, bookingsQuery1, bookingsQuery2]);

        const allBookings = [...bookings1.docs, ...bookings2.docs];
        const bookingMap = new Map();
        allBookings.forEach(doc => bookingMap.set(doc.id, doc.data()));

        let countedResults = 0;
        const countResult = (resDoc) => {
            const resData = resDoc.data();
            // Check if related booking is friendly
            if (resData.bookingId && bookingMap.has(resData.bookingId)) {
                const b = bookingMap.get(resData.bookingId);
                if (b.friendly) return; // Ignore friendly result
            }
            countedResults++;
        };
        results1.forEach(countResult);
        results2.forEach(countResult);

        let plannedGames = 0;
        for (const [id, data] of bookingMap.entries()) {
            // Zähle die Buchung nur, wenn es nicht die ist, die wir ignorieren sollen.
            if (id === bookingIdToIgnore) continue;

            // Ignoriere Freundschaftsspiele
            if (data.friendly) continue;

            // Zähle nur relevante Stati für zukünftige/geplante Spiele
            // ('played' wird über Results abgedeckt, 'cancelled'/'blocked' interessiert nicht)
            if (['confirmed', 'pending_away_confirm'].includes(data.status)) {
                plannedGames++;
            }
        }

        const totalEncounters = countedResults + plannedGames;

        if (totalEncounters >= allowedGames) {
            throw new Error(`Regelverletzung: Das Spiellimit von ${allowedGames} für diese Paarung in der Saison ist bereits erreicht.`);
        }
    }

    /**
     * NEU: Erstellt ein Date-Objekt für Berlin, unabhängig von der Server-Zeitzone.
     * @private
     */
    static _createBerlinDate(dateStr, timeStr) {
        // Use local system time construction
        // This accepts 'YYYY-MM-DD' and 'HH:MM' and creates a Date object
        // representing that wall-clock time in the local system timezone.
        return new Date(`${dateStr}T${timeStr}:00`);
    }



    /**
     * NEU: Gleicht den Status aller leeren Zeitslots eines Platzes mit dem wöchentlichen Limit ab.
     * Logik:
     * 1. Zähle aktive Buchungen (confirmed, pending_away_confirm) in der Woche.
     * 2. Wenn Limit erreicht: Alle 'available' Slots werden zu 'blocked'.
     * 3. Wenn Limit NICHT erreicht: Alle 'blocked' Slots werden zu 'available'.
     * @private
     */
    static async _syncPitchWeeklySlots(pitchId, date) {
        if (!pitchId || !date) return;

        const pitchDoc = await pitchesCollection.doc(pitchId).get();
        if (!pitchDoc.exists) return; // Platz gelöscht?
        const pitchData = pitchDoc.data();
        const limit = pitchData.weeklyLimit;

        // Wenn kein Limit gesetzt oder 0 (unbegrenzt?), nichts tun.
        const hasLimit = (limit !== null && limit !== undefined && limit !== '' && Number(limit) > 0);
        const limitNum = Number(limit);

        const bookingDate = new Date(getMillisFromDate(date));

        // Wochenberechnung (Mo-So)
        const day = bookingDate.getDay();
        const diffToMonday = bookingDate.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(bookingDate);
        monday.setDate(diffToMonday);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        // OPTIMIERUNG: Load all bookings for this pitch and filter in memory to avoid Index requirements
        // "FAILED_PRECONDITION: The query requires an index... pitchId ASC, date ASC"
        const snapshot = await bookingsCollection
            .where('pitchId', '==', pitchId)
            .get();

        let activeCount = 0;
        const weekDocs = [];

        const mondayMillis = monday.getTime();
        const sundayMillis = sunday.getTime();

        snapshot.forEach(doc => {
            const data = doc.data();
            const docDateMillis = getMillisFromDate(data.date);

            // In-Memory Filter: Only consider bookings within the calculate week
            if (docDateMillis >= mondayMillis && docDateMillis <= sundayMillis) {
                weekDocs.push({ ref: doc.ref, ...data });
                // Zähle aktive Buchungen
                if (['confirmed', 'pending_away_confirm'].includes(data.status)) {
                    activeCount++;
                }
            }
        });

        const loopsReachedLimit = hasLimit && activeCount >= limitNum;

        const batch = db.batch();
        let updateCount = 0;

        for (const doc of weekDocs) {
            // Wir ändern nur Slots, die "leer" sind (keine Teams zugeordnet) oder explizit "blocked" sind.
            const isControllable = (doc.status === 'available' || doc.status === 'blocked') &&
                !doc.homeTeamId && !doc.awayTeamId;

            if (!isControllable) continue;

            let newStatus = null;

            if (loopsReachedLimit) {
                // Limit voll -> sperren
                if (doc.status === 'available') {
                    newStatus = 'blocked';
                }
            } else {
                // Limit noch nicht voll -> freigeben
                if (doc.status === 'blocked') {
                    newStatus = 'available';
                }
            }

            if (newStatus) {
                batch.update(doc.ref, {
                    status: newStatus,
                    isAvailable: newStatus === 'available', // Legacy Feld syncen
                    autoBlocked: true // Markiere, dass dies automatisch geschehen ist
                });
                updateCount++;
            }
        }

        if (updateCount > 0) {
            await batch.commit();
            console.log(`[_syncPitchWeeklySlots] ${updateCount} Slots auf '${pitchData.name}' ${loopsReachedLimit ? 'GESPERRT' : 'FREIGEGEBEN'} (Limit: ${limit}, Aktiv: ${activeCount}, Woche: ${monday.toLocaleDateString()})`);
        }
    }

    /**
     * NEU: Löscht ungenutzte Slots, die in der Vergangenheit liegen und "unberührt" sind.
     * Absolut sicher: Status available, keine Teams, keine Freundschaftsmarkierung, Datum vorbei.
     * @private
     */
    static async _cleanupUnusedPastSlots(seasonId) {
        try {
            const now = Date.now();

            // Wir suchen Slots, die 'available' sind.
            // Index-Hinweis: Wir filtern das Datum im Code, um Index-Probleme zu vermeiden,
            // da 'available' Slots für eine Saison überschaubar sein sollten (oder wir limitieren).
            const snapshot = await bookingsCollection
                .where('seasonId', '==', seasonId)
                .where('status', '==', 'available')
                .get();

            if (snapshot.empty) return;

            const batch = db.batch();
            let deleteCount = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                const slotDateMillis = getMillisFromDate(data.date);

                // 1. Datum muss in der Vergangenheit liegen
                if (slotDateMillis === 0 || slotDateMillis >= now) return;

                // 2. ABSOLUTE SICHERHEIT: Darf keinem Team zugeordnet sein
                if (data.homeTeamId || data.awayTeamId) return;

                // 3. (Entfernt) Auch Freundschaftsspiel-Slots sollen gelöscht werden, wenn sie vergangen sind.
                // if (data.friendly === true) return;

                // 4. Status muss zwingend 'available' sein (bereits durch Query abgedeckt, aber sicherheitshalber)
                if (data.status !== 'available') return;

                batch.delete(doc.ref);
                deleteCount++;
            });

            if (deleteCount > 0) {
                await batch.commit();
                console.log(`[_cleanupUnusedPastSlots] ${deleteCount} ungenutzte, vergangene Slots in Saison ${seasonId} sicher gelöscht.`);
            }
        } catch (error) {
            console.error('[_cleanupUnusedPastSlots] Fehler:', error);
        }
    }

    /**
     * NEU: Konsolidiertes "Lazy Sync" für eine Saison.
     * Räumt abgelaufene Anfragen auf und gibt Slots für Freundschaftsspiele frei.
     */
    static async _runLazySync(seasonId) {
        if (!seasonId) return;

        // Versuche Expiry-Cleanup
        await BookingService.cleanupExpiredRequests(seasonId);

        // NEU: Bereinige ungenutzte vergangene Slots
        await BookingService._cleanupUnusedPastSlots(seasonId);

        // Versuche Friendly-Release
        await BookingService._syncFriendlySlots(seasonId);
    }

    /**
     * NEU: Löscht abgelaufene Spielanfragen (pending_away_confirm).
     * @private
     */
    static async cleanupExpiredRequests(seasonId) {
        if (!seasonId) return;

        try {
            const seasonDoc = await seasonsCollection.doc(seasonId).get();
            if (!seasonDoc.exists) return;

            const seasonData = seasonDoc.data();
            const expiryDays = seasonData.requestExpiryDays || 3;
            const now = Date.now();
            const expiryMillis = expiryDays * 24 * 60 * 60 * 1000;

            const expiredSnapshot = await bookingsCollection
                .where('seasonId', '==', seasonId)
                .where('status', '==', 'pending_away_confirm')
                .get();

            if (expiredSnapshot.empty) return;

            const batch = db.batch();
            let expiredCount = 0;
            const weeksToSync = new Map(); // pitchId -> Set of weekStartMillis

            expiredSnapshot.forEach(doc => {
                const data = doc.data();
                const requestedAtMillis = getMillisFromDate(data.requestedAt);
                const gameDateMillis = getMillisFromDate(data.date);

                // FALLBACK: Wenn requestedAt fehlt, verwenden wir ein Sicherheitsdatum (7 Tage alt), 
                // um sicherzustellen, dass alte "Geister-Buchungen" bereinigt werden.
                const effectiveRequestedAt = requestedAtMillis > 0 ? requestedAtMillis : (now - (7 * 24 * 60 * 60 * 1000));

                const isTimedOut = (now - effectiveRequestedAt) > expiryMillis;
                const isPastGame = gameDateMillis > 0 && gameDateMillis < now;

                if (isTimedOut || isPastGame) {
                    const reason = isPastGame ? 'past_game_date' : (requestedAtMillis > 0 ? 'automated_timeout' : 'automated_timeout_fallback');

                    // Reset slot
                    const updateData = {
                        status: 'available',
                        homeTeamId: null,
                        awayTeamId: null,
                        friendly: false,
                        isAvailable: true,
                        expiredAt: admin.firestore.FieldValue.serverTimestamp(),
                        expiryReason: reason
                    };

                    // Individuelle Buchungen werden gelöscht statt resettet
                    if (data.isCustom) {
                        batch.delete(doc.ref);
                    } else {
                        batch.update(doc.ref, updateData);
                    }

                    expiredCount++;

                    // Berechne Wochen-Start für diesen Slot, um nur 1x pro Woche/Platz zu syncen
                    const d = new Date(gameDateMillis);
                    const day = d.getDay();
                    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
                    d.setDate(diffToMonday);
                    d.setHours(0, 0, 0, 0);
                    const weekStart = d.getTime();

                    if (!weeksToSync.has(data.pitchId)) {
                        weeksToSync.set(data.pitchId, new Set());
                    }
                    weeksToSync.get(data.pitchId).add(JSON.stringify({ weekStart, originalDate: data.date }));

                    // NEU: Benachrichtigung senden, wenn eine Anfrage abläuft
                    try {
                        let teamIdToNotify = null;
                        // Wenn Status pending_away_confirm war, hat das Heimteam gewartet -> Heimteam benachrichtigen
                        if (data.status === 'pending_away_confirm' && data.homeTeamId) {
                            teamIdToNotify = data.homeTeamId;
                        }

                        if (teamIdToNotify) {
                            // Fetch names for nicer message? Or just generic.
                            // To keep it simple and performant inside this loop (which runs often), use generic messages
                            // or fetch cached. Here generic:
                            const dateStr = data.date?.toDate ? data.date.toDate().toLocaleDateString('de-DE') : 'Unbekanntes Datum';

                            // Using fire-and-forget for notifications here to not block the cleanup batch
                            notificationService.notifyTeam(
                                teamIdToNotify,
                                'booking_expired',
                                'Anfrage abgelaufen',
                                `Deine Anfrage für das Spiel am ${dateStr} ist abgelaufen, da sie nicht rechtzeitig bestätigt wurde.`,
                                { bookingId: doc.id, date: dateStr }
                            ).catch(e => console.error('[cleanupExpiredRequests] Notification error:', e));
                        }
                    } catch (notifError) {
                        console.error('[cleanupExpiredRequests] Error preparing notification:', notifError);
                    }
                }
            });

            if (expiredCount > 0) {
                await batch.commit();
                console.log(`[cleanupExpiredRequests] ${expiredCount} Anfragen in Saison '${seasonData.name}' abgelaufen und zurückgesetzt.`);

                // Sync Wochen-Limits für betroffene Plätze/Wochen (Optimiert: Nur 1x pro Woche/Platz)
                for (const [pitchId, uniqueWeeks] of weeksToSync.entries()) {
                    for (const weekInfoStr of uniqueWeeks) {
                        const { originalDate } = JSON.parse(weekInfoStr);
                        await BookingService._syncPitchWeeklySlots(pitchId, originalDate);
                    }
                }
            }
        } catch (error) {
            console.error('[cleanupExpiredRequests] Fehler bei der Bereinigung:', error);
        }
    }

    /**
     * NEU: Gibt Slots für Freundschaftsspiele frei, wenn die Frist erreicht ist.
     * @private
     */
    static async _syncFriendlySlots(seasonId) {
        try {
            const seasonDoc = await seasonsCollection.doc(seasonId).get();
            if (!seasonDoc.exists) return;

            const seasonData = seasonDoc.data();
            const releaseHours = seasonData.friendlyGamesReleaseHours || 48;
            const now = Date.now();
            const releaseMillis = releaseHours * 60 * 60 * 1000;

            // Finde verfügbare Slots in dieser Saison
            const snapshot = await bookingsCollection
                .where('seasonId', '==', seasonId)
                .where('status', '==', 'available')
                .get();

            if (snapshot.empty) return;

            // NEU: Platz-Konfigurationen laden und cachen
            const pitchConfigs = new Map();

            const batch = db.batch();
            let updateCount = 0;
            let totalChecked = 0;

            for (const doc of snapshot.docs) {
                const data = doc.data();

                // Überspringen, wenn bereits als friendly markiert oder Auto-Sync deaktiviert ist
                if (data.friendly === true || data.friendlyAutoSync === false) continue;

                // NEU: Platz-Config prüfen
                if (!pitchConfigs.has(data.pitchId)) {
                    const pitchDoc = await pitchesCollection.doc(data.pitchId).get();
                    if (pitchDoc.exists) {
                        const pitchData = pitchDoc.data();
                        // Default ist true, falls nicht gesetzt
                        pitchConfigs.set(data.pitchId, pitchData.allowFriendlyAutoRelease !== false);
                    } else {
                        pitchConfigs.set(data.pitchId, true); // Fallback
                    }
                }

                // Wenn der Platz NICHT automatisch freigegeben werden soll, überspringen
                if (!pitchConfigs.get(data.pitchId)) {
                    continue;
                }

                totalChecked++;
                const slotDateMillis = getMillisFromDate(data.date);
                const diffMillis = slotDateMillis - now;

                // Wenn der Termin innerhalb der Release-Frist liegt
                if (slotDateMillis > 0 && diffMillis <= releaseMillis) {
                    batch.update(doc.ref, {
                        friendly: true,
                        friendlyReleasedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    updateCount++;
                }
            }

            if (updateCount > 0) {
                await batch.commit();
                console.log(`[_syncFriendlySlots] ${updateCount} Slots in Saison '${seasonData.name}' für Freundschaftsspiele freigegeben.`);
            }
        } catch (error) {
            console.error('[_syncFriendlySlots] Fehler:', error);
        }
    }

    /**
     * KORRIGIERT: Ruft alle Buchungen für eine Saison ab und behandelt alte/neue Datumsformate.
     */
    static async getBookingsForSeason(seasonId, teamId = null) {
        if (!seasonId) throw new Error("Eine Saison-ID ist erforderlich.");

        // Automatisches Aufräumen und Synchronisieren (Lazy Sync)
        await BookingService._runLazySync(seasonId);

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
    static async checkSingleSlot(slotData) {
        const { pitchId, date, duration, bookingIdToIgnore = null, seasonId = null } = slotData;

        // NEU: Vorab-Cleanup, falls seasonId bekannt ist
        if (seasonId) {
            await BookingService._runLazySync(seasonId);
        }

        console.log(`[checkSingleSlot] Checking collision for Pitch: ${pitchId}, Date: ${date}, Duration: ${duration}, Ignore: ${bookingIdToIgnore}`);

        const newBookingStart = new Date(date);
        const newBookingEnd = new Date(newBookingStart.getTime() + duration * 60000);

        // Wir suchen nach allen Buchungen auf dem Platz, um sie manuell zu prüfen.
        // Eine reine Datums-Abfrage ist bei Zeit-Überlappungen zu ungenau.
        const querySnapshot = await bookingsCollection.where('pitchId', '==', pitchId).get();

        if (querySnapshot.empty) {
            console.log('[checkSingleSlot] No bookings on this pitch.');
            return { isAvailable: true };
        }

        let collidingBookingInfo = null;

        for (const doc of querySnapshot.docs) {
            // Beim Bearbeiten einer Buchung darf sie nicht mit sich selbst kollidieren
            if (bookingIdToIgnore && doc.id === bookingIdToIgnore) {
                console.log(`[checkSingleSlot] Ignoring self: ${doc.id}`);
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
                // FALLBACK: Falls Cleanup noch nicht lief, ignorieren wir abgelaufene pending_away_confirm Anfragen
                if (existingBooking.status === 'pending_away_confirm') {
                    const reqAt = getMillisFromDate(existingBooking.requestedAt);
                    const gameAt = getMillisFromDate(existingBooking.date);
                    const now = Date.now();
                    // Annahme: 3 Tage Standard, falls Saison nicht greifbar (worst case)
                    const expMs = 3 * 24 * 60 * 60 * 1000;
                    if ((reqAt > 0 && (now - reqAt) > expMs) || (gameAt > 0 && gameAt < now)) {
                        console.log(`[checkSingleSlot] Ignoring expired collision: ${doc.id}`);
                        continue;
                    }
                }

                console.log(`[checkSingleSlot] Collision found with: ${doc.id} (${existingBookingStart.toISOString()} - ${existingBookingEnd.toISOString()}) vs New (${newBookingStart.toISOString()} - ${newBookingEnd.toISOString()})`);
                collidingBookingInfo = {
                    homeTeamId: existingBooking.homeTeamId || null,
                    awayTeamId: existingBooking.awayTeamId || null,
                };
                break; // Eine Kollision gefunden, die Schleife kann beendet werden.
            }
        }

        if (collidingBookingInfo) {
            console.log('[checkSingleSlot] Collision detected:', collidingBookingInfo);
            return { isAvailable: false, collidingBooking: collidingBookingInfo };
        }

        console.log('[checkSingleSlot] Slot is available.');
        return { isAvailable: true };
    }

    /**
     * NEU: Prüft, ob ein Datum innerhalb der Saison liegt.
     * @private
     */
    static async _validateSeasonDate(seasonId, date) {
        const seasonDoc = await seasonsCollection.doc(seasonId).get();
        if (!seasonDoc.exists) throw new Error('Saison nicht gefunden.');
        const season = seasonDoc.data();

        if (!season.startDate || !season.endDate) return;

        const startMillis = getMillisFromDate(season.startDate);
        // Ende des Tages für das Enddatum (inklusiv)
        const endMillis = getMillisFromDate(season.endDate) + (24 * 60 * 60 * 1000) - 1;
        const dateMillis = getMillisFromDate(date);

        if (dateMillis < startMillis || dateMillis > endMillis) {
            const sStart = new Date(startMillis).toLocaleDateString('de-DE');
            const sEnd = new Date(endMillis).toLocaleDateString('de-DE');
            throw new Error(`Das Datum liegt außerhalb der Saisonlaufzeit (${sStart} - ${sEnd}).`);
        }
    }

    /**
     * Admin erstellt eine einzelne, spezifische Buchung.
     */
    static async adminCreateBooking(bookingData, user) {
        // 0. Saison-Zeitraum validieren
        await BookingService._validateSeasonDate(bookingData.seasonId, bookingData.date);

        // 1. Kollisionsprüfung für den Zeitslot
        const collisionCheck = await BookingService.checkSingleSlot({
            ...bookingData,
            seasonId: bookingData.seasonId
        });
        if (!collisionCheck.isAvailable) {
            throw new Error('Der Termin ist bereits belegt und kann nicht gebucht werden.');
        }

        // 2. NEU: Prüfung der Saisonregeln für die Spielpaarung
        // NEU: Prüfung nur durchführen, wenn es KEIN Freundschaftsspiel ist.
        if (!bookingData.friendly) {
            await BookingService._checkSeasonRulesForPairing(bookingData.homeTeamId, bookingData.awayTeamId, bookingData.seasonId);
        }

        const hasBothTeams = bookingData.homeTeamId && bookingData.awayTeamId;
        const status = (bookingData.status) ? bookingData.status : (hasBothTeams ? 'confirmed' : 'available');

        // 3. Sync limit (automatisches Sperren/Freigeben)
        await BookingService._syncPitchWeeklySlots(bookingData.pitchId, bookingData.date);

        const newBooking = {
            ...bookingData,
            date: admin.firestore.Timestamp.fromDate(new Date(bookingData.date)),
            duration: bookingData.duration || 90, // Standardwert
            status: status, // Automatischer Status
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: user.uid,
            friendly: bookingData.friendly || false, // NEU
        };
        const docRef = await bookingsCollection.add(newBooking);

        console.log(`[adminCreateBooking] Success: Booking ${docRef.id} created by Admin ${user.uid} (Pitch: ${bookingData.pitchId}, Date: ${bookingData.date})`);
        return { id: docRef.id, ...newBooking };
    }

    /**
     * Admin aktualisiert eine einzelne Buchung.
     */
    static async adminUpdateBooking(bookingId, updateData) {
        // 1. Kollisionsprüfung für den Zeitslot
        const collisionCheck = await BookingService.checkSingleSlot({
            ...updateData,
            bookingIdToIgnore: bookingId, // Wichtig, damit der Termin nicht mit sich selbst kollidiert
            seasonId: updateData.seasonId
        });
        if (!collisionCheck.isAvailable) {
            throw new Error('Der neue Termin ist bereits belegt und kann nicht gebucht werden.');
        }

        const bookingRef = bookingsCollection.doc(bookingId);
        const doc = await bookingRef.get();
        if (!doc.exists) {
            throw new Error('Buchung nicht gefunden.');
        }
        const originalBooking = doc.data();

        // 2. NEU: Prüfung der Saisonregeln, falls Teams geändert wurden.
        // Wir benötigen die seasonId, die entweder im Update-Payload oder in der originalen Buchung ist.
        const seasonId = updateData.seasonId || originalBooking.seasonId;

        // KORREKTUR: Die ID der zu bearbeitenden Buchung wird übergeben, um sie bei der Prüfung zu ignorieren.
        // NEU: Prüfung nur durchführen, wenn es KEIN Freundschaftsspiel ist.
        const isFriendly = updateData.friendly !== undefined ? updateData.friendly : originalBooking.friendly;
        if (!isFriendly) {
            await BookingService._checkSeasonRulesForPairing(updateData.homeTeamId, updateData.awayTeamId, seasonId, bookingId);
        }

        // KORREKTUR: Status wird auch beim Update automatisch angepasst.
        const hasBothTeams = updateData.homeTeamId && updateData.awayTeamId;
        // FIX: Allow admin to override status
        let status = updateData.status || (hasBothTeams ? 'confirmed' : 'available');

        // 3. Sync limit nach Update
        // Wir syncen für den ALTEN und den NEUEN Termin/Platz, falls geändert.
        const targetPitchId = updateData.pitchId || originalBooking.pitchId;
        const targetDate = updateData.date || originalBooking.date;
        await BookingService._syncPitchWeeklySlots(targetPitchId, targetDate);

        // Falls Platz/Datum geändert wurde, auch den alten Platz syncen
        if ((updateData.pitchId && updateData.pitchId !== originalBooking.pitchId) ||
            (updateData.date && updateData.date !== originalBooking.date)) {
            await BookingService._syncPitchWeeklySlots(originalBooking.pitchId, originalBooking.date);
        }

        // NEU: Wenn Status "cancelled" (Abgesagt) oder "blocked" (Gesperrt) ist, wird die Buchung zurückgesetzt.
        let finalHomeTeamId = updateData.homeTeamId;
        let finalAwayTeamId = updateData.awayTeamId;
        let finalFriendly = isFriendly;

        // NEU: Wenn Admin explizit friendly setzt (oder ändert), steuern wir den Auto-Sync.
        // Wenn Admin friendly=false setzt, wollen wir nicht, dass der Sync es wieder auf true setzt -> friendlyAutoSync = false.
        // Wenn Admin friendly=true setzt, ist friendlyAutoSync egal (es ist ja schon friendly).
        let finalFriendlyAutoSync = originalBooking.friendlyAutoSync; // Standard: Beibehalten

        if (updateData.friendly !== undefined) {
            // Der Admin hat explizit eine Entscheidung getroffen.
            if (updateData.friendly === false) {
                finalFriendlyAutoSync = false; // "Bitte nicht automatisch überschreiben"
            } else {
                finalFriendlyAutoSync = true; // Reset, falls man es doch wieder freigeben will (optional, aber sauberer)
            }
        }

        if (status === 'cancelled' || status === 'blocked') {
            // NEU: Wenn es eine individuelle Buchung ist, wird sie komplett gelöscht.
            if (originalBooking.isCustom) {
                await bookingRef.delete();
                return { message: 'Individuelle Buchung wurde gelöscht.' };
            }

            if (status === 'cancelled') {
                status = 'available';
            }
            // Bei 'blocked' bleibt status 'blocked'.

            finalHomeTeamId = null;
            finalAwayTeamId = null;
            finalFriendly = false;

            // NEU: Benachrichtigung senden, wenn Admin absagt
            try {
                // Sende an beide Teams, falls vorhanden
                const teamsToNotify = [originalBooking.homeTeamId, originalBooking.awayTeamId].filter(id => id);
                const dateStr = originalBooking.date?.toDate ? originalBooking.date.toDate().toLocaleDateString('de-DE') : 'Unbekanntes Date';

                teamsToNotify.forEach(teamId => {
                    notificationService.notifyTeam(
                        teamId,
                        'booking_cancelled', // Maps to gameCancellations setting
                        'Spiel durch Admin abgesagt',
                        `Das Spiel am ${dateStr} wurde durch einen Administrator abgesagt oder zurückgesetzt.`,
                        { bookingId: bookingId, date: dateStr }
                    ).catch(e => console.error('[adminUpdateBooking] Notification error:', e));
                });
            } catch (notifError) {
                console.error('[adminUpdateBooking] Error preparing cancellation notification:', notifError);
            }
        }

        const dataToUpdate = {
            ...updateData,
            date: admin.firestore.Timestamp.fromDate(new Date(updateData.date)),
            status: status, // Automatischer oder zurückgesetzter Status
            homeTeamId: finalHomeTeamId,
            awayTeamId: finalAwayTeamId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            friendly: finalFriendly, // NEU
            friendlyAutoSync: finalFriendlyAutoSync !== undefined ? finalFriendlyAutoSync : true // Default true
        };

        await bookingRef.update(dataToUpdate);

        // 3. NEU: Automatische Synchronisierung der freien Slots
        // Wir synchronisieren sowohl den alten als auch den neuen Platz/Termin
        await BookingService._syncPitchWeeklySlots(originalBooking.pitchId, originalBooking.date);
        if (updateData.pitchId || updateData.date) {
            await BookingService._syncPitchWeeklySlots(dataToUpdate.pitchId || originalBooking.pitchId, dataToUpdate.date || originalBooking.date);
        }

        const updatedDoc = await bookingRef.get();
        return { id: bookingId, ...updatedDoc.data() };
    }

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

        // NEU: Cleanup trigger
        if (seasonId) {
            await BookingService._runLazySync(seasonId);
        }

        const potentialSlots = [];
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            if (days[d.getDay()]) {
                for (const pitchId of pitchIds) {
                    for (const time of times) {
                        const bookingDate = BookingService._createBerlinDate(d.toISOString().split('T')[0], time);

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

    static async bulkCreateAvailableSlots(data, user) {
        const { seasonId, slotsToCreate } = data;

        // 0. Saison-Daten für Validierung laden
        const seasonDoc = await seasonsCollection.doc(seasonId).get();
        if (!seasonDoc.exists) throw new Error('Saison nicht gefunden.');
        const season = seasonDoc.data();
        const sStart = getMillisFromDate(season.startDate);
        const sEnd = getMillisFromDate(season.endDate) + (24 * 60 * 60 * 1000) - 1;

        const batch = db.batch();

        // Use a set to track unique keys for syncing (PitchId + Date)
        const syncedKeys = new Set();
        // Identify valid keys to sync after batch commit
        const keysToSync = [];

        for (const slot of slotsToCreate) {
            // FIX: Robust date parsing for data coming back from frontend (JSON)
            let dateObj;
            try {
                if (slot.date && typeof slot.date === 'string') {
                    dateObj = new Date(slot.date);
                } else if (slot.date && typeof slot.date === 'object') {
                    if (slot.date.seconds) {
                        dateObj = new Date(slot.date.seconds * 1000); // Standard Firestore format
                    } else if (slot.date._seconds) {
                        dateObj = new Date(slot.date._seconds * 1000); // Internal format
                    } else if (typeof slot.date.toDate === 'function') {
                        dateObj = slot.date.toDate();
                    } else {
                        // Attempt to parse if it's a completely plain object but shouldn't happen usually
                        dateObj = new Date(slot.date);
                    }
                } else {
                    dateObj = new Date(slot.date);
                }
            } catch (e) {
                console.error("Error parsing date in bulkCreate:", slot.date, e);
                continue;
            }

            if (!dateObj || isNaN(dateObj.getTime())) {
                console.error("Invalid date object derived from:", slot.date);
                continue;
            }

            const firestoreDate = admin.firestore.Timestamp.fromDate(dateObj);

            // NEU: Prüfung gegen Saisonlaufzeit
            if (season.startDate && season.endDate) {
                const dMillis = dateObj.getTime();
                if (dMillis < sStart || dMillis > sEnd) {
                    throw new Error(`Das Datum ${dateObj.toLocaleDateString('de-DE')} liegt außerhalb der Saisonlaufzeit.`);
                }
            }

            const newBooking = {
                seasonId,
                pitchId: slot.pitchId,
                date: firestoreDate,
                duration: slot.duration,
                status: 'available',
                homeTeamId: null,
                awayTeamId: null,
                friendly: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                createdBy: user.uid,
            };
            const docRef = bookingsCollection.doc();
            batch.set(docRef, newBooking);

            // Prepare sync key
            const dateStr = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
            const key = `${slot.pitchId}_${dateStr}`;

            if (!syncedKeys.has(key)) {
                syncedKeys.add(key);
                keysToSync.push({ pitchId: slot.pitchId, date: firestoreDate });
            }
        }

        await batch.commit();

        // 3. Sync slots after commit
        for (const item of keysToSync) {
            await BookingService._syncPitchWeeklySlots(item.pitchId, item.date);
        }

        return { message: `${slotsToCreate.length} Spieltermine erfolgreich erstellt.` };
    }

    /**
     * Ein Team fordert einen verfügbaren Spieltermin an.
     */
    static async requestBookingSlot(bookingId, homeTeamId, awayTeamId, requestingUserId, friendly = false) {
        const bookingRef = bookingsCollection.doc(bookingId);
        const bookingDoc = await bookingRef.get();

        if (!bookingDoc.exists) {
            throw new Error('Buchung nicht gefunden.');
        }
        const bookingData = bookingDoc.data();

        // NEU:Cleanup trigger vor der Verfügbarkeitsprüfung
        if (bookingData.seasonId) {
            await BookingService._runLazySync(bookingData.seasonId);
        }

        // Prüfe, ob der Slot verfügbar ist (nach potentiellem Cleanup)
        // Wir müssen das Dokument evtl. neu laden, falls es gerade bereinigt wurde.
        const currentDoc = await bookingRef.get();
        const currentData = currentDoc.data();

        const isAvailable = currentData.status === 'available' || (currentData.isAvailable === true && !currentData.homeTeamId && !currentData.awayTeamId);
        if (!isAvailable) {
            throw new Error('Dieser Termin ist nicht mehr verfügbar.');
        }

        // Saison-Regeln prüfen (nur wenn kein Freundschaftsspiel)
        if (!friendly) {
            await BookingService._checkSeasonRulesForPairing(homeTeamId, awayTeamId, bookingData.seasonId);
        } else if (!bookingData.friendly) {
            // Wenn es als Freundschaftsspiel gebucht wird, aber der Slot KEIN Freundschaftsspiel-Slot ist,
            // prüfen wir die Freigabezeit aus der Saison.
            const seasonDoc = await seasonsCollection.doc(bookingData.seasonId).get();
            if (seasonDoc.exists) {
                const seasonData = seasonDoc.data();
                const releaseHours = seasonData.friendlyGamesReleaseHours || 48;
                const now = Date.now();
                const slotDateMillis = getMillisFromDate(bookingData.date);
                const releaseMillis = releaseHours * 60 * 60 * 1000;

                if ((slotDateMillis - now) > releaseMillis) {
                    throw new Error(`Dieser Termin ist noch nicht für Freundschaftsspiele freigegeben. Erst ${releaseHours} Stunden vor Spielbeginn.`);
                }
            }
        }

        // Status setzen: Wenn Auswärtsmannschaft dabei ist, muss sie bestätigen
        const status = awayTeamId ? 'pending_away_confirm' : 'confirmed';

        await bookingRef.update({
            homeTeamId,
            awayTeamId,
            status,
            friendly,
            isAvailable: false,
            requestedBy: requestingUserId,
            requestedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 3. NEU: Benachrichtigung an das Auswärtsteam (falls vorhanden)
        if (awayTeamId) {
            try {
                const homeTeamDoc = await teamsCollection.doc(homeTeamId).get();
                const homeTeamName = homeTeamDoc.exists ? homeTeamDoc.data().name : 'Ein Team';

                // Fetch Pitch Name
                let pitchName = 'Unbekannter Platz';
                if (bookingData.pitchId) {
                    const pDoc = await pitchesCollection.doc(bookingData.pitchId).get();
                    if (pDoc.exists) pitchName = pDoc.data().name;
                }

                const dateObj = bookingData.date.toDate ? bookingData.date.toDate() : new Date(bookingData.date);
                const dateStr = dateObj.toLocaleDateString('de-DE');
                const timeStr = dateObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

                await notificationService.notifyTeam(
                    awayTeamId,
                    'new_booking_request',
                    'Neue Spielanfrage',
                    `${homeTeamName} möchte am ${dateStr} um ${timeStr} Uhr gegen euch spielen (@ ${pitchName}).`,
                    { bookingId, homeTeamId, homeTeamName, date: bookingData.date, pitchName, time: timeStr }
                );
            } catch (e) {
                console.error('Error sending notification for booking request:', e);
            }
        }

        // 4. NEU: Automatische Synchronisierung der freien Slots
        await BookingService._syncPitchWeeklySlots(bookingData.pitchId, bookingData.date);

        console.log(`[requestBookingSlot] Success: Booking ${bookingId} requested by ${requestingUserId} (Home: ${homeTeamId}, Away: ${awayTeamId})`);
        return { message: 'Buchung erfolgreich angefragt.' };
    }

    /**
     * Team reagiert auf eine Spielanfrage (annehmen/ablehnen).
     */
    static async respondToBookingRequest(bookingId, action, reason = '', actingTeamId) {
        const bookingRef = bookingsCollection.doc(bookingId);
        const bookingDoc = await bookingRef.get();

        if (!bookingDoc.exists) {
            throw new Error('Buchung nicht gefunden.');
        }
        const bookingData = bookingDoc.data();

        // NEU: Prüfen, ob die Anfrage bereits abgelaufen ist
        const reqAt = getMillisFromDate(bookingData.requestedAt);
        const gameAt = getMillisFromDate(bookingData.date);
        const now = Date.now();

        // Wir holen die Expiry-Days aus der Saison
        let expiryDays = 3;
        try {
            const seasonDoc = await seasonsCollection.doc(bookingData.seasonId).get();
            if (seasonDoc.exists) {
                expiryDays = seasonDoc.data().requestExpiryDays || 3;
            }
        } catch (e) {
            console.error('Error fetching season for expiry check:', e);
        }
        const expiryMillis = expiryDays * 24 * 60 * 60 * 1000;

        if ((reqAt > 0 && (now - reqAt) > expiryMillis) || (gameAt > 0 && gameAt < now)) {
            // Trigger Cleanup für die ganze Saison, wenn wir schon dabei sind
            await BookingService._runLazySync(bookingData.seasonId);
            throw new Error('Diese Anfrage ist bereits abgelaufen und kann nicht mehr beantwortet werden.');
        }

        if (bookingData.status !== 'pending_away_confirm') {
            throw new Error('Es liegt keine offene Anfrage für dieses Spiel vor.');
        }

        if (bookingData.awayTeamId !== actingTeamId) {
            throw new Error('Nur das Auswärtsteam kann diese Anfrage beantworten.');
        }

        if (action === 'confirm') {
            await bookingRef.update({
                status: 'confirmed',
                confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // NEU: Benachrichtigung an das Heimteam
            try {
                const awayTeamDoc = await teamsCollection.doc(bookingData.awayTeamId).get();
                const awayTeamName = awayTeamDoc.exists ? awayTeamDoc.data().name : 'Das Auswärtsteam';

                // Fetch Pitch Name
                let pitchName = 'Unbekannter Platz';
                if (bookingData.pitchId) {
                    const pDoc = await pitchesCollection.doc(bookingData.pitchId).get();
                    if (pDoc.exists) pitchName = pDoc.data().name;
                }

                const dateObj = bookingData.date.toDate ? bookingData.date.toDate() : new Date(bookingData.date);
                const dateStr = dateObj.toLocaleDateString('de-DE');
                const timeStr = dateObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

                await notificationService.notifyTeam(
                    bookingData.homeTeamId,
                    'booking_confirmed',
                    'Spiel bestätigt',
                    `${awayTeamName} hat die Anfrage für das Spiel am ${dateStr} um ${timeStr} Uhr angenommen.`,
                    { bookingId, awayTeamId: bookingData.awayTeamId, awayTeamName, date: bookingData.date, pitchName, time: timeStr }
                );
            } catch (e) {
                console.error('Error sending notification for booking confirmation:', e);
            }

            // 3. NEU: Automatische Synchronisierung der freien Slots
            await BookingService._syncPitchWeeklySlots(bookingData.pitchId, bookingData.date);

            return { message: 'Spiel bestätigt!' };
        }

        if (action === 'deny') {
            // NEU: Wenn es eine individuelle Buchung ist, wird sie gelöscht.
            // NEU: Wenn es eine individuelle Buchung ist, wird sie gelöscht.
            if (bookingData.isCustom) {
                // Vor dem Löschen benachrichtigen!
                try {
                    const awayTeamDoc = await teamsCollection.doc(bookingData.awayTeamId).get();
                    const awayTeamName = awayTeamDoc.exists ? awayTeamDoc.data().name : 'Das Auswärtsteam';

                    let pitchName = 'Unbekannter Platz';
                    if (bookingData.pitchId) {
                        const pDoc = await pitchesCollection.doc(bookingData.pitchId).get();
                        if (pDoc.exists) pitchName = pDoc.data().name;
                    }

                    const dateObj = bookingData.date.toDate ? bookingData.date.toDate() : new Date(bookingData.date);
                    const dateStr = dateObj.toLocaleDateString('de-DE');
                    // time is stored as string in custom bookings usually, or we formatting it from date
                    const timeStr = bookingData.time || dateObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

                    await notificationService.notifyTeam(
                        bookingData.homeTeamId,
                        'booking_denied',
                        'Anfrage abgelehnt',
                        `${awayTeamName} hat die Anfrage für das Spiel am ${dateStr} abgelehnt.`,
                        {
                            bookingId,
                            awayTeamId: bookingData.awayTeamId,
                            awayTeamName,
                            date: bookingData.date,
                            reason,
                            pitchName,
                            time: timeStr
                        }
                    );
                } catch (e) {
                    console.error('[respondToBookingRequest] Notification error (custom deny):', e);
                }

                await bookingRef.delete();
                return { message: 'Anfrage abgelehnt. Die individuelle Buchung wurde gelöscht.' };
            }

            await bookingRef.update({
                status: 'available',
                homeTeamId: null,
                awayTeamId: null,
                friendly: false,
                isAvailable: true,
                deniedByTeamId: actingTeamId,
                deniedAt: admin.firestore.FieldValue.serverTimestamp(),
                denialReason: reason,
            });

            // NEU: Benachrichtigung an das Heimteam
            try {
                const awayTeamDoc = await teamsCollection.doc(bookingData.awayTeamId).get();
                const awayTeamName = awayTeamDoc.exists ? awayTeamDoc.data().name : 'Das Auswärtsteam';

                // Fetch Pitch Name
                let pitchName = 'Unbekannter Platz';
                if (bookingData.pitchId) {
                    const pDoc = await pitchesCollection.doc(bookingData.pitchId).get();
                    if (pDoc.exists) pitchName = pDoc.data().name;
                }

                const dateObj = bookingData.date.toDate ? bookingData.date.toDate() : new Date(bookingData.date);
                const dateStr = dateObj.toLocaleDateString('de-DE');
                const timeStr = dateObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

                await notificationService.notifyTeam(
                    bookingData.homeTeamId,
                    'booking_denied',
                    'Anfrage abgelehnt',
                    `${awayTeamName} hat die Anfrage für das Spiel am ${dateStr} abgelehnt.`,
                    { bookingId, awayTeamId: bookingData.awayTeamId, awayTeamName, date: bookingData.date, reason, pitchName, time: timeStr }
                );
            } catch (e) {
                console.error('Error sending notification for booking denial:', e);
            }

            // 3. NEU: Automatische Synchronisierung der freien Slots
            await BookingService._syncPitchWeeklySlots(bookingData.pitchId, bookingData.date);

            return { message: 'Anfrage abgelehnt. Der Termin ist wieder frei.' };
        }

        throw new Error('Ungültige Aktion.');
    }

    /**
     * Leitet den Stornierungsprozess für ein bestätigtes Spiel ein.
     * Entfernt die beiden Mannschaften und macht den Zeitslot wieder verfügbar.
     */
    static async initiateCancellation(bookingId, cancellingTeamId, reason = '') {
        const bookingRef = bookingsCollection.doc(bookingId);
        const bookingDoc = await bookingRef.get();
        if (!bookingDoc.exists) {
            throw new Error('Buchung nicht gefunden.');
        }
        const bookingData = bookingDoc.data();

        // Erlaube Stornierung für confirmed oder pending_away_confirm Buchungen
        if (bookingData.status !== 'confirmed' && bookingData.status !== 'pending_away_confirm') {
            throw new Error('Nur bestätigte Spiele oder ausstehende Anfragen können storniert werden.');
        }

        // Prüfe, ob das Team an der Buchung beteiligt ist
        if (bookingData.homeTeamId !== cancellingTeamId && bookingData.awayTeamId !== cancellingTeamId) {
            throw new Error('Du kannst nur Buchungen absagen, an denen dein Team beteiligt ist.');
        }

        // NEU: Wenn es eine individuelle Buchung ist, wird sie gelöscht.
        // NEU: Wenn es eine individuelle Buchung ist, wird sie gelöscht.
        if (bookingData.isCustom) {
            // Benachrichtigung vor dem Löschen
            const opponentTeamId = bookingData.homeTeamId === cancellingTeamId ? bookingData.awayTeamId : bookingData.homeTeamId;
            if (opponentTeamId) {
                try {
                    const cancellingTeamDoc = await teamsCollection.doc(cancellingTeamId).get();
                    const cancellingTeamName = cancellingTeamDoc.exists ? cancellingTeamDoc.data().name : 'Ein Team';

                    let pitchName = 'Unbekannter Platz';
                    if (bookingData.pitchId) {
                        const pDoc = await pitchesCollection.doc(bookingData.pitchId).get();
                        if (pDoc.exists) pitchName = pDoc.data().name;
                    }

                    const dateObj = bookingData.date.toDate ? bookingData.date.toDate() : new Date(bookingData.date);
                    const dateStr = dateObj.toLocaleDateString('de-DE');
                    const timeStr = bookingData.time || dateObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

                    await notificationService.notifyTeam(
                        opponentTeamId,
                        'booking_cancelled', // Or create a new type if 'withdrawn' needs different text, but cancelled is fine
                        'Spiel abgesagt',
                        `${cancellingTeamName} hat das Spiel am ${dateStr} um ${timeStr} Uhr abgesagt.`,
                        {
                            bookingId,
                            cancellingTeamId,
                            cancellingTeamName,
                            date: bookingData.date,
                            reason,
                            pitchName,
                            time: timeStr
                        }
                    );
                } catch (e) {
                    console.error('[initiateCancellation] Notification error (custom cancel):', e);
                }
            }

            await bookingRef.delete();
            return { message: 'Spiel abgesagt. Die individuelle Buchung wurde gelöscht.' };
        }

        const result = await db.runTransaction(async (transaction) => {
            // Entferne beide Mannschaften und setze Status auf available
            transaction.update(bookingRef, {
                status: 'available',
                homeTeamId: null,
                awayTeamId: null,
                isAvailable: true,
                cancelledByTeamId: cancellingTeamId,
                cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                cancellationReason: reason || null,
            });

            const message = bookingData.status === 'pending_away_confirm'
                ? 'Spielanfrage storniert. Der Zeitslot wurde wieder freigegeben.'
                : 'Spiel abgesagt. Der Zeitslot wurde wieder freigegeben.';

            return { message };
        });

        // NEU: Benachrichtigung an den Gegner senden
        const opponentTeamId = bookingData.homeTeamId === cancellingTeamId ? bookingData.awayTeamId : bookingData.homeTeamId;
        if (opponentTeamId) {
            try {
                const cancellingTeamDoc = await teamsCollection.doc(cancellingTeamId).get();
                const cancellingTeamName = cancellingTeamDoc.exists ? cancellingTeamDoc.data().name : 'Ein Team';

                // Fetch Pitch Name
                let pitchName = 'Unbekannter Platz';
                if (bookingData.pitchId) {
                    const pDoc = await pitchesCollection.doc(bookingData.pitchId).get();
                    if (pDoc.exists) pitchName = pDoc.data().name;
                }

                const dateObj = bookingData.date.toDate ? bookingData.date.toDate() : new Date(bookingData.date);
                const dateStr = dateObj.toLocaleDateString('de-DE');
                const timeStr = dateObj.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

                await notificationService.notifyTeam(
                    opponentTeamId,
                    'booking_cancelled',
                    'Spiel abgesagt',
                    `${cancellingTeamName} hat das Spiel am ${dateStr} um ${timeStr} Uhr abgesagt.`,
                    { bookingId, cancellingTeamId, cancellingTeamName, date: bookingData.date, reason, pitchName, time: timeStr }
                );
            } catch (e) {
                console.error('Error sending notification for booking cancellation:', e);
            }
        }

        // 3. NEU: Automatische Synchronisierung der freien Slots
        await BookingService._syncPitchWeeklySlots(bookingData.pitchId, bookingData.date);

        return result;
    }

    /**
     * Verarbeitet die Antwort des Gegners auf einen Stornierungs-Antrag.
     */
    static async respondToCancellationRequest(bookingId, respondingTeamId, response, reason = '') {
        const bookingRef = bookingsCollection.doc(bookingId);

        // Hole Daten vor der Transaction
        const bookingDoc = await bookingRef.get();
        if (!bookingDoc.exists || bookingDoc.data().status !== 'cancellation_pending') {
            throw new Error('Es liegt kein Stornierungs-Antrag für dieses Spiel vor.');
        }
        const bookingData = bookingDoc.data();

        if (bookingData.cancellationRequestedByTeamId === respondingTeamId) {
            throw new Error('Du kannst nicht auf deinen eigenen Antrag antworten.');
        }

        // Hole Team-Namen für Benachrichtigungen
        const requestingTeamDoc = await teamsCollection.doc(bookingData.cancellationRequestedByTeamId).get();
        const requestingTeamName = requestingTeamDoc.exists ? requestingTeamDoc.data().name : 'Unbekanntes Team';

        const respondingTeamDoc = await teamsCollection.doc(respondingTeamId).get();
        const respondingTeamName = respondingTeamDoc.exists ? respondingTeamDoc.data().name : 'Unbekanntes Team';

        // Normalisiere das Datum nur für die Formatierung in der Benachrichtigung
        if (!bookingData.date) {
            throw new Error('Kein Datum in der Buchung gefunden.');
        }

        // Konvertiere Firestore Timestamp zu Date für Formatierung
        let gameDate;
        try {
            if (typeof bookingData.date.toDate === 'function') {
                const dateObj = bookingData.date.toDate();
                if (dateObj instanceof Date && !isNaN(dateObj.valueOf())) {
                    gameDate = dateObj;
                } else {
                    throw new Error('toDate() hat kein gültiges Date-Objekt zurückgegeben');
                }
            } else if (bookingData.date instanceof Date && !isNaN(bookingData.date.valueOf())) {
                gameDate = bookingData.date;
            } else if (typeof bookingData.date._seconds === 'number') {
                gameDate = new Date(bookingData.date._seconds * 1000);
                if (isNaN(gameDate.valueOf())) {
                    throw new Error('Ungültiges Datum aus _seconds');
                }
            } else {
                gameDate = new Date(bookingData.date);
                if (isNaN(gameDate.valueOf())) {
                    throw new Error('Ungültiges Datum');
                }
            }
        } catch (e) {
            console.error('Fehler bei Datumskonvertierung:', e, bookingData.date);
            gameDate = null; // Setze auf null, damit die Formatierung sicher ist
        }

        let gameDateStr = 'Unbekannt';
        let gameTimeStr = 'Unbekannt';
        if (gameDate instanceof Date && !isNaN(gameDate.valueOf())) {
            try {
                gameDateStr = gameDate.toLocaleDateString('de-DE');
                gameTimeStr = gameDate.toTimeString().slice(0, 5);
            } catch (e) {
                console.error('Fehler bei Datumsformatierung:', e);
            }
        }

        if (response === 'accept') {
            await db.runTransaction(async (transaction) => {
                // Alle Reads ZUERST ausführen
                const bookingDocInTransaction = await transaction.get(bookingRef);
                if (!bookingDocInTransaction.exists || bookingDocInTransaction.data().status !== 'cancellation_pending') {
                    throw new Error('Es liegt kein Stornierungs-Antrag für dieses Spiel vor.');
                }

                // NEU: Wenn es eine individuelle Buchung ist, wird sie gelöscht.
                if (bookingData.isCustom) {
                    transaction.delete(bookingRef);
                    return; // Keine weitere Verarbeitung nötig
                }

                const pitchRef = pitchesCollection.doc(bookingData.pitchId);
                const pitchDoc = await transaction.get(pitchRef);

                // Dann alle Writes ausführen
                transaction.update(bookingRef, {
                    status: 'available',
                    homeTeamId: null,
                    awayTeamId: null,
                    isAvailable: true,
                    cancelledByTeamId: bookingData.cancellationRequestedByTeamId,
                    cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            });

            // 3. NEU: Automatische Synchronisierung der freien Slots
            await BookingService._syncPitchWeeklySlots(bookingData.pitchId, bookingData.date);

            // Benachrichtigung an das anfragende Team senden (außerhalb der Transaction)
            await notificationService.notifyTeam(
                bookingData.cancellationRequestedByTeamId,
                'cancellation_accepted',
                'Stornierung angenommen',
                `${respondingTeamName} hat deine Stornierungsanfrage für das Spiel am ${gameDateStr} um ${gameTimeStr} Uhr angenommen. Das Spiel wurde abgesagt.`,
                {
                    bookingId: bookingId,
                    acceptedByTeamId: respondingTeamId,
                    acceptedByTeamName: respondingTeamName,
                    gameDate: gameDateStr,
                    gameTime: gameTimeStr,
                }
            );

            return { message: 'Stornierung angenommen. Das Spiel wurde abgesagt.' };

        } else if (response === 'reject') {
            await db.runTransaction(async (transaction) => {
                const bookingDocInTransaction = await transaction.get(bookingRef);
                if (!bookingDocInTransaction.exists || bookingDocInTransaction.data().status !== 'cancellation_pending') {
                    throw new Error('Es liegt kein Stornierungs-Antrag für dieses Spiel vor.');
                }

                transaction.update(bookingRef, {
                    status: 'confirmed',
                    cancellationRequestedByTeamId: null,
                    cancellationRequestedAt: null,
                    cancellationRequestReason: null,
                    cancellationRejectionReason: reason,
                });
            });

            // 3. NEU: Automatische Synchronisierung der freien Slots
            await BookingService._syncPitchWeeklySlots(bookingData.pitchId, bookingData.date);

            // Benachrichtigung an das anfragende Team senden (außerhalb der Transaction)
            await notificationService.notifyTeam(
                bookingData.cancellationRequestedByTeamId,
                'cancellation_rejected',
                'Stornierung abgelehnt',
                `${respondingTeamName} hat deine Stornierungsanfrage für das Spiel am ${gameDateStr} um ${gameTimeStr} Uhr abgelehnt.${reason ? ` Grund: ${reason}` : ''} Das Spiel bleibt bestehen.`,
                {
                    bookingId: bookingId,
                    rejectedByTeamId: respondingTeamId,
                    rejectedByTeamName: respondingTeamName,
                    gameDate: gameDateStr,
                    gameTime: gameTimeStr,
                    reason: reason,
                }
            );

            return { message: 'Stornierungs-Antrag abgelehnt. Das Spiel findet wie geplant statt.' };
        } else {
            throw new Error('Ungültige Antwort.');
        }
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

        // NEU: Datum prüfen
        const season = seasonDoc.data();
        if (season.startDate && season.endDate) {
            const sStart = getMillisFromDate(season.startDate);
            const sEnd = getMillisFromDate(season.endDate) + (24 * 60 * 60 * 1000) - 1;
            const bDate = new Date(date).getTime();
            if (bDate < sStart || bDate > sEnd) {
                throw new Error('Das Datum liegt außerhalb der Saisonlaufzeit.');
            }
        }

        const newBookingData = {
            ...bookingData,
            date: new Date(date), // Convert string to Date object
            createdBy: user.uid,
            status: awayTeamId ? 'pending_away_confirm' : 'confirmed',
            isCustom: true, // NEU: Explizit als individuelle Buchung markieren
            duration: bookingData.duration || 90, // Fallback, falls nicht übergeben
            requestedAt: admin.firestore.FieldValue.serverTimestamp(),
            requestedBy: user.uid,
        };

        const newBooking = new Booking(newBookingData);
        const firestoreObject = newBooking.toFirestoreObject();
        firestoreObject.createdAt = admin.firestore.FieldValue.serverTimestamp();

        // FIX: Manuell hinzufügen, da das Booking-Model diese Felder (noch) nicht unterstützt
        if (newBookingData.requestedAt) firestoreObject.requestedAt = newBookingData.requestedAt;
        if (newBookingData.requestedBy) firestoreObject.requestedBy = newBookingData.requestedBy;

        const docRef = await bookingsCollection.add(firestoreObject);

        // 3. NEU: Automatische Synchronisierung der freien Slots
        await BookingService._syncPitchWeeklySlots(pitchId, date);

        // 4. NEU: Benachrichtigung an den Gegner (falls vorhanden)
        if (awayTeamId) {
            try {
                // Fetch Names
                const [homeTeamDoc, awayTeamDoc] = await Promise.all([
                    teamsCollection.doc(homeTeamId).get(),
                    teamsCollection.doc(awayTeamId).get()
                ]);
                const homeTeamName = homeTeamDoc.exists ? homeTeamDoc.data().name : 'Heimteam';
                const awayTeamName = awayTeamDoc.exists ? awayTeamDoc.data().name : 'Auswärtsteam';
                const pitchName = pitch.name || 'Unbekannter Platz';

                // Format Date/Time
                const dateObj = new Date(date);
                const dateStr = dateObj.toLocaleDateString('de-DE');
                // time ist hier ein String "HH:mm" aus dem Input

                await notificationService.notifyTeam(
                    awayTeamId,
                    'new_booking_request',
                    'Neue Spielanfrage',
                    `${homeTeamName} möchte ein Spiel gegen euch bestreiten.`,
                    {
                        bookingId: docRef.id,
                        homeTeamId,
                        homeTeamName,
                        awayTeamName,
                        date: dateObj,
                        time: time,
                        pitchName
                    }
                );
            } catch (e) {
                console.error('[createCustomBooking] Notification error:', e);
            }
        }

        console.log(`[createCustomBooking] Success: Custom booking ${docRef.id} created by ${user.uid} (Home: ${homeTeamId}, Away: ${awayTeamId}, Date: ${date})`);
        return { id: docRef.id, ...firestoreObject };
    }

    /**
     * Storniert ein Spiel final durch einen Admin.
     */
    static async adminCancelBooking(bookingId, reason, adminUid) {
        const bookingRef = bookingsCollection.doc(bookingId);
        const bookingDoc = await bookingRef.get(); // Added missing bookingDoc fetch
        if (bookingDoc.exists && bookingDoc.data().isCustom) {
            await bookingRef.delete();
            return { message: 'Individuelle Buchung wurde durch Admin gelöscht.' };
        }

        await bookingRef.update({
            status: 'available',
            homeTeamId: null,
            awayTeamId: null,
            isAvailable: true,
            cancellationReason: reason,
            cancelledBy: adminUid,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // NEU: Benachrichtigung an beide Teams
        const teamsToNotify = [bookingData.homeTeamId, bookingData.awayTeamId].filter(Boolean);
        for (const teamId of teamsToNotify) {
            try {
                const dateStr = bookingData.date.toDate ? bookingData.date.toDate().toLocaleDateString('de-DE') : new Date(bookingData.date).toLocaleDateString('de-DE');
                await notificationService.notifyTeam(
                    teamId,
                    'admin_booking_cancelled',
                    'Spiel durch Admin abgesagt',
                    `Das Spiel am ${dateStr} wurde durch einen Administrator abgesagt.`,
                    { bookingId, date: bookingData.date, reason }
                );
            } catch (e) {
                console.error(`Error sending admin cancellation notification to team ${teamId}:`, e);
            }
        }

        // 3. NEU: Automatische Synchronisierung der freien Slots
        await BookingService._syncPitchWeeklySlots(bookingDoc.data().pitchId, bookingDoc.data().date);

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
     * NEU: Holt alle bestätigten Buchungen aus der Vergangenheit, für die noch kein Ergebnis eingetragen wurde.
     */
    static async getBookingsNeedingResult(seasonId) {
        if (!seasonId) {
            throw new Error('Saison-ID ist erforderlich.');
        }

        const now = new Date(); // JS Date für den Vergleich im Code

        // KORREKTUR: Wir führen eine einfache Abfrage durch, die keinen speziellen Index benötigt.
        // Wir holen alle Buchungen der angegebenen Saison.
        const bookingsQuery = bookingsCollection
            .where('seasonId', '==', seasonId);

        const bookingsSnapshot = await bookingsQuery.get();
        const allSeasonBookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // KORREKTUR: Die zusätzliche Filterung nach Status und Datum findet jetzt hier im Code statt.
        const pastBookings = allSeasonBookings.filter(booking => {
            // Wichtig: Firestore Timestamps müssen für den Vergleich in JS-Date-Objekte umgewandelt werden.
            // KORREKTUR: Robuste Prüfung, ob .toDate() existiert. Falls nicht, wird das Datum als String behandelt.
            if (!booking.date) return false; // Sicherheitsprüfung für den Fall, dass das Datum fehlt.
            const bookingDate = booking.date.toDate ? booking.date.toDate() : new Date(booking.date);
            // NEU: Prüfe auch auf Vorhandensein beider Teams und schließe Freundschaftsspiele aus
            return booking.status === 'confirmed' && bookingDate < now && booking.homeTeamId && booking.awayTeamId && !booking.friendly;
        });

        if (pastBookings.length === 0) {
            return [];
        }

        // 2. Hole alle Ergebnisse der Saison, die eine bookingId haben
        const resultsSnapshot = await resultsCollection.where('seasonId', '==', seasonId).get();
        const resultBookingIds = new Set(resultsSnapshot.docs.map(doc => doc.data().bookingId).filter(Boolean));

        // 3. Filtere die Buchungen, für die bereits ein Ergebnis existiert
        const bookingsWithoutResult = pastBookings.filter(booking => !resultBookingIds.has(booking.id));

        return bookingsWithoutResult;
    }

    /**
     * NEU: Holt vergangene bestätigte Buchungen ohne Ergebnis für ein bestimmtes Team in einer Saison.
     * Refactored: Holt Daten spezifisch für das Team und filtert robust.
     */
    static async getBookingsNeedingResultForTeam(seasonId, teamId) {
        if (!seasonId || !teamId) {
            throw new Error('Saison-ID und Team-ID sind erforderlich.');
        }

        const now = new Date();
        const nowMillis = now.getTime();

        // 1. Hole alle relevanten Buchungen für das Team
        const homeGamesQuery = bookingsCollection.where('seasonId', '==', seasonId).where('homeTeamId', '==', teamId);
        const awayGamesQuery = bookingsCollection.where('seasonId', '==', seasonId).where('awayTeamId', '==', teamId);

        const [homeSnap, awaySnap] = await Promise.all([homeGamesQuery.get(), awayGamesQuery.get()]);

        const bookingsMap = new Map();
        [...homeSnap.docs, ...awaySnap.docs].forEach(doc => {
            if (!bookingsMap.has(doc.id)) {
                bookingsMap.set(doc.id, { id: doc.id, ...doc.data() });
            }
        });

        const candidates = Array.from(bookingsMap.values()).filter(b => {
            // Wichtig: Date Handling
            const d = getMillisFromDate(b.date);
            const isConfirmed = b.status === 'confirmed';
            const isPast = d < nowMillis;
            const hasTeams = b.homeTeamId && b.awayTeamId;
            const isNotFriendly = !b.friendly;

            return isConfirmed && isPast && hasTeams && isNotFriendly;
        });

        if (candidates.length === 0) return [];

        // 2. Prüfe, für welche dieser Buchungen bereits ein Ergebnis vorliegt
        // Wir suchen Ergebnisse, die mit diesen Buchungs-IDs verknüpft sind.
        // Da 'in'-Queries limitiert sind (max 10), machen wir den Reverse-Check:
        // Wir holen alle Ergebnisse des Teams für diese Saison und prüfen lokal.
        const resultsHomeQuery = resultsCollection.where('seasonId', '==', seasonId).where('homeTeamId', '==', teamId);
        const resultsAwayQuery = resultsCollection.where('seasonId', '==', seasonId).where('awayTeamId', '==', teamId);

        const [resHomeSnap, resAwaySnap] = await Promise.all([resultsHomeQuery.get(), resultsAwayQuery.get()]);

        const existingResultBookingIds = new Set();
        resHomeSnap.forEach(doc => {
            const bid = doc.data().bookingId;
            if (bid) {
                existingResultBookingIds.add(bid);
            }
        });
        resAwaySnap.forEach(doc => {
            const bid = doc.data().bookingId;
            if (bid) {
                existingResultBookingIds.add(bid);
            }
        });

        // 3. Filtere Kandidaten, die schon ein Ergebnis haben
        const final = candidates.filter(b => !existingResultBookingIds.has(b.id));

        // Sortiere: Älteste zuerst
        final.sort((a, b) => getMillisFromDate(a.date) - getMillisFromDate(b.date));

        return final;
    }

    /**
     * NEU: Holt zukünftige Spiele (Buchungen) für ein bestimmtes Team direkt aus der Datenbank.
     * Prüft sowohl Heim- als auch Auswärtsspiele.
     * Das Datum wird als Firestore Timestamp gespeichert und korrekt verarbeitet.
     * @param {string} seasonId Die ID der Saison
     * @param {string} teamId Die ID des Teams
     * @returns {Array} Array von zukünftigen Buchungen für das Team
     */
    static async getUpcomingBookingsForTeam(seasonId, teamId) {
        if (!seasonId || !teamId) {
            throw new Error('Saison-ID und Team-ID sind erforderlich.');
        }

        // Automatisches Aufräumen und Synchronisieren (Lazy Sync)
        await BookingService._runLazySync(seasonId);

        // Erstelle Datum für "jetzt" - setze Zeit auf Anfang des aktuellen Tages, 
        // um auch Spiele des heutigen Tages einzubeziehen
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Setze auf Mitternacht, um alle Spiele ab heute einzubeziehen

        // Query für Heimspiele: Das Team ist Heimmannschaft
        // Verwende nur seasonId und homeTeamId für die Query, um Index-Probleme zu vermeiden
        const homeGamesQuery = bookingsCollection
            .where('seasonId', '==', seasonId)
            .where('homeTeamId', '==', teamId);

        // Query für Auswärtsspiele: Das Team ist Auswärtsmannschaft
        const awayGamesQuery = bookingsCollection
            .where('seasonId', '==', seasonId)
            .where('awayTeamId', '==', teamId);

        // Beide Queries parallel ausführen
        const [homeSnapshot, awaySnapshot] = await Promise.all([
            homeGamesQuery.get(),
            awayGamesQuery.get()
        ]);

        // Kombiniere alle Ergebnisse und filtere clientseitig nach Datum und Status
        const bookingsMap = new Map();
        const nowMillis = now.getTime();

        // Hilfsfunktion zur Konvertierung von Firestore Timestamp zu Millisekunden
        const getTimestampMillis = (timestamp) => {
            if (!timestamp) return 0;
            if (timestamp.toMillis) return timestamp.toMillis(); // Firestore Timestamp
            if (timestamp._seconds) return timestamp._seconds * 1000; // Serialisiertes Format
            if (timestamp instanceof Date) return timestamp.getTime();
            return new Date(timestamp).getTime();
        };

        // Verarbeite Heimspiele
        homeSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const bookingDate = data.date;
            const bookingDateMillis = getTimestampMillis(bookingDate);

            // Prüfe, ob das Spiel in der Zukunft liegt (ab heute)
            const isFuture = bookingDateMillis >= nowMillis;

            // Filter: Nur Spiele mit Status 'confirmed' oder 'pending_away_confirm', 
            // oder Spiele mit beiden Teams (homeTeamId und awayTeamId vorhanden)
            const statusOk = ['confirmed', 'pending_away_confirm'].includes(data.status) ||
                (!!data.homeTeamId && !!data.awayTeamId);

            if (isFuture && statusOk) {
                bookingsMap.set(doc.id, { id: doc.id, ...data });
            }
        });

        // Verarbeite Auswärtsspiele
        awaySnapshot.docs.forEach(doc => {
            const data = doc.data();
            const bookingDate = data.date;
            const bookingDateMillis = getTimestampMillis(bookingDate);

            // Prüfe, ob das Spiel in der Zukunft liegt (ab heute)
            const isFuture = bookingDateMillis >= nowMillis;

            // Filter: Nur Spiele mit Status 'confirmed' oder 'pending_away_confirm',
            // oder Spiele mit beiden Teams (homeTeamId und awayTeamId vorhanden)
            const statusOk = ['confirmed', 'pending_away_confirm'].includes(data.status) ||
                (!!data.homeTeamId && !!data.awayTeamId);

            if (isFuture && statusOk) {
                bookingsMap.set(doc.id, { id: doc.id, ...data });
            }
        });

        // Konvertiere Map zu Array und sortiere nach Datum
        const bookings = Array.from(bookingsMap.values());
        bookings.sort((a, b) => {
            const dateA = getTimestampMillis(a.date);
            const dateB = getTimestampMillis(b.date);
            return dateA - dateB; // Aufsteigend: früheste Spiele zuerst
        });

        // NEU: Platznamen hinzufügen
        const pitchIds = new Set(bookings.map(b => b.pitchId).filter(Boolean));
        if (pitchIds.size > 0) {
            const pitchDocs = await Promise.all(Array.from(pitchIds).map(id => pitchesCollection.doc(id).get()));
            const pitchMap = new Map();
            pitchDocs.forEach(doc => {
                if (doc.exists) {
                    pitchMap.set(doc.id, doc.data().name);
                }
            });

            bookings.forEach(booking => {
                if (booking.pitchId) {
                    booking.pitchName = pitchMap.get(booking.pitchId) || 'Unbekannter Platz';
                }
            });
        }

        return bookings;
    }

    /**
     * NEU: Erstellt eine neue Buchung und führt eine Aktion für eine alte,
     * kollidierende Buchung aus (löschen oder freigeben).
     * Läuft in einer Transaktion, um Datenkonsistenz zu sichern.
     */
    static async createBookingWithOverwrite(data, user) {
        const { newBookingData, overwriteAction, oldBookingId } = data;

        // 1. Kollisionsprüfung für den neuen Termin
        const collisionCheck = await BookingService.checkSingleSlot({
            ...newBookingData,
            bookingIdToIgnore: oldBookingId // Ignoriere die alte Buchung, die wir ja ersetzen
        });
        if (!collisionCheck.isAvailable) {
            throw new Error('Der neue Termin kollidiert mit einer anderen, bestehenden Buchung.');
        }

        // 2. NEU: Prüfung der Saisonregeln für die neue Spielpaarung
        // KORREKTUR: Die ID der alten Buchung wird übergeben, da sie ersetzt wird und nicht mitzählen darf.
        await BookingService._checkSeasonRulesForPairing(newBookingData.homeTeamId, newBookingData.awayTeamId, newBookingData.seasonId, oldBookingId);

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