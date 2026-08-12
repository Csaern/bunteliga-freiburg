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
    .filter(result => !result.friendly && result.isValid !== false);

  // 1b. Simulation: Teams mit zu wenigen Spielen ausschließen und Spiele annullieren
  let validResults = results;
  const excludedTeamIds = new Set();

  const activeTeams = (season.teams || []).filter(t => t.status !== 'inactive');
  const isDoubleRound = season.playMode === 'double_round_robin';
  const multiplier = isDoubleRound ? 2 : 1;
  const maxGamesPerTeam = Math.max(0, (activeTeams.length - 1) * multiplier);
  const dynamicMinGames = Math.floor(maxGamesPerTeam / 2);
  const minGames = (Number(season.minGamesPlayed) > 0) ? Number(season.minGamesPlayed) : dynamicMinGames;

  console.log(`[CalculateTable] SeasonId: ${seasonId}, ApplyFinalRules: ${applyFinalRules}, ConfiguredMin: ${season.minGamesPlayed}, usedMinGames: ${minGames}`);

  if (applyFinalRules && minGames > 0) {
    const gameCounts = {};
    season.teams.forEach(t => gameCounts[t.id] = 0);

    // Zähle ALLE bestätigten Spiele für jedes Team
    results.forEach(r => {
      // Zähle nur Spiele gegen aktive Teams? 
      // Generell: Wir zählen einfach alle Spiele. Wenn ein Gegner-Team inactive ist, 
      // ist es eh "excluded" (wenn wir das prüfen würden), aber hier geht es um die Anzahl.
      if (gameCounts[r.homeTeamId] !== undefined) gameCounts[r.homeTeamId]++;
      if (gameCounts[r.awayTeamId] !== undefined) gameCounts[r.awayTeamId]++;
    });

    season.teams.forEach(t => {
      if (gameCounts[t.id] < minGames) {
        excludedTeamIds.add(t.id);
      }
    });

    console.log(`[CalculateTable] Excluded Teams (${excludedTeamIds.size}):`, [...excludedTeamIds]);

    if (excludedTeamIds.size > 0) {
      validResults = results.filter(r =>
        !excludedTeamIds.has(r.homeTeamId) && !excludedTeamIds.has(r.awayTeamId)
      );
    }
  }

  console.log(`[CalculateTable] Total Results: ${results.length}, Valid Results: ${validResults.length}`);

  // 2. Initialisiere Statistik-Objekt
  let tableStats = {};
  season.teams.forEach(team => {
    tableStats[team.id] = {
      teamId: team.id,
      name: team.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: [],
    };
  });

  // 3. Verarbeite Ergebnisse (sortiert nach Datum für korrekte Formkurve)
  // 3. Verarbeite Ergebnisse (sortiert nach Datum für korrekte Formkurve)
  const sortedResultsByDate = [...validResults].sort((a, b) => {
    const getTime = (d) => d?.toMillis ? d.toMillis() : new Date(d).getTime();
    return getTime(a.date) - getTime(b.date);
  });

  const pWin = season.pointsForWin !== undefined ? season.pointsForWin : 2;
  const pDraw = season.pointsForDraw !== undefined ? season.pointsForDraw : 1;
  const pLoss = season.pointsForLoss !== undefined ? season.pointsForLoss : 0;

  sortedResultsByDate.forEach(result => {
    const home = tableStats[result.homeTeamId];
    const away = tableStats[result.awayTeamId];

    if (!home || !away) return;

    home.played++;
    away.played++;
    home.goalsFor += (Number(result.homeScore) || 0);
    home.goalsAgainst += (Number(result.awayScore) || 0);
    away.goalsFor += (Number(result.awayScore) || 0);
    away.goalsAgainst += (Number(result.homeScore) || 0);

    if (result.homeScore > result.awayScore) {
      home.won++;
      home.points += pWin;
      home.form.push('S');
      away.lost++;
      away.points += pLoss;
      away.form.push('N');
    } else if (result.homeScore < result.awayScore) {
      away.won++;
      away.points += pWin;
      away.form.push('S');
      home.lost++;
      home.points += pLoss;
      home.form.push('N');
    } else {
      home.drawn++;
      away.drawn++;
      home.points += pDraw;
      away.points += pDraw;
      home.form.push('U');
      away.form.push('U');
    }
  });

  // 4. Berechne Tordifferenz und wende FINALE Regeln an
  let tableArray = Object.values(tableStats).map(stats => {
    stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
    stats.form = stats.form.slice(-5);
    return stats;
  });

  // 4b. Filterung ENTFERNT: User möchte, dass die Teams mit 0 Punkten/Spielen in der Tabelle bleiben.
  // if (applyFinalRules && minGames > 0) {
  //   tableArray = tableArray.filter(stats => stats.played >= minGames);
  // }

  // 5. Sortiere die Tabelle
  const criteriaList = season.rankingCriteria && season.rankingCriteria.length > 0
    ? season.rankingCriteria
    : ['goalDifference', 'goalsFor'];

  tableArray.sort((a, b) => {
    // 1. Punkte immer zuerst
    if (b.points !== a.points) return b.points - a.points;

    // 2. Tie-Breaker
    for (const criteria of criteriaList) {
      let comparison = 0;
      switch (criteria) {
        case 'goalDifference':
          comparison = b.goalDifference - a.goalDifference;
          break;
        case 'goalsScored':
          comparison = b.goalsFor - a.goalsFor;
          break;
        case 'gamesPlayed':
          comparison = b.played - a.played;
          break;
        case 'headToHead':
          const h2hMatches = validResults.filter(r =>
            (r.homeTeamId === a.teamId && r.awayTeamId === b.teamId) ||
            (r.homeTeamId === b.teamId && r.awayTeamId === a.teamId)
          );
          if (h2hMatches.length > 0) {
            let aH2HP = 0, bH2HP = 0, aH2HG = 0, bH2HG = 0, aH2HC = 0, bH2HC = 0;
            h2hMatches.forEach(m => {
              const hS = Number(m.homeScore) || 0;
              const aS = Number(m.awayScore) || 0;
              if (m.homeTeamId === a.teamId) {
                aH2HG += hS; aH2HC += aS; bH2HG += aS; bH2HC += hS;
                if (hS > aS) { aH2HP += pWin; bH2HP += pLoss; }
                else if (hS < aS) { aH2HP += pLoss; bH2HP += pWin; }
                else { aH2HP += pDraw; bH2HP += pDraw; }
              } else {
                bH2HG += hS; bH2HC += aS; aH2HG += aS; aH2HC += hS;
                if (hS > aS) { bH2HP += pWin; aH2HP += pLoss; }
                else if (hS < aS) { bH2HP += pLoss; aH2HP += pWin; }
                else { bH2HP += pDraw; aH2HP += pDraw; }
              }
            });
            if (aH2HP !== bH2HP) comparison = bH2HP - aH2HP;
            else if ((aH2HG - aH2HC) !== (bH2HG - bH2HC)) comparison = (bH2HG - bH2HC) - (aH2HG - aH2HC);
            else comparison = bH2HG - aH2HG;
          }
          break;
      }
      if (comparison !== 0) return comparison;
    }
    // Fallback für Stabilität (nicht für Rangberechnung)
    return a.name.localeCompare(b.name);
  });

  // 6. Ränge berechnen (geteilte Plätze)
  const areTeamsEqual = (a, b) => {
    if (a.points !== b.points) return false;
    for (const criteria of criteriaList) {
      switch (criteria) {
        case 'goalDifference': if (a.goalDifference !== b.goalDifference) return false; break;
        case 'goalsScored': if (a.goalsFor !== b.goalsFor) return false; break;
        case 'gamesPlayed': if (a.played !== b.played) return false; break;
        case 'headToHead':
          const h2hMatches = validResults.filter(r =>
            (r.homeTeamId === a.teamId && r.awayTeamId === b.teamId) ||
            (r.homeTeamId === b.teamId && r.awayTeamId === a.teamId)
          );
          if (h2hMatches.length > 0) {
            let aH2HP = 0, bH2HP = 0, aH2HG = 0, bH2HG = 0, aH2HC = 0, bH2HC = 0;
            h2hMatches.forEach(m => {
              const hS = Number(m.homeScore) || 0;
              const aS = Number(m.awayScore) || 0;
              if (m.homeTeamId === a.teamId) {
                aH2HG += hS; aH2HC += aS; bH2HG += aS; bH2HC += hS;
                if (hS > aS) { aH2HP += pWin; bH2HP += pLoss; }
                else if (hS < aS) { aH2HP += pLoss; bH2HP += pWin; }
                else { aH2HP += pDraw; bH2HP += pDraw; }
              } else {
                bH2HG += hS; bH2HC += aS; aH2HG += aS; aH2HC += hS;
                if (hS > aS) { bH2HP += pWin; aH2HP += pLoss; }
                else if (hS < aS) { bH2HP += pLoss; aH2HP += pWin; }
                else { bH2HP += pDraw; aH2HP += pDraw; }
              }
            });
            if (aH2HP !== bH2HP) return false;
            if ((aH2HG - aH2HC) !== (bH2HG - bH2HC)) return false;
            if (aH2HG !== bH2HG) return false;
          }
          break;
      }
    }
    return true;
  };

  let currentRank = 1;
  const resultTable = tableArray.map((stats, index) => {
    if (index > 0) {
      const prevStats = tableArray[index - 1];
      if (!areTeamsEqual(stats, prevStats)) {
        currentRank = index + 1;
      }
    }
    return { ...stats, rank: currentRank };
  });

  return resultTable;
}

module.exports = {
  calculateTable,
};