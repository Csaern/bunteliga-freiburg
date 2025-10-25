const admin = require('firebase-admin');
const User = require('../models/user'); // Das neue Model importieren
const db = admin.firestore();
const teamsCollection = db.collection('teams');

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
    emailVerified: true, 
  });

  // 2. Custom Claims für Admin-Rolle und Team-ID setzen
  const claims = {};
  if (isAdmin) claims.admin = true;
  if (teamId) claims.teamId = teamId;
  if (Object.keys(claims).length > 0) {
      await admin.auth().setCustomUserClaims(userRecord.uid, claims);
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

  // 1. Custom Claims aktualisieren
  const user = await admin.auth().getUser(uid);
  const currentClaims = user.customClaims || {};
  
  const newClaims = { ...currentClaims, admin: !!isAdmin };

  if (teamId) {
      newClaims.teamId = teamId;
  } else {
      delete newClaims.teamId; // Wichtig: Claim entfernen, wenn kein Team zugewiesen ist
  }
  
  // Nur setzen, wenn sich die Claims geändert haben
  if (JSON.stringify(currentClaims) !== JSON.stringify(newClaims)) {
      await admin.auth().setCustomUserClaims(uid, newClaims);
  }

  // 2. Firestore-Dokument aktualisieren
  const userDocRef = db.collection('users').doc(uid);
  await userDocRef.update({
    teamId: teamId || null, // Stellt sicher, dass null statt "" gespeichert wird
    isAdmin: !!isAdmin,
    role: isAdmin ? 'admin' : (teamId ? 'team' : 'user'),
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

async function addCaptainToTeam(userId, teamId) {
  const teamRef = teamsCollection.doc(teamId);
  const user = await admin.auth().getUser(userId);

  // 1. Füge die User-ID zum 'captainIds'-Array im Team-Dokument hinzu
  await teamRef.update({
    captainIds: admin.firestore.FieldValue.arrayUnion(userId)
  });

  // 2. Setze den Custom Claim für den Benutzer, damit er Berechtigungen erhält
  await admin.auth().setCustomUserClaims(userId, { ...user.customClaims, teamId: teamId });

  return { message: `Benutzer ${user.email} wurde erfolgreich zum Kapitän von Team ${teamId} ernannt.` };
}

async function removeCaptainFromTeam(userId, teamId) {
  const teamRef = teamsCollection.doc(teamId);
  const user = await admin.auth().getUser(userId);

  // 1. Entferne die User-ID aus dem 'captainIds'-Array
  await teamRef.update({
    captainIds: admin.firestore.FieldValue.arrayRemove(userId)
  });

  // 2. Entferne den Custom Claim, um die Berechtigungen zu entziehen
  const { teamId: _, ...remainingClaims } = user.customClaims;
  await admin.auth().setCustomUserClaims(userId, remainingClaims);

  return { message: `Benutzer ${user.email} ist nicht länger Kapitän von Team ${teamId}.` };
}

/**
 * Ruft eine Liste aller Benutzer ab und reichert sie mit dem Team-Namen an.
 */
async function getAllUsers() {
    // 1. Alle Teams für ein schnelles Nachschlagen der Namen abrufen
    const teamsSnapshot = await teamsCollection.get();
    const teamsMap = new Map();
    teamsSnapshot.forEach(doc => {
        teamsMap.set(doc.id, doc.data().name);
    });

    // 2. Alle Benutzer aus Firebase Auth abrufen
    const listUsersResult = await admin.auth().listUsers(1000);
    
    // 3. Daten aus Auth mit dem aufgelösten Team-Namen anreichern
    const enrichedUsers = listUsersResult.users.map(userRecord => {
        const customClaims = userRecord.customClaims || {};
        const teamId = customClaims.teamId || null;

        return {
            uid: userRecord.uid,
            email: userRecord.email,
            displayName: userRecord.displayName,
            disabled: userRecord.disabled,
            isAdmin: customClaims.admin || false,
            teamId: teamId,
            teamName: teamId ? teamsMap.get(teamId) || null : null, // Team-Namen direkt hier auflösen
            customClaims: customClaims,
        };
    });

    return enrichedUsers;
}

/**
 * Aktualisiert die Rolle eines Benutzers durch Setzen von Custom Claims.
 * @param {string} uid - Die UID des Benutzers.
 * @param {object} roles - Ein Objekt mit den Rollen, z.B. { admin: true }
 */
async function updateUserRole(uid, roles) {
    const user = await admin.auth().getUser(uid);
    // Setze die neuen Claims, behalte aber bestehende bei (falls es andere gibt)
    await admin.auth().setCustomUserClaims(uid, { ...user.customClaims, ...roles });
    return { message: `Rollen für Benutzer ${user.email} erfolgreich aktualisiert.` };
}

/**
 * Deaktiviert oder reaktiviert einen Benutzer in Firebase Auth.
 * @param {string} uid - Die UID des Benutzers.
 * @param {boolean} disabled - true zum Deaktivieren, false zum Reaktivieren.
 */
async function setUserDisabledStatus(uid, disabled) {
    await admin.auth().updateUser(uid, { disabled });
    const status = disabled ? 'deaktiviert' : 'reaktiviert';
    return { message: `Benutzer wurde erfolgreich ${status}.` };
}

module.exports = {
  createUser,
  updateUser,
  deleteUser,
  addCaptainToTeam,
  removeCaptainFromTeam,
  getAllUsers,
  updateUserRole,
  setUserDisabledStatus, // NEU
};