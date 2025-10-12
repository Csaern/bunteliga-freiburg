class Booking {
  /**
   * Erstellt eine neue Buchungs-Instanz.
   * @param {object} data - Die Daten für die neue Buchung.
   * @param {string} data.date - Das Datum des Spiels.
   * @param {string} data.time - Die Uhrzeit des Spiels.
   * @param {string} data.pitchId - Die ID des Platzes.
   * @param {string} data.seasonId - Die ID der Saison.
   * @param {string} data.createdBy - Die UID des Erstellers.
   * @param {string|null} [data.homeTeamId=null] - Die ID des Heimteams.
   * @param {string|null} [data.awayTeamId=null] - Die ID des Auswärtsteams.
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

    // 2. Zuweisung der Eigenschaften
    this.date = date;
    this.time = time;
    this.pitchId = pitchId;
    this.seasonId = seasonId;
    this.createdBy = createdBy; // UID des Users, der den Slot erstellt/gebucht hat
    this.homeTeamId = homeTeamId;
    this.awayTeamId = awayTeamId;

    /**
     * @type {string}
     * Der Lebenszyklus einer Buchung:
     * 'available': Freier Slot, von Admin erstellt.
     * 'pending_away_confirm': Heimteam hat gebucht, wartet auf Gegner.
     * 'confirmed': Auswärtsteam hat bestätigt, Spiel ist fix.
     * 'denied': Auswärtsteam hat die Anfrage abgelehnt.
     * 'cancelled': Ein Team hat ein bereits bestätigtes Spiel storniert.
     * 'played': Spiel wurde gespielt.
     */
    this.status = 'available';

    // 3. Felder für den Ablehnungs-/Stornierungsprozess
    
    /** @type {string|null} */
    this.deniedByTeamId = null; // Team-ID, das die Anfrage abgelehnt hat.

    /** @type {Date|null} */
    this.deniedAt = null; // Zeitstempel der Ablehnung.

    /** @type {string|null} */
    this.cancelledByTeamId = null; // Team-ID, das das bestätigte Spiel storniert hat.

    /** @type {Date|null} */
    this.cancelledAt = null; // Zeitstempel der Stornierung.

    // Kompatibilitätsfeld für das Frontend
    this.isAvailable = !homeTeamId && !awayTeamId;
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
      cancelledByTeamId: this.cancelledByTeamId,
      cancelledAt: this.cancelledAt,
      // createdAt, updatedAt etc. werden vom Service gesetzt.
    };
  }
}

module.exports = Booking;