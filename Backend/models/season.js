class Season {
  /**
   * Erstellt eine neue Saison-Instanz.
   * @param {object} data - Die Daten für die neue Saison.
   * @param {string} data.name - Der Name der Saison (z.B. "Saison 2025/26").
   * @param {Date} data.startDate - Das Startdatum der Saison.
   * @param {Date} data.endDate - Das Enddatum der Saison.
   * @param {string} data.createdBy - Die UID des Admins, der die Saison erstellt hat.
   * @param {Array<{id: string, name: string}>} [data.teams=[]] - Optional: Eine Liste der teilnehmenden Teams.
   * @param {string} [data.status='planning'] - Optional: Der Status der Saison (z.B. 'planning', 'active', 'finished').
   * @param {number} [data.maxDenials=3] - Optional: Maximale Anzahl an Ablehnungen.
   * @param {number} [data.cancellationDeadlineDays=3] - Optional: Tage vor dem Spiel für eine fristgerechte Stornierung.
   * @param {number} [data.forfeitWinScore=3] - Optional: Tore für das gewinnende Team.
   * @param {number} [data.forfeitLossScore=0] - Optional: Tore für das verlierende Team.
   * @param {string} [data.playMode='double_round_robin'] - Optional: Der Spielmodus (z.B. 'double_round_robin').
   * @param {number} [data.minGamesPlayed=0] - Optional: Minimale Anzahl an gespielten Spielen.
   * @param {number} [data.pointsForWin=3] - Optional: Punkte für einen Sieg.
   * @param {number} [data.pointsForDraw=1] - Optional: Punkte für ein Unentschieden.
   * @param {number} [data.pointsForLoss=0] - Optional: Punkte für eine Niederlage.
   * @param {Array<string>} [data.rankingCriteria=['points', 'goalDifference', 'goalsScored', 'headToHead']] - Optional: Kriterien zur Tabellen-Sortierung.
   * @param {string} [data.tieBreakingMode='playoff_game'] - Optional: Modus zur Entscheidung bei Punktgleichheit.
   * @param {Array<number>} [data.tieBreakerForPositions=[1]] - Optional: Positionen, für die ein Tie-Breaker gespielt wird.
   */
  constructor({ name, startDate, endDate, teams = [], status = 'planning', createdBy, maxDenials = 3, cancellationDeadlineDays = 3, forfeitWinScore = 3, forfeitLossScore = 0, playMode = 'double_round_robin', minGamesPlayed = 0, pointsForWin = 3, pointsForDraw = 1, pointsForLoss = 0, rankingCriteria = ['points', 'goalDifference', 'goalsScored', 'headToHead'], tieBreakingMode = 'playoff_game', tieBreakerForPositions = [1] }) {
    // 1. Validierung
    if (!name || !startDate || !endDate || !createdBy) {
      throw new Error('Name, Start-/Enddatum und Ersteller sind erforderlich.');
    }
    if (typeof maxDenials !== 'number' || maxDenials < 0) {
        throw new Error('Maximale Anzahl an Ablehnungen muss eine positive Zahl sein.');
    }
    if (!Array.isArray(teams)) {
        throw new Error('Teams muss ein Array sein.');
    }

    // 2. Eigenschaften zuweisen
    this.name = name;
    this.startDate = startDate; // KORREKTUR: Keine Konvertierung mehr hier
    this.endDate = endDate;     // KORREKTUR: Keine Konvertierung mehr hier
    this.teams = teams;
    this.status = status;
    this.createdBy = createdBy;
    this.maxDenials = maxDenials;
    this.cancellationDeadlineDays = cancellationDeadlineDays; 
    this.forfeitWinScore = forfeitWinScore; // NEU
    this.forfeitLossScore = forfeitLossScore; // NEU
    this.playMode = playMode;
    this.minGamesPlayed = minGamesPlayed;
    this.pointsForWin = pointsForWin;
    this.pointsForDraw = pointsForDraw;
    this.pointsForLoss = pointsForLoss;
    this.rankingCriteria = rankingCriteria;
    this.tieBreakingMode = tieBreakingMode;
    this.tieBreakerForPositions = tieBreakerForPositions;

    /**
     * @type {Array<{id: string, name: string, status: 'active' | 'inactive'}>}
     * Jedes Team bekommt bei der Erstellung automatisch den Status 'active'.
     */
    this.teams = teams.map(team => {
        if (!team.id || !team.name) {
            throw new Error('Jedes Team im Array muss eine ID und einen Namen haben.');
        }
        return {
            id: team.id,
            name: team.name,
            status: 'active'
        };
    });

    // 3. Erweiterte Eigenschaften mit Standardwerten
    this.isFinished = false;
    this.finishedAt = null;
    this.finishedBy = null;
    this.isCurrent = false;
    this.evaluated = false; // NEU: Wurde die Saison bereits abgerechnet?
    this.evaluatedAt = null;
    this.evaluatedBy = null;
    this.createdAt = null; // Wird im Service gesetzt
  }

  /**
   * Konvertiert die Klasseninstanz in ein einfaches JavaScript-Objekt.
   * Der Server-Timestamp wird im Service Layer hinzugefügt.
   * @returns {object} Ein für Firestore geeignetes Objekt.
   */
  toFirestoreObject() {
    return {
      name: this.name,
      startDate: this.startDate,
      endDate: this.endDate,
      teams: this.teams,
      status: this.status,
      createdBy: this.createdBy,
      maxDenials: this.maxDenials,
      cancellationDeadlineDays: this.cancellationDeadlineDays, 
      forfeitWinScore: this.forfeitWinScore, // NEU
      forfeitLossScore: this.forfeitLossScore, // NEU
      playMode: this.playMode,
      minGamesPlayed: this.minGamesPlayed,
      pointsForWin: this.pointsForWin,
      pointsForDraw: this.pointsForDraw,
      pointsForLoss: this.pointsForLoss,
      rankingCriteria: this.rankingCriteria,
      tieBreakingMode: this.tieBreakingMode,
      tieBreakerForPositions: this.tieBreakerForPositions,

      isFinished: this.isFinished,
      finishedAt: this.finishedAt,
      finishedBy: this.finishedBy,
      isCurrent: this.isCurrent,
      // createdAt wird im Service gesetzt, nicht hier
    };
  }
}

module.exports = Season;