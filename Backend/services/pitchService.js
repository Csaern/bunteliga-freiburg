const admin = require('firebase-admin');
const Pitch = require('../models/pitch');
const db = admin.firestore();
const pitchesCollection = db.collection('pitches');

/**
 * Interne Helper-Funktion, die einen Google Maps Link zu einem Platz-Objekt hinzufügt.
 * @param {object} pitchData - Das rohe Platz-Objekt aus Firestore.
 * @returns {object} Das Platz-Objekt mit dem zusätzlichen 'googleMapsLink' Feld.
 */
const _addGoogleMapsLink = (pitchData) => {
  if (!pitchData || !pitchData.address) {
    return { ...pitchData, googleMapsLink: null };
  }
  // Kodiert die Adresse sicher für die Verwendung in einer URL
  const encodedAddress = encodeURIComponent(pitchData.address);
  const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  return { ...pitchData, googleMapsLink };
};

async function createPitch(pitchData, user) {
  // Ein Benutzer MUSS einem Team angehören, um einen Platz zu erstellen.
  if (!user.teamId) {
    throw new Error('Du musst einem Team angehören, um einen Platz zu erstellen.');
  }
  // Wir erzwingen die teamId aus dem Token des Benutzers für Sicherheit.
  // Ein neu erstellter Platz ist niemals sofort verifiziert.
  const newPitchData = {
    ...pitchData,
    teamId: user.teamId,
    isVerified: false,
    createdBy: user.uid,
  };

  const newPitch = new Pitch(newPitchData);
  const firestoreObject = newPitch.toFirestoreObject();
  firestoreObject.createdAt = admin.firestore.FieldValue.serverTimestamp();
  const docRef = await pitchesCollection.add(firestoreObject);
  return _addGoogleMapsLink({ id: docRef.id, ...firestoreObject });
}

async function updatePitchImage(pitchId, imageUrl) {
  const pitchRef = pitchesCollection.doc(pitchId);
  await pitchRef.update({
    imageUrl: imageUrl,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  return { message: 'Bild des Platzes erfolgreich aktualisiert.', imageUrl: imageUrl };
}

async function getVerifiedPitches() {
  const snapshot = await pitchesCollection
    .where('isVerified', '==', true)
    .orderBy('name')
    .get();
  if (snapshot.empty) return [];
  // Füge den Link zu jedem Platz in der Liste hinzu
  return snapshot.docs.map(doc => _addGoogleMapsLink({ id: doc.id, ...doc.data() }));
}

/**
 * Ruft alle Plätze aus der Datenbank ab.
 */
async function getAllPitches() {
  const snapshot = await pitchesCollection.orderBy('name').get();
  if (snapshot.empty) return [];
  // Füge den Link zu jedem Platz in der Liste hinzu
  return snapshot.docs.map(doc => _addGoogleMapsLink({ id: doc.id, ...doc.data() }));
}

/**
 * Ruft einen einzelnen Platz anhand seiner ID ab.
 */
async function getPitchById(pitchId) {
  const doc = await pitchesCollection.doc(pitchId).get();
  if (!doc.exists) {
    throw new Error('Platz nicht gefunden.');
  }
  // Füge den Link zum einzelnen Platz-Objekt hinzu
  return _addGoogleMapsLink({ id: doc.id, ...doc.data() });
}

/**
 * Aktualisiert die Daten eines Platzes.
 */
async function updatePitch(pitchId, updateData) {
  const pitchRef = pitchesCollection.doc(pitchId);
  const allowedUpdates = { ...updateData };
  delete allowedUpdates.id;
  delete allowedUpdates.createdBy;

  allowedUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  await pitchRef.update(allowedUpdates);
  return { message: 'Platz erfolgreich aktualisiert.' };
}

/**
 * Löscht einen Platz aus der Datenbank.
 */
async function deletePitch(pitchId) {
  await pitchesCollection.doc(pitchId).delete();
  return { message: 'Platz erfolgreich gelöscht.' };
}

/**
 * NEU: Ruft alle Plätze ab, die einem bestimmten Team gehören.
 * @param {string} teamId - Die ID des Teams.
 */
async function getPitchesForTeam(teamId) {
  if (!teamId) {
    return []; // Wenn ein Benutzer aus irgendeinem Grund keine teamId hat, leeres Array zurückgeben.
  }
  const snapshot = await pitchesCollection.where('teamId', '==', teamId).orderBy('name').get();
  if (snapshot.empty) return [];
  return snapshot.docs.map(doc => _addGoogleMapsLink({ id: doc.id, ...doc.data() }));
}

module.exports = {
  createPitch,
  updatePitchImage,
  getVerifiedPitches,
  getAllPitches,
  getPitchById,
  updatePitch,
  deletePitch,
  getPitchesForTeam, // NEU
};