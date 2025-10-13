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
  const snapshot = await newsCollection
    .where('status', '==', 'published')
    .orderBy('publishedAt', 'desc')
    .get();
  if (snapshot.empty) return [];
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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