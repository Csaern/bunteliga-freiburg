class Pitch {
  /**
   * Erstellt eine neue Platz-Instanz.
   * @param {object} data - Die Daten für den neuen Platz.
   * @param {string} data.name - Der Name des Platzes.
   * @param {string} data.createdBy - Die UID des Erstellers.
   * @param {string|null} [data.teamId=null] - Die ID des zugeordneten Teams.
   * @param {boolean} [data.isVerified=false] - Gibt an, ob der Platz offiziell ist.
   * @param {string|null} [data.imageUrl=null] - Die URL zum Bild des Platzes.
   * @param {string} [data.address=''] - Die Adresse des Platzes.
   * @param {string} [data.type=''] - Die Art des Platzes.
   * @param {string} [data.notes=''] - Besondere Hinweise.
   */
  constructor({
    name,
    createdBy,
    teamId = null,
    isVerified = false,
    imageUrl = null,
    address = '',
    type = '',
    notes = ''
  }) {
    // 1. Validierung
    if (!name || !createdBy) {
      throw new Error('Name und Ersteller-ID sind für einen Platz erforderlich.');
    }
    if (typeof isVerified !== 'boolean') {
        throw new Error('isVerified muss ein Boolean (true/false) sein.');
    }

    // 2. Zuweisung der Eigenschaften
    this.name = name;
    this.createdBy = createdBy;
    this.teamId = teamId;
    this.isVerified = isVerified;
    this.imageUrl = imageUrl; // Hinzugefügt
    this.address = address;
    this.type = type;
    this.notes = notes;
  }

  /**
   * Konvertiert die Klasseninstanz in ein einfaches JavaScript-Objekt,
   * das sicher in Firestore gespeichert werden kann.
   * @returns {object} Ein für Firestore geeignetes Objekt.
   */
  toFirestoreObject() {
    return {
      name: this.name,
      createdBy: this.createdBy,
      teamId: this.teamId,
      isVerified: this.isVerified,
      imageUrl: this.imageUrl, // Hinzugefügt
      address: this.address,
      type: this.type,
      notes: this.notes,
      // createdAt und updatedAt werden vom Service mit serverTimestamp() hinzugefügt.
    };
  }
}

module.exports = Pitch;