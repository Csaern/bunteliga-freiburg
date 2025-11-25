const admin = require('firebase-admin');

class Booking {
  /**
   * Erstellt eine neue Buchungs-Instanz.
   * @param {object} data - Die Daten für die neue Buchung.
   */
  constructor({
    date, // Erwartet jetzt ein JavaScript Date-Objekt
    duration, // NEU: Dauer des Slots in Minuten
    pitchId,
    seasonId,
    createdBy,
    homeTeamId = null,
    awayTeamId = null,
    friendly = false, // NEU
  }) {
    // 1. Validierung
    if (!date || !duration || !pitchId || !seasonId || !createdBy) {
      throw new Error('Datum, Dauer, Platz-ID, Saison-ID und Ersteller sind erforderlich.');
    }

    // 2. Zuweisung der Kerndaten
    this.date = date; // Ist ein JS Date-Objekt
    this.duration = duration; // z.B. 90 oder 120
    this.pitchId = pitchId;
    this.seasonId = seasonId;
    this.createdBy = createdBy;
    this.homeTeamId = homeTeamId;
    this.awayTeamId = awayTeamId;

    this.status = 'available';
    this.isAvailable = !homeTeamId && !awayTeamId;
    this.friendly = friendly; // NEU

    // 3. Felder für den Ablehnungs- & Stornierungsprozess
    this.deniedByTeamId = null;
    this.deniedAt = null;
    this.denialReason = null;

    this.cancelledByTeamId = null;
    this.cancelledAt = null;

    this.cancellationRequestedByTeamId = null;
    this.cancellationRequestedAt = null;
    this.cancellationRequestReason = null;

    this.cancellationRejectionReason = null;
  }

  /**
   * Konvertiert die Klasseninstanz in ein einfaches JavaScript-Objekt für Firestore.
   * @returns {object}
   */
  toFirestoreObject() {
    return {
      // KORREKTUR: Konvertiert das JS-Datum in einen echten Firestore Timestamp
      date: admin.firestore.Timestamp.fromDate(this.date),
      duration: this.duration, // NEU
      pitchId: this.pitchId,
      seasonId: this.seasonId,
      createdBy: this.createdBy,
      homeTeamId: this.homeTeamId,
      awayTeamId: this.awayTeamId,
      status: this.status,
      isAvailable: this.isAvailable,
      friendly: this.friendly, // NEU

      deniedByTeamId: this.deniedByTeamId,
      deniedAt: this.deniedAt,
      denialReason: this.denialReason,

      cancelledByTeamId: this.cancelledByTeamId,
      cancelledAt: this.cancelledAt,

      cancellationRequestedByTeamId: this.cancellationRequestedByTeamId,
      cancellationRequestedAt: this.cancellationRequestedAt,
      cancellationRequestReason: this.cancellationRequestReason,

      cancellationRejectionReason: this.cancellationRejectionReason,
    };
  }
}

module.exports = Booking;