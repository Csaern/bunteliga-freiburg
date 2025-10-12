const admin = require('firebase-admin');
const Pitch = require('../models/pitch');
const db = admin.firestore();
const pitchesCollection = db.collection('pitches');

async function createPitch(pitchData) {
  const newPitch = new Pitch(pitchData);
  const firestoreObject = newPitch.toFirestoreObject();

  firestoreObject.createdAt = admin.firestore.FieldValue.serverTimestamp();
  firestoreObject.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  const docRef = await pitchesCollection.add(firestoreObject);
  return { id: docRef.id, ...firestoreObject };
}

async function updatePitchImage(pitchId, imageUrl) {
  const pitchRef = pitchesCollection.doc(pitchId);
  await pitchRef.update({
    imageUrl: imageUrl,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  return { message: 'Bild des Platzes erfolgreich aktualisiert.', imageUrl: imageUrl };
}

module.exports = {
  createPitch,
  updatePitchImage,
};