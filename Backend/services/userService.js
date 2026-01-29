const admin = require('firebase-admin');
const User = require('../models/user');
const emailService = require('./emailService'); // Import email service
const db = admin.firestore();
const teamsCollection = db.collection('teams');

/**
 * Erstellt einen neuen Benutzer in Firebase Auth und einen passenden Eintrag in der Firestore 'users' Collection.
 * @param {object} userData - Enthält email, password, teamId, isAdmin.
 * @returns {object} Der neu erstellte Benutzer.
 */
async function createUser(userData) {
  const { email, password: providedPassword, teamId, isAdmin, displayName } = userData;

  // Wenn kein Passwort übergeben wird, generiere ein zufälliges
  const password = providedPassword || Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

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

  // 4. Einladungs-Email senden (Passwort-Reset-Link)
  try {
    // Generiere den Link
    const firebaseLink = await admin.auth().generatePasswordResetLink(email);
    const urlObj = new URL(firebaseLink);
    const params = urlObj.search;
    const websiteUrl = process.env.WEBSITE_URL || 'http://localhost:3000';
    // Append name to URL for display on the reset page
    const link = `${websiteUrl}/reset-password${params}&name=${encodeURIComponent(displayName || 'User')}`;

    // Sende die Email
    await emailService.sendEmail({
      to: email,
      subject: 'Willkommen bei der Bunten Liga Freiburg - Account einrichten',
      html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                <div style="background-color: #00A99D; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Willkommen!</h1>
                </div>
                <div style="padding: 30px 20px;">
                    <p style="font-size: 16px; margin-bottom: 20px;">Hallo ${displayName || 'User'},</p>
                    <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                        Ein Administrator hat einen Account für dich bei der Bunten Liga Freiburg erstellt.
                    </p>
                    <p style="font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
                        Bitte klicke auf den untenstehenden Button, um dein Passwort festzulegen und deinen Account zu aktivieren.
                    </p>
                    <div style="text-align: center; margin-bottom: 30px;">
                        <a href="${link}" style="background-color: #00A99D; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block;">Account einrichten</a>
                    </div>
                    <p style="font-size: 14px; color: #777; margin-bottom: 0;">
                        Falls der Button nicht funktioniert, nutze diesen Link:<br>
                        <a href="${link}" style="color: #00A99D;">${link}</a>
                    </p>
                </div>
                <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #888;">
                    &copy; ${new Date().getFullYear()} Bunte Liga Freiburg
                </div>
            </div>
        `
    });
  } catch (emailError) {
    console.error("Fehler beim Senden der Einladungs-Email:", emailError);
    // Wir werfen keinen Fehler hier, damit der User trotzdem erstellt bleibt.
  }

  return userDocData;
}

/**
 * Aktualisiert die Daten eines Benutzers in Firestore und seine Admin-Rolle (Custom Claim).
 * @param {string} uid - Die UID des zu aktualisierenden Benutzers.
 * @param {object} updates - Enthält teamId, isAdmin.
 */
async function updateUser(uid, updates) {
  const { teamId, isAdmin, displayName } = updates;

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

  const firestoreUpdates = {
    teamId: teamId || null,
    isAdmin: !!isAdmin,
    role: isAdmin ? 'admin' : (teamId ? 'team' : 'user'),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Wenn displayName aktualisiert werden soll
  if (displayName !== undefined) {
    firestoreUpdates.displayName = displayName;
    // Auch in Auth aktualisieren
    await admin.auth().updateUser(uid, { displayName: displayName });
  }

  // 2. Firestore-Dokument aktualisieren
  const userDocRef = db.collection('users').doc(uid);
  await userDocRef.update(firestoreUpdates);
}

/**
 * Löscht einen Benutzer vollständig aus Firebase Auth und Firestore.
 * @param {string} uid - Die UID des zu löschenden Benutzers.
 */
async function deleteUser(uid) {
  // 1. Benutzerdaten abrufen (für die E-Mail)
  try {
    const user = await admin.auth().getUser(uid);
    const email = user.email;

    // 2. Abschieds-Email senden
    await emailService.sendEmail({
      to: email,
      subject: 'Dein Account wurde gelöscht - Bunte Liga Freiburg',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
            <p>Hallo,</p>
            <p>dein Account bei der <strong>Bunten Liga Freiburg</strong> wurde soeben gelöscht.</p>
            <p>Alle deine personenbezogenen Daten wurden aus unserem System entfernt.</p>
            <p>Falls das ein Versehen war oder du Fragen hast, antworte bitte auf diese Email.</p>
            <br>
            <p>Beste Grüße,<br>Dein Bunte Liga Admin Team</p>
        </div>
      `
    });
  } catch (error) {
    console.error(`Fehler beim Senden der Lösch-Bestätigung an User ${uid}:`, error);
    // Wir machen trotzdem weiter mit der Löschung
  }

  // 3. Führe beide Löschoperationen parallel aus
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
 * Aktualisiert die personalisierten Einstellungen eines Benutzers.
 * @param {string} uid - Die UID des Benutzers.
 * @param {object} settings - Das neue Einstellungs-Objekt.
 */
async function updateUserSettings(uid, settings) {
  const userDocRef = db.collection('users').doc(uid);
  const userDoc = await userDocRef.get();

  if (!userDoc.exists) {
    throw new Error('Benutzer nicht gefunden.');
  }

  const currentSettings = userDoc.data().settings || {};

  // Merge settings to avoid overwriting everything
  const newSettings = {
    ...currentSettings,
    ...settings,
    emailNotifications: {
      ...(currentSettings.emailNotifications || {}),
      ...(settings.emailNotifications || {}),
    }
  };

  await userDocRef.update({
    settings: newSettings,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return newSettings;
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

/**
 * Sendet einen Link zum Zurücksetzen des Passworts an die angegebene E-Mail-Adresse.
 * @param {string} email - Die E-Mail-Adresse des Benutzers.
 */
async function requestPasswordReset(email) {
  try {
    // 1. Prüfen, ob der Benutzer existiert
    await admin.auth().getUserByEmail(email);

    // 2. Link generieren
    // Wir generieren den Link und passen ihn so an, dass er auf unsere eigene Reset-Seite zeigt
    const firebaseLink = await admin.auth().generatePasswordResetLink(email);

    // Extrahiere die Parameter (oobCode, apiKey, etc.) aus dem Firebase-Link
    const urlObj = new URL(firebaseLink);
    const params = urlObj.search;

    // Basis-URL für die Website - in der Produktion sollte dies aus einer Config kommen
    const websiteUrl = process.env.WEBSITE_URL || 'http://localhost:3000';
    const link = `${websiteUrl}/reset-password${params}`;

    // 3. E-Mail senden
    await emailService.sendEmail({
      to: email,
      subject: 'Passwort zurücksetzen - Bunte Liga Freiburg',
      html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #00A99D;">Passwort zurücksetzen</h2>
                    <p>Hallo,</p>
                    <p>wir haben eine Anfrage zum Zurücksetzen Ihres Passworts erhalten.</p>
                    <p>Klicken Sie auf den folgenden Link, um ein neues Passwort zu vergeben:</p>
                    <p style="text-align: center; margin: 30px 0;">
                        <a href="${link}" style="background-color: #00A99D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Passwort zurücksetzen</a>
                    </p>
                    <p>Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:</p>
                    <p style="word-break: break-all; color: #555;">${link}</p>
                    <br>
                    <p>Wenn Sie dies nicht angefordert haben, können Sie diese E-Mail ignorieren.</p>
                </div>
            `
    });

    return { message: 'Falls die E-Mail-Adresse existiert, wurde ein Link zum Zurücksetzen gesendet.' };
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      // Aus Sicherheitsgründen geben wir dieselbe Nachricht zurück
      return { message: 'Falls die E-Mail-Adresse existiert, wurde ein Link zum Zurücksetzen gesendet.' };
    }
    throw error;
  }
}

/**
 * Ändert das Passwort eines Benutzers (für eingeloggte Benutzer).
 * @param {string} uid - Die UID des Benutzers.
 * @param {string} oldPassword - Das aktuelle Passwort zur Verifizierung.
 * @param {string} newPassword - Das neue Passwort.
 */
async function changePassword(uid, oldPassword, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('Das neue Passwort muss mindestens 6 Zeichen lang sein.');
  }

  // 1. Benutzerdaten abrufen (für die E-Mail)
  const user = await admin.auth().getUser(uid);
  const email = user.email;

  // 2. Altes Passwort verifizieren (via Firebase Auth REST API)
  // Wir nutzen die REST API, da das Admin SDK keine Passwort-Verifizierung bietet
  const apiKey = "AIzaSyBY9qrrtw9Yc7vY-FdMUiZaVzLo-8FD3XA";
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password: oldPassword,
      returnSecureToken: true
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    if (errorData.error && (errorData.error.message === 'INVALID_PASSWORD' || errorData.error.message === 'INVALID_LOGIN_CREDENTIALS')) {
      throw new Error('Das aktuelle Passwort ist nicht korrekt.');
    }
    throw new Error('Fehler bei der Verifizierung des aktuellen Passworts.');
  }

  // 3. Passwort aktualisieren
  await admin.auth().updateUser(uid, { password: newPassword });
  return { message: 'Passwort erfolgreich geändert.' };
}

module.exports = {
  createUser,
  updateUser,
  deleteUser,
  addCaptainToTeam,
  removeCaptainFromTeam,
  updateUserSettings,
  getAllUsers,
  updateUserRole,
  setUserDisabledStatus,
  requestPasswordReset, // NEU
  changePassword, // NEU
};