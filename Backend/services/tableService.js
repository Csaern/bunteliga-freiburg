const admin = require('firebase-admin');
const db = admin.firestore();
const seasonsCollection = db.collection('seasons');
const resultsCollection = db.collection('results');

/**
 * Berechnet die Tabelle für eine Saison.
 * @param {string} seasonId - Die ID der Saison.
 * @param {boolean} [applyFinalRules=false] - Wenn true, werden End-of-Season-Regeln (z.B. minGamesPlayed) angewendet.
 * @returns {Promise<Array<object>>} Die berechnete Tabelle.
 */
async function calculateTable(seasonId, applyFinalRules = false) {
  // 1. Saison-Daten und alle bestätigten Ergebnisse abrufen
  const seasonDoc = await seasonsCollection.doc(seasonId).get();
  if (!seasonDoc.exists) throw new Error('Saison nicht gefunden.');
  const season = seasonDoc.data();

  const resultsSnapshot = await resultsCollection
    .where('seasonId', '==', seasonId)
    .where('status', '==', 'confirmed')
    .get();
  const results = resultsSnapshot.docs.map(doc => doc.data())
    .filter(result => !result.friendly); // NEU: Freundschaftsspiele ignorieren

  // 2. Initialisiere Statistik-Objekt
  let tableStats = {};
  season.teams.forEach(team => {
    tableStats[team.id] = {
      teamId: team.id,
      teamName: team.name,
      gamesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsScored: 0,
      goalsConceded: 0,
      goalDifference: 0,
      points: 0,
    };
  });

  // 3. Verarbeite jedes Ergebnis
  results.forEach(result => {
    const homeStats = tableStats[result.homeTeamId];
    const awayStats = tableStats[result.awayTeamId];

    // Nur verarbeiten, wenn beide Teams noch in der Tabelle sind
    if (!homeStats || !awayStats) return;

    homeStats.gamesPlayed++;
    awayStats.gamesPlayed++;
    homeStats.goalsScored += result.homeScore;
    awayStats.goalsScored += result.awayScore;
    homeStats.goalsConceded += result.awayScore;
    awayStats.goalsConceded += result.homeScore;

    if (result.homeScore > result.awayScore) { // Heimsieg
      homeStats.wins++;
      awayStats.losses++;
      homeStats.points += season.pointsForWin;
      awayStats.points += season.pointsForLoss;
    } else if (result.homeScore < result.awayScore) { // Auswärtssieg
      homeStats.losses++;
      awayStats.wins++;
      homeStats.points += season.pointsForLoss;
      awayStats.points += season.pointsForWin;
    } else { // Unentschieden
      homeStats.draws++;
      awayStats.draws++;
      homeStats.points += season.pointsForDraw;
      awayStats.points += season.pointsForDraw;
    }
  });

  // 4. Berechne Tordifferenz und wende FINALE Regeln an, falls gefordert
  let tableArray = Object.values(tableStats).map(stats => {
    stats.goalDifference = stats.goalsScored - stats.goalsConceded;
    return stats;
  });

  // GEÄNDERT: Dieser Filter wird nur angewendet, wenn explizit gefordert
  if (applyFinalRules && season.minGamesPlayed > 0) {
    tableArray = tableArray.filter(stats => stats.gamesPlayed >= season.minGamesPlayed);
  }

  // 5. Sortiere die Tabelle
  const criteriaList = season.rankingCriteria && season.rankingCriteria.length > 0
    ? season.rankingCriteria
    : ['points', 'goalDifference', 'goalsScored'];

  tableArray.sort((a, b) => {
    for (const criteria of criteriaList) {
      let comparison = 0;
      switch (criteria) {
        case 'points':
          comparison = b.points - a.points;
          break;
        case 'goalDifference':
          comparison = b.goalDifference - a.goalDifference;
          break;
        case 'goalsScored':
          comparison = b.goalsScored - a.goalsScored;
          break;
        case 'headToHead':
          // Platzhalter für Direkter Vergleich - falls Punkte gleich sind
          // Für eine einfache Implementierung nutzen wir hier Tore/Differenz als Fallback
          // Eine echte H2H-Logik erfordert eine Teil-Tabelle der betroffenen Teams.
          comparison = 0;
          break;
      }
      if (comparison !== 0) return comparison;
    }
    return 0;
  });

  return tableArray;
}

module.exports = {
  calculateTable,
};