const admin = require('firebase-admin');
const News = require('../models/news');
const db = admin.firestore();
const newsCollection = db.collection('news');

async function createNews(newsData) {
  const newArticle = new News(newsData);
  const firestoreObject = newArticle.toFirestoreObject();

  if (firestoreObject.status === 'published') {
    firestoreObject.publishedAt = admin.firestore.FieldValue.serverTimestamp();
  }
  firestoreObject.createdAt = admin.firestore.FieldValue.serverTimestamp();
  firestoreObject.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  const docRef = await newsCollection.add(firestoreObject);
  return { id: docRef.id, ...firestoreObject };
}

async function updateNews(newsId, updateData) {
  const newsRef = newsCollection.doc(newsId);
  const doc = await newsRef.get();
  if (!doc.exists) throw new Error('News-Artikel nicht gefunden.');

  const allowedUpdates = { ...updateData };
  delete allowedUpdates.id;
  delete allowedUpdates.authorId;
  delete allowedUpdates.authorName;

  // Wenn der Status von 'draft' zu 'published' wechselt, setze das Veröffentlichungsdatum
  if (doc.data().status === 'draft' && allowedUpdates.status === 'published') {
    allowedUpdates.publishedAt = admin.firestore.FieldValue.serverTimestamp();
  }
  allowedUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  await newsRef.update(allowedUpdates);
  return { message: 'News-Artikel erfolgreich aktualisiert.' };
}

async function deleteNews(newsId) {
  await newsCollection.doc(newsId).delete();
  return { message: 'News-Artikel erfolgreich gelöscht.' };
}

async function getPublishedNews() {
  try {
    // Zuerst alle veröffentlichten News abrufen
    const snapshot = await newsCollection
      .where('status', '==', 'published')
      .get();
    
    if (snapshot.empty) return [];
    
    // Daten konvertieren und nach publishedAt sortieren (falls vorhanden)
    const news = snapshot.docs.map(doc => {
      const data = doc.data();
      return { id: doc.id, ...data };
    });
    
    // Sortiere nach publishedAt (neueste zuerst), falls vorhanden
    news.sort((a, b) => {
      const dateA = a.publishedAt ? (a.publishedAt.toDate ? a.publishedAt.toDate().getTime() : new Date(a.publishedAt).getTime()) : 0;
      const dateB = b.publishedAt ? (b.publishedAt.toDate ? b.publishedAt.toDate().getTime() : new Date(b.publishedAt).getTime()) : 0;
      return dateB - dateA; // Neueste zuerst
    });
    
    return news;
  } catch (error) {
    console.error('Fehler beim Abrufen der veröffentlichten News:', error);
    // Fallback: Versuche ohne orderBy
    try {
      const snapshot = await newsCollection
        .where('status', '==', 'published')
        .get();
      if (snapshot.empty) return [];
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (fallbackError) {
      console.error('Fallback-Query fehlgeschlagen:', fallbackError);
      return [];
    }
  }
}

async function getAllNewsForAdmin() {
  const snapshot = await newsCollection.orderBy('createdAt', 'desc').get();
  if (snapshot.empty) return [];
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

module.exports = {
  createNews,
  updateNews,
  deleteNews,
  getPublishedNews,
  getAllNewsForAdmin,
};