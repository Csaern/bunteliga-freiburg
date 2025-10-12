class News {
  /**
   * Erstellt einen neuen News-Artikel.
   * @param {object} data - Die Daten für den neuen Artikel.
   * @param {string} data.title - Die Überschrift des Artikels. Erforderlich.
   * @param {string} data.content - Der Inhalt des Artikels (kann HTML oder Markdown sein). Erforderlich.
   * @param {string} data.authorId - Die UID des Admins, der den Artikel schreibt. Erforderlich.
   * @param {string} data.authorName - Der Name des Admins (denormalisiert). Erforderlich.
   * @param {string|null} [data.imageUrl=null] - Eine optionale URL für ein Titelbild.
   * @param {string} [data.status='draft'] - Der Status des Artikels ('draft' oder 'published').
   * @param {Array<string>} [data.tags=[]] - Optionale Tags zur Kategorisierung (z.B. ['Saisonstart', 'Regeländerung']).
   */
  constructor({
    title,
    content,
    authorId,
    authorName,
    imageUrl = null,
    status = 'draft',
    tags = []
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
    this.imageUrl = imageUrl;
    this.status = status;
    this.tags = tags;
    this.publishedAt = null; // Wird gesetzt, wenn der Status auf 'published' wechselt.
  }

  toFirestoreObject() {
    return {
      title: this.title,
      content: this.content,
      authorId: this.authorId,
      authorName: this.authorName,
      imageUrl: this.imageUrl,
      status: this.status,
      tags: this.tags,
      publishedAt: this.publishedAt,
      // createdAt und updatedAt werden vom Service gesetzt.
    };
  }
}

module.exports = News;