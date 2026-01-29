class User {
  /**
   * Erstellt eine neue Benutzer-Instanz für die Speicherung in Firestore.
   * @param {object} data - Die Daten für den neuen Benutzer.
   * @param {string} data.uid - Die Firebase Authentication UID. Erforderlich.
   * @param {string} data.email - Die E-Mail des Benutzers. Erforderlich.
   * @param {string|null} [data.displayName=null] - Der Anzeigename des Benutzers.
   * @param {string|null} [data.teamId=null] - Die ID des Teams, dem der Benutzer zugeordnet ist.
   * @param {boolean} [data.isAdmin=false] - Gibt an, ob der Benutzer Admin-Rechte hat.
   */
  constructor({
    uid,
    email,
    displayName = null,
    teamId = null,
    isAdmin = false,
    settings = {}
  }) {
    // 1. Validierung
    if (!uid || !email) {
      throw new Error('UID und E-Mail sind für einen Benutzer erforderlich.');
    }

    // 2. Zuweisung der Eigenschaften
    this.uid = uid;
    this.email = email;
    this.displayName = displayName || email.split('@')[0]; // Standard-Anzeigename aus E-Mail generieren
    this.teamId = teamId;
    this.isAdmin = isAdmin;

    // 3. Einstellungen initialisieren
    this.settings = {
      emailNotifications: {
        gameRequests: settings?.emailNotifications?.gameRequests ?? true,
        gameResults: settings?.emailNotifications?.gameResults ?? true,
        gameCancellations: settings?.emailNotifications?.gameCancellations ?? true,
      },
      ...settings
    };

    // 4. Ableitung der Rolle für einfache Berechtigungsprüfungen
    this.role = isAdmin ? 'admin' : (teamId ? 'team' : 'user');
  }

  /**
   * Konvertiert die Klasseninstanz in ein einfaches JavaScript-Objekt für Firestore.
   * @returns {object}
   */
  toFirestoreObject() {
    return {
      uid: this.uid,
      email: this.email,
      displayName: this.displayName,
      teamId: this.teamId,
      isAdmin: this.isAdmin,
      role: this.role,
      settings: this.settings,
      // createdAt und updatedAt werden vom Service gesetzt.
    };
  }
}

module.exports = User;