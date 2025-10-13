// filepath: c:\Users\hansj\OneDrive\Dokumente\Bunte Liga HP\bunteliga-freiburg\Backend\services\seasonService.js
const admin = require('firebase-admin');
const Season = require('../models/season');

const db = admin.firestore();
const seasonsCollection = db.collection('seasons');
const teamsCollection = db.collection('teams'); // Referenz zur Teams-Collection
const tableService = require('./tableService');

/**
 * Ruft ALLE Saisons aus der Datenbank ab, sortiert nach Erstellungsdatum.
 */
async function getAllSeasons() {
  const snapshot = await seasonsCollection.orderBy('createdAt', 'desc').get();
  if (snapshot.empty) return [];
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Ruft eine einzelne Saison anhand ihrer ID ab.
 */
async function getSeasonById(seasonId) {
  const doc = await seasonsCollection.doc(seasonId).get();
  if (!doc.exists) throw new Error('Saison nicht gefunden.');
  return { id: doc.id, ...doc.data() };
}

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
 * Ruft die aktuell aktive Saison ab.
 * @returns {Promise<object|null>} Das Saison-Objekt oder null, wenn keine aktiv ist.
 */
async function getActiveSeason() {
  const snapshot = await seasonsCollection
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null; // Es ist kein Fehler, wenn keine Saison aktiv ist, sondern ein valider Zustand.
  }

  const seasonDoc = snapshot.docs[0];
  return { id: seasonDoc.id, ...seasonDoc.data() };
}

/**
 * Ruft die Teilnehmer (Teams) einer bestimmten Saison ab.
 * @param {string} seasonId - Die ID der Saison.
 * @returns {Promise<Array<object>>} Ein Array der Team-Objekte, die an der Saison teilnehmen.
 */
async function getTeamsBySeason(seasonId) {
  const seasonDoc = await seasonsCollection.doc(seasonId).get();
  if (!seasonDoc.exists) {
    throw new Error('Saison nicht gefunden.');
  }
  // Das 'teams'-Array ist direkt im Saison-Dokument gespeichert.
  return seasonDoc.data().teams || [];
}

async function finishSeason(seasonId, adminUid) {
  const seasonRef = seasonsCollection.doc(seasonId);
  const seasonDoc = await seasonRef.get();

  if (!seasonDoc.exists) throw new Error('Saison nicht gefunden.');
  if (seasonDoc.data().isFinished) throw new Error('Diese Saison wurde bereits beendet.');

  // 1. Berechne die FINALE Tabelle, indem die Regeln angewendet werden
  const finalTable = await tableService.calculateTable(seasonId, true);

  // 2. TODO: Implementiere die Tie-Breaker-Logik
  // Hier würde man prüfen, ob Teams auf den in 'tieBreakerForPositions' definierten Plätzen
  // punktgleich sind und entsprechend der 'tieBreakingMode'-Regel reagieren
  // (z.B. neue Playoff-Spiele in 'bookings' erstellen).
  // Fürs Erste fahren wir ohne diese Prüfung fort.

  // 3. Speichere den finalen Zustand in der Datenbank
  await seasonRef.update({
    status: 'finished',
    isFinished: true,
    finishedAt: admin.firestore.FieldValue.serverTimestamp(),
    finishedBy: adminUid,
    finalTable: finalTable, // Speichere die berechnete Tabelle direkt im Saison-Dokument
  });

  return { message: 'Saison erfolgreich beendet.', finalTable };
}

/**
 * Aktualisiert die Daten einer bestehenden Saison.
 * @param {string} seasonId - Die ID der Saison, die aktualisiert werden soll.
 * @param {object} updateData - Die zu aktualisierenden Daten.
 * @returns {object} Eine Erfolgsnachricht.
 */
async function updateSeason(seasonId, updateData) {
    const seasonRef = seasonsCollection.doc(seasonId);
    const allowedUpdates = { ...updateData };
    delete allowedUpdates.id;
    delete allowedUpdates.createdBy;
    
    allowedUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await seasonRef.update(allowedUpdates);
    return { message: 'Saison erfolgreich aktualisiert.' };
}

// Exportiere nur die benötigten Funktionen. 'addTeamToSeason' wurde entfernt.
module.exports = {
  createSeason,
  updateSeason,
  getActiveSeason,
  finishSeason,
  getTeamsBySeason,
  getAllSeasons, // NEU
  getSeasonById, // NEU
};