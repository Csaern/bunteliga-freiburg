// filepath: c:\Users\hansj\OneDrive\Dokumente\Bunte Liga HP\bunteliga-freiburg\Backend\services\seasonService.js
const admin = require('firebase-admin');
const Season = require('../models/season');

const db = admin.firestore();
const seasonsCollection = db.collection('seasons');
const teamsCollection = db.collection('teams'); // Referenz zur Teams-Collection

/**
 * Erstellt eine neue Saison in der Datenbank. Die Liste der Teams wird hier final festgelegt.
 * @param {object} seasonData - Daten aus der Route (z.B. { year, name, createdBy, teams: [{id, name}] }).
 * @returns {object} Das erstellte Saison-Dokument.
 */
async function createSeason(seasonData) {
  // Team-Existenzprüfung
  if (seasonData.teams && seasonData.teams.length > 0) {
    const teamPromises = seasonData.teams.map(team => teamsCollection.doc(team.id).get());
    const teamSnapshots = await Promise.all(teamPromises);

    const missingTeams = [];
    teamSnapshots.forEach((doc, index) => {
      if (!doc.exists) {
        missingTeams.push(seasonData.teams[index].id);
      }
    });

    if (missingTeams.length > 0) {
      throw new Error(`Folgende Teams wurden nicht in der Datenbank gefunden: ${missingTeams.join(', ')}`);
    }
  }

  const newSeason = new Season(seasonData);
  const firestoreObject = newSeason.toFirestoreObject();
  
  firestoreObject.createdAt = admin.firestore.FieldValue.serverTimestamp();
  firestoreObject.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  const docRef = await seasonsCollection.add(firestoreObject);
  
  console.log(`Saison erfolgreich erstellt mit ID: ${docRef.id}`);
  return { id: docRef.id, ...firestoreObject };
}

/**
 * Ändert den Status eines Teams innerhalb einer Saison (z.B. von 'active' zu 'inactive').
 * @param {string} seasonId - Die ID der Saison.
 * @param {string} teamId - Die ID des Teams, dessen Status geändert werden soll.
 * @param {'active' | 'inactive'} newStatus - Der neue Status des Teams.
 * @returns {object} Eine Erfolgsnachricht.
 */
async function updateTeamStatusInSection(seasonId, teamId, newStatus) {
  const seasonRef = seasonsCollection.doc(seasonId);
  const seasonDoc = await seasonRef.get();

  if (!seasonDoc.exists) {
    throw new Error('Saison nicht gefunden.');
  }

  const seasonData = seasonDoc.data();
  const teamIndex = seasonData.teams.findIndex(team => team.id === teamId);

  if (teamIndex === -1) {
    throw new Error('Team in dieser Saison nicht gefunden.');
  }

  const updatedTeams = [...seasonData.teams];
  updatedTeams[teamIndex].status = newStatus;

  await seasonRef.update({
    teams: updatedTeams,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { message: `Status für Team ${teamId} erfolgreich auf ${newStatus} gesetzt.` };
}

/**
 * Beendet eine Saison administrativ.
 * @param {string} seasonId - Die ID der Saison, die beendet werden soll.
 * @param {string} adminUid - Die UID des Admins, der die Aktion ausführt.
 * @returns {object} Eine Erfolgsnachricht.
 */
async function finishSeason(seasonId, adminUid) {
  const seasonRef = seasonsCollection.doc(seasonId);

  const updates = {
    isFinished: true,
    finishedBy: adminUid,
    finishedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await seasonRef.update(updates);

  return { message: `Saison ${seasonId} erfolgreich beendet.` };
}


// Exportiere nur die benötigten Funktionen. 'addTeamToSeason' wurde entfernt.
module.exports = {
  createSeason,
  updateTeamStatusInSection,
  finishSeason,
};