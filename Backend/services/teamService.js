const admin = require('firebase-admin');
const db = admin.firestore();
const teamsCollection = db.collection('teams');
const seasonsCollection = db.collection('seasons');
const resultsCollection = db.collection('results');
const bookingsCollection = db.collection('bookings');
const Team = require('../models/team');
const seasonService = require('./seasonService');
const bookingService = require('./bookingService');

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

/**
 * KORREKTUR: Dies ist jetzt die einzige Update-Funktion.
 * Sie aktualisiert die Team-Details und propagiert Namensänderungen in Saisons, Ergebnisse UND Buchungen.
 * @param {string} teamId - Die ID des zu aktualisierenden Teams.
 * @param {object} updates - Die zu aktualisierenden Daten.
 * @returns {object} Eine Erfolgsnachricht.
 */
async function updateTeam(teamId, updates) {
  const teamRef = teamsCollection.doc(teamId);
  const docBefore = await teamRef.get();
  if (!docBefore.exists) {
    throw new Error('Team nicht gefunden.');
  }
  const oldName = docBefore.data().name;
  const newName = updates.name;

  // 1. Das Haupt-Teamdokument aktualisieren
  const allowedUpdates = { ...updates };
  delete allowedUpdates.createdBy;
  delete allowedUpdates.captains;
  allowedUpdates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
  await teamRef.update(allowedUpdates);

  // 2. Wenn der Name geändert wurde, die Änderung in alle abhängigen Dokumente propagieren
  if (newName && newName !== oldName) {
    const batch = db.batch();

    // --- A) Saisons aktualisieren ---
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

    // --- B) Ergebnisse aktualisieren ---
    const resultsAsHomeQuery = resultsCollection.where('homeTeamId', '==', teamId).get();
    const resultsAsAwayQuery = resultsCollection.where('awayTeamId', '==', teamId).get();
    const [homeResultsSnapshot, awayResultsSnapshot] = await Promise.all([resultsAsHomeQuery, resultsAsAwayQuery]);
    homeResultsSnapshot.forEach(doc => batch.update(doc.ref, { homeTeamName: newName }));
    awayResultsSnapshot.forEach(doc => batch.update(doc.ref, { awayTeamName: newName }));

    // --- C) Buchungen aktualisieren (NEUE LOGIK) ---
    const bookingsQuery = await bookingsCollection.where('teamId', '==', teamId).get();
    bookingsQuery.forEach(doc => {
        batch.update(doc.ref, { teamName: newName });
    });

    // 3. Führe alle gesammelten Updates auf einmal aus
    await batch.commit();
  }

  // KORREKTUR: Das vollständige, aktualisierte Dokument abrufen und zurückgeben
  const updatedDoc = await teamRef.get();
  return { id: updatedDoc.id, ...updatedDoc.data() };
}


/**
 * Aktualisiert nur den Logo-Pfad eines Teams und gibt das vollständige, aktualisierte Team-Objekt zurück.
 * @param {string} teamId - Die ID des Teams.
 * @param {string} logoPath - Der relative Pfad zum neuen Logo.
 * @returns {object} Das aktualisierte Team-Objekt.
 */
async function updateTeamLogo(teamId, logoPath) {
  const teamRef = teamsCollection.doc(teamId);
  const doc = await teamRef.get();

  if (!doc.exists) {
    throw new Error('Team nicht gefunden.');
  }

  // Hier könnten wir das alte Logo vom Server löschen, wenn eines existiert.
  // const oldLogoPath = doc.data().logoUrl;
  // if (oldLogoPath) { ... fs.unlink ... }

  await teamRef.update({
    logoUrl: logoPath,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  const updatedDoc = await teamRef.get();
  return { id: updatedDoc.id, ...updatedDoc.data() };
}

async function deleteTeam(teamId) {
  await teamsCollection.doc(teamId).delete();
  return { message: 'Team erfolgreich gelöscht.' };
}

// Dummy-Funktion, falls sie an anderer Stelle benötigt wird
async function getTeamsByIds(ids) {
    if (!ids || ids.length === 0) return [];
    const snapshot = await teamsCollection.where(admin.firestore.FieldPath.documentId(), 'in', ids).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * KORREKTUR: Diese Funktion ist jetzt eine eigenständige, exportierte Funktion.
 * Sie ruft Teams ab, die zu einer bestimmten Saison gehören.
 */
async function getTeamsForSeason(seasonId) {
    if (!seasonId) {
        throw new Error('Eine Saison-ID ist erforderlich.');
    }

    const seasonData = await seasonService.getSeasonById(seasonId);
    if (!seasonData) {
        console.warn(`Saison mit ID ${seasonId} nicht gefunden.`);
        return [];
    }

    if (!seasonData.teams || seasonData.teams.length === 0) {
        return [];
    }

    const teamIds = seasonData.teams.map(t => t.teamId);

    if (teamIds.length === 0) {
        return [];
    }

    const teamsSnapshot = await teamsCollection.where(admin.firestore.FieldPath.documentId(), 'in', teamIds).get();

    const teams = teamsSnapshot.docs.map(doc => {
        const teamData = doc.data();
        const seasonTeamInfo = seasonData.teams.find(t => t.teamId === doc.id);
        return {
            id: doc.id,
            ...teamData,
            status: seasonTeamInfo ? seasonTeamInfo.status : 'unknown'
        };
    });

    return teams;
}

/**
 * KORREKTUR: Diese Funktion wird jetzt komplett eigenständig und robuster.
 * Sie holt die aktive Saison und verarbeitet deren Team-IDs direkt,
 * um den "undefined" Fehler endgültig zu verhindern.
 */
async function getTeamsForActiveSeason() {
    // 1. Finde die aktive Saison
    const activeSeason = await seasonService.getActiveSeason();

    // 2. Prüfe, ob Teams in der Saison vorhanden sind
    if (!activeSeason.teams || activeSeason.teams.length === 0) {
        return [];
    }

    // 3. KORREKTUR: Extrahiere die Team-IDs aus dem korrekten Feld `id` (statt `teamId`)
    const teamIds = activeSeason.teams
        .map(t => t.id) // Hier war der Fehler!
        .filter(id => id); 

    if (teamIds.length === 0) {
        return [];
    }

    // 4. Rufe die Team-Dokumente ab
    const teamsSnapshot = await teamsCollection.where(admin.firestore.FieldPath.documentId(), 'in', teamIds).get();

    // 5. KORREKTUR: Gib die reinen Team-Daten zurück, ohne den überflüssigen Status
    const teams = teamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    }));

    return teams;
}

/**
 * NEU: Ermittelt alle potenziellen Gegner für ein Team in der aktiven Saison.
 * Berücksichtigt Saisonmodus, gespielte Ergebnisse und zukünftige Buchungen.
 */
async function getPotentialOpponents(teamId) {
    const activeSeason = await seasonService.getActiveSeason();
    if (!activeSeason || !activeSeason.teams || activeSeason.teams.length === 0) return [];

    const seasonTeamIds = activeSeason.teams.map(t => t.id).filter(id => id);
    const [allSeasonTeams, seasonResults, futureBookings, allPitches] = await Promise.all([
        getTeamsByIds(seasonTeamIds),
        resultsCollection.where('seasonId', '==', activeSeason.id).get(),
        bookingService.getFutureBookingsForSeason(activeSeason.id),
        db.collection('pitches').get()
    ]);

    const pitchesData = allPitches.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const getPitchName = (pitchId) => pitchesData.find(p => p.id === pitchId)?.name || 'Unbekannt';
    const resultsData = seasonResults.docs.map(doc => doc.data());
    const potentialOpponents = allSeasonTeams.filter(t => t.id !== teamId);

    const opponentList = potentialOpponents.map(opponent => {
        const gamesPlayed = resultsData.filter(r =>
            (r.homeTeamId === teamId && r.awayTeamId === opponent.id) ||
            (r.homeTeamId === opponent.id && r.awayTeamId === teamId)
        ).length;

        const futureBookingsForOpponent = futureBookings.filter(b =>
            (b.homeTeamId === teamId && b.awayTeamId === opponent.id) ||
            (b.homeTeamId === opponent.id && b.awayTeamId === teamId)
        );

        const totalEncounters = gamesPlayed + futureBookingsForOpponent.length;

        let isEligible = true;
        // KORREKTUR: Die Prüfung verwendet jetzt das korrekte Feld 'playMode' aus dem Season-Modell.
        if (activeSeason.playMode === 'single_round_robin' && totalEncounters >= 1) {
            isEligible = false;
        }
        if (activeSeason.playMode === 'double_round_robin' && totalEncounters >= 2) {
            isEligible = false;
        }

        return {
            ...opponent,
            isEligible,
        };
    });

    // Filtert die Liste serverseitig und gibt NUR die Teams zurück,
    // gegen die noch gespielt werden darf.
    const eligibleOpponents = opponentList.filter(opponent => opponent.isEligible);
    return eligibleOpponents;
}

module.exports = {
  createTeam,
  getAllTeams,
  getTeamById,
  updateTeam,
  updateTeamLogo,
  deleteTeam,
  getTeamsByIds,
  getTeamsForSeason,
  getTeamsForActiveSeason, // Stellt sicher, dass die neue Funktion exportiert wird
  getPotentialOpponents, // Neue Funktion exportieren
};
