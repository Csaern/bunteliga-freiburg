class News {
  /**
   * Erstellt einen neuen News-Artikel.
   * @param {object} data - Die Daten für den neuen Artikel.
   * @param {string} data.title - Die Überschrift des Artikels.
   * @param {string} data.content - Der Inhalt des Artikels.
   * @param {string} data.authorId - Die UID des Admins.
   * @param {string} data.authorName - Der Name des Admins (denormalisiert).
   * @param {string} [data.status='draft'] - Der Status ('draft' oder 'published').
   */
  constructor({
    title,
    content,
    authorId,
    authorName,
    status = 'draft',
  }) {
    // 1. Validierung
    if (!title || !content || !authorId || !authorName) {
      throw new Error('Titel, Inhalt, Autor-ID und Autor-Name sind erforderlich.');
    }
    if (status !== 'draft' && status !== 'published') {
        throw new Error("Status muss entweder 'draft' oder 'published' sein.");
    }

    // 2. Zuweisung der Eigenschaften
    this.title = title;
    this.content = content;
    this.authorId = authorId;
    this.authorName = authorName;
    this.status = status;
    this.publishedAt = null; // Wird gesetzt, wenn der Status auf 'published' wechselt.
  }

  toFirestoreObject() {
    return {
      title: this.title,
      content: this.content,
      authorId: this.authorId,
      authorName: this.authorName,
      status: this.status,
      publishedAt: this.publishedAt,
    };
  }
}

module.exports = News;