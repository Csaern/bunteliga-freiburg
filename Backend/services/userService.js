const admin = require('firebase-admin');
const User = require('../models/user'); // Das neue Model importieren
const db = admin.firestore();

/**
 * Erstellt einen neuen Benutzer in Firebase Auth und einen passenden Eintrag in der Firestore 'users' Collection.
 * @param {object} userData - Enthält email, password, teamId, isAdmin.
 * @returns {object} Der neu erstellte Benutzer.
 */
async function createUser(userData) {
  const { email, password, teamId, isAdmin, displayName } = userData;

  // 1. Benutzer in Firebase Authentication erstellen
  const userRecord = await admin.auth().createUser({
    email: email,
    password: password,
    displayName: displayName,
    emailVerified: true, // Wir können annehmen, dass der Admin die E-Mail verifiziert hat
  });

  // 2. Custom Claim für Admin-Rolle setzen (falls zutreffend)
  if (isAdmin) {
    await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
  }

  // 3. Benutzerdokument in Firestore mit dem Model erstellen
  const newUser = new User({
    uid: userRecord.uid,
    email: email,
    displayName: displayName,
    teamId: teamId,
    isAdmin: isAdmin,
  });
  const userDocData = newUser.toFirestoreObject();
  userDocData.createdAt = admin.firestore.FieldValue.serverTimestamp();

  await db.collection('users').doc(userRecord.uid).set(userDocData);

  return userDocData;
}

/**
 * Aktualisiert die Daten eines Benutzers in Firestore und seine Admin-Rolle (Custom Claim).
 * @param {string} uid - Die UID des zu aktualisierenden Benutzers.
 * @param {object} updates - Enthält teamId, isAdmin.
 */
async function updateUser(uid, updates) {
  const { teamId, isAdmin } = updates;

  // 1. Custom Claim aktualisieren, falls sich die Admin-Rolle ändert
  const currentUserClaims = (await admin.auth().getUser(uid)).customClaims;
  if (isAdmin && !currentUserClaims?.admin) {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
  } else if (!isAdmin && currentUserClaims?.admin) {
    await admin.auth().setCustomUserClaims(uid, { admin: false }); // Oder {} zum Entfernen
  }

  // 2. Firestore-Dokument aktualisieren
  const userDocRef = db.collection('users').doc(uid);
  await userDocRef.update({
    teamId: teamId,
    isAdmin: isAdmin,
    role: isAdmin ? 'admin' : 'team',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Löscht einen Benutzer vollständig aus Firebase Auth und Firestore.
 * @param {string} uid - Die UID des zu löschenden Benutzers.
 */
async function deleteUser(uid) {
  // Führe beide Löschoperationen parallel aus
  await Promise.all([
    admin.auth().deleteUser(uid),
    db.collection('users').doc(uid).delete()
  ]);
}

module.exports = {
  createUser,
  updateUser,
  deleteUser,
};