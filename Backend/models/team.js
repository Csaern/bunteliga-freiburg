class Team {
  /**
   * Erstellt eine neue Team-Instanz.
   * @param {object} data - Die Daten für das neue Team.
   * @param {string} data.name - Der Name des Teams. Erforderlich.
   * @param {string} data.createdBy - Die UID des Benutzers, der das Team erstellt. Erforderlich.
   * @param {number|null} [data.foundedYear=null] - Das Gründungsjahr des Teams.
   * @param {string} [data.description=''] - Eine kurze Beschreibung des Teams.
   * @param {string} [data.contactPerson=''] - Die Hauptkontaktperson.
   * @param {string} [data.contactEmail=''] - Die Kontakt-E-Mail-Adresse.
   * @param {string} [data.contactPhone=''] - Die Kontakt-Telefonnummer.
   * @param {string} [data.website=''] - Die Webseite des Teams.
   * @param {string|null} [data.logoUrl=null] - Die URL zum Logo des Teams.
   * @param {string} [data.logoColor='#666666'] - Eine Fallback-Farbe für das Logo.
   * @param {object} [data.socialMedia={}] - Social-Media-Links.
   */
  constructor({
    name,
    createdBy,
    foundedYear = null,
    description = '',
    contactPerson = '',
    contactEmail = '',
    contactPhone = '',
    website = '',
    logoUrl = null,
    logoColor = '#666666',
    socialMedia = {}
  }) {
    // 1. Validierung der Pflichtfelder
    if (!name || !createdBy) {
      throw new Error('Teamname und Ersteller-ID sind erforderlich.');
    }

    // 2. Zuweisung der Eigenschaften
    this.name = name;
    this.createdBy = createdBy;
    this.foundedYear = foundedYear;
    this.description = description;
    this.contactPerson = contactPerson;
    this.contactEmail = contactEmail;
    this.contactPhone = contactPhone;
    this.website = website;
    this.logoUrl = logoUrl;
    this.logoUrlLight = null; // NEU: Logo für Light Mode
    this.logoColor = logoColor;

    // 3. Verschachtelte Objekte mit Standardwerten behandeln
    this.socialMedia = {
      facebook: socialMedia.facebook || '',
      instagram: socialMedia.instagram || '',
      twitter: socialMedia.twitter || ''
    };

    // 4. Strukturelle Eigenschaften hinzufügen
    // Der Ersteller wird automatisch zum ersten Kapitän des Teams.
    this.captainIds = [createdBy];
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
      foundedYear: this.foundedYear,
      description: this.description,
      contactPerson: this.contactPerson,
      contactEmail: this.contactEmail,
      contactPhone: this.contactPhone,
      website: this.website,
      logoUrl: this.logoUrl,
      logoUrlLight: this.logoUrlLight || null, // NEU
      logoColor: this.logoColor,
      socialMedia: this.socialMedia,
      captainIds: this.captainIds,
      // Felder wie createdAt und updatedAt werden vom Service mit serverTimestamp() hinzugefügt.
    };
  }
}

module.exports = Team;