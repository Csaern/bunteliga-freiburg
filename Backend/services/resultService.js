const admin = require('firebase-admin');
const Result = require('../models/result');
const db = admin.firestore();
const resultsCollection = db.collection('results');
const teamsCollection = db.collection('teams');

/**
 * Erstellt ein Forfeit-Ergebnis (z.B. 3:0) als Strafe für ein Team.
 * Dieses Ergebnis ist automatisch bestätigt.
 * @param {object} forfeitData - Die Daten für das Straf-Ergebnis.
 * @param {string} forfeitData.seasonId - Die ID der Saison.
 * @param {string} forfeitData.winningTeamId - Die ID des Teams, das durch Forfeit gewinnt.
 * @param {string} forfeitData.losingTeamId - Die ID des Teams, das durch Forfeit verliert.
 * @param {string} forfeitData.bookingId - Die ID der zugehörigen Buchung.
 * @returns {object} Das erstellte Ergebnisdokument.
 */
async function createForfeitResult({ seasonId, winningTeamId, losingTeamId, bookingId }) {
  // 1. Team-Namen für die Denormalisierung abrufen
  const winningTeamDoc = await teamsCollection.doc(winningTeamId).get();
  const losingTeamDoc = await teamsCollection.doc(losingTeamId).get();

  if (!winningTeamDoc.exists || !losingTeamDoc.exists) {
    throw new Error('Eines der Teams für das Straf-Ergebnis konnte nicht gefunden werden.');
  }

  const winningTeamName = winningTeamDoc.data().name;
  const losingTeamName = losingTeamDoc.data().name;

  // 2. Das Result-Objekt erstellen
  const resultData = {
    homeTeamId: winningTeamId, // Konvention: Gewinner ist das "Heimteam"
    homeTeamName: winningTeamName,
    awayTeamId: losingTeamId,
    awayTeamName: losingTeamName,
    homeScore: 3, // Standard-Wertung für ein Forfeit
    awayScore: 0,
    seasonId: seasonId,
    reportedByTeamId: 'system_forfeit', // Vom System generiert
    reportedByUserId: 'system',
    bookingId: bookingId,
  };

  const newResult = new Result(resultData);
  const firestoreObject = newResult.toFirestoreObject();

  // 3. Ein Forfeit-Ergebnis ist immer sofort bestätigt
  firestoreObject.status = 'confirmed';
  firestoreObject.confirmedByTeamId = 'system_forfeit';
  firestoreObject.confirmedAt = admin.firestore.FieldValue.serverTimestamp();
  firestoreObject.createdAt = admin.firestore.FieldValue.serverTimestamp();

  const docRef = await resultsCollection.add(firestoreObject);
  return { id: docRef.id, ...firestoreObject };
}

// Hier können später weitere Funktionen hinzugefügt werden, z.B.
// - reportResult (von einem Team)
// - handleResultAction (bestätigen/ablehnen)
// - updateResult (von einem Admin)

module.exports = {
  createForfeitResult,
};