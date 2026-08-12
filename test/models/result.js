class Result {
  /**
   * Erstellt eine neue Ergebnis-Instanz.
   * @param {object} data - Die Daten für das neue Ergebnis.
   * @param {string} data.homeTeamId - Die ID des Heimteams.
   * @param {string} data.homeTeamName - Der Name des Heimteams zum Zeitpunkt des Spiels.
   * @param {string} data.awayTeamId - Die ID des Auswärtsteams.
   * @param {string} data.awayTeamName - Der Name des Auswärtsteams zum Zeitpunkt des Spiels.
   * @param {number} data.homeScore - Die Tore des Heimteams.
   * @param {number} data.awayScore - Die Tore des Auswärtsteams.
   * @param {string} data.seasonId - Die ID der Saison.
   * @param {string} data.reportedByTeamId - Die ID des Teams, das das Ergebnis meldet.
   * @param {string} data.reportedByUserId - Die UID des Benutzers, der das Ergebnis meldet.
   * @param {string|null} [data.bookingId=null] - Optionale ID der zugehörigen Spielbuchung.
   * @param {string|null} [data.date=null] - Datum des Spiels (ISO String oder Timestamp).
   * @param {string|null} [data.location=null] - Ort des Spiels.
   */
  constructor({
    homeTeamId,
    homeTeamName,
    awayTeamId,
    awayTeamName,
    homeScore,
    awayScore,
    seasonId,
    reportedByTeamId,
    reportedByUserId,
    bookingId = null,
    date = null,
    location = null,
  }) {
    // 1. Validierung
    if (!homeTeamId || !homeTeamName || !awayTeamId || !awayTeamName || !seasonId || !reportedByTeamId || !reportedByUserId) {
      throw new Error('Team-IDs, Team-Namen, Saison-ID und meldendes Team/Benutzer sind erforderlich.');
    }
    if (homeScore === undefined || homeScore === null || awayScore === undefined || awayScore === null) {
      throw new Error('Ein Ergebnis (Tore) ist für beide Teams erforderlich.');
    }

    if (!bookingId && (!date || !location)) {
      throw new Error('Wenn keine Buchung verknüpft ist, sind Datum und Ort erforderlich.');
    }

    // 2. Zuweisung der Eigenschaften
    this.homeTeamId = homeTeamId;
    this.homeTeamName = homeTeamName; // Denormalisierter Name
    this.awayTeamId = awayTeamId;
    this.awayTeamName = awayTeamName; // Denormalisierter Name
    this.homeScore = parseInt(homeScore, 10);
    this.awayScore = parseInt(awayScore, 10);
    this.seasonId = seasonId;
    this.reportedByTeamId = reportedByTeamId;
    this.reportedByUserId = reportedByUserId;
    this.bookingId = bookingId;
    this.date = date; // NEU
    this.location = location; // NEU

    /**
     * @type {string}
     * Der Lebenszyklus eines Ergebnisses:
     * 'pending': Ein Team hat gemeldet, wartet auf Bestätigung.
     * 'confirmed': Gegner hat bestätigt. Zählt zur Tabelle.
     * 'disputed': Gegner hat abgelehnt. Admin-Intervention nötig.
     */
    this.status = 'pending';

    // 3. Felder für den Bestätigungs-/Ablehnungsprozess
    this.confirmedByTeamId = null;
    this.confirmedByUserId = null;
    this.confirmedAt = null;

    // Felder für Ablehnung / Disput
    this.rejectedByTeamId = null;
    this.rejectedByUserId = null;
    this.rejectedAt = null;
    this.rejectionReason = null; // NEU: Grund für die Ablehnung
  }

  /**
   * Konvertiert die Klasseninstanz in ein einfaches JavaScript-Objekt für Firestore.
   * @returns {object}
   */
  toFirestoreObject() {
    return {
      homeTeamId: this.homeTeamId,
      homeTeamName: this.homeTeamName, // Hinzugefügt
      awayTeamId: this.awayTeamId,
      awayTeamName: this.awayTeamName, // Hinzugefügt
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      seasonId: this.seasonId,
      reportedByTeamId: this.reportedByTeamId,
      reportedByUserId: this.reportedByUserId,
      bookingId: this.bookingId,
      date: this.date, // NEU
      location: this.location, // NEU
      status: this.status,
      confirmedByTeamId: this.confirmedByTeamId,
      confirmedByUserId: this.confirmedByUserId,
      confirmedAt: this.confirmedAt,
      rejectedByTeamId: this.rejectedByTeamId,
      rejectedByUserId: this.rejectedByUserId,
      rejectedAt: this.rejectedAt,
      rejectionReason: this.rejectionReason, // NEU
      // reportedAt, createdAt, updatedAt werden vom Service gesetzt.
    };
  }
}

module.exports = Result;