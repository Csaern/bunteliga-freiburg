class Booking {
  /**
   * Erstellt eine neue Buchungs-Instanz.
   * @param {object} data - Die Daten für die neue Buchung.
   */
  constructor({
    date,
    time,
    pitchId,
    seasonId,
    createdBy,
    homeTeamId = null,
    awayTeamId = null,
  }) {
    // 1. Validierung
    if (!date || !time || !pitchId || !seasonId || !createdBy) {
      throw new Error('Datum, Zeit, Platz-ID, Saison-ID und Ersteller sind erforderlich.');
    }

    // 2. Zuweisung der Kerndaten
    this.date = date;
    this.time = time;
    this.pitchId = pitchId;
    this.seasonId = seasonId;
    this.createdBy = createdBy;
    this.homeTeamId = homeTeamId;
    this.awayTeamId = awayTeamId;

    /**
     * @type {string}
     * Der Lebenszyklus einer Buchung:
     * 'available': Freier Slot.
     * 'pending_away_confirm': Heimteam hat gebucht, wartet auf Gegner.
     * 'confirmed': Spiel ist fix.
     * 'cancellation_pending': Ein Team hat eine Stornierung beantragt.
     * 'denied': Auswärtsteam hat die ursprüngliche Anfrage abgelehnt.
     * 'cancelled': Spiel wurde erfolgreich storniert.
     * 'played': Spiel wurde gespielt.
     */
    this.status = 'available';
    this.isAvailable = !homeTeamId && !awayTeamId;

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
      date: this.date,
      time: this.time,
      pitchId: this.pitchId,
      seasonId: this.seasonId,
      createdBy: this.createdBy,
      homeTeamId: this.homeTeamId,
      awayTeamId: this.awayTeamId,
      status: this.status,
      isAvailable: this.isAvailable,

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