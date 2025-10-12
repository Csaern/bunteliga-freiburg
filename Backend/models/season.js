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
   */
  constructor({ name, startDate, endDate, teams = [], status = 'planning', createdBy, maxDenials = 3 }) {
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
    this.startDate = new Date(startDate);
    this.endDate = new Date(endDate);
    this.teams = teams;
    this.status = status;
    this.createdBy = createdBy;
    this.maxDenials = maxDenials;

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
    this.createdAt = new Date();
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
      isFinished: this.isFinished,
      finishedAt: this.finishedAt,
      finishedBy: this.finishedBy,
      isCurrent: this.isCurrent,
      createdAt: this.createdAt,
    };
  }
}

module.exports = Season;