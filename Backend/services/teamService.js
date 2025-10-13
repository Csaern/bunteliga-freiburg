const admin = require('firebase-admin');
const Team = require('../models/team');
const db = admin.firestore();
const teamsCollection = db.collection('teams');
const seasonsCollection = db.collection('seasons');
const resultsCollection = db.collection('results');

async function getTeamById(teamId) {
  const doc = await teamsCollection.doc(teamId).get();
  if (!doc.exists) {
    throw new Error('Team nicht gefunden.');
  }
  return { id: doc.id, ...doc.data() };
}

/**
 * Ruft alle Teams aus der Datenbank ab, sortiert nach Namen.
 */
async function getAllTeams() {
  const snapshot = await teamsCollection.orderBy('name').get();
  if (snapshot.empty) return [];
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function createTeam(teamData) {
  const newTeam = new Team(teamData);
  const firestoreObject = newTeam.toFirestoreObject();

  firestoreObject.createdAt = admin.firestore.FieldValue.serverTimestamp();
  firestoreObject.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  const docRef = await teamsCollection.add(firestoreObject);
  return { id: docRef.id, ...firestoreObject };
}

async function deleteTeam(teamId) {
  await teamsCollection.doc(teamId).delete();
  return { message: 'Team erfolgreich gelöscht.' };
}

async function updateTeamLogo(teamId, logoUrl) {
  const teamRef = db.collection('teams').doc(teamId);
  await teamRef.update({
    logoUrl: logoUrl,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  return { message: 'Logo erfolgreich aktualisiert.', logoUrl: logoUrl };
}

/**
 * Aktualisiert die Details eines Teams und propagiert Namensänderungen in alle Saisons und Ergebnisse.
 * @param {string} teamId - Die ID des zu aktualisierenden Teams.
 * @param {object} updates - Die zu aktualisierenden Daten (z.B. { name: 'Neuer Name' }).
 * @returns {object} Eine Erfolgsnachricht.
 */
async function updateTeamAndPropagateNameChange(teamId, updates) {
  const teamRef = teamsCollection.doc(teamId);
  const newName = updates.name;

  // 1. Das Haupt-Teamdokument aktualisieren
  const allowedUpdates = { ...updates };
  delete allowedUpdates.createdBy;
  delete allowedUpdates.captains;
  allowedUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  await teamRef.update(allowedUpdates);

  // 2. Wenn der Name geändert wurde, die Änderung in alle abhängigen Dokumente propagieren
  if (newName) {
    const batch = db.batch();

    // --- A) Saisons aktualisieren (bestehende Logik) ---
    const seasonsSnapshot = await seasonsCollection.get();
    seasonsSnapshot.forEach(doc => {
      const seasonData = doc.data();
      let needsUpdate = false;
      const updatedTeamsArray = seasonData.teams.map(team => {
        if (team.id === teamId && team.name !== newName) {
          needsUpdate = true;
          return { ...team, name: newName };
        }
        return team;
      });
      if (needsUpdate) {
        batch.update(doc.ref, { teams: updatedTeamsArray });
      }
    });

    // --- B) Ergebnisse aktualisieren (NEUE LOGIK) ---
    // Finde alle Ergebnisse, bei denen das Team Heim- oder Auswärtsteam war
    const resultsAsHomeQuery = resultsCollection.where('homeTeamId', '==', teamId).get();
    const resultsAsAwayQuery = resultsCollection.where('awayTeamId', '==', teamId).get();

    const [homeResultsSnapshot, awayResultsSnapshot] = await Promise.all([
      resultsAsHomeQuery,
      resultsAsAwayQuery
    ]);

    // Aktualisiere den 'homeTeamName'
    homeResultsSnapshot.forEach(doc => {
      batch.update(doc.ref, { homeTeamName: newName });
    });

    // Aktualisiere den 'awayTeamName'
    awayResultsSnapshot.forEach(doc => {
      batch.update(doc.ref, { awayTeamName: newName });
    });

    // 3. Führe alle gesammelten Updates (Saisons & Ergebnisse) auf einmal aus
    await batch.commit();
  }

  return { message: 'Team-Details erfolgreich aktualisiert und in allen Saisons und Ergebnissen synchronisiert.' };
}


module.exports = {
  createTeam,
  updateTeamAndPropagateNameChange,
  deleteTeam,
  updateTeamLogo,
  getTeamById, // Sicherstellen, dass die Funktion exportiert wird
  getAllTeams, // NEU
};
