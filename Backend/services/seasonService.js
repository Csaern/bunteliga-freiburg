// filepath: c:\Users\hansj\OneDrive\Dokumente\Bunte Liga HP\bunteliga-freiburg\Backend\services\seasonService.js
const admin = require('firebase-admin');
const Season = require('../models/season');

const db = admin.firestore();
const seasonsCollection = db.collection('seasons');
const teamsCollection = db.collection('teams');
const tableService = require('./tableService');

/**
 * Wandelt einen Datums-String (YYYY-MM-DD) sicher in ein Firestore Timestamp-Objekt um.
 */
const safeCreateTimestampFromString = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return null;
  const parts = dateString.split('T')[0].split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  const utcDate = new Date(Date.UTC(year, month, day));
  return admin.firestore.Timestamp.fromDate(utcDate);
};

async function getAllSeasons() {
  const snapshot = await seasonsCollection.orderBy('name', 'desc').get();
  if (snapshot.empty) return [];
  return snapshot.docs.map(doc => {
    const data = doc.data();

    // FINALE KORREKTUR: Robuste Prüfung, um den ".toDate is not a function"-Fehler zu beheben.
    // Diese Funktion prüft, ob das Feld ein gültiger Timestamp ist, bevor es konvertiert wird.
    const formattedData = {
      ...data,
      startDate: (data.startDate && typeof data.startDate.toDate === 'function') 
                   ? data.startDate.toDate().toISOString().split('T')[0] 
                   : null,
      endDate: (data.endDate && typeof data.endDate.toDate === 'function') 
                 ? data.endDate.toDate().toISOString().split('T')[0] 
                 : null,
      createdAt: (data.createdAt && typeof data.createdAt.toDate === 'function') 
                   ? data.createdAt.toDate().toISOString() 
                   : null,
      updatedAt: (data.updatedAt && typeof data.updatedAt.toDate === 'function') 
                   ? data.updatedAt.toDate().toISOString() 
                   : null,
    };
    return { id: doc.id, ...formattedData };
  });
}

async function createSeason(seasonData) {
  if (seasonData.teams && seasonData.teams.length > 0) {
    const teamPromises = seasonData.teams.map(team => teamsCollection.doc(team.id).get());
    const teamSnapshots = await Promise.all(teamPromises);
    const missingTeams = teamSnapshots.map((doc, i) => !doc.exists ? seasonData.teams[i].id : null).filter(Boolean);
    if (missingTeams.length > 0) {
      throw new Error(`Folgende Teams wurden nicht gefunden: ${missingTeams.join(', ')}`);
    }
  }

  const processedData = {
    ...seasonData,
    startDate: safeCreateTimestampFromString(seasonData.startDate),
    endDate: safeCreateTimestampFromString(seasonData.endDate),
  };

  const newSeason = new Season(processedData);
  const firestoreObject = newSeason.toFirestoreObject();
  
  firestoreObject.createdAt = admin.firestore.FieldValue.serverTimestamp();
  firestoreObject.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  const docRef = await seasonsCollection.add(firestoreObject);
  return { id: docRef.id, ...firestoreObject };
}

async function updateSeason(seasonId, updateData) {
    const seasonRef = seasonsCollection.doc(seasonId);
    const allowedUpdates = { ...updateData };
    delete allowedUpdates.id;
    delete allowedUpdates.createdBy;
    
    if (allowedUpdates.hasOwnProperty('startDate')) {
        allowedUpdates.startDate = safeCreateTimestampFromString(allowedUpdates.startDate);
    }
    if (allowedUpdates.hasOwnProperty('endDate')) {
        allowedUpdates.endDate = safeCreateTimestampFromString(allowedUpdates.endDate);
    }
    
    allowedUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    await seasonRef.update(allowedUpdates);
    return { message: 'Saison erfolgreich aktualisiert.' };
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
 * NEU: Sucht die aktuell als "active" markierte Saison.
 * Wirft einen Fehler, wenn keine gefunden wird.
 */
async function getActiveSeason() {
    const snapshot = await seasonsCollection.where('status', '==', 'active').limit(1).get();
    if (snapshot.empty) {
        throw new Error('Keine aktive Saison gefunden.');
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
}

/**
 * NEU: Implementierung der fehlenden deleteSeason-Funktion.
 * Löscht ein Saison-Dokument aus der Firestore-Datenbank.
 */
async function deleteSeason(seasonId) {
    const seasonRef = seasonsCollection.doc(seasonId);
    const doc = await seasonRef.get();
    if (!doc.exists) {
        throw new Error('Saison nicht gefunden.');
    }
    await seasonRef.delete();
    return { message: 'Saison erfolgreich gelöscht.' };
}

module.exports = {
    createSeason,
    getAllSeasons,
    getSeasonById,
    updateSeason,
    getActiveSeason,
    deleteSeason, // Dieser Export wird jetzt eine definierte Funktion finden
};